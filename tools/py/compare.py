"""Side-by-side stills + silhouette IoU against the original.
usage: python compare.py ORIG.mp4 RENDER_DIR OUT.png t1 t2 ...   (renders named final_<t>.png in RENDER_DIR)"""
import sys, subprocess, io, numpy as np
from PIL import Image, ImageDraw

def orig_frame(video, t, size=(320, 240)):
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', f'{t:.3f}', '-i', video, '-frames:v', '1',
                          '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True).stdout
    return Image.open(io.BytesIO(raw)).convert('L').resize(size)

def iou(a, b):
    A = np.asarray(a) < 128; B = np.asarray(b) < 128
    # ink = whichever is the minority color is not known; compare black masks directly
    inter = (A & B).sum(); uni = (A | B).sum()
    return 1.0 if uni == 0 else inter / uni

def agree(a, b):
    return ((np.asarray(a) < 128) == (np.asarray(b) < 128)).mean()

if __name__ == '__main__':
    video, rdir, out = sys.argv[1:4]
    times = [float(x) for x in sys.argv[4:]]
    cols = 2
    tiles = []
    for t in times:
        o = orig_frame(video, t)
        r = Image.open(f'{rdir}/final_{t:.2f}.png').convert('L').resize((320, 240))
        pair = Image.new('RGB', (650, 262), (90, 0, 0))
        pair.paste(o.convert('RGB'), (0, 22)); pair.paste(r.convert('RGB'), (330, 22))
        d = ImageDraw.Draw(pair)
        d.text((4, 4), f't={t:.2f}  pixel agreement={agree(o, r):.3f}', fill=(255, 255, 255))
        tiles.append(pair)
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 650, rows * 262), (40, 40, 40))
    for i, p in enumerate(tiles):
        sheet.paste(p, ((i % cols) * 650, (i // cols) * 262))
    sheet.save(out)
