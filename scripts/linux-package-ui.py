# SPDX-License-Identifier: Apache-2.0
"""Bounded external AT-SPI and X11 observer for ordinary Linux candidates."""
import json
import os
from pathlib import Path
import signal
import sys

if os.environ.get('GITHUB_ACTIONS') != 'true' or os.environ.get('GALLERY_ISOLATED_DESKTOP') != '1':
    raise RuntimeError('Linux package UI requires an isolated hosted desktop.')
import gi
gi.require_version('Atspi', '2.0')
gi.require_version('Gdk', '3.0')
from gi.repository import Atspi, Gdk, GLib

signal.alarm(10)
operation, pid_text, output = sys.argv[1:4]
pid = int(pid_text)
assert pid > 1
application = None
desktop = Atspi.get_desktop(0)
for index in range(desktop.get_child_count()):
    candidate = desktop.get_child_at_index(index)
    if candidate.get_process_id() == pid:
        application = candidate
        break
if application is None:
    raise RuntimeError('Owned ordinary application is absent from AT-SPI.')
queue = [(application, ())]
records, objects = [], {}
while queue:
    if len(records) >= 2048:
        raise RuntimeError('AT-SPI node bound exceeded.')
    node, location = queue.pop(0)
    states = node.get_state_set()
    record = {'path': list(location), 'name': node.get_name(), 'role': node.get_role_name(), 'showing': states.contains(Atspi.StateType.SHOWING), 'focused': states.contains(Atspi.StateType.FOCUSED), 'enabled': states.contains(Atspi.StateType.ENABLED), 'focusable': states.contains(Atspi.StateType.FOCUSABLE), 'rect': None, 'value': None}
    try:
        component = node.get_component_iface()
        rect = component.get_extents(Atspi.CoordType.SCREEN)
        record['rect'] = {'x': rect.x, 'y': rect.y, 'width': rect.width, 'height': rect.height}
    except (GLib.Error, NotImplementedError, AttributeError):
        pass
    try:
        value = node.get_value_iface()
        if value is not None:
            record['value'] = {'minimum': value.get_minimum_value(), 'maximum': value.get_maximum_value(), 'current': value.get_current_value()}
    except (GLib.Error, NotImplementedError, AttributeError):
        pass
    records.append(record)
    objects[location] = node
    if len(location) >= 32 and node.get_child_count():
        raise RuntimeError('AT-SPI depth bound exceeded.')
    for index in range(node.get_child_count()):
        if len(records) + len(queue) >= 2048:
            raise RuntimeError('AT-SPI queue bound exceeded.')
        child = node.get_child_at_index(index)
        if child is not None:
            queue.append((child, location + (index,)))

def descendant(child, parent):
    return child[:len(parent)] == parent

def choose(label, interactive=False):
    matches = [r for r in records if r['name'] == label and r['showing']]
    if interactive:
        matches = [r for r in matches if r['enabled'] and (r['focusable'] or 'button' in r['role'])]
    dialogs = [r['path'] for r in records if r['role'] == 'dialog' and r['showing']]
    inside = [r for r in matches if any(descendant(r['path'], p) for p in dialogs)]
    if inside:
        matches = inside
    if label in ['Play', 'Pause']:
        videos = [r['path'] for r in records if r['name'].startswith('Video ')]
        external = [r for r in matches if not any(descendant(r['path'], p) for p in videos)]
        if external:
            matches = external
    if len(matches) != 1:
        raise RuntimeError('Expected one visible native control '+label+', found '+str(len(matches)))
    return matches[0]

result = {'method': 'AT-SPI/X11', 'pid': pid, 'executable': str(Path('/proc', str(pid), 'exe').resolve(strict=True)), 'records': records}
# Retain the actual tree before any later action/capture can fail.
Path(output).write_text(json.dumps(result, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')
if operation == 'focus':
    selected = choose(sys.argv[4], interactive=True)
    if not objects[tuple(selected['path'])].get_component_iface().grab_focus():
        raise RuntimeError('Native accessible control refused focus.')
    result['focused'] = selected
elif operation == 'snapshot':
    Gdk.init([])
    window = Gdk.get_default_root_window()
    width, height = window.get_width(), window.get_height()
    assert 0 < width <= 4096 and 0 < height <= 4096 and width * height <= 8_000_000
    pixels = Gdk.pixbuf_get_from_window(window, 0, 0, width, height)
    if pixels is None:
        raise RuntimeError('Native X11 snapshot unavailable.')
    pixels.savev(sys.argv[4], 'png', [], [])
    result['bitmap'] = {'width': width, 'height': height}
    if len(sys.argv) > 5:
        result['video'] = choose(sys.argv[5])
elif operation != 'inspect':
    raise ValueError('Unknown native observer operation.')
Path(output).write_text(json.dumps(result, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')
