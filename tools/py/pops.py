"""Find frame-to-frame jumps in a render that the original doesn't have (unintended pops).
usage: python pops.py ORIG.mp4 RENDER.mp4 DURATION"""
import sys, numpy as np
sys.path.insert(0, 'tools/py')
import subprocess
W, H = 160, 120
def frames(path, dur):
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-t', str(dur), '-i', path,
                          '-vf', f'fps=30,scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32) / 255
o, r = frames(sys.argv[1], sys.argv[3]), frames(sys.argv[2], sys.argv[3])
n = min(len(o), len(r))
do = np.abs(np.diff(o[:n], axis=0)).mean(axis=(1, 2))
dr = np.abs(np.diff(r[:n], axis=0)).mean(axis=(1, 2))
idx = np.argsort(dr - do)[::-1][:12]
print('frame  t      render_diff  orig_diff')
for i in sorted(idx):
    print(f'{i+1:5d}  {(i+1)/30:6.2f}  {dr[i]:.3f}        {do[i]:.3f}')
