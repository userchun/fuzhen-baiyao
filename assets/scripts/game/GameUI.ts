import { Node, Graphics, Label, EventTouch } from 'cc';
import { GAME, TALISMANS, COMBOS, LevelDef, ELEMENT_NAME, ELEMENT_COLOR, TalismanId, PASSIVES } from '../config/GameConfig';
import { makeNode, addLabel, rectNode, hex, setOpacity, circleNode } from '../core/Draw';
import { spriteNode } from '../core/Art';
import { SkillSystem, Option } from './SkillSystem';
import { Combat } from './Combat';

const top = (): number => GAME.height / 2;
const SAFE_TOP = 60; // 刘海/状态栏留白
const BAR_W = 600;
// 状态条都放在城墙下方、玩家脚下，屏幕顶部留给妖怪进场
const WALL_BAR_OFFSET = -94;      // 结界血条中心相对城墙顶部
const XP_BAR_OFFSET = -120;       // 灵气条中心相对城墙顶部（紧贴血条下方）
const TALISMAN_ICON_W = 56;  // 符牌图标显示尺寸（素材 128×192）
const TALISMAN_ICON_H = 84;
const CD_MASK_R = 30;     // 与符咒图标半径一致
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

    constructor(private root: Node) {
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
        this.info.string = `击杀 ${c.kills}   ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
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
            if (icon) addLabel(icon, d.name[0], 24, ELEMENT_COLOR[d.element]);
            else icon = circleNode('talisman', 30, ELEMENT_COLOR[d.element], d.name[0], panel);
            icon.setPosition(0, y);
            // 遮罩在等级角标之前加入，角标仍显示在最上层
            this.cdMasks.set(id, makeNode('cd', icon, 60, 60).addComponent(Graphics));
            this.levelBadge(icon, st.level >= d.maxLevel ? 'MAX' : `${st.level}`, 22, art ? -34 : -22);
            addLabel(panel, d.name, 16, '#E8E0F0').node.setPosition(0, y - (art ? 54 : 44));
            y -= art ? 116 : 100;
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
        addLabel(ov, title, 40, '#FFD700').node.setPosition(0, 380);
        opts.forEach((o, i) => {
            const card = rectNode('card', 580, 170, '#2C2440', ov, 16);
            card.setPosition(0, 200 - i * 200);
            const tal = o.type === 'talisman' ? TALISMANS[o.id as TalismanId] : null;
            const el = tal && ELEMENT_NAME[tal.element] ? `【${ELEMENT_NAME[tal.element]}】` : '';
            addLabel(card, el + o.title, 34, tal ? ELEMENT_COLOR[tal.element] : '#FFD700').node.setPosition(0, 40);
            addLabel(card, o.desc, 24, '#DDDDDD').node.setPosition(0, -25);
            card.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
                e.propagationStopped = true;
                onPick(o);
            });
        });
    }

    /** 选关菜单；下标 ≥ unlocked 的关卡显示为锁定，点击无效 */
    showLevels(levels: LevelDef[], unlocked: number, onPick: (index: number) => void): void {
        const ov = this.openOverlay();
        addLabel(ov, '符镇百妖', 72, '#FFD700').node.setPosition(0, 420);
        addLabel(ov, '选择关卡', 30, '#DDDDDD').node.setPosition(0, 330);
        levels.forEach((lv, i) => {
            const open = i < unlocked;
            const card = this.button(ov, lv.name, () => { if (open) onPick(i); }, 580, 180, open ? '#2C2440' : '#1C1A24', 0, 150 - i * 220);
            const title = card.getChildByName('label');
            title.setPosition(0, 40);
            if (open) {
                addLabel(card, lv.desc, 22, '#BBBBBB').node.setPosition(0, -30);
            } else {
                title.getComponent(Label).color = hex('#6A6478');
                addLabel(card, '通关上一关后解锁', 24, '#6A6478').node.setPosition(0, -30);
            }
        });
    }

    showResult(win: boolean, kills: number, time: number, buttons: { text: string; cb: () => void }[]): void {
        const ov = this.openOverlay();
        addLabel(ov, win ? '镇妖成功' : '结界破碎', 64, win ? '#FFD700' : '#E74C3C').node.setPosition(0, 200);
        addLabel(ov, `击杀 ${kills}    用时 ${Math.floor(time)} 秒`, 30).node.setPosition(0, 80);
        buttons.forEach((b, i) => this.button(ov, b.text, b.cb, 300, 90, i === 0 ? '#8E2C2C' : '#3A3350', 0, -80 - i * 120));
    }

    private button(parent: Node, text: string, cb: () => void, w: number, h: number, color: string, x: number, y: number): Node {
        const btn = rectNode('btn', w, h, color, parent, 12);
        btn.setPosition(x, y);
        addLabel(btn, text, 34, '#FFD700');
        btn.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            e.propagationStopped = true;
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
