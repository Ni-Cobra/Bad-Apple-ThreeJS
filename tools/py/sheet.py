"""Labeled contact sheet of the original video at chosen instants.
usage: python sheet.py OUT.png COLS WIDTH t1 t2 ...   (tiles keep the 4:3 aspect; WIDTH=480 is full resolution)"""
import sys
sys.path.insert(0, 'tools/py')
from compare import orig_frame
from PIL import Image, ImageDraw

out, cols, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
ts = [float(x) for x in sys.argv[4:]]
h = w * 3 // 4
rows = (len(ts) + cols - 1) // cols
S = Image.new('RGB', (cols * (w + 4), rows * (h + 16)), (120, 0, 0))
for i, t in enumerate(ts):
    x, y = (i % cols) * (w + 4), (i // cols) * (h + 16)
    S.paste(orig_frame('bad_apple_original.mp4', t, (w, h)).convert('RGB'), (x, y + 14))
    ImageDraw.Draw(S).text((x + 2, y + 1), f'{t:.2f}', fill=(255, 255, 255))
S.save(out)
