"""Track a limb's extreme point frame by frame on the original and a render: the leftmost black pixel above row
YMAX (320x240 frame), e.g. the hand of an arm held out to the screen's left. Prints both tracks and their gap, so
a gesture's timing (when it starts, peaks, comes back) can be keyed and checked against the original.
usage: python tip.py RENDER.mp4 RENDER_T0 START END [YMAX=150]
Beware: it finds the silhouette's extreme point, which may be a hanging sleeve rather than the hand; confirm on
a large side-by-side (pair.py) before keying from it."""
import sys, subprocess, numpy as np
W, H = 320, 240

def frames(path, ss, dur):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', str(ss), '-t', str(dur), '-i', path,
                        '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True)
    return np.frombuffer(r.stdout, np.uint8).reshape(-1, H, W)

def tip(fr, ymax):
    b = fr[:ymax] < 128
    xs = np.where(b.any(1), b.argmax(1), W)
    x = xs.min()
    return x, int(np.median(np.where(xs <= x + 1)[0]))

ours, t0, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
ymax = int(sys.argv[5]) if len(sys.argv) > 5 else 150
O = frames('bad_apple_original.mp4', a, b - a); R = frames(ours, a - t0, b - a)
for i in range(min(len(O), len(R))):
    (xo, yo), (xr, yr) = tip(O[i], ymax), tip(R[i], ymax)
    print(f'{a + i / 30:6.3f}  orig {xo:4d} {yo:4d}   ours {xr:4d} {yr:4d}   dx {xr - xo:+4d} dy {yr - yo:+4d}')
