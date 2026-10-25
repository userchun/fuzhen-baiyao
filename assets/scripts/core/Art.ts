import { resources, Texture2D, SpriteFrame, Sprite, Node, UITransform } from 'cc';
import { makeNode } from './Draw';

// 美术素材：启动时加载 resources/textures 下全部图片，按文件名取 SpriteFrame。
// 素材缺失时各处退回代码色块绘制（story-007 验收标准）。

const frames = new Map<string, SpriteFrame>();

/** 妖怪图片的腹部字印位置与显示比例。sealY：字印中心距图片顶部的比例；scale：图片边长 / 碰撞直径 */
export const ENEMY_ART: Record<string, { tex: string; sealY: number; sealR: number; scale: number }> = {
    // scale = 显示边长 / 碰撞直径；相对上一轮再 ×1.45（约 +45%）
    paperman: { tex: 'enemy_paperman', sealY: 0.56, sealR: 0.16, scale: 3.05 },
    jiangshi: { tex: 'enemy_jiangshi', sealY: 0.72, sealR: 0.13, scale: 3.05 },
    foxfire: { tex: 'enemy_foxfire', sealY: 0.75, sealR: 0.12, scale: 3.4 },
    lantern: { tex: 'enemy_lantern', sealY: 0.667, sealR: 0.10, scale: 2.75 },
    shuigui: { tex: 'enemy_shuigui', sealY: 0.61, sealR: 0.125, scale: 3.05 },
    tongjia: { tex: 'enemy_tongjia', sealY: 0.69, sealR: 0.12, scale: 3.05 },
    heishan: { tex: 'boss_heishan', sealY: 0.74, sealR: 0.12, scale: 2.75 },
    baigu: { tex: 'boss_baigu_metal', sealY: 0.65, sealR: 0.10, scale: 3.05 },
};

/** 加载全部素材；失败不抛错，只是 frames 为空 */
export function loadArt(): Promise<void> {
    return new Promise((resolve) => {
        const infos = resources.getDirWithPath('textures', Texture2D);
        if (infos.length === 0) { resolve(); return; }
        let left = infos.length;
        infos.forEach((info) => {
            resources.load(info.path, Texture2D, (err, tex) => {
                if (!err && tex) {
                    const sf = new SpriteFrame();
                    sf.texture = tex;
                    // 路径形如 textures/enemy_paperman/texture，取中间段作名字
                    frames.set(info.path.split('/')[1], sf);
                }
                if (--left === 0) resolve();
            });
        });
    });
}

export function hasArt(name: string): boolean {
    return frames.has(name);
}

/** 取已加载的 SpriteFrame；素材不存在时返回 null */
export function getFrame(name: string): SpriteFrame | null {
    return frames.get(name) ?? null;
}

/** 生成指定尺寸的图片节点；素材不存在时返回 null */
export function spriteNode(name: string, w: number, h: number, parent?: Node): Node | null {
    const sf = frames.get(name);
    if (!sf) return null;
    const n = makeNode(name, parent, w, h);
    const sp = n.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    sp.spriteFrame = sf;
    n.getComponent(UITransform).setContentSize(w, h);
    return n;
}

/** 替换已有图片节点的贴图（如白骨夫人换相）；素材不存在时不变 */
export function setFrame(node: Node, name: string): void {
    const sf = frames.get(name);
    const sp = node.getComponent(Sprite);
    if (sf && sp) sp.spriteFrame = sf;
}
