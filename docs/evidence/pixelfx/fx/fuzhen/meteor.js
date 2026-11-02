// 烈焰符：正面攻击，不从天降——火球从画面下方（玩家一侧）拖着长长的火尾和速度线直射出去，
// 正面命中妖怪后闪光、光芒炸开、冲击波，火团翻滚成蘑菇火柱，余火在地上烧一阵。
// 等级越高越大越猛：3 级起多一圈冲击波和余火，5 级变成三颗火球扇形齐射、火焰转白金。
// 火团、烟、火星的画法借用 PixelFX fire/_lib（改编自 Sprite Fusion，MIT）。
import { fit, clamp, rng } from "../../core/index.js";
import { hotFirst, firePuff, smokePuff, spark, solid } from "../fire/_lib.js";
import { scatter, groundMark, sigil, shock, rays, flash, speedLines, levelUp } from "./_lib.js";

export const meta = {
  name: "烈焰符 · 火球爆炸",
  desc: "火球正面直射命中，蘑菇火柱和冲击波，随等级变强。",
  // 画框比别的符往下长，留出火球从下方飞上来的距离；地面仍在 y=0
  tags: ["fuzhen", "fire"], size: [128, 256], origin: [64, 168], duration: 2.2, loop: true, fps: 30, bg: "dark",
  options: {
    palette: ["#1e0806", "#4a0e0a", "#7a140e", "#a81c12", "#cc2a16", "#e4501e", "#f08a3a", "#f8c070", "#fde6b0"],
    level: 1, // 符咒等级 1–5
    fall: 0.3, // 飞行用时（秒）
    radius: 6, // 火球大小
    tail: 12, // 拖尾火团数量
    blast: 34, // 爆炸半径（1 级）
    puffs: 14, // 爆炸火团数量
    sparks: 18, // 飞溅火星数量
    flash: 0.45, // 命中闪白强度
    seed: 3,
  },
};

const START_Y = 84; // 出发点：画框底部（玩家一侧）
const HIT_Y = -6; // 命中点：妖怪脚边偏上

// 一颗火球从飞出到炸开；ox 为命中点横向偏移，sc 为大小比例，from 为出发点横向偏移
function strike(p, t, o, H, ox, sc, S, from = 0) {
  const T = o.fall, R = o.blast * sc;
  if (t < 0) return;
  if (t < T) {
    // ux,uy 指向火尾（与飞行方向相反）
    const k = (t / T) ** 1.15, x = from + (ox - from) * k, y = START_Y + (HIT_Y - START_Y) * k, L = Math.hypot(from - ox, START_Y - HIT_Y), ux = (from - ox) / L, uy = (START_Y - HIT_Y) / L;
    speedLines(p, x, y, ux, uy, 5 + o.lv, 30 + o.lv * 4, H[3], 0.8, S);
    for (let i = o.tail; i >= 1; i--) {
      const back = i * 3, f = i / o.tail;
      firePuff(p, x + ux * back + Math.sin(i * 2.3 + t * 30) * f * 2, y + uy * back, 1 - f, o.radius * sc * (1 - f * 0.55), f * 0.5, H, 0.16);
    }
    solid(p, x, y, o.radius * sc + 1.5, H[4]);
    solid(p, x, y, o.radius * sc, H[2]);
    solid(p, x - 1, y - 1, o.radius * sc * 0.55, H[0]);
    p.glow(x, y, o.radius * sc * 6, H[3], 0.7);
    return;
  }
  const u = t - T;
  p.place(p.tx + ox, p.ty);
  if (sc >= 1) flash(p, H[0], o.flash * clamp(1 - u / 0.1));
  rays(p, 0, -6, 8 + o.lv * 2, R * 1.3 * clamp(u / 0.06), H[1], clamp(1 - u / 0.3), u * 2);
  if (u < 0.14) { solid(p, 0, -8, Math.min(26, R * 0.55 * (0.4 + u / 0.14)), H[0]); p.glow(0, -14, Math.min(R * 2.4, 38), H[2], 1 - u / 0.14); }
  shock(p, R * 1.5 * clamp(u / 0.3), 3, H[2], clamp(1 - u / 0.4));
  if (o.lv >= 3) shock(p, R * 1.1 * clamp((u - 0.08) / 0.3), 2, H[5], clamp(1 - (u - 0.08) / 0.4));
  groundMark(p, R * 0.95, H[8], 0.6 * clamp(1 - (u - 1) / 0.6));
  if (o.lv >= 3) for (let i = 0; i < 3 + o.lv * 2; i++) {
    const r = rng(S, 300 + i), L = r.range(0.25, 0.45), ph = ((u + r.next() * L) % L) / L;
    if (u > 1.5) break;
    firePuff(p, r.range(-R, R) * 0.8, r.range(-3, 3) - ph * 12, 1 - ph, r.range(2, 3.5), 0.3, H, 0.15);
  }
  for (let i = 0; i < o.puffs; i++) {
    const r = rng(S, 100 + i), col = i < o.puffs * 0.35, L = r.range(0.8, 1.2);
    if (u > L) continue;
    const q = u / L, k = Math.min(1, (1 - q) * 1.3);
    const a = r.range(Math.PI, Math.PI * 2), d = R * Math.min(1, q * 3) * r.range(0.4, 1);
    const x = col ? r.range(-6, 6) : Math.cos(a) * d * 1.1, y = col ? -R * 1.4 * Math.min(1, q * 2.2) * r.range(0.6, 1) : Math.sin(a) * d * 0.45 - q * 20;
    firePuff(p, x, y, k, r.range(4, 7) * sc, 0, H, 0.28);
  }
  for (let i = 0; i < 6 + o.lv; i++) {
    const uu = u - 0.2 - i * 0.04;
    if (uu < 0 || uu > 1.3) continue;
    smokePuff(p, (i - 3.5) * 5, -R * 1.2 - uu * 26, 1 - uu / 1.3, 7 * sc, 0, true, 0.9);
  }
  scatter(u, Math.round(o.sparks * sc), S, { speed: [70, 150], up: 0.75, g: 300, life: [0.45, 0.9] }, (x, y, vx, vy, k) => spark(p, x, y - 3, vx, vy, k, [H[0], H[2], H[4], H[6]]));
  p.place(p.tx - ox, p.ty);
}

export function draw(p, t, o) {
  o = levelUp(o, { blast: 0.12, puffs: 0.25, sparks: 0.3, tail: 0.15, radius: 0.08, flash: 0.1 });
  // 5 级：火焰更白更亮
  const pal = o.lv >= 5 ? [...o.palette.slice(2), "#ffffff", "#ffffff"] : o.palette;
  const H = hotFirst(fit(pal, 9)), S = o.seed;
  // 出手处一圈火符阵（玩家一侧）
  p.place(p.tx, p.ty + START_Y);
  sigil(p, 16, t * (2 + o.lv), H[3], H[5], clamp(1 - t / 0.45), 4 + o.lv);
  p.place(p.tx, p.ty - START_Y);
  if (o.lv >= 5) { strike(p, t - 0.06, o, H, -34, 0.55, S + 7, -20); strike(p, t - 0.12, o, H, 34, 0.55, S + 13, 20); }
  strike(p, t, o, H, 0, 1, S);
}
