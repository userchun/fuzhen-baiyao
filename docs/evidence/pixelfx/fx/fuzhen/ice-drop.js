// 寒冰符：正面攻击，不从天降——冰锥从画面下方（玩家一侧）带着寒气拖尾直射上去，正面命中妖怪身体，
// 炸开一团冰爆：闪光、冰晶向四面八方刺出、霜环冲击波、寒雾翻涌、碎冰四散，脚下冻出冰刺，再弹射向下一个目标。
// 等级越高冰锥越多（扇形齐射）、冰爆越大：3 级起二次冰环与雪花，5 级变成巨型冰爆（霜华绽放）。
// 冰锥分面的画法参考 PixelFX ice/ice-lance，冰爆参考 ice/freeze（MIT）。
import { fit, clamp, rng } from "../../core/index.js";
import { scatter, groundMark, sigil, shock, rays, flash, speedLines, levelUp } from "./_lib.js";

// 画框比别的符往下长，留出冰锥从下方飞上来的距离；地面仍在 y=0
export const meta = {
  name: "寒冰符 · 冰锥冰爆",
  desc: "冰锥正面直射命中，炸开冰爆、冻结、弹射，随等级变强。",
  tags: ["fuzhen", "ice"], size: [128, 256], origin: [64, 168], duration: 2.2, loop: true, fps: 30, bg: "dark",
  options: {
    palette: ["#0c1420", "#16283a", "#24465e", "#3a6e86", "#5e9eb0", "#94ccd4", "#d0eeee", "#f4ffff"],
    level: 1, // 符咒等级 1–5
    fly: 0.22, // 飞行用时（秒）
    length: 22, // 冰锥长度
    width: 5, // 冰锥半宽
    volley: 1, // 齐射根数（每 2 级 +1）
    burst: 26, // 冰爆半径
    spikes: 8, // 冰爆刺出的冰晶数量
    shards: 14, // 碎冰数量
    bounce: 1, // 弹射次数（每级 +1，最多画 4 次）
    flash: 0.45,
    seed: 9,
  },
};

const HIT_Y = -14; // 命中点：妖怪身体中部
const START_Y = 84; // 出发点：画框底部（玩家一侧）

// 任意方向的冰锥：尖端在 (x,y)，朝 (ux,uy)
function lance(p, x, y, ux, uy, L, W, C, k = 1) {
  const bx = x - ux * L, by = y - uy * L, nx = -uy, ny = ux;
  p.glow(x - ux * L * 0.4, y - uy * L * 0.4, L, C[4], 0.45 * k);
  p.tri(x, y, bx + nx * W, by + ny * W, bx - ux * 3, by - uy * 3, C[5], k);
  p.tri(x, y, bx - nx * W, by - ny * W, bx - ux * 3, by - uy * 3, C[3], k);
  p.line(x, y, bx - ux * 3, by - uy * 3, C[7], k);
  p.line(bx + nx * W, by + ny * W, bx - nx * W, by - ny * W, C[2], k);
}

// 冰爆刺出的一根冰晶：从命中点沿角度 a 刺出长度 len
function spike(p, a, len, w, C, k) {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, tx = ux * len, ty = HIT_Y + uy * len;
  p.tri(nx * w, HIT_Y + ny * w, -nx * w, HIT_Y - ny * w, tx, ty, C[5], k);
  p.tri(0, HIT_Y, -nx * w, HIT_Y - ny * w, tx, ty, C[3], k);
  p.line(0, HIT_Y, tx, ty, C[7], k);
  p.glow(tx, ty, 5, C[6], 0.5 * k);
}

export function draw(p, t, o) {
  o = levelUp(o, { length: 0.08, width: 0.06, burst: 0.14, spikes: 0.25, shards: 0.3, flash: 0.1 });
  o.volley += Math.floor((o.lv - 1) / 2);
  o.bounce = Math.min(4, o.bounce + o.lv - 1);
  const C = fit(o.palette, 8), S = o.seed, R = o.burst, n = Math.max(1, Math.round(o.volley)), F = o.fly, gap = 0.06;
  // 出手处一圈小冰阵（玩家一侧）
  p.place(p.tx, p.ty + START_Y);
  sigil(p, 14, t * 4, C[4], C[6], clamp(1 - t / 0.4), 6);
  p.place(p.tx, p.ty - START_Y);
  // 齐射：多根冰锥扇形从下方射向命中点
  for (let i = 0; i < n; i++) {
    const u = t - i * gap;
    if (u < 0 || u > F) continue;
    const sx = (i - (n - 1) / 2) * 18, q = (u / F) ** 1.2;
    const x = sx * (1 - q), y = START_Y + (HIT_Y - START_Y) * q, L = Math.hypot(sx, HIT_Y - START_Y), ux = -sx / L, uy = (HIT_Y - START_Y) / L;
    for (let j = 1; j < 9; j++) p.dot(x - ux * (o.length + j * 4) + Math.sin(j * 2 + u * 30) * 1.5, y - uy * (o.length + j * 4), j % 2 ? C[6] : C[5], 0.8 - j * 0.08);
    speedLines(p, x - ux * o.length, y - uy * o.length, -ux, -uy, 5, 26, C[6], 0.7, S + i);
    lance(p, x, y, ux, uy, o.length, o.width, C);
  }
  if (t < F) return;
  const u = t - F, hold = 1.1, fade = clamp(1 - (u - hold) / 0.4);
  // 命中闪光 + 光芒
  flash(p, C[7], o.flash * clamp(1 - u / 0.1));
  rays(p, 0, HIT_Y, 10 + o.lv * 2, R * 1.6 * clamp(u / 0.05), C[7], clamp(1 - u / 0.3), Math.PI / 10);
  if (u < 0.12) { p.disc(0, HIT_Y, R * 0.5 * (0.4 + u / 0.12), () => C[7], 1 - u / 0.12); p.glow(0, HIT_Y, Math.min(R * 2, 50), C[6], 1 - u / 0.12); }
  // 冰晶向四面八方刺出，停一会儿碎掉
  const grow = clamp(u / 0.08), crack = clamp((u - 0.7) / 0.3);
  for (let i = 0; i < o.spikes; i++) {
    const r = rng(S, 200 + i), a = (i / o.spikes) * Math.PI * 2 + r.range(-0.2, 0.2), len = R * r.range(0.6, 1) * grow * (o.lv >= 5 ? 1.3 : 1);
    if (crack < 1) spike(p, a, len, r.range(2.2, 3.5), C, 1 - crack);
  }
  // 霜环冲击波：命中点一圈 + 地面一圈
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2, rr = R * 1.4 * clamp(u / 0.25);
    p.dot(Math.cos(a) * rr, HIT_Y + Math.sin(a) * rr, C[6], clamp(1 - u / 0.35));
  }
  shock(p, R * 1.5 * clamp(u / 0.3), 3, C[6], clamp(1 - u / 0.45));
  if (o.lv >= 3) shock(p, R * 1.1 * clamp((u - 0.1) / 0.3), 2, C[7], clamp(1 - (u - 0.1) / 0.4));
  // 寒雾翻涌
  for (let i = 0; i < 8; i++) {
    const r = rng(S, 400 + i), a = r.range(0, Math.PI * 2), d = R * clamp(u / 0.5) * r.range(0.4, 0.9);
    p.disc(Math.cos(a) * d, HIT_Y + Math.sin(a) * d * 0.6 - u * 8, 6 + u * 10, () => C[5], 0.25 * clamp(1 - u / 0.9));
  }
  // 脚下冻出一圈冰刺
  groundMark(p, R * clamp(u / 0.15), C[5], 0.45 * fade);
  for (let i = 0; i < 5 + o.lv; i++) {
    const r = rng(S, 500 + i), side = i % 2 ? 1 : -1, d = side * r.range(3, R * 0.9), g = clamp((u - 0.05) / 0.08), h = r.range(6, 14) * g;
    if (g > 0) { p.tri(d - 2.5, 1, d + 2.5, 1, d + side * 1.5, -h, C[4], fade); p.line(d, 0, d + side * 1.5, -h, C[6], fade); }
  }
  // 碎冰
  scatter(u, o.shards, S, { speed: [70, 150], up: 0.95, g: 300, life: [0.35, 0.7] }, (x, y, vx, vy, k, r) => {
    const s = r.range(1.2, 2.8);
    p.tri(x - s, HIT_Y + y, x + s, HIT_Y + y, x, HIT_Y + y - s * 1.8, k > 0.5 ? C[7] : C[5], Math.min(1, k * 2));
  });
  // 3 级起雪花
  if (o.lv >= 3) for (let i = 0; i < 6 + o.lv * 4; i++) {
    const r = rng(S, 600 + i), y = -90 + ((u * r.range(14, 26) + r.next() * 90) % 90), x = r.range(-55, 55) + Math.sin(u * 3 + i) * 3;
    p.dot(x, y, C[7], 0.8 * fade);
  }
  // 5 级：霜华绽放——命中点开出一朵六瓣冰花并缓缓旋转
  if (o.lv >= 5) {
    const k = clamp((u - 0.1) / 0.2) * fade, rot = u * 0.8;
    for (let j = 0; j < 6; j++) {
      const a = rot + (j / 6) * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a);
      p.tri(0, HIT_Y, ux * R * 0.8 - uy * 5, HIT_Y + uy * R * 0.8 + ux * 5, ux * R * 0.8 + uy * 5, HIT_Y + uy * R * 0.8 - ux * 5, C[6], k * 0.6);
      p.line(0, HIT_Y, ux * R, HIT_Y + uy * R, C[7], k);
    }
    p.glow(0, HIT_Y, R * 1.2, C[6], 0.5 * k);
  }
  // 弹射：小冰锥从命中点平着飞向两侧的下一个目标
  for (let b = 0; b < o.bounce; b++) {
    const bu = u - 0.15 - b * 0.2, BT = 0.35;
    if (bu < 0 || bu > BT + 0.2) continue;
    const dir = b % 2 ? -1 : 1, tx = dir * (40 + b * 6), ty = HIT_Y + (b % 2 ? 8 : -8);
    if (bu > BT) { p.disc(tx, ty, 4 + (bu - BT) * 40, () => C[6], 1 - (bu - BT) / 0.2); continue; }
    const k = bu / BT, x = tx * k, y = HIT_Y + (ty - HIT_Y) * k, L = Math.hypot(tx, ty - HIT_Y);
    lance(p, x, y, tx / L, (ty - HIT_Y) / L, o.length * 0.5, o.width * 0.6, C);
  }
}
