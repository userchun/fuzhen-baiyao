"""圆身短腿妖怪的摇摆走路（铜钱精）：定稿 512 方图拆出两条短腿，身子左右晃、上下颠，两腿交替抬起，合成 12 帧并缩成 33 格像素。

用法：python3 scripts/puppet-waddle.py <定稿512方图> <输出目录> [符牌中心 y（512 坐标）]
输出 move_00..11.png（495 方图），并打印每帧字印高度 sealYFrames（填进 Art.ts）。
"""
import math, os, sys
import numpy as np
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
SEAL_Y = float(sys.argv[3]) if len(sys.argv) > 3 else 391
N, G, K, S = 12, 33, 15, 512
# 切分（512 坐标，按铜钱精定稿量的）
LEG_Y = 405                         # 以下为腿
OV = 12                             # 腿上沿藏在身子后面的重叠量
LEG_L, LEG_R = (155, 220), (276, 345)
PIVOT = (256, 470)                  # 身子摇摆转轴（两脚中间的地面）
ROCK, BOB, LIFT = 5.0, 5, 12

a = np.asarray(Image.open(SRC).convert('RGBA'))
ys, xs = np.mgrid[0:S, 0:S]
def part(mask):
    arr = a.copy(); arr[..., 3] = np.where(mask, arr[..., 3], 0); return Image.fromarray(arr, 'RGBA')
m_l = (ys >= LEG_Y - OV) & (xs >= LEG_L[0]) & (xs < LEG_L[1])
m_r = (ys >= LEG_Y - OV) & (xs >= LEG_R[0]) & (xs < LEG_R[1])
leg_core = (ys >= LEG_Y) & ((xs >= LEG_L[0]) & (xs < LEG_L[1]) | (xs >= LEG_R[0]) & (xs < LEG_R[1]))
body, leg_l, leg_r = part(~leg_core), part(m_l), part(m_r)

def move(img, dx, dy):
    out = Image.new('RGBA', (S, S)); out.paste(img, (round(dx), round(dy)), img); return out

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
    p = 2 * math.pi * k / N; s = math.sin(p)
    bob = -BOB * abs(s)                       # 抬脚时身子略升
    f = Image.new('RGBA', (S, S))
    f.alpha_composite(move(leg_l, 0, -LIFT * max(0.0, s)))     # 前半周期抬左脚
    f.alpha_composite(move(leg_r, 0, -LIFT * max(0.0, -s)))    # 后半周期抬右脚
    b = body.rotate(ROCK * s, resample=Image.NEAREST, center=PIVOT)   # 抬左脚时身子往右倒
    f.alpha_composite(move(b, 0, bob))
    f.save(f'{OUT}/hi_{k:02d}.png')
    to_grid(f).resize((G * K, G * K), Image.NEAREST).save(f'{OUT}/move_{k:02d}.png')
    seals.append(round((SEAL_Y + bob) / S, 3))
print('sealYFrames', seals)
