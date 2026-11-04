# 符镇百妖 · 项目说明（给 AI 助手和协作者）

Cocos Creator 3.8.8 竖屏结界防守割草游戏。代码在 `assets/scripts/`，全部数值在 `assets/scripts/config/GameConfig.ts`。

## 文档地图：每件事只有一个文档

所有文档都放在 `docs/` 下，不要在别处（包括 `design/`、根目录、`docs/superpowers/` 等）新建设计或计划文档。要改什么，就改下表里对应的那一份；找不到合适的位置时，先往已有文档里加一节，不要另起新文件。

| 内容 | 唯一文档 | 说明 |
|---|---|---|
| 玩法：定位、局内战斗、局外养成、奖励经济、关卡推进、验收标准、开发顺序 | `docs/gameplay-design.md` | 玩法的唯一来源。第 0 节是简纲，末尾有改动记录 |
| 主设计文档（OhMyGame 画布总览，只做导航不写规则） | `canvas/documents/main-gdd.md` | 编辑器要求放在 canvas 下，是 docs/ 规则的唯一例外 |
| 美术方向和素材规格 | `docs/art/art-bible.md` | 只管视觉，玩法规则写进 gameplay-design 再在这里引用 |
| 出图提示词 | `docs/art/prompts-dark-qban.md` | |
| 风格样板图 | `docs/art/ref/style_target.png` | 2026-11-01 当前选定：⑤精致像素 |
| 界面（UI）样板图 | `docs/art/ref/ui_mainmenu_v14.png` | 主界面定稿效果图；出其他界面时和 style_target 一起作参考 |
| 素材清单（尺寸、帧数、来源、授权） | `docs/art/asset-manifest.json` | JSON，indent 2 |
| 符咒特效配方与精灵表 | `docs/evidence/pixelfx/fx/fuzhen/` + `tools/fx-bake/bake.mjs` → `art/fx/` | 配方改了要重新运行 bake；预览在素材中心「特效」（fx-all.html 总览、fx-lab.html 调参） |
| 动作精灵图暂存 | `art/asf/README.md` + `tools/asf/` | Agnes/imagegen 定稿+网格精灵表（不用视频/ASF I2V）；切帧后进 textures/anim |
| 每关素材重做进度 | `docs/art/level<N>-polish.md` | 现有 `level1-polish.md`；做新关卡时按同样格式新建 |
| 构建、运行、发布 | `docs/build-run.md` | |
| 验收截图、录屏 | `docs/evidence/` | 命名规则见目录里的 README |
| 素材授权汇总 | `LICENSES.md`（根目录） | |
| 美术出图流程 | `.claude/skills/level-art/SKILL.md` | 流程只写在 skill 里，文档里只引用 |

## 修改规则

- **数值**：以 `GameConfig.ts` 为准。改了代码里的数值，同步改 `docs/gameplay-design.md` 里对应的表格；新提的、没验证过的数值标 🧪。
- **状态标记**：gameplay-design 里每条规则都标 ✅ 已实现 / 🛠 待实现 / 🔭 后续内容。实现完一条，就把它从 🛠 改成 ✅。
- **不复制内容**：一个规则只写在一个地方，别的文档用"见 `路径` 第 X 节"引用，不要抄一遍。
- **改名或移动文档**：同时全局搜索旧路径（`git grep`），把引用一起改掉，并更新上面的文档地图。
- **提交**：提交信息用中文，结尾带 `(hold push)`，默认不 push。

## 生图

本项目后续生图必须遵守 `.claude/skills/level-art/SKILL.md` 第 2 节的用户指定工具与模型，不使用内置 imagegen 的默认路由。
