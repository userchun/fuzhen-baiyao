# Story 004: 相生合击（焚林燎原、天河倒悬）

> **Epic**: 符镇百妖
> **Status**: Ready
> **Layer**: Feature
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: —

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

- `assets/scripts/game/SkillSystem.ts`
- `assets/scripts/game/Combat.ts`
- `assets/scripts/config/GameConfig.ts`
- `tests/unit/fuzhen-baiyao/combos_test.ts`

---

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
