// 青藤符（木）：不从天降，从地里长出——地面先裂开、透出绿光、泥土跳动，随后一束藤枪破土冲起，翠绿符阵展开，藤蔓贴地向外蔓延织成一片藤网，
// 网中不断有藤须破土卷起缠人，叶片飘起，持续掉血时地面一跳一跳地发光；时间到藤网枯萎退去。
// 等级越高范围越大、藤越多：3 级起藤上长出暗红荆棘，5 级藤网开花、花瓣纷飞。
// 叶片和藤须的生长节奏参考 PixelFX nature/root-snare（MIT）。
import { fit, clamp, rng, hex } from "../../core/index.js";
import { FRAME, fallK, groundMark, sigil, shock, rays, flash, levelUp } from "./_lib.js";

export const meta = {
  name: "青藤符 · 藤网",
  desc: "符种落地、藤网蔓延、藤须缠绕、持续伤害，随等级变强。",
  tags: ["fuzhen", "wood"], ...FRAME, duration: 3.2, loop: true, fps: 30, bg: "dark",
  options: {
    bind: 1, // 预览时画束缚；游戏里束缚是命中特效（status_slow），烘焙时关掉
    palette: ["#08140a", "#123018", "#1e5024", "#2e7a30", "#4ea83a", "#86d050", "#c4ec7a", "#f0ffc0"],
    bloom: ["#7a2a4a", "#d0608a", "#f8b0c8", "#fff0f4"], // 5 级花色
    level: 1, // 符咒等级 1–5
    fall: 0.4, // 地面裂开蓄势用时（秒）
    radius: 34, // 藤网半径（1 级）
    vines: 6, // 贴地主藤数量
    tendrils: 4, // 破土卷起的藤须数量
    leaves: 8, // 飘起的叶片数量
    tick: 0.5, // 持续伤害跳动间隔（秒）
    life: 2.2, // 藤网持续（秒）
    flash: 0.3,
    seed: 8,
  },
};

const SY = 0.34, THORN = hex("#8a2a2a"), THORN_TIP = hex("#d0604a");

// 一根贴地主藤：从中心沿角度 a 蜿蜒向外，长到 grow（0..1）
function groundVine(p, a, R, grow, C, k, thorns, S) {
  const n = Math.round(R * grow / 1.5);
  let px = 0, py = 0;
  for (let i = 1; i <= n; i++) {
    const d = i * 1.5, w = Math.sin(d * 0.35 + S) * 4 * (d / R);
    const x = Math.cos(a) * d - Math.sin(a) * w, y = (Math.sin(a) * d + Math.cos(a) * w) * SY;
    p.line(px, py, x, y, i % 5 ? C[3] : C[4], k);
    if (i % 7 === 3) { p.dot(x, y - 1, C[5], k); p.dot(x + 1, y - 1, C[4], k); } // 小叶
    if (thorns && i % 6 === 0) { p.line(x, y, x + 1, y - 2.5, THORN, k); p.dot(x + 1, y - 2.5, THORN_TIP, k); }
    px = x; py = y;
  }
  p.glow(px, py, 5, C[5], 0.3 * k);
}

// 一根藤须：从地面 (x,y) 破土卷起，像钩子一样弯过来
function tendril(p, x, y, h, grow, side, C, k) {
  const steps = Math.round(h * grow);
  let px = x, py = y;
  for (let i = 1; i <= steps; i++) {
    const q = i / h, curl = q > 0.6 ? (q - 0.6) * 2.5 : 0;
    const nx = x + side * (Math.sin(q * 3) * 3 + curl * 6), ny = y - i + curl * curl * 4;
    p.line(px, py, nx, ny, q > 0.7 ? C[5] : C[4], k);
    if (q < 0.5) p.dot(nx - side, ny, C[2], k);
    px = nx; py = ny;
  }
  p.dot(px, py, C[6], k);
}

// 束缚：藤蔓从地面螺旋缠上妖怪身体（高 h、半径 rad），前半圈压在身前、后半圈在身后变暗；
// grow 0..1 往上缠，squeeze 收紧（伤害跳动时一紧），snap 时断成几截散开
function bind(p, x, h, rad, grow, squeeze, snap, C, k, thorns, S) {
  const turns = 3, steps = 70, top = h * grow, rr = rad * (1 - 0.18 * squeeze);
  for (const front of [false, true]) {
    let px = null, py = null;
    for (let i = 0; i <= steps; i++) {
      const q = i / steps, y = -q * top, a = q * turns * Math.PI * 2 + S, cx = Math.cos(a), isFront = Math.sin(a) > 0;
      const brk = snap > 0 && (i % 12) < 12 * snap; // 断开的段
      const nx = x + cx * rr * (1 - q * 0.25) + (snap > 0 ? Math.sign(cx) * snap * 8 * q : 0), ny = y + (snap > 0 ? snap * snap * 14 : 0);
      if (px !== null && isFront === front && !brk) {
        if (front) { p.line(px, py + 1.5, nx, ny + 1.5, C[1], k); p.line(px, py + 0.7, nx, ny + 0.7, C[3], k); }
        p.line(px, py, nx, ny, front ? C[5] : C[2], k);
        if (front) p.dot(nx, ny - 1, C[6], k * 0.8);
        if (front && thorns && i % 9 === 0) { p.line(nx, ny, nx + Math.sign(cx) * 2.5, ny - 1.5, C[0], k); p.dot(nx + Math.sign(cx) * 2.5, ny - 1.5, C[6], k); }
        if (front && i % 14 === 7) { p.dot(nx + 1, ny - 1, C[5], k); p.dot(nx + 2, ny - 1, C[4], k); }
      }
      px = nx; py = ny;
    }
  }
  // 顶端藤尖卷起；缠紧时身上一圈绿光
  p.glow(x, -top * 0.5, rad * 2.2, C[5], (0.2 + 0.4 * squeeze) * k * (1 - snap));
}

export function draw(p, t, o) {
  o = levelUp(o, { radius: 0.15, vines: 0.3, tendrils: 0.35, leaves: 0.4, flash: 0.1 });
  const C = fit(o.palette, 8), B = fit(o.bloom, 4), T = o.fall, S = o.seed, R = o.radius;
  const sigK = t < T ? clamp(t / 0.12) : clamp(1 - (t - T - o.life) / 0.4);
  sigil(p, R, t * 1.5, C[4], C[5], sigK * 0.8, 5);
  // 蓄势：地面从中心裂开，裂缝透出绿光，泥土一跳一跳，地面微微鼓起
  if (t < T) {
    const k = t / T;
    groundMark(p, 10 + 8 * k, C[1], 0.7, SY);
    groundMark(p, 6 + 6 * k, C[4], 0.3 + 0.4 * k * (0.7 + 0.3 * Math.sin(t * 40)), SY);
    for (let i = 0; i < 6; i++) {
      const r = rng(S, 600 + i), a = (i / 6) * Math.PI * 2 + r.range(-0.3, 0.3), len = R * 0.7 * k;
      let x = 0, y = 0;
      for (let d = 2; d < len; d += 2) { const nx = Math.cos(a) * d + r.range(-1, 1), ny = Math.sin(a) * d * SY; p.line(x, y, nx, ny, C[5], 0.9); x = nx; y = ny; }
      p.glow(x, y, 4, C[5], 0.4 * k);
    }
    for (let i = 0; i < 8; i++) {
      const r = rng(S, 650 + i), hop = Math.abs(Math.sin(t * 18 + i * 2)) * 4 * k;
      p.dot(r.range(-R, R) * 0.5 * k, r.range(-2, 2) - hop, C[1], 1);
    }
    p.glow(0, -2, 14 + 10 * k, C[5], 0.5 * k);
    return;
  }
  const u = t - T, live = clamp(1 - (u - o.life) / 0.4), spread = clamp(u / 0.45) ** 0.7;
  if (live <= 0) return;
  flash(p, C[6], o.flash * clamp(1 - u / 0.1));
  if (u < 0.3) rays(p, 0, -4, 8, 24 * clamp(u / 0.05), C[6], 1 - u / 0.3);
  shock(p, R * 1.2 * clamp(u / 0.3), 2, C[5], clamp(1 - u / 0.4), SY);
  // 破土：一束藤枪从中心冲天而起，再弯下来散成藤网
  if (u < 0.5) for (let i = 0; i < 3 + o.lv; i++) {
    const r = rng(S, 700 + i), h = r.range(30, 55) * (1 + o.lv * 0.08), up = Math.sin(Math.PI * clamp(u / 0.5)), side = r.range(-1, 1);
    tendril(p, side * 3, 0, h * up, 1, side >= 0 ? 1 : -1, C, 1);
  }
  if (u < 0.3) for (let i = 0; i < 10; i++) { const r = rng(S, 760 + i); p.dot(r.range(-8, 8), -u * r.range(40, 90) + 80 * u * u, C[1], 1 - u / 0.3); }
  // 藤网底色，持续伤害时一跳一跳地亮
  const beat = Math.max(0, 1 - ((u % o.tick) / o.tick) * 3);
  groundMark(p, R * spread, C[2], (0.35 + 0.25 * beat) * live, SY);
  if (beat > 0) shock(p, R * spread * (0.6 + 0.4 * (1 - beat)), 1.5, C[6], beat * 0.6 * live, SY);
  // 贴地主藤
  for (let i = 0; i < o.vines; i++) {
    const r = rng(S, i), a = (i / o.vines) * Math.PI * 2 + r.range(-0.3, 0.3);
    groundVine(p, a, R * r.range(0.75, 1), spread, C, live, o.lv >= 3, i * 1.7);
  }
  // 3 级起荆棘：沿网边一圈暗红尖刺
  if (o.lv >= 3) for (let i = 0; i < 10 + o.lv * 3; i++) {
    const a = (i / (10 + o.lv * 3)) * Math.PI * 2, x = Math.cos(a) * R * spread * 0.92, y = Math.sin(a) * R * spread * SY * 0.92;
    p.line(x, y, x + Math.cos(a) * 2, y - 4, THORN, live);
    p.dot(x + Math.cos(a) * 2, y - 4, THORN_TIP, live);
  }
  // 藤须：错开时间破土卷起，缠一下再缩回
  for (let i = 0; i < o.tendrils; i++) {
    const r = rng(S, 40 + i), a = r.range(0, Math.PI * 2), d = r.range(0.2, 0.85) * R;
    const born = 0.15 + r.range(0, Math.max(0.2, o.life - 0.8)), uu = u - born, L = 0.9;
    if (uu < 0 || uu > L) continue;
    const g = uu < 0.2 ? uu / 0.2 : uu > L - 0.25 ? (L - uu) / 0.25 : 1;
    tendril(p, Math.cos(a) * d, Math.sin(a) * d * SY, r.range(12, 20) * (1 + o.lv * 0.08), g, r.sign(), C, live);
  }
  // 束缚：正中目标必缠，3 级起再缠两侧各一只，5 级缠五只
  const holds = [[0, 1]].concat(o.lv >= 3 ? [[-R * 0.6, 0.85], [R * 0.6, 0.85]] : [], o.lv >= 5 ? [[-R * 0.3, 0.7], [R * 0.32, 0.7]] : []);
  if (o.bind >= 0.5) holds.forEach(([hx, sc], i) => {
    const b0 = 0.12 + i * 0.07, g = clamp((u - b0) / 0.3), snap = clamp((u - o.life + 0.15) / 0.3);
    if (g <= 0 || snap >= 1) return;
    bind(p, hx, 36 * sc * (1 + o.lv * 0.04), 10 * sc, g, beat, snap, C, live * (1 - snap), o.lv >= 3, i * 1.3);
  });
  // 叶片往上飘
  for (let i = 0; i < o.leaves; i++) {
    const r = rng(S, 80 + i), L = r.range(0.8, 1.3), q = ((u + r.next() * L) % L) / L;
    const x = r.range(-R, R) * 0.9 + Math.sin(q * 6 + i) * 4, y = r.range(-R, R) * SY * 0.9 - q * 30;
    const c = q < 0.5 ? C[5] : C[4];
    p.dot(x, y, c, live * (1 - q)); p.dot(x + 1, y - 1, C[6], live * (1 - q));
  }
  // 5 级开花：网上开出一圈花，花瓣纷飞
  if (o.lv >= 5) {
    const bloom = clamp((u - 0.3) / 0.3) * live;
    for (let i = 0; i < 9; i++) {
      const r = rng(S, 120 + i), a = r.range(0, Math.PI * 2), d = r.range(0.25, 0.9) * R, x = Math.cos(a) * d, y = Math.sin(a) * d * SY - 2;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) p.dot(x + dx * 1.5, y + dy * 1.2, B[2], bloom);
      p.dot(x, y, B[3], bloom); p.glow(x, y, 5, B[1], 0.35 * bloom);
    }
    for (let i = 0; i < 12; i++) {
      const r = rng(S, 160 + i), L = r.range(1, 1.6), q = ((u + r.next() * L) % L) / L;
      p.dot(r.range(-R, R) + Math.sin(q * 8 + i) * 6, -q * 60 - 4, i % 2 ? B[2] : B[1], bloom * (1 - q));
    }
  }
}
