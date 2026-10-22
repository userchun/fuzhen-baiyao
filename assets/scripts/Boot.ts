import { director, Director, Node, Scene, Canvas, Camera, Layers, Color, UITransform } from 'cc';
import { EDITOR } from 'cc/env';
import { GameRoot } from './GameRoot';

const BOOT_CANVAS = 'FuzhenCanvas';

// 自启动：任何场景启动后，如果没手动挂 GameRoot，就自动创建 UI 相机 + Canvas + GameRoot。
// 清理旧版自启动在编辑器场景里误建的 Canvas（只删 名为 Canvas 且含 UICamera + GameRoot 的节点）
function cleanEditorScene(scene: Scene | null): void {
    if (!scene) return;
    const junk = scene.children.filter((n) => n.name === 'Canvas'
        && !!n.getChildByName('UICamera') && !!n.getChildByName('GameRoot'));
    junk.forEach((n) => {
        n.removeFromParent(); // 先摘掉，destroy 要到帧末才生效
        n.destroy();
    });
    if (junk.length && EDITOR) console.log(`[Boot] 已清理编辑器场景中 ${junk.length} 个多余的 Canvas，请保存场景`);
}

if (EDITOR) {
    cleanEditorScene(director.getScene());
    director.on(Director.EVENT_AFTER_SCENE_LAUNCH, cleanEditorScene);
}

director.on(Director.EVENT_AFTER_SCENE_LAUNCH, (scene: Scene) => {
    if (EDITOR) return; // 编辑器里不执行，否则会往正在编辑的场景里塞节点
    cleanEditorScene(scene); // 运行时也清一遍，防止编辑器场景残留导致多套游戏叠加
    if (scene.getChildByName(BOOT_CANVAS)) return;
    if (scene.getComponentInChildren('GameRoot')) return;

    const canvasNode = new Node(BOOT_CANVAS);
    canvasNode.layer = Layers.Enum.UI_2D;
    canvasNode.addComponent(UITransform);
    scene.addChild(canvasNode);

    const camNode = new Node('UICamera');
    camNode.layer = Layers.Enum.UI_2D;
    canvasNode.addChild(camNode);
    camNode.setPosition(0, 0, 1000);
    const cam = camNode.addComponent(Camera);
    cam.projection = Camera.ProjectionType.ORTHO;
    cam.visibility = Layers.Enum.UI_2D;
    cam.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    cam.clearColor = new Color(20, 20, 40, 255);
    cam.priority = 1 << 30;
    cam.near = 1;
    cam.far = 2000;

    canvasNode.addComponent(Canvas).cameraComponent = cam;

    const root = new Node('GameRoot');
    root.layer = Layers.Enum.UI_2D;
    root.addComponent(UITransform);
    canvasNode.addChild(root);
    root.addComponent(GameRoot);
});
