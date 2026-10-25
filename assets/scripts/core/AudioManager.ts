import { resources, AudioClip, AudioSource, Node } from 'cc';

// 音频管理：预加载 resources/audio 下全部 SFX + BGM，提供播放接口。
// 素材缺失时不报错，静默跳过（与 Art.ts 的退回策略一致）。
// 按需注册（loadAudio 失败时 games 仍可无声音运行）。

const clips = new Map<string, AudioClip>();

const SFX_KEYS = [
    'shoot', 'hit', 'crit', 'resist', 'explode', 'freeze', 'thunder',
    'levelup', 'combo', 'boss', 'win', 'lose', 'click',
    'paperman_rustle', 'tongjia_clank', 'shuigui_dive_in', 'shuigui_dive_out',
    'foxfire_whoosh', 'shuigui_presence',
] as const;

const BGM_KEYS = ['village', 'temple'] as const;

export type SfxName = typeof SFX_KEYS[number];
export type BgmName = typeof BGM_KEYS[number];

function sfxPath(k: SfxName): string { return 'audio/sfx/' + k; }
function bgmPath(k: BgmName): string { return 'audio/bgm/' + k; }

/** 加载全部音频；失败不抛错，clips 保持为空 */
export function loadAudio(): Promise<void> {
    return new Promise((resolve) => {
        const paths = [...SFX_KEYS.map(sfxPath), ...BGM_KEYS.map(bgmPath)];
        if (paths.length === 0) { resolve(); return; }
        let left = paths.length;
        paths.forEach((p) => {
            resources.load(p, AudioClip, (err, clip) => {
                if (!err && clip) clips.set(p, clip);
                if (--left === 0) resolve();
            });
        });
    });
}

/**
 * 一次性 SFX 播放器：优先复用当前节点上的 AudioSource，否则临时建一个。
 * 播放后不清理（短促 SFX 生命周期短，由 AudioSource 自身结束）。
 */
export class AudioManager {
    private bgmSource: AudioSource | null = null;
    /** 可停止的循环 SFX（如纸人存在感），按 key 复用 AudioSource */
    private loopSources = new Map<SfxName, AudioSource>();
    private sfxNode: Node;

    constructor(private root: Node) {
        this.sfxNode = new Node('audio');
        this.sfxNode.layer = root.layer;
        root.addChild(this.sfxNode);
    }

    private playClip(path: string, volume: number, loop = false): void {
        const clip = clips.get(path);
        if (!clip) return;
        const n = new Node('sfx');
        n.layer = this.sfxNode.layer;
        this.sfxNode.addChild(n);
        const src = n.addComponent(AudioSource);
        src.clip = clip;
        src.loop = loop;
        src.volume = volume;
        src.play();
        if (!loop) {
            src.node.once(AudioSource.EventType.ENDED, () => n.destroy());
        }
    }

    playSfx(key: SfxName, volume = 1): void {
        this.playClip(sfxPath(key), volume, false);
    }

    /**
     * 循环 SFX：同一 key 已在播则不重启（可改音量）；用于纸人等存在感底噪。
     * 素材缺失时静默跳过。
     */
    playLoopSfx(key: SfxName, volume = 1): void {
        const path = sfxPath(key);
        const clip = clips.get(path);
        if (!clip) return;
        let src = this.loopSources.get(key);
        if (!src) {
            const n = new Node('sfx-loop-' + key);
            n.layer = this.sfxNode.layer;
            this.sfxNode.addChild(n);
            src = n.addComponent(AudioSource);
            this.loopSources.set(key, src);
        }
        if (src.clip !== clip) {
            src.clip = clip;
            src.loop = true;
            src.volume = volume;
            src.play();
        } else if (!src.playing) {
            src.volume = volume;
            src.play();
        } else {
            src.volume = volume;
        }
    }

    stopLoopSfx(key: SfxName): void {
        const src = this.loopSources.get(key);
        if (src && src.playing) src.stop();
    }

    /** 播放/切换 BGM；同一首且正在播时不重启；停过后同曲可续播 */
    playBgm(key: BgmName, volume = 0.6): void {
        const path = bgmPath(key);
        const clip = clips.get(path);
        if (!clip) return;
        if (!this.bgmSource) {
            const n = new Node('bgm');
            n.layer = this.sfxNode.layer;
            this.sfxNode.addChild(n);
            this.bgmSource = n.addComponent(AudioSource);
        }
        const same = this.bgmSource.clip === clip;
        if (!same) {
            this.bgmSource.clip = clip;
            this.bgmSource.loop = true;
            this.bgmSource.volume = volume;
            this.bgmSource.play();
        } else if (!this.bgmSource.playing) {
            this.bgmSource.volume = volume;
            this.bgmSource.play();
        }
    }

    stopBgm(): void {
        if (this.bgmSource) this.bgmSource.stop();
    }
}
