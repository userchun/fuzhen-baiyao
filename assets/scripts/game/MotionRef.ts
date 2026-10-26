/**
 * W4-M2 / U10：符技 motion_ref_v2 运行时挂点闸。
 * 有 ref 才播对应 hitStop / 闪 / SFX；不改伤害与 CD。
 * 参考：studio-ops/fe-handoff-w4-motion-ref.md · tone-lock-l1l2-w4.md
 */
export type MotionRefId =
    | 'ice_hit'
    | 'fire_hit'
    | 'thunder_hit'
    | 'haste_cast'
    | 'combo_sheng';

/** 本轮已接线的挂点（缺 key = 空放 Fail） */
const ENABLED: ReadonlySet<MotionRefId> = new Set<MotionRefId>([
    'ice_hit',
    'fire_hit',
    'thunder_hit',
    'haste_cast',
    'combo_sheng',
]);

export function hasMotionRef(id: MotionRefId): boolean {
    return ENABLED.has(id);
}

/** CD 闪色倾向（粒子/叠色用，贴 tone-lock） */
export const MOTION_REF_TINT: Record<MotionRefId, string> = {
    ice_hit: '#D8F4FF',      // 冷白偏青
    fire_hit: '#F06A4A',     // 暖符火
    thunder_hit: '#B48CFF',  // 符箓紫电（忌黄电）
    haste_cast: '#FFB347',   // 暖符火提亮
    combo_sheng: '#E8E0F0',  // 跟既有焚/河，不另漂
};
