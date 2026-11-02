// 金光符：天顶符纸展开、地面金阵亮起、光点向中线汇聚蓄力；
// 光柱劈下的一瞬全屏闪白、光芒炸开，光柱两侧窜出电弧，柱身有光环一节节往下冲，
// 落地冲击波和金屑，最后光柱收成一条细线消散。
// 光束和发光画法借用 PixelFX painter 的 beam / glowLine（MIT）。
import { fit, clamp, rng } from "../../core/index.js";
import { FRAME, scatter, groundMark, talisman, sigil, shock, rays, flash, levelUp } from "./_lib.js";

export const meta = {
  name: "金光符 · 光柱",
  desc: "符纸蓄力、光柱贯穿一列、电弧与冲击波。",
  tags: ["fuzhen", "gold"], ...FRAME, duration: 1.6, loop: true, fps: 30, bg: "dark",
  options: {
    palette: ["#24160a", "#5a3a12", "#94621c", "#c48a2a", "#e6b44a", "#f8dc90", "#fff6dc"],
    level: 1, // 符咒等级 1–5
    charge: 0.18, // 蓄力（秒）——出手频繁，蓄力要短
    width: 11, // 光柱宽度
    hold: 0.32, // 光柱停留（秒）
    arcs: 0, // 两侧电弧（每级 +2） // 两侧电弧数量
    sparks: 14, // 落地金屑数量
    motes: 16, // 光柱里的光点
    talisman: 1, // 天顶符纸（0/1）
    flash: 0.5,
    seed: 4,
  },
};

const TOP = -166;

function pillarFx(p, t, o) {
  const C = fit(o.palette, 7), W = o.width, A = o.charge, S = o.seed, end = A + o.hold + 0.3;
  if (o.lv >= 3) sigil(p, W * 2.4, t * 4, C[4], C[5], t < end ? clamp(t / 0.12) : 0, 4);
  if (o.talisman >= 0.5 && t < end) {
    const k = clamp(t / 0.12) * clamp(1 - (t - A - o.hold) / 0.3);
    talisman(p, 0, TOP + 12, 12 * clamp(t / 0.12), 20, C[5], C[2], k);
    rays(p, 0, TOP + 12, 8, 16, C[5], k * 0.7, t * 3);
  }
  if (t < A) {
    const k = t / A;
    p.line(0, TOP + 24, 0, 0, C[4], 0.15 + 0.4 * k);
    // 光点从两侧往中线吸
    for (let i = 0; i < 18; i++) {
      const r = rng(S, 700 + i), q = ((k + r.next()) % 1), side = i % 2 ? 1 : -1;
      p.dot(side * 50 * (1 - q), r.range(TOP + 30, -5), C[6], q);
    }
    groundMark(p, W * 1.4, C[4], 0.35 * k);
    return;
  }
  const u = t - A, strike = 0.05;
  if (u > o.hold + 0.3) return;
  const reach = TOP + 24 + (0 - TOP - 24) * clamp(u / strike);
  const thin = u < o.hold ? 1 : 1 - (u - o.hold) / 0.3, w = W * thin * (u < strike + 0.06 ? 1.4 : 1 + 0.08 * Math.sin(u * 60));
  flash(p, C[6], o.flash * clamp(1 - u / 0.09));
  // 光柱
  p.glowLine(0, TOP + 24, 0, reach, w * 2.2, C[4], 0.55 * thin);
  p.beam(0, TOP + 24, 0, reach, w, C[4], 0.85 * thin);
  p.beam(0, TOP + 24, 0, reach, w * 0.62, C[5], thin);
  p.beam(0, TOP + 24, 0, reach, Math.max(1, w * 0.28), C[6], thin);
  // 柱身光环一节节往下冲
  for (let i = 0; i < 4; i++) {
    const y = TOP + 24 + ((u * 420 + i * 40) % (0 - TOP - 24));
    if (y < reach) for (let a = 0; a < 20; a++) p.dot(Math.cos(a / 20 * 6.283) * w * 0.85, y + Math.sin(a / 20 * 6.283) * w * 0.25, C[6], 0.8 * thin);
  }
  // 两侧电弧：锯齿折线，每一小段时间换一个形状
  for (let i = 0; i < o.arcs; i++) {
    const r = rng(S, 900 + i + Math.floor(u * 24) * 31), side = i % 2 ? 1 : -1;
    let x = side * w * 0.4, y = r.range(TOP + 40, -10);
    for (let s = 0; s < 6; s++) {
      const nx = x + side * r.range(2, 5), ny = y + r.range(-5, 5);
      p.line(x, y, nx, ny, C[6], thin);
      p.glowLine(x, y, nx, ny, 3, C[5], 0.4 * thin);
      x = nx; y = ny;
    }
  }
  for (let i = 0; i < o.motes; i++) {
    const y = -((i * 23 + u * 220) % 160), x = ((i * 7) % 5 - 2) * w * 0.15;
    if (y > reach) p.dot(x, y, C[6], thin);
  }
  if (u < strike) return;
  const v = u - strike;
  rays(p, 0, -2, 4 + o.lv * 2, (20 + o.lv * 6) * clamp(v / 0.05), C[6], clamp(1 - v / 0.25));
  shock(p, W * 1.2 + clamp(v / 0.3) * 50, 3, C[5], 1 - clamp(v / 0.35));
  if (o.lv >= 3) shock(p, W + clamp((v - 0.08) / 0.3) * 36, 2, C[6], 1 - clamp((v - 0.08) / 0.35));
  groundMark(p, W * 1.1, C[6], 0.75 * thin);
  if (v < 0.08) p.glow(0, -10, 32, C[5], 1 - v / 0.08);
  scatter(v, o.sparks, S, { speed: [60, 130], up: 0.55, g: 240, life: [0.3, 0.6] }, (x, y, vx, vy, k) => {
    p.line(x, y, x - vx * 0.035, y - vy * 0.035, k > 0.5 ? C[6] : C[4]);
    p.glow(x, y, 3, C[5], 0.4 * k);
  });
}

export function draw(p, t, o) {
  o = levelUp(o, { width: 0.15, sparks: 0.3, motes: 0.2, flash: 0.1 });
  o.arcs += (o.lv - 1) * 2;
  // 减负：金光冷却最短（0.8 秒）、出现最频繁。1–2 级只有光柱和落地金屑；3 级起加地面金阵；4 级起才有天顶符纸和命中光晕
  if (o.lv < 4) { o.talisman = 0; o.flash *= 0.25; }
  if (o.lv < 3) { o.motes = Math.round(o.motes * 0.4); o.sparks = Math.round(o.sparks * 0.6); }
  // 5 级：两侧各多劈一道细光柱（视觉上表现穿透更多）
  if (o.lv >= 5) for (const dx of [-30, 30]) {
    p.place(p.tx + dx, p.ty);
    pillarFx(p, t - 0.08, { ...o, width: o.width * 0.5, talisman: 0, arcs: 1, flash: 0 });
    p.place(p.tx - dx, p.ty);
  }
  pillarFx(p, t, o);
}
