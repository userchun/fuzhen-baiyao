import { Node, Graphics, Label, EventTouch, UITransform } from 'cc';
import { GAME, TALISMANS, COMBOS, LevelDef, ELEMENT_NAME, ELEMENT_COLOR, TalismanId, PASSIVES } from '../config/GameConfig';
import { makeNode, addLabel, rectNode, hex, setOpacity, circleNode } from '../core/Draw';
import { spriteNode } from '../core/Art';
import { AudioManager } from '../core/AudioManager';
import { SkillSystem, Option } from './SkillSystem';
import { Combat } from './Combat';
import { popIn, breathe } from './Anim';

const top = (): number => GAME.height / 2;
const SAFE_TOP = 60; // 刘海/状态栏留白
const BAR_W = 600;
// 状态条都放在城墙下方、玩家脚下，屏幕顶部留给妖怪进场
const WALL_BAR_OFFSET = -94;      // 结界血条中心相对城墙顶部
const XP_BAR_OFFSET = -120;       // 灵气条中心相对城墙顶部（紧贴血条下方）
const TALISMAN_ICON_W = 40;  // 符牌图标显示尺寸（素材 128×192；相对原 56 约缩 30%）
const TALISMAN_ICON_H = 60;
const CD_MASK_R = 22;     // 与符咒图标半径一致
const CD_MASK_ALPHA = 150; // 冷却遮罩不透明度

// HUD、升级三选一面板、结算面板、提示
export class GameUI {
    private wallBar: Graphics;
    private wallText: Label;
    private xpBar: Graphics;
    private xpText: Label;
    private info: Label;
    private skillPanel: Node;
    private skillSig = '';
    private cdMasks = new Map<TalismanId, Graphics>(); // 符咒图标上的冷却遮罩
    private toast: Label;
    private toastT = 0;
    private overlay: Node | null = null;

    constructor(private root: Node, private audio?: AudioManager) {
        this.wallBar = makeNode('wallBar', root).addComponent(Graphics);
        this.wallText = addLabel(this.wallBar.node, '', 18);
        this.wallBar.node.setPosition(0, GAME.wallY + WALL_BAR_OFFSET);
        this.xpBar = makeNode('xpBar', root).addComponent(Graphics);
        this.xpText = addLabel(this.xpBar.node, '', 14);
        this.xpBar.node.setPosition(0, GAME.wallY + XP_BAR_OFFSET);
        // 击杀 / 时间：右上角小字，不加底板
        this.info = addLabel(root, '', 20, '#B8B0C8');
        this.info.node.setPosition(GAME.width / 2 - 100, top() - SAFE_TOP);
        // 左侧技能栏
        this.skillPanel = makeNode('skillPanel', root);
        this.skillPanel.setPosition(-GAME.width / 2 + 44, top() - SAFE_TOP - 160);
        // 底部移动区提示
        const zoneH = GAME.moveZoneY + top();
        rectNode('moveZone', GAME.width, zoneH, '#FFFFFF', root, 0, 12).setPosition(0, -top() + zoneH / 2);
        addLabel(root, '← 拖动移动 →', 20, '#6F6888').node.setPosition(0, GAME.moveZoneY - 20);
        addLabel(root, '金克木  木克土  土克水  水克火  火克金', 20, '#9A8FB0').node.setPosition(0, -top() + 50);
        this.toast = addLabel(root, '', 36, '#FFD700');
        this.toast.node.setPosition(0, 250);
    }

    refresh(c: Combat, s: SkillSystem, time: number): void {
        this.drawBar(this.wallBar, c.wallHp / GAME.wallHp, '#C0392B', 24);
        this.drawBar(this.xpBar, s.xp / s.xpNeed, '#8E44AD', 16);
        const t = Math.floor(time);
        this.wallText.string = `结界 ${Math.ceil(c.wallHp)}/${GAME.wallHp}`;
        this.xpText.string = `Lv${s.level}`;
        const mm = Math.floor(t / 60);
        const ss = Math.floor(t % 60);
        this.info.string = `击杀 ${c.kills}   ${mm}:${ss < 10 ? '0' + ss : ss}`;
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

    /** 冷却遮罩：剩余冷却占比越大，暗色扇形越大，从 12 点方向顺时针消退 */
    private drawCooldowns(s: SkillSystem): void {
        this.cdMasks.forEach((g, id) => {
            const st = s.talismans.get(id);
            const ratio = st ? Math.min(1, Math.max(0, st.cdT / s.cooldown(id))) : 0;
            g.clear();
            if (ratio <= 0) return;
            g.fillColor = hex('#000000', CD_MASK_ALPHA);
            g.moveTo(0, 0);
            g.arc(0, 0, CD_MASK_R, Math.PI / 2, Math.PI / 2 + Math.PI * 2 * ratio, true);
            g.close();
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
            // 符牌图片（竖长）+ 中央空白符面叠字；无图时退回圆形色块
            let icon = spriteNode('icon_talisman_' + id, TALISMAN_ICON_W, TALISMAN_ICON_H, panel);
            const art = !!icon;
            if (icon) addLabel(icon, d.name[0], 18, ELEMENT_COLOR[d.element]);
            else icon = circleNode('talisman', 22, ELEMENT_COLOR[d.element], d.name[0], panel);
            icon.setPosition(0, y);
            // 遮罩在等级角标之前加入，角标仍显示在最上层
            this.cdMasks.set(id, makeNode('cd', icon, 44, 44).addComponent(Graphics));
            this.levelBadge(icon, st.level >= d.maxLevel ? 'MAX' : `${st.level}`, 16, art ? -24 : -16);
            addLabel(panel, d.name, 14, '#E8E0F0').node.setPosition(0, y - (art ? 40 : 32));
            y -= art ? 84 : 72;
        });
        s.passives.forEach((lv, id) => {
            const d = PASSIVES[id];
            let icon = spriteNode('icon_passive_' + id, 44, 44, panel);
            if (icon) addLabel(icon, d.name[0], 18, '#E8E2D0');
            else icon = circleNode('passive', 20, '#6F6888', d.name[0], panel);
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

    update(dt: number): void {
        if (this.toastT <= 0) return;
        this.toastT -= dt;
        setOpacity(this.toast.node, Math.round(255 * Math.min(1, Math.max(0, this.toastT))));
    }

    showToast(text: string): void {
        this.toast.string = text;
        this.toastT = 2.5;
        setOpacity(this.toast.node, 255);
    }

    showPick(title: string, opts: Option[], onPick: (o: Option) => void): void {
        const ov = this.openOverlay();
        const titleNode = addLabel(ov, title, 40, '#FFD700');
        titleNode.node.setPosition(0, 380);
        popIn(titleNode.node, 0.3);
        opts.forEach((o, i) => {
            const card = rectNode('card', 580, 170, '#2C2440', ov, 16);
            card.setPosition(0, 200 - i * 200);
            const tal = o.type === 'talisman' ? TALISMANS[o.id as TalismanId] : null;
            const el = tal && ELEMENT_NAME[tal.element] ? `【${ELEMENT_NAME[tal.element]}】` : '';
            addLabel(card, el + o.title, 34, tal ? ELEMENT_COLOR[tal.element] : '#FFD700').node.setPosition(0, 40);
            addLabel(card, o.desc, 24, '#DDDDDD').node.setPosition(0, -25);
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
        const TEXT_W = 400;       // 避开左右纹饰
        const TITLE_Y = 28;       // 标题固定偏上
        const DESC_Y = -22;       // 描述固定偏下，两行也不贴边
        const CARD_GAP = 250;     // 卡间距加大，避免叠边

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
            // 标题：统一字号与 Y，水平居中并限制宽度
            const title = addLabel(card, lv.name, 32, open ? '#FFD700' : '#6A6478');
            title.horizontalAlign = Label.HorizontalAlign.CENTER;
            title.overflow = Label.Overflow.SHRINK;
            title.node.getComponent(UITransform).setContentSize(TEXT_W, 40);
            title.node.setPosition(0, TITLE_Y);

            // 描述 / 锁定提示：小号、可换行，限制在花边内
            const descText = open ? lv.desc : '通关上一关后解锁';
            const desc = addLabel(card, descText, 18, open ? '#DDD6C8' : '#6A6478');
            desc.horizontalAlign = Label.HorizontalAlign.CENTER;
            desc.verticalAlign = Label.VerticalAlign.TOP;
            desc.overflow = Label.Overflow.RESIZE_HEIGHT;
            desc.lineHeight = 24;
            desc.node.getComponent(UITransform).setContentSize(TEXT_W, 0);
            desc.node.setPosition(0, DESC_Y);

            if (!open) {
                const seal = spriteNode('ui_lock_seal', 56, 56, card);
                if (seal) seal.setPosition(190, 8);
            }
        });
    }

    showResult(win: boolean, kills: number, time: number, buttons: { text: string; cb: () => void }[]): void {
        const ov = this.openOverlay();
        const title = addLabel(ov, win ? '镇妖成功' : '结界破碎', 64, win ? '#FFD700' : '#E74C3C');
        title.node.setPosition(0, 200);
        popIn(title.node, 0.4);
        addLabel(ov, `击杀 ${kills}    用时 ${Math.floor(time)} 秒`, 30).node.setPosition(0, 80);
        buttons.forEach((b, i) => {
            const btn = this.button(ov, b.text, b.cb, 300, 90, i === 0 ? '#8E2C2C' : '#3A3350', 0, -80 - i * 120);
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

    private drawBar(g: Graphics, ratio: number, color: string, h: number): void {
        g.clear();
        g.fillColor = hex('#000000', 150);
        g.rect(-BAR_W / 2, -h / 2, BAR_W, h);
        g.fill();
        g.fillColor = hex(color);
        g.rect(-BAR_W / 2, -h / 2, BAR_W * Math.max(0, Math.min(1, ratio)), h);
        g.fill();
    }
}
