import assert from 'node:assert/strict';
import { Node } from 'cc';
import { Combat } from './out/game/Combat.js';
import { SkillSystem } from './out/game/SkillSystem.js';
import { Feedback } from './out/game/Feedback.js';
const create=()=>new Combat(new Node(),new SkillSystem(),new Feedback(new Node(),new Node()),()=>{});
{
 const c=create();c.spawnEnemy('paperman',0,.2);c.spawnEnemy('lantern',0,.2);c.spawnEnemy('lantern',0,.2);
 const [target,a,b]=c.enemies;
 assert.equal(c.hasteMultiplier(target),1.3,'overlapping aura does not stack');
 a.alive=false;b.freezeT=1;assert.equal(c.hasteMultiplier(target),1,'dead/frozen sources do not buff');
 b.freezeT=0;b.t=3;assert.equal(c.hasteMultiplier(target),1,'outside pulse window');
 b.t=0;b.x=1000;assert.equal(c.hasteMultiplier(target),1,'outside radius');
}
{
 const c=create();c.spawnEnemy('tongqian',0,.2);const e=c.enemies[0];const initial=e.hp;
 c.hurt(e,10,'none');assert.equal(initial-e.hp,7);assert.equal(e.armorBroken,true);
 c.hurt(e,10,'none');assert.equal(initial-e.hp,17,'subsequent hit has no armor');
}
{
 const c=create();c.spawnEnemy('shuigui',0,.9);const e=c.enemies[0];e.t=2.3;c.updateEnemies(.01);
 assert.equal(e.diving,false,'must surface near barrier');
}
{
 const c=create();c.spawnEnemy('heishan',0,.2);const e=c.enemies[0];e.hp=e.maxHp*.5;e.smashCooldown=.01;
 c.updateEnemies(.02);assert.ok(e.smashWindup>0);const hp=c.wallHp;
 e.freezeT=2;const wind=e.smashWindup;c.updateEnemies(.1);assert.equal(e.smashWindup,wind,'freeze pauses windup');
 e.freezeT=0;c.updateEnemies(1.6);assert.equal(c.wallHp,hp-12);assert.ok(e.weakT>0,'smash exposes core');
 e.smashCooldown=0;c.updateEnemies(.01);e.alive=false;const after=c.wallHp;c.updateEnemies(2);assert.equal(c.wallHp,after,'dead boss cannot finish smash');
}
console.log('荒村阵容：光环不叠加/失效、一次性护甲、近墙显形、砸地预警/冻结/死亡取消通过');
