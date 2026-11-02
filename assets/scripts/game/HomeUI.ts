// 主页：像素夜城背景、独立符师与代码绘制的像素控件。
// 视觉见 docs/art/art-bible.md；交互与解锁规则见 docs/gameplay-design.md §4.4。
// 局内旧素材与五行结界不在本次首页改造范围。

import { HEROES, HeroId, heroDef } from '../config/HeroConfig';
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
import { BARRIER_STYLES, BarrierElement } from './BarrierArt';

/** 主页设计坐标：1080×2340（像素夜色底），顶部和底部控件分别贴合安全边距。 */
const IMG = { w: 1080, h: 2340 };
const SRC_K = 1;
const POS = {
    progress: [540, 365], coin: [270, 132], paper: [670, 132], gear: [967, 132],
    title: [540, 275], entries: [[930, 570], [930, 800], [930, 1030]],
    ring: [540, 1745], fight: [540, 2160],
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
    hero?: HeroId;
    onHero?: (id: HeroId) => boolean;
    onFight: (level: number, diff: Difficulty) => void;
    onEntry: (id: 'upgrade' | 'talisman' | 'record') => void;
    onSettings: () => void;
}

export class HomeUI {
    private node: Node | null = null;
    private s = 1;
    private level = 0;
    private diff: Difficulty = 'normal';
    private barrierElement: BarrierElement = 'metal';
    get currentBarrier(): BarrierElement { return this.barrierElement; }
    private toast: Label | null = null;
    private toastT = 0;
    private heroIdle: Node | null = null;
    private heroClock = 0;
    private heroFx: Graphics | null = null;
    private heroFxColor = GOLD;
    private heroFxKind: HeroId = 'taoist';
    private heroFxScale = 1;
    private heroSlide = 0; // 人物轮播切换方向：1 上滑、-1 下滑、0 不播入场
    private talismanGlow: UIOpacity | null = null;
    private heroSparks: { node: Node; opacity: UIOpacity; phase: number; x: number; y: number }[] = [];
    /** 本帧主界面是否画首局养成暖光引导（仅当次 show 生命周期） */
    private metaGuide = false;

    constructor(private root: Node, private audio?: AudioManager) {}

    /** 设计图中 1 像素对应的布局尺寸。 */
    private get u(): number {
        return this.s * SRC_K;
    }

    private at(p: readonly number[]): [number, number] {
        // 底部控件始终贴底，正负高度差均参与；人物舞台单独适配短屏。
        const extra = GAME.height - IMG.h * this.s;
        const dock = p[1] > 1400 ? extra : 0;
        return [(p[0] - IMG.w / 2) * this.s, GAME.height / 2 - p[1] * this.s - dock];
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
        if (hasArt('ui_ref_background')) {
            const cover = Math.max(GAME.width / 941, GAME.height / 2040);
            spriteNode('ui_ref_background', 941 * cover, 2040 * cover, root);
            this.renderReference(p, levels, act);
            return;
        }
        // 插画等比铺满；交互独立于背景，适配长屏时底部控件仍然靠下。
        const cover = Math.max(GAME.width / IMG.w, GAME.height / (IMG.w * 1846 / 852));
        spriteNode('ui_home_bg', IMG.w * cover, IMG.w * (1846 / 852) * cover, root);
        // 符师独立层，短屏随可用舞台等比收小，完整脚底始终在关卡牌上方。
        const stageTop = GAME.height / 2 - 450 * this.u;
        const stageBottom = this.at([540, 1550])[1] + 16;
        const heroH = Math.min(1040 * this.u, stageTop - stageBottom);
        const heroW = heroH * 1024 / 1536;
        const hero = spriteNode('ui_home_hero', heroW, heroH, root);
        if (hero) {
            // 脚底是缩放支点，呼吸时不浮离石台，也不旋转整张立绘。
            hero.getComponent(UITransform).setAnchorPoint(0.5, 0.04);
            hero.setPosition(-72 * this.u, stageBottom + heroH * 0.04);
            this.heroIdle = hero;
            const glow = makeNode('homeTalismanGlow', hero);
            glow.setPosition(heroW * 0.37, heroH * 0.70);
            const gg = glow.addComponent(Graphics);
            gg.fillColor = hex('#FFB849', 55);
            gg.rect(-12*this.u, -28*this.u, 24*this.u, 56*this.u); gg.fill();
            gg.fillColor = hex('#FFE7A6', 110);
            gg.rect(-5*this.u, -20*this.u, 10*this.u, 40*this.u); gg.fill();
            this.talismanGlow = glow.addComponent(UIOpacity);
            // 仅五粒方形金光，限定在符纸附近，避免遮住侧栏。
            for (let i = 0; i < 5; i++) {
                const size = (i % 2 === 0 ? 4 : 3) * this.u;
                const spark = rectNode('homeTalismanSpark', size, size, i%2 ? '#FFE7A6' : '#F4B41B', hero);
                this.heroSparks.push({ node: spark, opacity: spark.addComponent(UIOpacity),
                    phase: i / 5, x: heroW * (0.30 + (i % 3) * 0.035), y: heroH * 0.66 });
            }
        }
        // 上下柔暗遮罩承托文字；中段保持原插画亮度。
        for (let i = 0; i < 16; i++) {
            const top = rectNode('headerShade', GAME.width, 18, INDIGO, root, 0, Math.round(170 * (1 - i / 16)));
            top.setPosition(0, GAME.height / 2 - 9 - i * 18);
            const bottom = rectNode('footerShade', GAME.width, 28, '#0E1018', root, 0, Math.round(210 * (1 - i / 16)));
            bottom.setPosition(0, -GAME.height / 2 + 14 + i * 28);
        }
        this.render(p, levels, act);
    }

    hide(): void {
        this.node?.destroy();
        this.node = null;
        this.heroIdle = null;
        this.heroFx = null;
        this.talismanGlow = null;
        this.heroSparks = [];
        this.heroClock = 0;
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
        if (this.heroIdle) {
            // 切关只重画 dyn，因此同一首页会话中的待机相位不会重置。
            this.heroClock = (this.heroClock + Math.min(dt, 0.1)) % 50.4;
            const breath = (1 - Math.cos(this.heroClock * Math.PI * 2 / 3.6)) / 2;
            this.heroIdle.setScale(1 - breath * 0.002, 1 + breath * 0.008, 1);
            if (this.talismanGlow) {
                this.talismanGlow.opacity = Math.round(95 + 115 * (1 + Math.sin(this.heroClock * Math.PI * 2 / 2.4)) / 2);
            }
            for (const spark of this.heroSparks) {
                const t = (this.heroClock / 2.8 + spark.phase) % 1;
                spark.node.setPosition(spark.x + Math.round(Math.sin(t * Math.PI * 2 + spark.phase * 6) * 5 * this.u),
                    spark.y + Math.round(t * 70 * this.u));
                spark.opacity.opacity = Math.round(Math.sin(t * Math.PI) * 210);
            }
        }
        if (this.heroFx) {
            const g = this.heroFx, u = this.heroFxScale, t = this.heroClock;
            g.clear();
            g.strokeColor = hex(this.heroFxColor, 80); g.lineWidth = 2*u;
            g.ellipse(0, -275*u, 155*u, 30*u); g.stroke();
            for (let i=0;i<16;i++) {
                const phase=(t*0.16+i/16)%1, angle=t*0.8+i*2.399;
                const x=Math.cos(angle)*(95+35*Math.sin(i))*u;
                const y=(-260+phase*570)*u;
                g.fillColor=hex(this.heroFxColor,Math.round(Math.sin(phase*Math.PI)*160));
                if (this.heroFxKind==='medium') { g.circle(x,y,(2+i%3)*u); g.fill(); }
                else if (this.heroFxKind==='sword') { g.rect(x,y,2*u,(5+i%4)*u); g.fill(); }
                else { g.rect(x,y,(3+i%3)*u,(3+i%4)*u); g.fill(); }
            }
            if(this.heroFxKind==='medium') {
                g.strokeColor=hex(this.heroFxColor,100);g.lineWidth=2*u;
                g.ellipse(0,-270*u,(100+Math.sin(t*2)*20)*u,20*u);g.stroke();
            }
        }
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

    /** 仅重建控件，背景与符师独立保留。 */
    private render(p: Profile, levels: LevelDef[], act: HomeActions): void {
        if (hasArt('ui_ref_background')) {
            this.renderReference(p, levels, act);
            return;
        }
        const root = this.node;
        root.getChildByName('dyn')?.destroy();
        const dyn = makeNode('dyn', root, GAME.width, GAME.height);
        const put = (text: string, pos: readonly number[], size: number, color = CREAM): Label => {
            const l = addLabel(dyn, text, size * this.u, color);
            l.node.setPosition(...this.at(pos));
            l.enableOutline = true; l.outlineColor = hex('#10111D'); l.outlineWidth = 2 * this.u;
            return l;
        };
        const frame = (name: string, pos: readonly number[], w: number, h: number, fill = '#20263D', edge = '#AC8A47'): Node => {
            const n = makeNode(name, dyn, w * this.u, h * this.u);
            n.setPosition(...this.at(pos));
            const g = n.addComponent(Graphics), u = this.u;
            g.fillColor = hex('#080D1D', 210); g.rect(-w*u/2, -h*u/2-8*u, w*u, h*u); g.fill();
            g.fillColor = hex(fill, 245); g.rect(-w*u/2+5*u, -h*u/2, (w-10)*u, h*u); g.fill();
            g.rect(-w*u/2, (-h/2+5)*u, w*u, (h-10)*u); g.fill();
            g.strokeColor = hex(edge); g.lineWidth = 3*u;
            g.rect((-w/2+6)*u, (-h/2+6)*u, (w-12)*u, (h-12)*u); g.stroke();
            g.strokeColor = hex('#FFFFFF', 20); g.lineWidth = 2*u;
            g.moveTo((-w/2+12)*u, (h/2-12)*u); g.lineTo((w/2-12)*u, (h/2-12)*u); g.stroke();
            return n;
        };
        const hit = (name: string, pos: readonly number[], w: number, h: number, cb: () => void): Node => {
            const n = makeNode(name, dyn, Math.max(w*this.u, 96), Math.max(h*this.u, 96));
            n.setPosition(...this.at(pos));
            n.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
                e.propagationStopped = true; this.audio?.playSfx('click', 0.6); cb();
            });
            return n;
        };
        // 真实功能图标：整数方格绘制，保持像素硬边，不用单字替代图标。
        const glyphs: Record<string, string[]> = {
            coin: ['..#####..','.#######.','###...###','###...###','###...###','.#######.','..#####..'],
            paper: ['.######..','.######..','.##..##..','.######..','.##..##..','.######..','.######..','..####...'],
            upgrade: ['.......####.','......######','.....######.','....######..','.....####...','....###.....','...###......','..###.......','.###........','..#.........'],
            talisman: ['.#######.','.##...##.','.#######.','.###.###.','.##...##.','.#######.','.###.###.','..#####..'],
            record: ['.######..','##....##.','##.##.##.','##....##.','##.##.##.','##....##.','########.','..######.'],
            gear: ['...###...','.#.###.#.','.#######.','###...###','###...###','###...###','.#######.','.#.###.#.','...###...'],
            lock: ['..#####..','.##...##.','.##...##.','#########','#########','####.####','####.####','#########'],
            left: ['....##...','...##....','..##.....','.##......','..##.....','...##....','....##...'],
            right: ['...##....','....##...','.....##..','......##.','.....##..','....##...','...##....'],
        };
        const icon = (id: string, pos: readonly number[], cell = 7, color = GOLD) => {
            const n = makeNode('icon-'+id, dyn); n.setPosition(...this.at(pos));
            const g = n.addComponent(Graphics), rows = glyphs[id];
            g.fillColor = hex(color);
            rows.forEach((row, y) => [...row].forEach((c, x) => {
                if (c === '#') g.rect((x-row.length/2)*cell*this.u, (rows.length/2-y-1)*cell*this.u, cell*this.u, cell*this.u);
            })); g.fill();
        };
        const illustratedIcon = (id: string, pos: readonly number[]) => {
            const patterns: Record<string, string[]> = {
                upgrade: [
                    '..........ooo...', '.........owwo...', '........owwwo...', '.......owwwo....',
                    '......owwwo.....', '......owwo......', '.....orrro......', '....orggo.......',
                    '....oggo........', '...oggo.........', '..oggo..........', '..ogho..........',
                    '.ohho...........', '.oho............', '.oo.............', '................',
                ],
                talisman: [
                    '...oooooooooo...', '...ohhhhhhhho...', '...owwwwwwWho...', '...owwrrwwWho...',
                    '...owrrrwwWho...', '...owwrrwwWho...', '...owrrrrwWho...', '...owwrrwwWho...',
                    '...owrrrwwWho...', '...owwrrwwWho...', '...owwwwwwWho...', '...owrrrwwWho...',
                    '...owwrrwwWho...', '...owwwwwwWho...', '....ohhhhooo....', '.....oooo.......',
                ],
                record: [
                    '..oooo....oooo..', '.ohhhhoooohhhho.', '.owwwhwwwWhwwwo.', '.owwwhwwwWhwwwo.',
                    '.owgghgggWhggwo.', '.owwwhwwwWhwwwo.', '.owgghgggWhggwo.', '.owwwhwwwWhwwwo.',
                    '.owgghgggWhggwo.', '.owwwhwwwWhwwwo.', '.owwwhwwwWhwwwo.', '.ohhhhrrrhhhho..',
                    '..oooorrrroooo..', '......orrro.....', '......oooo......', '................',
                ],
                chest: [
                    '................', '................', '...oooooooooo...', '..ohhhhhhhhhho..',
                    '.ohWWWWWWWWWWho.', '.ohWWWWWWWWWWho.', '.ohhhhhhhhhhho..', '.ogggghhhggggo..',
                    '.ogggghwhggggo..', '.ogggghhhggggo..', '.ogggggggggggo..', '.ohhhhhhhhhhho..',
                    '..oooooooooo....', '................', '................', '................',
                ],
            };
            const palette: Record<string, string> = {
                o: '#101423', h: '#B28748', w: '#EAD8A5', W: '#FFF0C2',
                r: '#B64343', g: '#617F86',
            };
            const node = makeNode('illustratedIcon-' + id, dyn);
            node.setPosition(...this.at(pos));
            const graphics = node.addComponent(Graphics);
            const cell = (id === 'chest' ? 5 : 8) * this.u;
            patterns[id].forEach((row, rowIndex) => [...row].forEach((pixel, column) => {
                if (!palette[pixel]) return;
                graphics.fillColor = hex(palette[pixel]);
                graphics.rect((column - 8) * cell, (7 - rowIndex) * cell, cell, cell);
                graphics.fill();
            }));
        };
        frame('coinPanel', POS.coin, 370, 100);
        frame('paperPanel', POS.paper, 370, 100);
        frame('settingsPanel', POS.gear, 110, 100);
        icon('coin', [135,132], 7); icon('paper', [535,132], 7); icon('gear', POS.gear, 7);
        put(formatAmount(p.coin), [300,132], 44, '#FFFFFF');
        put(formatAmount(p.paper), [700,132], 44, '#FFFFFF');
        hit('settingsHit', POS.gear, 120, 120, act.onSettings);
        const title = put('符镇百妖', POS.title, 98, '#F3D394');
        title.fontFamily = 'serif'; title.isBold = true;
        put(`已通 ${p.cleared.filter(c => c.normal).length} / ${levels.length}`, POS.progress, 34, '#B4BED0');
        const entries: {id: 'upgrade'|'talisman'|'record'; name: string; dot: boolean}[] = [
            {id:'upgrade',name:'养成',dot:canAffordUpgrade(p)},
            {id:'talisman',name:'符咒',dot:canAffordStar(p)},
            {id:'record',name:'记录',dot:false},
        ];
        entries.forEach((e,i) => {
            const pos = POS.entries[i];
            frame('entry-'+e.id, pos, 160, 146, '#20283A', '#8E7957');
            illustratedIcon(e.id, [pos[0],pos[1]-7]);
            put(e.name, [pos[0],pos[1]+105], 38);
            hit('entryHit-'+e.id, [pos[0],pos[1]+20], 190, 190, () => act.onEntry(e.id));
            if (e.dot) {
                const dot = rectNode('availableUpgrade', 18*this.u, 18*this.u, CINNABAR, dyn);
                const [x,y]=this.at(pos); dot.setPosition(x+65*this.u,y+60*this.u);
            }
        });
        const lv = this.level, open = lv < p.unlockedLevels;
        const playable = canPlay(p,lv,this.diff), hardOpen = open && p.cleared[lv]?.normal === true;
        const maxLv = maxBrowsableLevel(p,levels.length);
        const redraw = () => this.render(p,levels,act);
        frame('levelPanel',POS.ring,920,280,'#171E30',this.diff==='hard'?CINNABAR:'#8E7957');
        const name = put(levels[lv].name,[540,1650],52,open?CREAM:DIM);
        name.isBold=true; name.enableWrapText=false; name.overflow=Label.Overflow.SHRINK;
        if (p.cleared[lv]?.hard) put('印', [800,1650], 30, GOLD);
        name.node.getComponent(UITransform).setContentSize(600*this.u,65*this.u);
        for (const delta of [-1,1]) {
            const enabled = delta<0?lv>0:lv<maxLv;
            const pos=[delta<0?150:930,1650];
            icon(delta<0?'left':'right',pos,7,enabled?GOLD:'#50596C');
            hit('levelArrow'+delta,pos,130,120,()=>{
                if (!enabled) return;
                this.level+=delta;
                if (!canPlay(p,this.level,this.diff)) this.diff='normal';
                redraw();
            });
        }
        for (const [i,d] of (['normal','hard'] as const).entries()) {
            const enabled=d==='normal'?open:hardOpen;
            const selected=this.diff===d;
            const pos=[i===0?390:690,1765];
            frame('difficulty-'+d,pos,260,76,selected&&enabled?'#862B32':'#242D43',selected&&enabled?'#E6B868':'#4E5970');
            put((d==='normal'?'普通':'困难')+(enabled?'':' · 锁'),pos,34,enabled?CREAM:DIM);
            hit('difficultyHit-'+d,pos,260,96,()=>{
                if (!enabled) {this.showToast(open?'普通难度通关后解锁困难':'通关上一关后解锁');return;}
                this.diff=d;redraw();
            });
        }
        const done=p.cleared[lv]?.[this.diff]===true;
        const reward=FIRST_CLEAR_NORMAL[lv];
        const rewardText=!open?'通关上一关后解锁':done?'首通奖励已领取':this.diff==='normal'
            ?(reward?'':'暂无首通奖励')
            :`首通 铜钱×2 · 符纸+${FIRST_CLEAR_HARD_PAPER[lv]??0} · 宝箱×2`;
        if (open && !done && this.diff === 'normal' && reward) {
            put('首通', [190,1845], 29, DIM);
            icon('coin', [303,1845], 5);
            put(String(reward.coin), [392,1845], 33);
            icon('paper', [508,1845], 5);
            put(String(reward.paper), [579,1845], 33);
            illustratedIcon('chest', [696,1845]);
            put(reward.chest, [798,1845], 31, '#D6BB7E');
        } else {
            put(rewardText,[540,1845],32,open? '#BDC5D2':DIM);
        }
        const best=p.bestTimes[lv]?.[this.diff]??null;
        if(open&&best!==null) put(`最短 ${formatBestTime(best)}`,[540,1585],26,DIM);
        put('结界', [165,1970], 32, DIM);
        (Object.keys(BARRIER_STYLES) as BarrierElement[]).forEach((el,i) => {
            const style=BARRIER_STYLES[el], pos=[320+i*144,1970];
            const chosen=this.barrierElement===el;
            frame('barrier-'+el,pos,128,100,chosen?'#36405A':'#1B2237',chosen?style.color:'#4E5970');
            put(style.name,pos,38,chosen?style.light:DIM);
            hit('barrierHit-'+el,pos,128,100,()=>{this.barrierElement=el;redraw();});
        });
        const fightPanel = frame('fightPanel',POS.fight,920,170,playable?'#8E2E38':'#303748',playable?'#D9AD69':'#596278');
        const decoration = fightPanel.getComponent(Graphics);
        const unit = this.u;
        decoration.fillColor = hex(playable ? '#C45A4C' : '#596278', 180);
        decoration.rect(-438*unit, 61*unit, 876*unit, 6*unit); decoration.fill();
        decoration.fillColor = hex('#361B2A', 145);
        decoration.rect(-438*unit, -67*unit, 876*unit, 10*unit); decoration.fill();
        for (const side of [-1, 1]) {
            decoration.fillColor = hex(playable ? '#E4BE7D' : DIM);
            for (const [offset, width] of [[0, 12], [12, 24], [24, 36], [36, 24], [48, 12]]) {
                decoration.rect((side * 365 - width / 2)*unit, (24-offset)*unit, width*unit, 6*unit);
            }
            decoration.fill();
            decoration.fillColor = hex('#F0C88E', 35);
            for (let step = 0; step < 7; step++) {
                decoration.rect((side * (190 + step*22))*unit, (step%2 ? 30 : -28)*unit, 7*unit, 7*unit);
            }
            decoration.fill();
        }
        const fight=put(playable?'出 战':'尚 未 解 锁',POS.fight,62,playable?'#FFF0D4':DIM);
        fight.isBold=true; fight.fontFamily='serif';
        if(!playable) icon('lock',[240,POS.fight[1]],6,DIM);
        const fightHit = hit('fightHit',POS.fight,920,180,()=>{
            if(playable)act.onFight(lv,this.diff);else this.showToast('通关上一关后解锁');
        });
        const fightPosition = this.at(POS.fight);
        const pressFight = (pressed: boolean) => {
            fightPanel.setPosition(fightPosition[0], fightPosition[1] - (pressed ? 5*unit : 0));
            fight.node.setPosition(fightPosition[0], fightPosition[1] - (pressed ? 5*unit : 0));
            setOpacity(fightPanel, pressed ? 210 : 255);
        };
        fightHit.on(Node.EventType.TOUCH_START, () => pressFight(true));
        fightHit.on(Node.EventType.TOUCH_CANCEL, () => pressFight(false));
        fightHit.on(Node.EventType.TOUCH_END, () => pressFight(false));
        if(this.metaGuide)this.paintMetaGuide();
    }

    private renderReference(profile: Profile, levels: LevelDef[], actions: HomeActions): void {
        this.node.getChildByName('dyn')?.destroy();
        const layer = makeNode('dyn', this.node, GAME.width, GAME.height);
        const scale = Math.min(GAME.width / 941, GAME.height / 1672);
        // 9:16 原稿控件独立锚定；长屏增加的高度由背景延展承接。
        const extra = Math.max(0, GAME.height - 1672 * scale);
        const position = (x: number, y: number): [number, number] => [
            (x-470.5)*scale,
            (836-y)*scale + (y < 150 ? extra/2 : y > 1270 ? -extra/2 : 0),
        ];
        const label = (text: string, x: number, y: number, size: number, color = CREAM) => {
            const textLabel = addLabel(layer, text, size*scale, color);
            textLabel.node.setPosition(...position(x,y));
            textLabel.fontFamily = 'serif';
            textLabel.isBold = true;
            textLabel.enableOutline = true;
            textLabel.outlineColor = hex('#090D17');
            textLabel.outlineWidth = 3*scale;
            return textLabel;
        };
        const image = (key: string, bounds: number[]) => {
            const [left,top,right,bottom] = bounds;
            const node = spriteNode(key,(right-left)*scale,(bottom-top)*scale,layer);
            node?.setPosition(...position((left+right)/2,(top+bottom)/2));
            return node;
        };
        const touch = (name: string, bounds: number[], callback: () => void) => {
            const [left,top,right,bottom] = bounds;
            const node = makeNode(name,layer,Math.max((right-left)*scale,80),Math.max((bottom-top)*scale,80));
            node.setPosition(...position((left+right)/2,(top+bottom)/2));
            node.on(Node.EventType.TOUCH_END,(event: EventTouch) => {
                event.propagationStopped=true;
                this.audio?.playSfx('click',0.6);
                callback();
            });
            return node;
        };
        // 可替换立绘与属性粒子分层；人物比例保持统一。
        const selected = heroDef(actions.hero ?? 'taoist');
        const portrait=image(selected.portrait,[120,470,820,1170]); // 立绘居中
        this.heroIdle=portrait;this.heroClock=0;
        const fx=makeNode('heroElementFX',layer);fx.setPosition(...position(470,790));
        this.heroFx=fx.addComponent(Graphics);this.heroFxColor=selected.color;
        this.heroFxKind=selected.id;this.heroFxScale=scale;
        // 人物介绍：深色底牌 + 属性色描边，名字放大，专精与法器分两段
        const plate=rectNode('heroIntroPlate',520*scale,112*scale,'#0B1020',layer,10*scale,215);
        plate.setPosition(...position(470,1150));
        const edge=plate.getComponent(Graphics);edge.lineWidth=2*scale;edge.strokeColor=hex(selected.color,200);
        edge.roundRect(-260*scale,-56*scale,520*scale,112*scale,10*scale);edge.stroke();
        label(selected.name,470,1125,44,selected.color);
        label(selected.affinity+'  ·  '+selected.weapon,470,1178,27,CREAM);
        // 人物轮播：在立绘上上下滑动切换（上滑下一位、下滑上一位），左侧竖排圆点指示当前位置
        const order=HEROES.findIndex((hero)=>hero.id===selected.id);
        const choose=(index: number, direction: number) => {
            const hero=HEROES[(index+HEROES.length)%HEROES.length];
            if(hero.id===selected.id)return;
            if(!actions.onHero?.(hero.id)){this.showToast('人物选择保存失败，请重试');return;}
            actions.hero=hero.id;this.heroSlide=direction;
            this.audio?.playSfx('click',0.6);
            this.renderReference(profile,levels,actions);
        };
        if(portrait&&this.heroSlide){
            // 新立绘从滑动方向进入并淡入
            const [px,py]=[portrait.position.x,portrait.position.y];
            portrait.setPosition(px,py-this.heroSlide*140*scale);
            const fade=portrait.addComponent(UIOpacity);fade.opacity=0;
            tween(portrait).to(0.22,{position:portrait.position.clone().set(px,py)},{easing:'cubicOut'}).start();
            tween(fade).to(0.18,{opacity:255}).start();
            this.heroSlide=0;
        }
        const swipe=makeNode('heroSwipe',layer,640*scale,640*scale);
        swipe.setPosition(...position(470,800));
        let startY=0;
        swipe.on(Node.EventType.TOUCH_START,(event: EventTouch)=>{startY=event.getUILocation().y;});
        swipe.on(Node.EventType.TOUCH_END,(event: EventTouch)=>{
            const dy=event.getUILocation().y-startY;
            if(Math.abs(dy)<40*scale)return;
            event.propagationStopped=true;
            choose(order+(dy>0?1:-1),dy>0?1:-1);
        });
        const dotX=48, dotTop=700, gap=56;
        HEROES.forEach((hero,index)=>{
            const chosen=index===order, size=(chosen?26:16)*scale;
            const dot=rectNode('heroDot-'+hero.id,size,size,chosen?hero.color:'#8A93AD',layer,size/2,chosen?255:210);
            const ring=dot.getComponent(Graphics);ring.lineWidth=2*scale;ring.strokeColor=hex('#0B1020');
            ring.circle(0,0,size/2);ring.stroke();
            dot.setPosition(...position(dotX,dotTop+index*gap));
            touch('heroDotHit-'+hero.id,[dotX-30,dotTop+index*gap-28,dotX+30,dotTop+index*gap+28],()=>choose(index,index>order?1:-1));
        });
        // 上下切换箭头：金色三角加深色圆底，可直接点击
        for (const direction of [-1,1]) {
            const y=direction<0?dotTop-70:dotTop+(HEROES.length-1)*gap+70, r=30*scale;
            const btn=makeNode('heroArrow'+direction,layer,r*2,r*2);
            btn.setPosition(...position(dotX,y));
            const g=btn.addComponent(Graphics);
            g.fillColor=hex('#0B1020',200);g.circle(0,0,r);g.fill();
            g.strokeColor=hex(GOLD,180);g.lineWidth=2*scale;g.circle(0,0,r);g.stroke();
            const t=13*scale, d=direction<0?1:-1; // 屏幕坐标里上为正
            g.fillColor=hex(GOLD);g.moveTo(-t,-d*t*0.55);g.lineTo(t,-d*t*0.55);g.lineTo(0,d*t*0.75);g.close();g.fill();
            touch('heroArrowHit'+direction,[dotX-40,y-40,dotX+40,y+40],()=>choose(order+(direction<0?-1:1),direction<0?-1:1));
        }
        image('ui_ref_coin',[197,32,452,106]);
        image('ui_ref_paper',[490,27,750,110]);
        image('ui_ref_gear',[811,28,905,116]);
        label(formatAmount(profile.coin),351,69,36);
        label(formatAmount(profile.paper),651,69,36);
        touch('referenceSettings',[811,28,905,116],actions.onSettings);
        const entries: {id:'upgrade'|'talisman'|'record'; top:number}[] = [
            {id:'upgrade',top:381}, {id:'talisman',top:580}, {id:'record',top:780},
        ];
        for (const entry of entries) {
            const bounds=[762,entry.top,901,entry.top+180];
            image('ui_ref_'+entry.id,bounds);
            touch('referenceEntry-'+entry.id,bounds,()=>actions.onEntry(entry.id));
        }
        image('ui_ref_level',[215,1278,721,1447]);
        // 关卡缩略图很花：在标题和难度两行后面各垫一条半透明深色带，文字放大
        for (const [y,h] of [[1322,58],[1416,40]]) {
            const band=rectNode('levelTextBand',470*scale,h*scale,'#070A14',layer,6*scale,185);
            band.setPosition(...position(468,y));
        }
        label(levels[this.level].name,468,1320,40,'#FFF0D4');
        const maximum = maxBrowsableLevel(profile,levels.length);
        for (const direction of [-1,1]) {
            const bounds=direction<0?[135,1310,219,1431]:[715,1310,801,1431];
            const arrow=image(direction<0?'ui_ref_left':'ui_ref_right',bounds);
            const enabled=direction<0?this.level>0:this.level<maximum;
            if (arrow) setOpacity(arrow,enabled?255:95);
            touch('referenceLevel'+direction,bounds,()=>{
                if (!enabled) return;
                this.level+=direction;
                if (!canPlay(profile,this.level,this.diff)) this.diff='normal';
                this.renderReference(profile,levels,actions);
            });
        }
        label(this.diff==='normal'?'普通':'困难',386,1417,28,this.diff==='normal'?CREAM:GOLD);
        label(profile.cleared[this.level]?.normal?'已通关':'未通关',552,1417,26,profile.cleared[this.level]?.normal?GOLD:CREAM);
        touch('referenceDifficulty',[320,1390,450,1445],()=>{
            if (!profile.cleared[this.level]?.normal) {
                this.showToast('普通难度通关后解锁困难');
                return;
            }
            this.diff=this.diff==='normal'?'hard':'normal';
            this.renderReference(profile,levels,actions);
        });
        const fight=image('ui_ref_fight',[227,1452,673,1603]);
        const playable=canPlay(profile,this.level,this.diff);
        if (fight) setOpacity(fight,playable?255:110);
        const fightTouch=touch('referenceFight',[227,1452,673,1603],()=>{
            if (playable) actions.onFight(this.level,this.diff);
            else this.showToast('通关上一关后解锁');
        });
        fightTouch.on(Node.EventType.TOUCH_START,()=>{ if(fight)setOpacity(fight,190); });
        fightTouch.on(Node.EventType.TOUCH_CANCEL,()=>{ if(fight)setOpacity(fight,playable?255:110); });
        label('结界外观',190,1635,18,DIM);
        (Object.keys(BARRIER_STYLES) as BarrierElement[]).forEach((element,index)=>{
            const x=305+index*115;
            const chosen=this.barrierElement===element;
            label((chosen?'◆ ':'')+BARRIER_STYLES[element].name,x,1635,22,chosen?GOLD:DIM);
            touch('referenceBarrier-'+element,[x-50,1610,x+50,1660],()=>{
                this.barrierElement=element;
                this.renderReference(profile,levels,actions);
            });
        });
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
