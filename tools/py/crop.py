"""Labeled crops of the original at full resolution.
usage: python crop.py OUT.png COLS x0 y0 x1 y1 t1 t2 ...   (box in 0..1 frame fractions; tiles scaled to 320 px wide)"""
import sys, subprocess, io
from PIL import Image, ImageDraw

out, cols = sys.argv[1], int(sys.argv[2])
box = [float(v) for v in sys.argv[3:7]]
ts = [float(x) for x in sys.argv[7:]]
tiles = []
for t in ts:
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', f'{t:.3f}', '-i', 'bad_apple_original.mp4', '-frames:v', '1',
                          '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True).stdout
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    W, H = im.size
    c = im.crop((int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H)))
    tiles.append((t, c.resize((320, int(c.height * 320 / c.width)), Image.LANCZOS)))
w, h = tiles[0][1].size
rows = (len(tiles) + cols - 1) // cols
S = Image.new('RGB', (cols * (w + 4), rows * (h + 16)), (120, 0, 0))
for i, (t, c) in enumerate(tiles):
    x, y = (i % cols) * (w + 4), (i // cols) * (h + 16)
    S.paste(c, (x, y + 14))
    ImageDraw.Draw(S).text((x + 2, y + 1), f'{t:.2f}', fill=(255, 255, 255))
S.save(out)
