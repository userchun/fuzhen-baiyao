// 打击感试验层（只在网页试玩里画，不改战斗逻辑）：影子、命中火花与击退、死亡碎纸、灵气飞回、符纸光尾、暗角飘灰。
// 好用的再搬进 Cocos（ParticleFX / Feedback）。
import { ELEMENT_COLOR, GAME } from './game/config/GameConfig.js';

let ctx, cx, cy, W, H;
export function juiceInit(o) { ({ ctx, cx, cy, W, H } = o); }

const seen = new Map();   // enemy → { hp, knock }
let parts = [];           // 粒子：{ x, y, vx, vy, life, max, size, color, kind }
let orbs = [];            // 灵气：{ x, y, t, sx, sy }
let ash = [];
export let xpPulse = 0;   // 灵气到达时经验条闪一下

export function juiceReset() { seen.clear(); parts = []; orbs = []; }

const rnd = (a, b) => a + Math.random() * (b - a);
function spark(x, y, color, n, speed, life, size, kind = 'spark') {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), v = rnd(speed * 0.4, speed);
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: rnd(size * 0.6, size), color, kind, rot: rnd(0, 6), vr: rnd(-12, 12) });
  }
}

/** 每帧对比妖怪血量：掉血 → 火花 + 击退；倒下 → 碎纸 + 灵气 */
export function juiceTrack(combat, playerX) {
  const alive = new Set();
  for (const e of combat.enemies) {
    alive.add(e);
    let s = seen.get(e);
    if (!s) { seen.set(e, { hp: e.hp, knock: 0, dead: false }); continue; }
    const col = ELEMENT_COLOR[e.element] ?? '#fff';
    if (e.hp < s.hp - 0.01) {
      const dmg = s.hp - e.hp;
      spark(e.x, e.y + e.def.radius * 0.6, '#FFE9A8', Math.min(10, 3 + dmg / 6), 420, 0.25, 6);
      spark(e.x, e.y + e.def.radius * 0.6, col, 3, 260, 0.3, 5);
      s.knock = Math.min(16, s.knock + 4 + dmg / 8);
    }
    s.hp = e.hp;
    if ((e.dying || e.hp <= 0) && !s.dead) die(e, s, col, playerX);
  }
  for (const [e, s] of seen) if (!alive.has(e)) { if (!s.dead) die(e, s, ELEMENT_COLOR[e.element] ?? '#fff', playerX); seen.delete(e); }
}
function die(e, s, col, playerX) {
  s.dead = true;
  const big = e.def.boss ? 4 : e.def.radius > 35 ? 2 : 1;
  spark(e.x, e.y + e.def.radius * 0.6, col, 14 * big, 380, 0.7, 14, 'paper');
  spark(e.x, e.y + e.def.radius * 0.6, '#FFE9A8', 8 * big, 520, 0.35, 7);
  const n = Math.min(6, e.def.xp ?? 1);
  for (let i = 0; i < n; i++) orbs.push({ x: e.x + rnd(-20, 20), y: e.y + rnd(-10, 30), t: -i * 0.05, sx: rnd(-160, 160), sy: rnd(60, 200), px: playerX });
}

export const knockOf = (e) => seen.get(e)?.knock ?? 0;

/** 妖怪脚下的影子 */
export function drawShadow(e, size) {
  ctx.save(); ctx.globalAlpha = e.dying ? 0.15 : 0.35; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(cx(e.x), cy(e.y) + size * 0.42, size * 0.28, size * 0.08, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

/** 子弹画成带光尾的符纸 */
export function drawBullet(b) {
  const col = b.kind === 'manual' ? '#FFD66E' : b.kind === 'river' ? ELEMENT_COLOR.water : ELEMENT_COLOR[b.kind] ?? '#fff';
  const a = Math.atan2(-b.vy, b.vx), x = cx(b.x), y = cy(b.y), len = Math.hypot(b.vx, b.vy) * 0.05;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  const gr = ctx.createLinearGradient(-len, 0, 0, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, col);
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.globalAlpha = 0.8;
  ctx.fillRect(-len, -5, len, 10);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.shadowColor = col; ctx.shadowBlur = 18;
  if (b.kind === 'manual') { ctx.fillStyle = '#F7D774'; ctx.fillRect(-12, -7, 24, 14); ctx.fillStyle = '#C0392B'; ctx.fillRect(-6, -2, 12, 4); }
  else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, Math.max(7, b.radius), 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, Math.max(3, b.radius * 0.4), 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

/** 推进并画粒子、灵气；dt 已含暂停/倍速 */
export function drawParticles(dt, playerX) {
  for (const s of seen.values()) s.knock *= Math.exp(-14 * dt);
  parts = parts.filter((p) => (p.life -= dt) > 0);
  for (const p of parts) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy = p.vy * 0.9 - (p.kind === 'paper' ? 220 : 0) * dt; p.rot += p.vr * dt;
    const k = p.life / p.max;
    ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.5); ctx.translate(cx(p.x), cy(p.y));
    if (p.kind === 'paper') { ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66); }
    else { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0, 0, p.size * k, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  // 灵气：先散开，再飞向主角
  const tx = playerX, ty = GAME.playerY + 40;
  orbs = orbs.filter((o) => {
    o.t += dt; if (o.t < 0) return true;
    if (o.t < 0.25) { o.x += o.sx * dt; o.y += o.sy * dt; }
    else { const k = 1 - Math.exp(-(8 + o.t * 20) * dt); o.x += (tx - o.x) * k; o.y += (ty - o.y) * k; }
    if (Math.hypot(o.x - tx, o.y - ty) < 18 && o.t > 0.3) { xpPulse = 0.25; return false; }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#7FD8FF'; ctx.shadowColor = '#7FD8FF'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(cx(o.x), cy(o.y), 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    return true;
  });
  xpPulse = Math.max(0, xpPulse - dt);
}

/** 暗角 + 飘灰 + 符光照亮主角脚下 */
export function drawAtmosphere(dt, playerX) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(cx(playerX), cy(GAME.playerY), 10, cx(playerX), cy(GAME.playerY), 260);
  gl.addColorStop(0, 'rgba(255,200,110,0.22)'); gl.addColorStop(1, 'rgba(255,200,110,0)');
  ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H); ctx.restore();
  while (ash.length < 40) ash.push({ x: rnd(0, W), y: rnd(0, H), v: rnd(15, 45), s: rnd(1, 3), ph: rnd(0, 6) });
  ctx.save(); ctx.fillStyle = 'rgba(255,190,140,0.5)';
  for (const a of ash) {
    a.y -= a.v * dt; a.ph += dt; if (a.y < -10) { a.y = H + 10; a.x = rnd(0, W); }
    ctx.globalAlpha = 0.3 + 0.3 * Math.sin(a.ph * 2);
    ctx.fillRect(a.x + Math.sin(a.ph) * 12, a.y, a.s, a.s);
  }
  ctx.restore();
  const v = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.3, W / 2, H * 0.5, H * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,10,0.6)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

/** 伤害数字：越大越醒目 */
export function drawDamageText(str, x, y, life) {
  const n = parseFloat(str) || 0;
  const big = n >= 60 ? 1.7 : n >= 25 ? 1.3 : 1;
  const col = n >= 60 ? '#FF6A3D' : n >= 25 ? '#FFD66E' : '#FFF4D0';
  const pop = 1 + Math.max(0, life - 0.75) * 2;
  ctx.save(); ctx.globalAlpha = Math.min(1, life * 2); ctx.translate(x, y); ctx.scale(big * pop, big * pop);
  ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#1a0d05'; ctx.fillStyle = col;
  ctx.strokeText(str, 0, 0); ctx.fillText(str, 0, 0); ctx.restore();
}
