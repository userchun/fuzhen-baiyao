"""并脚跳的部件动画（泥尸）：定稿 512 方图（脚底 0.94）拆出两只袖子，按蓄力 → 起跳 → 腾空 → 落地合成 12 帧，再缩成 33 格像素。

用法：python3 scripts/puppet-hop.py <定稿512方图> <输出目录> [胸口符牌中心 y（512 坐标）]
输出 move_00..11.png（495 方图）和每帧字印高度 sealYFrames（打印出来，填进 Art.ts）。
"""
import math, os, sys
import numpy as np
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
SEAL_Y = float(sys.argv[3]) if len(sys.argv) > 3 else 242
N, G, K, S = 12, 33, 15, 512
FOOT = round(S * 0.94)
# 袖子范围与肩膀转轴（512 坐标，按泥尸定稿量的）
# 腰线以上按肩宽切袖子，腰线以下只切爪子，不碰袍子下摆
WAIST = 290
L_ARM = dict(x1=186, x1_low=158, y0=140, y1=352, pivot=(186, 168))
R_ARM = dict(x0=326, x0_low=354, y0=140, y1=352, pivot=(326, 168))
# 每帧：(离地高度, 竖向缩放, 袖子上扬角度)；缩放以脚底为轴，>1 拉长，<1 压扁
# 最高 36：人物上方只留约 40 像素，再高帽子会出画布
POSE = [(0, 1.00, 0), (0, 0.95, -2), (0, 0.89, -3), (10, 1.05, 4), (26, 1.02, 7), (36, 1.00, 8),
        (36, 1.00, 8), (26, 1.01, 6), (10, 1.03, 3), (0, 0.88, -3), (0, 0.95, -2), (0, 1.00, 0)]

src = Image.open(SRC).convert('RGBA'); a = np.asarray(src)
ys, xs = np.mgrid[0:S, 0:S]
def part(mask):
    arr = a.copy(); arr[..., 3] = np.where(mask, arr[..., 3], 0); return Image.fromarray(arr, 'RGBA')
m_l = (ys >= L_ARM['y0']) & (ys < L_ARM['y1']) & (((ys < WAIST) & (xs < L_ARM['x1'])) | ((ys >= WAIST) & (xs < L_ARM['x1_low'])))
m_r = (ys >= R_ARM['y0']) & (ys < R_ARM['y1']) & (((ys < WAIST) & (xs >= R_ARM['x0'])) | ((ys >= WAIST) & (xs >= R_ARM['x0_low'])))
# 袖子靠里的 10 像素同时留在身子上（重叠），袖子转开时露出的是身子布料而不是描边
OV = 10
core_l = m_l & (xs < L_ARM['x1'] - OV) & ~((ys >= WAIST) & (xs >= L_ARM['x1_low'] - OV))
core_r = m_r & (xs >= R_ARM['x0'] + OV) & ~((ys >= WAIST) & (xs < R_ARM['x0_low'] + OV))
body, arm_l, arm_r = part(~core_l & ~core_r), part(m_l), part(m_r)

def squash(img, sy):
    """以脚底为轴竖向缩放，横向反向补偿，保持体积感"""
    sx = 1 / math.sqrt(sy)
    w, h = round(S * sx), round(S * sy)
    r = img.resize((w, h), Image.NEAREST); out = Image.new('RGBA', (S, S))
    out.paste(r, ((S - w) // 2, FOOT - round(FOOT * sy)), r); return out

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
for k, (up, sy, arm) in enumerate(POSE):
    f = Image.new('RGBA', (S, S))
    f.alpha_composite(body)
    f.alpha_composite(arm_l.rotate(-arm, resample=Image.NEAREST, center=L_ARM['pivot']))
    f.alpha_composite(arm_r.rotate(arm, resample=Image.NEAREST, center=R_ARM['pivot']))
    f = squash(f, sy)
    moved = Image.new('RGBA', (S, S)); moved.paste(f, (0, -up), f)
    moved.save(f'{OUT}/hi_{k:02d}.png')
    to_grid(moved).resize((G * K, G * K), Image.NEAREST).save(f'{OUT}/move_{k:02d}.png')
    seals.append(round((FOOT - (FOOT - SEAL_Y) * sy - up) / S, 3))
print('sealYFrames', seals)
