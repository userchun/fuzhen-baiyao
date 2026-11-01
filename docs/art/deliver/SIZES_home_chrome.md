> 2026-11-01：以下为已停用控件图的历史规格。当前首页改用代码绘制像素图标和面板，唯一现行规范见 `docs/art/art-bible.md` 第 5 节。

# Home UI chrome · pixel v3 (CD Spot FAIL patch)

Canvas **1080×2340**. Anchors locked to HomeUI. No baked gameplay copy.

当前控件文件统一位于 `assets/resources/textures/`；本目录重复导出和调试图已清理。

| File | Px | Anchor (center) | Notes |
|---|---|---|---|
| `ui_home_topbar.png` | 1000×72 | ≈(540, **152**) | **两井** 铜钱+符纸 + 设置齿轮；无第三井 |
| `ui_home_side_btn.png` | **140×140** | **(930,840)/(930,1092)/(930,1344)** | 实心底；养成→符咒→记录 |
| `ui_home_pip.png` | 24×24 | 侧钮右上 | 硬边像素；仅养成/符咒买得起 |
| `ui_home_level_card.png` | **890×300** | **(539, 1755)** | **仅** Boss空圆+左右箭+外框；关名/难度/奖励全引擎，**无关名槽** |
| `ui_home_battle_btn.png` | **820×180** | **(539, 2113)** | **平涂**朱砂 `#BC2525`+金边；**无内井/半透槽**；FE 画「出战」 |

底图已有城垛，不再挂额外石墙素材。hold push。

**Engine overlay (chrome card):** name/pill/reward 右于 Boss 圆；rewardY≈**1854**（卡底≈1905，禁 1888 贴边）；切关热区对齐烤箭质心 (184/894, 1755)，不画引擎三角。
