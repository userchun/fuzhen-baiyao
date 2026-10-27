"""样板检查：抠绿幕 → 裁边 → 缩到目标尺寸，并生成一张检查图。

用法：
  python3 tools/asset-pipeline/check_sample.py assets-raw/level1/lantern_01.png [--size 512] [--game 96] [--key 00FF00]

输出（与原图同目录）：
  <名称>_clean.png   透明背景、居中、size×size，可直接替换进游戏
  <名称>_check.png   检查图：原图 | 游戏尺寸 | 纯黑剪影 | 放进荒村背景 | 绿边残留标红
"""
import argparse
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BG = os.path.join(ROOT, 'assets/resources/textures/bg_level1_village.png')


def key_out(im, key, lo=15, hi=45, wm=True):
    """按"偏键色程度"去背景（容忍 AI 出图的渐变绿幕和阴影），压掉边缘溢色，
    再只保留主体连通块（去掉水印、零散火星外的小碎块）。已带透明通道的图跳过。"""
    import numpy as np
    im = im.convert('RGBA')
    if im.getextrema()[3][0] < 250:
        return im
    a = np.asarray(im).astype(np.int16).copy()
    if wm:  # 即梦水印固定在右下角：填成键色
        h, w = a.shape[:2]
        a[int(h * 0.90):, int(w * 0.72):, :3] = key
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    if key[1] > key[0] and key[1] > key[2]:      # 绿幕
        spill = g - np.maximum(r, b)
        a[..., 1] = np.where(spill > 0, np.maximum(r, b), g)
    else:                                         # 品红幕
        spill = np.minimum(r, b) - g
        a[..., 0] = np.where(spill > 0, g, r)
        a[..., 2] = np.where(spill > 0, g, b)
    # 用相对亮度的比例判断，暗绿阴影和亮绿背景一样能去掉
    bright = np.maximum(np.maximum(r, g), b).astype(np.float32) + 1
    ratio = spill / bright
    alpha = np.clip((hi / 100 - ratio) / ((hi - lo) / 100) * 255, 0, 255).astype(np.int16)
    alpha = keep_main(alpha)
    a[..., 3] = alpha
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def keep_main(alpha, grid=200, min_ratio=0.02):
    """在缩小网格上找连通块，只保留面积 ≥ 最大块 min_ratio 且与最大块相近的块。"""
    import numpy as np
    from collections import deque
    h, w = alpha.shape
    small = np.asarray(Image.fromarray(alpha.astype(np.uint8)).resize((grid, grid), Image.BOX)) > 40
    lab = np.zeros(small.shape, np.int32)
    sizes, boxes, n = {}, {}, 0
    for y in range(grid):
        for x in range(grid):
            if small[y, x] and not lab[y, x]:
                n += 1
                q = deque([(y, x)]); lab[y, x] = n; cnt = 0
                y0 = y1 = y; x0 = x1 = x
                while q:
                    cy, cx = q.popleft(); cnt += 1
                    y0, y1, x0, x1 = min(y0, cy), max(y1, cy), min(x0, cx), max(x1, cx)
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < grid and 0 <= nx < grid and small[ny, nx] and not lab[ny, nx]:
                                lab[ny, nx] = n; q.append((ny, nx))
                sizes[n] = cnt; boxes[n] = (y0, y1, x0, x1)
    if not sizes:
        return alpha
    main = max(sizes, key=sizes.get)
    my0, my1, mx0, mx1 = boxes[main]
    pad = grid // 12
    keep = {main}
    for k, s in sizes.items():  # 主体附近的小块（火星、穗尖）保留，远处的（水印）去掉
        y0, y1, x0, x1 = boxes[k]
        near = y1 >= my0 - pad and y0 <= my1 + pad and x1 >= mx0 - pad and x0 <= mx1 + pad
        if near and s >= 1:
            keep.add(k)
    mask = np.isin(lab, list(keep)).astype(np.uint8) * 255
    mask = np.asarray(Image.fromarray(mask).resize((w, h), Image.NEAREST).filter(ImageFilter.MaxFilter(5))) > 0
    return np.where(mask, alpha, 0)


def fit(im, size, margin=0.06):
    box = im.getbbox()
    im = im.crop(box) if box else im
    inner = int(size * (1 - 2 * margin))
    s = inner / max(im.size)
    im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return out


def fringe_mask(im, key):
    """边缘像素里偏键色的标红，用来找残边。"""
    edge = im.getchannel('A').filter(ImageFilter.FIND_EDGES)
    red = Image.new('RGBA', im.size, (0, 0, 0, 0))
    px, ep, rp = im.load(), edge.load(), red.load()
    green_key = key[1] > key[0] and key[1] > key[2]
    n = 0
    for y in range(im.height):
        for x in range(im.width):
            if ep[x, y] > 0:
                r, g, b, a = px[x, y]
                bad = (g > r + 25 and g > b + 25) if green_key else (r > g + 25 and b > g + 25)
                if a > 0 and bad:
                    rp[x, y] = (255, 0, 0, 255)
                    n += 1
    return red, n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('--size', type=int, default=512)
    ap.add_argument('--game', type=int, default=96, help='游戏里的大致显示像素')
    ap.add_argument('--key', default='00FF00')
    ap.add_argument('--no-wm', action='store_true', help='不去右下角水印')
    a = ap.parse_args()
    key = tuple(int(a.key[i:i + 2], 16) for i in (0, 2, 4))

    raw = Image.open(a.src)
    clean = fit(key_out(raw, key, wm=not a.no_wm), a.size)
    base = os.path.splitext(a.src)[0]
    clean.save(base + '_clean.png')

    P = 320
    sheet = Image.new('RGBA', (P * 5, P + 40), (36, 36, 44, 255))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc', 18)
    except OSError:
        font = None
    sheet.alpha_composite(raw.convert('RGBA').resize((P, P)), (0, 0))
    g = clean.resize((a.game, a.game), Image.LANCZOS)
    sheet.alpha_composite(g, (P + (P - a.game) // 2, (P - a.game) // 2))
    sil = Image.new('RGBA', clean.size, (230, 230, 230, 255))
    black = Image.new('RGBA', clean.size, (0, 0, 0, 255))
    sil.paste(black, (0, 0), clean.getchannel('A'))
    sheet.alpha_composite(sil.resize((a.game, a.game)).resize((P // 2, P // 2), Image.NEAREST), (2 * P + P // 4, P // 4))
    if os.path.exists(BG):
        bg = Image.open(BG).convert('RGBA').crop((0, 380, 720, 1100)).resize((P, P))
        sc = int(a.game * P / 720 * 2.2)
        bg.alpha_composite(clean.resize((sc, sc), Image.LANCZOS), ((P - sc) // 2, P // 3))
        sheet.alpha_composite(bg, (3 * P, 0))
    red, n = fringe_mask(clean, key)
    fr = clean.copy()
    fr.alpha_composite(red)
    sheet.alpha_composite(fr.resize((P, P)), (4 * P, 0))
    for i, t in enumerate(['原图', f'游戏尺寸 {a.game}px', '纯黑剪影', '放进荒村背景', f'残边标红：{n} 像素']):
        d.text((i * P + 8, P + 12), t, fill='white', font=font)
    sheet.save(base + '_check.png')
    print(f'clean: {base}_clean.png\ncheck: {base}_check.png\n残边像素: {n}')


if __name__ == '__main__':
    main()
