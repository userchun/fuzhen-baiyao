import { Node } from 'cc';
import { LEVELS, GAME, applyScreen } from './out/config/GameConfig.js';
import { SkillSystem } from './out/game/SkillSystem.js';
import { Combat } from './out/game/Combat.js';
import { Spawner } from './out/game/Spawner.js';
import { Feedback } from './out/game/Feedback.js';

applyScreen(1560);
const pickRandom = (opts) => opts[Math.floor(Math.random() * opts.length)];
const pickSmart = (opts, s) => {
  const score = (o) => o.type === 'talisman' ? (s.talismans.has(o.id) ? 50 + s.talismanLevel(o.id) : 80) : o.id === 'power' ? 40 : o.id === 'multi' ? 45 : o.id === 'haste' ? 35 : 10;
  return [...opts].sort((a, b) => score(b) - score(a))[0];
};

function run(levelIdx, picker) {
  const level = LEVELS[levelIdx];
  const skills = new SkillSystem();
  const fb = new Feedback(new Node(), new Node());
  const combat = new Combat(new Node(), skills, fb, (e) => skills.addXp(e.def.xp));
  combat.hpMult = level.hpMult;
  const sp = new Spawner(level.waves, (id) => combat.spawnEnemy(id));
  skills.pending = level.startPicks;
  const dt = 1 / 30;
  let t = 0, bossAt = null, minHp = GAME.wallHp;
  while (t < 420) {
    if (fb.hitStopT > 0) { fb.hitStopT -= dt; continue; }
    sp.update(dt); combat.update(dt); fb.update(dt); t += dt;
    if (bossAt === null && combat.enemies.some((e) => e.def.boss)) bossAt = t;
    minHp = Math.min(minHp, combat.wallHp);
    while (skills.pending > 0) {
      const o = picker(skills.rollOptions(), skills); skills.pending--;
      if (o.type === 'heal') combat.wallHp = Math.min(GAME.wallHp, combat.wallHp + 30); else skills.apply(o);
    }
    if (combat.wallHp <= 0) return { win: false, t, lv: skills.level, minHp: 0, bossT: bossAt ? t - bossAt : null };
    if (combat.bossDead) return { win: true, t, lv: skills.level, minHp, bossT: t - bossAt };
  }
  return { win: false, t, lv: skills.level, timeout: true, minHp };
}

const N = 40;
for (const [li] of LEVELS.entries()) for (const [name, pk] of [['随机', pickRandom], ['偏好', pickSmart]]) {
  const rs = Array.from({ length: N }, () => run(li, pk));
  const wins = rs.filter((r) => r.win);
  const avg = (a, f) => a.length ? (a.reduce((x, r) => x + f(r), 0) / a.length).toFixed(1) : '-';
  const loseT = rs.filter((r) => !r.win && !r.timeout);
  console.log(`${LEVELS[li].name} [${name}] 胜率 ${(wins.length / N * 100).toFixed(0)}%  通关用时 ${avg(wins, (r) => r.t)}s  Boss耗时 ${avg(wins, (r) => r.bossT)}s  最低结界 ${avg(wins, (r) => r.minHp)}  等级 ${avg(rs, (r) => r.lv)}  失败时刻 ${avg(loseT, (r) => r.t)}s  超时 ${rs.filter((r) => r.timeout).length}`);
}
