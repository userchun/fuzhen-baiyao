#!/usr/bin/env python3
"""把 AI 出的网格动画序列图切成游戏帧：每格只保留主体、去红/绿残边、脚底和身体中线对齐、统一缩放。

用法: slice_sheet.py sheet.png outdir --cols 4 --rows 2 [--size 256] [--fill 0.87] [--strip strip.png] [--gif preview.gif --fps 9]
输出 outdir/<name>_00.png …（RGBA，size×size），可选横条 strip 和预览 gif。
"""
import argparse, os
import numpy as np
from PIL import Image
import cv2


def main_component(a):
    n, lab, st, _ = cv2.connectedComponentsWithStats((a > 24).astype(np.uint8), 8)
    if n <= 1: return a
    keep = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    # 保留主体及离主体很近的小碎块（纸带等）
    mask = cv2.dilate((lab == keep).astype(np.uint8), np.ones((3, 3), np.uint8), iterations=6) > 0
    ids = [i for i in np.unique(lab[mask & (lab > 0)]) if i == keep or not (
        st[i, cv2.CC_STAT_LEFT] == 0 or st[i, cv2.CC_STAT_LEFT] + st[i, cv2.CC_STAT_WIDTH] >= a.shape[1]
        or st[i, cv2.CC_STAT_TOP] == 0 or st[i, cv2.CC_STAT_TOP] + st[i, cv2.CC_STAT_HEIGHT] >= a.shape[0])]
    ok = np.isin(lab, ids)  # 贴着格子四边的碎块多半是邻格漏进来的，丢掉
    return np.where(ok, a, 0)


def defringe(rgba):
    a = rgba[..., 3].astype(np.float32)
    inner = cv2.erode((a > 128).astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    edge = (a > 0) & ~inner
    rgba[..., 3] = np.where(edge, (a * 0.55).astype(np.uint8), rgba[..., 3])
    # 边缘偏红/偏绿的像素往灰度拉
    rgb = rgba[..., :3].astype(np.float32)
    g = rgb.mean(-1, keepdims=True)
    rgba[..., :3] = np.where(edge[..., None], (rgb * 0.4 + g * 0.6), rgb).astype(np.uint8)
    return rgba


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet"); ap.add_argument("outdir")
    ap.add_argument("--cols", type=int, default=4); ap.add_argument("--rows", type=int, default=2)
    ap.add_argument("--size", type=int, default=256); ap.add_argument("--fill", type=float, default=0.87)
    ap.add_argument("--seal-band", help="按发光封印横向对齐：在 y0,y1（像素，输出尺寸下）范围找亮暖色质心，如 60,170")
    ap.add_argument("--name", default="move", help="输出帧名前缀，如 idle / hit / death")
    ap.add_argument("--count", type=int, help="只取前 N 格（网格有空格时用）")
    ap.add_argument("--strip"); ap.add_argument("--gif"); ap.add_argument("--fps", type=float, default=9)
    a = ap.parse_args()
    im = np.array(Image.open(a.sheet).convert("RGBA"))
    H, W = im.shape[:2]; cw, ch = W / a.cols, H / a.rows
    cells = []
    for r in range(a.rows):
        for c in range(a.cols):
            cell = im[int(r * ch):int((r + 1) * ch), int(c * cw):int((c + 1) * cw)].copy()
            cell[..., 3] = main_component(cell[..., 3])
            cells.append(defringe(cell))
    # 统一缩放：按最高的一帧
    if a.count: cells = cells[:a.count]
    boxes = [Image.fromarray(x).getbbox() for x in cells]
    maxh = max(b[3] - b[1] for b in boxes)
    s = a.size * a.fill / maxh
    os.makedirs(a.outdir, exist_ok=True)
    frames = []
    for i, (cell, b) in enumerate(zip(cells, boxes)):
        al = cell[..., 3] > 128
        # 身体中线：上半身（胸口以上）的列质心，避免被伸出的手/纸带带偏
        top = al[b[1]:b[1] + int((b[3] - b[1]) * 0.55)]
        cx = (np.nonzero(top)[1].mean()) if top.any() else (b[0] + b[2]) / 2
        img = Image.fromarray(cell)
        img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
        out = Image.new("RGBA", (a.size, a.size))
        bottom = round(b[3] * s)
        out.alpha_composite(img, (round(a.size / 2 - cx * s), round(a.size * 0.94 - bottom)))
        if a.seal_band:
            y0, y1 = map(int, a.seal_band.split(","))
            q = np.array(out).astype(int)[y0:y1]
            m = (q[..., 3] > 200) & (q[..., 0] > 215) & (q[..., 1] > 180) & (q[..., 2] > 140)
            if m.any():
                dx = round(a.size / 2 - np.nonzero(m)[1].mean())
                o2 = Image.new("RGBA", out.size); o2.alpha_composite(out, (dx, 0)); out = o2
        p = os.path.join(a.outdir, f"{a.name}_{i:02d}.png"); out.save(p); frames.append(out)
    if a.strip:
        st = Image.new("RGBA", (a.size * len(frames), a.size))
        for i, f in enumerate(frames): st.paste(f, (i * a.size, 0))
        st.save(a.strip)
    if a.gif:
        bg = [Image.alpha_composite(Image.new("RGBA", f.size, (30, 32, 44, 255)), f).convert("RGB") for f in frames]
        bg[0].save(a.gif, save_all=True, append_images=bg[1:], duration=int(1000 / a.fps), loop=0)
    print(f"{len(frames)} 帧 -> {a.outdir}，缩放 {s:.3f}")


if __name__ == "__main__":
    main()
