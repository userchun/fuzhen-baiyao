import { Graphics, Node, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import { spriteNode } from '../core/Art';
import { hex, makeNode, setOpacity } from '../core/Draw';
import type { BarrierElement } from './BarrierArt';
import { BarrierPixels, BARRIER_PIXEL } from './BarrierPixels';

/**
 * Cocos 结界：BarrierPixels 在低分辨率画布上绘制，这里上传成贴图、最近邻放大显示。
 * 每秒最多重绘 20 次（像素风的步进节奏），接口与旧版一致。
 */
export class BarrierView {
    private node: Node;
    private fx: BarrierPixels;
    private tex: Texture2D;
    private villageWall: Node | null = null;
    private wallCracks: Graphics | null = null;
    private damageStage = -1;
    private hitFlash = 0;
    private accumulator = 1;
    private input = { element: 'metal' as BarrierElement, health: 1, level: 0 };

    constructor(parent: Node, width: number, y: number) {
        this.fx = new BarrierPixels(width);
        const s = BARRIER_PIXEL.scale, w = this.fx.w, h = this.fx.h;
        this.node = makeNode('elementalBarrier', parent);
        const ui = this.node.getComponent(UITransform)!;
        ui.setAnchorPoint(0.5, BARRIER_PIXEL.wallRow / h);   // 接地线对齐 wallY
        this.node.setPosition(0, y);

        this.tex = new Texture2D();
        this.tex.reset({ width: w, height: h, format: Texture2D.PixelFormat.RGBA8888 });
        this.tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
        this.tex.setMipFilter(Texture2D.Filter.NONE);
        this.tex.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
        const sf = new SpriteFrame();
        sf.texture = this.tex;
        sf.packable = false;   // 每帧都改，不能进动态合图
        const sprite = this.node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = sf;
        ui.setContentSize(w * s, h * s);
        this.node.on(Node.EventType.NODE_DESTROYED, () => this.tex.destroy());
    }

    setElement(element: BarrierElement, village = false): void {
        this.villageWall?.destroy();
        const parent = this.node.parent!;
        const width = this.fx.w * BARRIER_PIXEL.scale;
        this.villageWall = village
            ? spriteNode('barrier_village_' + element, width, width * 0.224, parent)
                ?? spriteNode('barrier_village_basic', width, width * 0.224, parent)
            : null;
        this.wallCracks = null;
        this.damageStage = -1;
        if (this.villageWall) {
            this.wallCracks = makeNode('wallCracks', this.villageWall).addComponent(Graphics);
            this.villageWall.getComponent(UITransform)!.setAnchorPoint(0.5, 8 / 224);
            this.villageWall.setPosition(this.node.position);
            this.villageWall.setSiblingIndex(this.node.getSiblingIndex());
        }
        this.node.getComponent(Sprite)!.enabled = !this.villageWall;
        this.input.element = element;
        this.accumulator = 1;
    }

    private updateWallCracks(): void {
        const cracks = this.wallCracks;
        if (!cracks) return;
        const hp = this.input.health;
        const stage = hp < 0.3 ? 2 : hp < 0.6 ? 1 : 0;
        if (stage === this.damageStage) return;
        this.damageStage = stage;
        cracks.clear();
        const unit = this.fx.w * BARRIER_PIXEL.scale / 1000;
        const positions = stage === 2 ? [-365, -160, 146, 350] : stage === 1 ? [-160, 146] : [];
        cracks.lineWidth = 3 * unit;
        cracks.strokeColor = hex('#120F1D', 225);
        for (const x of positions) {
            const direction = x < 0 ? 1 : -1;
            cracks.moveTo(x * unit, 89 * unit);
            cracks.lineTo((x + direction * 12) * unit, 69 * unit);
            cracks.lineTo((x - direction * 4) * unit, 49 * unit);
            cracks.lineTo((x + direction * 8) * unit, 26 * unit);
            cracks.moveTo((x - direction * 4) * unit, 49 * unit);
            cracks.lineTo((x - direction * 24) * unit, 40 * unit);
            cracks.stroke();
        }
    }

    hit(x: number): void {
        this.fx.hit(x);
        this.hitFlash = 0.14;
        this.accumulator = 1;
    }

    update(dt: number, hp: number, max: number, level: number): void {
        if (!this.node.isValid) return;
        this.input.health = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
        this.input.level = level;
        if (this.villageWall) {
            this.hitFlash = Math.max(0, this.hitFlash - dt);
            this.villageWall.active = this.input.health > 0;
            setOpacity(this.villageWall, Math.round(255 - 75 * this.hitFlash / 0.14));
            this.node.getComponent(Sprite)!.enabled = this.input.health <= 0;
            if (this.input.health > 0) {
                this.updateWallCracks();
                return;
            }
        }
        this.accumulator += Math.max(0, Math.min(dt, 0.1));
        if (this.accumulator < 0.05) return;
        this.fx.step(Math.min(this.accumulator, 0.1), this.input);
        this.accumulator = 0;
        this.fx.render(this.input);
        this.tex.uploadData(this.fx.data);
    }
}
