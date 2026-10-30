// 主界面（docs/gameplay-design.md 4.4 节，效果图 docs/art/ref/ui_mainmenu_v8.png）。
// 背景暂用 v8 效果图的无字底图 ui_home_bg（框、图标、按钮都画在图里），
// 这里按图上位置叠文字、红点、锁定状态和点击区域。拆图后换成独立素材时只改 IMG 坐标表。

import { Node, Label, EventTouch, Graphics } from 'cc';
import { GAME, LevelDef } from '../config/GameConfig';
import { Difficulty, FIRST_CLEAR_NORMAL, FIRST_CLEAR_HARD_PAPER } from '../config/MetaConfig';
import { makeNode, addLabel, rectNode, hex, setOpacity } from '../core/Draw';
import { spriteNode } from '../core/Art';
import { AudioManager } from '../core/AudioManager';
import {
    Profile, canPlay, maxBrowsableLevel, canAffordUpgrade, canAffordStar, formatAmount,
} from '../meta/Profile';
import { popIn } from './Anim';

/** 底图原始尺寸，以及图上各元素的中心位置（像素，左上为原点） */
const IMG = { w: 941, h: 1672 };
const POS = {
    progress: [262, 86], coin: [592, 52], paper: [775, 52], gear: [887, 52],
    title: [470, 215],
    entries: [[852, 725], [852, 905], [852, 1085]],
    entryLabels: [[852, 805], [852, 985], [852, 1170]],
    // v12：关卡牌一行（Boss 头像在图里），右上角难度小切换，底边奖励图标；下面是出战
    plaque: [560, 1345], ring: [470, 1382], arrowL: [107, 1382], arrowR: [835, 1382],
    fight: [470, 1545],
    diffNormal: [650, 1312], diffHard: [728, 1312],
    rewardCoin: [452, 1420], rewardPaper: [570, 1420], rewardChest: [722, 1420],
} as const;

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

    constructor(private root: Node, private audio?: AudioManager) {}

    /** 图上坐标 → 节点坐标（底图等比铺满屏幕、居中） */
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
        // 按宽度铺满：按钮画在底图里，左右不能裁，否则头像和右侧入口会被切掉
        this.s = GAME.width / IMG.w;
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
            const n = makeNode('hit', dyn, w * this.s, h * this.s);
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
                dot.setPosition(x + 46 * this.s, y + 46 * this.s);
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
            g.roundRect(-310 * this.s, -78 * this.s, 620 * this.s, 156 * this.s, 12);
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
                const mask = rectNode('arrowMask', 60 * this.s, 70 * this.s, '#05070C', n, 0, 170);
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
            const mask = rectNode('fightMask', 580 * this.s, 96 * this.s, '#05070C', fight, 10, 150);
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
            const n = rectNode('pill', 76 * this.s, 34 * this.s, bg, dyn, 6, 245);
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
    }

    /** 设置面板：音乐、音效、震屏开关，清除存档（二次确认） */
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

        const rows: { name: string; key: 'music' | 'sfx' | 'shake' }[] = [
            { name: '音乐', key: 'music' }, { name: '音效', key: 'sfx' }, { name: '震屏', key: 'shake' },
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
}
