import { Node, Graphics, Label } from 'cc';
import { EnemyDef, Element, ELEMENT_COLOR, ELEMENT_NAME } from '../config/GameConfig';
import { paintCircle, hex } from '../core/Draw';

// 妖怪外观：属性颜色/角标、血条

export function paintElement(node: Node, def: EnemyDef, el: Element): void {
    paintCircle(node.getComponent(Graphics), def.radius, ELEMENT_COLOR[el]);
    node.getChildByName('badge').getComponent(Label).string = ELEMENT_NAME[el];
}

export function drawHp(e: { node: Node; hp: number; maxHp: number; def: EnemyDef }): void {
    const bar = e.node.getChildByName('hp');
    if (!bar) return;
    const g = bar.getComponent(Graphics);
    const w = e.def.radius * 2;
    g.clear();
    g.fillColor = hex('#000000', 160);
    g.rect(-w / 2, -4, w, 8);
    g.fill();
    g.fillColor = hex('#E74C3C');
    g.rect(-w / 2, -4, w * Math.max(0, e.hp / e.maxHp), 8);
    g.fill();
}
