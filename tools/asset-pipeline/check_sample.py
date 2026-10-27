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


def key_out(im, key, tol=90):
    """按与色键的距离去背景；已带透明通道的图跳过。边缘做去色溢出。"""
    im = im.convert('RGBA')
    if im.getextrema()[3][0] < 250:  # 已有透明
        return im
    kr, kg, kb = key
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = ((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2) ** 0.5
            if d < tol:
                px[x, y] = (0, 0, 0, 0)
            elif d < tol * 2:  # 半透明过渡 + 压掉溢出的键色
                alpha = int(255 * (d - tol) / tol)
                if kg > kr and kg > kb:
                    g = min(g, max(r, b))
                else:
                    r, b = min(r, g), min(b, g)
                px[x, y] = (r, g, b, alpha)
    return im


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
    a = ap.parse_args()
    key = tuple(int(a.key[i:i + 2], 16) for i in (0, 2, 4))

    raw = Image.open(a.src)
    clean = fit(key_out(raw, key), a.size)
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
