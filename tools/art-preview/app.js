// 网页试玩：战斗 / 刷怪 / 选卡直接用游戏代码（build.sh 编译到 ./game），这里只管画面、操作和界面。
import { Node } from 'cc';
import { GAME, LAYOUT, LEVELS, ENEMIES, ELEMENT_COLOR, COMBOS, ULT_NAMES, applyScreen, depthScale } from './game/config/GameConfig.js';
import { ENEMY_ART } from './game/core/Art.js';
import { SkillSystem } from './game/game/SkillSystem.js';
import { Combat } from './game/game/Combat.js';
import { Spawner } from './game/game/Spawner.js';
import { Feedback } from './game/game/Feedback.js';
import { juiceInit, juiceReset, juiceTrack, knockOf, drawShadow, drawBullet, drawParticles, drawAtmosphere, drawDamageText, xpPulse } from './juice.js';

const TEX = '../../assets/resources/textures/';
const W = GAME.width;              // 720
const H = 1560;                    // 9:19.5
const PLAYER_SIZE = 160;           // Combat.PLAYER_ART_SIZE
const BG_RATIO = 2340 / 1080;
const HOME_FIGHT = { x: 425, y: 1752, w: 520, h: 120 }; // HomeUI.POS.fight（v14 底图坐标）
// 妖怪帧：目录与帧数、fps（Combat.ENEMY_MOVE）
const ANIM = {
  paperman: ['enemy_paperman/move', 12, 12], jiangshi: ['enemy_jiangshi/move', 12, 12],
  foxfire: ['enemy_foxfire/move', 12, 14], lantern: ['enemy_lantern/move', 12, 10],
  tongjia: ['enemy_tongjia/move', 12, 11], shuigui: ['enemy_shuigui/move', 12, 8],
  heishan: ['boss_heishan/idle', 20, 10], baigu: ['boss_baigu_metal/idle', 12, 9],
};
const PLAYER_ANIM = { idle: [12, 8], cast: [8, 12] };

// ---------- 素材 ----------
const $ = (id) => document.getElementById(id);
const missing = new Set();
let bust = '';
const cache = new Map();
function img(path) {
  let i = cache.get(path);
  if (!i) {
    i = new Image();
    i.onerror = () => { missing.add(path); $('missing').textContent = '缺图（退回色块）：\n' + [...missing].join('\n'); };
    i.src = TEX + path + bust;
    cache.set(path, i);
  }
  return i;
}
const pad = (n) => String(n).padStart(2, '0');
const frames = (prefix, n) => Array.from({ length: n }, (_, k) => img(`anim/${prefix}_${pad(k)}.png`));
const ok = (i) => i && i.complete && i.naturalWidth > 0;
$('reloadArt').onclick = () => { bust = '?t=' + Date.now(); cache.clear(); missing.clear(); $('missing').textContent = ''; };

// ---------- 画布 ----------
const cv = $('c'), ctx = cv.getContext('2d');
cv.width = W; cv.height = H;
applyScreen(H);
juiceInit({ ctx, cx: (x) => W / 2 + x, cy: (y) => H / 2 - y, W, H });
// 游戏坐标（中心原点、y 向上）↔ 画布坐标
const cx = (x) => W / 2 + x, cy = (y) => H / 2 - y;
const toGame = (ev) => {
  const r = cv.getBoundingClientRect();
  return { x: (ev.clientX - r.left) / r.width * W - W / 2, y: H / 2 - (ev.clientY - r.top) / r.height * H };
};
function drawImg(im, x, y, w, h, opt = {}) {
  if (!ok(im)) return false;
  ctx.save(); ctx.translate(x, y);
  if (opt.rot) ctx.rotate(opt.rot);
  if (opt.alpha != null) ctx.globalAlpha = opt.alpha;
  if (opt.flash) ctx.filter = `brightness(${1 + opt.flash * 2})`;
  ctx.drawImage(im, -w / 2, -h / 2, w, h);
  ctx.restore();
  return true;
}
const on = (id) => $(id).checked;

// ---------- 对局 ----------
let g = null;           // 当前对局
let paused = false, time = 0;
function newGame() {
  const level = LEVELS[0];
  const skills = new SkillSystem();
  const shakeNode = new Node();
  const fb = new Feedback(new Node(), shakeNode);
  const combat = new Combat(new Node(), skills, fb, (e) => skills.addXp(e.def.xp));
  combat.hpMult = level.hpMult;
  const spawner = new Spawner(level.waves, (id) => combat.spawnEnemy(id));
  skills.pending = level.startPicks;
  g = { level, skills, fb, combat, spawner, shakeNode, t: 0, state: 'play' };
  juiceReset();
  window.__game = g; // 调试用：控制台里看对局状态
  hideOverlay();
}

function update(dt) {
  if (!g || g.state !== 'play') return;
  if (g.fb.hitStopT > 0) { g.fb.hitStopT -= dt; return; }
  g.spawner.update(dt); g.combat.update(dt); g.fb.update(dt); g.t += dt;
  if (g.combat.wallHp <= 0) end(false);
  else if (g.combat.bossDead) end(true);
  else if (g.skills.pending > 0) openPick();
}

function openPick() {
  g.state = 'pick'; g.combat.stopHold();
  const opts = g.skills.rollOptions();
  showOverlay('<h2>灵气充盈 · 择一而修</h2>', opts.map((o) => [`<b>${o.title}</b>${o.desc ?? ''}`, () => {
    g.skills.pending--;
    if (o.type === 'heal') g.combat.wallHp = Math.min(GAME.wallHp, g.combat.wallHp + 30);
    else g.skills.apply(o).forEach((id) => {
      if (id === 'burn' || id === 'river') g.combat.playComboSheng(id, 0, GAME.wallY + 80);
      toast('五行相生 · ' + (COMBOS.find((c) => c.id === id)?.name ?? id));
    });
    hideOverlay(); g.state = 'play';
  }]));
}

function end(win) {
  g.state = 'over'; g.spawner.stop(); g.combat.stopHold();
  showOverlay(`<h2>${win ? '镇妖成功' : '城墙被破'}</h2><div>用时 ${g.t.toFixed(0)} 秒 · 击杀 ${g.combat.kills} · 等级 ${g.skills.level}</div>`,
    [['<b>再来一局</b>', newGame], ['<b>回首页</b>', () => { hideOverlay(); setView('home'); }]]);
}

// ---------- 浮层 ----------
const overlay = $('overlay');
function showOverlay(head, buttons) {
  overlay.innerHTML = head;
  for (const [html, fn] of buttons) {
    const b = document.createElement('button'); b.className = 'card'; b.innerHTML = html; b.onclick = fn; overlay.appendChild(b);
  }
  overlay.style.display = 'flex';
}
function hideOverlay() { overlay.style.display = 'none'; overlay.innerHTML = ''; }
let toastMsg = '', toastT = 0;
const toast = (m) => { toastMsg = m; toastT = 2.5; };

// ---------- 五行合体大招 ----------
const ULT_BTN = { x: W - 86, y: H - 150, r: 54 };   // 画布坐标
let ultFx = null;                                     // 演出：{ name, chain, t }
function castUlt() {
  if (!g || g.state !== 'play') return;
  const r = g.combat.castUltimate();
  if (r) ultFx = { ...r, t: 0 };
}
function hitUltBtn(ev) {
  const rc = cv.getBoundingClientRect();
  const x = (ev.clientX - rc.left) / rc.width * W, y = (ev.clientY - rc.top) / rc.height * H;
  return Math.hypot(x - ULT_BTN.x, y - ULT_BTN.y) < ULT_BTN.r + 10;
}

// ---------- 操作 ----------
let mode = null, lastX = 0;
const keys = new Set();
cv.addEventListener('pointerdown', (ev) => {
  const p = toGame(ev);
  if (view === 'home') {
    const k = H / 1846, ix = (p.x + W / 2) / k - (W / k - 852) / 2, iy = (H / 2 - p.y) / k;
    if (Math.abs(ix - HOME_FIGHT.x) < HOME_FIGHT.w / 2 && Math.abs(iy - HOME_FIGHT.y) < HOME_FIGHT.h / 2) setView('play');
    return;
  }
  if (view !== 'play' || !g || g.state !== 'play') return;
  if (hitUltBtn(ev)) { castUlt(); return; }
  cv.setPointerCapture(ev.pointerId);
  mode = 'move'; lastX = p.x; // 全自动攻击：整屏拖动 = 左右移动
});
cv.addEventListener('pointermove', (ev) => {
  if (!mode || !g || g.state !== 'play') return;
  const p = toGame(ev);
  if (mode === 'move') { movePlayer(p.x - lastX); lastX = p.x; } else g.combat.setAim(p.x, p.y, true);
});
const release = () => { mode = null; g?.combat.stopHold(); };
cv.addEventListener('pointerup', release);
cv.addEventListener('pointercancel', release);
function movePlayer(dx) {
  const lim = W / 2 - 40;
  g.combat.playerTargetX = Math.max(-lim, Math.min(lim, g.combat.playerTargetX + dx));
}
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); togglePause(); }
  if (e.code === 'KeyQ') castUlt();
  keys.add(e.code);
});
addEventListener('keyup', (e) => keys.delete(e.code));

// ---------- 面板 ----------
let view = 'home';
function setView(v) {
  view = v; $('view').value = v;
  if (v === 'play') newGame(); else { hideOverlay(); g = null; }
}
$('view').onchange = () => setView($('view').value);
$('start').onclick = () => setView(view === 'home' ? 'play' : view);
function togglePause() { paused = !paused; $('pause').textContent = paused ? '继续' : '暂停'; }
$('pause').onclick = togglePause;

// ---------- 绘制 ----------
function drawBg() {
  if (!on('showBg')) return;
  const bgH = Math.max(H, W * BG_RATIO);
  drawImg(img('bg_level1_village.png'), W / 2, bgH / 2, bgH / BG_RATIO, bgH);
}
function drawWall() {
  if (!on('showWall')) return;
  const top = cy(GAME.wallY + LAYOUT.wallArtTopAbove);
  drawImg(img('env_wall.png'), W / 2, top + LAYOUT.wallArtH / 2, LAYOUT.wallArtW, LAYOUT.wallArtH);
}
function drawEnemy(id, x, y, depth, t, extra = {}) {
  const def = ENEMIES[id], art = ENEMY_ART[id], a = ANIM[id];
  const size = def.radius * 2 * (art?.scale ?? 2.75) * depthScale(depth);
  let drawn = false;
  if (a) {
    const fr = frames(a[0], a[1]);
    drawn = drawImg(fr[Math.floor(t * a[2]) % a[1]], cx(x), cy(y), size, size, extra);
  }
  if (!drawn) { // 没有帧时退回色块，和游戏一致
    ctx.save(); ctx.globalAlpha = extra.alpha ?? 1; ctx.fillStyle = ELEMENT_COLOR[def.element];
    ctx.beginPath(); ctx.arc(cx(x), cy(y), def.radius * depthScale(depth), 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  if (on('showSeal') && art && !extra.dying) {
    const fy = art.sealYFrames ? art.sealYFrames[Math.floor(t * (a?.[2] ?? 12)) % art.sealYFrames.length] : art.sealY;
    const sx = cx(x) + ((art.sealX ?? 0.5) - 0.5) * size, sy = cy(y) - size / 2 + fy * size;
    ctx.save(); ctx.font = `bold ${Math.round(art.sealR * size * 1.5)}px "Hiragino Sans GB", serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFE9A8'; ctx.shadowColor = ELEMENT_COLOR[def.element]; ctx.shadowBlur = 10;
    ctx.fillText(def.char, sx, sy); ctx.restore();
  }
  return size;
}
function drawPlayer(x, casting) {
  if (!on('showPlayer')) return;
  const key = casting ? 'cast' : 'idle', [n, fps] = PLAYER_ANIM[key];
  const fr = frames(`player_taoist/${key}`, n);
  if (!drawImg(fr[Math.floor(time * fps) % n], cx(x), cy(GAME.playerY), PLAYER_SIZE, PLAYER_SIZE)) {
    ctx.fillStyle = '#F2E3B3'; ctx.beginPath(); ctx.arc(cx(x), cy(GAME.playerY), 32, 0, Math.PI * 2); ctx.fill();
  }
}
function bar(x, y, w, h, k, color, back = 'rgba(0,0,0,.6)') {
  ctx.fillStyle = back; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, k)), h);
}
function drawPlay(dt) {
  const c = g.combat;
  juiceTrack(c, c.playerX);
  const sp = g.shakeNode.position;
  ctx.save(); ctx.translate(sp.x, -sp.y); // 震屏
  drawBg(); drawWall();
  if (on('showFx')) for (const z of c.zones) {
    ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = ELEMENT_COLOR[z.el] ?? '#fff';
    ctx.beginPath(); ctx.arc(cx(z.x), cy(z.y), z.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  if (on('showEnemies')) {
    for (const e of [...c.enemies].sort((a, b) => b.y - a.y)) {
      const flash = e.flashT > 0 && e.flashMax ? e.flashT / e.flashMax : 0;
      const sway = id => ({ paperman: 3, jiangshi: 2 }[id] ?? 0);
      const shadowSize = e.def.radius * 2 * 3 * (0.85 + 0.15 * e.depth);
      drawShadow(e, shadowSize);
      const size = drawEnemy(e.def.id, e.x, e.y + knockOf(e), e.depth, e.t, {
        flash, alpha: e.dying ? 0.5 : 1, dying: e.dying,
        rot: Math.sin(e.t * 2) * sway(e.def.id) * Math.PI / 180,
      });
      if (!e.dying && e.hp < e.maxHp && e.flashT > 0) bar(cx(e.x) - 30, cy(e.y) - size / 2 - 10, 60, 6, e.hp / e.maxHp, '#E25A4A');
    }
  }
  if (on('showFx')) {
    for (const b of c.bullets) drawBullet(b);
    drawParticles(dt, c.playerX);
    for (const f of c.fx) {
      ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, f.life ?? 0.5)); ctx.strokeStyle = '#FFE9A8'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx(f.x), cy(f.y), f.r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }
  drawPlayer(c.playerX, c.castingPlayer);
  if (on('showFx')) drawAtmosphere(dt, c.playerX);
  if (on('showFx')) for (const t of g.fb.texts) {
    const p = t.label.node.position;
    drawDamageText(t.label.string, cx(p.x), cy(p.y), t.life);
  }
  ctx.restore(); // 震屏结束，HUD 不跟着抖
  // HUD：城墙血条、灵气条、时间、Boss 条
  bar(60, H - 60, W - 120, 22, c.wallHp / GAME.wallHp, '#9B3D2E');
  ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`结界 ${Math.ceil(c.wallHp)} / ${GAME.wallHp}`, W / 2, H - 43);
  bar(0, 0, W, 10 + xpPulse * 24, g.skills.xp / g.skills.xpNeed, xpPulse > 0 ? '#CFF4FF' : '#7FD8FF');
  ctx.textAlign = 'left'; ctx.fillText(`Lv${g.skills.level}  ${Math.floor(g.t)}s  击杀 ${c.kills}`, 16, 38);
  const boss = c.enemies.find((e) => e.def.boss && !e.dying);
  if (boss) {
    bar(120, 56, W - 240, 18, boss.hp / boss.maxHp, '#C0392B');
    ctx.textAlign = 'center'; ctx.fillText(boss.def.name, W / 2, 50);
  }
  drawUlt(c);
  if (toastT > 0) {
    ctx.save(); ctx.globalAlpha = Math.min(1, toastT); ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD66E'; ctx.fillText(toastMsg, W / 2, H * 0.3); ctx.restore();
  }
}
function drawUlt(c) {
  // 槽和按钮
  const k = Math.min(1, c.ultCharge / c.ultNeed), b = ULT_BTN, ready = c.ultReady;
  const chain = g.skills.shengChain();
  ctx.save();
  ctx.fillStyle = 'rgba(10,12,20,.75)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 4, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = ready ? '#FFD66E' : '#B8913D'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 4, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
  if (ready) { ctx.shadowColor = '#FFD66E'; ctx.shadowBlur = 20 + Math.sin(time * 8) * 12; }
  // 中心画持有的五行小珠（链上的亮，其余暗）
  const ids = ['metal', 'water', 'wood', 'fire', 'earth'];
  ids.forEach((id, i) => {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 5, on = chain.chain.includes(id), own = g.skills.talismans.has(id);
    ctx.globalAlpha = on ? 1 : own ? 0.55 : 0.18; ctx.fillStyle = ELEMENT_COLOR[id];
    ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * 24, b.y + Math.sin(a) * 24, 8, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.textAlign = 'center'; ctx.fillStyle = ready ? '#FFD66E' : '#cfc6b0';
  ctx.font = 'bold 18px "Hiragino Sans GB", sans-serif'; ctx.fillText(ready ? '合体!' : `${c.ultCharge}/${c.ultNeed}`, b.x, b.y + b.r + 24);
  ctx.font = '14px sans-serif'; ctx.fillStyle = '#cfc6b0'; ctx.fillText(`链 ${chain.len} · ${ULT_NAMES[Math.min(chain.len, 5)]}`, b.x - 30, b.y - b.r - 12);
  ctx.restore();
  // 演出：五行色光环扩散 + 全屏闪 + 大字
  if (!ultFx) return;
  ultFx.t += 1 / 60;
  const t = ultFx.t, cols = (ultFx.chain.length ? ultFx.chain : ['metal']).map((id) => ELEMENT_COLOR[id]);
  ctx.save();
  ctx.globalAlpha = Math.max(0, 0.55 - t * 0.6); ctx.fillStyle = cols[0]; ctx.fillRect(0, 0, W, H);
  cols.forEach((col, i) => {
    const rr = (t - i * 0.08) * 1600; if (rr <= 0) return;
    ctx.globalAlpha = Math.max(0, 1 - t * 0.9); ctx.strokeStyle = col; ctx.lineWidth = 40;
    ctx.beginPath(); ctx.arc(cx(g.combat.playerX), cy(GAME.playerY), rr, 0, Math.PI * 2); ctx.stroke();
  });
  const s2 = 1 + Math.max(0, 0.3 - t) * 2;
  ctx.globalAlpha = Math.min(1, Math.max(0, 1.8 - t)); ctx.translate(W / 2, H * 0.4); ctx.scale(s2, s2);
  ctx.font = 'bold 64px "Hiragino Sans GB", serif'; ctx.textAlign = 'center'; ctx.lineWidth = 10; ctx.strokeStyle = '#1a0d05';
  ctx.strokeText(ultFx.name, 0, 0); ctx.fillStyle = '#FFE9A8'; ctx.fillText(ultFx.name, 0, 0);
  ctx.restore();
  if (t > 2) ultFx = null;
}

// 素材摆放：不跑战斗，几只怪循环走到墙下
const demo = ['paperman', 'paperman', 'jiangshi', 'paperman', 'foxfire', 'jiangshi', 'paperman', 'lantern', 'foxfire', 'paperman']
  .map((id, k) => ({ id, x: (Math.random() * 2 - 1) * LAYOUT.roadHalfW, k: k / 10, ph: Math.random() * 9 }));
function drawLayout() {
  drawBg(); drawWall();
  if (on('showEnemies')) {
    const top = GAME.horizonY, span = top - GAME.wallY;
    const list = demo.map((m) => {
      const travel = span / ENEMIES[m.id].speed, p = Math.min(1, ((m.k * travel + time) % (travel + 1.5)) / travel);
      return { m, p, y: top - span * p };
    }).sort((a, b) => b.y - a.y);
    for (const { m, p, y } of list) drawEnemy(m.id, m.x, y + ENEMIES[m.id].radius, p, time + m.ph);
  }
  drawPlayer(0, false);
}
function drawGuides() {
  if (!on('showGuides') || view === 'home') return;
  ctx.save(); ctx.setLineDash([10, 8]); ctx.lineWidth = 2; ctx.font = '18px sans-serif';
  ctx.strokeStyle = ctx.fillStyle = '#5ad1ff';
  for (const x of [-LAYOUT.roadHalfW, LAYOUT.roadHalfW]) { ctx.beginPath(); ctx.moveTo(cx(x), 0); ctx.lineTo(cx(x), cy(GAME.wallY)); ctx.stroke(); }
  ctx.fillText('出怪范围', cx(LAYOUT.roadHalfW) + 6, 90);
  ctx.strokeStyle = ctx.fillStyle = '#ff7a5a';
  ctx.beginPath(); ctx.moveTo(0, cy(GAME.wallY)); ctx.lineTo(W, cy(GAME.wallY)); ctx.stroke(); ctx.fillText('垛口线', 8, cy(GAME.wallY) - 6);
  ctx.restore();
}
function drawHome() {
  const im = img('ui_home_bg.png');
  if (!ok(im)) return;
  const k = Math.min(W / im.naturalWidth, H / im.naturalHeight);
  drawImg(im, W / 2, H / 2, im.naturalWidth * k, im.naturalHeight * k);
  ctx.save(); ctx.font = 'bold 40px "Hiragino Sans GB", serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#FFD66E';
  ctx.fillText('出 战', W / 2, HOME_FIGHT.y * k + 14);
  ctx.font = 'bold 44px "Hiragino Sans GB", serif'; ctx.fillText('符镇百妖', W / 2, 215 * k + 16); ctx.restore();
}

// ---------- 主循环 ----------
let last = performance.now();
function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!paused) {
    dt *= +$('speed').value; time += dt; toastT -= dt;
    if (g && g.state === 'play') {
      const dir = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      if (dir) movePlayer(dir * 420 * dt);
      update(dt);
    }
  }
  ctx.fillStyle = '#1b1d22'; ctx.fillRect(0, 0, W, H);
  if (view === 'home') drawHome(); else if (view === 'play' && g) drawPlay(paused ? 0 : dt); else drawLayout();
  drawGuides();
  $('stats').textContent = g ? `状态：${{ play: '战斗中', pick: '选卡', over: '结束' }[g.state]}\n妖怪 ${g.combat.enemies.length} 只\n符咒：${[...g.skills.talismans].map(([id, s]) => id + ' Lv' + s.level).join('、') || '无'}` : '';
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
