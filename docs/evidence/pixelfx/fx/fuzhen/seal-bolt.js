// 镇妖符（基础攻击）：0.45 秒一发、全自动，出现次数最多，所以刻意做轻——
// 一张黄符纸翻转着从下方（玩家一侧）快速飞出，拖一小段金色残影；命中时“盖章”：
// 一枚朱红方印一闪而过，几点金屑溅开。整个过程约 0.3 秒，不加全屏光、不加冲击波。
import { fit, clamp } from "../../core/index.js";
import { scatter, talisman } from "./_lib.js";

export const meta = {
  name: "镇妖符 · 普通攻击",
  desc: "快速飞出的符纸，命中盖下朱红小印。",
  tags: ["fuzhen", "basic"], size: [128, 256], origin: [64, 168], duration: 0.6, loop: true, fps: 30, bg: "dark",
  options: {
    palette: ["#3a1a0c", "#8a2a1a", "#c43a24", "#e8b04a", "#f6d47a", "#fff0c0", "#ffffff"],
    fly: 0.12, // 飞行用时（秒），对应弹速 1100
    size: 1, // 符纸大小比例
    sparks: 6, // 命中金屑数量
    seal: 1, // 命中方印（0/1）
    seed: 2,
  },
};

const START_Y = 84, HIT_Y = -16;

export function draw(p, t, o) {
  const C = fit(o.palette, 7), F = o.fly, s = o.size;
  if (t < F) {
    const q = t / F, x = Math.sin(q * 3) * 3, y = START_Y + (HIT_Y - START_Y) * q, spin = t * 40;
    // 金色残影：身后三张越来越淡的符纸影子
    for (let j = 3; j >= 1; j--) talisman(p, x, y + j * 9, 6 * s, 10 * s, C[3], C[2], 0.25 / j, spin - j * 0.6);
    p.line(x, y + 4, x, y + 34, C[4], 0.5);
    talisman(p, x, y, 6 * s, 10 * s, C[5], C[2], 1, spin);
    p.glow(x, y, 9, C[4], 0.5);
    return;
  }
  const u = t - F;
  if (u > 0.3) return;
  // 盖章：朱红方印由大缩到正好，停一下淡出
  if (o.seal >= 0.5) {
    const k = clamp(1 - (u - 0.12) / 0.15), sc = 1 + 0.6 * (1 - clamp(u / 0.05)), r = 6 * s * sc;
    p.rect(-r, HIT_Y - r, r * 2, r * 2, C[2], k * 0.85);
    p.rect(-r + 1.5, HIT_Y - r + 1.5, r * 2 - 3, r * 2 - 3, C[1], k * 0.5);
    // 印文：一个“镇”字的简笔（横、竖、口）
    p.rect(-r * 0.55, HIT_Y - r * 0.5, r * 1.1, 1, C[5], k);
    p.rect(-0.5, HIT_Y - r * 0.6, 1, r * 1.2, C[5], k);
    p.rect(-r * 0.4, HIT_Y + r * 0.1, r * 0.8, 1, C[5], k);
    p.rect(-r * 0.4, HIT_Y + r * 0.45, r * 0.8, 1, C[5], k);
  }
  if (u < 0.06) p.glow(0, HIT_Y, 16, C[4], 0.8 * (1 - u / 0.06));
  scatter(u, o.sparks, o.seed, { speed: [50, 90], up: 1, g: 200, life: [0.15, 0.28] }, (x, y, vx, vy, k) => {
    p.line(x, HIT_Y + y, x - vx * 0.03, HIT_Y + y - vy * 0.03, k > 0.5 ? C[5] : C[3]);
  });
}
