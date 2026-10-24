import { Node, ParticleSystem2D, UITransform, Layers, Color, v2 } from 'cc';
import { getFrame } from '../core/Art';

// 粒子特效：统一用 ParticleSystem2D，共享一张白色径向圆点贴图（fx_dot.png），
// 通过 startColor 上色，避免为每种特效单独出贴图。
// 贴图缺失时静默跳过（不播放），与 Art.ts 的退回策略一致。

function makeNode(name: string, parent: Node): Node {
    const n = new Node(name);
    n.layer = Layers.Enum.UI_2D;
    n.addComponent(UITransform);
    if (parent) parent.addChild(n);
    return n;
}

function toColor(hex: string, a = 255): Color {
    const c = new Color();
    c.fromHEX(hex);
    c.a = a;
    return c;
}

export interface FxSpec {
    count: number;
    duration: number;
    life: number;
    speed: number;
    speedVar: number;
    angle: number;
    angleVar: number;
    size: number;
    sizeVar: number;
    gravity: number;
    color: string;
    endAlpha?: number;   // 结束透明度（默认 0 = 淡出）
}

/** 播放一次性粒子特效，自动销毁。贴图缺失时不播放 */
export function burst(parent: Node, x: number, y: number, spec: FxSpec): void {
    const sf = getFrame('fx_dot');
    if (!sf) return;
    const n = makeNode('particle', parent);
    n.setPosition(x, y);
    const ps = n.addComponent(ParticleSystem2D);
    ps.spriteFrame = sf;
    ps.emitterMode = ParticleSystem2D.EmitterMode.GRAVITY;
    ps.totalParticles = spec.count;
    ps.duration = spec.duration;
    ps.life = spec.life;
    ps.lifeVar = spec.life * 0.4;
    ps.startColor = toColor(spec.color);
    ps.startColorVar = new Color(0, 0, 0, 0);
    ps.endColor = toColor(spec.color, spec.endAlpha ?? 0);
    ps.endColorVar = new Color(0, 0, 0, 0);
    ps.startSize = spec.size;
    ps.startSizeVar = spec.sizeVar;
    ps.endSize = 0;
    ps.endSizeVar = 0;
    ps.startRadius = 0;
    ps.endRadius = 0;
    ps.speed = spec.speed;
    ps.speedVar = spec.speedVar;
    ps.angle = spec.angle;
    ps.angleVar = spec.angleVar;
    ps.gravity = v2(0, -spec.gravity);
    ps.autoRemoveOnFinish = true;
    ps.resetSystem();
}

// ---------- 各特效 ----------

export const FX = {
    hit(x: number, y: number, color: string): FxSpec {
        return { count: 8, duration: 0.25, life: 0.22, speed: 140, speedVar: 60, angle: 90, angleVar: 360, size: 8, sizeVar: 4, gravity: 60, color };
    },
    crit(x: number, y: number, color: string): FxSpec {
        return { count: 14, duration: 0.3, life: 0.28, speed: 180, speedVar: 80, angle: 90, angleVar: 360, size: 11, sizeVar: 5, gravity: 50, color };
    },
    explode(x: number, y: number, r: number): FxSpec {
        return { count: 24, duration: 0.4, life: 0.35, speed: r * 3, speedVar: r, angle: 90, angleVar: 360, size: 12, sizeVar: 6, gravity: 30, color: '#F06A4A' };
    },
    freeze(x: number, y: number): FxSpec {
        return { count: 16, duration: 0.35, life: 0.3, speed: 100, speedVar: 40, angle: 90, angleVar: 360, size: 6, sizeVar: 3, gravity: 20, color: '#5AB4F0' };
    },
    thunder(x: number, y: number): FxSpec {
        return { count: 10, duration: 0.2, life: 0.18, speed: 220, speedVar: 100, angle: 90, angleVar: 360, size: 14, sizeVar: 6, gravity: 0, color: '#B48CFF' };
    },
    earth(x: number, y: number): FxSpec {
        return { count: 20, duration: 0.4, life: 0.35, speed: 160, speedVar: 60, angle: 270, angleVar: 80, size: 10, sizeVar: 5, gravity: 120, color: '#B08A55' };
    },
    death(x: number, y: number, color: string): FxSpec {
        return { count: 18, duration: 0.45, life: 0.4, speed: 120, speedVar: 70, angle: 90, angleVar: 360, size: 9, sizeVar: 4, gravity: 90, color };
    },
    combo(x: number, y: number, color: string): FxSpec {
        return { count: 40, duration: 0.6, life: 0.5, speed: 260, speedVar: 120, angle: 90, angleVar: 360, size: 14, sizeVar: 7, gravity: 20, color };
    },
    barrier(x: number, y: number): FxSpec {
        return { count: 50, duration: 0.7, life: 0.6, speed: 300, speedVar: 150, angle: 90, angleVar: 360, size: 12, sizeVar: 6, gravity: 80, color: '#9B3D2E' };
    },
};
