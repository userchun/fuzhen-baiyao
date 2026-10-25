import { Node, Graphics, Label } from 'cc';
import {
    ENEMIES, EnemyDef, GAME, BASE_ATTACK, TalismanId, ELEMENT_COLOR, ELEMENT_NAME, Element, elementTier, TIER_MULT,
    MIN_HIT_DAMAGE, RIVER_INTERVAL, depthY, depthScale, lanePixels,
} from '../config/GameConfig';
import { Pool } from '../core/Pool';
import { circleNode, rectNode, makeNode, hex, setOpacity, paintCircle, addLabel } from '../core/Draw';
import { ENEMY_ART, hasArt, spriteNode, getFrames } from '../core/Art';
import { SkillSystem } from './SkillSystem';
import { paintElement, drawHp } from './EnemyView';
import { Feedback } from './Feedback';
import { AudioManager } from '../core/AudioManager';
import { FX, burst } from './ParticleFX';
import { hitPulse } from './Anim';
import { FrameAnim, FrameClip } from './FrameAnim';

export interface Enemy {
    def: EnemyDef; node: Node; element: Element; diving: boolean;
    x: number; y: number; baseX: number;
    depth: number; // 2.5D 纵深：0=远(地平线) → 1=近(城墙)
    hp: number; maxHp: number; t: number; slow: number; freezeT: number; summonT: number; flashT: number;
    alive: boolean;
}

interface Bullet {
    kind: TalismanId | 'river' | 'manual'; node: Node;
    x: number; y: number; vx: number; vy: number; radius: number;
    damage: number; pierce: number; bounces: number; explodeR: number;
    life: number; hit: Set<Enemy>; alive: boolean;
}

interface Zone {
    key: string; node: Node; x: number; y: number; r: number;
    dps: number; slow: number; el: Element; life: number; alive: boolean;
}

interface Fx { key: string; node: Node; life: number; maxLife: number; scale: number; alive: boolean; }

const HALF_W = GAME.width / 2 - 30;
const top = (): number => GAME.horizonY; // 纵深最远点（地平线/出怪线）
const WALL_ART_H = 80;      // 城墙图片显示高度（素材 1440×160 的一半）
const PLAYER_ART_SIZE = 88; // 小道士图片显示边长（原圆章直径 64）

// 战斗世界：施法、敌人移动、子弹碰撞、区域伤害、特效
export class Combat {
    enemies: Enemy[] = [];
    playerX = 0;
    wallHp = GAME.wallHp;
    kills = 0;
    bossDead = false;
    hpMult = 1; // 关卡血量倍率

    private bullets: Bullet[] = [];
    private zones: Zone[] = [];
    private fx: Fx[] = [];
    private riverT = RIVER_INTERVAL;
    private manualCd = 0;
    private aimX = 0;
    private aimY = top();
    private holding = false;
    private pool: Pool;
    private player: Node;
    private zoneLayer: Node;
    private enemyLayer: Node;
    private bulletLayer: Node;
    private fxLayer: Node;
    private playerAnim: FrameAnim | null = null;
    private playerIdle: FrameClip | null = null;
    private playerCast: FrameClip | null = null;
    private playerHit: FrameClip | null = null;
    /** 敌人 move 序列帧：id → clip（无帧则不下挂） */
    private enemyMoveClips = new Map<string, FrameClip>();
    /** 节点 → FrameAnim（池化复用） */
    private enemyAnims = new Map<Node, FrameAnim>();
    /** 白骨夫人三相 idle：metal/water/fire → clip */
    private baiguPhaseClips = new Map<string, FrameClip>();
    /** 死亡 SFX 按敌人 id；无 key 的精英仍用 explode */
    private static readonly ENEMY_DEATH_SFX: Record<string, 'paperman_death' | 'foxfire_snuff' | 'tongjia_break' | 'shuigui_death'> = {
        paperman: 'paperman_death',
        foxfire: 'foxfire_snuff',
        tongjia: 'tongjia_break',
        shuigui: 'shuigui_death',
    };
    /**
     * move/idle 规格：fps + 可选 Y-bob（仅 art 子节点；碰撞仍用 e.x/e.y）。
     * prefix 缺省 → anim/enemy_{id}/move；boss 用 idle 路径。
     * foxfire/tongjia/shuigui bob=0；paperman 轻 bob；jiangshi 保持 12px hop。
     * heishan/baigu：idle 循环，bob=0。
     */
    private static readonly ENEMY_MOVE: Record<string, { fps: number; bobPx: number; prefix?: string }> = {
        jiangshi: { fps: 8, bobPx: 12 },
        paperman: { fps: 9, bobPx: 4 },
        foxfire: { fps: 9, bobPx: 0 },
        tongjia: { fps: 11, bobPx: 0 },
        shuigui: { fps: 8, bobPx: 0 }, // 略慢以缓和 f6–f7 观感；无 bob
        lantern: { fps: 9, bobPx: 0 }, // 漂浮精英；无 bob（CD notes）
        heishan: { fps: 9, bobPx: 0, prefix: 'anim/boss_heishan/idle' }, // 6f idle；无 bob
        baigu: { fps: 9, bobPx: 0, prefix: 'anim/boss_baigu_metal/idle' }, // 默认金相；三相见 baiguPhaseClips
    };
    /** 灯笼鬼死亡分裂 3f one-shot（非独立敌人类型；splitInto 仍为 foxfire） */
    private lanternSplitClip: FrameClip | null = null;
    private splitFx: { node: Node; anim: FrameAnim; life: number }[] = [];

    constructor(layer: Node, private skills: SkillSystem, private fb: Feedback, private onKill: (e: Enemy) => void, private audio?: AudioManager) {
        this.pool = new Pool((key) => this.create(key));
        this.zoneLayer = makeNode('zones', layer);
        this.enemyLayer = makeNode('enemies', layer);
        // 城墙图片含上方垛口：高 80，垛口顶略高于 wallY
        const wall = spriteNode('env_wall', GAME.width, WALL_ART_H, layer) ?? rectNode('wall', GAME.width, 40, '#4A3B2A', layer);
        wall.setPosition(0, hasArt('env_wall') ? GAME.wallY - WALL_ART_H / 2 + 10 : GAME.wallY - 20);
        this.player = spriteNode('player_taoist', PLAYER_ART_SIZE, PLAYER_ART_SIZE, layer) ?? circleNode('player', 32, '#F2E3B3', '师', layer);
        this.player.setPosition(0, GAME.playerY);
        this.bulletLayer = makeNode('bullets', layer);
        this.fxLayer = makeNode('fx', layer);
        this.setupPlayerAnim();
        this.setupEnemyMoveClips();
    }

    private setupEnemyMoveClips(): void {
        for (const id of Object.keys(Combat.ENEMY_MOVE)) {
            const spec = Combat.ENEMY_MOVE[id];
            const clip = this.makeClip(spec.prefix ?? `anim/enemy_${id}/move`, spec.fps, true);
            if (clip) this.enemyMoveClips.set(id, clip);
        }
        // 白骨夫人三相 idle（phase 切换时换 clip；静态 boss_baigu_* 仍作 fallback）
        const baiguFps = Combat.ENEMY_MOVE.baigu?.fps ?? 9;
        for (const el of ['metal', 'water', 'fire']) {
            const clip = this.makeClip(`anim/boss_baigu_${el}/idle`, baiguFps, true);
            if (clip) this.baiguPhaseClips.set(el, clip);
        }
        // 3f @12fps ≈ 0.25s burst；静态 enemy_lantern_split 作首帧/回退
        this.lanternSplitClip = this.makeClip('anim/enemy_lantern_split/move', 12, false);
    }

    private makeClip(prefix: string, fps: number, loop: boolean): FrameClip | null {
        const frames = getFrames(prefix);
        return frames.length > 0 ? { frames, fps, loop } : null;
    }

    /** 白骨夫人：按当前五行相播放对应 idle clip */
    private playBaiguPhaseIdle(node: Node, el: string): void {
        const clip = this.baiguPhaseClips.get(el) ?? this.enemyMoveClips.get('baigu');
        if (!clip) return;
        let anim = this.enemyAnims.get(node);
        if (!anim) {
            const art = node.getChildByName('art');
            if (!art) return;
            anim = new FrameAnim(art);
            this.enemyAnims.set(node, anim);
        }
        anim.play(clip);
    }

    /** spawn/池化：挂上 move/idle FrameAnim（baigu 按 element 选相） */
    private ensureEnemyAnim(node: Node, id: string, element?: string): void {
        if (id === 'baigu') {
            this.playBaiguPhaseIdle(node, element ?? 'metal');
            return;
        }
        const clip = this.enemyMoveClips.get(id);
        if (!clip) return;
        let anim = this.enemyAnims.get(node);
        if (!anim) {
            const art = node.getChildByName('art');
            if (!art) return;
            anim = new FrameAnim(art);
            this.enemyAnims.set(node, anim);
        }
        anim.play(clip);
    }

    private setupPlayerAnim(): void {
        this.playerIdle = this.makeClip('anim/player_taoist/idle', 8, true);
        this.playerCast = this.makeClip('anim/player_taoist/cast', 12, false);
        this.playerHit = this.makeClip('anim/player_taoist/hit', 10, false); // optional; reserved
        // 仅当贴图玩家（spriteNode 成功）且至少有 idle 帧时启用
        if (!hasArt('player_taoist') || !this.playerIdle) return;
        this.playerAnim = new FrameAnim(this.player);
        this.playPlayerIdle();
    }

    private playPlayerIdle(): void {
        if (!this.playerAnim || !this.playerIdle) return;
        this.playerAnim.play(this.playerIdle);
    }

    /** 施法：播 cast once，结束回 idle；无帧则 noop */
    private playPlayerCast(): void {
        if (!this.playerAnim || !this.playerCast) return;
        this.playerAnim.play(this.playerCast, () => this.playPlayerIdle());
    }

    spawnEnemy(id: string, x = (Math.random() * 2 - 1) * HALF_W, depth = 0): void {
        const def = ENEMIES[id];
        const y = depthY(depth);
        const node = this.pool.get('enemy:' + id, this.enemyLayer);
        node.setPosition(x, y);
        node.setScale(depthScale(depth), depthScale(depth), 1);
        if (def.phases) paintElement(node, def, def.element);
        // 池化复用：确保 boss idle / 白骨起始相 clip 重新挂上
        this.ensureEnemyAnim(node, id, def.element);
        if (def.boss) {
            this.audio?.playSfx('boss', 0.9);
            this.fb.shake(12, 0.4);
        }
        const e: Enemy = {
            def, node, element: def.element, diving: false, x, y, baseX: x, depth, hp: def.hp * this.hpMult, maxHp: def.hp * this.hpMult, t: 0, slow: 0, freezeT: 0,
            summonT: def.summonInterval ?? 0, flashT: 0, alive: true,
        };
        this.enemies.push(e);
        drawHp(e);
    }

    /** 设置瞄准点；hold 为 true 时持续朝该点手动攻击 */
    setAim(x: number, y: number, hold: boolean): void {
        this.aimX = x;
        this.aimY = y;
        this.holding = hold;
    }

    stopHold(): void {
        this.holding = false;
    }

    // 朝瞄准点的角度（相对正上方），限制在 ±70°
    private aimAngle(ox: number, oy: number): number {
        const a = Math.atan2(this.aimX - ox, Math.max(1, this.aimY - oy));
        return Math.max(-1.2, Math.min(1.2, a));
    }

    /** 点击攻击：朝目标点扔一张镇妖符 */
    manualShot(tx: number, ty: number, cd = BASE_ATTACK.holdCd): void {
        if (this.manualCd > 0) return;
        this.manualCd = cd;
        const ox = this.playerX;
        const oy = GAME.playerY + 30;
        const dx = tx - ox;
        const dy = Math.max(10, ty - oy); // 只能往城墙外打
        const dist = Math.hypot(dx, dy);
        const dmg = BASE_ATTACK.damage * (1 + 0.2 * this.skills.passive('power'));
        this.shoot('manual', ox, oy, dx / dist * BASE_ATTACK.speed, dy / dist * BASE_ATTACK.speed, dmg, { radius: 14, pierce: 1 });
        this.playPlayerCast();
    }

    update(dt: number): void {
        this.manualCd -= dt;
        // 基础攻击：按住时打准星，否则自动打最近的妖怪
        if (this.holding) {
            this.manualShot(this.aimX, this.aimY);
        } else {
            const t = this.nearest(this.playerX, GAME.playerY);
            if (t) this.manualShot(t.x, t.y, BASE_ATTACK.autoCd);
        }
        this.wallHp = Math.min(GAME.wallHp, this.wallHp + this.skills.regen * dt);
        this.player.setPosition(this.playerX, GAME.playerY);
        this.playerAnim?.update(dt);
        this.castAll(dt);
        this.updateZones(dt);
        this.updateEnemies(dt);
        this.updateBullets(dt);
        this.updateFx(dt);
        this.cleanup();
    }

    // ---------- 节点工厂 ----------

    private create(key: string): Node {
        const [kind, id] = key.split(':');
        if (kind === 'enemy') {
            const d = ENEMIES[id];
            const art = ENEMY_ART[id];
            let n: Node;
            if (art && hasArt(art.tex)) {
                // 图片比碰撞圆大（含描边和肢体）；汉字叠在腹部空白字印上
                const size = d.radius * 2 * art.scale;
                n = makeNode(key, undefined, d.radius * 2, d.radius * 2);
                const artNode = spriteNode(art.tex, size, size, n)!;
                artNode.name = 'art';
                // 挂 move 序列帧（无帧则保持静态贴图）
                const moveClip = this.enemyMoveClips.get(id);
                if (moveClip) {
                    const anim = new FrameAnim(artNode);
                    anim.play(moveClip);
                    this.enemyAnims.set(n, anim);
                }
                const ch = addLabel(n, d.char, Math.max(12, Math.round(size * art.sealR * 1.3)), '#1E1A26');
                ch.node.setPosition(0, size * (0.5 - art.sealY));
            } else {
                n = circleNode(key, d.radius, ELEMENT_COLOR[d.element], d.char);
            }
            const badge = addLabel(n, ELEMENT_NAME[d.element], Math.max(16, Math.round(d.radius * 0.5)));
            badge.node.name = 'badge';
            badge.node.setPosition(d.radius * 0.75, d.radius * 0.75);
            if (d.elite || d.boss) {
                const bar = makeNode('hp', n);
                bar.setPosition(0, d.radius * (art && hasArt(art.tex) ? art.scale : 1) + 12);
                bar.addComponent(Graphics);
            }
            return n;
        }
        if (kind === 'bullet') {
            if (id === 'metal') return rectNode(key, 10, 40, ELEMENT_COLOR.metal, undefined, 4);
            if (id === 'manual') return circleNode(key, 14, '#FFE9A8', '符');
            if (id === 'river') return rectNode(key, GAME.width, 60, '#5AB4F0', undefined, 0, 170);
            return circleNode(key, id === 'fire' ? 14 : 11, ELEMENT_COLOR[id as Element]);
        }
        if (kind === 'zone') return circleNode(key, 50, id === 'burn' ? '#F06A4A' : '#5FBF6A');
        const fxColor = id === 'earth' ? '#B08A55' : id === 'thunder' ? '#B48CFF' : '#FFB347';
        return circleNode(key, 50, fxColor); // fx
    }

    // ---------- 施法 ----------

    private castAll(dt: number): void {
        const s = this.skills;
        s.talismans.forEach((st, id) => {
            st.cdT -= dt;
            if (st.cdT > 0) return;
            st.cdT = s.cooldown(id);
            this.cast(id, st.level);
        });
        if (s.combos.has('river')) {
            this.riverT -= dt;
            if (this.riverT <= 0) {
                this.riverT = RIVER_INTERVAL;
                const dmg = (s.damage('metal') + s.damage('water')) * 2;
                this.shoot('river', 0, GAME.wallY, 0, 500, dmg, { radius: 30, life: 3 });
                burst(this.fxLayer, 0, GAME.wallY + 60, FX.combo(0, GAME.wallY + 60, '#5AB4F0'));
                this.audio?.playSfx('combo', 0.8);
                this.fb.shake(6, 0.3);
            }
        }
    }

    private cast(id: TalismanId, lv: number): void {
        const s = this.skills;
        const dmg = s.damage(id);
        const count = 1 + s.extra;
        const ox = this.playerX;
        const oy = GAME.playerY + 30;
        this.playPlayerCast();

        if (id === 'metal') {
            const base = this.aimAngle(ox, oy);
            for (let i = 0; i < count; i++) {
                const ang = base + (i - (count - 1) / 2) * 0.12;
                this.shoot('metal', ox, oy, Math.sin(ang) * 1000, Math.cos(ang) * 1000, dmg, { pierce: lv, radius: 10 });
            }
            this.audio?.playSfx('shoot', 0.45);
        } else if (id === 'water' || id === 'fire') {
            const used = new Set<Enemy>();
            for (let i = 0; i < count; i++) {
                const t = this.nearest(ox, oy, used) ?? this.nearest(ox, oy);
                if (!t) return;
                used.add(t);
                const speed = id === 'water' ? 700 : 600;
                const dx = t.x - ox;
                const dy = t.y - oy;
                const dist = Math.max(1, Math.hypot(dx, dy));
                this.shoot(id, ox, oy, dx / dist * speed, dy / dist * speed, dmg, id === 'water'
                    ? { bounces: lv, radius: 11 }
                    : { explodeR: 70 + 15 * lv, radius: 14, life: dist / speed });
            }
            if (id === 'water') this.audio?.playSfx('freeze', 0.5);
        } else if (id === 'wood') {
            const used = new Set<Enemy>();
            for (let i = 0; i < count; i++) {
                const t = this.nearest(ox, oy, used);
                if (!t) return;
                used.add(t);
                this.addZone(t.x, t.y, 60 + 10 * lv, dmg, 3);
            }
        } else if (id === 'earth') {
            const used = new Set<Enemy>();
            const r = 50 + 8 * lv;
            for (let i = 0; i < count; i++) {
                const t = this.nearest(ox, oy, used);
                if (!t) return;
                used.add(t);
                const cx = t.x;
                const cy = t.y;
                this.addFx(cx, cy, r, 'fx:earth');
                burst(this.fxLayer, cx, cy, FX.earth(cx, cy));
                this.audio?.playSfx('thunder', 0.5);
                this.fb.shake(3, 0.08);
                for (const e of this.enemies) {
                    if (!e.alive || Math.hypot(e.x - cx, e.y - cy) > r + e.def.radius * depthScale(e.depth)) continue;
                    this.hurt(e, dmg, 'earth');
                    if (!e.def.boss) {
                        e.depth = Math.max(0, e.depth - 50 / lanePixels()); // 击退（推远）
                        e.freezeT = Math.max(e.freezeT, 0.4);
                    }
                }
            }
        } else if (id === 'thunder') {
            for (let i = 0; i < count; i++) {
                const targets = this.enemies.filter((e) => e.alive && !e.diving);
                if (targets.length === 0) return;
                let cur: Enemy | null = targets[Math.floor(Math.random() * targets.length)];
                const hit = new Set<Enemy>();
                for (let j = 0; j <= lv && cur; j++) {
                    hit.add(cur);
                    this.addFx(cur.x, cur.y, 35, 'fx:thunder');
                    burst(this.fxLayer, cur.x, cur.y, FX.thunder(cur.x, cur.y));
                    this.hurt(cur, dmg, 'none');
                    cur = this.nearest(cur.x, cur.y, hit, 250);
                }
            }
            this.audio?.playSfx('thunder', 0.7);
        }
    }

    private shoot(kind: Bullet['kind'], x: number, y: number, vx: number, vy: number, damage: number,
        opt: { pierce?: number; bounces?: number; explodeR?: number; radius?: number; life?: number }): void {
        const node = this.pool.get('bullet:' + kind, this.bulletLayer);
        node.setPosition(x, y);
        if (kind === 'metal') node.angle = -Math.atan2(vx, vy) * 180 / Math.PI;
        if (kind === 'manual') this.audio?.playSfx('shoot', 0.6);
        this.bullets.push({
            kind, node, x, y, vx, vy, damage,
            radius: opt.radius ?? 10, pierce: opt.pierce ?? 0, bounces: opt.bounces ?? 0,
            explodeR: opt.explodeR ?? 0, life: opt.life ?? 2, hit: new Set(), alive: true,
        });
    }

    private addZone(x: number, y: number, r: number, dps: number, life: number): void {
        const burn = this.skills.combos.has('burn');
        const key = burn ? 'zone:burn' : 'zone:vine';
        const node = this.pool.get(key, this.zoneLayer);
        node.setPosition(x, y);
        node.setScale(r / 50, r / 50, 1);
        setOpacity(node, 110);
        this.zones.push({
            key, node, x, y, r, life, alive: true,
            dps: burn ? dps * 3 : dps, slow: burn ? 0.3 : 0.5, el: burn ? 'fire' : 'wood',
        });
    }

    // ---------- 更新 ----------

    private updateZones(dt: number): void {
        for (const e of this.enemies) e.slow = 0;
        for (const z of this.zones) {
            z.life -= dt;
            if (z.life <= 0) { z.alive = false; continue; }
            for (const e of this.enemies) {
                if (!e.alive) continue;
                if (Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.def.radius * 0.5 * depthScale(e.depth)) {
                    e.slow = Math.max(e.slow, z.slow);
                    this.hurt(e, z.dps * dt, z.el, false);
                }
            }
        }
    }

    private updateEnemies(dt: number): void {
        for (const e of this.enemies) {
            if (!e.alive) continue;
            e.t += dt;
            const d = e.def;
            if (e.freezeT > 0) {
                e.freezeT -= dt;
            } else {
                const sp = d.speed * (1 - e.slow);
                const rate = sp / lanePixels(); // px/s → depth/s
                if (d.move === 'hop') {
                    if (e.t % 1.2 < 0.4) e.depth += rate * 3 * dt;
                } else if (d.move === 'sine') {
                    e.depth += rate * dt;
                    e.x = e.baseX + Math.sin(e.t * 3) * 80;
                } else {
                    e.depth += rate * dt;
                }
            }
            e.depth = Math.max(0, Math.min(1, e.depth));
            e.y = depthY(e.depth);
            e.x = Math.max(-HALF_W, Math.min(HALF_W, e.x));
            // 水鬼：每 3 秒潜水 1 秒，潜水时无敌；潜水进出播 dive_in / dive_out
            const wasDiving = e.diving;
            e.diving = !!d.dive && e.t % 3 > 2;
            if (d.dive && wasDiving !== e.diving) {
                this.audio?.playSfx(e.diving ? 'shuigui_dive_in' : 'shuigui_dive_out', 0.55);
            }
            setOpacity(e.node, e.diving ? 60 : e.freezeT > 0 ? 150 : 255);
            // 命中闪一下：放大（叠加在纵深缩放之上）
            if (e.flashT > 0) e.flashT -= dt;
            const sc = depthScale(e.depth) * (e.flashT > 0 ? 1.15 : 1);
            e.node.setScale(sc, sc, 1);

            if (d.summon) {
                e.summonT -= dt;
                if (e.summonT <= 0) {
                    e.summonT = d.summonInterval;
                    for (let i = 0; i < (d.summonCount ?? 1); i++) {
                        this.spawnEnemy(d.summon, e.x + (i % 2 ? 1 : -1) * (d.radius + 30), e.depth);
                    }
                }
            }

            const r = d.radius * depthScale(e.depth);
            if (d.boss && e.y - r <= GAME.wallY) {
                // Boss 抵达城墙：停下持续攻城
                e.depth = 1;
                e.y = GAME.wallY + r;
                this.wallHp -= d.damage * dt;
                if (Math.random() < dt * 4) this.fb.shake(6, 0.15);
            } else if (e.y - r <= GAME.wallY) {
                this.wallHp -= d.damage;
                this.fb.shake(d.boss ? 30 : 10, 0.25);
                this.audio?.playSfx('hit', 0.6);
                burst(this.fxLayer, e.x, GAME.wallY, FX.barrier(e.x, GAME.wallY));
                e.alive = false;
                this.addFx(e.x, GAME.wallY, d.radius * 1.5);
                continue;
            }
            // move 序列帧 + 可选 art 子节点 Y-bob（逻辑坐标不变，碰撞仍用 e.x/e.y）
            const moveSpec = Combat.ENEMY_MOVE[e.def.id];
            if (moveSpec && this.enemyMoveClips.has(e.def.id)) {
                let anim = this.enemyAnims.get(e.node);
                if (!anim) {
                    const art = e.node.getChildByName('art');
                    const clip = this.enemyMoveClips.get(e.def.id)!;
                    if (art) {
                        anim = new FrameAnim(art);
                        anim.play(clip);
                        this.enemyAnims.set(e.node, anim);
                    }
                }
                anim?.update(dt);
                if (moveSpec.bobPx > 0) {
                    const art = e.node.getChildByName('art');
                    if (art) {
                        const hop = Math.abs(Math.sin(anim ? anim.progress * Math.PI * 2 : e.t * Math.PI * 4))
                            * moveSpec.bobPx;
                        art.setPosition(0, hop);
                    }
                }
            }
            e.node.setPosition(e.x, e.y);

            // 铜甲：移动脚步闷响（冻结时不响；相位按 baseX 错开避免齐步）
            if (e.def.id === 'tongjia' && e.freezeT <= 0) {
                const period = 0.38;
                const phase = (((e.baseX % 100) + 100) % 100) * 0.0038;
                const t0 = e.t + phase;
                if (Math.floor(t0 / period) !== Math.floor((t0 - dt) / period)) {
                    this.audio?.playSfx('tongjia_clank', 0.4);
                }
            }
        }

        // 存在感循环：任一存活未冻则 loop，否则停（dive_in/out 仍由切换触发，不改）
        let papermanMoving = false;
        let foxfireAlive = false;
        let shuiguiAlive = false;
        for (const e of this.enemies) {
            if (!e.alive || e.freezeT > 0) continue;
            if (e.def.id === 'paperman') papermanMoving = true;
            else if (e.def.id === 'foxfire') foxfireAlive = true;
            else if (e.def.id === 'shuigui') shuiguiAlive = true;
        }
        if (papermanMoving) this.audio?.playLoopSfx('paperman_rustle', 0.32);
        else this.audio?.stopLoopSfx('paperman_rustle');
        if (foxfireAlive) this.audio?.playLoopSfx('foxfire_whoosh', 0.28);
        else this.audio?.stopLoopSfx('foxfire_whoosh');
        if (shuiguiAlive) this.audio?.playLoopSfx('shuigui_presence', 0.28);
        else this.audio?.stopLoopSfx('shuigui_presence');
    }

    private updateBullets(dt: number): void {
        for (const b of this.bullets) {
            if (!b.alive) continue;
            b.life -= dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            const out = b.y > top() + 100 || b.y < -top() || Math.abs(b.x) > GAME.width;
            if (b.life <= 0 || out) {
                if (b.kind === 'fire' && !out) this.explode(b);
                b.alive = false;
                continue;
            }
            b.node.setPosition(b.x, b.y);

            if (b.kind === 'river') {
                for (const e of this.enemies) {
                    if (e.alive && !b.hit.has(e) && Math.abs(e.y - b.y) < b.radius + e.def.radius * depthScale(e.depth)) {
                        b.hit.add(e);
                        e.freezeT = 1;
                        this.hurt(e, b.damage, 'water');
                    }
                }
                continue;
            }

            for (const e of this.enemies) {
                if (!e.alive || e.diving || b.hit.has(e)) continue;
                const rr = b.radius + e.def.radius * depthScale(e.depth);
                if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < rr * rr) {
                    this.onHit(b, e);
                    if (!b.alive) break;
                }
            }
        }
    }

    private onHit(b: Bullet, e: Enemy): void {
        b.hit.add(e);
        if (b.kind === 'metal' || b.kind === 'manual') {
            this.hurt(e, b.damage, b.kind === 'metal' ? 'metal' : 'none');
            if (--b.pierce < 0) b.alive = false;
        } else if (b.kind === 'water') {
            this.hurt(e, b.damage, 'water');
            e.freezeT = Math.max(e.freezeT, 0.6);
            const next = b.bounces > 0 ? this.nearest(b.x, b.y, b.hit, 350) : null;
            if (!next) { b.alive = false; return; }
            b.bounces--;
            const dx = next.x - b.x;
            const dy = next.y - b.y;
            const dist = Math.max(1, Math.hypot(dx, dy));
            b.vx = dx / dist * 700;
            b.vy = dy / dist * 700;
            b.life = 2;
        } else if (b.kind === 'fire') {
            this.explode(b);
            b.alive = false;
        }
    }

    private explode(b: Bullet): void {
        this.addFx(b.x, b.y, b.explodeR);
        burst(this.fxLayer, b.x, b.y, FX.explode(b.x, b.y, b.explodeR));
        this.audio?.playSfx('explode', 0.7);
        this.fb.shake(4, 0.1);
        for (const e of this.enemies) {
            if (e.alive && Math.hypot(e.x - b.x, e.y - b.y) < b.explodeR + e.def.radius * depthScale(e.depth)) {
                this.hurt(e, b.damage, 'fire');
            }
        }
    }

    private hurt(e: Enemy, amount: number, el: Element, show = true): void {
        if (!e.alive || e.diving) return;
        const tier = elementTier(el, e.element);
        let dmg = amount * TIER_MULT[tier];
        if (show && e.def.armor) dmg = Math.max(MIN_HIT_DAMAGE, dmg - e.def.armor);
        e.hp -= dmg;
        if (show) {
            this.fb.text(e.x, e.y + e.def.radius * depthScale(e.depth), dmg, tier);
            e.flashT = 0.08;
            hitPulse(e.node, 1.12);
            // 命中火花 + 音效
            const py = e.y + e.def.radius * depthScale(e.depth);
            if (tier === 'crit') {
                burst(this.fxLayer, e.x, py, FX.crit(e.x, py, ELEMENT_COLOR[el === 'none' ? e.element : el]));
                this.audio?.playSfx('crit', 0.8);
            } else {
                burst(this.fxLayer, e.x, py, FX.hit(e.x, py, '#FFFFFF'));
                if (tier === 'resist') this.audio?.playSfx('resist', 0.6);
                else this.audio?.playSfx('hit', 0.5); // 符纸·朱砂 hit — do not replace
            }
            // 敌人受击薄层（非玩家 hit）；与 crit/resist/hit 叠加
            this.audio?.playSfx('enemy_hurt', 0.28);
        }
        if (e.def.elite || e.def.boss) drawHp(e);
        if (e.hp <= 0) this.kill(e);
        else if (e.def.phases) this.checkPhase(e);
    }

    // Boss 按血量切换属性，切换时召唤一批小怪
    private checkPhase(e: Enemy): void {
        const ph = e.def.phases;
        const idx = Math.min(ph.length - 1, Math.floor((1 - e.hp / e.maxHp) * ph.length));
        if (ph[idx] === e.element) return;
        e.element = ph[idx];
        paintElement(e.node, e.def, e.element);
        if (e.def.id === 'baigu') this.playBaiguPhaseIdle(e.node, e.element);
        this.fb.shake(14, 0.4);
        this.fb.hitStop(0.15);
        for (let i = 0; i < 4; i++) {
            this.spawnEnemy(e.def.summon ?? 'paperman', e.x + (i - 1.5) * 60, e.depth);
        }
    }

    private kill(e: Enemy): void {
        e.alive = false;
        this.kills++;
        burst(this.fxLayer, e.x, e.y, FX.death(e.x, e.y, ELEMENT_COLOR[e.element]));
        if (e.def.boss) {
            this.bossDead = true;
            this.audio?.playSfx('win', 0.9);
            this.fb.hitStop(0.3);
            this.fb.shake(20, 0.5);
        } else {
            const deathKey = Combat.ENEMY_DEATH_SFX[e.def.id];
            if (deathKey) this.audio?.playSfx(deathKey, 0.65);
            else if (e.def.elite) this.audio?.playSfx('explode', 0.6); // lantern 等无专属死亡音
            if (e.def.elite) {
                this.fb.hitStop(0.06);
                this.fb.shake(8, 0.2);
            }
        }
        // 灯笼鬼：死亡播 3f 分裂体序列，再按原配置召唤 foxfire（不改 splitInto）
        if (e.def.id === 'lantern') {
            const art = ENEMY_ART.lantern;
            const size = e.def.radius * 2 * (art?.scale ?? 2.75);
            this.spawnLanternSplitFx(e.x, e.y, size);
        }
        if (e.def.splitInto) {
            for (let i = 0; i < (e.def.splitCount ?? 0); i++) {
                this.spawnEnemy(e.def.splitInto, e.x + (i - 1) * 40, e.depth);
            }
        }
        this.addFx(e.x, e.y, e.def.radius * 1.2);
        this.onKill(e);
    }

    private addFx(x: number, y: number, r: number, key = 'fx'): void {
        const node = this.pool.get(key, this.fxLayer);
        node.setPosition(x, y);
        const scale = r / 50;
        node.setScale(scale, scale, 1);
        setOpacity(node, 200);
        this.fx.push({ key, node, life: 0.25, maxLife: 0.25, scale, alive: true });
    }

    private updateFx(dt: number): void {
        if (this.splitFx.length) {
            const next: { node: Node; anim: FrameAnim; life: number }[] = [];
            for (const f of this.splitFx) {
                f.anim.update(dt);
                f.life -= dt;
                if (f.life > 0) next.push(f);
                else f.node.destroy();
            }
            this.splitFx = next;
        }
        for (const f of this.fx) {
            f.life -= dt;
            if (f.life <= 0) { f.alive = false; continue; }
            const k = f.life / f.maxLife;
            const s = f.scale * (1.3 - 0.3 * k);
            f.node.setScale(s, s, 1);
            setOpacity(f.node, Math.round(200 * k));
        }
    }

    private nearest(x: number, y: number, exclude?: Set<Enemy>, maxDist = Infinity): Enemy | null {
        let best: Enemy | null = null;
        let bestD = maxDist * maxDist;
        for (const e of this.enemies) {
            if (!e.alive || e.diving || (exclude && exclude.has(e))) continue;
            const d = (e.x - x) ** 2 + (e.y - y) ** 2;
            if (d < bestD) { bestD = d; best = e; }
        }
        return best;
    }

    private spawnLanternSplitFx(x: number, y: number, size: number): void {
        if (!this.lanternSplitClip) return;
        const n = spriteNode('enemy_lantern_split', size, size, this.fxLayer);
        if (!n) return;
        n.setPosition(x, y);
        const anim = new FrameAnim(n);
        const clip = this.lanternSplitClip;
        const life = clip.frames.length / Math.max(1, clip.fps) + 0.05;
        anim.play(clip);
        this.splitFx.push({ node: n, anim, life });
    }

    private cleanup(): void {
        this.enemies = this.enemies.filter((e) => {
            if (e.alive) return true;
            const bobSpec = Combat.ENEMY_MOVE[e.def.id];
            if (bobSpec && bobSpec.bobPx > 0) {
                const art = e.node.getChildByName('art');
                if (art) art.setPosition(0, 0);
            }
            this.pool.put('enemy:' + e.def.id, e.node);
            return false;
        });
        this.bullets = this.bullets.filter((b) => {
            if (b.alive) return true;
            this.pool.put('bullet:' + b.kind, b.node);
            return false;
        });
        this.zones = this.zones.filter((z) => {
            if (z.alive) return true;
            this.pool.put(z.key, z.node);
            return false;
        });
        this.fx = this.fx.filter((f) => {
            if (f.alive) return true;
            this.pool.put(f.key, f.node);
            return false;
        });
    }
}
