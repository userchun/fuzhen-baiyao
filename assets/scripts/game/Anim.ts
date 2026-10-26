import { Node, tween, Tween, Vec3 } from 'cc';

// Tween 动画辅助：呼吸、受击缩放、死亡消散、UI 弹入等。
// 所有动画只改节点 scale/position/opacity，不引入额外资源。

/** 呼吸：温和的缩放起伏，用于玩家/UI 卡片 */
export function breathe(node: Node, amplitude = 0.04, period = 1.6): Tween<Node> {
    const base = node.scale.x;
    return tween(node)
        .repeatForever(
            tween(node)
                .to(period / 2, { scale: new Vec3(base * (1 + amplitude), base * (1 + amplitude), 1) }, { easing: 'sineInOut' })
                .to(period / 2, { scale: new Vec3(base * (1 - amplitude), base * (1 - amplitude), 1) }, { easing: 'sineInOut' })
        );
}

/** 受击闪缩：快速放大再回弹 */
export function hitPulse(node: Node, scale = 1.15): void {
    const base = node.scale.x;
    tween(node)
        .to(0.08, { scale: new Vec3(base * scale, base * scale, 1) }, { easing: 'sineOut' })
        .to(0.14, { scale: new Vec3(base, base, 1) }, { easing: 'sineInOut' })
        .start();
}

/** 死亡消散：缩小 + 上浮，结束后回调 */
export function deathFade(node: Node, onDone?: () => void): void {
    tween(node)
        .to(0.25, { scale: new Vec3(0.1, 0.1, 1) }, { easing: 'quadIn' })
        .call(() => onDone?.())
        .start();
}

/** UI 弹入：从 0.7 缩放 + 淡入到 1 */
export function popIn(node: Node, dur = 0.25): void {
    node.setScale(0.7, 0.7, 1);
    tween(node)
        .to(dur, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .start();
}

/** 浮起上移（飘字/提示用） */
export function floatUp(node: Node, dy = 60, dur = 0.55): void {
    const p = node.position;
    tween(node)
        .to(dur, { position: new Vec3(p.x, p.y + dy, 0) }, { easing: 'sineOut' })
        .start();
}

/** 震屏式抖动（用于 Boss 登场 / 合击），不改全局 shakeTarget */
export function shakeNode(node: Node, power = 8, time = 0.3): void {
    const orig = node.position.clone();
    const steps = Math.max(1, Math.round(time / 0.016));
    const tw = tween(node);
    for (let i = 1; i <= steps; i++) {
        const k = (1 - i / steps) * power;
        const ox = orig.x + (Math.random() * 2 - 1) * k;
        const oy = orig.y + (Math.random() * 2 - 1) * k;
        tw.to(0.016, { position: new Vec3(ox, oy, 0) });
    }
    tw.to(0.016, { position: orig.clone() }).start();
}
