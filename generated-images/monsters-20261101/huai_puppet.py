"""槐树精部件动画：从定稿 512 方图拆出身子 / 手臂 / 腿，按走路节奏合成 12 帧，再缩成 33 格像素。"""
import math, sys, os
import numpy as np
from PIL import Image, ImageOps

SRC = sys.argv[1]; OUT = sys.argv[2]
N = 12; G = 33; K = 15
HIP = 352                       # 髋线：以下为腿
L_ARM = dict(x1=205, y0=228, y1=362, pivot=(206, 250))   # 画面左手臂：x<205
R_ARM = dict(x0=320, y0=226, y1=358, pivot=(318, 246))   # 画面右手臂：x>=320
LIFT = 40      # 抬腿高度（512 像素）
BOB = 6        # 身子起伏
ARM = 11       # 手臂摆角（度）
SWAY = 1.5     # 身子轻晃（度）

src = Image.open(SRC).convert('RGBA'); W, H = src.size
a = np.asarray(src)
ys, xs = np.mgrid[0:H, 0:W]

def part(mask):
    arr = a.copy(); arr[..., 3] = np.where(mask, arr[..., 3], 0)
    return Image.fromarray(arr, 'RGBA')

arm_l = (xs < L_ARM['x1']) & (ys >= L_ARM['y0']) & (ys < L_ARM['y1'])
arm_r = (xs >= R_ARM['x0']) & (ys >= R_ARM['y0']) & (ys < R_ARM['y1'])
leg_zone = ys >= HIP
leg_src = (ys >= HIP - 16) & ~arm_l & ~arm_r   # 腿上沿多留 16，藏在身子后面，起伏时不露缝
body = part(~arm_l & ~arm_r & ~leg_zone)
armL = part(arm_l); armR = part(arm_r)
legL = part(leg_src & (xs < 256))
legR = ImageOps.mirror(legL)          # 抬起的右腿换成左腿的镜像，两腿对称

def rot(img, deg, pivot):
    return img.rotate(deg, resample=Image.NEAREST, center=pivot)

def shift(img, dx, dy):
    out = Image.new('RGBA', img.size); out.alpha_composite(img, (int(round(dx)), int(round(dy)))) if dx >= 0 and dy >= 0 else out.paste(img, (int(round(dx)), int(round(dy))), img)
    return out

def to_grid(img):
    arr = np.asarray(img).astype(float); n = arr.shape[0]; e = np.linspace(0, n, G + 1)
    out = np.zeros((G, G, 4))
    for i in range(G):
        y0, y1 = int(round(e[i])), int(round(e[i + 1]))
        for j in range(G):
            x0, x1 = int(round(e[j])), int(round(e[j + 1]))
            blk = arr[y0:y1, x0:x1]; al = blk[..., 3:4] / 255
            if al.mean() > 0.4:
                out[i, j, :3] = (blk[..., :3] * al).sum((0, 1)) / max(al.sum(), 1e-6); out[i, j, 3] = 255
    return Image.fromarray(out.astype(np.uint8), 'RGBA')

os.makedirs(OUT, exist_ok=True)
for k in range(N):
    p = 2 * math.pi * k / N
    s = math.sin(p)
    liftL = LIFT * max(0.0, s)          # 前半周期抬画面左腿
    liftR = LIFT * max(0.0, -s)         # 后半周期抬画面右腿
    bob = -BOB * abs(s)                 # 抬腿时身子略升高（负 y 向上）
    frame = Image.new('RGBA', (W, H))
    frame = Image.alpha_composite(frame, shift(legL, 0, -liftL))
    frame = Image.alpha_composite(frame, shift(legR, 0, -liftR))
    b = rot(body, SWAY * s, (256, HIP))
    frame = Image.alpha_composite(frame, shift(b, 0, bob))
    # 手臂与对侧腿同步：抬左腿时右臂向前（向下摆），左臂向后
    frame = Image.alpha_composite(frame, shift(rot(armL, -ARM * s, L_ARM['pivot']), 0, bob))
    frame = Image.alpha_composite(frame, shift(rot(armR, -ARM * s, R_ARM['pivot']), 0, bob))
    frame.save(f'{OUT}/hi_{k:02d}.png')
    to_grid(frame).resize((G * K, G * K), Image.NEAREST).save(f'{OUT}/move_{k:02d}.png')
print('ok')
