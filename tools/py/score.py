"""Per-frame silhouette agreement between a render and the original.
usage: python score.py ORIG.mp4 RENDER.mp4 DURATION [out.csv]
Both are decoded at 160x120 grayscale, 30 fps; a pixel agrees when both are on the same side of mid-gray."""
import sys, subprocess, numpy as np
W, H = 160, 120

def frames(path, dur):
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-t', str(dur), '-i', path,
                          '-vf', f'fps=30,scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W)

def agreement(orig, render, dur):
    a, b = frames(orig, dur), frames(render, dur)
    n = min(len(a), len(b))
    return ((a[:n] < 128) == (b[:n] < 128)).mean(axis=(1, 2))

if __name__ == '__main__':
    orig, render, dur = sys.argv[1], sys.argv[2], float(sys.argv[3])
    out = sys.argv[4] if len(sys.argv) > 4 else None
    agree = agreement(orig, render, dur)
    n = len(agree)
    print(f'frames: {n}  mean agreement: {agree.mean():.3f}  median: {np.median(agree):.3f}')
    for s in range(int(np.ceil(n / 30))):
        seg = agree[s * 30:(s + 1) * 30]
        bar = '#' * int(seg.mean() * 40)
        print(f'{s:3d}s  {seg.mean():.3f}  {bar}')
    if out:
        np.savetxt(out, np.c_[np.arange(n) / 30, agree], delimiter=',', header='t,agreement', fmt='%.4f')
