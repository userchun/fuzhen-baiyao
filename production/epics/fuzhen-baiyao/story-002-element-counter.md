# Story 002: 五行相克伤害与反馈

> **Epic**: 符镇百妖
> **Status**: Complete
> **Layer**: Core
> **Type**: Logic
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-23

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
- [ ] 护甲在倍率之后减免固定值，伤害不低于 `MIN_HIT_DAMAGE`（1）
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

- `assets/scripts/config/GameConfig.ts` — 新增 `MIN_HIT_DAMAGE`
- `assets/scripts/game/Combat.ts` — 护甲下限改用 `MIN_HIT_DAMAGE`
- 已核对未改动：`assets/scripts/game/Feedback.ts`（飘字样式）
- 测试未写：`qa.level: minimal` 下豁免

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

## Completion Notes
**Completed**: 2026-10-23
**Criteria**: 6/7 verified（crit 18!/normal 12/resist 14 实机截图验证）
**Untested criteria**: AC-7（Boss 换属性后按新属性计算）— 仅代码核对 `Combat.ts:447-451`，未实机观察
**Deviations**: 护甲下限按用户决定改为 `MIN_HIT_DAMAGE`（1），AC 已同步；开工时依赖 story-001 尚未关闭（用户接受风险，现已关闭）
**Test Evidence**: waived at qa.level minimal；截图 `production/qa/evidence/story-002-element-counter/`
**Reviewed by**: self, no independent review
