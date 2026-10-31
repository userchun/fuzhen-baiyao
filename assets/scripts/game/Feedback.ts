import { Node, Label } from 'cc';
import { addLabel, hex, setOpacity } from '../core/Draw';
import { HitTier } from '../config/GameConfig';

interface FloatText { label: Label; life: number; }

const MAX_TEXTS = 40;      // 同屏飘字上限，防止卡顿
const TEXT_LIFE = 0.6;

// 打击感：伤害飘字、震屏、顿帧
export class Feedback {
    hitStopT = 0;
    private texts: FloatText[] = [];
    private free: Label[] = [];
    private shakeT = 0;
    private shakeMax = 0;
    private shakePower = 0;

    constructor(private layer: Node, private shakeTarget: Node) {}

    text(x: number, y: number, value: number, tier: HitTier): void {
        const crit = tier === 'crit';
        if (this.texts.length >= MAX_TEXTS) return;
        const label = this.free.pop() ?? this.createLabel();
        label.node.active = true;
        label.string = crit ? `${Math.round(value)}!` : String(Math.round(value));
        label.fontSize = crit ? 34 : tier === 'resist' ? 18 : 24;
        label.lineHeight = label.fontSize + 6;
        label.color = hex(crit ? '#FFD700' : tier === 'resist' ? '#8A8A8A' : '#FFFFFF');
        label.node.setPosition(x + (Math.random() - 0.5) * 30, y + 20);
        setOpacity(label.node, 255);
        this.texts.push({ label, life: TEXT_LIFE });
    }

    /** 2026-10-31 去掉震屏（试玩觉得不需要）：保留接口，调用处不用改；需要恢复时还原这里即可 */
    shake(_power: number, _time = 0.2): void {}

    hitStop(time: number): void {
        this.hitStopT = Math.max(this.hitStopT, time);
    }

    /** T2/T5：屏中可读大字（虚弱窗 / 相生一字），自动上浮淡出 */
    announce(text: string, x = 0, y = 180, size = 48, color = '#FFD700'): void {
        if (this.texts.length >= MAX_TEXTS) return;
        const label = this.free.pop() ?? this.createLabel();
        label.node.active = true;
        label.string = text;
        label.fontSize = size;
        label.lineHeight = size + 8;
        label.color = hex(color);
        label.node.setPosition(x, y);
        setOpacity(label.node, 255);
        this.texts.push({ label, life: 1.0 });
    }

    update(dt: number): void {
        this.texts = this.texts.filter((t) => {
            t.life -= dt;
            if (t.life <= 0) {
                t.label.node.active = false;
                this.free.push(t.label);
                return false;
            }
            const p = t.label.node.position;
            t.label.node.setPosition(p.x, p.y + 90 * dt);
            setOpacity(t.label.node, Math.round(255 * Math.min(1, t.life / (TEXT_LIFE * 0.5))));
            return true;
        });

        if (this.shakeT > 0) {
            this.shakeT -= dt;
            const k = Math.max(0, this.shakeT / this.shakeMax) * this.shakePower;
            this.shakeTarget.setPosition((Math.random() * 2 - 1) * k, (Math.random() * 2 - 1) * k);
        } else if (this.shakePower > 0) {
            this.shakePower = 0;
            this.shakeMax = 0;
            this.shakeTarget.setPosition(0, 0);
        }
    }

    private createLabel(): Label {
        const label = addLabel(this.layer, '', 24);
        label.enableOutline = true;
        label.outlineColor = hex('#000000');
        label.outlineWidth = 3;
        return label;
    }
}
