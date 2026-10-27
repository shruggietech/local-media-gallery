# SPDX-License-Identifier: Apache-2.0
"""Isolated NVDA scratchpad plugin: bounded synthetic-gallery observations only."""
import ctypes
import json
import os
from pathlib import Path
import time
import api
import core
import globalPluginHandler
import speech.extensions
import versionInfo


class GlobalPlugin(globalPluginHandler.GlobalPlugin):
    def __init__(self):
        super().__init__()
        self.path = Path(os.environ["GALLERY_NVDA_EVIDENCE"])
        self.hwnd = int(os.environ["GALLERY_NVDA_HWND"])
        self.labels = sorted(json.loads(os.environ["GALLERY_NVDA_LABELS"]), key=len, reverse=True)
        self.records = []
        self.overflow = False
        self.ready = False
        self.capture_counts = {"outsideForeground": 0, "unrecognizedSequence": 0, "acceptedSpeech": 0, "acceptedFocus": 0}
        self.user32 = ctypes.windll.user32
        self.user32.GetForegroundWindow.restype = ctypes.c_void_p
        self.user32.GetAncestor.argtypes = [ctypes.c_void_p, ctypes.c_uint]
        self.user32.GetAncestor.restype = ctypes.c_void_p
        speech.extensions.pre_speech.register(self.observe)
        core.postNvdaStartup.register(self.started)
        self.flush()

    def started(self, **kwargs):
        self.ready = True
        self.flush()

    def owns_foreground(self):
        window = self.user32.GetForegroundWindow()
        foreground = api.getForegroundObject()
        return self.user32.GetAncestor(window, 2) == self.hwnd and self.user32.GetAncestor(foreground.windowHandle, 2) == self.hwnd

    def gallery_sequence(self, text):
        # Speech can be queued before a foreground transition. An HWND check alone
        # does not prove the origin of arbitrary speech text. Retain only the
        # synthetic fixture/control vocabulary and known role/state words.
        remaining = text
        matched = False
        for label in self.labels:
            if label in remaining:
                matched = True
                remaining = remaining.replace(label, " ")
        words = {"banner", "landmark", "button", "dialog", "document", "graphic", "image", "grouping", "group", "expanded", "collapsed", "pressed", "unavailable", "checked", "not", "selected", "same", "page", "link", "English", "supported", "editable", "combo", "box", "list", "item", "of", "frame", "blank"}
        tokens = remaining.translate(str.maketrans({c: " " for c in "(),:;.-"})).split()
        return matched and all(token in words or token.isdecimal() for token in tokens)

    def flush(self):
        payload = {"name": "NVDA", "version": versionInfo.version, "ready": self.ready, "overflow": self.overflow, "records": self.records, "captureCounts": self.capture_counts, "output": "built-in silence synthesizer; generated speech only"}
        raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        if len(raw) + 1 > 262144:
            raise RuntimeError("NVDA qualification serialization exceeded its bound")
        temporary = self.path.with_suffix(".tmp")
        temporary.write_bytes(raw + b"\n")
        temporary.replace(self.path)

    def append(self, record):
        if len(self.records) >= 256 or len(json.dumps(self.records + [record], ensure_ascii=False).encode("utf-8")) > 260000:
            self.overflow = True
        else:
            self.records.append(record)
        self.flush()

    def observe(self, speechSequence, **kwargs):
        if not self.owns_foreground():
            self.capture_counts["outsideForeground"] += 1
            self.flush()
            return
        strings = [value for value in speechSequence if isinstance(value, str)]
        if not strings:
            return
        text = " ".join(strings)
        if not self.gallery_sequence(text):
            self.capture_counts["unrecognizedSequence"] += 1
            self.flush()
            return
        self.capture_counts["acceptedSpeech"] += 1
        self.append({"kind": "speech", "at": time.time(), "text": text})

    def event_gainFocus(self, obj, nextHandler):
        if self.owns_foreground() and obj.name in self.labels:
            self.capture_counts["acceptedFocus"] += 1
            self.append({"kind": "focus", "at": time.time(), "text": obj.name or "", "role": str(obj.role), "states": [str(v) for v in obj.states]})
        nextHandler()

    def terminate(self):
        speech.extensions.pre_speech.unregister(self.observe)
        core.postNvdaStartup.unregister(self.started)
        self.flush()
        super().terminate()
