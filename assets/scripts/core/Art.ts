import { resources, Texture2D, SpriteFrame, Sprite, Node, UITransform, Rect, Size, ImageAsset } from 'cc';
import { ENEMIES, ELEMENT_NAME } from '../config/GameConfig';
import { makeNode, hex } from './Draw';
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
                if (left === 0) {
                    packEnemyAtlases();
                    resolve();
                }
            });
        });
    });
}

/**
 * 妖怪合图：像素图用最近邻采样，引擎自带的动态合图不收，导致每只妖怪单独一次绘制。
 * 这里在加载完后把每种妖怪的静态图 + 全部动作帧拼进一张图，并把属性角标和字印的汉字也画进去，
 * 同种妖怪就能一次画完。拼图失败（如无 canvas 环境）时保留原来的散图，不影响显示。
 */
const GLYPH = 64;
export function glyphKey(tex: string, ch: string): string {
    return `glyph/${tex}/${ch}`;
}

function packEnemyAtlases(): void {
    if (typeof document === 'undefined') return;
    const groups = new Map<string, string[]>();
    for (const key of frames.keys()) {
        const m = /^anim\/(enemy_[a-z]+)\//.exec(key);
        const group = m ? m[1] : /^enemy_[a-z]+$/.test(key) ? key : null;
        if (!group) continue;
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group)!.push(key);
    }
    for (const [group, keys] of groups) {
        try {
            packGroup(group, keys);
        } catch (e) {
            console.warn('[Art] 妖怪合图失败，保留散图', group, e);
        }
    }
}

function packGroup(group: string, keys: string[]): void {
    const list = keys.map((k) => ({ key: k, sf: frames.get(k)! }));
    const cell = list[0].sf.texture.width;
    // 只合尺寸一致、整张使用的方帧
    for (const { sf } of list) {
        const t = sf.texture;
        if (t.width !== cell || t.height !== cell || sf.rect.width !== cell || sf.rect.height !== cell) return;
    }
    const def = Object.values(ENEMIES).find((d) => ENEMY_ART[d.id]?.tex === group);
    const chars = [...new Set([...Object.values(ELEMENT_NAME).filter(Boolean), ...(def?.char ? [def.char] : [])])];
    const cols = Math.ceil(Math.sqrt(list.length));
    const rows = Math.ceil(list.length / cols);
    const width = Math.max(cols * cell, chars.length * GLYPH);
    const height = rows * cell + GLYPH;
    if (width > 2048 || height > 2048) return;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    list.forEach(({ sf }, i) => {
        const img = (sf.texture as Texture2D).image?.data as CanvasImageSource | undefined;
        if (!img) throw new Error('no image data');
        ctx.drawImage(img, (i % cols) * cell, Math.floor(i / cols) * cell);
    });
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(GLYPH * 0.82)}px sans-serif`;
    chars.forEach((ch, i) => ctx.fillText(ch, i * GLYPH + GLYPH / 2, rows * cell + GLYPH / 2 + 2));

    const tex = new Texture2D();
    tex.image = new ImageAsset(canvas);
    tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
    tex.setMipFilter(Texture2D.Filter.NONE);
    const sub = (x: number, y: number, size: number) => {
        const f = new SpriteFrame();
        f.texture = tex;
        f.rect = new Rect(x, y, size, size);
        f.originalSize = new Size(size, size);
        f.packable = false;
        return f;
    };
    list.forEach(({ key }, i) => frames.set(key, sub((i % cols) * cell, Math.floor(i / cols) * cell, cell)));
    chars.forEach((ch, i) => frames.set(glyphKey(group, ch), sub(i * GLYPH, rows * cell, GLYPH)));
}

/** 合图里的单字贴图（白字，按 color 着色）；没有合图时返回 null，由调用方退回 Label */
export function glyphNode(tex: string, ch: string, size: number, color: string, parent?: Node): Node | null {
    const sf = frames.get(glyphKey(tex, ch));
    if (!sf) return null;
    const n = makeNode('glyph', parent, size, size);
    const sp = n.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    sp.spriteFrame = sf;
    sp.color = hex(color);
    return n;
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
