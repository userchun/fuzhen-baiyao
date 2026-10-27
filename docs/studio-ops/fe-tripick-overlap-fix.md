# T-FIX | 三选一 Preview Fail 布局（TF1–TF3）

- **时间**：2026-10-26（Asia/Shanghai）
- **Owner**：@主程
- **闸**：hold push · 不改数值/文案语义 · 本轮不换图
- **验收**：`acceptance-ui-tripick-preview-fail.md`

## 改动
文件：`assets/scripts/game/GameUI.ts` → `showPick`

| 槽 | 规格（卡心原点） |
|----|------------------|
| 标题行 | y=102，h≈34，字号 22，SHRINK；剥「(新)」 |
| 「新」角标 | 右上 (78,118)，13px 浅字+深描边，不铺红晕 |
| 图标框 | 固定中心 y=28，**48×72**；符填满；被动方图 ≤48 居中同槽 |
| 描述区 | 顶锚 y=-18，框 168×118，字号 16 / LH22，SHRINK 防上涌 |

几何缝：标题底→图标顶 ≈21；图标底→描述顶 ≈10；描述底→卡底 ≈14。

## TF 自检
- **TF1**：描述包围盒顶 -18 < 图标底 -8 → 零叠
- **TF2**：标题下移避开顶孔；「新」独立小角标，不糊红
- **TF3**：三卡仍 CARD_H=300；图标槽同 48×72
- **TF4**：本轮不换图（朱砂碗 vs 纸符另议）

## Out
伤害/CD/解锁文案；自动 push；生图替图。

## Git
- tip：`dfab250` `fix(ui): T-FIX tripick card zones title→icon→desc (hold push)`
- full：`dfab2500beabc7e7336f4daad3a262c0214864bb`
- ahead：origin/main **+4**（hold push）
