"""生成 Batch 1 矢量素材（SVG → PNG）。

规格见 design/assets/specs/batch-1-assets.md，风格规则见 design/art/art-bible.md §1–4：
- 描边 = 五行色加深；描边外一圈骨白浅色光边
- 腹部空白字印（汉字由游戏代码叠加）
- 背景低对比、低饱和、禁用圆润形

用法：python3 -I tools/asset-pipeline/gen_batch1_svg.py  （在项目根目录运行）
"""
import math
import os

import cairosvg

OUT = 'assets/resources/textures'
SRC = os.path.join(OUT, 'src')

# 五行色：(主色, 描边加深色, 字印浅底)
EL = {
    'metal': ('#F5D76E', '#8C7428', '#FFF7DA'),
    'wood': ('#5FBF6A', '#2F6B37', '#EAF7E6'),
    'water': ('#5AB4F0', '#22618A', '#E4F3FD'),
    'fire': ('#F06A4A', '#8A3020', '#FDE7E1'),
    'earth': ('#B08A55', '#5E4526', '#F6ECDD'),
}
RIM = '#E8E2D0'
INK = '#1E1A26'


def svg(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">' \
           f'<g stroke-linejoin="round" stroke-linecap="round">{body}</g></svg>'


def rimmed(shape, fill, stroke, sw, rim_w=None):
    """同一形状画两遍：外层骨白光边 + 本体（五行色填充、加深描边）。shape 为不含 fill/stroke 的元素开头，如 '<path d=\"...\"'。"""
    rw = rim_w or sw * 2
    return (f'{shape} fill="none" stroke="{RIM}" stroke-width="{rw}" opacity="0.55"/>'
            f'{shape} fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')


def face(cx, cy, s=1.0):
    """Q 版脸：两只眼 + 高光 + 腮红 + 小嘴。s 为缩放。"""
    ex, ey, er = 10 * s, 0, 4.5 * s
    return (f'<ellipse cx="{cx-ex}" cy="{cy}" rx="{er}" ry="{er*1.25}" fill="{INK}"/>'
            f'<ellipse cx="{cx+ex}" cy="{cy}" rx="{er}" ry="{er*1.25}" fill="{INK}"/>'
            f'<circle cx="{cx-ex+1.5*s}" cy="{cy-2*s}" r="{1.6*s}" fill="#FFF"/>'
            f'<circle cx="{cx+ex+1.5*s}" cy="{cy-2*s}" r="{1.6*s}" fill="#FFF"/>'
            f'<ellipse cx="{cx-17*s}" cy="{cy+7*s}" rx="{5*s}" ry="{3*s}" fill="#F28C8C" opacity="0.6"/>'
            f'<ellipse cx="{cx+17*s}" cy="{cy+7*s}" rx="{5*s}" ry="{3*s}" fill="#F28C8C" opacity="0.6"/>'
            f'<path d="M{cx-4*s} {cy+8*s} Q{cx} {cy+12*s} {cx+4*s} {cy+8*s}" fill="none" stroke="{INK}" stroke-width="{2.5*s}"/>')


def seal(cx, cy, r, el):
    """腹部空白字印：浅底圆 + 加深描边 + 虚线内圈。"""
    main, dark, light = EL[el]
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{light}" stroke="{dark}" stroke-width="{max(2.5, r*0.17)}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r*0.78}" fill="none" stroke="{main}" stroke-width="{max(1.2, r*0.07)}" stroke-dasharray="{r*0.15} {r*0.15}"/>')


# ---------- 妖怪 ----------

def jiangshi():
    m, d, _ = EL['earth']
    b = ''
    # 双臂平伸
    b += rimmed('<rect x="12" y="58" width="32" height="14" rx="6"', m, d, 4)
    b += rimmed('<rect x="84" y="58" width="32" height="14" rx="6"', m, d, 4)
    b += rimmed('<rect x="34" y="36" width="60" height="82" rx="16"', m, d, 5)
    # 清朝官帽
    b += f'<rect x="38" y="26" width="52" height="16" rx="6" fill="#2B2235" stroke="#14101C" stroke-width="4"/>'
    b += f'<rect x="54" y="12" width="20" height="18" rx="6" fill="#2B2235" stroke="#14101C" stroke-width="4"/>'
    b += f'<circle cx="64" cy="10" r="5" fill="#9B3D2E" stroke="#14101C" stroke-width="2.5"/>'
    b += face(64, 56, 0.9)
    b += seal(64, 92, 17, 'earth')
    return svg(128, 128, b)


def foxfire():
    m, d, _ = EL['fire']
    b = ''
    # 尾巴卷成火苗
    tail = '<path d="M86 96 C112 92 118 64 104 44 C110 62 98 70 92 62 C100 52 96 36 84 30 C88 46 80 54 78 66"'
    b += rimmed(tail, m, d, 4)
    b += f'<path d="M98 56 C102 66 96 76 88 78" fill="none" stroke="#FFD08A" stroke-width="4" opacity="0.8"/>'
    # 水滴身体（尖朝上）+ 两只耳朵
    b += rimmed('<path d="M40 40 L46 18 L56 34"', m, d, 4)
    b += rimmed('<path d="M72 34 L82 18 L88 40"', m, d, 4)
    body = '<path d="M64 22 C80 40 98 60 98 82 C98 104 82 118 64 118 C46 118 30 104 30 82 C30 60 48 40 64 22 Z"'
    b += rimmed(body, m, d, 5)
    b += face(64, 64, 0.85)
    b += seal(64, 96, 15, 'fire')
    return svg(128, 128, b)


def lantern(size=192, tassel=True):
    m, d, _ = EL['fire']
    k = size / 192
    cx = size / 2
    b = ''
    # 提梁
    b += f'<path d="M{cx-26*k} {40*k} Q{cx} {4*k} {cx+26*k} {40*k}" fill="none" stroke="#3E2E1E" stroke-width="{6*k}"/>'
    b += rimmed(f'<rect x="{cx-30*k}" y="{30*k}" width="{60*k}" height="{16*k}" rx="{5*k}"', '#3E2E1E', '#1E160E', 4 * k)
    # 灯笼球身
    b += rimmed(f'<ellipse cx="{cx}" cy="{100*k}" rx="{70*k}" ry="{58*k}"', m, d, 6 * k)
    for dx in (-44, -22, 22, 44):
        b += f'<path d="M{cx+dx*k} {46*k} Q{cx+dx*1.35*k} {100*k} {cx+dx*k} {154*k}" fill="none" stroke="{d}" stroke-width="{2.5*k}" opacity="0.5"/>'
    b += f'<ellipse cx="{cx-28*k}" cy="{78*k}" rx="{14*k}" ry="{8*k}" fill="#FFD08A" opacity="0.55"/>'
    b += rimmed(f'<rect x="{cx-30*k}" y="{152*k}" width="{60*k}" height="{14*k}" rx="{5*k}"', '#3E2E1E', '#1E160E', 4 * k)
    if tassel:
        for dx in (-10, 0, 10):
            b += f'<path d="M{cx+dx*k} {166*k} L{cx+dx*k} {188*k}" stroke="#F5D76E" stroke-width="{4*k}"/>'
    b += face(cx, 88 * k, 1.3 * k)
    b += seal(cx, 128 * k, 20 * k, 'fire')
    return svg(size, size, b)


def shuigui():
    m, d, _ = EL['water']
    body = ('<path d="M64 14 C88 14 100 32 100 54 L100 92 C94 100 88 90 82 98 C76 106 70 96 64 104 '
            'C58 112 52 100 46 106 C40 112 34 100 28 106 L28 54 C28 32 40 14 64 14 Z"')
    b = rimmed(body, m, d, 5)
    # 水草发丝
    b += f'<path d="M40 22 C34 36 36 48 30 60 M88 22 C94 36 92 48 98 60" fill="none" stroke="{d}" stroke-width="4" opacity="0.7"/>'
    b += face(64, 46, 0.9)
    b += seal(64, 78, 16, 'water')
    return svg(128, 128, b)


def tongjia(broken=False):
    m, d, _ = EL['metal']
    b = rimmed('<path d="M24 46 C24 34 34 28 46 28 L82 28 C94 28 104 34 104 46 L98 112 C98 118 92 122 86 122 L42 122 C36 122 30 118 30 112 Z"', m, d, 5)
    b += face(64, 50, 0.9)
    if not broken:
        # 甲壳环：环绕腰腹的金属带 + 铆钉
        b += rimmed('<rect x="16" y="68" width="96" height="40" rx="14"', '#C9A949', '#5E4A14', 5)
        for x in (28, 100):
            b += f'<circle cx="{x}" cy="88" r="4" fill="#FFF7DA" stroke="#5E4A14" stroke-width="2"/>'
        b += f'<path d="M22 78 L106 78" stroke="#FFF7DA" stroke-width="2" opacity="0.6"/>'
        b += seal(64, 88, 15, 'metal')
    else:
        b += seal(64, 88, 15, 'metal')
        # 碎裂甲片散落
        b += f'<path d="M8 96 L26 90 L30 108 L12 114 Z" fill="#C9A949" stroke="#5E4A14" stroke-width="3" transform="rotate(-18 19 102)"/>'
        b += f'<path d="M100 92 L120 98 L114 116 L96 110 Z" fill="#C9A949" stroke="#5E4A14" stroke-width="3" transform="rotate(22 108 104)"/>'
        b += f'<path d="M30 70 L36 76 M96 70 L90 78" stroke="#5E4A14" stroke-width="3"/>'
    return svg(128, 128, b)


def heishan():
    m, d, _ = EL['earth']
    b = ''
    body = ('<path d="M192 20 L214 70 L238 58 L250 104 C300 150 350 230 360 300 C366 340 340 364 300 364 '
            'L84 364 C44 364 18 340 24 300 C34 230 84 150 134 104 L146 58 L170 70 Z"')
    b += rimmed(body, m, d, 9, 18)
    # 山体纹理
    b += f'<path d="M120 200 L160 160 L190 190 M230 170 L262 140 L290 186" fill="none" stroke="{d}" stroke-width="6" opacity="0.45"/>'
    b += f'<path d="M180 40 L192 20 L204 40 Z" fill="{RIM}" opacity="0.8"/>'
    # 怒眉
    b += f'<path d="M132 168 L170 182 M252 168 L214 182" stroke="{INK}" stroke-width="9"/>'
    b += face(192, 196, 2.6)
    b += seal(192, 284, 46, 'earth')
    return svg(384, 384, b)


def baigu(el):
    m, d, light = EL[el]
    b = ''
    # 细长竖向身体（裙摆）
    b += rimmed('<path d="M192 120 C232 120 252 170 258 240 C264 310 284 350 292 368 L92 368 C100 350 120 310 126 240 C132 170 152 120 192 120 Z"', m, d, 8, 16)
    # 骨环：横向骨节带
    for y, rx in ((190, 66), (250, 76), (316, 92)):
        b += f'<ellipse cx="192" cy="{y}" rx="{rx}" ry="12" fill="none" stroke="{RIM}" stroke-width="10"/>'
        b += f'<ellipse cx="192" cy="{y}" rx="{rx}" ry="12" fill="none" stroke="{d}" stroke-width="3" stroke-dasharray="14 8"/>'
    # 头 + 发髻 + 骨簪
    b += rimmed('<circle cx="192" cy="92" r="58"', '#F4EFE4', d, 7, 14)
    b += f'<path d="M136 80 C140 30 244 30 248 80 C232 58 152 58 136 80 Z" fill="#2B2235" stroke="#14101C" stroke-width="5"/>'
    b += f'<circle cx="192" cy="28" r="22" fill="#2B2235" stroke="#14101C" stroke-width="5"/>'
    b += f'<path d="M150 24 L234 32" stroke="{RIM}" stroke-width="8"/>'
    b += f'<circle cx="150" cy="24" r="7" fill="{RIM}" stroke="{d}" stroke-width="3"/><circle cx="234" cy="32" r="7" fill="{RIM}" stroke="{d}" stroke-width="3"/>'
    b += face(192, 100, 1.9)
    b += f'<path d="M176 128 L208 128" stroke="{m}" stroke-width="5"/>'
    b += seal(192, 250, 40, el)
    return svg(384, 384, b)


# ---------- 场景 ----------

def wall():
    base, dark = '#6B5236', '#3E2E1E'
    b = f'<rect x="0" y="44" width="1440" height="116" fill="{base}"/>'
    # 垛口方齿
    for x in range(0, 1440, 90):
        b += f'<rect x="{x+8}" y="6" width="54" height="44" fill="{base}" stroke="{dark}" stroke-width="5"/>'
    b += f'<rect x="0" y="44" width="1440" height="116" fill="none" stroke="{dark}" stroke-width="6"/>'
    # 砖纹
    for row, y in enumerate(range(72, 160, 28)):
        b += f'<path d="M0 {y} L1440 {y}" stroke="{dark}" stroke-width="3" opacity="0.6"/>'
        off = 0 if row % 2 == 0 else 45
        for x in range(off, 1440, 90):
            b += f'<path d="M{x} {y-28} L{x} {y}" stroke="{dark}" stroke-width="3" opacity="0.6"/>'
    b += f'<path d="M0 50 L1440 50" stroke="#8C7050" stroke-width="4" opacity="0.7"/>'
    return svg(1440, 160, b)


def bg_village():
    w, h = 1080, 2340
    b = (f'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
         f'<stop offset="0" stop-color="#1C2240"/><stop offset="0.5" stop-color="#141428"/><stop offset="1" stop-color="#0E0E1E"/></linearGradient>'
         f'<radialGradient id="m" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#9FB0D0" stop-opacity="0.25"/><stop offset="1" stop-color="#9FB0D0" stop-opacity="0"/></radialGradient></defs>')
    b += f'<rect width="{w}" height="{h}" fill="url(#g)"/>'
    # 残月 + 月晕 + 遮云
    b += f'<circle cx="820" cy="300" r="260" fill="url(#m)"/>'
    b += f'<circle cx="820" cy="300" r="90" fill="#C8D2E6" opacity="0.55"/>'
    b += f'<circle cx="860" cy="270" r="84" fill="#1C2240"/>'
    b += f'<path d="M640 360 L1000 360 L960 330 L760 330 Z" fill="#232A4A" opacity="0.9"/>'
    # 远处茅屋斜线（顶部地平线，低对比）
    for x, s in ((60, 1.0), (300, 0.7), (880, 0.85)):
        hx, hy = x, 620
        b += (f'<path d="M{hx} {hy} L{hx+90*s} {hy-70*s} L{hx+200*s} {hy-40*s} L{hx+200*s} {hy+60*s} L{hx+10*s} {hy+60*s} Z" '
              f'fill="#1A1E36" stroke="#232845" stroke-width="4"/>')
    b += f'<path d="M0 680 L1080 660 L1080 700 L0 720 Z" fill="#171A30"/>'
    # 两侧歪斜枯枝（只占边缘，中间留空）
    for side in (0, 1):
        sx = 0 if side == 0 else w
        sg = 1 if side == 0 else -1
        b += (f'<path d="M{sx} 1500 L{sx+sg*90} 1180 L{sx+sg*60} 900 M{sx+sg*90} 1180 L{sx+sg*190} 1020 '
              f'M{sx+sg*70} 1000 L{sx+sg*150} 880 M{sx+sg*180} 1030 L{sx+sg*230} 960" '
              f'fill="none" stroke="#1D2140" stroke-width="18"/>')
    # 底部薄雾
    b += f'<rect x="0" y="1700" width="{w}" height="640" fill="#1A1F38" opacity="0.5"/>'
    return svg(w, h, b)


def bg_temple():
    w, h = 1080, 2340
    b = (f'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
         f'<stop offset="0" stop-color="#261F36"/><stop offset="0.5" stop-color="#1E1A2B"/><stop offset="1" stop-color="#14111E"/></linearGradient></defs>')
    b += f'<rect width="{w}" height="{h}" fill="url(#g)"/>'
    # 对称檐角（顶部）
    roof = '#191524'
    b += f'<path d="M-40 520 C200 480 380 420 540 300 C700 420 880 480 1120 520 L1120 600 L-40 600 Z" fill="{roof}"/>'
    b += f'<path d="M-40 520 C200 480 380 420 540 300 C700 420 880 480 1120 520" fill="none" stroke="#2C2440" stroke-width="10"/>'
    b += f'<path d="M60 470 L20 430 M1020 470 L1060 430" stroke="#2C2440" stroke-width="10"/>'
    b += f'<rect x="-40" y="600" width="1160" height="30" fill="#221C30"/>'
    # 两侧立柱
    for x in (40, 960):
        b += f'<rect x="{x}" y="630" width="80" height="1710" fill="#1A1626" stroke="#251F33" stroke-width="6"/>'
    # 熄灭灯座（中性暖白微光，非火色）
    for x in (220, 860):
        b += f'<rect x="{x-14}" y="1500" width="28" height="200" fill="#1C1828"/>'
        b += f'<path d="M{x-40} 1500 L{x+40} 1500 L{x+24} 1450 L{x-24} 1450 Z" fill="#221C30" stroke="#2C2440" stroke-width="4"/>'
        b += f'<circle cx="{x}" cy="1430" r="26" fill="#E8E2D0" opacity="0.06"/>'
    # 檀烟
    b += f'<path d="M540 760 C500 820 580 880 540 940 C500 1000 580 1060 540 1120" fill="none" stroke="#3A3150" stroke-width="10" opacity="0.35"/>'
    return svg(w, h, b)


# ---------- 图标 ----------

def talisman(el, color, dark, pattern):
    b = f'<rect x="10" y="10" width="108" height="172" rx="18" fill="#2A2438" stroke="{dark}" stroke-width="6"/>'
    b += f'<rect x="20" y="20" width="88" height="152" rx="12" fill="none" stroke="{color}" stroke-width="4"/>'
    b += f'<circle cx="64" cy="20" r="6" fill="#14101C" stroke="{color}" stroke-width="3"/>'
    g = f'<g fill="none" stroke="{color}" stroke-width="2.5" opacity="0.55">'
    if pattern == 'circle':
        g += '<circle cx="64" cy="96" r="40"/><circle cx="64" cy="96" r="32" stroke-dasharray="4 4"/>'
        for cx, cy in ((36, 44), (92, 44), (36, 150), (92, 150)):
            g += f'<circle cx="{cx}" cy="{cy}" r="6"/>'
    elif pattern == 'wave':
        for y in (40, 52, 140, 152):
            g += f'<path d="M30 {y} Q40 {y-8} 50 {y} T70 {y} T90 {y} T98 {y-2}"/>'
        g += '<circle cx="64" cy="96" r="38"/>'
    elif pattern == 'triangle':
        g += '<path d="M64 52 L104 128 L24 128 Z"/><path d="M64 140 L44 104 L84 104 Z"/>'
        for cx in (36, 92):
            g += f'<path d="M{cx} 36 L{cx+8} 50 L{cx-8} 50 Z"/>'
    elif pattern == 'square':
        g += '<rect x="28" y="60" width="72" height="72"/><rect x="36" y="68" width="56" height="56" stroke-dasharray="4 4"/>'
        for cx, cy in ((36, 44), (92, 44), (36, 150), (92, 150)):
            g += f'<rect x="{cx-6}" y="{cy-6}" width="12" height="12"/>'
    elif pattern == 'vertical':
        for x in (32, 44, 84, 96):
            g += f'<path d="M{x} 36 L{x} 156"/>'
        g += '<circle cx="64" cy="96" r="34"/>'
    elif pattern == 'lightning':
        g += '<path d="M40 34 L56 64 L46 66 L62 98"/><path d="M88 158 L72 128 L82 126 L66 94"/><circle cx="64" cy="96" r="36"/>'
    b += g + '</g>'
    b += f'<circle cx="64" cy="96" r="26" fill="#3A3150" stroke="{color}" stroke-width="3"/>'
    b += '<path d="M56 172 L56 186 M64 172 L64 188 M72 172 L72 186" stroke="#9B3D2E" stroke-width="3" stroke-linecap="round"/>'
    return svg(128, 192, b)


def passive(motif):
    c, dk, lt = '#6F6888', '#3A3450', '#C9C2DA'
    b = f'<circle cx="48" cy="48" r="42" fill="{c}" stroke="{dk}" stroke-width="5"/>'
    b += f'<circle cx="48" cy="48" r="34" fill="none" stroke="{lt}" stroke-width="2" stroke-dasharray="4 4" opacity="0.7"/>'
    b += f'<circle cx="48" cy="48" r="20" fill="#4A4362" stroke="{lt}" stroke-width="2.5"/>'
    m = f'<g fill="none" stroke="{lt}" stroke-width="3.5" opacity="0.9">'
    if motif == 'brush':
        m += '<path d="M70 18 L58 34"/><path d="M58 34 L54 40 L60 38 Z" fill="#C9C2DA"/>'
    elif motif == 'drop':
        m += '<path d="M72 14 C80 26 80 32 72 36 C64 32 64 26 72 14 Z" fill="#9B3D2E" stroke="#3A3450"/>'
    elif motif == 'split':
        m += '<rect x="62" y="12" width="10" height="16" rx="2"/><rect x="74" y="16" width="10" height="16" rx="2"/>'
    elif motif == 'shield':
        m += '<path d="M72 12 L84 16 L84 26 C84 32 78 36 72 38 C66 36 60 32 60 26 L60 16 Z"/>'
    b += m + '</g>'
    return svg(96, 96, b)


ASSETS = {
    'enemy_jiangshi': jiangshi,
    'enemy_foxfire': foxfire,
    'enemy_lantern': lambda: lantern(192, True),
    'enemy_lantern_split': lambda: lantern(96, False),
    'enemy_shuigui': shuigui,
    'enemy_tongjia': lambda: tongjia(False),
    'enemy_tongjia_broken': lambda: tongjia(True),
    'boss_heishan': heishan,
    'boss_baigu_metal': lambda: baigu('metal'),
    'boss_baigu_water': lambda: baigu('water'),
    'boss_baigu_fire': lambda: baigu('fire'),
    'env_wall': wall,
    'bg_level1_village': bg_village,
    'bg_level2_temple': bg_temple,
    'icon_talisman_water': lambda: talisman('water', '#5AB4F0', '#22618A', 'wave'),
    'icon_talisman_fire': lambda: talisman('fire', '#F06A4A', '#8A3020', 'triangle'),
    'icon_talisman_earth': lambda: talisman('earth', '#B08A55', '#5E4526', 'square'),
    'icon_talisman_wood': lambda: talisman('wood', '#5FBF6A', '#2F6B37', 'vertical'),
    'icon_talisman_thunder': lambda: talisman('none', '#E8E2D0', '#7A7488', 'lightning'),
    'icon_passive_haste': lambda: passive('brush'),
    'icon_passive_power': lambda: passive('drop'),
    'icon_passive_multi': lambda: passive('split'),
    'icon_passive_ward': lambda: passive('shield'),
}

if __name__ == '__main__':
    os.makedirs(SRC, exist_ok=True)
    for name, fn in ASSETS.items():
        text = fn()
        with open(os.path.join(SRC, name + '.svg'), 'w', encoding='utf-8') as f:
            f.write(text)
        cairosvg.svg2png(bytestring=text.encode('utf-8'), write_to=os.path.join(OUT, name + '.png'))
    print(f'generated {len(ASSETS)} assets')
