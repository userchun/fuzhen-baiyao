# Story 007: 用 Batch 1 美术素材替换代码色块

> **Epic**: 符镇百妖
> **Status**: In Progress
> **Layer**: Presentation
> **Type**: Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-23

## Context

**GDD**: `design/game-brief.md`
**Requirement**: 美术方向 `design/art/art-bible.md` §1–4；素材 `design/assets/specs/batch-1-assets.md`（ASSET-001–026）

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Cocos Creator 3.8.8 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: 运行时用 `resources` 动态加载 SpriteFrame，素材需放在 `assets/resources/` 下

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

- [ ] 8 种妖怪显示为对应 Q 版图片，腹部字印上叠加原汉字，五行小字角标保留
- [ ] 白骨夫人换相时同步换成对应颜色的图片
- [ ] 玩家显示为小道士，城墙显示为垛口砖墙，两关背景分别为荒村 / 古寺夜景
- [ ] 左侧技能栏符咒显示为符牌图标、心法显示为玉印图标，冷却遮罩、等级角标仍可见
- [ ] 素材缺失或加载失败时退回原色块绘制，游戏不崩
- [ ] 碰撞半径、移动、伤害等玩法数值不变

---

## Implementation Notes

- 新增 `core/Art.ts`：启动时加载 `resources/textures` 下全部 SpriteFrame，提供按名取图
- 妖怪图片的字印位置（距顶部比例）按素材定义，放在 `Art.ts` 的表里
- 用户 2026-10-23 要求：直接替换，矢量 v1 素材由 `tools/asset-pipeline/gen_batch1_svg.py` 生成

---

## Out of Scope

- 弹道、特效、UI 卡片 / 按钮 / 印章（Batch 2）
- 铜甲尸破甲态（当前玩法里护甲不会破）
- 灯笼鬼分裂子体图（当前分裂产出的是狐火）

---

## Files

- `assets/scripts/core/Art.ts`
- `assets/scripts/game/Combat.ts`
- `assets/scripts/game/EnemyView.ts`
- `assets/scripts/game/GameUI.ts`
- `assets/scripts/GameRoot.ts`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Visual/Feel
**Required evidence**: 截图 `production/qa/evidence/story-007-art-swap/` + sign-off `production/qa/evidence/story-007-art-swap-evidence.md`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/fuzhen-baiyao/story-006-game-flow-ui.md`
- Unlocks: None
