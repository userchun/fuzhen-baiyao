import { Node } from 'cc';

// 按 key 分组的节点对象池，避免频繁创建/销毁
export class Pool {
    private free = new Map<string, Node[]>();

    constructor(private factory: (key: string) => Node) {}

    get(key: string, parent: Node): Node {
        const list = this.free.get(key);
        const node = list && list.length > 0 ? list.pop() : this.factory(key);
        node.active = true;
        if (node.parent !== parent) {
            node.removeFromParent();
            parent.addChild(node);
        }
        node.angle = 0;
        node.setScale(1, 1, 1);
        return node;
    }

    put(key: string, node: Node): void {
        node.active = false;
        let list = this.free.get(key);
        if (!list) {
            list = [];
            this.free.set(key, list);
        }
        list.push(node);
    }
}
