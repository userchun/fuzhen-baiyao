"""漂浮类妖怪的部件动画（井鬼）：定稿 512 方图拆成鬼身和脚下水洼，鬼身上下浮动、轻摇，水纹胀缩，合成 12 帧并缩成 33 格像素。

用法：python3 scripts/puppet-float.py <定稿512方图> <输出目录> [符牌中心 y（512 坐标）]
输出 move_00..11.png（495 方图），并打印每帧字印高度 sealYFrames（填进 Art.ts）。
"""
import math, os, sys
import numpy as np
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
SEAL_Y = float(sys.argv[3]) if len(sys.argv) > 3 else 202
N, G, K, S = 12, 33, 15, 512
# 切分（512 坐标，按井鬼定稿量的）
POOL_Y = 396                  # 以下是水洼
POOL_C = (256, 438)           # 水洼中心（胀缩中心）
TAIL_X = (246, 274)           # 鬼尾尖压在水洼上的那一条，归鬼身
SWAY_PIVOT = (256, 390)
FLOAT, SWAY, RIPPLE = 8, 2.0, 0.05

a = np.asarray(Image.open(SRC).convert('RGBA'))
ys, xs = np.mgrid[0:S, 0:S]
def part(mask):
    arr = a.copy(); arr[..., 3] = np.where(mask, arr[..., 3], 0); return Image.fromarray(arr, 'RGBA')
tail_tip = (ys >= POOL_Y) & (ys < POOL_Y + 20) & (xs >= TAIL_X[0]) & (xs < TAIL_X[1])
ghost = part((ys < POOL_Y) | tail_tip)
pool = part((ys >= POOL_Y) & ~tail_tip)

def scale_about(img, s, c):
    w = round(S * s); r = img.resize((w, w), Image.NEAREST); out = Image.new('RGBA', (S, S))
    out.paste(r, (round(c[0] - c[0] * s), round(c[1] - c[1] * s)), r); return out

def to_grid(img):
    arr = np.asarray(img).astype(float); e = np.linspace(0, S, G + 1); o = np.zeros((G, G, 4))
    for i in range(G):
        y0, y1 = int(round(e[i])), int(round(e[i + 1]))
        for j in range(G):
            x0, x1 = int(round(e[j])), int(round(e[j + 1])); blk = arr[y0:y1, x0:x1]; al = blk[..., 3:4] / 255
            if al.mean() > 0.4:
                o[i, j, :3] = (blk[..., :3] * al).sum((0, 1)) / max(al.sum(), 1e-6); o[i, j, 3] = 255
    return Image.fromarray(o.astype(np.uint8), 'RGBA')

os.makedirs(OUT, exist_ok=True); seals = []
for k in range(N):
    p = 2 * math.pi * k / N
    up = -FLOAT * (0.5 + 0.5 * math.sin(p))          # 0 ~ -FLOAT，鬼尾尖最低时贴着水面
    f = Image.new('RGBA', (S, S))
    f.alpha_composite(scale_about(pool, 1 + RIPPLE * math.sin(p + math.pi), POOL_C))   # 鬼身升起时水纹收、落下时胀
    g = ghost.rotate(SWAY * math.sin(p * 2 + 0.5), resample=Image.NEAREST, center=SWAY_PIVOT)
    moved = Image.new('RGBA', (S, S)); moved.paste(g, (0, round(up)), g)
    f.alpha_composite(moved)
    f.save(f'{OUT}/hi_{k:02d}.png')
    to_grid(f).resize((G * K, G * K), Image.NEAREST).save(f'{OUT}/move_{k:02d}.png')
    seals.append(round((SEAL_Y + up) / S, 3))
print('sealYFrames', seals)
