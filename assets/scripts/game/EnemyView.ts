import { Node, Graphics, Label } from 'cc';
import { EnemyDef, Element, ELEMENT_COLOR, ELEMENT_NAME } from '../config/GameConfig';
import { paintCircle, hex } from '../core/Draw';
import { ENEMY_ART, setFrame } from '../core/Art';

// 妖怪外观：属性颜色/角标、血条

/** 切换妖怪显示的属性：有图片时换对应五行配色的贴图（白骨夫人三相），否则重画色块 */
export function paintElement(node: Node, def: EnemyDef, el: Element): void {
    const art = node.getChildByName('art');
    if (art) {
        const tex = ENEMY_ART[def.id]?.tex;
        if (tex) setFrame(art, tex.replace(/_(metal|water|fire|wood|earth)$/, '_' + el));
    } else {
        paintCircle(node.getComponent(Graphics), def.radius, ELEMENT_COLOR[el]);
    }
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
