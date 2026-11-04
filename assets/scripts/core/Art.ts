import { resources, Texture2D, SpriteFrame, Sprite, Node, UITransform, Rect, Size } from 'cc';
import { makeNode } from './Draw';
import { FX_SHEETS, FX_COLS } from '../config/FxSheets';

// 美术素材：启动时加载 resources/textures 下全部图片，按相对路径取 SpriteFrame。
// 素材缺失时各处退回代码色块绘制（story-007 验收标准）。
// 键名：textures/ 之后、去掉末尾 /texture 的路径。
//   textures/enemy_jiangshi/texture           → enemy_jiangshi
//   textures/anim/player_taoist/idle_00/texture → anim/player_taoist/idle_00

const frames = new Map<string, SpriteFrame>();

/** 妖怪图片的腹部字印位置与显示比例。sealY：字印中心距图片顶部的比例；sealX：距左边的比例（默认 0.5 居中）；scale：图片边长 / 碰撞直径 */
/** sealYFrames：可选，move 每帧的字印 Y（同 sealY 比例），用于下蹲等胸口高度变化大的动作 */
export const ENEMY_ART: Record<string, { tex: string; sealY: number; sealX?: number; sealR: number; scale: number; sealYFrames?: number[] }> = {
    // scale = 显示边长 / 碰撞直径。2026-10-31 按图里角色实际可见高度统一：普通小怪 150（纸人身形瘦，放到 165 看起来才一样大）、精英（铜甲尸、灯笼鬼）190（取 12 帧中位高度）
    paperman: { tex: 'enemy_paperman', sealY: 0.29, sealX: 0.50, sealR: 0.035, scale: 1.98 }, // 2026-11-02 纸扎童子：256 方帧、12 帧移动；额符字印，显示边长 99，脚底 0.94
    jiangshi: { tex: 'enemy_jiangshi', sealY: 0.29, sealX: 0.53, sealR: 0.035, scale: 1.65 }, // 2026-11-02 行尸：256方帧、12帧拖步直走，额符；移除旧泥尸跳跃封印轨迹
    foxfire: { tex: 'enemy_foxfire', sealY: 0.5, sealX: 0.50, sealR: 0, scale: 2.36 }, // 2026-11-02 鬼火：256方帧、12帧火舌循环；无实体符纸，不覆盖鬼脸，保留属性角标
    lantern: { tex: 'enemy_lantern', sealY: 0.5, sealX: 0.5, sealR: 0, scale: 2.52 }, // 2026-11-02 荒村全动作新素材，保留属性角标，不覆盖主体特征
    tongqian: { tex: 'enemy_tongqian', sealY: 0.5, sealX: 0.5, sealR: 0, scale: 1.9 }, // 2026-11-02 荒村全动作新素材，保留属性角标，不覆盖主体特征
    shuigui: { tex: 'enemy_shuigui', sealY: 0.5, sealX: 0.5, sealR: 0, scale: 1.98 }, // 2026-11-02 荒村全动作新素材，保留属性角标，不覆盖主体特征
    tongjia: { tex: 'enemy_tongjia', sealY: 0.69, sealR: 0.12, scale: 3.52 },
    heishan: { tex: 'boss_heishan', sealY: 0.5, sealX: 0.5, sealR: 0, scale: 2.0 }, // 2026-11-02 荒村全动作新素材，保留属性角标，不覆盖主体特征
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
export function loadArt(onProgress?: (done: number, total: number) => void): Promise<void> {
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
                    const sheet = key.startsWith('fx/') ? FX_SHEETS[key.slice(3)] : undefined;
                    if (sheet) {
                        // 符咒像素特效精灵表：按帧切成 fx/<名>_NN，像素图用最近邻取样保持锐利
                        tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
                        const [fw, fh, n] = sheet;
                        for (let i = 0; i < n; i++) {
                            const f = new SpriteFrame();
                            f.texture = tex;
                            f.rect = new Rect((i % FX_COLS) * fw, Math.floor(i / FX_COLS) * fh, fw, fh);
                            f.originalSize = new Size(fw, fh);
                            frames.set(`${key}_${String(i).padStart(2, '0')}`, f);
                        }
                    }
                    if (key === 'player_actions') {
                        // 像素符师 4×3 原图；仅引擎取样，不改写生成图片。
                        // 各帧以双脚中心 / 脚底校准，避免换帧左右跳位或浮起。
                        const feet = [
                            [[206,343],[206,343],[194,344],[194,344]],
                            [[203,346],[204,345],[195,345],[194,345]],
                            [[204,334],[201,334],[191,334],[194,339]],
                        ];
                        const cell = 362;
                        ['idle', 'cast', 'hit'].forEach((action, row) => {
                            for (let col = 0; col < 4; col++) {
                                const frame = new SpriteFrame();
                                frame.texture = tex;
                                frame.rect = new Rect(col * cell + feet[row][col][0] - 200,
                                    row * cell + feet[row][col][1] - 343, cell, cell);
                                frame.originalSize = new Size(cell, cell);
                                frames.set(`anim/player_taoist/${action}_${String(col).padStart(2, '0')}`, frame);
                                if (row === 0 && col === 0) frames.set('player_taoist', frame);
                            }
                        });
                    }
                }
                left--;
                onProgress?.(infos.length - left, infos.length);
                if (left === 0) resolve();
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
