// 引魂灯笼（精英怪）的加速光环：灯笼一亮，脚下鬼火阵展开并旋转，环外一圈幽绿冲击波推开，
// 范围内鬼火成团升起、绿色箭头往前冲（提示“加速”），光环关闭时火焰被吸回灯笼。
// 对应玩法：每 6 秒前 2 秒给范围内小怪加速。鬼火画法借用 PixelFX fire/_lib 的 firePuff（MIT）。
import { fit, clamp, rng } from "../../core/index.js";
import { hotFirst, firePuff } from "../fire/_lib.js";
import { FRAME, groundMark, sigil, shock, rays, levelUp } from "./_lib.js";

export const meta = {
  name: "引魂灯笼 · 加速光环",
  desc: "鬼火阵展开、冲击波、鬼火升腾、加速箭头。",
  tags: ["fuzhen", "aura"], ...FRAME, duration: 3.0, loop: true, fps: 30, bg: "dark",
  options: {
    palette: ["#081410", "#0e2a20", "#16483a", "#24705a", "#3c9c78", "#78c898", "#c8e6a0", "#f4e2a0", "#fff6d0"],
    level: 1, // 强度档位：1 普通，3 困难，5 精英加强（怪物没有符咒等级，仅作对照）
    active: 2, // 光环持续（秒）
    radius: 56, // 光环半径
    wisps: 10, // 鬼火数量
    arrows: 3, // 加速箭头数量
    seed: 2,
  },
};

const LAMP = -44;

export function draw(p, t, o) {
  o = levelUp(o, { radius: 0.06, wisps: 0.3, arrows: 0.3 });
  const H = hotFirst(fit(o.palette, 9)), A = o.active, R = o.radius, on = t < A;
  const grow = clamp(t / 0.25), shut = clamp(1 - (t - A) / 0.35), k = Math.min(grow, shut);
  // 灯笼位置的光（灯笼本体由怪物精灵图画）
  p.glow(0, LAMP, 30, H[3], (on ? 0.6 + 0.25 * Math.sin(t * 14) : 0.2) * Math.max(k, 0.3));
  if (t < 0.15) rays(p, 0, LAMP, 8, 30 * (t / 0.15), H[2], 1 - t / 0.15);
  if (k <= 0) return;
  groundMark(p, R * grow, H[6], 0.2 * k);
  sigil(p, R * grow, t * 1.8, H[4], H[3], k, 6);
  shock(p, R * 1.3 * clamp(t / 0.35), 3, H[3], clamp(1 - t / 0.45));
  // 鬼火：在范围里冒出、往上飘、摇摆；关闭时被吸回灯笼
  for (let i = 0; i < o.wisps; i++) {
    const r = rng(o.seed, i), L = r.range(0.6, 1.0), born = r.range(0, Math.max(0.1, A - 0.3)), u = t - born;
    const a = r.range(0, Math.PI * 2), d = r.range(0.2, 0.95) * R;
    let x = Math.cos(a) * d + Math.sin(u * 8 + i) * 2, y = Math.sin(a) * d * 0.32 - u * 30;
    if (!on && u > 0) { const q = clamp((t - A) / 0.35); x *= 1 - q; y = y * (1 - q) + LAMP * q; firePuff(p, x, y, 1 - q, 2.5, 0.2, H, 0.3); continue; }
    if (u < 0 || u > L) continue;
    firePuff(p, x, y, 1 - u / L, r.range(2.5, 4), 0.15, H, 0.28);
  }
  // 加速箭头：沿地面往前（画面下方，即城墙方向）冲
  if (on) for (let i = 0; i < o.arrows; i++) {
    const r = rng(o.seed, 400 + i), q = (t * 1.6 + r.next()) % 1, x = r.range(-R, R) * 0.8, y = r.range(-R, R) * 0.25 + q * 16 - 8;
    const a = Math.sin(q * Math.PI) * k;
    p.line(x - 3, y - 3, x, y, H[2], a); p.line(x + 3, y - 3, x, y, H[2], a);
    p.line(x - 3, y - 7, x, y - 4, H[4], a * 0.6); p.line(x + 3, y - 7, x, y - 4, H[4], a * 0.6);
  }
}
