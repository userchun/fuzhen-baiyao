import { Node, Graphics, Label, EventTouch, UITransform, Sprite } from 'cc';
import { GAME, TALISMANS, COMBOS, LevelDef, ELEMENT_NAME, ELEMENT_COLOR, TalismanId, PASSIVES } from '../config/GameConfig';
import { makeNode, addLabel, rectNode, hex, setOpacity, circleNode } from '../core/Draw';
import { spriteNode, hasArt } from '../core/Art';
import { AudioManager } from '../core/AudioManager';
import { SkillSystem, Option } from './SkillSystem';
import { Combat } from './Combat';
import { popIn, breathe } from './Anim';

const top = (): number => GAME.height / 2;
const SAFE_TOP = 60; // 刘海/状态栏留白
const BOSS_W = 220;
const BAR_W = 600;
// 状态条都放在城墙下方、玩家脚下，屏幕顶部留给妖怪进场
const WALL_BAR_OFFSET = -160;     // 结界血条中心相对垛口线（紧贴城墙图下沿）
const XP_BAR_OFFSET = -186;       // 灵气条中心相对垛口线（紧贴血条下方）
const WALL_BAR_H = 20;            // U1：16–24
const XP_BAR_H = 10;              // U3：8–12
const WALL_FILL_COLOR = '#9B3D2E'; // 暗朱砂
const XP_FILL_COLOR = '#E8C56A';   // 骨白→淡金
const WALL_CAP = 36;              // SLICES.md
const XP_CAP = 18;
const TALISMAN_ICON_W = 40;  // 符牌图标显示尺寸（素材 128×192；相对原 56 约缩 30%）
const TALISMAN_ICON_H = 60;
const CD_MASK_ALPHA = 150; // 冷却遮罩不透明度（上→下 burn）

/** 9-slice 卷轴框：只左右保轴头，上下 0 */
function applyHSlice(node: Node | null, left: number, right: number): void {
    if (!node) return;
    const sp = node.getComponent(Sprite);
    if (!sp || !sp.spriteFrame) return;
    const sf = sp.spriteFrame;
    sf.insetLeft = left;
    sf.insetRight = right;
    sf.insetTop = 0;
    sf.insetBottom = 0;
    sp.type = Sprite.Type.SLICED;
}

/** HUD 条：贴图 bg/fill/frame，缺图退回 Graphics；贴图在 loadArt 后延迟挂上 */
interface HudBar {
    root: Node;
    text: Label;
    fillNode: Node | null;
    fillUt: UITransform | null;
    fillInnerW: number;
    fillInset: number;
    gfx: Graphics | null;
    h: number;
    fillColor: string;
    bgKey: string;
    fillKey: string;
    frameKey: string;
    capL: number;
    capR: number;
    srcW: number;
    artReady: boolean;
}

// HUD、升级三选一面板、结算面板、提示
export class GameUI {
    private wallBar: HudBar;
    private xpBar: HudBar;
    private info: Label;
    private moveHint: Label;
    private moveHintT = -1; // <0 未触发淡出；>0 淡出剩余秒
    private bossBar: Graphics;
    private bossText: Label;
    private bossTime = 0;
    private bossName = '';
    private skillPanel: Node;
    private skillSig = '';
    private cdMasks = new Map<TalismanId, Graphics>(); // 符咒图标上的冷却遮罩
    private toast: Label;
    private toastT = 0;
    private overlay: Node | null = null;

    constructor(private root: Node, private audio?: AudioManager) {
        this.wallBar = this.makeHudBar(
            'wallBar', WALL_BAR_H, WALL_FILL_COLOR,
            'ui_barrier_bar_bg', 'ui_barrier_bar_fill', 'ui_barrier_bar_frame',
            WALL_CAP, WALL_CAP, 328,
        );
        this.wallBar.root.setPosition(0, GAME.wallY + WALL_BAR_OFFSET);
        this.xpBar = this.makeHudBar(
            'xpBar', XP_BAR_H, XP_FILL_COLOR,
            'ui_xp_bar_bg', 'ui_xp_bar_fill', 'ui_xp_bar_frame',
            XP_CAP, XP_CAP, 292,
        );
        this.xpBar.root.setPosition(0, GAME.wallY + XP_BAR_OFFSET);
        // 击杀 / 时间：右上角小字，不加底板
        this.info = addLabel(root, '', 20, '#B8B0C8');
        this.info.node.setPosition(GAME.width / 2 - 100, top() - SAFE_TOP);
        // 左侧技能栏
        this.skillPanel = makeNode('skillPanel', root);
        this.skillPanel.setPosition(-GAME.width / 2 + 44, top() - SAFE_TOP - 160);
        // 底部移动区提示：只留一行淡字，不再铺色块
        this.moveHint = addLabel(root, '← 拖动移动 →', 18, '#6F6888');
        this.moveHint.node.setPosition(0, GAME.moveZoneY - 20);
        // Boss 进度：左上角细条，Boss 出场前显示来袭进度，出场后显示 Boss 血量
        const bossNode = makeNode('bossBar', root);
        bossNode.setPosition(-GAME.width / 2 + 24, top() - SAFE_TOP - 14);
        this.bossBar = bossNode.addComponent(Graphics);
        this.bossText = addLabel(root, '', 16, '#D8C8A8');
        this.bossText.node.setPosition(-GAME.width / 2 + 24 + BOSS_W / 2, top() - SAFE_TOP + 6);
        this.toast = addLabel(root, '', 36, '#FFD700');
        this.toast.node.setPosition(0, 250);
    }

    private makeHudBar(
        name: string, h: number, fillColor: string,
        bgKey: string, fillKey: string, frameKey: string,
        capL: number, capR: number, srcW: number,
    ): HudBar {
        const root = makeNode(name, this.root, BAR_W, h);
        const text = addLabel(root, '', name === 'wallBar' ? 18 : 14);
        // loadArt 在 GameUI 构造之后才完成，先挂 Graphics，首帧 refresh 再换皮
        const gfx = root.addComponent(Graphics);
        return {
            root, text, fillNode: null, fillUt: null, fillInnerW: BAR_W, fillInset: 0, gfx,
            h, fillColor, bgKey, fillKey, frameKey, capL, capR, srcW, artReady: false,
        };
    }

    /** loadArt 完成后把 Graphics 条换成卷轴贴图；素材缺失则保持 Graphics */
    private tryAttachBarArt(bar: HudBar): void {
        if (bar.artReady) return;
        if (!hasArt(bar.bgKey) || !hasArt(bar.fillKey) || !hasArt(bar.frameKey)) return;
        const root = bar.root;
        if (bar.gfx) {
            bar.gfx.destroy();
            bar.gfx = null;
        }
        const scale = BAR_W / bar.srcW;
        const inset = Math.round(((bar.capL + bar.capR) / 2) * scale);
        const fillH = Math.max(6, bar.h - 4);
        const fillInnerW = Math.max(40, BAR_W - inset * 2);
        spriteNode(bar.bgKey, fillInnerW, fillH, root)?.setPosition(0, 0);
        const fillNode = spriteNode(bar.fillKey, fillInnerW, fillH, root);
        const frame = spriteNode(bar.frameKey, BAR_W, bar.h, root);
        applyHSlice(frame, bar.capL, bar.capR);
        // 文字保持在最上层
        bar.text.node.setSiblingIndex(root.children.length - 1);
        let fillUt: UITransform | null = null;
        if (fillNode) {
            fillUt = fillNode.getComponent(UITransform);
            fillUt.setAnchorPoint(0, 0.5);
            fillNode.setPosition(-fillInnerW / 2, 0);
            fillUt.setContentSize(fillInnerW, fillH);
        }
        bar.fillNode = fillNode;
        bar.fillUt = fillUt;
        bar.fillInnerW = fillInnerW;
        bar.fillInset = inset;
        bar.artReady = true;
    }

    private setBar(bar: HudBar, ratio: number): void {
        this.tryAttachBarArt(bar);
        const r = Math.max(0, Math.min(1, ratio));
        if (bar.fillUt) {
            bar.fillUt.setContentSize(bar.fillInnerW * r, bar.fillUt.contentSize.height);
            if (bar.fillNode) bar.fillNode.active = r > 0.001;
            return;
        }
        if (!bar.gfx) return;
        const g = bar.gfx;
        const h = bar.h;
        g.clear();
        g.fillColor = hex('#12101C', 200);
        g.rect(-BAR_W / 2, -h / 2, BAR_W, h);
        g.fill();
        g.fillColor = hex(bar.fillColor);
        g.rect(-BAR_W / 2, -h / 2, BAR_W * r, h);
        g.fill();
    }

    refresh(c: Combat, s: SkillSystem, time: number): void {
        this.setBar(this.wallBar, c.wallHp / GAME.wallHp);
        this.setBar(this.xpBar, s.xp / s.xpNeed);
        const t = Math.floor(time);
        this.wallBar.text.string = `结界 ${Math.ceil(c.wallHp)}/${GAME.wallHp}`;
        this.xpBar.text.string = `Lv${s.level}`;
        const mm = Math.floor(t / 60);
        const ss = Math.floor(t % 60);
        this.info.string = `击杀 ${c.kills}   ${mm}:${ss < 10 ? '0' + ss : ss}`;
        this.drawBoss(c, time);
        // 技能有变化才重建左侧技能栏
        const sig: string[] = [];
        s.talismans.forEach((st, id) => sig.push(id + st.level));
        s.passives.forEach((lv, id) => sig.push(id + lv));
        s.combos.forEach((id) => sig.push(id));
        const key = sig.join('|');
        if (key !== this.skillSig) {
            this.skillSig = key;
            this.buildSkillPanel(s);
        }
        this.drawCooldowns(s);
    }

    /** 冷却遮罩：上→下 burn；ratio 为剩余 CD，暗色盖住底部 ratio*H，顶部先露出 */
    private drawCooldowns(s: SkillSystem): void {
        this.cdMasks.forEach((g, id) => {
            const st = s.talismans.get(id);
            const ratio = st ? Math.min(1, Math.max(0, st.cdT / s.cooldown(id))) : 0;
            g.clear();
            if (ratio <= 0) return;
            g.fillColor = hex('#000000', CD_MASK_ALPHA);
            // y-up、原点在图标中心：底部矩形从 -H/2 起高 ratio*H
            g.rect(-TALISMAN_ICON_W / 2, -TALISMAN_ICON_H / 2, TALISMAN_ICON_W, ratio * TALISMAN_ICON_H);
            g.fill();
        });
    }

    private buildSkillPanel(s: SkillSystem): void {
        const panel = this.skillPanel;
        panel.destroyAllChildren();
        this.cdMasks.clear();
        let y = 0;
        s.talismans.forEach((st, id) => {
            const d = TALISMANS[id];
            // 符牌图片（竖长）；有图不叠 name[0]，无图退回圆形色块+字
            let icon = spriteNode('icon_talisman_' + id, TALISMAN_ICON_W, TALISMAN_ICON_H, panel);
            const art = !!icon;
            if (!icon) icon = circleNode('talisman', 22, ELEMENT_COLOR[d.element], d.name[0], panel);
            icon.setPosition(0, y);
            // CD 遮罩与符牌同尺寸（上→下 burn）；角标仍在最上层
            this.cdMasks.set(id, makeNode('cd', icon, TALISMAN_ICON_W, TALISMAN_ICON_H).addComponent(Graphics));
            this.levelBadge(icon, st.level >= d.maxLevel ? 'MAX' : `${st.level}`, 16, art ? -24 : -16);
            addLabel(panel, d.name, 14, '#E8E0F0').node.setPosition(0, y - (art ? 40 : 32));
            y -= art ? 84 : 72;
        });
        s.passives.forEach((lv, id) => {
            const d = PASSIVES[id];
            // 优先竖纸 frameless（缩入侧栏槽）；缺图回退旧方图
            let icon = spriteNode('icon_passive_' + id + '_frameless', 30, 44, panel)
                ?? spriteNode('icon_passive_' + id, 44, 44, panel);
            // 有图不叠字；被动无 CD 遮罩
            if (!icon) icon = circleNode('passive', 20, '#6F6888', d.name[0], panel);
            icon.setPosition(0, y + 10);
            this.levelBadge(icon, lv >= d.maxLevel ? 'MAX' : `${lv}`, 15, -15);
            y -= 56;
        });
        const combos = COMBOS.filter((cb) => s.combos.has(cb.id)).map((cb) => cb.name);
        if (combos.length) {
            addLabel(panel, '合击\n' + combos.join('\n'), 18, '#FFD700').node.setPosition(0, y - 10);
        }
    }

    private levelBadge(icon: Node, text: string, x: number, y: number): void {
        const badge = circleNode('lv', text === 'MAX' ? 16 : 12, '#1A1A2E', undefined, icon);
        badge.setPosition(x, y);
        const l = addLabel(badge, text, text === 'MAX' ? 12 : 16, '#FFD700');
        l.enableOutline = true;
        l.outlineColor = hex('#000000');
        l.outlineWidth = 2;
    }

    /** 开局设置 Boss 出场时间；没有 Boss 时隐藏进度条。同时恢复拖动提示 */
    setBoss(name: string, time: number): void {
        this.bossName = name;
        this.bossTime = time;
        this.bossBar.clear();
        this.bossText.string = '';
        this.moveHintT = -1;
        setOpacity(this.moveHint.node, 255);
    }

    /** 首次拖动后淡出拖动提示 */
    hideMoveHint(): void {
        if (this.moveHintT < 0) this.moveHintT = 0.6;
    }

    private drawBoss(c: Combat, time: number): void {
        const g = this.bossBar;
        g.clear();
        const boss = c.enemies.find((e) => e.def.boss);
        const coming = !boss && time < this.bossTime;
        if (!this.bossName || (!boss && !coming)) {
            this.bossText.string = '';
            return;
        }
        const r = boss ? boss.hp / boss.maxHp : time / this.bossTime;
        g.fillColor = hex('#1A1626');
        g.rect(0, -4, BOSS_W, 8);
        g.fill();
        g.fillColor = hex(boss ? '#C0392B' : '#B8862E');
        g.rect(0, -4, BOSS_W * Math.max(0, Math.min(1, r)), 8);
        g.fill();
        this.bossText.string = boss ? this.bossName : `${this.bossName} 来袭`;
    }

    update(dt: number): void {
        if (this.moveHintT > 0) {
            this.moveHintT = Math.max(0, this.moveHintT - dt);
            setOpacity(this.moveHint.node, Math.round((255 * this.moveHintT) / 0.6));
        }
        if (this.toastT <= 0) return;
        this.toastT -= dt;
        setOpacity(this.toast.node, Math.round(255 * Math.min(1, Math.max(0, this.toastT))));
    }

    showToast(text: string): void {
        this.toast.string = text;
        this.toastT = 2.5;
        setOpacity(this.toast.node, 255);
    }

    /** 三选一：竖符纸 2:3；稀有度=五行描边叠层；禁满铺黄裱 */
    showPick(title: string, opts: Option[], onPick: (o: Option) => void): void {
        const ov = this.openOverlay();
        const titleNode = addLabel(ov, title, 40, '#FFD700');
        titleNode.node.setPosition(0, 420);
        popIn(titleNode.node, 0.3);
        // 五行相克提示放在选卡界面，战斗画面不再常驻
        addLabel(ov, '金克木  木克土  土克水  水克火  火克金', 18, '#9A8FB0').node.setPosition(0, 370);

        // T-FIX：三卡齐高；槽 = 标题行 → 大图标撑满中区 → 底描述带（不叠）
        const CARD_W = 200;
        const CARD_H = 300; // 2:3 齐高
        const GAP = 18;
        const n = opts.length;
        const totalW = n * CARD_W + Math.max(0, n - 1) * GAP;
        const TEXT_W = 180; // CARD_W - 20
        // 卡心坐标（原点中心）：顶≈+150 / 底≈-150；标题/角标须落在安全区内
        const TITLE_Y = 112; // 新卡底：顶边金线约在 +134，标题放在两角云纹之间
        const TITLE_H = 22;
        // CD/CoS 槽锁：宽 70–80%、高 55–65% 卡面 → 156×192（78%×64%）
        const ICON_W = 128;
        const ICON_H = 168;
        const ICON_Y = 10; // 顶≈94 底≈-74，与标题、描述都留缝
        const DESC_TOP_Y = -82; // 描述顶锚，紧贴图标底之下
        const DESC_H = 40; // 两行带
        const titleColor = '#F0D9A0'; // 暖金标题：红木卡底上朱砂字看不清

        opts.forEach((o, i) => {
            const x = -totalW / 2 + CARD_W / 2 + i * (CARD_W + GAP);
            const y = 40;
            let card = spriteNode('ui_card_pick_base', CARD_W, CARD_H, ov);
            if (!card) card = rectNode('card', CARD_W, CARD_H, '#2C2440', ov, 16);
            card.setPosition(x, y);

            // 符咒：叠五行描边；passive/heal 仅底牌（描边在底层，勿盖标题）
            if (o.type === 'talisman') {
                const rarityKey = 'ui_card_rarity_' + o.id;
                const edge = spriteNode(rarityKey, CARD_W, CARD_H, card);
                if (edge) edge.setPosition(0, 0);
            }

            // —— 1) 标题行：剥「(新)/（新）」→ 右上小角标，避免顶孔红糊 ——
            const tal = o.type === 'talisman' ? TALISMANS[o.id as TalismanId] : null;
            const el = tal && ELEMENT_NAME[tal.element] ? `【${ELEMENT_NAME[tal.element]}】` : '';
            const isNew = /[（(]新[）)]/.test(o.title);
            const rawTitle = o.title.replace(/[（(]新[）)]/g, '').trim();
            const tLab = addLabel(card, el + rawTitle, 18, titleColor);
            tLab.horizontalAlign = Label.HorizontalAlign.CENTER;
            tLab.verticalAlign = Label.VerticalAlign.CENTER;
            tLab.overflow = Label.Overflow.SHRINK;
            const tUt = tLab.node.getComponent(UITransform)!;
            tUt.setContentSize(isNew ? 120 : 140, TITLE_H); // 避开两角云纹 // 有「新」时右侧留角标
            tUt.setAnchorPoint(0.5, 0.5);
            tLab.node.setPosition(0, TITLE_Y);

            if (isNew) {
                const badge = addLabel(card, '新', 12, '#E8D5C4');
                badge.horizontalAlign = Label.HorizontalAlign.CENTER;
                badge.verticalAlign = Label.VerticalAlign.CENTER;
                badge.overflow = Label.Overflow.NONE;
                const bUt = badge.node.getComponent(UITransform)!;
                bUt.setContentSize(20, 16);
                bUt.setAnchorPoint(0.5, 0.5);
                // 右上角内侧，不越卡边；浅字+细描边，不铺红晕
                badge.enableOutline = true;
                badge.outlineColor = hex('#5A2A22');
                badge.outlineWidth = 2;
                badge.node.setPosition(66, TITLE_Y);
            }

            // —— 2) 大图标槽（主动/被动同规格 ~156×192 竖纸；被动方图居中）——
            // 优先无框 *_frameless；缺图回退旧 icon_*
            let pickIcon: Node | null = null;
            if (o.type === 'talisman') {
                pickIcon = spriteNode('icon_talisman_' + o.id + '_frameless', ICON_W, ICON_H, card)
                    ?? spriteNode('icon_talisman_' + o.id, ICON_W, ICON_H, card);
            } else if (o.type === 'passive') {
                // 竖纸 *_frameless 与主动同槽；旧方图回退居中方槽
                pickIcon = spriteNode('icon_passive_' + o.id + '_frameless', ICON_W, ICON_H, card);
                if (!pickIcon) {
                    const s = Math.min(ICON_W, ICON_H);
                    pickIcon = spriteNode('icon_passive_' + o.id, s, s, card);
                }
            }
            if (pickIcon) pickIcon.setPosition(0, ICON_Y);

            // —— 3) 底描述带：两行 SHRINK，顶锚在图标底之下 ——
            const dLab = addLabel(card, o.desc, 14, '#DDD6C8');
            dLab.horizontalAlign = Label.HorizontalAlign.CENTER;
            dLab.verticalAlign = Label.VerticalAlign.TOP;
            dLab.overflow = Label.Overflow.SHRINK; // 固定两行带内收缩，防上涌压图标
            dLab.lineHeight = 18;
            const dUt = dLab.node.getComponent(UITransform)!;
            dUt.setAnchorPoint(0.5, 1);
            dUt.setContentSize(TEXT_W, DESC_H);
            dLab.node.setPosition(0, DESC_TOP_Y);

            popIn(card, 0.22 + i * 0.06);
            breathe(card, 0.02, 2.0 + i * 0.3);
            card.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
                e.propagationStopped = true;
                this.audio?.playSfx('click', 0.6);
                onPick(o);
            });
        });
    }

    /** 选关菜单；下标 ≥ unlocked 的关卡显示为锁定，点击无效 */
    showLevels(levels: LevelDef[], unlocked: number, onPick: (index: number) => void): void {
        const ov = this.openOverlay();
        // 半写实仙侠菜单底图（无图时保留半透明黑底）
        const menuBg = spriteNode('bg_menu', GAME.width, GAME.height, ov);
        if (menuBg) menuBg.setPosition(0, 0);
        // 标题牌 + 叠字
        const banner = spriteNode('ui_title_banner', 620, 150, ov);
        if (banner) {
            banner.setPosition(0, 430);
            addLabel(banner, '符镇百妖', 56, '#FFD700').node.setPosition(0, 8);
        } else {
            addLabel(ov, '符镇百妖', 72, '#FFD700').node.setPosition(0, 420);
        }
        addLabel(ov, '选择关卡', 28, '#E8E2D0').node.setPosition(0, 320);

        // 卡面花边留白：文案落在 600×190 安全区（约 ±210×±52）
        const CARD_W = 560;
        const CARD_H = 176;
        const TEXT_W = 340;       // 避开左右纹饰与名章
        const TITLE_Y = 28;       // 标题固定偏上
        const DESC_Y = -22;       // 描述固定偏下，两行也不贴边
        const CARD_GAP = 250;     // 卡间距加大，避免叠边
        const BOSS_SEALS = ['ui_seal_heishan', 'ui_seal_baigu'] as const;
        const SEAL_SIZE = 80;

        levels.forEach((lv, i) => {
            const open = i < unlocked;
            const y = 130 - i * CARD_GAP;
            let card = spriteNode('ui_level_card', CARD_W, CARD_H, ov);
            if (card) {
                card.setPosition(0, y);
                card.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
                    e.propagationStopped = true;
                    if (open) {
                        this.audio?.playSfx('click', 0.6);
                        onPick(i);
                    }
                });
            } else {
                card = this.button(ov, '', () => { if (open) onPick(i); }, CARD_W, CARD_H, open ? '#2C2440' : '#1C1A24', 0, y);
            }
            // Boss 名章：装饰于标题旁，不挡点按；锁定仍用 ui_lock_seal
            if (i < BOSS_SEALS.length) {
                const seal = spriteNode(BOSS_SEALS[i], SEAL_SIZE, SEAL_SIZE, card);
                if (seal) seal.setPosition(-210, 8);
            }
            // 标题：统一字号与 Y，水平居中并限制宽度
            const title = addLabel(card, lv.name, 32, open ? '#FFD700' : '#6A6478');
            title.horizontalAlign = Label.HorizontalAlign.CENTER;
            title.overflow = Label.Overflow.SHRINK;
            title.node.getComponent(UITransform).setContentSize(TEXT_W, 40);
            title.node.setPosition(20, TITLE_Y);

            // 描述 / 锁定提示：小号、可换行，限制在花边内
            const descText = open ? lv.desc : '通关上一关后解锁';
            const desc = addLabel(card, descText, 18, open ? '#DDD6C8' : '#6A6478');
            desc.horizontalAlign = Label.HorizontalAlign.CENTER;
            desc.verticalAlign = Label.VerticalAlign.TOP;
            desc.overflow = Label.Overflow.RESIZE_HEIGHT;
            desc.lineHeight = 24;
            desc.node.getComponent(UITransform).setContentSize(TEXT_W, 0);
            desc.node.setPosition(20, DESC_Y);

            if (!open) {
                const seal = spriteNode('ui_lock_seal', 56, 56, card);
                if (seal) seal.setPosition(190, 8);
            }
        });
    }

    /**
     * 结算板。CD D re-spot PASS：win/lose settle 全封挂
     *   Win：ui_settle_panel + fx_settle_win
     *   Lose：fx_settle_lose + banner/card 回退（无专属 lose 匾则用横卡）
     */
    showResult(win: boolean, kills: number, time: number, buttons: { text: string; cb: () => void }[]): void {
        const ov = this.openOverlay();
        const RESULT_BANNER = 'ui_title_banner';
        const RESULT_PLAQUE_WIN = 'ui_settle_panel';
        const RESULT_PLAQUE_FALLBACK = 'ui_level_card';
        const RESULT_FX = win ? 'fx_settle_win' : 'fx_settle_lose';

        const settleVfx = makeNode('settleVfx', ov);
        settleVfx.setPosition(0, 300);
        const fx = spriteNode(RESULT_FX, 128, 128, settleVfx);
        if (fx) popIn(fx, 0.3);

        const banner = spriteNode(RESULT_BANNER, 620, 150, ov);
        if (banner) {
            banner.setPosition(0, win ? 200 : 240);
            const title = addLabel(banner, win ? '镇妖成功' : '结界破碎', 56, win ? '#FFD700' : '#E74C3C');
            title.node.setPosition(0, 8);
            popIn(banner, 0.4);
        } else {
            const title = addLabel(ov, win ? '镇妖成功' : '结界破碎', 64, win ? '#FFD700' : '#E74C3C');
            title.node.setPosition(0, 200);
            popIn(title.node, 0.4);
        }

        // Win：竖匾 ui_settle_panel（384×512 封挂）；Lose / 缺图：横卡回退
        let plaque: Node | null = null;
        let usingSettlePanel = false;
        if (win) {
            plaque = spriteNode(RESULT_PLAQUE_WIN, 300, 400, ov);
            usingSettlePanel = !!plaque;
        }
        if (!plaque) plaque = spriteNode(RESULT_PLAQUE_FALLBACK, 560, 176, ov);
        if (!plaque) plaque = rectNode('resultPlaque', 560, 160, '#2C2440', ov, 16);
        plaque.setPosition(0, usingSettlePanel ? -20 : 40);
        // 横卡回退时补装饰章；封挂竖匾自带纹样不叠
        if (!usingSettlePanel) {
            const seal = spriteNode(win ? 'ui_seal_heishan' : 'ui_lock_seal', 72, 72, plaque);
            if (seal) seal.setPosition(-210, 8);
        }
        addLabel(plaque, `击杀 ${kills}    用时 ${Math.floor(time)} 秒`, 30, '#E8E2D0').node.setPosition(0, usingSettlePanel ? 40 : 0);
        popIn(plaque, 0.35);

        buttons.forEach((b, i) => {
            const btn = this.button(ov, b.text, b.cb, 300, 90, i === 0 ? '#8E2C2C' : '#3A3350', 0, -160 - i * 120);
            popIn(btn, 0.25 + i * 0.08);
        });
    }

    private button(parent: Node, text: string, cb: () => void, w: number, h: number, color: string, x: number, y: number): Node {
        const btn = rectNode('btn', w, h, color, parent, 12);
        btn.setPosition(x, y);
        addLabel(btn, text, 34, '#FFD700');
        btn.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            e.propagationStopped = true;
            this.audio?.playSfx('click', 0.6);
            cb();
        });
        return btn;
    }

    clearOverlay(): void {
        if (this.overlay) {
            this.overlay.destroy();
            this.overlay = null;
        }
    }

    private openOverlay(): Node {
        this.clearOverlay();
        this.overlay = rectNode('overlay', GAME.width, GAME.height, '#000000', this.root, 0, 170);
        return this.overlay;
    }
}
