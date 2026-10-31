// 结算与养成回归：对照 docs/gameplay-design.md 第 3.2 节完整算例
import assert from 'node:assert/strict';
import { computeSettlement, metaSnapshot } from './out/meta/Settlement.js';
import { defaultProfile, commitSettlement, buyStat, buyStar, statCost } from './out/meta/Profile.js';

// 固定序列随机源：按调用顺序返回指定的 [0,1) 值
const seq = (...v) => { let i = 0; return () => v[i++]; };
// 铜箱 30–50 取 40 → (40-30)/21；符纸 0–1 取 1 → 0.99，取 0 → 0
const c40 = 10 / 21 + 0.001;

// 荒村普通首通：3 精英，铜箱 (40,1)(40,0)(40,1)，银箱 (80,1)
{
    const rng = seq(c40, 0.99, c40, 0, c40, 0.99, 20 / 41 + 0.001, 0);
    const s = computeSettlement('r1', { level: 0, diff: 'normal', result: 'win', time: 150, eliteKills: 3, firstClear: true }, rng);
    assert.equal(s.coin, 330);
    assert.equal(s.paper, 8);
    assert.equal(s.chests.length, 4);
}
// 荒村困难首通：5 精英，铜箱各 40，符纸合计 3
{
    const rng = seq(c40, 0.99, c40, 0.99, c40, 0.99, c40, 0, c40, 0);
    const s = computeSettlement('r2', { level: 0, diff: 'hard', result: 'win', time: 150, eliteKills: 5, firstClear: true }, rng);
    assert.equal(s.coin, 600);
    assert.equal(s.paper, 20);
}
// 65 秒主动退出：只发 30 铜钱
{
    const s = computeSettlement('r3', { level: 0, diff: 'normal', result: 'quit', time: 65, eliteKills: 2, firstClear: true }, Math.random);
    assert.equal(s.coin, 30);
    assert.equal(s.paper, 0);
}
// 失败封顶、失败不算首通
{
    const s = computeSettlement('r4', { level: 1, diff: 'normal', result: 'lose', time: 999, eliteKills: 0, firstClear: true });
    assert.equal(s.coin, 90);
    assert.equal(s.first, false);
}
// 明细之和等于总数
for (let k = 0; k < 200; k++) {
    const s = computeSettlement('x', { level: k % 2, diff: k % 3 ? 'normal' : 'hard', result: 'win', time: 100, eliteKills: k % 6, firstClear: k % 4 === 0 });
    assert.equal(s.lines.reduce((a, l) => a + l.coin, 0), s.coin);
    assert.equal(s.lines.reduce((a, l) => a + l.paper, 0), s.paper);
}
// 同一 runId 只记一次；首通后解锁下一关
{
    const p = defaultProfile(2);
    const s = { runId: 'run:1', level: 0, diff: 'normal', result: 'win', coin: 330, paper: 8 };
    assert.equal(commitSettlement(p, s, 2), true);
    assert.equal(commitSettlement(p, s, 2), false);
    assert.equal(p.coin, 330);
    assert.equal(p.unlockedLevels, 2);
    assert.equal(p.cleared[0].normal, true);
}
// 购买：价格、钱不够、满级
{
    const p = defaultProfile(2);
    p.coin = 100;
    assert.equal(buyStat(p, 'wall'), true);   // 50
    assert.equal(p.coin, 50);
    assert.equal(buyStat(p, 'wall'), false);  // 65，不够
    p.coin = 1000;
    assert.equal(buyStat(p, 'altar'), true);
    assert.equal(statCost(p, 'altar'), null);
    assert.equal(buyStat(p, 'altar'), false);
    p.paper = 3;
    assert.equal(buyStar(p, 'fire'), true);
    assert.equal(buyStar(p, 'fire'), false);
    const m = metaSnapshot(p, 100);
    assert.equal(m.wallMax, 106);
    assert.equal(m.extraPicks, 1);
    assert.ok(Math.abs(m.starMult.fire - 1.05) < 1e-9);
}
console.log('结算与养成测试通过');
