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


def _write(path, x):
    x = _norm(x)
    pcm = (x * 32767).astype(np.int16)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# ---------- SFX 合成 ----------

def sfx_shoot():
    """符纸破空：高频嗖声，频率快速下滑。"""
    dur = 0.12
    n = int(SR * dur)
    t = _t(dur)
    f = np.linspace(3200, 900, n)
    phase = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(phase) * _env(n, 0.003, 0.08)
    x += 0.3 * _noise(dur, 0.003, 0.06, 0.5, 1500, 7000)
    return x


def sfx_hit():
    """普通命中：短促低频砰。"""
    return _mix(
        _sine(180, 0.14, 0.002, 0.1, 1.0),
        _noise(0.08, 0.001, 0.05, 0.5, 200, 3000),
    )


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


if __name__ == '__main__':
    main()
