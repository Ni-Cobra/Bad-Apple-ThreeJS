"""Sequence comparison strip: original vs render for a time range (renders named final_<t>.png)."""
import sys, subprocess, io
from PIL import Image, ImageDraw
sys.path.insert(0, 'tools/py')
from compare import orig_frame, agree
video, rdir, out = sys.argv[1:4]
times = [float(x) for x in sys.argv[4:]]
w, h = 200, 150
cols = 6
rows = (len(times) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * (2 * h + 16)), (90, 0, 0))
for i, t in enumerate(times):
    o = orig_frame(video, t, (w - 4, h - 2))
    r = Image.open(f'{rdir}/final_{t:.2f}.png').convert('L').resize((w - 4, h - 2))
    x, y = (i % cols) * w, (i // cols) * (2 * h + 16)
    d = ImageDraw.Draw(sheet)
    d.text((x + 2, y + 2), f'{t:.2f}', fill=(255, 255, 255))
    sheet.paste(o.convert('RGB'), (x + 2, y + 14)); sheet.paste(r.convert('RGB'), (x + 2, y + 14 + h))
sheet.save(out)
