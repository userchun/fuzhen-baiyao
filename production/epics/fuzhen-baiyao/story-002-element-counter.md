# Story 002: 五行相克伤害与反馈

> **Epic**: 符镇百妖
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: —

## Context

**GDD**: `design/game-brief.md`
**Requirement**: Brief MVP feature 2

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Cocos Creator 3.8.8 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

- [ ] 相克链：金克木、木克土、土克水、水克火、火克金
- [ ] 攻击克制目标：`elementTier` 返回 `crit`，伤害 ×`COUNTER_MULT`（1.5）
- [ ] 攻击被目标克：返回 `resist`，伤害 ×`RESIST_MULT`（0.7）
- [ ] 其余组合及 `none` 属性（天雷符、镇妖符）：`normal`，×1
- [ ] 护甲在倍率之后减免固定值，伤害不低于 0
- [ ] 飘字颜色/样式区分 crit / normal / resist
- [ ] Boss 阶段切换属性后，相克按新属性计算

---

## Implementation Notes

- 纯函数 `elementTier` / `TIER_MULT` 在 `GameConfig.ts`，可直接单测
- 伤害结算与飘字在 `Combat.ts` / `Feedback.ts`

---

## Out of Scope

- Story 005：Boss 阶段触发时机

---

## Files

- `assets/scripts/config/GameConfig.ts`
- `assets/scripts/game/Combat.ts`
- `assets/scripts/game/Feedback.ts`
- `tests/unit/fuzhen-baiyao/element-counter_test.ts`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Logic
**Required evidence**: `tests/unit/fuzhen-baiyao/element-counter_test.ts`（`qa.level: minimal`：advisory）

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/fuzhen-baiyao/story-001-wall-defense.md`
- Unlocks: `production/epics/fuzhen-baiyao/story-003-level-up-picks.md`
