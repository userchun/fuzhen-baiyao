// 扫关卡血量倍率：node sweep.mjs <关卡下标> <倍率,倍率,...> [局数]
import { Node } from 'cc';
import { LEVELS, GAME, applyScreen } from './out/config/GameConfig.js';
import { SkillSystem } from './out/game/SkillSystem.js';
import { Combat } from './out/game/Combat.js';
import { Spawner } from './out/game/Spawner.js';
import { Feedback } from './out/game/Feedback.js';
applyScreen(1560);
const pickRandom = (o) => o[Math.floor(Math.random() * o.length)];
const pickSmart = (opts, s) => {
  const score = (o) => o.type === 'talisman' ? (s.talismans.has(o.id) ? 50 + s.talismanLevel(o.id) : 80) : o.id === 'power' ? 40 : o.id === 'multi' ? 45 : o.id === 'haste' ? 35 : 10;
  return [...opts].sort((a, b) => score(b) - score(a))[0];
};
function run(li, mult, picker) {
  const level = LEVELS[li], skills = new SkillSystem(), fb = new Feedback(new Node(), new Node());
  const combat = new Combat(new Node(), skills, fb, (e) => skills.addXp(e.def.xp));
  combat.hpMult = mult;
  const sp = new Spawner(level.waves, (id) => combat.spawnEnemy(id));
  skills.pending = level.startPicks;
  const dt = 1 / 30; let t = 0, minHp = GAME.wallHp;
  while (t < 420) {
    if (fb.hitStopT > 0) { fb.hitStopT -= dt; continue; }
    sp.update(dt); combat.update(dt); fb.update(dt); t += dt; minHp = Math.min(minHp, combat.wallHp);
    while (skills.pending > 0) { const o = picker(skills.rollOptions(), skills); skills.pending--; if (o.type === 'heal') combat.wallHp = Math.min(GAME.wallHp, combat.wallHp + 30); else skills.apply(o); }
    if (combat.wallHp <= 0) return { win: false, t, minHp: 0 };
    if (combat.bossDead) return { win: true, t, minHp };
  }
  return { win: false, t, minHp };
}
const [li, mults, n = '120'] = process.argv.slice(2);
for (const m of mults.split(',').map(Number)) {
  const row = [['随机', pickRandom], ['偏好', pickSmart]].map(([name, pk]) => {
    const rs = Array.from({ length: +n }, () => run(+li, m, pk));
    const w = rs.filter((r) => r.win), lose = rs.filter((r) => !r.win);
    const avg = (a, f) => a.length ? (a.reduce((x, r) => x + f(r), 0) / a.length).toFixed(0) : '-';
    return `${name} ${(w.length / n * 100).toFixed(0)}%（最低结界 ${avg(w, (r) => r.minHp)}，失败 ${avg(lose, (r) => r.t)}s）`;
  });
  console.log(`关卡${+li + 1} 血量×${m}: ${row.join('  ')}`);
}
