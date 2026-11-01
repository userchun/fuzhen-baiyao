import { Node, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import { makeNode } from '../core/Draw';
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

    setElement(element: BarrierElement): void {
        this.input.element = element;
        this.accumulator = 1;
    }

    hit(x: number): void {
        this.fx.hit(x);
        this.accumulator = 1;
    }

    update(dt: number, hp: number, max: number, level: number): void {
        if (!this.node.isValid) return;
        this.input.health = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
        this.input.level = level;
        this.accumulator += Math.max(0, Math.min(dt, 0.1));
        if (this.accumulator < 0.05) return;
        this.fx.step(Math.min(this.accumulator, 0.1), this.input);
        this.accumulator = 0;
        this.fx.render(this.input);
        this.tex.uploadData(this.fx.data);
    }
}
