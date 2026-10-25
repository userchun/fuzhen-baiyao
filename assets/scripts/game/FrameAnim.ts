import { Node, Sprite, SpriteFrame } from 'cc';

// 简易序列帧播放：持有 SpriteFrame[]，按 fps 切帧；支持 loop 或 once+回调。

export type FrameClip = {
    frames: SpriteFrame[];
    fps: number;
    loop: boolean;
};

export class FrameAnim {
    private sprite: Sprite | null;
    private frames: SpriteFrame[] = [];
    private fps = 8;
    private loop = true;
    private idx = 0;
    private acc = 0;
    private playing = false;
    private onDone: (() => void) | null = null;
    /** 当前 clip 已播放时长（秒），可用于同步 hop */
    elapsed = 0;

    constructor(node: Node) {
        this.sprite = node.getComponent(Sprite);
    }

    get active(): boolean {
        return this.playing && this.frames.length > 0;
    }

    /** 当前帧进度 0..1（整段 clip） */
    get progress(): number {
        if (this.frames.length === 0 || this.fps <= 0) return 0;
        const dur = this.frames.length / this.fps;
        return dur <= 0 ? 0 : (this.elapsed % dur) / dur;
    }

    play(clip: FrameClip, onDone?: () => void): void {
        if (!clip.frames.length || !this.sprite) {
            onDone?.();
            return;
        }
        this.frames = clip.frames;
        this.fps = Math.max(1, clip.fps);
        this.loop = clip.loop;
        this.idx = 0;
        this.acc = 0;
        this.elapsed = 0;
        this.playing = true;
        this.onDone = onDone ?? null;
        this.sprite.spriteFrame = this.frames[0];
    }

    stop(): void {
        this.playing = false;
        this.onDone = null;
    }

    update(dt: number): void {
        if (!this.playing || !this.sprite || this.frames.length === 0) return;
        this.elapsed += dt;
        this.acc += dt;
        const step = 1 / this.fps;
        while (this.acc >= step) {
            this.acc -= step;
            this.idx += 1;
            if (this.idx >= this.frames.length) {
                if (this.loop) {
                    this.idx = 0;
                } else {
                    this.idx = this.frames.length - 1;
                    this.sprite.spriteFrame = this.frames[this.idx];
                    this.playing = false;
                    const cb = this.onDone;
                    this.onDone = null;
                    cb?.();
                    return;
                }
            }
            this.sprite.spriteFrame = this.frames[this.idx];
        }
    }
}
