"""Disagreement map, original vs render: gray = both ink, red = ink only in the original, blue = ink only in the
render (in the night palette "ink" is the background).
usage: python diff.py RENDER_DIR OUT.png t1 t2 ...   (renders named final_<t>.png in RENDER_DIR)"""
import sys, numpy as np
sys.path.insert(0, 'tools/py')
from compare import orig_frame
from PIL import Image

d, out = sys.argv[1], sys.argv[2]
ts = [float(x) for x in sys.argv[3:]]
S = Image.new('RGB', (330 * len(ts), 240))
for i, t in enumerate(ts):
    o = np.asarray(orig_frame('bad_apple_original.mp4', t, (320, 240))) < 128
    r = np.asarray(Image.open(f'{d}/final_{t:.2f}.png').convert('L').resize((320, 240))) < 128
    im = np.full((240, 320, 3), 255, np.uint8)
    im[o & r] = (90, 90, 90); im[o & ~r] = (230, 40, 40); im[~o & r] = (40, 80, 230)
    S.paste(Image.fromarray(im), (i * 330, 0))
S.save(out)
