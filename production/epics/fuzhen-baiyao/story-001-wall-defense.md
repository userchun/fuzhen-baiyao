# Story 001: 守墙射击：移动、瞄准与城墙受击

> **Epic**: 符镇百妖
> **Status**: In Progress
> **Layer**: Foundation
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-22

## Context

**GDD**: `design/game-brief.md`
**Requirement**: Brief MVP feature 1

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Cocos Creator 3.8.8 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

- [ ] 在 `GAME.moveZoneY` 以下拖动，玩家水平移动，且不超出 ±(width/2 − 40)
- [ ] 在 `moveZoneY` 以上按住，镇妖符朝触点方向连发，间隔 `BASE_ATTACK.holdCd`
- [ ] 不按住时自动攻击，间隔 `BASE_ATTACK.autoCd`
- [ ] 妖怪抵达 `wallY` 时扣除其 `damage` 点城墙血量并消失；Boss 抵达后改为每秒扣 `damage`
- [ ] 城墙血量从 `GAME.wallHp`（100）开始，归零即判负
- [ ] 不同屏幕高度下 `applyScreen` 重算后城墙贴底，操作分区仍正确

---

## Implementation Notes

- 输入在 `GameRoot.ts`，攻击与城墙在 `Combat.ts`，数值全在 `GameConfig.ts`
- 代码已有实现：核对上述 AC，缺什么补什么

---

## Out of Scope

- Story 002：属性倍率
- Story 006：判负后的结算界面

---

## Files

*无代码改动：现有实现已满足全部验收标准。核对过的文件：*

- `assets/scripts/GameRoot.ts`（输入分区、移动范围、胜负判定）
- `assets/scripts/game/Combat.ts`（连发 / 自动攻击、撞墙扣血、Boss 攻城）
- `assets/scripts/config/GameConfig.ts`（数值、`applyScreen`）
- 测试文件未写：`qa.level: minimal` 下测试豁免

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Integration
**Required evidence**: `tests/integration/fuzhen-baiyao/wall-defense_test.ts` OR playtest doc（`qa.level: minimal`：advisory）

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: None
- Unlocks: `production/epics/fuzhen-baiyao/story-002-element-counter.md`, `production/epics/fuzhen-baiyao/story-005-levels-waves.md`
