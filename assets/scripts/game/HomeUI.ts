// 主界面（docs/gameplay-design.md 4.4 节，效果图 docs/art/ref/ui_mainmenu_v8.png）。
// 背景暂用 v8 效果图的无字底图 ui_home_bg（框、图标、按钮都画在图里），
// 这里按图上位置叠文字、红点、锁定状态和点击区域。拆图后换成独立素材时只改 IMG 坐标表。

import { Node, Label, EventTouch, Graphics, tween, UIOpacity } from 'cc';
import { GAME, LevelDef, TALISMANS, TalismanId, ENEMIES } from '../config/GameConfig';
import { Difficulty, FIRST_CLEAR_NORMAL, FIRST_CLEAR_HARD_PAPER, StatId, STAT_UPGRADES, STAT_EFFECT, STAR_COSTS, TALISMAN_IDS } from '../config/MetaConfig';
import { makeNode, addLabel, rectNode, hex, setOpacity } from '../core/Draw';
import { spriteNode } from '../core/Art';
import { AudioManager } from '../core/AudioManager';
import {
    Profile, canPlay, maxBrowsableLevel, canAffordUpgrade, canAffordStar, formatAmount, statCost, starCost,
    formatBestTime,
} from '../meta/Profile';
import { popIn, breathe } from './Anim';

/** 底图原始尺寸，以及图上各元素的中心位置（像素，左上为原点） */
// 底图 v14（852×1846，9:19.5）：顶栏贴顶、关卡牌和出战贴底。POS 是这张图上的像素坐标
const IMG = { w: 852, h: 1846 };
/** 控件尺寸沿用 v12 原图（941 宽）的像素写法，换算到 v14 */
const SRC_K = 852 / 941;
const POS = {
    progress: [240, 85], coin: [536, 70], paper: [700, 70], gear: [806, 70],
    title: [425, 215],
    entries: [[770, 955], [770, 1130], [770, 1300]],
    entryLabels: [[770, 1025], [770, 1190], [770, 1355]],
    plaque: [500, 1572], ring: [425, 1600], arrowL: [100, 1600], arrowR: [752, 1600],
    /** 关卡牌左侧 Boss 圆框中心（v14 底图像素） */
    boss: [230, 1592],
    /** 关卡牌最佳时间（铭牌下方） */
    bestTime: [500, 1608],
    fight: [425, 1752],
    diffNormal: [588, 1537], diffHard: [658, 1537],
    rewardCoin: [408, 1636], rewardPaper: [515, 1636], rewardChest: [652, 1636],
} as const;

/** 与 LEVELS 下标对应的 Boss 名章（半写实夜景圆印） */
const BOSS_SEALS = ['ui_seal_heishan', 'ui_seal_baigu'] as const;

const GOLD = '#FFD66E';
const CREAM = '#E8DEC6';
const DIM = '#7A7468';

export interface HomeActions {
    onFight: (level: number, diff: Difficulty) => void;
    onEntry: (id: 'upgrade' | 'talisman' | 'record') => void;
    onSettings: () => void;
}

export class HomeUI {
    private node: Node | null = null;
    private s = 1;
    private level = 0;
    private diff: Difficulty = 'normal';
    private toast: Label | null = null;
    private toastT = 0;
    /** 本帧主界面是否画首局养成暖光引导（仅当次 show 生命周期） */
    private metaGuide = false;

    constructor(private root: Node, private audio?: AudioManager) {}

    /** 图上坐标 → 节点坐标（底图等比铺满屏幕、居中） */
    /** v12 原图里的 1 像素对应屏幕上多少（尺寸都按 v12 原图写） */
    private get u(): number {
        return this.s * SRC_K;
    }

    private at(p: readonly number[]): [number, number] {
        return [(p[0] - IMG.w / 2) * this.s, (IMG.h / 2 - p[1]) * this.s];
    }

    /** 当前停在第几关（重排时保持不变） */
    get currentLevel(): number {
        return this.level;
    }

    show(p: Profile, levels: LevelDef[], startLevel: number, act: HomeActions): void {
        this.hide();
        this.level = startLevel;
        // 整张图完整放进屏幕：顶栏和出战都贴着图的上下边，不能裁；比例不同时空出的边用边缘色补
        this.s = Math.min(GAME.width / IMG.w, GAME.height / IMG.h);
        const root = makeNode('home', this.root, GAME.width, GAME.height);
        this.node = root;
        rectNode('homeBase', GAME.width, GAME.height, '#0B0E16', root);
        // 屏幕比底图高时，上下空出的部分用底图边缘的颜色补齐（按钮画在底图里，不能再放大底图去填）
        const gap = (GAME.height - IMG.h * this.s) / 2;
        if (gap > 0) {
            const top = rectNode('homeTop', GAME.width, gap + 2, '#071523', root);
            top.setPosition(0, GAME.height / 2 - gap / 2);
            const bottom = rectNode('homeBottom', GAME.width, gap + 2, '#121720', root);
            bottom.setPosition(0, -GAME.height / 2 + gap / 2);
        }
        spriteNode('ui_home_bg', IMG.w * this.s, IMG.h * this.s, root);
        if (gap > 0) {
            // 接缝处 4 层半透明细条做渐变（只压图边 16px，不碰顶栏）
            const edge = (IMG.h * this.s) / 2;
            for (let i = 0; i < 4; i++) {
                const a = Math.round(180 * (1 - i / 4));
                const t = rectNode('fadeT', GAME.width, 4, '#071523', root, 0, a);
                t.setPosition(0, edge - 2 - i * 4);
                const b = rectNode('fadeB', GAME.width, 4, '#121720', root, 0, a);
                b.setPosition(0, -edge + 2 + i * 4);
            }
        }
        this.render(p, levels, act);
    }

    hide(): void {
        this.node?.destroy();
        this.node = null;
        this.toast = null;
        this.metaGuide = false;
    }

    /**
     * 第一局结束后：养成入口符咒暖光圈 + 旁白「用铜钱加固城墙」。
     * 调用方负责写入 metaTutorialSeen；本实例只画一次会话内的高亮。
     */
    enableMetaGuide(): void {
        this.metaGuide = true;
        this.paintMetaGuide();
    }

    update(dt: number): void {
        if (this.toast && this.toastT > 0) {
            this.toastT -= dt;
            if (this.toastT <= 0) this.toast.node.parent.active = false;
        }
    }

    showToast(text: string): void {
        if (!this.node) return;
        if (!this.toast) {
            const bg = rectNode('toastBg', 520, 56, '#000000', this.node, 12, 190);
            bg.setPosition(0, 120);
            this.toast = addLabel(bg, '', 26, CREAM);
        }
        this.toast.string = text;
        this.toast.node.parent.active = true;
        this.toast.node.parent.setSiblingIndex(this.node.children.length - 1);
        this.toastT = 1.8;
    }

    /** 重画所有会变的部分（切关、切难度、设置改动后调用） */
    private render(p: Profile, levels: LevelDef[], act: HomeActions): void {
        const root = this.node;
        root.getChildByName('dyn')?.destroy();
        const dyn = makeNode('dyn', root, GAME.width, GAME.height);
        const put = (text: string, pos: readonly number[], size: number, color: string, parent: Node = dyn): Label => {
            const l = addLabel(parent, text, size, color);
            l.enableOutline = true;
            l.outlineColor = hex('#0C0A08');
            l.outlineWidth = 2;
            l.node.setPosition(...this.at(pos));
            return l;
        };
        const hit = (pos: readonly number[], w: number, h: number, cb: () => void, sound = true): Node => {
            const n = makeNode('hit', dyn, w * this.u, h * this.u);
            n.setPosition(...this.at(pos));
            n.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
                e.propagationStopped = true;
                if (sound) this.audio?.playSfx('click', 0.6);
                cb();
            });
            return n;
        };
        const rerender = () => this.render(p, levels, act);
        const count = levels.length;

        // 顶部：通关进度、资源、设置
        const clearedN = p.cleared.filter((c) => c.normal).length;
        put(`已通 ${clearedN} / ${count}`, POS.progress, 22, CREAM);
        put(formatAmount(p.coin), POS.coin, 22, CREAM);
        put(formatAmount(p.paper), POS.paper, 22, CREAM);
        hit(POS.gear, 80, 80, act.onSettings);

        // 标题
        const title = put('符镇百妖', POS.title, 60, GOLD);
        title.isBold = true;

        // 右侧三个入口 + 红点
        const entries: { id: 'upgrade' | 'talisman' | 'record'; name: string; dot: boolean }[] = [
            { id: 'upgrade', name: '养成', dot: canAffordUpgrade(p) },
            { id: 'talisman', name: '符咒', dot: canAffordStar(p) },
            { id: 'record', name: '记录', dot: false },
        ];
        entries.forEach((e, i) => {
            put(e.name, POS.entryLabels[i], 20, CREAM);
            hit(POS.entries[i], 140, 180, () => act.onEntry(e.id));
            if (e.dot) {
                const [x, y] = this.at(POS.entries[i]);
                const dot = makeNode('dot', dyn, 20, 20);
                const g = dot.addComponent(Graphics);
                g.fillColor = hex('#2A0A06');
                g.circle(0, 0, 11);
                g.fill();
                g.fillColor = hex('#DC2D23');
                g.circle(0, 0, 9);
                g.fill();
                dot.setPosition(x + 46 * this.u, y + 46 * this.u);
            }
        });

        // 关卡铭牌：名字、锁定状态、箭头
        const lv = this.level;
        const open = lv < p.unlockedLevels;
        const maxLv = maxBrowsableLevel(p, count);
        const plaque = put(levels[lv].name, POS.plaque, 30, open ? CREAM : DIM);
        if (!open) plaque.string = `${levels[lv].name}（未解锁）`;
        if (this.diff === 'hard' && open) {
            // 困难：铭牌加一圈朱红描边
            const [x, y] = this.at(POS.ring);
            const ring = makeNode('hardRing', dyn);
            ring.setPosition(x, y);
            const g = ring.addComponent(Graphics);
            g.lineWidth = 3;
            g.strokeColor = hex('#C23A2A');
            g.roundRect(-310 * this.u, -78 * this.u, 620 * this.u, 156 * this.u, 12);
            g.stroke();
        }
        const arrow = (pos: readonly number[], enabled: boolean, delta: number) => {
            const n = hit(pos, 90, 90, () => {
                if (!enabled) return;
                this.level += delta;
                if (!canPlay(p, this.level, this.diff)) this.diff = 'normal';
                rerender();
            }, enabled);
            if (!enabled) {
                // 到头的箭头压暗
                const mask = rectNode('arrowMask', 60 * this.u, 70 * this.u, '#05070C', n, 0, 170);
                mask.setPosition(0, 0);
            }
        };
        arrow(POS.arrowL, lv > 0, -1);
        arrow(POS.arrowR, lv < maxLv, 1);

        // 出战
        const playable = canPlay(p, lv, this.diff);
        const fightLabel = put('出　战', POS.fight, 52, playable ? GOLD : DIM);
        fightLabel.isBold = true;
        const fight = hit(POS.fight, 560, 100, () => {
            if (playable) act.onFight(lv, this.diff);
            else this.showToast('通关上一关后解锁');
        });
        if (!playable) {
            const mask = rectNode('fightMask', 580 * this.u, 96 * this.u, '#05070C', fight, 10, 150);
            mask.setPosition(0, 0);
            fightLabel.node.setSiblingIndex(dyn.children.length - 1);
        } else {
            popIn(fightLabel.node, 0.25);
        }

        // 难度切换：关卡牌右上角的两格小切换，盖住底图上的样子重画
        const hardOpen = open && p.cleared[lv]?.normal === true;
        const pill = (text: string, d: Difficulty, pos: readonly number[]) => {
            const on = this.diff === d;
            const enabled = d === 'normal' ? open : hardOpen;
            const [px, py] = this.at(pos);
            const bg = on ? (d === 'hard' ? '#7A1F18' : '#8A6A2A') : '#141218';
            const n = rectNode('pill', 76 * this.u, 34 * this.u, bg, dyn, 6, 245);
            n.setPosition(px, py);
            addLabel(n, enabled ? text : `${text}·锁`, 17, enabled ? (on ? '#FFF2C8' : CREAM) : DIM);
            n.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
                e.propagationStopped = true;
                if (!enabled) {
                    this.showToast(open ? '普通难度通关后解锁困难' : '通关上一关后解锁');
                    return;
                }
                this.audio?.playSfx('click', 0.6);
                this.diff = d;
                rerender();
            });
        };
        pill('普通', 'normal', POS.diffNormal);
        pill('困难', 'hard', POS.diffHard);

        // 首通奖励：数字写在底图的铜钱、符纸、宝箱图标旁边
        const done = p.cleared[lv]?.[this.diff] === true;
        const col = open && !done ? CREAM : DIM;
        if (this.diff === 'normal') {
            const r = FIRST_CLEAR_NORMAL[lv];
            put(r ? `${r.coin}` : '-', POS.rewardCoin, 20, col);
            put(r ? `${r.paper}` : '-', POS.rewardPaper, 20, col);
            put(done ? '已领' : (r?.chest ?? '-'), POS.rewardChest, 20, done ? '#C23A2A' : col);
        } else {
            const paper = FIRST_CLEAR_HARD_PAPER[lv];
            put('×2', POS.rewardCoin, 20, col);
            put(paper !== undefined ? `+${paper}` : '-', POS.rewardPaper, 20, col);
            put(done ? '已领' : '×2', POS.rewardChest, 20, done ? '#C23A2A' : col);
        }

        // Should S1：Boss 圆框挂本关名章；已通关显示当前难度最佳时间
        const bossKey = BOSS_SEALS[lv];
        const [bx, by] = this.at(POS.boss);
        const sealR = 72 * this.u;
        if (bossKey) {
            const seal = spriteNode(bossKey, sealR * 2, sealR * 2, dyn);
            if (seal) {
                seal.setPosition(bx, by);
            } else {
                // 缺资源时圆框占位（半写实夜景色，不空着）
                const ph = makeNode('bossPh', dyn);
                ph.setPosition(bx, by);
                const pg = ph.addComponent(Graphics);
                pg.fillColor = hex('#1A1520');
                pg.circle(0, 0, sealR);
                pg.fill();
                const bossWave = levels[lv].waves.find((w) => ENEMIES[w.enemy]?.boss);
                const nm = bossWave ? ENEMIES[bossWave.enemy].name : 'Boss';
                addLabel(ph, nm.slice(0, 2), 22, CREAM);
            }
        }
        const best = p.bestTimes[lv]?.[this.diff] ?? null;
        if (open && best !== null) {
            put(`最短 ${formatBestTime(best)}`, POS.bestTime, 18, GOLD);
        }

        if (this.metaGuide) this.paintMetaGuide();
    }

    /** 养成入口暖金光圈 + 旁白（禁霓虹箭头） */
    private paintMetaGuide(): void {
        const root = this.node;
        if (!root) return;
        const dyn = root.getChildByName('dyn');
        if (!dyn) return;
        dyn.getChildByName('metaGuide')?.destroy();
        const layer = makeNode('metaGuide', dyn);
        const [x, y] = this.at(POS.entries[0]);
        const glow = makeNode('glow', layer);
        glow.setPosition(x, y);
        const g = glow.addComponent(Graphics);
        // 外圈暖金薄环
        g.lineWidth = 4;
        g.strokeColor = hex('#E8B45A', 200);
        g.circle(0, 0, 58 * this.u);
        g.stroke();
        g.lineWidth = 2;
        g.strokeColor = hex('#FFD66E', 160);
        g.circle(0, 0, 48 * this.u);
        g.stroke();
        // 柔光盘（低透明）
        g.fillColor = hex('#C48A2A', 55);
        g.circle(0, 0, 42 * this.u);
        g.fill();
        breathe(glow, 0.06, 1.4);
        const tip = addLabel(layer, '用铜钱加固城墙', 24, GOLD);
        tip.enableOutline = true;
        tip.outlineColor = hex('#0C0A08');
        tip.outlineWidth = 2;
        tip.node.setPosition(x - 160 * this.u, y);
        // 旁白轻呼吸透明度
        let op = tip.node.getComponent(UIOpacity);
        if (!op) op = tip.node.addComponent(UIOpacity);
        op.opacity = 230;
        tween(op).repeatForever(
            tween(op).to(0.9, { opacity: 140 }).to(0.9, { opacity: 230 }),
        ).start();
    }

    /**
     * 记录页（§4.4 / §4.6）：每关普通最短时间 + 困难最短时间；困难首通暖金竖符朱砂印。
     */
    showRecords(p: Profile, levels: LevelDef[], onClose: () => void): void {
        if (!this.node) return;
        this.node.getChildByName('records')?.destroy();
        const mask = rectNode('records', GAME.width, GAME.height, '#000000', this.node, 0, 200);
        mask.on(Node.EventType.TOUCH_END, (e: EventTouch) => (e.propagationStopped = true));
        const W = 660;
        const H = Math.min(1040, 180 + levels.length * 200 + 100);
        const panel = rectNode('panel', W, H, '#12141C', mask, 16, 250);
        const border = makeNode('border', panel).addComponent(Graphics);
        border.lineWidth = 2;
        border.strokeColor = hex('#B8924A');
        border.roundRect(-W / 2, -H / 2, W, H, 16);
        border.stroke();
        const tap = (n: Node, cb: () => void) => n.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            e.propagationStopped = true;
            cb();
        });
        addLabel(panel, '通关记录', 40, GOLD).node.setPosition(0, H / 2 - 50);
        addLabel(panel, '本地最短时间 · 困难首通金印', 20, DIM).node.setPosition(0, H / 2 - 95);

        levels.forEach((lv, i) => {
            const y = H / 2 - 180 - i * 200;
            const card = rectNode('row', W - 48, 180, '#1E1A26', panel, 12);
            card.setPosition(0, y);
            addLabel(card, lv.name, 28, GOLD).node.setPosition(-140, 50);
            const nt = formatBestTime(p.bestTimes[i]?.normal ?? null);
            const ht = formatBestTime(p.bestTimes[i]?.hard ?? null);
            addLabel(card, `普通  ${nt}`, 24, CREAM).node.setPosition(-140, 8);
            addLabel(card, `困难  ${ht}`, 24, CREAM).node.setPosition(-140, -32);
            // 困难首通：暖金竖符 + 朱砂印面（禁奖杯风）
            const hardDone = p.cleared[i]?.hard === true;
            const seal = makeNode('hardSeal', card);
            seal.setPosition(220, 0);
            const sg = seal.addComponent(Graphics);
            if (hardDone) {
                // 竖符纸
                sg.fillColor = hex('#C9A24A');
                sg.roundRect(-22, -56, 44, 112, 4);
                sg.fill();
                sg.fillColor = hex('#E8C878');
                sg.roundRect(-18, -52, 36, 104, 3);
                sg.fill();
                // 朱砂印面
                sg.fillColor = hex('#8B1E1E');
                sg.roundRect(-14, -8, 28, 28, 3);
                sg.fill();
                sg.strokeColor = hex('#5A1010');
                sg.lineWidth = 2;
                sg.roundRect(-14, -8, 28, 28, 3);
                sg.stroke();
                const mark = addLabel(seal, '印', 18, '#F2D6A0');
                mark.isBold = true;
                mark.node.setPosition(0, 6);
                addLabel(seal, '困难', 16, '#5A3A10').node.setPosition(0, -40);
            } else {
                sg.strokeColor = hex('#3A342C', 180);
                sg.lineWidth = 2;
                sg.roundRect(-22, -56, 44, 112, 4);
                sg.stroke();
                addLabel(seal, '未印', 18, DIM).node.setPosition(0, 0);
            }
        });

        const close = rectNode('close', 220, 60, '#3A3226', panel, 12);
        close.setPosition(0, -H / 2 + 55);
        addLabel(close, '返　回', 28, CREAM);
        tap(close, () => {
            this.audio?.playSfx('click', 0.6);
            mask.destroy();
            onClose();
        });
        setOpacity(panel, 255);
        popIn(panel, 0.2);
    }

    /** 设置面板：音乐、音效开关，清除存档（二次确认）；震屏 2026-10-31 已去掉 */
    showSettings(p: Profile, onChange: () => void, onClear: () => void): void {
        if (!this.node) return;
        this.node.getChildByName('settings')?.destroy();
        const mask = rectNode('settings', GAME.width, GAME.height, '#000000', this.node, 0, 170);
        mask.on(Node.EventType.TOUCH_END, (e: EventTouch) => (e.propagationStopped = true));
        const panel = rectNode('panel', 520, 560, '#12141C', mask, 16, 245);
        const border = makeNode('border', panel);
        const g = border.addComponent(Graphics);
        g.lineWidth = 2;
        g.strokeColor = hex('#B8924A');
        g.roundRect(-260, -280, 520, 560, 16);
        g.stroke();
        addLabel(panel, '设　置', 40, GOLD).node.setPosition(0, 220);

        const rows: { name: string; key: 'music' | 'sfx' }[] = [
            { name: '音乐', key: 'music' }, { name: '音效', key: 'sfx' },
        ];
        const redraw = () => this.showSettings(p, onChange, onClear);
        rows.forEach((r, i) => {
            const y = 120 - i * 90;
            addLabel(panel, r.name, 30, CREAM).node.setPosition(-120, y);
            const on = p.settings[r.key];
            const sw = rectNode('switch', 140, 52, on ? '#7A1F18' : '#2A2830', panel, 26);
            sw.setPosition(110, y);
            addLabel(sw, on ? '开' : '关', 26, on ? GOLD : DIM);
            sw.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
                e.propagationStopped = true;
                p.settings[r.key] = !p.settings[r.key];
                onChange();
                this.audio?.playSfx('click', 0.6);
                redraw();
            });
        });

        let armed = false;
        const clear = rectNode('clear', 300, 60, '#2A1412', panel, 12);
        clear.setPosition(0, -150);
        const clearLabel = addLabel(clear, '清除存档', 26, '#E07A6A');
        clear.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            e.propagationStopped = true;
            if (!armed) {
                armed = true;
                clearLabel.string = '再点一次确认清除';
                return;
            }
            onClear();
        });

        const close = rectNode('close', 200, 56, '#3A3226', panel, 12);
        close.setPosition(0, -230);
        addLabel(close, '关　闭', 26, CREAM);
        close.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            e.propagationStopped = true;
            this.audio?.playSfx('click', 0.6);
            mask.destroy();
        });
        setOpacity(panel, 255);
        popIn(panel, 0.2);
    }

    /**
     * 养成页（第 4.4 节）：上方余额，"道士"页签四项属性，"符咒"页签六符升星。
     * onBuy 返回是否买成功；买完由调用方存档，这里只负责重画。
     */
    /**
     * 养成页。guideWall=true 时按 §4.7：够钱暖光高亮城墙购买，不够显示真实「还差 X 铜钱」。
     */
    showUpgrade(
        p: Profile,
        tab: 'stat' | 'star',
        onBuy: (kind: 'stat' | 'star', id: string) => boolean,
        onClose: () => void,
        guideWall = false,
    ): void {
        if (!this.node) return;
        this.node.getChildByName('upgrade')?.destroy();
        const mask = rectNode('upgrade', GAME.width, GAME.height, '#000000', this.node, 0, 200);
        mask.on(Node.EventType.TOUCH_END, (e: EventTouch) => (e.propagationStopped = true));
        const W = 660;
        const H = 1000;
        const panel = rectNode('panel', W, H, '#12141C', mask, 16, 250);
        const g = makeNode('border', panel).addComponent(Graphics);
        g.lineWidth = 2;
        g.strokeColor = hex('#B8924A');
        g.roundRect(-W / 2, -H / 2, W, H, 16);
        g.stroke();
        const redraw = (t = tab) => this.showUpgrade(p, t, onBuy, onClose, guideWall);
        const tap = (n: Node, cb: () => void) => n.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            e.propagationStopped = true;
            cb();
        });

        addLabel(panel, '养　成', 40, GOLD).node.setPosition(0, H / 2 - 50);
        addLabel(panel, `铜钱 ${formatAmount(p.coin)}　　符纸 ${formatAmount(p.paper)}`, 28, CREAM).node.setPosition(0, H / 2 - 105);

        // 页签
        (['stat', 'star'] as const).forEach((t, i) => {
            const on = t === tab;
            const b = rectNode('tab', 220, 56, on ? '#7A1F18' : '#2A2830', panel, 12);
            b.setPosition(i === 0 ? -120 : 120, H / 2 - 170);
            addLabel(b, t === 'stat' ? '道　士' : '符　咒', 28, on ? GOLD : DIM);
            const dot = t === 'stat' ? canAffordUpgrade(p) : canAffordStar(p);
            if (dot) rectNode('dot', 16, 16, '#E23B3B', b, 8).setPosition(96, 22);
            tap(b, () => {
                this.audio?.playSfx('click', 0.6);
                redraw(t);
            });
        });

        const buyBtn = (parent: Node, cost: number | null, have: number, unit: string, x: number, y: number, w: number, cb: () => void) => {
            const ok = cost !== null && have >= cost;
            const b = rectNode('buy', w, 56, cost === null ? '#2A2830' : ok ? '#8E2C2C' : '#3A3036', parent, 12);
            b.setPosition(x, y);
            addLabel(b, cost === null ? '已满' : `${unit} ${cost}`, 26, cost === null ? DIM : ok ? GOLD : '#E07A6A');
            if (ok) tap(b, cb);
        };
        const buy = (kind: 'stat' | 'star', id: string) => {
            if (!onBuy(kind, id)) return;
            this.audio?.playSfx('levelup', 0.6);
            redraw();
        };

        const top = H / 2 - 250;
        if (tab === 'stat') {
            const pct = (v: number) => `${Math.round(v * 100)}%`;
            const effect = (id: StatId, lv: number): string => {
                if (id === 'wall') return `城墙 ${GAME.wallHp + STAT_EFFECT.wallPerLv * lv}`;
                if (id === 'brush') return `镇妖符伤害 +${pct(STAT_EFFECT.brushPerLv * lv)}`;
                if (id === 'spirit') return `灵气 +${pct(STAT_EFFECT.spiritPerLv * lv)}`;
                return `开局选卡 +${STAT_EFFECT.altarPerLv * lv}`;
            };
            (Object.keys(STAT_UPGRADES) as StatId[]).forEach((id, i) => {
                const y = top - i * 170;
                const card = rectNode('card', W - 60, 150, '#1E1A26', panel, 12);
                card.setPosition(0, y);
                const max = STAT_UPGRADES[id].costs.length;
                const lv = p.stats[id];
                const name = addLabel(card, `${STAT_UPGRADES[id].name}  ${lv}/${max}`, 30, GOLD);
                name.node.setPosition(-110, 30);
                const next = lv < max ? `${effect(id, lv)} → ${effect(id, lv + 1)}` : effect(id, lv);
                addLabel(card, next, 22, CREAM).node.setPosition(-110, -25);
                const cost = statCost(p, id);
                buyBtn(card, cost, p.coin, '铜钱', 205, 0, 170, () => buy('stat', id));
                // §4.7 首局引导：城墙卡
                if (guideWall && id === 'wall' && cost !== null) {
                    if (p.coin >= cost) {
                        const glow = makeNode('wallGlow', card);
                        const gg = glow.addComponent(Graphics);
                        gg.lineWidth = 3;
                        gg.strokeColor = hex('#E8B45A', 220);
                        gg.roundRect(-(W - 60) / 2 + 4, -75 + 4, W - 68, 142, 10);
                        gg.stroke();
                        breathe(glow, 0.04, 1.2);
                    } else {
                        const need = cost - p.coin;
                        addLabel(card, `还差 ${need} 铜钱`, 20, '#E07A6A').node.setPosition(-110, -55);
                    }
                }
            });
        } else {
            TALISMAN_IDS.forEach((id: TalismanId, i) => {
                const x = i % 2 === 0 ? -150 : 150;
                const y = top - 20 - Math.floor(i / 2) * 210;
                const card = rectNode('card', 280, 190, '#1E1A26', panel, 12);
                card.setPosition(x, y);
                const st = p.stars[id];
                addLabel(card, TALISMANS[id].name, 28, GOLD).node.setPosition(0, 62);
                addLabel(card, '★'.repeat(st) + '☆'.repeat(STAR_COSTS.length - st), 30, '#FFD66E').node.setPosition(0, 18);
                addLabel(card, `伤害 +${st * 5}%`, 20, CREAM).node.setPosition(0, -20);
                buyBtn(card, starCost(p, id), p.paper, '符纸', 0, -62, 200, () => buy('star', id));
            });
        }

        const close = rectNode('close', 220, 60, '#3A3226', panel, 12);
        close.setPosition(0, -H / 2 + 55);
        addLabel(close, '返　回', 28, CREAM);
        tap(close, () => {
            this.audio?.playSfx('click', 0.6);
            mask.destroy();
            onClose();
        });
        setOpacity(panel, 255);
    }
}
