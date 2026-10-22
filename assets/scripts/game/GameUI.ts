import { Node, Graphics, Label, EventTouch } from 'cc';
import { GAME, TALISMANS, COMBOS, LevelDef, ELEMENT_NAME, ELEMENT_COLOR, TalismanId, PASSIVES } from '../config/GameConfig';
import { makeNode, addLabel, rectNode, hex, setOpacity, circleNode } from '../core/Draw';
import { SkillSystem, Option } from './SkillSystem';
import { Combat } from './Combat';

const top = (): number => GAME.height / 2;
const SAFE_TOP = 60; // 刘海/状态栏留白
const BAR_W = 600;

// HUD、升级三选一面板、结算面板、提示
export class GameUI {
    private wallBar: Graphics;
    private xpBar: Graphics;
    private info: Label;
    private skillPanel: Node;
    private skillSig = '';
    private toast: Label;
    private toastT = 0;
    private overlay: Node | null = null;

    constructor(private root: Node) {
        this.wallBar = makeNode('wallBar', root).addComponent(Graphics);
        this.wallBar.node.setPosition(0, top() - SAFE_TOP - 20);
        this.xpBar = makeNode('xpBar', root).addComponent(Graphics);
        this.xpBar.node.setPosition(0, top() - SAFE_TOP - 44);
        this.info = addLabel(root, '', 26);
        this.info.node.setPosition(0, top() - SAFE_TOP - 80);
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
        this.drawBar(this.wallBar, c.wallHp / GAME.wallHp, '#C0392B', 18);
        this.drawBar(this.xpBar, s.xp / s.xpNeed, '#8E44AD', 10);
        const t = Math.floor(time);
        this.info.string = `结界 ${Math.ceil(c.wallHp)}   Lv${s.level}   击杀 ${c.kills}   ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
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
    }

    private buildSkillPanel(s: SkillSystem): void {
        const panel = this.skillPanel;
        panel.destroyAllChildren();
        let y = 0;
        s.talismans.forEach((st, id) => {
            const d = TALISMANS[id];
            const icon = circleNode('talisman', 30, ELEMENT_COLOR[d.element], d.name[0], panel);
            icon.setPosition(0, y);
            this.levelBadge(icon, st.level >= d.maxLevel ? 'MAX' : `${st.level}`, 22, -22);
            addLabel(panel, d.name, 16, '#E8E0F0').node.setPosition(0, y - 44);
            y -= 100;
        });
        s.passives.forEach((lv, id) => {
            const d = PASSIVES[id];
            const icon = circleNode('passive', 20, '#6F6888', d.name[0], panel);
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

    showLevels(levels: LevelDef[], onPick: (index: number) => void): void {
        const ov = this.openOverlay();
        addLabel(ov, '符镇百妖', 72, '#FFD700').node.setPosition(0, 420);
        addLabel(ov, '选择关卡', 30, '#DDDDDD').node.setPosition(0, 330);
        levels.forEach((lv, i) => {
            const card = this.button(ov, lv.name, () => onPick(i), 580, 180, '#2C2440', 0, 150 - i * 220);
            card.getChildByName('label').setPosition(0, 40);
            addLabel(card, lv.desc, 22, '#BBBBBB').node.setPosition(0, -30);
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
