# Story 006: 菜单 → 战斗 → 选卡 → 结算流程

> **Epic**: 符镇百妖
> **Status**: Ready
> **Layer**: Presentation
> **Type**: UI
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: —

## Context

**GDD**: `design/game-brief.md`
**Requirement**: Brief MVP feature 6

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Cocos Creator 3.8.8 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

- [ ] 菜单列出两关，显示关名与 `desc`，点击进入对应关卡
- [ ] 战斗 HUD 显示城墙血量、灵气进度、等级、已持有符咒
- [ ] 有 `pending` 升级时暂停战斗并弹出三选一卡片，选完继续；有多次则连续弹出
- [ ] 过关显示胜利结算，失败显示失败结算，均可返回菜单或重来
- [ ] 状态 menu / play / pick / over 切换时，非 play 状态不响应战斗输入
- [ ] 竖屏不同高度机型上 UI 不越界、不被裁切

---

## Implementation Notes

- 状态机在 `GameRoot.ts`，界面在 `GameUI.ts`

---

## Out of Scope

- 存档、局外养成、设置界面

---

## Files

- `assets/scripts/GameRoot.ts`
- `assets/scripts/game/GameUI.ts`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: UI
**Required evidence**: 菜单、战斗 HUD、选卡、胜利结算、失败结算各一张截图，留存于 `production/qa/evidence/`（`qa.level: minimal` 下仍为必需）

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/fuzhen-baiyao/story-003-level-up-picks.md`, `production/epics/fuzhen-baiyao/story-005-levels-waves.md`
- Unlocks: None
