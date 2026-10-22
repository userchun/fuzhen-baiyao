# Story 004: 相生合击（焚林燎原、天河倒悬）

> **Epic**: 符镇百妖
> **Status**: Complete
> **Layer**: Feature
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-23

## Context

**GDD**: `design/game-brief.md`
**Requirement**: Brief MVP feature 4

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Cocos Creator 3.8.8 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

- [ ] 青藤符与烈焰符均 ≥3 级时解锁「焚林燎原」，且只解锁一次
- [ ] 金光符与寒冰符均 ≥3 级时解锁「天河倒悬」，且只解锁一次
- [ ] 任一符咒未达 3 级时不解锁
- [ ] 焚林燎原：藤蔓伤害 ×3
- [ ] 天河倒悬：每 6 秒水龙横扫全屏，对全部在场妖怪造成伤害
- [ ] 解锁时有明确提示（文字或特效）

---

## Implementation Notes

- 解锁判定基于 `COMBOS` 配置，在 `SkillSystem.ts`，可单测
- 效果执行在 `Combat.ts`

---

## Out of Scope

- 更多合击组合（不在 MVP）

---

## Files

- `assets/scripts/config/GameConfig.ts` — `RIVER_INTERVAL` 移入配置
- `assets/scripts/game/Combat.ts` — 改读配置中的 `RIVER_INTERVAL`
- `assets/scripts/game/GameUI.ts` — 新增符咒冷却遮罩（用户追加需求）
- 已核对未改动：`assets/scripts/game/SkillSystem.ts`（合击解锁判定）
- 测试未写：`qa.level: minimal` 下豁免

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Logic
**Required evidence**: `tests/unit/fuzhen-baiyao/combos_test.ts`（`qa.level: minimal`：advisory）

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/fuzhen-baiyao/story-003-level-up-picks.md`
- Unlocks: None

## Completion Notes
**Completed**: 2026-10-23
**Criteria**: 6/6 passing（运行时：2 级不解锁、3 级同时解锁、再次 apply 不重复；截图：解锁提示、焚林红色藤蔓区、天河水龙横带）
**Deviations**: OUT OF SCOPE — 按用户要求追加符咒冷却遮罩（`GameUI.ts`），截图 01 可见；同期按用户要求调整平衡：`autoCd` 0.45→0.7、小纸人 hp 55→80、第一关 `hpMult` 0.85→1.0
**Test Evidence**: waived at qa.level minimal；截图 `production/qa/evidence/story-004-combos/`
**Reviewed by**: self, no independent review
