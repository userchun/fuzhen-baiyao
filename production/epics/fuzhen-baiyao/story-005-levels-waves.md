# Story 005: 两关波次与 Boss / 机制怪

> **Epic**: 符镇百妖
> **Status**: Complete
> **Layer**: Feature
> **Type**: Integration
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-23

## Context

**GDD**: `design/game-brief.md`
**Requirement**: Brief MVP feature 5

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Cocos Creator 3.8.8 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

- [ ] `Spawner` 按 `WaveDef` 的 time / count / interval 准时出怪，同一时刻多波并行
- [ ] 妖怪血量乘以关卡 `hpMult`；第二关开局先给 `startPicks`（2）次选卡
- [ ] 移动方式生效：straight / hop / sine
- [ ] 灯笼鬼死亡分裂为 3 只狐火；Boss 每隔 `summonInterval` 秒召唤 `summonCount` 只小怪
- [ ] 铜甲尸每次直接命中减免 `armor`（5）点；水鬼周期潜水，潜水期间无敌
- [ ] 白骨夫人按血量阶段切换属性：金 → 水 → 火
- [ ] 击败本关 Boss 即过关；城墙血量归零即失败

---

## Implementation Notes

- `Spawner.ts` 不依赖引擎，时间推进可直接测
- 敌人行为在 `Combat.ts` / `EnemyView.ts`

---

## Out of Scope

- 第三关及以后
- Story 006：过关 / 失败界面

---

## Files

- 无代码改动：现有实现满足全部验收标准。核对过的文件：
- `assets/scripts/game/Spawner.ts`（波次定时、多波并行）
- `assets/scripts/game/Combat.ts`（移动方式、分裂、召唤、护甲、潜水、三相）
- `assets/scripts/GameRoot.ts`（胜负判定）
- 测试未写：`qa.level: minimal` 下豁免

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Integration
**Required evidence**: `tests/integration/fuzhen-baiyao/levels-waves_test.ts` OR playtest doc（`qa.level: minimal`：advisory）

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/fuzhen-baiyao/story-001-wall-defense.md`, `production/epics/fuzhen-baiyao/story-002-element-counter.md`
- Unlocks: `production/epics/fuzhen-baiyao/story-006-game-flow-ui.md`

## Completion Notes
**Completed**: 2026-10-23
**Criteria**: 7/7 passing（运行时数据见 `runtime-log.md`；截图 01–06）。「准时出怪」仅以前 70 秒各波出怪数量佐证，未逐波核对时间点
**Deviations**: ADVISORY — 行为参数写死在 `Combat.ts`：跳尸节奏（1.2s 周期 / 0.4s 跳 / ×3 速）、水鬼潜水周期（3s 中潜 1s）、狐火摆幅 80
**Test Evidence**: waived at qa.level minimal；`production/qa/evidence/story-005-levels-waves/`
**Reviewed by**: self, no independent review
