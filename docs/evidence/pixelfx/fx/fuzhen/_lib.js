// 符镇百妖自制特效的共用部分：竖屏视角，地面在 y=0，天空在负方向。
import { rng, clamp, mix, WHITE, TAU } from "../../core/index.js";

export const FRAME = { size: [128, 192], origin: [64, 168] };

/** 从天而降的落点进度：0 起飞，1 落地，用加速下落的手感 */
export const fallK = (t, T) => clamp(t / T) ** 1.6;

/** 一次性爆散的粒子：n 个，每个从 (x,y) 以随机方向飞出，受重力，回调画它 */
export function scatter(t, n, seed, { speed = [40, 90], up = 0.6, g = 260, life = [0.4, 0.8] }, fn) {
  for (let i = 0; i < n; i++) {
    const r = rng(seed, i), L = r.range(life[0], life[1]);
    if (t > L) continue;
    const a = -Math.PI / 2 + r.range(-1, 1) * (Math.PI * (1 - up / 2)), v = r.range(speed[0], speed[1]);
    const vx = Math.cos(a) * v, vy = Math.sin(a) * v;
    fn(vx * t, vy * t + 0.5 * g * t * t, vx, vy + g * t, 1 - t / L, r, i);
  }
}

/** 一张小符纸：竖长方形，边框加中间一道朱砂竖纹，会随 k 淡出 */
export function talisman(p, x, y, w, h, paper, ink, k = 1, tilt = 0) {
  const c = Math.cos(tilt), s = Math.sin(tilt), pt = (u, v) => [x + u * c - v * s, y + u * s + v * c];
  p.poly([pt(-w / 2, -h / 2), pt(w / 2, -h / 2), pt(w / 2, h / 2), pt(-w / 2, h / 2)], paper, k);
  for (let v = -h / 2 + 2; v < h / 2 - 1; v += 1) {
    const [a, b] = pt(0, v);
    p.dot(a, b, ink, k);
  }
  const [a, b] = pt(0, -h / 2 + 3);
  p.dot(a - 1, b, ink, k), p.dot(a + 1, b, ink, k);
}

/** 地面上的扁椭圆光斑（落点提示 / 灼痕） */
export function groundMark(p, r, c, a, sy = 0.32) {
  for (let y = -Math.ceil(r * sy); y <= Math.ceil(r * sy); y++)
    for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) {
      const d = Math.hypot(x / r, y / (r * sy));
      if (d < 1) p.blend(x, y, c, a * (1 - d * d));
    }
}

export const lighten = (c, k) => mix(c, WHITE, k);
export { TAU };

/** 地面符阵：扁椭圆双圈 + 一圈刻度符文 + 内接多边形（n 边，转动），k 控制显隐 */
export function sigil(p, r, rot, cOuter, cInner, k, n = 8, sy = 0.34) {
  if (k <= 0.01 || r < 2) return;
  const P = (a, rr) => [Math.cos(a) * rr, Math.sin(a) * rr * sy];
  const steps = Math.max(24, Math.round(r * 2.4));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    const [x1, y1] = P(a, r), [x2, y2] = P(a, r * 0.84);
    p.dot(x1, y1, cOuter, k);
    p.dot(x2, y2, cInner, k * 0.8);
    // 两圈之间的符文刻度，随 rot 转
    if (i % 3 === 0) { const [x3, y3] = P(a + rot, r * 0.92); p.dot(x3, y3, cOuter, k * 0.9); }
  }
  // 内接多边形，反向转
  for (let j = 0; j < n; j++) {
    const a0 = (j / n) * TAU - rot * 0.7, a1 = (((j + 3) % n) / n) * TAU - rot * 0.7;
    const [x0, y0] = P(a0, r * 0.82), [x1, y1] = P(a1, r * 0.82);
    p.line(x0, y0, x1, y1, cInner, k * 0.55);
  }
  p.glow(0, 0, r * 0.9, cOuter, 0.25 * k);
}

/** 扁椭圆冲击波环：半径 r、粗 w，越往外越淡 */
export function shock(p, r, w, c, k, sy = 0.34) {
  if (k <= 0.01 || r < 1) return;
  const steps = Math.max(32, Math.round(r * 3));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU, cx = Math.cos(a), cy = Math.sin(a) * sy;
    for (let d = 0; d < w; d += 0.7) p.dot(cx * (r - d), cy * (r - d), c, k * (1 - d / w));
  }
}

/** 从 (x,y) 放射的光芒：n 条，长 len，k 控制显隐，rot 让光芒转 */
export function rays(p, x, y, n, len, c, k, rot = 0) {
  if (k <= 0.01) return;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rot, L = len * (i % 2 ? 0.6 : 1);
    p.glowLine(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, 2.2, c, 0.55 * k);
    p.line(x, y, x + Math.cos(a) * L * 0.7, y + Math.sin(a) * L * 0.7, c, k * 0.7);
  }
}

/** 命中闪光：以命中点为中心的大范围加亮光晕（只加光，不画实色，透明处不会出现方框） */
export function flash(p, c, a) {
  if (a <= 0.01) return;
  p.glow(0, -30, 52, c, a * 1.2);
  p.glow(0, -8, 32, c, a * 1.5);
}

/** 速度线：沿 (ux,uy) 方向拖在 (x,y) 后面的几条细线 */
export function speedLines(p, x, y, ux, uy, n, len, c, k, seed = 1) {
  for (let i = 0; i < n; i++) {
    const off = ((i * 53 + seed * 17) % 11) - 5, L = len * (0.5 + ((i * 29) % 7) / 10);
    const px = x - uy * off, py = y + ux * off;
    p.line(px + ux * 4, py + uy * 4, px + ux * L, py + uy * L, c, k * 0.6);
  }
}

/**
 * 按符咒等级（1–5，满级 5）放大参数：rates 里每个键每升 1 级乘 (1 + rate)。
 * 例：levelUp(o, { blast: 0.12 }) 在 5 级时 blast ×1.48。等级本身也放回 o.lv 方便判断解锁。
 */
export function levelUp(o, rates) {
  const lv = clamp(Math.round(o.level ?? 1), 1, 5), out = { ...o, lv };
  for (const [k, r] of Object.entries(rates)) if (typeof o[k] === "number") out[k] = o[k] * (1 + r * (lv - 1));
  return out;
}
