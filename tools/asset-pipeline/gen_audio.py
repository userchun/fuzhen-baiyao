"""程序化合成第一关（荒村）音频：全套 SFX + 荒村/古寺 BGM。

用 numpy 直接合成 WAV，再经 ffmpeg 转 mp3（Web/native 通用）。
中式志怪、深色夜景氛围，音色以「钟磬 / 木鱼 / 箫类长音 / 低频 pad」为主。

用法：python3 -I tools/asset-pipeline/gen_audio.py  （在项目根目录运行）
依赖：numpy + ffmpeg（在 PATH 中）
输出：assets/resources/audio/sfx/*.mp3 与 assets/resources/audio/bgm/*.mp3
"""
import math
import os
import subprocess
import wave

import numpy as np

SR = 44100
OUT_SFX = 'assets/resources/audio/sfx'
OUT_BGM = 'assets/resources/audio/bgm'
TMP = 'temp/_audio_src'

RNG = np.random.default_rng(20261024)


# ---------- 基础波形工具 ----------

def _t(dur):
    return np.linspace(0.0, dur, int(SR * dur), endpoint=False)


def _env(n, a=0.01, r=0.3):
    """attack-decay 包络（线性 attack，指数 decay）。"""
    na = int(SR * a)
    e = np.ones(n)
    e[:na] = np.linspace(0, 1, na)
    if r > 0:
        nr = int(SR * r)
        if nr < n:
            e[nr:] *= np.exp(-np.linspace(0, 6, n - nr))
    return e


def _sine(freq, dur, a=0.005, r=0.4, amp=1.0):
    n = int(SR * dur)
    t = _t(dur)
    return amp * _env(n, a, r) * np.sin(2 * np.pi * freq * t)


def _harm(freq, dur, amps=(1.0, 0.5, 0.25), a=0.005, r=0.4, amp=1.0):
    """带泛音的音（更接近钟/琴的质感）。"""
    n = int(SR * dur)
    t = _t(dur)
    out = np.zeros(n)
    for i, h in enumerate(amps, start=1):
        out += h * np.sin(2 * np.pi * freq * i * t)
    return amp * _env(n, a, r) * out / sum(amps)


def _bell(freq, dur=0.8, amp=1.0):
    """钟磬音：基频 + 非整数泛音，快速起音、长衰减。"""
    n = int(SR * dur)
    t = _t(dur)
    out = (np.sin(2 * np.pi * freq * t)
           + 0.6 * np.sin(2 * np.pi * freq * 2.01 * t)
           + 0.35 * np.sin(2 * np.pi * freq * 3.02 * t))
    e = np.exp(-t * 5.0)
    return amp * e * out / 2.0


def _noise(dur, a=0.002, r=0.3, amp=1.0, lowcut=400, highcut=6000):
    """带通白噪声（简单 FFT 滤波）。"""
    n = int(SR * dur)
    x = RNG.standard_normal(n)
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(n, 1 / SR)
    mask = (freqs >= lowcut) & (freqs <= highcut)
    spec[~mask] = 0
    x = np.fft.irfft(spec, n)
    x = x / (np.max(np.abs(x)) + 1e-9)
    return amp * _env(n, a, r) * x


def _mix(*tracks):
    out = None
    for tr in tracks:
        tr = np.asarray(tr)
        if out is None:
            out = np.zeros_like(tr, dtype=float)
        elif len(tr) > len(out):
            out = np.pad(out, (0, len(tr) - len(out)))
        out[:len(tr)] += tr
    return out


def _norm(x, peak=0.9):
    x = np.asarray(x, dtype=float)
    m = np.max(np.abs(x))
    if m > 0:
        x = x * (peak / m)
    return x


def _write(path, x, peak=0.9):
    x = _norm(x, peak=peak)
    pcm = (x * 32767).astype(np.int16)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# ---------- SFX 合成 ----------

def sfx_shoot():
    """写符 / cast：干宣纸扑簌+撕裂 + 笔锋，收尾朱砂落印（共用印章层）。
    近距干夜空气，少混响；忌枪口 whoosh / EDM riser。~150–170ms。"""
    # 1) 纸纤维扑簌（中高频窄带噪声，短颤）
    flutter = _noise(0.09, 0.002, 0.07, 0.55, 1800, 6500)
    # 轻微振幅颤动模拟纸页抖动
    n_f = len(flutter)
    t_f = np.linspace(0, 0.09, n_f, endpoint=False)
    flutter *= (0.75 + 0.25 * np.sin(2 * np.pi * 38 * t_f))

    # 2) 撕裂：极短噪声尖峰 + 下滑摩擦
    tear_dur = 0.045
    n_t = int(SR * tear_dur)
    tear = _noise(tear_dur, 0.001, 0.035, 0.7, 2500, 9000)
    fric_f = np.linspace(2400, 700, n_t)
    fric = 0.35 * np.sin(2 * np.pi * np.cumsum(fric_f) / SR) * _env(n_t, 0.001, 0.03)
    tear = tear + fric

    # 3) 笔锋：短促中高频摩擦（干笔走纸）
    brush = _mix(
        _noise(0.055, 0.003, 0.045, 0.4, 900, 4500),
        0.2 * _sine(920, 0.05, 0.002, 0.04, 0.35),
    )

    # 4) 朱砂落印（seal-land，bake 进同一文件尾）
    stamp = _mix(
        _sine(140, 0.07, 0.001, 0.055, 0.85),   # 印面闷击
        _sine(280, 0.05, 0.001, 0.04, 0.35),
        _noise(0.035, 0.001, 0.025, 0.45, 600, 2800),  # 纸面受印
    )

    # 时间轴排布：扑簌 → 撕/笔 → 落印
    total = 0.16
    n = int(SR * total)
    out = np.zeros(n)

    def place(seg, at, amp=1.0):
        i0 = int(SR * at)
        seg = np.asarray(seg) * amp
        i1 = min(n, i0 + len(seg))
        out[i0:i1] += seg[: i1 - i0]

    place(flutter, 0.0, 1.0)
    place(tear, 0.035, 0.9)
    place(brush, 0.04, 0.85)
    place(stamp, 0.095, 1.0)

    # 干、近：极短尾，无长混响
    fade = int(SR * 0.02)
    out[-fade:] *= np.linspace(1, 0, fade)
    return out


def sfx_hit():
    """印上身 / hit：短纸拍+印章闷击 + 薄墨咬合。忌合成轰/肉拍。~100–120ms。"""
    # 纸拍：宽带短噪声，偏干
    slap = _noise(0.045, 0.001, 0.03, 0.75, 800, 5500)
    # 印章闷击（与 shoot 共用印章语汇，略更实）
    seal = _mix(
        _sine(120, 0.08, 0.001, 0.06, 1.0),
        _sine(240, 0.05, 0.001, 0.04, 0.4),
        _noise(0.03, 0.001, 0.02, 0.4, 400, 2200),
    )
    # 薄墨咬合：极短高频毛刺（墨洇/纤维）
    ink = _mix(
        _noise(0.025, 0.0008, 0.018, 0.55, 3500, 10000),
        0.25 * _sine(2100, 0.02, 0.0005, 0.015, 0.4),
    )

    total = 0.11
    n = int(SR * total)
    out = np.zeros(n)

    def place(seg, at, amp=1.0):
        i0 = int(SR * at)
        seg = np.asarray(seg) * amp
        i1 = min(n, i0 + len(seg))
        out[i0:i1] += seg[: i1 - i0]

    place(slap, 0.0, 1.0)
    place(seal, 0.012, 1.0)
    place(ink, 0.028, 0.85)

    fade = int(SR * 0.015)
    out[-fade:] *= np.linspace(1, 0, fade)
    return out


def sfx_crit():
    """克制命中：更脆更亮，高频叮 + 低频冲击。"""
    return _mix(
        _bell(1320, 0.25, 0.8),
        _sine(220, 0.16, 0.002, 0.12, 0.7),
        _noise(0.06, 0.001, 0.04, 0.4, 2000, 9000),
    )


def sfx_resist():
    """被克命中：闷、低频、快衰减。"""
    return _mix(
        _sine(110, 0.2, 0.003, 0.25, 1.0),
        _noise(0.1, 0.002, 0.15, 0.4, 100, 800),
    )


def sfx_explode():
    """火球爆炸：噪声爆发 + 低频轰鸣。"""
    return _mix(
        _noise(0.35, 0.002, 0.3, 1.0, 150, 4000),
        _sine(80, 0.4, 0.002, 0.35, 0.8),
    )


def sfx_freeze():
    """冻结：高频冷感叮 + 冰裂噪声。"""
    return _mix(
        _bell(2400, 0.4, 0.6),
        _bell(3600, 0.3, 0.4),
        _noise(0.15, 0.001, 0.12, 0.3, 4000, 9000),
    )


def sfx_thunder():
    """落雷：白噪声 crack + 低频滚雷。"""
    crack = _noise(0.08, 0.001, 0.05, 1.0, 1000, 12000)
    rumble = _noise(0.5, 0.01, 0.45, 0.8, 60, 400)
    return _mix(crack, rumble)


def sfx_levelup():
    """升级：上行琶音（宫商角）。"""
    seq = [_harm(f, 0.18, r=0.16) for f in (523.25, 659.25, 783.99)]
    out = None
    for i, s in enumerate(seq):
        n = len(s)
        padded = np.zeros(int(SR * 0.4))
        padded[i * int(SR * 0.09):i * int(SR * 0.09) + n] = s
        out = padded if out is None else out + padded
    return out


def sfx_combo():
    """合击解锁：大和弦爆发 + 上升滑音。"""
    dur = 0.9
    n = int(SR * dur)
    t = _t(dur)
    base = _harm(261.63, dur, r=0.8, amp=0.5) + _harm(329.63, dur, r=0.8, amp=0.5) + _harm(392.0, dur, r=0.8, amp=0.5)
    sweep_f = np.linspace(400, 1600, n)
    sweep = 0.4 * np.sin(2 * np.pi * np.cumsum(sweep_f) / SR) * _env(n, 0.3, 0.5)
    return _mix(base, sweep, _noise(0.5, 0.01, 0.4, 0.3, 1000, 8000))


def sfx_boss():
    """Boss 登场：低沉轰鸣 + 重击。"""
    dur = 1.2
    n = int(SR * dur)
    t = _t(dur)
    roar = _sine(55, dur, 0.05, 1.0, 0.9) + _sine(110, dur, 0.05, 1.0, 0.5)
    thud = _sine(70, 0.5, 0.001, 0.4, 1.0)
    return _mix(roar, thud, _noise(0.6, 0.02, 0.5, 0.4, 60, 300))


def sfx_win():
    """胜利：明亮上行 + 钟声。"""
    return _mix(
        _bell(523.25, 1.2, 0.7),
        _bell(659.25, 1.2, 0.6),
        _bell(783.99, 1.4, 0.6),
        _harm(1046.5, 1.0, r=0.9, amp=0.4),
    )


def sfx_lose():
    """失败：下行 + 闷。"""
    return _mix(
        _harm(392.0, 0.5, r=0.4, amp=0.6),
        _harm(311.13, 0.6, r=0.5, amp=0.6),
        _harm(261.63, 0.9, r=0.8, amp=0.7),
        _sine(60, 1.0, 0.05, 0.9, 0.5),
    )


def sfx_click():
    """UI 点击：短促咔。"""
    return _mix(
        _sine(1500, 0.04, 0.001, 0.03, 0.7),
        _noise(0.03, 0.001, 0.02, 0.4, 2000, 8000),
    )


def sfx_paperman_rustle():
    """纸人存在感：干宣纸扑簌循环。稀疏、近距、无 whoosh。~2.2s 无缝。"""
    total = 2.2
    n = int(SR * total)
    out = np.zeros(n)

    def place(seg, at, amp=1.0):
        i0 = int(SR * at)
        seg = np.asarray(seg, dtype=float) * amp
        i1 = min(n, i0 + len(seg))
        if i1 > i0:
            out[i0:i1] += seg[: i1 - i0]

    # 稀疏纸纤维爆发（中高频 1.5–7kHz），错落分布
    bursts = [
        (0.12, 0.09, 0.22),
        (0.48, 0.07, 0.18),
        (0.85, 0.11, 0.20),
        (1.18, 0.06, 0.16),
        (1.55, 0.10, 0.21),
        (1.92, 0.08, 0.17),
    ]
    for at, dur, amp in bursts:
        burst = _noise(dur, 0.003, dur * 0.85, amp, 1500, 7000)
        nb = len(burst)
        tb = np.linspace(0, dur, nb, endpoint=False)
        # 软 flutter AM（纸页轻颤），无上升 whoosh
        burst *= (0.78 + 0.22 * np.sin(2 * np.pi * 27 * tb))
        place(burst, at, 1.0)

    # 极低底噪（近距干纸纤维气声），便于循环下垫
    bed = _noise(total, 0.05, total * 0.95, 0.045, 1800, 5500)
    out += bed

    # 整体压低，可在战斗下循环
    out *= 0.55

    # 首尾交叉淡化，无缝循环
    xfade = int(SR * 0.06)  # 60ms
    head = out[:xfade].copy()
    tail = out[-xfade:].copy()
    fade_out = np.linspace(1.0, 0.0, xfade)
    fade_in = np.linspace(0.0, 1.0, xfade)
    out[-xfade:] = tail * fade_out + head * fade_in
    # 均衡端点，避免循环跳变
    out[0] = out[-1]
    return out


def sfx_tongjia_clank():
    """铜甲脚步：氧化青铜闷响 + 葬布摩擦。短、干夜、留出符纸朱砂空间。~0.32s。"""
    total = 0.32
    n = int(SR * total)
    out = np.zeros(n)

    def place(seg, at, amp=1.0):
        i0 = int(SR * at)
        seg = np.asarray(seg, dtype=float) * amp
        i1 = min(n, i0 + len(seg))
        if i1 > i0:
            out[i0:i1] += seg[: i1 - i0]

    # 非谐金属分音（氧化青铜，中低频，忌过亮）
    clank_dur = 0.22
    nc = int(SR * clank_dur)
    tc = np.linspace(0, clank_dur, nc, endpoint=False)
    partials = [
        (185, 1.00, 9.0),
        (310, 0.55, 11.0),
        (470, 0.35, 14.0),
        (680, 0.22, 18.0),
        (870, 0.12, 22.0),
    ]
    metal = np.zeros(nc)
    for f, a, decay in partials:
        metal += a * np.sin(2 * np.pi * f * tc) * np.exp(-tc * decay)
    metal *= _env(nc, 0.001, 0.18)
    # 轻微非谐拍频（锈蚀感）
    metal += 0.08 * np.sin(2 * np.pi * 203 * tc) * np.exp(-tc * 12)
    place(metal, 0.0, 0.7)

    # 葬布刮擦（低中频干噪）
    scrape = _noise(0.14, 0.004, 0.12, 0.35, 250, 1800)
    place(scrape, 0.02, 0.55)

    # 干、短尾；整体压低，勿盖过 shoot
    fade = int(SR * 0.04)
    out[-fade:] *= np.linspace(1, 0, fade)
    out *= 0.62
    return out


def sfx_shuigui_dive_in():
    """水鬼入水：下潜滤波噪声 + 短促闷击。干夜空气，少混响。~0.4s。"""
    total = 0.4
    n = int(SR * total)
    out = np.zeros(n)

    # 下行滤波噪声（plunge）
    plunge_dur = 0.28
    np_ = int(SR * plunge_dur)
    x = RNG.standard_normal(np_)
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(np_, 1 / SR)
    # 随时间收窄到低频：按帧滑动高切
    plunge = np.zeros(np_)
    # 分段滤波近似：整段先宽，再与下滑包络叠
    mask = (freqs >= 80) & (freqs <= 4500)
    spec2 = spec.copy()
    spec2[~mask] = 0
    wide = np.fft.irfft(spec2, np_)
    wide = wide / (np.max(np.abs(wide)) + 1e-9)
    t = np.linspace(0, plunge_dur, np_, endpoint=False)
    # 高切收紧：用低通倾向（指数衰减高频感）+ 下滑
    lp = np.exp(-t * 6.5)
    plunge = wide * lp * _env(np_, 0.008, 0.22)
    # 轻微下扫低音
    sweep_f = np.linspace(220, 70, np_)
    plunge += 0.35 * np.sin(2 * np.pi * np.cumsum(sweep_f) / SR) * _env(np_, 0.005, 0.2)

    # 入水闷击
    thud = _mix(
        _sine(90, 0.08, 0.002, 0.06, 0.9),
        _sine(55, 0.1, 0.003, 0.08, 0.55),
        _noise(0.05, 0.002, 0.04, 0.3, 100, 600),
    )

    out[:len(plunge)] += 0.75 * plunge
    i0 = int(SR * 0.04)
    thud = np.asarray(thud)
    i1 = min(n, i0 + len(thud))
    out[i0:i1] += 0.85 * thud[: i1 - i0]

    fade = int(SR * 0.05)
    out[-fade:] *= np.linspace(1, 0, fade)
    out *= 0.7
    return out


def sfx_shuigui_dive_out():
    """水鬼出水：上行溅水 + 水珠滴答。~0.42s。"""
    total = 0.42
    n = int(SR * total)
    out = np.zeros(n)

    def place(seg, at, amp=1.0):
        i0 = int(SR * at)
        seg = np.asarray(seg, dtype=float) * amp
        i1 = min(n, i0 + len(seg))
        if i1 > i0:
            out[i0:i1] += seg[: i1 - i0]

    # 上行溅水（更亮噪声爆发）
    splash_dur = 0.22
    ns = int(SR * splash_dur)
    splash = _noise(splash_dur, 0.004, 0.18, 0.85, 600, 9000)
    ts = np.linspace(0, splash_dur, ns, endpoint=False)
    # 上扫亮感
    sweep_f = np.linspace(180, 1400, ns)
    splash = splash * (0.55 + 0.45 * (ts / splash_dur))
    splash += 0.28 * np.sin(2 * np.pi * np.cumsum(sweep_f) / SR) * _env(ns, 0.003, 0.16)
    place(splash, 0.0, 0.9)

    # 水珠滴答（短 tick）
    for at, amp in ((0.16, 0.45), (0.24, 0.35), (0.31, 0.25)):
        tick = _mix(
            _noise(0.025, 0.001, 0.018, amp, 2500, 10000),
            0.3 * _sine(2100 + amp * 400, 0.02, 0.0008, 0.015, amp),
        )
        place(tick, at, 1.0)

    fade = int(SR * 0.05)
    out[-fade:] *= np.linspace(1, 0, fade)
    out *= 0.72
    return out



def sfx_foxfire_whoosh():
    """狐火存在感 / Soft looping 漂浮焰息 — airy ember breath under the fox, presence only, never a cast zap.
    Soften bright crackle toward ember breath; ~2.05s seamless loop; no whoosh/zap."""
    total = 2.05
    n = int(SR * total)
    out = np.zeros(n)
    t = _t(total)

    def place(seg, at, amp=1.0):
        i0 = int(SR * at)
        seg = np.asarray(seg, dtype=float) * amp
        i1 = min(n, i0 + len(seg))
        if i1 > i0:
            out[i0:i1] += seg[: i1 - i0]

    # 1) 漂浮焰息床：中低频暖空气 + 极软高频细丝（ember breath，非 crackle）
    #    带通偏暖（400–2800），忌 4k+ 亮裂
    bed = _noise(total, 0.1, total * 0.9, 0.07, 400, 2800)
    breath = 0.78 + 0.22 * np.sin(2 * np.pi * 0.32 * t)  # 慢呼吸，无上升
    out += bed * breath

    # 2) 气态微颤（飘移感）：极低幅中频正弦颤，忌频扫 whoosh
    drift = (0.018 * np.sin(2 * np.pi * 190 * t)
             + 0.010 * np.sin(2 * np.pi * 280 * t)) * breath
    out += drift * (0.65 + 0.35 * np.sin(2 * np.pi * 0.55 * t))

    # 3) 稀疏软 ember 息点（柔化后的「余烬」脉冲，非亮 crackle）
    embers = [
        (0.22, 0.08, 0.14),
        (0.68, 0.07, 0.11),
        (1.15, 0.09, 0.13),
        (1.62, 0.075, 0.10),
    ]
    for at, dur, amp in embers:
        # 中频软噪 + 极弱暖基音；高切压到 ~3.2k
        ember = _mix(
            _noise(dur, 0.012, dur * 0.85, amp, 600, 3200),
            0.15 * _sine(210 + amp * 40, dur, 0.02, dur * 0.8, amp),
        )
        place(ember, at, 0.55)

    out *= 0.46  # 低幅，战斗下垫底

    xfade = int(SR * 0.08)
    head = out[:xfade].copy()
    tail = out[-xfade:].copy()
    out[-xfade:] = tail * np.linspace(1.0, 0.0, xfade) + head * np.linspace(0.0, 1.0, xfade)
    out[0] = out[-1]
    return out


def sfx_shuigui_presence():
    """水鬼常态存在感 / Soft looping 湿气水边拖曳 — damp cloth + shallow water lap at the bank, cold wet, never dry scrape.
    Soft mid damp-cloth friction + soft low-mid bank water laps; ~2.3s seamless loop."""
    total = 2.3
    n = int(SR * total)
    out = np.zeros(n)
    t = _t(total)

    def place(seg, at, amp=1.0):
        i0 = int(SR * at)
        seg = np.asarray(seg, dtype=float) * amp
        i1 = min(n, i0 + len(seg))
        if i1 > i0:
            out[i0:i1] += seg[: i1 - i0]

    # 1) 湿气底：冷湿低中频（忌干刮）
    bed = _noise(total, 0.08, total * 0.92, 0.055, 80, 700)
    bed *= (0.78 + 0.22 * np.sin(2 * np.pi * 0.18 * t))
    out += bed

    # 2) 湿布摩擦：软中频噪（damp cloth friction），无干边
    cloths = [
        (0.20, 0.18, 0.26),
        (0.85, 0.16, 0.22),
        (1.48, 0.20, 0.24),
        (2.00, 0.14, 0.18),
    ]
    for at, dur, amp in cloths:
        cloth = _noise(dur, 0.02, dur * 0.75, amp, 280, 1600)
        # 略闷、湿：叠极软低频
        cloth = _mix(cloth, 0.22 * _sine(70, dur * 0.7, 0.03, dur * 0.55, amp * 0.6))
        place(cloth, at, 0.65)

    # 3) 浅水拍岸：软低中频脉冲（shallow bank water laps）
    laps = [
        (0.35, 0.12, 0.28),
        (0.95, 0.11, 0.24),
        (1.55, 0.13, 0.26),
        (2.10, 0.10, 0.20),
    ]
    for at, dur, amp in laps:
        # 闷水拍：低中频噪 + 软低频鼓包，短湿尾
        lap = _mix(
            _noise(dur, 0.015, dur * 0.7, amp, 100, 900),
            0.45 * _sine(55, dur * 0.55, 0.02, dur * 0.45, amp),
            0.2 * _sine(110, dur * 0.4, 0.015, dur * 0.35, amp * 0.7),
        )
        place(lap, at, 0.7)

    # 4) 极软水珠（可选点缀，冷湿、短）
    for at, amp in ((0.55, 0.18), (1.25, 0.15), (1.85, 0.14)):
        drip = _mix(
            _noise(0.035, 0.004, 0.028, amp, 900, 3500),
            0.2 * _sine(980, 0.028, 0.003, 0.02, amp),
        )
        place(drip, at, 0.5)

    out *= 0.5

    xfade = int(SR * 0.09)
    head = out[:xfade].copy()
    tail = out[-xfade:].copy()
    out[-xfade:] = tail * np.linspace(1.0, 0.0, xfade) + head * np.linspace(0.0, 1.0, xfade)
    out[0] = out[-1]
    return out




def sfx_paperman_death():
    """纸人死亡 / 纸撕：干宣纸撕裂+扑簌飘散。对齐符纸材质族，非 shoot 落印。~0.35s。"""
    total = 0.36
    n = int(SR * total)
    out = np.zeros(n)

    def place(seg, at, amp=1.0):
        i0 = int(SR * at)
        seg = np.asarray(seg, dtype=float) * amp
        i1 = min(n, i0 + len(seg))
        if i1 > i0:
            out[i0:i1] += seg[: i1 - i0]

    # 主撕：中高频窄带纤维裂开（1.8–8k），短锐起
    tear = _noise(0.12, 0.0015, 0.1, 0.95, 1800, 8500)
    nt = len(tear)
    tt = np.linspace(0, 0.12, nt, endpoint=False)
    tear *= (0.7 + 0.3 * np.sin(2 * np.pi * 55 * tt))  # 纸边颤裂
    place(tear, 0.0, 1.0)

    # 次撕 / 飘散扑簌（稍暗、稍短）
    flutter = _noise(0.16, 0.004, 0.14, 0.55, 1400, 6000)
    nf = len(flutter)
    tf = np.linspace(0, 0.16, nf, endpoint=False)
    flutter *= (0.75 + 0.25 * np.sin(2 * np.pi * 28 * tf))
    place(flutter, 0.08, 0.85)

    # 极短纸屑尾（干、近距）
    shred = _noise(0.1, 0.003, 0.085, 0.28, 2000, 7000)
    place(shred, 0.2, 0.7)

    fade = int(SR * 0.04)
    out[-fade:] *= np.linspace(1, 0, fade)
    out *= 0.78
    return out


def sfx_foxfire_snuff():
    """狐火死亡 / 熄焰：软余烬呼出熄灭。presence 焰息族，忌施法 zap。~0.4s。"""
    total = 0.4
    n = int(SR * total)
    out = np.zeros(n)
    t = _t(total)

    # 1) 暖空气呼出：中低频噪，渐灭
    breath = _noise(0.32, 0.02, 0.28, 0.7, 350, 2800)
    nb = len(breath)
    tb = np.linspace(0, 0.32, nb, endpoint=False)
    # 下行熄灭（幅+略下沉）
    breath *= (1.0 - 0.55 * (tb / 0.32))
    breath *= (0.8 + 0.2 * np.sin(2 * np.pi * 6 * tb))
    out[:nb] += 0.85 * breath

    # 2) 软暖基音下沉（ember 收口）
    sweep_f = np.linspace(240, 90, n)
    ember = np.sin(2 * np.pi * np.cumsum(sweep_f) / SR)
    ember *= np.exp(-t * 7.5) * _env(n, 0.015, 0.32)
    out += 0.28 * ember

    # 3) 末尾极软余烬点（非 crackle）
    tip = _mix(
        _noise(0.08, 0.01, 0.07, 0.35, 500, 2600),
        0.2 * _sine(180, 0.07, 0.015, 0.055, 0.4),
    )
    i0 = int(SR * 0.22)
    tip = np.asarray(tip)
    i1 = min(n, i0 + len(tip))
    out[i0:i1] += 0.45 * tip[: i1 - i0]

    fade = int(SR * 0.05)
    out[-fade:] *= np.linspace(1, 0, fade)
    out *= 0.62
    return out


def sfx_tongjia_break():
    """铜甲死亡/破甲 / 甲裂：氧化青铜壳裂 + 短葬布撕。可兼 broken-armor。~0.45s。"""
    total = 0.46
    n = int(SR * total)
    out = np.zeros(n)

    def place(seg, at, amp=1.0):
        i0 = int(SR * at)
        seg = np.asarray(seg, dtype=float) * amp
        i1 = min(n, i0 + len(seg))
        if i1 > i0:
            out[i0:i1] += seg[: i1 - i0]

    # 1) 壳裂冲击：非谐金属分音（同 tongjia 族，稍亮、更碎）
    crack_dur = 0.28
    nc = int(SR * crack_dur)
    tc = np.linspace(0, crack_dur, nc, endpoint=False)
    partials = [
        (165, 1.00, 8.0),
        (285, 0.65, 10.5),
        (440, 0.42, 13.0),
        (620, 0.28, 16.0),
        (910, 0.18, 20.0),
        (1180, 0.1, 24.0),
    ]
    metal = np.zeros(nc)
    for f, a, decay in partials:
        metal += a * np.sin(2 * np.pi * f * tc) * np.exp(-tc * decay)
    metal *= _env(nc, 0.001, 0.22)
    # 锈蚀拍频
    metal += 0.1 * np.sin(2 * np.pi * 198 * tc) * np.exp(-tc * 11)
    place(metal, 0.0, 0.85)

    # 2) 二次碎响（更短更闷）
    shard_dur = 0.14
    ns = int(SR * shard_dur)
    ts = np.linspace(0, shard_dur, ns, endpoint=False)
    shard = (0.7 * np.sin(2 * np.pi * 210 * ts) * np.exp(-ts * 14)
             + 0.4 * np.sin(2 * np.pi * 380 * ts) * np.exp(-ts * 18)
             + 0.2 * np.sin(2 * np.pi * 560 * ts) * np.exp(-ts * 22))
    shard *= _env(ns, 0.001, 0.1)
    place(shard, 0.1, 0.55)

    # 3) 葬布短撕（干中低频）
    cloth = _noise(0.16, 0.003, 0.14, 0.5, 280, 2200)
    place(cloth, 0.04, 0.6)

    # 4) 极短金属屑噪
    grit = _noise(0.08, 0.001, 0.065, 0.3, 1200, 5000)
    place(grit, 0.02, 0.45)

    fade = int(SR * 0.05)
    out[-fade:] *= np.linspace(1, 0, fade)
    out *= 0.7
    return out


def sfx_shuigui_death():
    """水鬼死亡 / 水散：冷水涣散溶解。湿冷，忌干刮。~0.45s。"""
    total = 0.45
    n = int(SR * total)
    out = np.zeros(n)

    def place(seg, at, amp=1.0):
        i0 = int(SR * at)
        seg = np.asarray(seg, dtype=float) * amp
        i1 = min(n, i0 + len(seg))
        if i1 > i0:
            out[i0:i1] += seg[: i1 - i0]

    # 1) 主体水散：中低频湿噪爆开后下沉
    scatter_dur = 0.28
    ns = int(SR * scatter_dur)
    scatter = _noise(scatter_dur, 0.006, 0.24, 0.9, 120, 3500)
    ts = np.linspace(0, scatter_dur, ns, endpoint=False)
    scatter *= (1.0 - 0.45 * (ts / scatter_dur))
    # 软低沉
    sweep_f = np.linspace(160, 55, ns)
    scatter += 0.4 * np.sin(2 * np.pi * np.cumsum(sweep_f) / SR) * _env(ns, 0.008, 0.22)
    place(scatter, 0.0, 0.9)

    # 2) 湿布散开（短、闷）
    cloth = _noise(0.18, 0.015, 0.15, 0.4, 200, 1400)
    place(cloth, 0.05, 0.55)

    # 3) 水珠滴散尾
    for at, amp in ((0.2, 0.4), (0.28, 0.3), (0.35, 0.22)):
        drip = _mix(
            _noise(0.04, 0.003, 0.032, amp, 800, 4500),
            0.25 * _sine(900 + amp * 300, 0.03, 0.002, 0.022, amp),
        )
        place(drip, at, 0.75)

    fade = int(SR * 0.05)
    out[-fade:] *= np.linspace(1, 0, fade)
    out *= 0.72
    return out


def sfx_enemy_hurt():
    """共用短受击：妖魔躯体闷击。薄、短，非玩家朱砂印章。~0.15s。"""
    total = 0.15
    n = int(SR * total)
    out = np.zeros(n)

    # 躯体闷击：低中频 + 短噪
    body = _mix(
        _sine(110, 0.07, 0.0015, 0.055, 0.85),
        _sine(70, 0.08, 0.002, 0.065, 0.45),
        _noise(0.045, 0.0012, 0.038, 0.4, 400, 2800),
    )
    body = np.asarray(body)
    out[:len(body)] += body

    # 极薄肉质边（忌金属/朱砂亮边）
    flesh = _noise(0.04, 0.0015, 0.032, 0.25, 600, 3500)
    i0 = int(SR * 0.008)
    flesh = np.asarray(flesh)
    i1 = min(n, i0 + len(flesh))
    out[i0:i1] += 0.55 * flesh[: i1 - i0]

    fade = int(SR * 0.02)
    out[-fade:] *= np.linspace(1, 0, fade)
    out *= 0.68
    return out


def sfx_amb_village():
    """荒村环境垫 / Soft looping 风虫夜垫 — sparse night wind + distant cricket ticks.
    Dry nocturnal folklore village; ~10s seamless; bake quiet under BGM (no melody/whoosh)."""
    total = 10.0
    n = int(SR * total)
    out = np.zeros(n)
    t = _t(total)

    def place(seg, at, amp=1.0):
        i0 = int(SR * at)
        seg = np.asarray(seg, dtype=float) * amp
        i1 = min(n, i0 + len(seg))
        if i1 > i0:
            out[i0:i1] += seg[: i1 - i0]

    # 1) 夜风床：低中频干风，慢起伏（忌 whoosh riser）
    wind = _noise(total, 0.15, total * 0.9, 0.09, 60, 900)
    wind *= (0.72 + 0.28 * np.sin(2 * np.pi * 0.07 * t)
             + 0.08 * np.sin(2 * np.pi * 0.13 * t))
    out += wind

    # 2) 极软远风丝（略高一点，仍干、远）
    hush = _noise(total, 0.2, total * 0.88, 0.035, 400, 2200)
    hush *= (0.8 + 0.2 * np.sin(2 * np.pi * 0.05 * t + 1.2))
    out += hush

    # 3) 稀疏虫鸣/蟋蟀 tick：远端短啁啾，非旋律
    crickets = [
        (0.85, 0.045, 4200, 0.22),
        (1.95, 0.038, 5100, 0.18),
        (3.10, 0.05, 3900, 0.20),
        (4.40, 0.042, 4700, 0.16),
        (5.70, 0.048, 4400, 0.19),
        (7.05, 0.04, 5300, 0.15),
        (8.35, 0.046, 4050, 0.17),
        (9.40, 0.036, 4900, 0.14),
    ]
    for at, dur, f0, amp in crickets:
        # 短啁啾：窄噪 + 软载波，快速衰减
        chirp = _mix(
            _noise(dur, 0.002, dur * 0.85, amp, f0 - 600, f0 + 900),
            0.35 * _sine(f0 * 0.55, dur, 0.003, dur * 0.7, amp),
        )
        # 微颤（虫翅感），忌长鸣旋律
        nn = len(np.asarray(chirp))
        tt = np.linspace(0, dur, nn, endpoint=False)
        chirp = np.asarray(chirp) * (0.75 + 0.25 * np.sin(2 * np.pi * 38 * tt))
        place(chirp, at, 0.55)

    # 4) 偶发更远的虫点（更短更暗）
    for at, amp in ((2.55, 0.1), (6.2, 0.09), (8.9, 0.08)):
        tick = _noise(0.02, 0.0015, 0.016, amp, 2800, 6500)
        place(tick, at, 0.45)

    out *= 0.55

    xfade = int(SR * 0.25)
    head = out[:xfade].copy()
    tail = out[-xfade:].copy()
    out[-xfade:] = tail * np.linspace(1.0, 0.0, xfade) + head * np.linspace(0.0, 1.0, xfade)
    out[0] = out[-1]
    return out


def sfx_amb_temple():
    """古寺环境垫 / Soft looping 滴水·木鱼远景 — sparse drip + rare far wooden-fish taps.
    Temple night; colder emptier; ~10s seamless; bake quiet under BGM (no melody)."""
    total = 10.0
    n = int(SR * total)
    out = np.zeros(n)
    t = _t(total)

    def place(seg, at, amp=1.0):
        i0 = int(SR * at)
        seg = np.asarray(seg, dtype=float) * amp
        i1 = min(n, i0 + len(seg))
        if i1 > i0:
            out[i0:i1] += seg[: i1 - i0]

    # 1) 空冷底：极低湿气/石廊空气（冷、空）
    air = _noise(total, 0.2, total * 0.9, 0.04, 40, 450)
    air *= (0.78 + 0.22 * np.sin(2 * np.pi * 0.045 * t))
    out += air

    # 2) 稀疏水滴：短湿滴 + 极软石回（忌成串旋律）
    drips = [
        (0.70, 0.20),
        (1.85, 0.16),
        (3.25, 0.18),
        (4.90, 0.14),
        (6.40, 0.17),
        (7.95, 0.15),
        (9.20, 0.13),
    ]
    for at, amp in drips:
        drip = _mix(
            _noise(0.028, 0.002, 0.022, amp, 1200, 4500),
            0.35 * _sine(920, 0.04, 0.002, 0.032, amp),
            0.18 * _sine(460, 0.06, 0.004, 0.05, amp * 0.7),
        )
        place(drip, at, 0.5)
        # 极软石面回声尾（更远更闷）
        echo = _mix(
            _noise(0.05, 0.008, 0.04, amp * 0.35, 600, 2200),
            0.2 * _sine(380, 0.07, 0.01, 0.055, amp * 0.4),
        )
        place(echo, at + 0.09, 0.35)

    # 3) 远景木鱼：稀疏、闷、远（非 BGM 节奏层）
    wood_hits = [
        (1.20, 0.22),
        (4.10, 0.18),
        (7.30, 0.20),
        (9.55, 0.16),
    ]
    for at, amp in wood_hits:
        # 木鱼：短中低频木击 + 空腔短尾
        wood = _mix(
            _noise(0.045, 0.0012, 0.038, amp, 280, 1400),
            0.55 * _sine(185, 0.09, 0.002, 0.07, amp),
            0.28 * _sine(280, 0.07, 0.002, 0.055, amp * 0.8),
            0.12 * _sine(92, 0.11, 0.003, 0.09, amp * 0.6),
        )
        place(wood, at, 0.42)

    out *= 0.48

    xfade = int(SR * 0.28)
    head = out[:xfade].copy()
    tail = out[-xfade:].copy()
    out[-xfade:] = tail * np.linspace(1.0, 0.0, xfade) + head * np.linspace(0.0, 1.0, xfade)
    out[0] = out[-1]
    return out


SFX = {
    'shoot': sfx_shoot,
    'hit': sfx_hit,
    'crit': sfx_crit,
    'resist': sfx_resist,
    'explode': sfx_explode,
    'freeze': sfx_freeze,
    'thunder': sfx_thunder,
    'levelup': sfx_levelup,
    'combo': sfx_combo,
    'boss': sfx_boss,
    'win': sfx_win,
    'lose': sfx_lose,
    'click': sfx_click,
    'paperman_rustle': sfx_paperman_rustle,
    'tongjia_clank': sfx_tongjia_clank,
    'shuigui_dive_in': sfx_shuigui_dive_in,
    'shuigui_dive_out': sfx_shuigui_dive_out,
    'foxfire_whoosh': sfx_foxfire_whoosh,
    'shuigui_presence': sfx_shuigui_presence,
    'paperman_death': sfx_paperman_death,
    'foxfire_snuff': sfx_foxfire_snuff,
    'tongjia_break': sfx_tongjia_break,
    'shuigui_death': sfx_shuigui_death,
    'enemy_hurt': sfx_enemy_hurt,
    'amb_village': sfx_amb_village,
    'amb_temple': sfx_amb_temple,
}


# ---------- 荒村 BGM ----------

PENTA = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]  # C D E G A C


def bgm_village():
    """荒村 BGM：低音 pad 呼吸 + 稀疏钟磬 + 五声音阶箫类长音。
    约 32 秒，可无缝循环（首尾音量都趋于 0）。"""
    total = 32.0
    n = int(SR * total)
    t = _t(total)
    out = np.zeros(n)

    # 1) 低音 pad：两个低频正弦 + 慢呼吸调制
    breath = 0.6 + 0.4 * np.sin(2 * np.pi * 0.05 * t)
    pad = (0.5 * np.sin(2 * np.pi * 110 * t) + 0.3 * np.sin(2 * np.pi * 110.5 * t)) * breath
    out += 0.18 * pad

    # 2) 稀疏钟磬（随机固定序列，营造荒凉、不规则）
    bells = [(0.0, 392.0, 0.6), (4.0, 329.63, 0.5), (8.0, 440.0, 0.5), (12.0, 293.66, 0.6),
             (16.0, 392.0, 0.5), (20.0, 523.25, 0.4), (24.0, 329.63, 0.6), (28.0, 293.66, 0.5)]
    for at, f, a in bells:
        seg = _bell(f, 2.2, a)
        i0 = int(SR * at)
        if i0 + len(seg) <= n:
            out[i0:i0 + len(seg)] += seg

    # 3) 箫类长音：五声音阶缓慢滑奏（两段，首尾留静音以便循环）
    def flute(f, at, dur):
        nn = int(SR * dur)
        tt = np.linspace(0, dur, nn, endpoint=False)
        vib = 1 + 0.01 * np.sin(2 * np.pi * 5 * tt)
        e = np.sin(np.pi * tt / dur)  # 缓入缓出
        return e * vib * np.sin(2 * np.pi * f * tt)

    seg1 = flute(261.63, 2.0, 8.0)
    seg2 = flute(329.63, 14.0, 8.0)
    seg3 = flute(293.66, 26.0, 5.5)
    for at, seg in ((2.0, seg1), (14.0, seg2), (26.0, seg3)):
        i0 = int(SR * at)
        if i0 + len(seg) <= n:
            out[i0:i0 + len(seg)] += 0.22 * seg

    # 4) 木鱼/打击点：低音量点节奏
    for at in (4.0, 8.0, 12.0, 16.0, 20.0, 24.0, 28.0):
        wood = _noise(0.06, 0.001, 0.05, 0.35, 400, 1600)
        i0 = int(SR * at)
        if i0 + len(wood) <= n:
            out[i0:i0 + len(wood)] += wood

    # 首尾 1 秒淡入淡出，保证循环无爆音
    fade = int(SR * 1.5)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)

    return _norm(out, 0.6)




def bgm_temple():
    """古寺 BGM：更深 pad + 更密钟磬/木鱼，偏庄严空寂。约 32 秒可循环。"""
    total = 32.0
    n = int(SR * total)
    t = _t(total)
    out = np.zeros(n)

    breath = 0.55 + 0.45 * np.sin(2 * np.pi * 0.04 * t)
    pad = (0.55 * np.sin(2 * np.pi * 82.5 * t)
           + 0.35 * np.sin(2 * np.pi * 165.0 * t)
           + 0.2 * np.sin(2 * np.pi * 247.5 * t)) * breath
    out += 0.2 * pad

    bells = [(0.0, 311.13, 0.55), (3.0, 392.0, 0.45), (6.0, 261.63, 0.5),
             (9.0, 349.23, 0.45), (12.0, 293.66, 0.55), (15.0, 440.0, 0.4),
             (18.0, 311.13, 0.5), (21.0, 392.0, 0.45), (24.0, 261.63, 0.55),
             (27.0, 349.23, 0.4), (30.0, 293.66, 0.5)]
    for at, f, a in bells:
        seg = _bell(f, 2.4, a)
        i0 = int(SR * at)
        if i0 + len(seg) <= n:
            out[i0:i0 + len(seg)] += seg

    def flute(f, dur):
        nn = int(SR * dur)
        tt = np.linspace(0, dur, nn, endpoint=False)
        vib = 1 + 0.008 * np.sin(2 * np.pi * 4.5 * tt)
        e = np.sin(np.pi * tt / dur)
        return e * vib * np.sin(2 * np.pi * f * tt)

    for at, f, dur in ((1.5, 196.0, 9.0), (12.0, 246.94, 8.0), (22.0, 220.0, 7.0)):
        seg = flute(f, dur)
        i0 = int(SR * at)
        if i0 + len(seg) <= n:
            out[i0:i0 + len(seg)] += 0.18 * seg

    for at in np.arange(2.0, 32.0, 2.0):
        wood = _noise(0.05, 0.001, 0.04, 0.28, 350, 1400)
        i0 = int(SR * at)
        if i0 + len(wood) <= n:
            out[i0:i0 + len(wood)] += wood

    fade = int(SR * 1.5)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    return _norm(out, 0.58)

# ---------- 输出 ----------

def to_mp3(wav_path, mp3_path, bitrate='128k'):
    os.makedirs(os.path.dirname(mp3_path), exist_ok=True)
    subprocess.run(
        ['ffmpeg', '-y', '-loglevel', 'error', '-i', wav_path,
         '-codec:a', 'libmp3lame', '-b:a', bitrate, mp3_path],
        check=True,
    )


def main():
    os.makedirs(TMP, exist_ok=True)
    os.makedirs(OUT_SFX, exist_ok=True)
    os.makedirs(OUT_BGM, exist_ok=True)

    print('合成 SFX ...')
    for name, fn in SFX.items():
        wav = os.path.join(TMP, name + '.wav')
        mp3 = os.path.join(OUT_SFX, name + '.mp3')
        _write(wav, fn())
        to_mp3(wav, mp3)
        print(f'  {name}.mp3')

    print('合成 BGM ...')
    for name, fn in (('village', bgm_village), ('temple', bgm_temple)):
        wav = os.path.join(TMP, name + '.wav')
        mp3 = os.path.join(OUT_BGM, name + '.mp3')
        _write(wav, fn())
        to_mp3(wav, mp3, bitrate='160k')
        print(f'  {name}.mp3')

    # 清理临时 wav
    for f in os.listdir(TMP):
        os.remove(os.path.join(TMP, f))
    os.rmdir(TMP)
    print('完成。')


def write_named(names):
    """仅写出指定 SFX 名（不触碰 BGM / 未点名的 SFX）。"""
    os.makedirs(TMP, exist_ok=True)
    os.makedirs(OUT_SFX, exist_ok=True)
    for name in names:
        if name not in SFX:
            raise KeyError(f'unknown sfx: {name}')
        wav = os.path.join(TMP, name + '.wav')
        mp3 = os.path.join(OUT_SFX, name + '.mp3')
        peak = 0.30 if name.startswith('amb_') else 0.9
        _write(wav, SFX[name](), peak=peak)
        to_mp3(wav, mp3)
        print(f'  {name}.mp3')
        try:
            os.remove(wav)
        except OSError:
            pass
    # 若 TMP 空则收掉
    try:
        if os.path.isdir(TMP) and not os.listdir(TMP):
            os.rmdir(TMP)
    except OSError:
        pass


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        print('合成选定 SFX ...')
        write_named(sys.argv[1:])
        print('完成。')
    else:
        main()
