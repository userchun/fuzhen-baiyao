// 镇山符：不从天降，从地底冲出——地面隆起、开裂、透出符光并震动，石柱带着发光符纹轰地破土冲出把妖怪掀飞，
// 落地闪白、震屏、地裂透出符光、两圈尘土冲击波推开（击退范围），周围石刺破土而出，
// 飞石四溅，最后石柱碎裂下沉。岩块、尘环画法借用 PixelFX impacts/_lib（MIT）。
import { fit, clamp, rng } from "../../core/index.js";
import { stone, rock, rockShape, dustRing, OUTLINE } from "../impacts/_lib.js";
import { FRAME, fallK, scatter, groundMark, sigil, shock, rays, flash, speedLines, levelUp } from "./_lib.js";

export const meta = {
  name: "镇山符 · 石柱",
  desc: "符阵吸石、巨柱砸地、石刺破土、冲击波击退。",
  tags: ["fuzhen", "earth"], ...FRAME, duration: 2.4, loop: true, fps: 30, bg: "dark",
  options: {
    palette: ["#120e0c", "#221a16", "#362a22", "#4c3c30", "#64503e", "#80684e", "#a08868", "#c4ae8c"],
    glow: "#f0b84a", // 符纹发光色
    level: 1, // 符咒等级 1–5
    fall: 0.45, // 地面隆起蓄势用时（秒）
    width: 18, // 石锥底宽
    height: 50, // 石锥高
    wave: 40, // 冲击波半径（击退范围）
    spikes: 2, // 破土石刺数量
    rocks: 10, // 飞石数量
    shake: 3, // 落地震屏幅度
    flash: 0.4,
    seed: 6,
  },
};

function pillar(p, x, y, w, h, C, G, k = 1, rune = 1) {
  // 尖石锥：底宽顶尖，中间略微鼓出、带一点不规则棱角；左面受光、右面背光，中间一道亮棱
  const hw = w / 2, tip = [x + 1, y - h], waist = y - h * 0.45;
  const L = [[x - hw, y], [x - hw * 1.05, waist], [x - hw * 0.35, y - h * 0.82], tip];
  const R = [tip, [x + hw * 0.4, y - h * 0.78], [x + hw * 1.08, waist + 3], [x + hw, y]];
  const outline = [...L, ...R.slice(1)].map(([px, py], i, arr) => [px + Math.sign(px - x) * 1, py - (i === arr.indexOf(tip) ? 1.5 : 0)]);
  p.poly(outline, OUTLINE, k);
  p.poly([...L, [x + 1, y]], C[5], k);
  p.poly([tip, ...R.slice(1), [x + 1, y]], C[3], k);
  p.poly([[x - hw * 0.6, y], [x - hw * 0.7, waist], tip, [x - 1, y]], C[4], k);
  p.line(x + 1, y, tip[0], tip[1], C[7], k);
  p.line(x - hw * 1.05, waist, x - hw * 0.35, y - h * 0.82, C[6], k * 0.8);
  p.dot(tip[0], tip[1], C[7], k);
  // 发光符纹：沿中棱一笔竖画 + 三道越往上越短的横笔
  for (let v = y - 4; v > y - h * 0.72; v -= 1) p.dot(x, v, G, k * rune);
  for (const f of [0.2, 0.42, 0.62]) { const half = Math.round(hw * (1 - f) * 0.45); p.rect(x - half, y - h * f, half * 2 + 1, 1, G, k * rune); }
  p.glowLine(x, y - 4, x, y - h * 0.72, 6, G, 0.45 * k * rune);
  p.glow(tip[0], tip[1], 8, G, 0.35 * k * rune);
}

export function draw(p, t, o) {
  o = levelUp(o, { width: 0.1, height: 0.12, wave: 0.12, spikes: 0.6, rocks: 0.25, shake: 0.2, flash: 0.1 });
  if (o.lv >= 5) o.spikes *= 2;
  const C = fit(o.palette, 8), G = fit([o.glow], 1)[0], T = o.fall, S = o.seed, st = stone(C[4]), Wv = o.wave;
  sigil(p, Wv * 0.8, t * 2, G, C[6], t < T ? clamp(t / 0.12) : clamp(1 - (t - T) / 0.6), 6);
  if (t < T) {
    // 碎石被吸离地面
    for (let i = 0; i < 8; i++) {
      const r = rng(S, 40 + i);
      rock(p, { x: r.range(-Wv, Wv) * 0.8, y: -t / T * r.range(6, 16), a: t * 4 + i, s: 1, life: 1, pts: rockShape(r) }, st);
    }
    // 地面隆起：土包越鼓越高，裂缝透光，越接近冲出抖得越厉害
    const k = t / T, jit = Math.sin(t * 70) * k * 1.2;
    p.place(p.tx + jit, p.ty);
    p.disc(0, 2, o.width * 0.9 + 4, () => C[2], 1);
    for (let x = -o.width; x <= o.width; x++) {
      const h = Math.max(0, (1 - (x / o.width) ** 2)) * 7 * k;
      if (h > 0.5) { p.line(x, 0, x, -h, x < 0 ? C[5] : C[3], 1); p.dot(x, -h, C[6], 1); }
    }
    for (let i = 0; i < 5; i++) {
      const r = rng(S, 620 + i), a = r.range(-2.6, -0.5);
      p.line(0, -3 * k, Math.cos(a) * o.width * 0.8 * k, -3 * k + Math.sin(a) * 5 * k, G, k);
    }
    p.glow(0, -3, 12 + 14 * k, G, 0.5 * k);
    p.place(p.tx - jit, p.ty);
    return;
  }
  const u = t - T, hold = 1.1, sink = clamp((u - hold) / 0.5), shake = u < 0.22 ? Math.sin(u * 90) * o.shake * (1 - u / 0.22) : 0;
  p.place(p.tx + shake, p.ty + Math.abs(shake) * 0.5, false, 0);
  flash(p, C[7], o.flash * clamp(1 - u / 0.08));
  rays(p, 0, -o.height * 0.4, 10, 50 * clamp(u / 0.06), G, clamp(1 - u / 0.3));
  // 地裂透出符光
  const crack = clamp(u / 0.1) * clamp(1 - sink);
  if (o.lv >= 3) for (let i = 0; i < 8; i++) {
    const r = rng(S, 50 + i), dir = i % 2 ? 1 : -1, len = r.range(14, Wv) * crack;
    let x = dir * o.width * 0.45, y = 0;
    for (let s = 0; s < len; s += 2) { x += dir * 2; y = Math.round(r.range(-0.7, 0.7) + y * 0.6); p.dot(x, y, G, 0.9 * crack); p.glow(x, y, 3, G, 0.15 * crack); }
  }
  // 两圈冲击波
  dustRing(p, 0, -2, Wv * clamp(u / 0.35), 5, 0.95 * (1 - clamp(u / 0.6)), st.dust, { sy: 0.3, ph: S });
  if (o.lv >= 3) shock(p, Wv * 1.2 * clamp((u - 0.05) / 0.35), 3, G, clamp(1 - (u - 0.05) / 0.45), 0.3);
  // 石刺破土
  for (let i = 0; i < o.spikes; i++) {
    const r = rng(S, 60 + i), side = i % 2 ? 1 : -1, d = side * r.range(o.width * 0.8, Wv * 0.9);
    const grow = clamp((u - 0.05 - Math.abs(d) * 0.004) / 0.06) * clamp(1 - sink * 1.4), h = r.range(10, 20) * grow;
    if (grow <= 0) continue;
    const lean = side * r.range(0.1, 0.4);
    p.tri(d - 4, 1, d + 4, 1, d + lean * h, -h, C[5], 1);
    p.tri(d, 1, d + 4, 1, d + lean * h, -h, C[3], 1);
  }
  // 石柱冲出：0.12 秒内从地下顶到超高再回弹到原高
  const q = clamp(u / 0.12), rise = q < 1 ? 1 - (1 - q) ** 3 : 1 + 0.12 * Math.sin(Math.min(1, (u - 0.12) / 0.15) * Math.PI) * (1 - clamp((u - 0.12) / 0.15));
  if (u < 0.18) speedLines(p, 0, -o.height * rise, 0, 1, 6, 20, C[7], 1 - u / 0.18, S);
  if (sink < 1) pillar(p, 0, sink * o.height * 0.6, o.width, o.height * rise * (1 - sink * 0.6), C, G, 1 - sink, clamp(1 - u / 0.8));
  scatter(u, o.rocks, S, { speed: [60, 130], up: 0.65, g: 360, life: [0.55, 0.9] }, (x, y, vx, vy, k, r, i) => {
    rock(p, { x, y: y - 4, a: u * vx * 0.08, s: 1 + (i % 3), life: k, pts: rockShape(rng(S, 90 + i)) }, st);
  });
  for (let i = 0; i < 7; i++) {
    const uu = u - 0.05 - i * 0.03;
    if (uu < 0 || uu > 1) continue;
    p.disc((i - 3) * 10 * (1 + uu), -4 - uu * 16, 6 + uu * 10, () => st.dust, 0.4 * (1 - uu));
  }
}
