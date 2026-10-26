import { Node, ParticleSystem2D, UITransform, Layers, Color, v2, Sprite, UIOpacity, tween, Vec3 } from 'cc';
import { getFrame } from '../core/Art';
import type { Element, HitTier } from '../config/GameConfig';

// 粒子特效：统一用 ParticleSystem2D，共享一张白色径向圆点贴图（fx_dot.png），
// 通过 startColor 上色，避免为每种特效单独出贴图。
// 另：GOAL-VFX-COMBAT-001 命中/暴击/抗性/五行/施法 用一次性 Sprite flash（贴图缺失静默跳过）。

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

// ---------- Sprite one-shot flashes (VFX combat P0) ----------

const MAX_SPRITE_FX = 18;
const activeFlashes: Node[] = [];

const EL_FX: Partial<Record<Element, string>> = {
    metal: 'fx_el_metal',
    wood: 'fx_el_wood',
    water: 'fx_el_water',
    fire: 'fx_el_fire',
    earth: 'fx_el_earth',
};

export interface FlashOpts {
    size?: number;
    startScale?: number;
    endScale?: number;
    startAlpha?: number;
    endAlpha?: number;
    /** Sprite.color 色调（施法/爆炸按技能色族） */
    color?: string;
}

function pruneFlashes(): void {
    for (let i = activeFlashes.length - 1; i >= 0; i--) {
        if (!activeFlashes[i].isValid) activeFlashes.splice(i, 1);
    }
}

/** 一次性 Sprite 闪：淡出+微扩，自动销毁；同屏上限内丢最旧 */
export function flash(parent: Node, key: string, x: number, y: number, duration: number, opts?: FlashOpts): void {
    const sf = getFrame(key);
    if (!sf || !parent?.isValid) return;

    pruneFlashes();
    while (activeFlashes.length >= MAX_SPRITE_FX) {
        const old = activeFlashes.shift();
        if (old?.isValid) old.destroy();
    }

    const size = opts?.size ?? 64;
    const startScale = opts?.startScale ?? 0.9;
    const endScale = opts?.endScale ?? 1.2;
    const startAlpha = opts?.startAlpha ?? 255;
    const endAlpha = opts?.endAlpha ?? 0;

    const n = makeNode('fx_flash', parent);
    n.setPosition(x, y);
    n.setScale(startScale, startScale, 1);
    n.getComponent(UITransform)!.setContentSize(size, size);
    const sp = n.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    sp.spriteFrame = sf;
    if (opts?.color) sp.color = toColor(opts.color);
    const op = n.addComponent(UIOpacity);
    op.opacity = startAlpha;
    activeFlashes.push(n);

    const dur = Math.max(0.05, duration);
    tween(n)
        .to(dur, { scale: new Vec3(endScale, endScale, 1) }, { easing: 'quadOut' })
        .call(() => {
            const i = activeFlashes.indexOf(n);
            if (i >= 0) activeFlashes.splice(i, 1);
            if (n.isValid) n.destroy();
        })
        .start();
    tween(op)
        .to(dur, { opacity: endAlpha }, { easing: 'quadIn' })
        .start();
}

/**
 * 命中层：crit→fx_crit；resist→fx_resist；else→fx_hit_seal；
 * 五行攻击另叠 fx_el_*（偏小，不糊剪影）。时长对齐验收锁。
 */
export function flashCombat(parent: Node, x: number, y: number, tier: HitTier, el: Element): void {
    if (tier === 'crit') {
        flash(parent, 'fx_crit', x, y, 0.42, { size: 72, startScale: 0.88, endScale: 1.28 });
    } else if (tier === 'resist') {
        flash(parent, 'fx_resist', x, y, 0.25, { size: 56, startScale: 1.0, endScale: 1.12 });
    } else {
        flash(parent, 'fx_hit_seal', x, y, 0.28, { size: 56, startScale: 0.92, endScale: 1.18 });
    }
    const elKey = EL_FX[el];
    if (elKey) {
        // 略偏上、尺寸 ~48–56，避免盖住怪身剪影
        flash(parent, elKey, x, y + 10, 0.32, { size: 48, startScale: 0.7, endScale: 1.05, startAlpha: 210 });
    }
}

/**
 * U10：按 motion_ref 挂点播命中闪（有调用方先 hasMotionRef）。
 * ice=冷白偏青；fire=暖符火；thunder=符箓紫电（不走五行 el 表，避免 none 空闪）。
 */
export function flashMotionHit(parent: Node, x: number, y: number, ref: 'ice_hit' | 'fire_hit' | 'thunder_hit', tier: HitTier): void {
    if (ref === 'ice_hit') {
        flashCombat(parent, x, y, tier, 'water');
        // 加一层偏青冷白微闪，勿脏灰
        flash(parent, 'fx_el_water', x, y + 8, 0.28, { size: 52, startScale: 0.75, endScale: 1.1, startAlpha: 200 });
    } else if (ref === 'fire_hit') {
        flashCombat(parent, x, y, tier, 'fire');
    } else {
        // thunder_hit：封印底 + 紫电粒子感（无黄电贴图）
        if (tier === 'crit') {
            flash(parent, 'fx_crit', x, y, 0.42, { size: 72, startScale: 0.88, endScale: 1.28 });
        } else if (tier === 'resist') {
            flash(parent, 'fx_resist', x, y, 0.25, { size: 56, startScale: 1.0, endScale: 1.12 });
        } else {
            flash(parent, 'fx_hit_seal', x, y, 0.28, { size: 56, startScale: 0.92, endScale: 1.18 });
        }
        // 紫电叠层：复用 hit_seal 略放大 + 粒子由调用方 FX.thunder
        flash(parent, 'fx_hit_seal', x, y + 6, 0.22, { size: 44, startScale: 0.85, endScale: 1.2, startAlpha: 180 });
    }
}

/** 施法符光；跟 cast 帧（5f@12fps ≈ 0.42s）。T7：haste≥1 时略提亮、时长 −15%（数值 GROWTH 不动）。
 *  color：技能色族 tint（疾书青绿 / 朱砂朱红 / 五行施放色）；缺省暖朱砂。 */
export function flashCastGlow(parent: Node, x: number, y: number, hasteLv = 0, color = '#E23B3B'): void {
    if (hasteLv >= 1) {
        flash(parent, 'fx_player_cast_glow', x, y, 0.4 * 0.85, {
            size: 104, startScale: 0.78, endScale: 1.2, startAlpha: 255, color,
        });
    } else {
        flash(parent, 'fx_player_cast_glow', x, y, 0.4, {
            size: 96, startScale: 0.72, endScale: 1.12, startAlpha: 230, color,
        });
    }
}

// ---------- 各特效 ----------

export const FX = {
    hit(x: number, y: number, color: string): FxSpec {
        return { count: 8, duration: 0.25, life: 0.22, speed: 140, speedVar: 60, angle: 90, angleVar: 360, size: 8, sizeVar: 4, gravity: 60, color };
    },
    crit(x: number, y: number, color: string): FxSpec {
        return { count: 14, duration: 0.3, life: 0.28, speed: 180, speedVar: 80, angle: 90, angleVar: 360, size: 11, sizeVar: 5, gravity: 50, color };
    },
    explode(x: number, y: number, r: number, color = '#F06A4A'): FxSpec {
        return { count: 24, duration: 0.4, life: 0.35, speed: r * 3, speedVar: r, angle: 90, angleVar: 360, size: 12, sizeVar: 6, gravity: 30, color };
    },
    /** 分符金尘裂（无独立爆炸时挂在施放点） */
    goldDust(x: number, y: number): FxSpec {
        return { count: 18, duration: 0.35, life: 0.28, speed: 120, speedVar: 50, angle: 90, angleVar: 360, size: 7, sizeVar: 3, gravity: 40, color: '#D4A84B' };
    },
    /** 朱砂朱红脉冲（无焰形；与烈焰暖橙爆区分） */
    powerPulse(x: number, y: number): FxSpec {
        return { count: 14, duration: 0.3, life: 0.25, speed: 90, speedVar: 40, angle: 90, angleVar: 360, size: 8, sizeVar: 3, gravity: 20, color: '#E23B3B' };
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
