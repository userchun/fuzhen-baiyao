import { resources, Texture2D, SpriteFrame, Sprite, Node, UITransform } from 'cc';
import { makeNode } from './Draw';

// 美术素材：启动时加载 resources/textures 下全部图片，按相对路径取 SpriteFrame。
// 素材缺失时各处退回代码色块绘制（story-007 验收标准）。
// 键名：textures/ 之后、去掉末尾 /texture 的路径。
//   textures/enemy_jiangshi/texture           → enemy_jiangshi
//   textures/anim/player_taoist/idle_00/texture → anim/player_taoist/idle_00

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

/** 将 resources 路径规范为 art 键 */
export function artKeyFromPath(path: string): string {
    let p = path;
    if (p.startsWith('textures/')) p = p.slice('textures/'.length);
    if (p.endsWith('/texture')) p = p.slice(0, -'/texture'.length);
    return p;
}

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
                    const key = artKeyFromPath(info.path);
                    frames.set(key, sf);
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

/**
 * 按前缀收集序列帧（如 `anim/player_taoist/idle` → idle_00..）。
 * 匹配 `prefix_XX` 形式，按后缀数字排序。
 */
export function getFrames(prefix: string): SpriteFrame[] {
    const re = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_(\\d+)$');
    const matched: { n: number; sf: SpriteFrame }[] = [];
    frames.forEach((sf, key) => {
        const m = key.match(re);
        if (m) matched.push({ n: parseInt(m[1], 10), sf });
    });
    matched.sort((a, b) => a.n - b.n);
    return matched.map((x) => x.sf);
}

/** 调试：已注册键名列表 */
export function listArtKeys(): string[] {
    return [...frames.keys()].sort();
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

/** 直接设置 SpriteFrame（序列帧播放用） */
export function applySpriteFrame(node: Node, sf: SpriteFrame | null): void {
    const sp = node.getComponent(Sprite);
    if (sp && sf) sp.spriteFrame = sf;
}
