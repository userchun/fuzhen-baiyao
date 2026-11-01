"""火狐的部件动画：定稿 512 方图（脚底 0.94）拆出火焰尾巴、前爪，合成 12 帧奔跑，再缩成 33 格像素。

用法：python3 scripts/puppet-fox.py <定稿512方图> <输出目录> [符牌中心 y（512 坐标）]
输出 move_00..11.png（495 方图），并打印每帧字印高度 sealYFrames（填进 Art.ts）。
"""
import math, os, sys
import numpy as np
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
SEAL_Y = float(sys.argv[3]) if len(sys.argv) > 3 else 385
N, G, K, S = 12, 33, 15, 512
# 切分（512 坐标，按火狐定稿量的）
TAIL_TOP = 222                 # 耳尖（约 y=228）以上全是尾巴火焰
TAIL_X, TAIL_Y = 300, 330      # 身子右侧的尾巴根：x≥300、y<330（纯尾巴，身子上去掉）
TAIL_OV_X = 228                # 尾巴那块额外带上 x≥228 的头后区域，身子盖在上面，尾巴转动时不露切口
TAIL_BASE = (300, 300)         # 尾巴摆动转轴
PAW_Y = 395                    # 以下为前爪
OV = 12                        # 爪子上沿藏在身子后面的重叠量
BOB, PAW_LIFT, TAIL_DEG, FLICK = 6, 16, 6, 0.06

a = np.asarray(Image.open(SRC).convert('RGBA'))
ys, xs = np.mgrid[0:S, 0:S]
def part(mask):
    arr = a.copy(); arr[..., 3] = np.where(mask, arr[..., 3], 0); return Image.fromarray(arr, 'RGBA')
m_tail = (ys < TAIL_TOP) | ((xs >= TAIL_X) & (ys < TAIL_Y))            # 从身子上去掉的纯尾巴
m_tail_src = m_tail | ((xs >= TAIL_OV_X) & (ys < TAIL_Y))            # 尾巴部件实际取的范围（含重叠）
paw_zone = ys >= PAW_Y
paw_src = ys >= PAW_Y - OV
grp_a = (xs < 205) | (xs >= 262)       # 最左、最右的爪子
grp_b = ~grp_a                          # 中间那只
tail = part(m_tail_src)
body = part(~m_tail & ~paw_zone)
paw_a, paw_b = part(paw_src & grp_a & ~m_tail), part(paw_src & grp_b & ~m_tail)

def move(img, dx, dy):
    out = Image.new('RGBA', (S, S)); out.paste(img, (int(round(dx)), int(round(dy))), img); return out

def tail_pose(deg, sy):
    """绕尾巴根摆动，并以尾巴根为底边竖向伸缩，像火苗忽长忽短"""
    t = tail.rotate(deg, resample=Image.NEAREST, center=TAIL_BASE)
    h = round(S * sy); r = t.resize((S, h), Image.NEAREST)
    out = Image.new('RGBA', (S, S)); out.paste(r, (0, TAIL_BASE[1] - round(TAIL_BASE[1] * sy)), r); return out

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
    bob = -BOB * abs(math.sin(p))                     # 每步一次起伏（负 y 向上）
    f = Image.new('RGBA', (S, S))
    f.alpha_composite(move(tail_pose(TAIL_DEG * math.sin(p + 0.8), 1 + FLICK * math.sin(2 * p + 1.3)), 0, bob))
    f.alpha_composite(move(paw_a, 0, -PAW_LIFT * max(0.0, s)))
    f.alpha_composite(move(paw_b, 0, -PAW_LIFT * max(0.0, -s)))
    f.alpha_composite(move(body, 0, bob))            # 身子最后画，盖住尾巴部件里重叠的头后区域
    f.save(f'{OUT}/hi_{k:02d}.png')
    to_grid(f).resize((G * K, G * K), Image.NEAREST).save(f'{OUT}/move_{k:02d}.png')
    seals.append(round((SEAL_Y + bob) / S, 3))
print('sealYFrames', seals)
