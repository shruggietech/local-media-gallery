# SPDX-License-Identifier: Apache-2.0
"""Bounded native AT-SPI client, never a DOM/ARIA substitute."""
import json
from pathlib import Path
import signal
import sys
import gi
gi.require_version("Atspi", "2.0")
from gi.repository import Atspi

signal.alarm(10)
pid = int(sys.argv[1])
desktop = Atspi.get_desktop(0)
app = None
for i in range(desktop.get_child_count()):
    candidate = desktop.get_child_at_index(i)
    if candidate.get_process_id() == pid:
        app = candidate
        break
if app is None:
    raise RuntimeError("Campaign application is absent from native AT-SPI.")
queue = [(app, 0)]
records = []
overflow = False
while queue:
    if len(records) >= 2048:
        overflow = True
        break
    node, depth = queue.pop(0)
    states = node.get_state_set()
    records.append({"name": node.get_name(), "role": node.get_role_name(), "focused": states.contains(Atspi.StateType.FOCUSED), "enabled": states.contains(Atspi.StateType.ENABLED), "focusable": states.contains(Atspi.StateType.FOCUSABLE), "depth": depth})
    count = node.get_child_count()
    if count and depth >= 32:
        overflow = True
        continue
    for i in range(count):
        if len(queue) + len(records) >= 2048:
            overflow = True
            break
        child = node.get_child_at_index(i)
        if child is not None:
            queue.append((child, depth + 1))
Path(sys.argv[2]).write_text(json.dumps({"method": "AT-SPI", "processId": pid, "nodes": len(records), "overflow": overflow, "records": records}, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
