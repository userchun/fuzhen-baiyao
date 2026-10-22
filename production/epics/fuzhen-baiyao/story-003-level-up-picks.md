# Story 003: 灵气升级三选一

> **Epic**: 符镇百妖
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: —

## Context

**GDD**: `design/game-brief.md`
**Requirement**: Brief MVP feature 3

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Cocos Creator 3.8.8 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

- [ ] 击杀获得妖怪 `xp` 点灵气；首级需 `xpBase`（5），之后每级 ×`xpGrow`（1.3）取整
- [ ] 一次溢出多级时 `pending` 累加，逐次弹出选卡
- [ ] 每次给出 3 个不重复选项（池不足时给出全部），来自：新符咒 / 符咒升级 / 心法 / 回血
- [ ] 持有符咒达 `maxTalismans`（4）后不再出现新符咒；满级（5）的符咒与心法不再出现
- [ ] 符咒伤害 = 基础 ×(1 + 0.35×(级−1)) ×(1 + 0.2×朱砂级)
- [ ] 符咒冷却 = 基础 ×0.92^(级−1) ÷(1 + 0.15×疾书级)
- [ ] 分符 +1 符咒数量（上限 2）；固元每秒回复城墙（上限 3）
- [ ] 6 种符咒各自行为生效：金光穿透、寒冰弹射冻结、烈焰爆炸、镇山击退眩晕、天雷连锁、青藤减速持续伤害

---

## Implementation Notes

- `SkillSystem.ts` 不依赖引擎，`addXp` / `damage` / `cooldown` / `rollOptions` 可直接单测
- `rollOptions` 的随机需可注入种子，保证测试确定性
- 符咒行为在 `Combat.ts`

---

## Out of Scope

- Story 004：合击
- Story 006：选卡界面

---

## Files

- `assets/scripts/game/SkillSystem.ts`
- `assets/scripts/game/Combat.ts`
- `assets/scripts/config/GameConfig.ts`
- `tests/unit/fuzhen-baiyao/level-up-picks_test.ts`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Logic
**Required evidence**: `tests/unit/fuzhen-baiyao/level-up-picks_test.ts`（`qa.level: minimal`：advisory）

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/fuzhen-baiyao/story-002-element-counter.md`
- Unlocks: `production/epics/fuzhen-baiyao/story-004-combos.md`
