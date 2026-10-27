"""去掉抠好的图里成块的偏蓝光球（如 AI 多画的月亮）。细的蓝色描边不受影响。
用法：python3 tools/asset-pipeline/drop_blob.py <clean.png> [--min 0.004]
"""
import sys, argparse
import numpy as np
from collections import deque
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('--min', type=float, default=0.004)
a = ap.parse_args()
im = Image.open(a.src).convert('RGBA'); A = np.asarray(im).astype(np.int16).copy()
r, g, b, al = A[..., 0], A[..., 1], A[..., 2], A[..., 3]
blue = (b > r + 25) & (b >= g - 10) & (al > 30)
# 先腐蚀去掉细描边，只留成块的蓝色
core = np.asarray(Image.fromarray((blue * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(7))) > 0
h, w = core.shape; lab = np.zeros(core.shape, np.int32); n = 0; drop = np.zeros(core.shape, bool)
for y in range(h):
    for x in range(w):
        if core[y, x] and not lab[y, x]:
            n += 1; q = deque([(y, x)]); lab[y, x] = n; pts = []
            while q:
                cy, cx = q.popleft(); pts.append((cy, cx))
                for ny, nx in ((cy+1,cx),(cy-1,cx),(cy,cx+1),(cy,cx-1)):
                    if 0 <= ny < h and 0 <= nx < w and core[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = n; q.append((ny, nx))
            if len(pts) >= a.min * h * w:
                ys, xs = zip(*pts); drop[list(ys), list(xs)] = True
# 扩张覆盖光晕，只删偏蓝/偏青的像素
grow = np.asarray(Image.fromarray((drop * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(31))) > 0
halo = grow & ((b > r + 5) | (g > r + 15))
A[..., 3] = np.where(drop | halo, 0, al)
Image.fromarray(A.astype(np.uint8), 'RGBA').save(a.src)
print(f'{a.src}: 去掉 {(drop | halo).sum()} 像素')
