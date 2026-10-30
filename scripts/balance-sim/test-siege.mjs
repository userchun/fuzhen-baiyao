import assert from 'node:assert/strict';
import { Node } from 'cc';
import { GAME, LAYOUT, applyScreen, depthScale, lanePixels, SIEGE } from './out/config/GameConfig.js';
import { SkillSystem } from './out/game/SkillSystem.js';
import { Combat } from './out/game/Combat.js';
import { Feedback } from './out/game/Feedback.js';

applyScreen(1560);
function create() {
  const combat = new Combat(new Node(), new SkillSystem(), new Feedback(new Node(), new Node()), () => {});
  return combat;
}
function tick(c, seconds) {
  for (let i = 0; i < Math.round(seconds / 0.05); i++) c.updateEnemies(0.05);
}
function placeAtSlots(c) {
  for (const entry of c.siege) {
    if (entry.slot === null) continue;
    const e = entry.enemy;
    e.x = -LAYOUT.roadHalfW + entry.slot * (2 * LAYOUT.roadHalfW / (SIEGE.slots - 1));
    e.y = GAME.wallY + e.def.radius * depthScale(e.depth);
    e.depth = (GAME.horizonY - e.y) / lanePixels();
  }
}
{
  const c = create();
  for (let i = 0; i < 9; i++) c.spawnEnemy('lantern', 0, 1);
  tick(c, 0.05);
  assert.equal(c.siege.length, 9);
  assert.equal(new Set(c.siege.filter(e => e.slot !== null).map(e => e.slot)).size, 8);
  assert.equal(c.siege[8].slot, null);
  placeAtSlots(c);
  tick(c, 0.6);
  assert.equal(c.wallHp, 92, 'simultaneous damage is capped at 8');
  tick(c, 1.2);
  assert.equal(c.wallHp, 84, 'the budget expires after one active second');
  const freed = c.siege[0].enemy;
  c.kill(freed);
  tick(c, 0.05);
  assert.notEqual(c.siege.find(e => e.enemy !== freed && e.order === 8).slot, null, 'waiting enemy gets the freed slot');
  assert.equal(c.siege.some(e => e.enemy === freed), false);
}
{
  const c = create();
  c.spawnEnemy('paperman', 0, 1);
  tick(c, 0.05); placeAtSlots(c); tick(c, 0.35);
  const e = c.enemies[0];
  e.freezeT = 0.3;
  tick(c, 0.3);
  assert.equal(c.wallHp, 100, 'freeze cancels the pending hit');
  tick(c, 0.4);
  assert.equal(c.wallHp, 100, 'attack restarts after freeze');
  tick(c, 0.3);
  assert.equal(c.wallHp, 99);
  c.removeSiege(e);
  e.depth -= 50 / lanePixels();
  assert.equal(c.siege.length, 0, 'knockback releases the slot');
}
{
  const c = create();
  for (let i = 0; i < 4; i++) c.spawnEnemy('lantern', 0, 1);
  tick(c, 0.05); placeAtSlots(c);
  const hitNow = time => {
    c.siegeClock = time;
    for (const entry of c.siege) { entry.attackT = 0.59; entry.hit = false; }
    c.updateSiege(0.02);
  };
  hitNow(1.1);
  assert.equal(c.wallHp, 92);
  c.wallHp += 3;
  hitNow(1.99);
  assert.equal(c.wallHp, 95, 'healing and crossing a whole second do not replenish the budget');
  hitNow(2.1);
  assert.equal(c.wallHp, 87, 'a hit exactly one second old leaves the window');
}
{
  const c = create();
  for (let i = 0; i < 8; i++) c.spawnEnemy('paperman', 0, 1);
  tick(c, 0.05); placeAtSlots(c); tick(c, 0.6);
  assert.equal(c.wallHp, 92, 'eight papermen each deal one damage');
  tick(c, 1.2);
  assert.equal(c.wallHp, 84, 'eight papermen deal eight per 1.2 seconds, not per second');
}
{
  const c = create();
  c.spawnEnemy('shuigui', 0, 1);
  tick(c, 0.05); placeAtSlots(c); tick(c, 0.3);
  const e = c.enemies[0];
  const originalSlot = c.siege[0].slot;
  e.t = 2;
  tick(c, 0.5);
  assert.equal(c.wallHp, 100, 'diving cancels the pending hit');
  assert.equal(c.siege[0].slot, originalSlot, 'diving retains the slot');
  tick(c, 0.5);
  assert.equal(c.wallHp, 100, 'surfacing starts a new attack');
  tick(c, 0.65);
  assert.equal(c.wallHp, 99);
}
{
  const c = create();
  c.spawnEnemy('heishan', 0, 1);
  tick(c, 0.05);
  assert.equal(c.siege.length, 0, 'boss does not occupy a slot');
  assert.ok(c.wallHp < 100, 'boss damage bypasses the mob budget');
}
console.log('Siege boundary tests passed');
