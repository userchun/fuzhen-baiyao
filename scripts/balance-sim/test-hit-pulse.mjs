import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const dir = mkdtempSync(join(tmpdir(), 'fuzhen-pulse-'));
try {
  mkdirSync(join(dir, 'node_modules/cc'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  writeFileSync(join(dir, 'node_modules/cc/package.json'), '{"type":"module","exports":"./index.js"}');
  writeFileSync(join(dir, 'node_modules/cc/index.js'), `
    export class Vec3 { constructor(x, y, z) { Object.assign(this, { x, y, z }); } }
    export class Tween { static stopAllByTarget() {} }
    export class Node { constructor() { this.isValid = true; this.scale = new Vec3(1, 1, 1); } }
    export function tween(node) {
      const steps = [];
      const t = { to(_duration, props) { steps.push(props); return t; }, call() { return t; },
        start() { node.scale = steps[0].scale; return t; } };
      return t;
    }
  `);
  execFileSync('tsc', ['--ignoreConfig', resolve('assets/scripts/game/Anim.ts'), '--target', 'ES2020', '--module', 'ESNext', '--moduleResolution', 'bundler', '--skipLibCheck', '--noCheck', '--outDir', dir]);
  const { hitPulse } = await import(`file://${join(dir, 'Anim.js')}`);
  const { Node } = await import(`file://${join(dir, 'node_modules/cc/index.js')}`);
  const node = new Node();
  for (let i = 0; i < 30; i++) hitPulse(node, 1.1, true, 1);
  assert.ok(node.scale.x <= 1.100001, `repeated hits inflated scale to ${node.scale.x}`);
  console.log('Repeated hit pulse stays bounded');
} finally { rmSync(dir, { recursive: true, force: true }); }
