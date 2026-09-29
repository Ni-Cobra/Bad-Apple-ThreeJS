"""Agreement with the original over a span, per 0.1 s, for one or more renders side by side (A/B a change
without a full render).
usage: python seg.py START END RENDER1.mp4 T01 [RENDER2.mp4 T02 ...]   (T0: film time of the render's first frame)"""
import sys, subprocess, numpy as np
W, H = 320, 240

def frames(path, ss, dur):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', str(ss), '-t', str(dur), '-i', path,
                        '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True)
    return np.frombuffer(r.stdout, np.uint8).reshape(-1, H, W) < 128

a, b = float(sys.argv[1]), float(sys.argv[2])
O = frames('bad_apple_original.mp4', a, b - a)
S = []
for i in range(3, len(sys.argv), 2):
    R = frames(sys.argv[i], a - float(sys.argv[i + 1]), b - a)
    n = min(len(O), len(R))
    S.append((O[:n] == R[:n]).mean((1, 2)))
n = min(len(s) for s in S)
for i in range(0, n, 3):
    print(f'{a + i / 30:6.2f} ' + ' '.join(f'{s[i:i + 3].mean():.3f}' for s in S))
print('mean   ' + ' '.join(f'{s[:n].mean():.4f}' for s in S))
