// 天雷符（无属性）：天顶乌云翻涌、雷符一闪，第一道落雷劈中目标，随后电弧贴地跳向下一只妖怪，
// 每跳一下再劈一道雷，形成连锁；每个落点闪光、电火花四溅，地面留一圈残电。
// 等级越高连锁越多（玩法：每级连锁 +1）、雷更粗：3 级起雷有分叉、落点残电爬行，5 级末尾一道紫金巨雷。
// 折线闪电的画法参考 PixelFX lightning/chain-lightning（MIT）。
import { fit, clamp, rng } from "../../core/index.js";
import { FRAME, groundMark, sigil, shock, rays, flash, scatter, levelUp } from "./_lib.js";

export const meta = {
  name: "天雷符 · 连锁落雷",
  desc: "乌云蓄雷、落雷劈下、电弧连锁跳跃，随等级变强。",
  tags: ["fuzhen", "thunder"], ...FRAME, duration: 2.0, loop: true, fps: 30, bg: "dark",
  options: {
    palette: ["#100a22", "#22184a", "#3e2e8a", "#5e52cc", "#8e8cf6", "#c4ccff", "#f2f4ff"],
    gold: "#ffd870", // 5 级巨雷的金色
    level: 1, // 符咒等级 1–5
    chain: 2, // 1 级连锁目标数（每级 +1）
    charge: 0.25, // 乌云蓄雷（秒）
    gap: 0.1, // 每次连锁间隔（秒）
    width: 3, // 雷的粗细
    sparks: 10, // 每个落点电火花数量
    flash: 0.4,
    seed: 5,
  },
};

const TOP = -168;
// 目标落点：在画面里左右跳，带一点前后深度
const SPOTS = [[0, 0], [34, -8], [-30, 6], [48, 10], [-50, -6], [18, 12], [-14, -12]];

// 一道折线闪电：每 1/30 秒换一次形状，白芯 + 彩色外光，3 级起带分叉
function bolt(p, x0, y0, x1, y1, w, C, k, seed, branches) {
  const r = rng(seed), n = 9, pts = [[x0, y0]];
  for (let i = 1; i < n; i++) {
    const q = i / n;
    pts.push([x0 + (x1 - x0) * q + r.range(-6, 6) * (1 - Math.abs(q - 0.5)), y0 + (y1 - y0) * q]);
  }
  pts.push([x1, y1]);
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    p.glowLine(ax, ay, bx, by, w * 3, C[3], 0.6 * k);
    p.beam(ax, ay, bx, by, w, C[5], k);
    p.line(ax, ay, bx, by, C[6], k);
  }
  if (branches) for (let b = 0; b < 2 + branches; b++) {
    let [bx, by] = pts[2 + Math.floor(r.next() * (n - 3))];
    const side = r.sign();
    for (let s = 0; s < 4; s++) {
      const nx = bx + side * r.range(3, 7), ny = by + r.range(2, 7);
      p.line(bx, by, nx, ny, C[5], k * 0.8);
      p.glowLine(bx, by, nx, ny, 3, C[3], 0.35 * k);
      bx = nx; by = ny;
    }
  }
}

// 贴地电弧：两个落点之间一条低矮的跳动折线
function arc(p, a, b, C, k, seed) {
  const r = rng(seed), n = 8;
  let [px, py] = a;
  for (let i = 1; i <= n; i++) {
    const q = i / n, x = a[0] + (b[0] - a[0]) * q, y = a[1] + (b[1] - a[1]) * q - Math.sin(q * Math.PI) * 10 + r.range(-3, 3);
    p.line(px, py, x, y, C[6], k);
    p.glowLine(px, py, x, y, 3, C[4], 0.5 * k);
    px = x; py = y;
  }
}

export function draw(p, t, o) {
  o = levelUp(o, { width: 0.12, sparks: 0.3, flash: 0.1 });
  const C0 = fit(o.palette, 7), G = fit([o.gold], 1)[0], S = o.seed, A = o.charge;
  const n = Math.min(SPOTS.length, Math.round(o.chain) + o.lv - 1), frame = Math.floor(t * 30);
  // 乌云：天顶一排翻涌的暗团，蓄雷时内部闪亮
  const cloudK = clamp(t / 0.15) * clamp(1 - (t - A - n * o.gap - 0.4) / 0.4);
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * 14 + Math.sin(t * 2 + i) * 3, y = TOP + 6 + (i % 2) * 4;
    p.disc(x, y, 9 + (i % 3) * 2, () => C0[1], 0.85 * cloudK);
    p.disc(x - 2, y - 2, 5, () => C0[2], 0.7 * cloudK);
  }
  if (t < A) {
    const k = t / A;
    if (frame % 4 < 2) p.glow((frame % 5 - 2) * 12, TOP + 8, 20, C0[4], 0.6 * k);
    sigil(p, 26, t * 6, C0[4], C0[5], k, 3);
    return;
  }
  const u = t - A;
  for (let i = 0; i < n; i++) {
    const t0 = i * o.gap, v = u - t0;
    if (v < 0) continue;
    const [x, y] = SPOTS[i], k = clamp(1 - (v - 0.12) / 0.15), fade = clamp(1 - (v - 0.5) / 0.4);
    const C = C0;
    // 连锁电弧：从上一个落点跳过来
    if (i > 0 && v < 0.12) arc(p, SPOTS[i - 1], [x, y], C, 1 - v / 0.12, S * 31 + frame);
    // 落雷
    if (k > 0) bolt(p, x + rng(S, i).range(-10, 10), TOP + 14, x, y, o.width * (i === 0 ? 1.3 : 1), C, k, S * 97 + i * 13 + frame, o.lv >= 3 ? o.lv - 2 : 0);
    if (v < 0.08) { flash(p, C[6], o.flash * (i === 0 ? 1 : 0.5) * (1 - v / 0.08)); rays(p, x, y - 3, 8, 22, C[6], 1 - v / 0.08, v * 3); }
    p.place(p.tx + x, p.ty + y);
    shock(p, 24 * clamp(v / 0.25), 2, C[5], clamp(1 - v / 0.3));
    groundMark(p, 12, C[4], 0.45 * fade);
    // 3 级起残电：落点周围几条短电丝乱爬
    if (o.lv >= 3) for (let j = 0; j < 3; j++) {
      const r = rng(S, 300 + i * 7 + j + frame);
      if (fade > 0 && r.chance(0.6)) p.line(r.range(-8, 8), r.range(-2, 2), r.range(-12, 12), r.range(-3, 1), C[6], fade);
    }
    scatter(v, Math.round(o.sparks), S + i, { speed: [40, 100], up: 0.7, g: 260, life: [0.2, 0.45] }, (sx, sy, vx, vy, kk) => {
      p.line(sx, sy - 2, sx - vx * 0.02, sy - 2 - vy * 0.02, kk > 0.5 ? C[6] : C[4]);
    });
    p.place(p.tx - x, p.ty - y);
  }
  // 5 级：连锁结束后一道紫金巨雷劈在正中
  if (o.lv >= 5) {
    const v = u - n * o.gap - 0.05;
    if (v >= 0 && v < 0.45) {
      const k = clamp(1 - (v - 0.15) / 0.3), CG = [C0[0], C0[1], C0[2], G, C0[4], G, C0[6]];
      bolt(p, 0, TOP + 10, 0, 0, o.width * 2.6, CG, k, S * 7 + frame, 4);
      if (v < 0.1) { flash(p, G, 0.9 * (1 - v / 0.1)); rays(p, 0, -4, 14, 50, G, 1 - v / 0.1, v * 4); }
      shock(p, 60 * clamp(v / 0.35), 3, G, clamp(1 - v / 0.45));
      shock(p, 40 * clamp(v / 0.3), 2, C0[6], clamp(1 - v / 0.35));
    }
  }
}
