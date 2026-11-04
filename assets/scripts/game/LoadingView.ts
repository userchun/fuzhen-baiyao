import { Node, Graphics, Label, Sprite, SpriteFrame, Texture2D, UIOpacity, UITransform, resources, sys } from 'cc';
import { HERO_SELECTION_KEY, heroId, heroDef } from '../config/HeroConfig';
import { makeNode, addLabel, hex, rectNode } from '../core/Draw';
import { GAME } from '../config/GameConfig';

/**
 * 首次加载页：先单独载入主页夜景图铺底（压暗），标题“符镇百妖”轻微呼吸，
 * 下方是金边进度条 + 百分比 + 轮播小贴士；底图到之前先显示纯色和文字，不会空屏。
 */
const BG_W = 852, BG_H = 1846;
const BAR_W = 420, BAR_H = 14;
const TIPS = [
    '金克木、木克土、土克水、水克火、火克金',
    '属性克制伤害 ×1.5，被克只有 ×0.7',
    '结界碎了就守不住了，别让妖怪在墙下久留',
    '五行相生：金→水→木→火→土→金',
];
const TIP_TIME = 2.6;
const HERO_SIZE = 560;     // 立绘 1024² 透明底，脚底约在自下 11% 处
const HERO_FEET = 0.11;

export class LoadingView {
    private root: Node;
    private bgOpacity: UIOpacity | null = null;
    private heroSlot: Node;
    private hero: Node | null = null;
    private heroOpacity: UIOpacity | null = null;
    private title: Label;
    private sub: Label;
    private percent: Label;
    private tip: Label;
    private tipOpacity: UIOpacity;
    private bar: Graphics;
    private t = 0;
    private progress = 0;
    private shown = 0;
    private tipIndex = 0;

    constructor(parent: Node) {
        this.root = makeNode('loading', parent, GAME.width, GAME.height);
        rectNode('loadingBase', GAME.width, GAME.height, '#0E1020', this.root);
        this.heroSlot = makeNode('loadingHero', this.root);
        this.heroSlot.setPosition(0, -GAME.height / 2 + 400);
        this.loadBackdrop();
        this.loadHero();

        this.title = addLabel(this.root, '符镇百妖', 96, '#F2D28A');
        this.title.enableOutline = true;
        this.title.outlineColor = hex('#3A1E0A');
        this.title.outlineWidth = 5;
        this.title.node.setPosition(0, GAME.height / 2 - 330);
        this.sub = addLabel(this.root, '百 鬼 夜 行 · 一 符 镇 之', 24, '#C8B890');
        this.sub.node.setPosition(0, GAME.height / 2 - 420);

        const baseY = -GAME.height / 2 + 300;
        this.bar = makeNode('loadingBar', this.root).addComponent(Graphics);
        this.bar.node.setPosition(0, baseY);
        this.percent = addLabel(this.root, '', 26, '#F2D28A');
        this.percent.node.setPosition(0, baseY + 42);
        this.tip = addLabel(this.root, TIPS[0], 22, '#A9A3C0');
        this.tip.node.setPosition(0, baseY - 50);
        this.tipOpacity = this.tip.node.addComponent(UIOpacity);
        this.update(0);
    }

    /** 主页夜景图很快就能到，单独先载，压暗后作底 */
    private loadBackdrop(): void {
        resources.load('textures/ui_home_bg/texture', Texture2D, (err, tex) => {
            if (err || !tex || !this.root.isValid) return;
            const sf = new SpriteFrame();
            sf.texture = tex;
            const cover = Math.max(GAME.width / BG_W, GAME.height / BG_H);
            const n = makeNode('loadingBg', this.root, BG_W * cover, BG_H * cover);
            n.setSiblingIndex(1);
            const sp = n.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.spriteFrame = sf;
            this.bgOpacity = n.addComponent(UIOpacity);
            this.bgOpacity.opacity = 0;
            // 压暗：整体一层 + 底部渐深，文字更清楚
            const dim = rectNode('loadingDim', GAME.width, GAME.height, '#0A0C18', this.root, 0, 120);
            dim.setSiblingIndex(2);
            for (let i = 0; i < 14; i++) {
                const s = rectNode('loadingShade', GAME.width, 40, '#0A0C18', this.root, 0, Math.round(200 * (1 - i / 14)));
                s.setPosition(0, -GAME.height / 2 + 20 + i * 40);
                s.setSiblingIndex(3);
            }
        });
    }

    /** 当前选中角色的主页立绘，站在村口路上 */
    private loadHero(): void {
        let id = heroId(undefined);
        try { id = heroId(sys.localStorage.getItem(HERO_SELECTION_KEY)); } catch { /* 读不到存档就用默认角色 */ }
        resources.load(`textures/${heroDef(id).portrait}/texture`, Texture2D, (err, tex) => {
            if (err || !tex || !this.heroSlot.isValid) return;
            const sf = new SpriteFrame();
            sf.texture = tex;
            const n = makeNode('heroArt', this.heroSlot, HERO_SIZE, HERO_SIZE);
            n.getComponent(UITransform)!.setAnchorPoint(0.5, HERO_FEET);
            const sp = n.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.spriteFrame = sf;
            this.heroOpacity = n.addComponent(UIOpacity);
            this.heroOpacity.opacity = 0;
            this.hero = n;
        });
    }

    setProgress(p: number): void {
        this.progress = Math.max(this.progress, Math.min(1, p));
    }

    destroy(): void {
        if (this.root.isValid) this.root.destroy();
    }

    update(dt: number): void {
        if (!this.root.isValid) return;
        this.t += dt;
        if (this.bgOpacity && this.bgOpacity.opacity < 255) {
            this.bgOpacity.opacity = Math.min(255, this.bgOpacity.opacity + dt * 600);
        }
        // 人物淡入 + 以脚底为支点轻微呼吸
        if (this.hero && this.heroOpacity) {
            if (this.heroOpacity.opacity < 255) this.heroOpacity.opacity = Math.min(255, this.heroOpacity.opacity + dt * 500);
            this.hero.setScale(1, 1 + 0.012 * Math.sin(this.t * 2.4), 1);
        }
        // 标题轻微呼吸
        const s = 1 + 0.02 * Math.sin(this.t * 2);
        this.title.node.setScale(s, s, 1);
        // 小贴士轮播，切换时淡出淡入
        const phase = this.t % TIP_TIME;
        const idx = Math.floor(this.t / TIP_TIME) % TIPS.length;
        if (idx !== this.tipIndex) {
            this.tipIndex = idx;
            this.tip.string = TIPS[idx];
        }
        const fade = Math.min(1, phase / 0.3, (TIP_TIME - phase) / 0.3);
        this.tipOpacity.opacity = Math.round(255 * fade);

        this.shown += (this.progress - this.shown) * Math.min(1, dt * 6);
        this.percent.string = `符纸铺展中  ${Math.round(this.shown * 100)}%`;
        this.drawBar();
    }

    private drawBar(): void {
        const g = this.bar;
        g.clear();
        const x0 = -BAR_W / 2, y0 = -BAR_H / 2;
        // 底槽 + 金边
        g.fillColor = hex('#14121E', 230);
        g.roundRect(x0 - 4, y0 - 4, BAR_W + 8, BAR_H + 8, 9);
        g.fill();
        g.lineWidth = 2;
        g.strokeColor = hex('#8A6A2E');
        g.roundRect(x0 - 4, y0 - 4, BAR_W + 8, BAR_H + 8, 9);
        g.stroke();
        const w = BAR_W * this.shown;
        if (w < 2) return;
        // 填充：暗金 + 上半高光
        g.fillColor = hex('#B8862E');
        g.roundRect(x0, y0, w, BAR_H, 6);
        g.fill();
        g.fillColor = hex('#F2D28A', 170);
        g.roundRect(x0 + 2, 0, Math.max(0, w - 4), BAR_H / 2 - 2, 3);
        g.fill();
        // 流光：一道亮斑沿已填充部分扫过
        const sweep = ((this.t * 0.6) % 1) * w;
        g.fillColor = hex('#FFF1C4', 120);
        g.rect(x0 + Math.max(0, sweep - 18), y0 + 2, Math.min(18, sweep), BAR_H - 4);
        g.fill();
        // 进度头的火光
        const glow = 0.6 + 0.4 * Math.sin(this.t * 8);
        g.fillColor = hex('#FFB849', Math.round(90 * glow));
        g.circle(x0 + w, 0, 14);
        g.fill();
        g.fillColor = hex('#FFE7A6');
        g.circle(x0 + w, 0, 5);
        g.fill();
    }
}
