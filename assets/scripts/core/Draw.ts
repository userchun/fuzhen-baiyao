import { Node, Graphics, Label, Color, UITransform, Layers, UIOpacity } from 'cc';

// 原型阶段用代码画图形，后续换成 Sprite 即可

export function hex(c: string, a = 255): Color {
    const col = new Color();
    col.fromHEX(c);
    col.a = a;
    return col;
}

export function makeNode(name: string, parent?: Node, w = 0, h = 0): Node {
    const n = new Node(name);
    n.layer = Layers.Enum.UI_2D;
    n.addComponent(UITransform).setContentSize(w, h);
    if (parent) parent.addChild(n);
    return n;
}

export function addLabel(parent: Node, text: string, size: number, color = '#FFFFFF'): Label {
    const n = makeNode('label', parent);
    const l = n.addComponent(Label);
    l.string = text;
    l.fontSize = size;
    l.lineHeight = size + 6;
    l.color = hex(color);
    return l;
}

export function circleNode(name: string, r: number, fill: string, char?: string, parent?: Node): Node {
    const n = makeNode(name, parent, r * 2, r * 2);
    paintCircle(n.addComponent(Graphics), r, fill);
    if (char) addLabel(n, char, Math.round(r * 1.1), '#1A1A2E');
    return n;
}

export function paintCircle(g: Graphics, r: number, fill: string): void {
    g.clear();
    g.fillColor = hex(fill);
    g.circle(0, 0, r);
    g.fill();
    g.lineWidth = 3;
    g.strokeColor = hex('#1A1A2E', 200);
    g.circle(0, 0, r);
    g.stroke();
}

export function rectNode(name: string, w: number, h: number, fill: string, parent?: Node, radius = 0, alpha = 255): Node {
    const n = makeNode(name, parent, w, h);
    const g = n.addComponent(Graphics);
    g.fillColor = hex(fill, alpha);
    if (radius > 0) g.roundRect(-w / 2, -h / 2, w, h, radius);
    else g.rect(-w / 2, -h / 2, w, h);
    g.fill();
    return n;
}

export function setOpacity(n: Node, v: number): void {
    const op = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity);
    op.opacity = v;
}
