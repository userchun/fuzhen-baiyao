# 素材来源与授权

本文件按来源汇总素材授权。2026-10-31 删除旧图片与音频；2026-11-01 新增主页插画与荒村战斗背景，当前素材清单见 `docs/art/art-bible.md` 第 8 节。

> ⚠️ 上架或收费发布前，必须先把下面「待核实」的条目全部确认。

| 来源 | 范围 | 数量 | 授权 / 商用 | 状态 |
|---|---|---|---|---|
| GPT Image / 当前图片素材 | 当前运行图片见 `docs/art/art-bible.md` 第 8 节；首页背景与独立符师，以及待替换的荒村背景、像素符师动作图集、纸人。首页图标与按钮为项目代码绘制，旧五张控件图已停用清理 | 5 张运行图片 | 生成服务的适用条款待发布前核实；不标记为 CC0 | 当前方向⑤精致像素；局内旧风格待替换 |
| 来源不明的音频 | 暂无（2026-10-31 已删除） | 0 | — | — |
| 第三方 CC0（Kenney 等） | 暂无 | 0 | CC0，无需署名 | — |
| [PixelFX](https://github.com/patch-gg/pixelfx) | 金系结界预览使用 core 与改写的 Divine Shield 配方 | 已引入预览代码 | [MIT](https://github.com/patch-gg/pixelfx/blob/main/LICENSE)，可免费使用、修改与商用；分发副本或实质性部分须保留版权及许可声明。适用第三方声明见 [NOTICE.md](https://github.com/patch-gg/pixelfx/blob/main/NOTICE.md)；`gallery/fonts` 中的 Patch Pixel 字体不在仓库 MIT 授权范围内，不随特效一并采用 | 2026-11-01 已引入预览；许可和 NOTICE 随代码保留 |

## 规则

- 2026-11-01：首页独立背景新稿 `docs/art/deliver/ui_home_bg_pixel.png` 由内置 GPT Image 参考本项目像素样板和首页符师生成，1 张，已接入运行背景；授权状态同上 GPT Image 条目。

- 2026-11-01：首页符师候选 `docs/art/deliver/ui_home_hero_pixel.png` 由内置 GPT Image 参考本项目像素样板生成，1 张，已接入运行资源 `assets/resources/textures/ui_home_hero.png`；授权状态同上 GPT Image 条目。
- 新素材入库时，同步在 `docs/art/art-bible.md` 素材清单填写来源，并在本文登记授权。
- CC-BY 素材要在游戏内署名；CC-BY-SA、GPL 素材不要用。
- 不用他人立绘或 IP 角色作参考图生成可售卖素材。

- 2026-11-01：战斗符师动作图集 `assets/resources/textures/player_actions.png` 由内置 GPT Image 参考本项目首页符师生成，替换旧图集；旧战斗静态图已停用并移入废纸篓。授权状态同上 GPT Image 条目。

- 2026-11-01：五行结界候选 `docs/art/deliver/barriers/barrier_{metal,wood,water,fire,earth}.png`，共 5 张，由 Magpie Image 使用 `agnes/agnes-image-2.5-flash` 纯文生图生成，黑底特效图集，尚未入运行资源。Agnes 适用条款及商用授权待发布前核实，不标为 CC0；不计入 GPT Image 素材数量。

- 2026-11-01：金系重做单张造型候选 `docs/art/deliver/barriers/metal-ward-concept-v2.png` 由 Agnes 2.5 Flash 纯文生图生成，尚未接入，授权状态同上述 Agnes 候选。`BarrierArt.ts` / `BarrierView.ts` 为本项目原创绘制代码，未引入 PixelFX 代码或运行依赖。

- 2026-11-01：金系横向平直造型候选 `docs/art/deliver/barriers/metal-ward-straight-v3.png`，Agnes 2.5 Flash 纯文生图，1 张。未接入；授权状态同此前 Agnes 候选。

- 2026-11-01：`docs/evidence/pixelfx/` 包含 PixelFX core 及项目金系改写效果 `fx/holy/gold-ward.js`。来源 commit `a84159688af3ca37a4be05a0d422b94451b2e24e`，保留该目录 `LICENSE`、`NOTICE.md` 及源码声明；未引入 gallery 字体。Cocos 原有 `BarrierArt.ts` / `BarrierView.ts` 尚未换成这套实现。
