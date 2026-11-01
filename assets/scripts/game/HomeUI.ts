// 主界面：⑤精致像素夜色插画 + CD 像素首页 IA（A 顶栏 / B 标题 / D 右三钮 / E 关卡牌+出战）。
// 色板与分层见 docs/art/art-bible.md；交互见 docs/gameplay-design.md §4.4。
// 右栏文案锁死：养成→符咒→记录。冻：每日/无尽/图鉴/商城/体力（不画）。
// 底图只舞台；文字/出战/切关/右钮/设置/红点/锁/引导/最佳时间/困难竖符/Boss 槽由引擎画。
// L1/局内旧素材仍为旧风格待换，勿标新风格完成。

import { Node, Label, EventTouch, Graphics, tween, UIOpacity, UITransform } from 'cc';
import { GAME, LevelDef, ENEMIES, TALISMANS, TalismanId } from '../config/GameConfig';
import { Difficulty, FIRST_CLEAR_NORMAL, FIRST_CLEAR_HARD_PAPER, StatId, STAT_UPGRADES, STAT_EFFECT, STAR_COSTS, TALISMAN_IDS } from '../config/MetaConfig';
import { makeNode, addLabel, rectNode, hex, setOpacity } from '../core/Draw';
import { spriteNode, hasArt } from '../core/Art';
import { AudioManager } from '../core/AudioManager';
import {
    Profile, canPlay, maxBrowsableLevel, canAffordUpgrade, canAffordStar, formatAmount, statCost, starCost,
    formatBestTime,
} from '../meta/Profile';
import { popIn, breathe } from './Anim';

/** 主页设计坐标：1080×2340（像素夜色底），顶部和底部控件分别贴合安全边距。 */
const IMG = { w: 1080, h: 2340 };
const SRC_K = 1;
const POS = {
    // A 顶栏 / B 标题 / D 右竖三钮 / E 关卡牌（Boss 圆框+关名+难度）+出战。
    progress: [539, 428], coin: [281, 152], paper: [677, 152], gear: [981, 152],
    title: [539, 313],
    entries: [[930, 840], [930, 1092], [930, 1344]],
    boss: [320, 1658], plaque: [600, 1658], ring: [539, 1755],
    arrowL: [195, 1658], arrowR: [884, 1658], hardSeal: [790, 1658],
    bestTime: [539, 1718],
    fight: [539, 2113],
    diffNormal: [404, 1808], diffHard: [675, 1808],
    reward: [539, 1880],
} as const;

/** 像素夜色色板：金暖 / 暖纸字 / 石墙冷灰 */
const GOLD = '#F4B41B';
const CREAM = '#E8E4D9';
const DIM = '#8A90A0';
const INDIGO = '#1A1C2C';
const CINNABAR = '#BC2525';
const STONE = '#5C6B7A';

/** 弹窗共用的深靛石墙底 + 金暖细框；不依赖额外图片。 */
function modalSurface(name: string, w: number, h: number, parent: Node, frame = false): Node {
    const n = rectNode(name, w, h, frame ? '#242736' : '#1F2230', parent, frame ? 18 : 10);
    const g = n.getComponent(Graphics);
    g.lineWidth = frame ? 2 : 1;
    g.strokeColor = hex(frame ? GOLD : STONE, frame ? 230 : 120);
    g.roundRect(-w / 2, -h / 2, w, h, frame ? 18 : 10); g.stroke();
    if (frame) {
        g.strokeColor = hex(STONE, 95);
        g.roundRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 12); g.stroke();
        for (const x of [-1, 1]) for (const y of [-1, 1]) {
            const px = x * (w / 2 - 20), py = y * (h / 2 - 20);
            g.strokeColor = hex(GOLD, 220);
            g.moveTo(px - x * 26, py); g.lineTo(px, py); g.lineTo(px, py - y * 26); g.stroke();
        }
        g.strokeColor = hex(GOLD, 150);
        const y = h / 2 - 136;
        g.moveTo(-w / 2 + 34, y); g.lineTo(-12, y);
        g.moveTo(12, y); g.lineTo(w / 2 - 34, y); g.stroke();
        g.moveTo(0, y + 5); g.lineTo(5, y); g.lineTo(0, y - 5); g.lineTo(-5, y); g.close(); g.stroke();
    }
    return n;
}

function modalButton(name: string, w: number, h: number, parent: Node, tone: 'ink' | 'red' | 'gold' = 'ink'): Node {
    const fill = tone === 'red' ? CINNABAR : tone === 'gold' ? '#C48A2A' : '#2A2E3F';
    const n = rectNode(name, w, h, fill, parent, 10);
    const g = n.getComponent(Graphics);
    g.strokeColor = hex(tone === 'red' || tone === 'gold' ? GOLD : STONE, 210);
    g.lineWidth = 1.5;
    g.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 8); g.stroke();
    n.getComponent(UITransform).setContentSize(w, Math.max(h, 96));
    return n;
}

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

    /** 设计图中 1 像素对应的布局尺寸。 */
    private get u(): number {
        return this.s * SRC_K;
    }

    private at(p: readonly number[]): [number, number] {
        const extra = GAME.height - IMG.h * this.s;
        return [(p[0] - IMG.w / 2) * this.s, GAME.height / 2 - p[1] * this.s - (p[1] > 1400 ? extra : 0)];
    }

    /** 当前停在第几关（重排时保持不变） */
    get currentLevel(): number {
        return this.level;
    }

    show(p: Profile, levels: LevelDef[], startLevel: number, act: HomeActions): void {
        this.hide();
        this.level = startLevel;
        this.s = GAME.width / IMG.w;
        const root = makeNode('home', this.root, GAME.width, GAME.height);
        this.node = root;
        rectNode('homeBase', GAME.width, GAME.height, INDIGO, root);
        // 插画等比铺满；交互独立于背景，适配长屏时底部控件仍然靠下。
        const cover = Math.max(GAME.width / IMG.w, GAME.height / IMG.h);
        spriteNode('ui_home_bg', IMG.w * cover, IMG.h * cover, root);
        // 上下柔暗遮罩承托文字；中段保持原插画亮度。
        for (let i = 0; i < 16; i++) {
            const top = rectNode('headerShade', GAME.width, 18, INDIGO, root, 0, Math.round(70 * (1 - i / 16)));
            top.setPosition(0, GAME.height / 2 - 9 - i * 18);
            const bottom = rectNode('footerShade', GAME.width, 28, '#0E1018', root, 0, Math.round(210 * (1 - i / 16)));
            bottom.setPosition(0, -GAME.height / 2 + 14 + i * 28);
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
     * 第一局结束后：养成入口符咒暖光圈 + 旁白「用铜钱加固结界」。
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
            l.outlineWidth = 1.2;
            l.node.setPosition(...this.at(pos));
            return l;
        };
        const hit = (pos: readonly number[], w: number, h: number, cb: () => void, sound = true): Node => {
            // 游戏坐标 720 宽：96px ≈ 48 CSS px（360 宽手机），落在 88–96 触控下限上沿。
            const minTouch = 96;
            const n = makeNode('hit', dyn, Math.max(w * this.u, minTouch), Math.max(h * this.u, minTouch));
            n.setPosition(...this.at(pos));
            n.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
                e.propagationStopped = true;
                if (sound) this.audio?.playSfx('click', 0.6);
                cb();
            });
            return n;
        };
        // 精致像素：深靛石墙 + 金暖描边 + 朱砂出战，文字图标独立于插画。
        const art = (name: string, pos: readonly number[], w: number, h: number): Node => {
            const primary = name === 'fightPanel';
            const level = name === 'levelPanel';
            const entry = name.startsWith('entry-');
            // CD 锁表：出战 820×180 硬边；关卡卡 890×300；侧钮约 140×140。
            const width = w * this.u;
            const height = h * this.u;
            const n = makeNode(name, dyn, width, height);
            n.setPosition(...this.at(pos));
            const g = n.addComponent(Graphics);
            // 出战硬边平涂；关卡/侧钮仅轻微像素圆角。
            const radius = (primary ? 0 : level ? 8 : entry ? 6 : 12) * this.u;
            g.fillColor = hex('#0A0C14', primary ? 0 : 55);
            if (!primary) {
                g.roundRect(-width / 2, -height / 2 - 7 * this.u, width, height, radius); g.fill();
            }
            g.fillColor = hex(primary ? CINNABAR : level ? '#242736' : '#2A2E3F', level ? 247 : 255);
            if (primary) {
                g.rect(-width / 2, -height / 2, width, height); g.fill();
            } else {
                g.roundRect(-width / 2, -height / 2, width, height, radius); g.fill();
            }
            // CD：金描边 1–2 逻辑像素；出战朱砂底 + 金框。
            g.strokeColor = hex(primary || level ? GOLD : '#C9A84A');
            g.lineWidth = (primary ? 2 : 1.5) * this.u;
            if (primary) {
                g.rect(-width / 2 + 4 * this.u, -height / 2 + 4 * this.u, width - 8 * this.u, height - 8 * this.u); g.stroke();
            } else {
                g.roundRect(-width / 2 + 4 * this.u, -height / 2 + 4 * this.u, width - 8 * this.u, height - 8 * this.u, Math.max(0, radius - 3 * this.u)); g.stroke();
            }
            if (level) return n;
            const icon = makeNode('icon', n);
            icon.setPosition(entry || primary || name === 'settingsPanel' ? 0 : -width / 2 + 46 * this.u, 0);
            const ig = icon.addComponent(Graphics);
            ig.lineWidth = 4 * this.u;
            ig.strokeColor = hex(GOLD);
            ig.fillColor = hex('#E0A010');
            const k = this.u;
            if (primary) {
                // 两侧短云纹，保留中央清楚的出战文案。
                for (const side of [-1, 1]) {
                    ig.moveTo(side * 290 * k, -15 * k); ig.lineTo(side * 320 * k, -15 * k);
                    ig.lineTo(side * 320 * k, 8 * k); ig.lineTo(side * 300 * k, 8 * k); ig.stroke();
                }
            } else if (name === 'coinPanel') {
                ig.circle(0, 0, 26 * k); ig.fill();
                ig.strokeColor = hex('#936134'); ig.rect(-8 * k, -8 * k, 16 * k, 16 * k); ig.stroke();
            } else if (name === 'paperPanel' || name === 'entry-talisman') {
                ig.roundRect(-19 * k, -30 * k, 38 * k, 60 * k, 4 * k); ig.fill();
                ig.strokeColor = hex('#D96050');
                ig.moveTo(-9 * k, 18 * k); ig.lineTo(9 * k, 18 * k);
                ig.moveTo(0, 24 * k); ig.lineTo(0, -20 * k);
                ig.moveTo(-10 * k, 0); ig.lineTo(10 * k, 0); ig.stroke();
            } else if (name === 'entry-upgrade') {
                ig.roundRect(-30 * k, -24 * k, 60 * k, 44 * k, 3 * k); ig.stroke();
                ig.moveTo(-36 * k, 20 * k); ig.lineTo(0, 41 * k); ig.lineTo(36 * k, 20 * k);
                ig.moveTo(-10 * k, -24 * k); ig.lineTo(-10 * k, 0); ig.lineTo(10 * k, 0); ig.lineTo(10 * k, -24 * k); ig.stroke();
            } else if (name === 'entry-record') {
                ig.roundRect(-26 * k, -31 * k, 52 * k, 62 * k, 6 * k); ig.stroke();
                for (const y of [-14, 0, 14]) { ig.moveTo(-14 * k, y * k); ig.lineTo(14 * k, y * k); } ig.stroke();
            } else {
                ig.circle(0, 0, 19 * k); ig.stroke();
                for (let i = 0; i < 8; i++) {
                    const angle = i * Math.PI / 4;
                    ig.moveTo(Math.cos(angle) * 25 * k, Math.sin(angle) * 25 * k);
                    ig.lineTo(Math.cos(angle) * 34 * k, Math.sin(angle) * 34 * k);
                } ig.stroke();
            }
            return n;
        };
        // CD chrome 贴图优先；缺失时退回上方 Graphics art()。stone_bar/hero 不挂。
        const chromeTop = hasArt('ui_home_topbar');
        const chromeSide = hasArt('ui_home_side_btn');
        const chromePip = hasArt('ui_home_pip');
        const chromeCard = hasArt('ui_home_level_card');
        const chromeFight = hasArt('ui_home_battle_btn');
        let fightArt: Node | null = null;
        if (chromeTop) {
            const bar = spriteNode('ui_home_topbar', 1000 * this.u, 72 * this.u, dyn);
            bar?.setPosition(...this.at([540, 152]));
        } else {
            art('coinPanel', POS.coin, 330, 103);
            art('paperPanel', POS.paper, 330, 105);
            art('settingsPanel', POS.gear, 100, 94);
        }
        if (chromeCard) {
            const card = spriteNode('ui_home_level_card', 890 * this.u, 300 * this.u, dyn);
            card?.setPosition(...this.at(POS.ring));
        } else {
            art('levelPanel', POS.ring, 890, 300);
        }
        if (chromeFight) {
            fightArt = spriteNode('ui_home_battle_btn', 820 * this.u, 180 * this.u, dyn);
            fightArt?.setPosition(...this.at(POS.fight));
        } else {
            fightArt = art('fightPanel', POS.fight, 820, 180);
        }
        const rerender = () => this.render(p, levels, act);
        const count = levels.length;

        // 顶部：通关进度、资源、设置
        const clearedN = p.cleared.filter((c) => c.normal).length;
        put(`已通 ${clearedN} / ${count}`, POS.progress, 28, CREAM);
        put(formatAmount(p.coin), [POS.coin[0] + 24, POS.coin[1]], 32, '#FFFFFF');
        put(formatAmount(p.paper), [POS.paper[0] + 24, POS.paper[1]], 32, '#FFFFFF');
        hit(POS.gear, 110, 110, act.onSettings);

        // 标题
        const title = put('符 镇 百 妖', POS.title, 82, GOLD);
        title.fontFamily = 'serif';
        title.outlineColor = hex('#0C0A08');
        title.outlineWidth = 2;
        title.isBold = true;
        const titleOrnament = makeNode('titleOrnament', dyn);
        titleOrnament.setPosition(...this.at([470, 282]));
        const tg = titleOrnament.addComponent(Graphics);
        tg.lineWidth = this.u;
        tg.strokeColor = hex(GOLD, 220);
        for (const side of [-1, 1]) {
            tg.moveTo(side * 28 * this.u, 0); tg.lineTo(side * 173 * this.u, 0);
            tg.moveTo(side * 186 * this.u, 5 * this.u); tg.lineTo(side * 191 * this.u, 0); tg.lineTo(side * 186 * this.u, -5 * this.u);
        }
        tg.moveTo(0, 6 * this.u); tg.lineTo(6 * this.u, 0); tg.lineTo(0, -6 * this.u); tg.lineTo(-6 * this.u, 0); tg.close(); tg.stroke();

        // D 右竖三钮文案锁死：养成→符咒→记录；红点仅前两项且买得起。冻入口不画。
        const entries: { id: 'upgrade' | 'talisman' | 'record'; name: string; dot: boolean }[] = [
            { id: 'upgrade', name: '养成', dot: canAffordUpgrade(p) },
            { id: 'talisman', name: '符咒', dot: canAffordStar(p) },
            { id: 'record', name: '记录', dot: false },
        ];
        entries.forEach((e, i) => {
            if (chromeSide) {
                const side = spriteNode('ui_home_side_btn', 140 * this.u, 140 * this.u, dyn);
                side?.setPosition(...this.at(POS.entries[i]));
            } else {
                art(`entry-${e.id}`, POS.entries[i], 140, 140);
            }
            // 入口文案与图标分离，描边保证复杂插画上的可读性。
            const caption = put(e.name, POS.entries[i], 29, CREAM);
            // 从徽章的顶部锚点偏移，第三个标签越过 1000 时也不切到底部锚点。
            caption.node.setPosition(caption.node.position.x, caption.node.position.y - 72 * this.u);
            caption.outlineColor = hex('#0C0A08');
            caption.outlineWidth = 3;
            hit([POS.entries[i][0], POS.entries[i][1] + 8], 160, 180, () => act.onEntry(e.id));
            if (e.dot) {
                const [x, y] = this.at(POS.entries[i]);
                if (chromePip) {
                    const pip = spriteNode('ui_home_pip', 24 * this.u, 24 * this.u, dyn);
                    pip?.setPosition(x + 58 * this.u, y + 58 * this.u);
                } else {
                    const dot = makeNode('dot', dyn, 24, 24);
                    const g = dot.addComponent(Graphics);
                    // CD Should：pip 硬边像素方点，非软圆。
                    g.fillColor = hex('#2A0A06');
                    g.rect(-12 * this.u, -12 * this.u, 24 * this.u, 24 * this.u); g.fill();
                    g.fillColor = hex(CINNABAR);
                    g.rect(-10 * this.u, -10 * this.u, 20 * this.u, 20 * this.u); g.fill();
                    dot.setPosition(x + 58 * this.u, y + 58 * this.u);
                }
            }
        });

        // E 关卡牌：Boss 圆框槽 + 关名 + 难度锁 + 切关；困难已印则画竖符金印（无新贴图）。
        const lv = this.level;
        const open = lv < p.unlockedLevels;
        const maxLv = maxBrowsableLevel(p, count);
        const best = p.bestTimes[lv]?.[this.diff] ?? null;
        const bossWave = levels[lv].waves.find((w) => ENEMIES[w.enemy]?.boss);
        const boss = bossWave ? ENEMIES[bossWave.enemy] : null;
        const bossY = POS.boss[1] + (best === null ? 14 : 0);
        {
            const slot = makeNode('bossSlot', dyn);
            slot.setPosition(...this.at([POS.boss[0], bossY]));
            const bg = slot.addComponent(Graphics);
            const r = 48 * this.u;
            bg.fillColor = hex('#0A0C14', 200);
            bg.circle(0, 0, r); bg.fill();
            bg.fillColor = hex(open ? '#242736' : '#1A1C2C', 245);
            bg.circle(0, 0, r - 3 * this.u); bg.fill();
            bg.strokeColor = hex(open ? GOLD : STONE, open ? 230 : 140);
            bg.lineWidth = 2 * this.u; // 1–2 逻辑像素金描边
            bg.circle(0, 0, r - 1 * this.u); bg.stroke();
            const glyph = addLabel(slot, boss?.char ?? '？', 40, open ? CREAM : DIM);
            glyph.isBold = true;
            glyph.enableOutline = true;
            glyph.outlineColor = hex('#0C0A08');
            glyph.outlineWidth = 1.5;
            // 无 Boss 立绘资产时用字印占位；生图交付头像后再挂，不 invent 贴图。
        }
        const titlePos = [POS.plaque[0], POS.plaque[1] + (best === null ? 14 : 0)];
        const plaque = put(levels[lv].name, titlePos, 34, open ? CREAM : DIM);
        if (!open) plaque.string = `${levels[lv].name}（未解锁）`;
        plaque.enableWrapText = false;
        plaque.overflow = Label.Overflow.SHRINK;
        plaque.node.getComponent(UITransform).setContentSize(420 * this.u, 60 * this.u);
        if (p.cleared[lv]?.hard === true) {
            // 困难首通竖符金印（引擎绘制，禁烘焙进底图）
            const seal = makeNode('homeHardSeal', dyn);
            seal.setPosition(...this.at([POS.hardSeal[0], bossY]));
            const sg = seal.addComponent(Graphics);
            sg.fillColor = hex('#C9A24A');
            sg.roundRect(-16 * this.u, -40 * this.u, 32 * this.u, 80 * this.u, 3 * this.u); sg.fill();
            sg.fillColor = hex('#E8C878');
            sg.roundRect(-12 * this.u, -36 * this.u, 24 * this.u, 72 * this.u, 2 * this.u); sg.fill();
            sg.fillColor = hex(CINNABAR);
            sg.roundRect(-10 * this.u, -6 * this.u, 20 * this.u, 20 * this.u, 2 * this.u); sg.fill();
            const mark = addLabel(seal, '印', 14, '#F2D6A0');
            mark.isBold = true;
            mark.node.setPosition(0, 4 * this.u);
        }
        if (this.diff === 'hard' && open) {
            // 困难：关卡牌顶沿朱红细线
            const [x, y] = this.at(POS.ring);
            const ring = makeNode('hardRing', dyn);
            ring.setPosition(x, y);
            const g = ring.addComponent(Graphics);
            g.lineWidth = 2 * this.u;
            g.strokeColor = hex(CINNABAR);
            g.moveTo(-180 * this.u, 32 * this.u);
            g.lineTo(180 * this.u, 32 * this.u);
            g.stroke();
        }
        const arrow = (pos: readonly number[], enabled: boolean, delta: number) => {
            const arrowPos = [pos[0], titlePos[1]];
            const n = hit(arrowPos, 110, 110, () => {
                if (!enabled) return;
                this.level += delta;
                if (!canPlay(p, this.level, this.diff)) this.diff = 'normal';
                rerender();
            }, enabled);
            const g = n.addComponent(Graphics);
            g.fillColor = hex('#2A2E3F', enabled ? 255 : 180);
            g.circle(0, 0, 31 * this.u); g.fill();
            g.lineWidth = 2 * this.u;
            g.strokeColor = hex(enabled ? GOLD : DIM, enabled ? 240 : 120);
            g.circle(0, 0, 31 * this.u); g.stroke();
            g.lineWidth = 4 * this.u;
            g.moveTo(-delta * 6 * this.u, 12 * this.u);
            g.lineTo(delta * 6 * this.u, 0);
            g.lineTo(-delta * 6 * this.u, -12 * this.u); g.stroke();
        };
        arrow(POS.arrowL, lv > 0, -1);
        arrow(POS.arrowR, lv < maxLv, 1);

        // 出战
        const playable = canPlay(p, lv, this.diff);
        const fightLabel = put('出　战', POS.fight, 60, playable ? '#FFFFFF' : DIM);
        fightLabel.isBold = true;
        fightLabel.fontFamily = 'serif';
        fightLabel.outlineColor = hex('#5A1010');
        const fight = hit(POS.fight, 820, 180, () => {
            if (playable) act.onFight(lv, this.diff);
            else this.showToast('通关上一关后解锁');
        });
        if (!playable) {
            if (fightArt) setOpacity(fightArt, 120);
        } else {
            popIn(fightLabel.node, 0.25);
        }

        // 难度切换：独立一行，触控高度约 44 CSS 像素（375 宽预览）。
        const hardOpen = open && p.cleared[lv]?.normal === true;
        const pill = (text: string, d: Difficulty, pos: readonly number[]) => {
            const on = this.diff === d;
            const enabled = d === 'normal' ? open : hardOpen;
            const bg = on ? CINNABAR : '#2A2E3F';
            const n = rectNode(`difficulty-${d}`, 200 * this.u, 60 * this.u, bg, dyn, 20, 230);
            n.setPosition(...this.at(pos));
            // 当前难度用朱砂内衬强调，锁定状态保持低对比。
            const pg = n.getComponent(Graphics);
            pg.fillColor = hex(on && enabled ? CINNABAR : '#242736', 215);
            pg.roundRect(-96 * this.u, -26 * this.u, 192 * this.u, 52 * this.u, 18); pg.fill();
            n.getComponent(UITransform).setContentSize(220 * this.u, Math.max(110 * this.u, 96));
            addLabel(n, enabled ? text : `${text}·锁`, 30, enabled ? (on ? '#FFFFFF' : CREAM) : DIM);
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

        // 一行摘要保留首通收益；Boss 介绍与无记录占位不常驻主页。
        const done = p.cleared[lv]?.[this.diff] === true;
        const col = open && !done ? CREAM : DIM;
        let rewardText = '首通奖励已领取';
        if (!done && this.diff === 'normal') {
            const r = FIRST_CLEAR_NORMAL[lv];
            rewardText = r ? `首通  ${r.coin}铜钱 · ${r.paper}符纸 · ${r.chest}` : '暂无首通奖励';
        } else if (!done) {
            const paper = FIRST_CLEAR_HARD_PAPER[lv];
            rewardText = `奖励  铜钱×2 · 符纸+${paper ?? 0} · 宝箱×2`;
        }
        put(rewardText, POS.reward, 26, col);
        if (open && best !== null) {
            put(`本关最短 ${formatBestTime(best)}`, POS.bestTime, 22, DIM);
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
        const tip = addLabel(layer, '用铜钱加固结界', 24, GOLD);
        tip.enableOutline = true;
        tip.outlineColor = hex('#0C0A08');
        tip.outlineWidth = 2;
        tip.node.setPosition(x - 220 * this.u, y);
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
        const H = Math.min(1040, 220 + levels.length * 200 + 100);
        const panel = modalSurface('panel', W, H, mask, true);
        const tap = (n: Node, cb: () => void) => n.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            e.propagationStopped = true;
            cb();
        });
        const heading = addLabel(panel, '通关记录', 40, GOLD);
        heading.fontFamily = 'serif';
        heading.node.setPosition(0, H / 2 - 50);
        addLabel(panel, '最短通关时间 · 困难首通金印', 24, DIM).node.setPosition(0, H / 2 - 95);

        levels.forEach((lv, i) => {
            const y = H / 2 - 210 - i * 200;
            const card = modalSurface('row', W - 64, 180, panel);
            card.setPosition(0, y);
            addLabel(card, lv.name, 28, GOLD).node.setPosition(-140, 50);
            const nt = formatBestTime(p.bestTimes[i]?.normal ?? null);
            const ht = formatBestTime(p.bestTimes[i]?.hard ?? null);
            addLabel(card, `普通  ${nt}`, 28, CREAM).node.setPosition(-140, 8);
            addLabel(card, `困难  ${ht}`, 28, CREAM).node.setPosition(-140, -32);
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
                sg.strokeColor = hex('#99815A', 140);
                sg.lineWidth = 2;
                sg.roundRect(-22, -56, 44, 112, 4);
                sg.stroke();
                addLabel(seal, '未印', 24, '#B7AE9A').node.setPosition(0, 0);
            }
        });

        const close = modalButton('close', 240, 72, panel);
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
        const panel = modalSurface('panel', 580, 660, mask, true);
        addLabel(panel, '设　置', 40, GOLD).node.setPosition(0, 270);
        addLabel(panel, '声 音 与 存 档', 22, DIM).node.setPosition(0, 222);

        const rows: { name: string; key: 'music' | 'sfx' }[] = [
            { name: '音乐', key: 'music' }, { name: '音效', key: 'sfx' },
        ];
        const redraw = () => this.showSettings(p, onChange, onClear);
        rows.forEach((r, i) => {
            const y = 120 - i * 108;
            addLabel(panel, r.name, 30, CREAM).node.setPosition(-120, y);
            const on = p.settings[r.key];
            const sw = modalButton('switch', 160, 64, panel, on ? 'red' : 'ink');
            sw.setPosition(110, y);
            addLabel(sw, on ? '开' : '关', 26, on ? '#FFFFFF' : DIM);
            sw.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
                e.propagationStopped = true;
                p.settings[r.key] = !p.settings[r.key];
                onChange();
                this.audio?.playSfx('click', 0.6);
                redraw();
            });
        });

        let armed = false;
        const clear = modalButton('clear', 360, 72, panel);
        clear.setPosition(0, -150);
        const clearLabel = addLabel(clear, '清除存档', 26, '#E07A6A');  // 警示保留偏暖红
        clear.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            e.propagationStopped = true;
            if (!armed) {
                armed = true;
                clearLabel.string = '再点一次确认清除';
                return;
            }
            onClear();
        });

        const close = modalButton('close', 240, 72, panel);
        close.setPosition(0, -270);
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
        const panel = modalSurface('panel', W, H, mask, true);
        const redraw = (t = tab) => this.showUpgrade(p, t, onBuy, onClose, guideWall);
        const tap = (n: Node, cb: () => void) => n.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            e.propagationStopped = true;
            cb();
        });

        const heading = addLabel(panel, tab === 'star' ? '符 咒 升 星' : '道 士 养 成', 40, GOLD);
        heading.fontFamily = 'serif';
        heading.node.setPosition(0, H / 2 - 50);
        addLabel(panel, `铜钱 ${formatAmount(p.coin)}　　符纸 ${formatAmount(p.paper)}`, 28, CREAM).node.setPosition(0, H / 2 - 105);

        // 页签
        (['stat', 'star'] as const).forEach((t, i) => {
            const on = t === tab;
            const b = modalButton('tab', 240, 68, panel, on ? 'gold' : 'ink');
            b.setPosition(i === 0 ? -120 : 120, H / 2 - 170);
            addLabel(b, t === 'stat' ? '道　士' : '符　咒', 28, on ? '#FFFFFF' : CREAM);
            const dot = t === 'stat' ? canAffordUpgrade(p) : canAffordStar(p);
            if (dot) rectNode('dot', 16, 16, CINNABAR, b, 8).setPosition(96, 22);
            tap(b, () => {
                this.audio?.playSfx('click', 0.6);
                redraw(t);
            });
        });

        const buyBtn = (parent: Node, cost: number | null, have: number, unit: string, x: number, y: number, w: number, cb: () => void) => {
            const ok = cost !== null && have >= cost;
            const b = modalButton('buy', w, 64, parent, ok ? 'red' : 'ink');
            b.setPosition(x, y);
            addLabel(b, cost === null ? '已满级' : `${unit} ${cost}`, 28, cost === null ? DIM : ok ? '#FFFFFF' : '#7B8798');
            if (cost !== null && !ok) {
                const hint = addLabel(parent, `还差 ${cost - have}${unit}`, 24, '#AD5B4C');
                hint.node.setPosition(x, y - 55);
            }
            if (ok) tap(b, cb);
        };
        const buy = (kind: 'stat' | 'star', id: string) => {
            if (!onBuy(kind, id)) return;
            this.audio?.playSfx('levelup', 0.6);
            redraw();
        };

        const top = H / 2 - 300;
        if (tab === 'stat') {
            const pct = (v: number) => `${Math.round(v * 100)}%`;
            const effect = (id: StatId, lv: number): string => {
                if (id === 'wall') return `${GAME.wallHp + STAT_EFFECT.wallPerLv * lv}`;
                if (id === 'brush') return `+${pct(STAT_EFFECT.brushPerLv * lv)}`;
                if (id === 'spirit') return `+${pct(STAT_EFFECT.spiritPerLv * lv)}`;
                return `+${STAT_EFFECT.altarPerLv * lv}`;
            };
            const effectName: Record<StatId, string> = { wall: '结界', brush: '伤害', spirit: '灵气', altar: '开局选卡' };
            (Object.keys(STAT_UPGRADES) as StatId[]).forEach((id, i) => {
                const y = top - i * 170;
                const card = modalSurface('card', W - 60, 150, panel);
                card.setPosition(0, y);
                const max = STAT_UPGRADES[id].costs.length;
                const lv = p.stats[id];
                const name = addLabel(card, `${STAT_UPGRADES[id].name}  ${lv}/${max}`, 30, GOLD);
                name.node.setPosition(-110, 30);
                const next = `${effectName[id]}  ${effect(id, lv)}${lv < max ? ` → ${effect(id, lv + 1)}` : ''}`;
                const detail = addLabel(card, next, 28, CREAM);
                detail.node.setPosition(-110, -25);
                detail.enableWrapText = false;
                detail.overflow = Label.Overflow.SHRINK;
                detail.node.getComponent(UITransform).setContentSize(370, 40);
                const cost = statCost(p, id);
                buyBtn(card, cost, p.coin, '铜钱', 205, 12, 170, () => buy('stat', id));
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
                    }
                }
            });
        } else {
            TALISMAN_IDS.forEach((id: TalismanId, i) => {
                const x = i % 2 === 0 ? -150 : 150;
                const y = top - 24 - Math.floor(i / 2) * 226;
                const card = modalSurface('card', 280, 216, panel);
                card.setPosition(x, y);
                const st = p.stars[id];
                addLabel(card, TALISMANS[id].name, 30, GOLD).node.setPosition(0, 76);
                addLabel(card, '★'.repeat(st) + '☆'.repeat(STAR_COSTS.length - st), 30, '#FFD66E').node.setPosition(0, 38);
                addLabel(card, `伤害 +${st * 5}%`, 26, CREAM).node.setPosition(0, 2);
                buyBtn(card, starCost(p, id), p.paper, '符纸', 0, -42, 200, () => buy('star', id));
            });
        }

        const close = modalButton('close', 240, 72, panel);
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
