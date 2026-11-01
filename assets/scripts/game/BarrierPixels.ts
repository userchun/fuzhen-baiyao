/**
 * 像素结界：整道结界画在一张低分辨率 RGBA 画布上（每格 = 游戏里 3×3），
 * 由 BarrierView 以最近邻放大显示，保证和⑤精致像素画风同一像素密度。
 * 本文件不依赖 cc，可在 Node 里直接运行出图检查。
 *
 * 画面从下到上：地面反光 → 接地亮线 → 抖动薄膜（斜纹流光、横扫光、滚动符文带）→ 顶边符阵节点；
 * 两端是镇妖旗杆（石座、木杆、朱砂符旗、灯笼）。受击有波纹和碎光，结界值低时出现裂纹、闪烁，归零时碎裂。
 */
import type { BarrierElement } from './BarrierArt';

export const BARRIER_PIXEL = {
    scale: 3,      // 每个像素格在游戏里的边长
    height: 62,    // 画布高（像素格）
    wallRow: 8,    // 接地线所在行（自下往上数）；对应游戏里的 wallY
    curtain: 22,   // 薄膜高度（像素格）
};

type RGB = [number, number, number];
const rgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** 每个元素 4 级色阶：暗 / 主 / 亮 / 高光 */
const RAMPS: Record<BarrierElement, string[]> = {
    metal: ['#A86F12', '#F4B41B', '#FFE9A0', '#FFFBEA'],
    wood: ['#2F7A55', '#63B788', '#C4EBA8', '#F0FFE6'],
    water: ['#2F6E9E', '#64B9DE', '#CFEEFA', '#F2FBFF'],
    fire: ['#9C3320', '#E7764D', '#FFD69A', '#FFF4E0'],
    earth: ['#7A6236', '#BCA16B', '#EBD3A2', '#FFF6E2'],
};
const STEP_ALPHA = [0, 62, 130, 210, 255];

const C = {
    ink: rgb('#1A1C2C'), wood: rgb('#4A3226'), woodL: rgb('#7A5536'),
    cloth: rgb('#E8E4D9'), clothS: rgb('#B9AE98'), red: rgb('#BC2525'), redD: rgb('#7E1A22'),
    roof: rgb('#2A3150'), roofL: rgb('#3E4870'), stone: rgb('#5C6B7A'), stoneL: rgb('#8A90A0'),
    lamp: rgb('#E2701F'), lampL: rgb('#FFD27A'),
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((n) => n / 16);

/** 5×7 篆意符文，只求像符、不对应真实文字 */
const GLYPHS = [
    ['#####', '..#..', '#####', '#.#.#', '#####', '..#..', '#####'],
    ['.###.', '#...#', '..#..', '#####', '..#..', '#.#.#', '#...#'],
    ['#.#.#', '#####', '..#..', '.###.', '..#..', '#####', '#...#'],
    ['#####', '....#', '###.#', '#.#.#', '#...#', '#####', '..#..'],
    ['..#..', '#####', '#...#', '#.#.#', '#...#', '#####', '..#..'],
    ['#...#', '.#.#.', '#####', '..#..', '#####', '.#.#.', '#...#'],
];

const hash = (a: number, b: number, c: number): number => {
    let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

interface Spark { x: number; y: number; vx: number; vy: number; g: number; life: number; max: number; kind: 0 | 1 | 2; }
interface Crack { thr: number; pts: number[]; }

export interface BarrierPixelInput { element: BarrierElement; health: number; level: number; }

export class BarrierPixels {
    readonly w: number;
    readonly h = BARRIER_PIXEL.height;
    /** RGBA，第 0 行是画面最上方 */
    readonly data: Uint8Array;
    private t = 0;
    private broken = false;
    private sparks: Spark[] = [];
    private hits: { x: number; age: number }[] = [];
    private cracks: Crack[] = [];
    private rand: () => number;
    private spawnAcc = 0;
    private readonly mx0: number;
    private readonly mx1: number;
    private readonly top: number;

    private readonly widthUnits: number;

    constructor(widthUnits: number, seed = 7) {
        this.widthUnits = widthUnits;
        this.w = Math.round(widthUnits / BARRIER_PIXEL.scale);
        this.data = new Uint8Array(this.w * this.h * 4);
        this.rand = mulberry32(seed);
        this.mx0 = 12;
        this.mx1 = this.w - 13;
        this.top = BARRIER_PIXEL.wallRow + BARRIER_PIXEL.curtain;
        this.makeCracks();
    }

    /** 游戏坐标 x（以结界中心为 0）转像素列 */
    toPx(x: number): number { return Math.round((x + this.widthUnits / 2) / BARRIER_PIXEL.scale); }

    hit(gameX: number): void {
        const x = Math.max(this.mx0, Math.min(this.mx1, this.toPx(gameX)));
        this.hits.push({ x, age: 0 });
        if (this.hits.length > 8) this.hits.shift();
        const r = this.rand;
        for (let i = 0; i < 10; i++) {
            const dir = r() < 0.5 ? -1 : 1;
            this.sparks.push({ x, y: BARRIER_PIXEL.wallRow + 2 + r() * 8, vx: dir * (10 + r() * 28), vy: 12 + r() * 22,
                g: -45, life: 0, max: 0.35 + r() * 0.3, kind: r() < 0.3 ? 1 : 0 });
        }
    }

    step(dt: number, inp: BarrierPixelInput): void {
        this.t += dt;
        const r = this.rand, wr = BARRIER_PIXEL.wallRow;
        if (inp.health <= 0 && !this.broken) {
            this.broken = true;
            for (let i = 0; i < 70; i++) {
                const x = this.mx0 + r() * (this.mx1 - this.mx0);
                this.sparks.push({ x, y: wr + r() * BARRIER_PIXEL.curtain, vx: (r() - 0.5) * 30, vy: 4 + r() * 18,
                    g: -70, life: 0, max: 0.6 + r() * 0.5, kind: 2 });
            }
        } else if (inp.health > 0) this.broken = false;
        if (!this.broken) {
            this.spawnAcc += dt * 14 * (0.4 + 0.6 * inp.health);
            while (this.spawnAcc >= 1) {
                this.spawnAcc--;
                const fromTop = r() < 0.6;
                this.sparks.push({ x: this.mx0 + r() * (this.mx1 - this.mx0), y: fromTop ? this.top - r() * 3 : wr + r() * 3,
                    vx: (r() - 0.5) * 2, vy: 5 + r() * 9, g: 0, life: 0, max: 0.7 + r() * 0.7, kind: r() < 0.15 ? 1 : 0 });
            }
        }
        for (const s of this.sparks) {
            s.life += dt; s.vy += s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        }
        this.sparks = this.sparks.filter((s) => s.life < s.max && s.y > -2 && s.y < this.h + 2);
        if (this.sparks.length > 220) this.sparks.splice(0, this.sparks.length - 220);
        for (const hit of this.hits) hit.age += dt;
        this.hits = this.hits.filter((hit) => hit.age < 0.5);
    }

    render(inp: BarrierPixelInput): void {
        this.data.fill(0);
        const ramp = RAMPS[inp.element].map(rgb);
        if (!this.broken) {
            this.drawGround(inp, ramp);
            this.drawCurtain(inp, ramp);
            this.drawNodes(inp, ramp);
            this.drawCracks(inp, ramp);
        }
        this.drawSparks(ramp);
        this.drawPost(8, 1, ramp);
        this.drawPost(this.w - 9, -1, ramp);
    }

    // ---------- 绘制 ----------

    private put(x: number, y: number, c: RGB, a: number): void {
        x = Math.round(x); y = Math.round(y);
        if (x < 0 || x >= this.w || y < 0 || y >= this.h || a <= 0) return;
        const i = ((this.h - 1 - y) * this.w + x) * 4, d = this.data;
        const sa = Math.min(255, a) / 255, da = d[i + 3] / 255, oa = sa + da * (1 - sa);
        for (let k = 0; k < 3; k++) d[i + k] = Math.round((c[k] * sa + d[i + k] * da * (1 - sa)) / oa);
        d[i + 3] = Math.round(oa * 255);
    }

    /** 按色阶值 v（0~4）配合 Bayer 抖动落成一个像素 */
    private dot(x: number, y: number, v: number, ramp: RGB[], cap = 4): void {
        const s = Math.min(cap, Math.floor(v + BAYER[(x & 3) + ((y & 3) << 2)]));
        if (s > 0) this.put(x, y, ramp[s - 1], STEP_ALPHA[s]);
    }

    private healthMul(h: number): number {
        if (h >= 0.6) return 1;
        if (h >= 0.3) return 0.82;
        return 0.72 + (Math.floor(this.t * 10) % 4 === 0 ? -0.25 : 0.05);
    }

    /**
     * 受击：撞击点一圈菱形波纹向外扩散 + 核心闪白；上下边线各有一道亮光沿边跑开。
     * edge=true 表示该像素在接地线或顶边上。
     */
    private hitBoost(x: number, y: number, edge: boolean): number {
        let b = 0;
        const cy = BARRIER_PIXEL.wallRow + 6;
        for (const hit of this.hits) {
            const k = 1 - hit.age / 0.5, dx = Math.abs(x - hit.x);
            const dist = dx + Math.abs(y - cy) * 1.3, ring = hit.age * 55;
            if (Math.abs(dist - ring) < 1.3) b += 2.2 * k;
            else if (dist < ring) b += 0.6 * k;
            if (hit.age < 0.1 && dist < 4) b += 3;
            if (edge && Math.abs(dx - hit.age * 130) < 2) b += 2.4 * k;
        }
        return b;
    }

    private drawGround(inp: BarrierPixelInput, ramp: RGB[]): void {
        const wr = BARRIER_PIXEL.wallRow, pulse = 0.2 * Math.sin(this.t * 3);
        for (let y = wr - 6; y < wr; y++) {
            for (let x = this.mx0; x <= this.mx1; x++) {
                const v = (1.3 - (wr - 1 - y) * 0.26 + pulse) * this.healthMul(inp.health) + this.hitBoost(x, wr, false) * 0.4;
                this.dot(x, y, v, ramp, 2);
            }
        }
    }

    private drawCurtain(inp: BarrierPixelInput, ramp: RGB[]): void {
        const wr = BARRIER_PIXEL.wallRow, top = this.top, t = this.t, H = BARRIER_PIXEL.curtain;
        const m = this.healthMul(inp.health), lv = Math.min(5, inp.level) * 0.08;
        const sweepX = -30 + ((t % 3.2) / 3.2) * (this.w + 60);
        const scroll = Math.floor(t * 5), hatch = Math.floor(t * 10), dash = Math.floor(t * 12);
        const bandLo = wr + 8, bandHi = wr + 14, SLOT = 15;
        const low = inp.health < 0.3;
        for (let x = this.mx0; x <= this.mx1; x++) {
            const edge = Math.min(x - this.mx0, this.mx1 - x);
            const fadeEnd = edge < 3 ? 0.55 + edge * 0.15 : 1;
            // 部分列有一段亮光往上升，像蒸腾的灵气
            const riser = hash(x, 0, 0) < 0.14 ? ((t * 16 + hash(x, 1, 0) * 60) % (H + 10)) - 5 + wr : -99;
            for (let y = wr; y <= top; y++) {
                if (low && y > wr + 1 && y < top && hash(x >> 1, y >> 1, Math.floor(t * 8)) < 0.18) continue;
                const f = (y - wr) / H, onEdge = y === wr || y === top;
                let v = 1.75 * Math.exp(-f * 3.6) + 0.25;                                // 下实上虚，大部分通透
                if (y === wr) v = 3.3; else if (y === wr + 1) v = 2.4;
                else if (y === top) v = 3.0; else if (y === top - 1) v = 1.7;
                else {
                    if ((x + y + hatch) % 11 === 0) v += 0.55;                      // 斜纹流光
                    const dy = Math.abs(y - riser);
                    if (dy < 3) v += 1.4 * (1 - dy / 3);
                    if (y === bandLo - 2 || y === bandHi + 2) {                     // 符文带上下虚线
                        if (((x + dash) & 3) === 0) v = Math.max(v, 2.1);
                    } else if (y >= bandLo && y <= bandHi) {                         // 滚动符文
                        const u = x - this.mx0 - scroll, slot = Math.floor(u / SLOT), gx = (((u % SLOT) + SLOT) % SLOT) - 5;
                        if (gx >= 0 && gx < 5) {
                            const g = GLYPHS[(((slot * 5 + 3) % 6) + 6) % 6];
                            if (g[bandHi - y][gx] === '#') v = Math.max(v, 2.1 + 1.7 * Math.max(0, Math.sin(t * 2.5 - slot * 0.9)));
                        }
                    }
                    v += lv;
                }
                const d = (x - sweepX) - (y - wr) * 0.7;                              // 横扫光
                if (Math.abs(d) < 1.5) v += 1.8; else if (Math.abs(d) < 4) v += 0.6;
                this.dot(x, y, v * m * fadeEnd + this.hitBoost(x, y, onEdge), ramp);
            }
        }
    }

    /** 顶边符阵节点：小菱形，亮度依次流过 */
    private drawNodes(inp: BarrierPixelInput, ramp: RGB[]): void {
        const top = this.top, m = this.healthMul(inp.health);
        for (let k = 0, x = this.mx0 + 8; x < this.mx1 - 4; x += 16, k++) {
            const p = Math.max(0, Math.sin(this.t * 3 - k * 0.5));
            this.dot(x, top + 2, (2 + p * 1.5) * m, ramp);
            this.dot(x - 1, top + 1, (1.8 + p) * m, ramp);
            this.dot(x + 1, top + 1, (1.8 + p) * m, ramp);
            this.dot(x, top + 1, (3 + p) * m, ramp);
        }
    }

    private makeCracks(): void {
        const r = mulberry32(31), wr = BARRIER_PIXEL.wallRow, n = 8, span = this.mx1 - this.mx0;
        for (let i = 0; i < n; i++) {
            const fromTop = i % 2 === 0;
            let x = Math.round(this.mx0 + (i + 0.3 + r() * 0.4) * span / n), y = fromTop ? this.top : wr;
            const pts: number[] = [], len = 9 + Math.floor(r() * 9);
            for (let k = 0; k < len; k++) {
                pts.push(x, y);
                y += fromTop ? -1 : 1;
                x += r() < 0.45 ? (r() < 0.5 ? -1 : 1) : 0;
            }
            this.cracks.push({ thr: 0.62 - i * 0.065, pts });
        }
        this.cracks.sort(() => r() - 0.5);
        this.cracks.forEach((c, i) => { c.thr = 0.62 - i * 0.065; });
    }

    private drawCracks(inp: BarrierPixelInput, ramp: RGB[]): void {
        for (const c of this.cracks) {
            if (inp.health >= c.thr) continue;
            const frac = Math.min(1, 0.4 + (c.thr - inp.health) / 0.15), n = Math.ceil(c.pts.length / 2 * frac);
            for (let k = 0; k < n; k++) {
                const x = c.pts[k * 2], y = c.pts[k * 2 + 1];
                // 亮色裂缝：暗底上用高光芯线 + 两侧主色描边才看得清
                this.put(x - 1, y, ramp[1], 170);
                this.put(x + 1, y, ramp[1], 170);
                this.put(x, y, ramp[3], 255);
            }
        }
    }

    private drawSparks(ramp: RGB[]): void {
        for (const s of this.sparks) {
            const left = 1 - s.life / s.max;
            const col = left > 0.66 ? ramp[3] : left > 0.33 ? ramp[2] : ramp[1];
            const a = left < 0.2 ? 120 : 255;
            if (s.kind === 2) {                                    // 碎片：2×2 / 2×1
                this.put(s.x, s.y, col, a); this.put(s.x + 1, s.y, col, a);
                if (left > 0.5) { this.put(s.x, s.y + 1, ramp[1], a); this.put(s.x + 1, s.y + 1, ramp[0], a); }
                continue;
            }
            this.put(s.x, s.y, col, a);
            if (s.kind === 1 && left > 0.3 && left < 0.85) {       // 十字闪星
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) this.put(s.x + dx, s.y + dy, ramp[1], 200);
            }
        }
    }

    /** 镇妖旗杆。bx 为杆身左列，dir=1 时符旗朝右（左侧杆），-1 时镜像 */
    private drawPost(bx: number, dir: 1 | -1, ramp: RGB[]): void {
        const wr = BARRIER_PIXEL.wallRow, t = this.t;
        const p = (dx: number, y: number, c: RGB, a = 255) => this.put(bx + dx * dir, y, c, a);
        const row = (x0: number, x1: number, y: number, c: RGB, a = 255) => { for (let x = x0; x <= x1; x++) p(x, y, c, a); };
        const LY = 40;  // 灯笼中心行

        // 灯笼光晕（先画，压在杆身下面）
        const lit = this.broken ? 0.35 : 0.8 + 0.2 * Math.sin(t * 9 + bx) * Math.sin(t * 4.3);
        for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > 7.2) continue;
            const v = (1.5 - d * 0.22) * lit;
            if (v + BAYER[((bx + dx) & 3) + (((LY + dy) & 3) << 2)] >= 1) p(-5 + dx, LY + dy, C.lampL, 50);
        }
        // 石座
        row(-5, 6, wr - 3, C.ink);
        row(-5, 6, wr - 2, C.stone); p(-5, wr - 2, C.ink); p(6, wr - 2, C.ink);
        row(-4, 5, wr - 1, C.stoneL); p(-5, wr - 1, C.ink); p(6, wr - 1, C.ink);
        row(-3, 4, wr, C.stone); p(-4, wr, C.ink); p(5, wr, C.ink);
        // 木杆
        for (let y = wr + 1; y <= 53; y++) {
            p(-1, y, C.ink); p(0, y, y % 7 === 0 ? C.wood : C.woodL); p(1, y, C.wood); p(2, y, C.ink);
        }
        // 杆顶小檐和宝顶
        row(-5, 6, 54, C.ink);
        row(-4, 5, 55, C.roof); p(-5, 55, C.ink); p(6, 55, C.ink);
        row(-3, 4, 56, C.roofL); p(-4, 56, C.ink); p(5, 56, C.ink);
        row(-1, 2, 57, C.ink);
        p(0, 58, ramp[1]); p(1, 58, ramp[0]); p(0, 59, ramp[2]); p(1, 59, ramp[1]); p(0, 60, ramp[3]);
        // 横担
        row(3, 14, 51, C.woodL); row(3, 14, 50, C.wood); row(3, 14, 49, C.ink); p(15, 50, C.ink); p(15, 51, C.ink);
        // 朱砂符旗（9 格宽）：随风轻摆，越往下摆得越多
        const MARK = [  // 自上而下，对应 dx 5..11；r=朱砂，g=元素主色，d=元素暗色
            '.rrrrr.', '...r...', 'rrrrrrr', 'r..r..r', '...r...',
            '..ggg..', '.g...g.', '.g.d.g.', '.g...g.', '..ggg..',
            '...r...', '.rrrrr.', '...r...', '..r.r..', '.r...r.',
        ];
        const sway = (y: number, amp = 1) => Math.round(Math.sin(t * 2.2 - (48 - y) * 0.15) * amp * (48 - y) / 22);
        for (let y = 48; y >= 24; y--) {
            const o = sway(y);
            const q = (dx: number, c: RGB) => p(dx + o, y, c);
            q(3, C.ink); q(13, C.ink);
            const hem = y >= 46 || y <= 25;
            for (let dx = 4; dx <= 12; dx++) {
                if (hem) q(dx, y === 46 || y === 24 ? C.redD : C.red);
                else q(dx, dx === 12 ? C.clothS : C.cloth);
            }
            if (hem) continue;
            const line = MARK[44 - y];
            if (!line) continue;
            for (let i = 0; i < 7; i++) {
                const ch = line[i];
                if (ch === 'r') q(5 + i, C.red); else if (ch === 'g') q(5 + i, ramp[1]); else if (ch === 'd') q(5 + i, ramp[0]);
            }
        }
        for (let y = 23; y >= 19; y--) {                                  // 两条旗尾
            const o = sway(y, 1.6), c = y === 19 ? C.redD : C.red;
            p(5 + o, y, c); if (y > 20) p(6 + o, y, c);
            p(10 + o, y, c); if (y > 20) p(11 + o, y, c);
        }
        // 灯笼：挂在杆外侧
        row(-5, -2, 47, C.wood); p(-5, 46, C.ink); p(-5, 45, C.ink);
        row(-7, -3, 44, C.ink);
        const flame = lit > 0.85 ? C.lampL : C.lamp;
        for (let y = 37; y <= 43; y++) {
            const wide = y > 37 && y < 43;
            p(wide ? -8 : -7, y, C.ink); p(wide ? -2 : -3, y, C.ink);
            for (let dx = -7; dx <= -3; dx++) p(dx, y, dx === -5 ? flame : (dx === -7 || dx === -3) ? C.redD : C.lamp);
        }
        p(-5, 40, lit > 0.9 ? ramp[3] : C.lampL); p(-5, 41, C.lampL);
        row(-7, -3, 36, C.ink);
        p(-5, 35, C.red); p(-5, 34, C.red); p(-5, 33, C.redD);
    }
}
