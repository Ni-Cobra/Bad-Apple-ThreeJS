"""Compose the single deliverable video (1920x1080, the original's soundtrack):
     original | final render        (960x720 each)
     info | behind the scenes (half size) | score: this frame, mean and median so far, graph of the last 10 s
usage: python deliverable.py ORIG.mp4 FINAL.mp4 BTS.mp4 DURATION OUT.mp4 [scores.csv] [--title TEXT]
The score is score.py's (computed here from FINAL); the CSV, if given, is written alongside. The title, if given, is
printed under "recreated in 3D with Three.js" (credits, for example)."""
import sys, os, bisect, subprocess, numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(__file__))
from score import agreement

args = sys.argv[1:]
title = ''
if '--title' in args:
    i = args.index('--title')
    title = args[i + 1].strip()
    del args[i:i + 2]
orig, final, bts, dur, out = args[0], args[1], args[2], float(args[3]), args[4]
csv = args[5] if len(args) > 5 else None
FPS, W, H, PH = 30, 1920, 1080, 360          # canvas, and the bottom panel's height
end_seconds = f'{dur % 60:04.1f}'.removesuffix('.0')
end_time = f'{int(dur // 60)}:{end_seconds}'

# dark UI palette
BG, SURFACE, LINE, GRID = (14, 14, 16), (20, 20, 22), (42, 42, 46), (34, 34, 38)
INK, INK2, MUTED = (237, 237, 234), (161, 161, 166), (110, 110, 116)
RED, BLUE = (229, 72, 77), (57, 135, 229)     # per frame, mean so far

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
def font(path, size):
    try: return ImageFont.truetype(path, size)
    except OSError: return ImageFont.load_default()
f_label, f_small, f_stat, f_title, f_time = font(BOLD, 15), font(FONT, 15), font(BOLD, 40), font(BOLD, 22), font(MONO, 44)

def wrap(text, fnt, width):
    """greedy word wrap to `width` pixels"""
    lines, cur = [], ''
    for word in text.split():
        cand = f'{cur} {word}'.strip()
        if cur and ImageDraw.Draw(Image.new('L', (1, 1))).textlength(cand, font=fnt) > width: lines.append(cur); cur = word
        else: cur = cand
    return lines + ([cur] if cur else [])

# the title, between the subtitle and the timecode, in the 400 px column: one line if it fits at 16 px or more,
# else two; the timecode block moves down to make room (TY)
for size in (20, 19, 18, 17, 16, 18):
    f_credit = font(BOLD, size)
    title_lines = wrap(title, f_credit, 400)
    if len(title_lines) == 1: break
title_lines, title_step = title_lines[:2], size + 6
TY = len(title_lines) * title_step + (8 if title_lines else 0)

agree = agreement(orig, final, dur)
n = min(len(agree), int(round(dur * FPS)))
agree = agree[:n]
if csv:
    np.savetxt(csv, np.c_[np.arange(n) / FPS, agree], delimiter=',', header='t,agreement', fmt='%.4f')
mean = np.cumsum(agree) / np.arange(1, n + 1)
median, seen = np.empty(n), []
for i, a in enumerate(agree):
    bisect.insort(seen, a)
    k = len(seen)
    median[i] = seen[k // 2] if k % 2 else (seen[k // 2 - 1] + seen[k // 2]) / 2
print(f'frames: {n}  mean agreement: {mean[-1]:.3f}  median: {median[-1]:.3f}')

def pill(d, x, y, text):
    """a label on a video: small caps text on a dark translucent pill"""
    w = d.textlength(text, font=f_label)
    d.rounded_rectangle([x, y, x + w + 24, y + 28], radius=14, fill=(10, 10, 12, 190))
    d.text((x + 12, y + 5), text, font=f_label, fill=INK + (255,))

# labels over the three videos (one transparent overlay)
labels = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(labels)
pill(d, 16, 16, 'ORIGINAL')
pill(d, 976, 16, 'THREE.JS RECREATION')
pill(d, 492, 732, 'BEHIND THE SCENES')
lbl_path = out + '.labels.png'
labels.save(lbl_path)

# ---- the bottom panel: info (0-480), BTS hole (480-960), score (960-1920) ----
SX, SW = 960 + 40, 960 - 80                   # score block
GX0, GX1, GY0, GY1 = SX + 44, SX + SW, 150, 320   # graph plot area (panel coordinates)
WINDOW = 10                                   # the graph shows the last 10 seconds
PPS = (GX1 - GX0) / WINDOW                    # pixels per second
def window(t): return max(0.0, t - WINDOW)    # its left edge at time t (the playhead reaches the right edge at 10 s)
def gx(t, now): return GX0 + (t - window(now)) * PPS
LO = 0.5 if agree.min() >= 0.5 else np.floor(agree.min() * 4) / 4   # y axis: 0.5 - 1 by tenths, or lower by quarters
TICKS = np.arange(LO, 1.0001, 0.1 if LO == 0.5 else 0.25)
def gy(v): return GY1 - (GY1 - GY0) * (v - LO) / (1 - LO)

def base_panel():
    im = Image.new('RGB', (W, PH), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, PH], fill=SURFACE)
    d.line([0, 0, W, 0], fill=LINE, width=1)
    d.line([960, 0, 960, PH], fill=LINE, width=1)
    # info
    d.text((40, 36), 'Bad Apple!!', font=f_title, fill=INK)
    d.text((40, 66), 'recreated in 3D with Three.js', font=f_small, fill=INK2)
    for k, line in enumerate(title_lines):
        d.text((40, 98 + k * title_step), line, font=f_credit, fill=INK)
    d.text((40, 300), f'0:00 – {end_time} · rendered pass vs the original', font=f_small, fill=MUTED)
    # score: stat labels
    for k, lab in enumerate(['This frame', 'Mean so far', 'Median so far']):
        d.text((SX + k * 200, 28), lab, font=f_small, fill=INK2)
    # legend (two series), top right of the score block
    lx = GX1 - 250
    for c, lab in [(RED, 'per frame'), (BLUE, 'mean so far')]:
        d.line([lx, 40, lx + 18, 40], fill=c, width=3)
        d.text((lx + 26, 31), lab, font=f_small, fill=INK2)
        lx += 130
    # graph axes: recessive hairline grid, clean ticks (the time ticks move with the window, drawn per frame)
    d.text((GX0, 118), f'Last {WINDOW} seconds', font=f_small, fill=MUTED)
    grid(d, 0, GX0, GX1)
    for v in TICKS:
        d.text((GX0 - 10, gy(v)), str(int(round(v))) if v in (0, 1) or v > 0.9999 else f'{v:.2f}'.rstrip('0')[1:], font=f_small, fill=MUTED, anchor='rm')
    return im

def grid(d, y0, x0, x1, s=1):
    for k, v in enumerate(TICKS):
        y = round(gy(v) - y0) * s
        d.line([x0 * s, y, x1 * s, y], fill=GRID if k else LINE, width=s)

SY0, SY1 = GY0 - 8, GY1 + 2                  # rows of the plot area that the data strip covers
def data_strip():
    """both lines over the whole duration on one long strip (PPS pixels a second), antialiased by drawing at 3x and
    scaling down; a frame shows the window up to the playhead (both series only depend on the frames before)"""
    S, w = 3, int(np.ceil(dur * PPS)) + 2
    im = Image.new('RGB', (w * S, (SY1 - SY0) * S), SURFACE)
    d = ImageDraw.Draw(im)
    grid(d, SY0, 0, w, S)
    ts = np.arange(n) / FPS
    for series, c in [(agree, RED), (mean, BLUE)]:
        d.line([(t * PPS * S, (gy(v) - SY0) * S) for t, v in zip(ts, series)], fill=c, width=2 * S, joint='curve')
    return im.resize((w, SY1 - SY0), Image.LANCZOS)

bg = base_panel()
strip = data_strip()

enc = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k']
cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
       '-t', str(dur), '-i', orig, '-t', str(dur), '-i', final, '-t', str(dur), '-i', bts, '-i', lbl_path,
       '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{PH}', '-r', str(FPS), '-i', '-',
       '-filter_complex',
       '[0:v]scale=960:720:flags=lanczos,setsar=1,fps=30[o]; [1:v]setsar=1,fps=30[f]; [o][f]hstack=2[top];'
       '[top][4:v]vstack=2[all]; [2:v]scale=480:360:flags=area,setsar=1,fps=30[b]; [all][b]overlay=480:720[x];'
       '[x][3:v]overlay=0:0,format=yuv420p[v]',
       '-map', '[v]', '-map', '0:a', '-t', str(dur), *enc, out]
ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
for i in range(n):
    t = i / FPS
    im = bg.copy()
    a = round(window(t) * PPS)
    im.paste(strip.crop((a, 0, round(t * PPS) + 1, SY1 - SY0)), (GX0, SY0))
    d = ImageDraw.Draw(im)
    for s in range(int(np.ceil(window(t))), int(window(t) + WINDOW) + 1):
        if s % 2 == 0:
            d.text((gx(s, t), GY1 + 10), f'{s // 60}:{s % 60:02d}', font=f_small, fill=MUTED, anchor='mt')
    # stats
    for k, v in enumerate([agree[i], mean[i], median[i]]):
        d.text((SX + k * 200, 50), f'{v:.3f}', font=f_stat, fill=INK)
    # playhead with the current value
    x = gx(t, t)
    d.line([x, GY0 - 6, x, GY1], fill=INK2, width=1)
    y = gy(agree[i])
    d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=SURFACE)
    d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=RED)
    # info: timecode and frame
    d.text((40, 150 + TY), f'{int(t // 60)}:{t % 60:05.2f}', font=f_time, fill=INK)
    d.text((40, 206 + TY), f'frame {i + 1} / {n}', font=f_small, fill=INK2)
    d.rounded_rectangle([40, 236 + TY, 440, 240 + TY], radius=2, fill=LINE)
    d.rounded_rectangle([40, 236 + TY, 40 + max(4, 400 * (i + 1) / n), 240 + TY], radius=2, fill=INK2)
    ff.stdin.write(im.tobytes())
    if i % 150 == 0: print(f'\rframe {i}/{n}', end='', file=sys.stderr)
ff.stdin.close()
ff.wait()
os.remove(lbl_path)
print(f'\nwrote {out}', file=sys.stderr)
