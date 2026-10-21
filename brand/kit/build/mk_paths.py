"""localmedia.gallery contact-sheet candidate, built from glyphkit primitives."""
import json
from pathlib import Path
import sys
for parent in Path(__file__).resolve().parents:
    candidates = (parent / 'templates', parent / 'skill' / 'templates')
    found = next((candidate for candidate in candidates if (candidate / 'glyphkit.py').is_file()), None)
    if found is not None:
        sys.path.insert(0, str(found))
        break
else:
    raise ImportError('glyphkit.py is required beside this kit or in the repository skill/templates')
import glyphkit as G

GRID = 1000  # Square construction coordinate system.
TILE = 352  # Equal media tile width and height.
GAP = 72  # Open horizontal and vertical gutter.
INSET = 112  # Symmetric outer source padding.
RADIUS = 48  # Shared gallery tile corner radius.
PHOTO = ((52,286),(134,139),(208,242),(249,190),(300,286))  # Full double-peak cutout.
SUN = (253,98,32)  # Full photo's circle center and radius relative to its tile.
PLAY = ((130,84),(130,270),(266,177))  # Video cutout relative to its tile.
REDUCED_PHOTO = ((52,286),(174,106),(300,286))  # One broad peak without the sun.
CLEAR_SPACE = 100  # Clear space outside the visible artwork.
REDUCED_BELOW_PX = 32  # Reduced is used at 32 pixels and below.

def points(values, x, y):
    return [(x+dx,y+dy) for dx,dy in values]

def tile(x,y,cutout=None):
    contours = [G.rounded_rect(x,y,TILE,TILE,RADIUS)]
    if cutout:
        contours.append(cutout)
    entry = {'role':'accent','d':G.compound(*contours)}
    if cutout:
        entry['fill_rule'] = 'evenodd'
    return entry

def construct(reduced=False):
    far = INSET + TILE + GAP
    mountain = G.polygon(points(REDUCED_PHOTO if reduced else PHOTO,INSET,INSET))
    if not reduced:
        mountain = G.compound(mountain,G.disc(INSET+SUN[0],INSET+SUN[1],SUN[2]))
    paths = [tile(INSET,INSET,mountain),tile(far,INSET),tile(INSET,far),
             tile(far,far,G.polygon(points(PLAY,far,far)))]
    return G.center_ink(paths,GRID)

full = construct()
reduced = construct(True)

if __name__ == '__main__':
    print(json.dumps({'full':full,'reduced':reduced}))
