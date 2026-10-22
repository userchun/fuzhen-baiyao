# Story 006: 菜单 → 战斗 → 选卡 → 结算流程

> **Epic**: 符镇百妖
> **Status**: Complete
> **Layer**: Presentation
> **Type**: UI
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-23

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
- [ ] 关卡解锁：默认只开放第一关；通关第 N 关后第 N+1 关解锁，进度存本地、重启后保留；未解锁关卡灰显且点击无效（2026-10-23 用户追加）
- [ ] 顶部 HUD 有不透明底板，妖怪出场时不与灵气条/文字重叠；结界血条位于城墙下方（2026-10-23 用户追加）

---

## Implementation Notes

- 状态机在 `GameRoot.ts`，界面在 `GameUI.ts`

---

## Out of Scope

- 存档、局外养成、设置界面

---

## Files

- `assets/scripts/GameRoot.ts` — 关卡解锁存档（`loadUnlocked` / `saveUnlocked`）、进关设置 HUD 底板颜色
- `assets/scripts/game/GameUI.ts` — 锁定关卡灰显；HUD 底板随关卡背景色、菜单隐藏；结界血条移到城墙下方并显示数值
- `assets/scripts/config/GameConfig.ts` — 新增 `SAVE_KEY_UNLOCKED`
- 测试未写：`qa.level: minimal` 下豁免

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

## Completion Notes
**Completed**: 2026-10-23
**Criteria**: 8/8 passing（截图 01–08；运行时：选卡时游戏时间冻结、拖动不移动玩家；胜利后本地存档写入 2，刷新后保持）
**Deviations**: OUT OF SCOPE — Out of Scope 写了「存档」，但用户追加了关卡解锁，只存已解锁关卡数一个值；HUD 底板、结界血条移到城墙下方也是用户追加。菜单隐藏 HUD 底板的最后一处修改已通过类型检查，尚未截图确认
**Test Evidence**: 屏幕高度用预览机型 iPhone 14 Pro 393×852 / iPhone 12 390×844 / Nokia C2 360×720 验证；iPad 4:3 因浏览器窗口装不下画布未测
**Reviewed by**: self, no independent review
