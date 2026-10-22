// 最小 cc 桩：只为在 Node 里跑战斗逻辑
const noop = () => {};
class Comp { constructor(node) { this.node = node; } }
export class Graphics extends Comp { clear() {} circle() {} fill() {} stroke() {} rect() {} roundRect() {} moveTo() {} lineTo() {} }
export class Label extends Comp { string = ''; }
export class UITransform extends Comp { setContentSize() {} }
export class UIOpacity extends Comp { opacity = 255; }
export class Color { a = 255; fromHEX() { return this; } }
export const Layers = { Enum: { UI_2D: 1 } };
export class Node {
  constructor(name = '') { this.name = name; this.children = []; this.parent = null; this.comps = []; this.active = true; this.angle = 0; this.position = { x: 0, y: 0 }; }
  addComponent(C) { const c = new C(this); this.comps.push(c); return c; }
  getComponent(C) { return this.comps.find((c) => c instanceof C) ?? null; }
  setPosition(x, y) { this.position = { x, y }; }
  setScale() {}
  addChild(n) { n.parent = this; this.children.push(n); }
  removeFromParent() { if (this.parent) { this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; } }
  getChildByName(n) { return this.children.find((c) => c.name === n) ?? null; }
  destroy() { this.removeFromParent(); }
  destroyAllChildren() { this.children = []; }
  on() {}
}
Node.EventType = {};
