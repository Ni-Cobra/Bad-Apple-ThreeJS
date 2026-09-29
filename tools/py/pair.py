"""Large original-vs-render pairs with the disagreement map, one row per instant.
usage: python pair.py RENDER_DIR OUT.png t1 t2 ...   (renders named final_<t>.png; tiles 400x300)
Disagreement: gray = both ink, red = ink only in the original, blue = ink only in the render."""
import sys
import numpy as np
sys.path.insert(0, 'tools/py')
from compare import orig_frame, agree
from PIL import Image, ImageDraw

d, out = sys.argv[1], sys.argv[2]
ts = [float(x) for x in sys.argv[3:]]
W, H = 400, 300
S = Image.new('RGB', (3 * W + 8, len(ts) * (H + 4)), (90, 0, 0))
for i, t in enumerate(ts):
    o = orig_frame('bad_apple_original.mp4', t, (W, H))
    r = Image.open(f'{d}/final_{t:.2f}.png').convert('L').resize((W, H))
    om, rm = np.asarray(o) < 128, np.asarray(r) < 128
    im = np.full((H, W, 3), 255, np.uint8)
    im[om & rm] = (90, 90, 90); im[om & ~rm] = (230, 40, 40); im[~om & rm] = (40, 80, 230)
    y = i * (H + 4)
    S.paste(o.convert('RGB'), (0, y)); S.paste(r.convert('RGB'), (W + 4, y)); S.paste(Image.fromarray(im), (2 * W + 8, y))
    ImageDraw.Draw(S).text((4, y + 4), f'{t:.2f}  {agree(o, r):.3f}', fill=(200, 0, 0))
S.save(out)
