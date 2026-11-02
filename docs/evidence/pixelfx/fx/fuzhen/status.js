// 妖怪身上的受击与状态叠加层（只画叠在妖怪身上的部分；妖怪本身的白闪、染色由游戏给精灵调色完成）。
// state：0 受击  1 冻结（寒冰）  2 灼烧（烈焰）  3 眩晕（镇山）  4 减速（青藤）
// 身体按约 44 像素高估算：脚在 y=0，头顶在 y≈-44。
import { fit, clamp, rng, WHITE, hex } from "../../core/index.js";
import { hotFirst, firePuff } from "../fire/_lib.js";
import { groundMark } from "./_lib.js";

export const STATES = ["受击", "冻结", "灼烧", "眩晕", "减速"];

export const meta = {
  name: "妖怪状态叠加",
  desc: "受击、冻结、灼烧、眩晕、减速。",
  tags: ["fuzhen", "status"], size: [96, 96], origin: [48, 80], duration: 1.2, loop: true, fps: 30, bg: "dark",
  options: { state: 0, body: 44, seed: 4 },
};

const PALE = hex("#fff8f0");
const ICE = ["#0c1420", "#24465e", "#3a6e86", "#5e9eb0", "#94ccd4", "#d0eeee", "#f4ffff"];
const FIRE = ["#1e0806", "#4a0e0a", "#7a140e", "#a81c12", "#cc2a16", "#e4501e", "#f08a3a", "#f8c070", "#fde6b0"];
const GOLD = ["#5a3a12", "#c48a2a", "#f8dc90", "#fff6dc"];
const VINE = ["#08140a", "#1e5024", "#2e7a30", "#4ea83a", "#86d050", "#c4ec7a"];

function hit(p, t, B, S) {
  // 每 0.6 秒挨一下：一道斜向白色斩光 + 一圈小冲击 + 几点碎光
  const u = t % 0.6;
  if (u > 0.2) return;
  const k = 1 - u / 0.2, y = -B * 0.55, L = 16 * clamp(u / 0.04);
  p.glowLine(-L, y - L * 0.6, L, y + L * 0.6, 4, WHITE, 0.8 * k);
  p.line(-L, y - L * 0.6, L, y + L * 0.6, WHITE, k);
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, r = 4 + u * 70; p.dot(Math.cos(a) * r, y + Math.sin(a) * r, PALE, k * 0.7); }
  for (let i = 0; i < 6; i++) { const r = rng(S, Math.floor(t / 0.6) * 10 + i), a = r.range(0, 6.28), d = u * r.range(60, 110); p.dot(Math.cos(a) * d, y + Math.sin(a) * d, WHITE, k); }
}

function freeze(p, t, B) {
  const C = fit(ICE, 7);
  // 只冻住脚：脚下一圈冰面 + 小腿高的一圈冰棱，不挡身体和技能爆炸
  groundMark(p, 16, C[4], 0.5);
  p.poly([[-13, 1], [-12, -7], [-6, -10], [3, -9], [11, -6], [13, 1]], C[4], 0.35);
  for (const [x, h] of [[-12, 8], [-7, 12], [-2, 9], [3, 13], [8, 10], [12, 7]]) {
    p.tri(x - 2, 1, x + 2, 1, x, -h, C[5], 0.9);
    p.line(x, 0, x, -h, C[6], 0.9);
  }
  const sx = ((t * 24) % 30) - 15;
  p.line(sx, -2, sx + 3, -8, C[6], 0.7);
  if (Math.floor(t * 8) % 5 === 0) p.dot(((t * 37) % 24) - 12, -4, C[6], 1);
}

function burn(p, t, B, S) {
  const H = hotFirst(fit(FIRE, 9));
  // 身上几处火苗往上舔，飘火星，脚下一小片焦痕
  groundMark(p, 12, H[8], 0.35);
  for (let i = 0; i < 7; i++) {
    const r = rng(S, i), L = r.range(0.35, 0.55), q = ((t + r.next() * L) % L) / L;
    firePuff(p, r.range(-9, 9), -r.range(4, B * 0.8) - q * 10, 1 - q, r.range(2, 3.2), 0.2, H, 0.2);
  }
  for (let i = 0; i < 4; i++) { const r = rng(S, 50 + i), q = ((t * 1.3 + r.next()) % 1); p.dot(r.range(-8, 8) + Math.sin(q * 9) * 2, -B * 0.6 - q * 26, H[2], 1 - q); }
}

function stun(p, t, B) {
  const C = fit(GOLD, 4);
  // 头顶一圈金星打转（前大后小）
  for (let i = 0; i < 3; i++) {
    const a = t * 6 + (i / 3) * Math.PI * 2, x = Math.cos(a) * 11, y = -B - 6 + Math.sin(a) * 3, front = Math.sin(a) > 0, s = front ? 2 : 1;
    p.line(x - s, y, x + s, y, front ? C[3] : C[1]); p.line(x, y - s, x, y + s, front ? C[3] : C[1]);
    if (front) { p.dot(x, y, WHITE); p.glow(x, y, 5, C[2], 0.5); }
  }
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; p.dot(Math.cos(a) * 11, -B - 6 + Math.sin(a) * 3, C[1], 0.35); }
}

function slow(p, t, B, S) {
  const C = fit(VINE, 6);
  // 脚边绿色藤印 + 两圈藤绕在小腿 + 往下飘的叶片，表示“被拖住”
  groundMark(p, 16, C[2], 0.45);
  for (let i = 0; i < 2; i++) {
    let px = null, py = null;
    for (let j = 0; j <= 30; j++) {
      const q = j / 30, a = q * Math.PI * 2 + i * 2 + t, x = Math.cos(a) * 9, y = -2 - i * 6 - q * 4;
      if (px !== null && Math.sin(a) > 0) p.line(px, py, x, y, C[4], 1);
      px = x; py = y;
    }
  }
  for (let i = 0; i < 3; i++) { const r = rng(S, 80 + i), q = ((t * 0.8 + r.next()) % 1); p.dot(r.range(-12, 12), -B * 0.7 + q * B * 0.6, C[5], 1 - q); }
  // 向下的小箭头：速度变慢
  const k = 0.5 + 0.5 * Math.sin(t * 6);
  p.line(-4, -B - 8, 0, -B - 4, C[5], k); p.line(4, -B - 8, 0, -B - 4, C[5], k);
}

export function draw(p, t, o) {
  const B = o.body, s = Math.round(o.state);
  if (s === 0) hit(p, t, B, o.seed);
  else if (s === 1) freeze(p, t, B);
  else if (s === 2) burn(p, t, B, o.seed);
  else if (s === 3) stun(p, t, B);
  else slow(p, t, B, o.seed);
}
