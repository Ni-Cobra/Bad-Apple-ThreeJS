"""Measure the ink blob of the original at given instants: centroid and bounding box (frame fractions, y down),
area (fraction of the frame), principal-axis angle (degrees, counter-clockwise from screen right) and elongation
(major/minor axis ratio). Used to turn a tracked shape into camera data, like the apple's APPLE_SCREEN table.
usage: python blob.py black|white [--roi x0,y0,x1,y1] [--render DIR] t1 t2 ...
  black|white: which color is the ink (black in the day palette, white at night)
  --roi: optional region of interest in frame fractions (pixels outside are ignored)
  --render: measure our stills in DIR (final_<t>.png) instead of the original"""
import sys
import numpy as np
sys.path.insert(0, 'tools/py')
from compare import orig_frame

W, H = 480, 360
args = sys.argv[1:]
ink = args.pop(0)
roi = None
render = None
while args[0].startswith('--'):
    if args[0] == '--roi':
        roi = [float(a) for a in args[1].split(',')]
    elif args[0] == '--render':
        render = args[1]
    args = args[2:]
print('t       cx     cy     area    x0    y0    x1    y1    angle  elong')
for t in map(float, args):
    if render:
        from PIL import Image
        im = Image.open(f'{render}/final_{t:.2f}.png').convert('L').resize((W, H))
    else:
        im = orig_frame('bad_apple_original.mp4', t, (W, H))
    g = np.asarray(im, np.float32) / 255
    m = g < 0.5 if ink == 'black' else g > 0.5
    if roi:
        keep = np.zeros_like(m)
        keep[int(roi[1] * H):int(roi[3] * H), int(roi[0] * W):int(roi[2] * W)] = True
        m &= keep
    ys, xs = np.nonzero(m)
    if len(xs) == 0:
        print(f'{t:6.3f}  (no ink)')
        continue
    cx, cy = xs.mean(), ys.mean()
    cov = np.cov(np.vstack([xs - cx, -(ys - cy)]))
    ev, evec = np.linalg.eigh(cov)
    major = evec[:, 1]
    ang = np.degrees(np.arctan2(major[1], major[0]))
    ang = (ang + 90) % 180 - 90
    el = np.sqrt(ev[1] / max(ev[0], 1e-9))
    print(f'{t:6.3f}  {cx / W:.3f}  {cy / H:.3f}  {len(xs) / (W * H):.4f}  {xs.min() / W:.3f} {ys.min() / H:.3f} {xs.max() / W:.3f} {ys.max() / H:.3f}  {ang:6.1f}  {el:.2f}')
