import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

// 真实 Combat + FrameAnim，cc 仅替代渲染；不修改游戏存档或战斗配置。
const dir = mkdtempSync(join(tmpdir(), 'fuzhen-player-'));
try {
  mkdirSync(join(dir, 'node_modules'), { recursive: true });
  cpSync(resolve('scripts/balance-sim/stub/cc'), join(dir, 'node_modules/cc'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  const out = join(dir, 'out');
  execFileSync('tsc', [...(Number(execFileSync('tsc', ['--version'], {encoding:'utf8'}).match(/(\d+)\./)[1]) >= 6 ? ['--ignoreConfig'] : []), resolve('assets/scripts/game/Combat.ts'),
    '--target', 'ES2020', '--module', 'ESNext', '--moduleResolution', 'bundler',
    '--skipLibCheck', '--noCheck', '--rootDir', resolve('assets/scripts'), '--outDir', out]);
  const rewrite = (path) => {
    for (const item of readdirSync(path, { withFileTypes: true })) {
      const file = join(path, item.name);
      if (item.isDirectory()) rewrite(file);
      else if (file.endsWith('.js')) writeFileSync(file,
        readFileSync(file, 'utf8').replace(/(from ['"]\.[^'"]+)(['"])/g, '$1.js$2'));
    }
  };
  rewrite(out);
  const load = (path) => import(pathToFileURL(join(dir, path)).href);
  const { Node, Sprite } = await load('node_modules/cc/index.js');
  const { Combat } = await load('out/game/Combat.js');
  const { FrameAnim } = await load('out/game/FrameAnim.js');
  const { SkillSystem } = await load('out/game/SkillSystem.js');
  const c = new Combat(new Node(), new SkillSystem(), { shake() {} }, () => {});
  const { GAME, LAYOUT, applyScreen } = await load('out/config/GameConfig.js');
  for (const height of [1280, 1561]) {
    applyScreen(height);
    assert.ok(GAME.playerY + 80 < GAME.wallY, 'entire player stays behind barrier');
    assert.ok(GAME.playerY - 80 > GAME.wallY - 210 + 10, 'feet clear health bar');
  }
  // 真实绘制函数：轮廓稳定、确定性、五行各有动画、受击和血量恢复无残留。
  const { barrierArt, BARRIER_STYLES } = await load('out/game/BarrierArt.js');
  for (const element of Object.keys(BARRIER_STYLES)) {
    const state = { element, time: 0, health: 1, level: 0, hits: [], breakTime: 0 };
    const first = barrierArt(state);
    const later = barrierArt({ ...state, time: 0.35 });
    assert.deepEqual(first[0], later[0], `${element}: barrier silhouette stays fixed`);
    assert.notDeepEqual(first, later, `${element}: element has real animation`);
    assert.deepEqual(later, barrierArt({ ...state, time: 0.35 }), 'animation is deterministic');
    const weak = barrierArt({ ...state, health: 0.2 });
    assert.ok(weak[0].alpha < first[0].alpha, 'low health visibly weakens barrier');
    assert.deepEqual(first, barrierArt(state), 'restoring health restores intact rendering');
    assert.notDeepEqual(first, barrierArt({ ...state, hits: [{ x: 100, age: 0.1 }] }), 'hit produces local feedback');
    const breaking = barrierArt({ ...state, health: 0, breakTime: 0.1 });
    assert.ok(breaking.length > 0, 'breaking emits fragments');
    assert.equal(barrierArt({ ...state, health: 0, breakTime: 0.8 }).length, 0, 'broken barrier fades away');
    for (const shape of [...first, ...later, ...weak, ...breaking]) {
      assert.ok(shape.alpha >= 0 && shape.alpha <= 255, 'valid opacity');
      assert.ok((shape.rect ?? shape.path).every(Number.isFinite), 'finite drawing geometry');
    }
  }
  const player = new Node();
  const sprite = player.addComponent(Sprite);
  c.playerAnim = new FrameAnim(player);
  const clip = (name, fps, loop) => ({ frames: [0, 1, 2, 3].map(i => ({ name, i })), fps, loop });
  c.playerIdle = clip('idle', 3, true);
  c.playerCast = clip('cast', 12, false);
  c.playerHit = clip('hit', 12, false);
  c.playPlayerIdle();
  c.playerAnim.update(0.4);
  assert.equal(sprite.spriteFrame.name, 'idle');
  assert.equal(sprite.spriteFrame.i, 1, 'idle advances');
  c.manualShot(0, 500);
  c.playerAnim.update(0.1);
  const castFrame = sprite.spriteFrame;
  c.playPlayerCast();
  assert.equal(sprite.spriteFrame, castFrame, 'overlapping casts do not restart the clip');
  c.playPlayerHit();
  assert.equal(sprite.spriteFrame, castFrame, 'cast retains priority over hit');
  c.playerAnim.update(0.25);
  assert.equal(sprite.spriteFrame.name, 'idle', 'cast completes back to idle');
  c.playPlayerHit();
  assert.equal(sprite.spriteFrame.name, 'hit');
  c.playerAnim.update(0.1);
  const hitFrame = sprite.spriteFrame;
  const bullets = c.bullets.length;
  c.manualCd = 0;
  c.manualShot(0, 500);
  assert.equal(c.bullets.length, bullets + 1, 'hit animation does not block attack damage');
  assert.equal(sprite.spriteFrame, hitFrame, 'attack does not interrupt hit recovery');
  c.playerAnim.update(0.25);
  assert.equal(sprite.spriteFrame.name, 'idle', 'hit completes back to idle');
  c.playPlayerHit();
  assert.equal(sprite.spriteFrame.name, 'idle', 'hit remains throttled');
  c.playPlayerCast();
  assert.equal(sprite.spriteFrame.name, 'cast', 'casting resumes after recovery');
  console.log('Five-element barrier animation, health feedback, player layout and attack continuity passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
