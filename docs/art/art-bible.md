# 美术规范（art bible）

> 当前方向：2026-11-01 用户经 paris / Codex 五套对照选定 **⑤ 精致像素**（复古夜色、独立游戏气质）。
> 唯一风格样板：`docs/art/ref/style_target.png`（来源 `codex-five/5-pixel.png`）。
> **③ 清爽国漫已退役**（样板与主页底备份见 `generated-images/style-exploration-2026-11-01/retired-qingshuang-anime/`，旧 bible：`art-bible-qingshuang-retired-2026-11-01.md`）。
> 当前仅主页底图与 HomeUI 控件配色跟像素风；**第一关 `bg_level1*`、角色、妖怪等局内旧素材仍为旧风格，待换**。不得把旧资源标记为新风格验收完成。

## 1. 一句话

复古夜色精致像素：深靛夜空、灯笼暖晕与石墙冷灰，金暖描边与朱砂出战点；独立游戏气质，硬边可读，忌糊成海报插画。

## 2. 色板（现行）

| 用途 | Hex | 说明 |
|---|---|---|
| 深靛夜底 | `#1A1C2C` | 主页垫底、弹窗暗面、石墙冷影 |
| 金暖 | `#F4B41B` | 描边、标题、资源强调、符光 |
| 朱砂 / 出战 | `#BC2525` | 出战钮、红点、困难强调 |
| 石墙冷蓝灰 | `#5C6B7A` / `#8A90A0` | 次级文字、锁定态、面板描边 |
| 暖纸字 | `#E8E4D9` | 关卡名、正文浅字 |

## 3. 角色与妖怪

- 符师按样板像素剪影：夜色下短发道士、灯笼/符纸暖点；轮廓硬边、少灰阶糊边。
- 妖怪保持民俗辨识，改为像素可读剪影；**不沿用清爽国漫立绘直接缩小当新战斗素材**。
- 局内现有 `player_taoist` / `enemy_*` / 动作图集：**待换**，仍属旧风格。
- 妖怪五行靠外形和配色一眼可读，不只靠字印：金 暗金/白、木 青绿、水 靛蓝/黑、火 朱红、土 黄褐。第一关五种小怪轮廓各不相同（2026-11-01，名单与数值见 `docs/gameplay-design.md` 第 2.4 节）：槐树精 高瘦树干顶着向上张开的枝杈（Y 字形树冠，墨绿叶）、泥尸 矮胖方块、火狐 扁长低矮、井鬼 半身加涟漪、铜钱精 圆形；灯笼鬼最大，荒坟老妖为岩石巨妖带暗红裂纹。
- 妖怪尺寸与像素颗粒（2026-11-01 用户定）：普通小怪可见高度约为符师的 0.6（符师约 141，小怪约 85）；像素颗粒与背景、结界一致，每格 3 个设计单位，出图后先缩到整数格再整数倍放大，不直接缩小高清图。精英、Boss 的倍数另定。

## 4. 场景、色彩与特效

- 主页：复古夜城垛 / 灯笼 bloom、抖动夜空（dithered sky）；UI 铬与插画分层，不把按钮烘焙进底图。
- 战斗：近俯视地面；结界仍由代码绘制。`bg_level1_village.png` 等 **仍为旧风格，待换**。
- 特效短促局部；像素风可用有限调色板闪白/金点，忌大面积高斯光斑。

## 5. 主页与界面

- 当前主页背景：`assets/resources/textures/ui_home_bg.png`（1080×2340，像素夜色 v1）。
- HomeUI：Graphics 绘制；配色跟金暖 + 石墙冷 + 出战朱红；布局仍为顶栏资源 / 右侧养成·符咒·记录 / 底栏关卡牌→出战。
- 玩法与交互唯一来源：`docs/gameplay-design.md` 第 4.4 节。

## 6. 出图提示词

使用内置 GPT Image / 像素管线时，只附当前样板。

### 通用风格锁

> exquisite detailed pixel art, retro night indie game, deep indigo sky `#1A1C2C`, warm lantern bloom, gold accent `#F4B41B`, cinnabar red `#BC2525`, stone-wall cool blue-gray, dithered sky, hard readable silhouette, no photoreal, no glossy anime cel, no paper-cut collage.

### 当前主页构图

> 9:16 pixel home illustration, no baked UI/text/watermark; night battlement / town silhouette, small weak-contrast hero optional in upper third; reserve space for level card and fight CTA; match `docs/art/ref/style_target.png`.

### 战斗素材约束

> top-down orthographic pixel ground; no baked wall/UI; characters separate transparent pixel sprites; old guoman atlases are not new-style assets.

## 7. 历史记录

- 2026-10-31 的 3D 暗黑国风：已撤销；旧图备份在 `generated-images/style-exploration-2026-11-01/style-target-previous.png`。
- 2026-11-01「朱砂镇邪」：探索候选，未采用。
- 2026-11-01「青绿鎏金 · 东方奇幻绘卷」：曾采用后撤销；备份 `retired-jade-gold/`。
- 2026-11-01「③ 清爽国漫」：曾采用；**2026-11-01 退役**，改选 **⑤ 精致像素**；备份 `retired-qingshuang-anime/` + `art-bible-qingshuang-retired-2026-11-01.md`。
- 2026-11-01 Codex 五套对照：用户选定⑤精致像素；其余未采用。

## 8. 素材清单与验收

| 素材 | 路径 | 规格 | 状态 |
|---|---|---|---|
| 风格样板 | `docs/art/ref/style_target.png` | 1374×1145 | **⑤ 精致像素（现行）** |
| 主页静态插画 | `assets/resources/textures/ui_home_bg.png` | 1080×2340 RGBA | 已换像素 v1；需负责人 Cocos Preview |
| 荒村战斗背景 | `assets/resources/textures/bg_level1_village.png` | 1080×2340 RGB | 2026-11-01 像素夜村已接入（路面约 ±280，`roadHalfW` 260） |
| 妖怪 | `assets/resources/textures/enemy_*` | 槐树精 `enemy_paperman.png` + `anim/enemy_paperman/move_00..11`，均为 33×33 格放大的 495 方图（脚底 0.94） | 槐树精 2026-11-01 定稿与 12 帧走路已接入（定稿图拆部件合成，10 帧/秒），待试玩看手感；其余**旧风格，待换** |
| 符师 / 动作图集 | `assets/resources/textures/player_*` | — | **旧风格，待换** |
| 旧 UI 图集 | `ui_home_kit.png` 等 | — | 停用 / 历史 |

验收：主页需在 Cocos Creator 3.8.8 Preview 人工确认；本轮工程侧不声称局内素材已像素化。

### 像素画布结界 · 金系（2026-11-01）

用户认为 PixelFX 样板太弱（两条细线、中间空、两端太小），按“全代码、与画风同一像素密度”重做。`assets/scripts/game/BarrierPixels.ts` 在 240×62 低分辨率 RGBA 画布上逐帧绘制，`BarrierView.ts` 上传为贴图、每格放大 3 倍最近邻显示，每秒最多重绘 20 次；不依赖 PixelFX 和图片。

- 薄膜：4 级元素色阶 + Bayer 抖动，下实上虚；接地亮线、顶边亮线和符阵菱形节点；斜纹流光、横扫光、部分列上升的灵气光段；中段一排 5×7 篆意符文缓慢滚动、依次点亮。
- 两端镇妖旗杆：石座、木杆、小檐宝顶、横担挂 9 格宽朱砂符旗（随风摆、旗尾飘）、外侧灯笼带抖动光晕，颜色取自本文第 2 节色板。
- 受击：撞击点菱形波纹外扩 + 核心闪白，上下边线亮光沿边跑开，碎光迸出。结界值 <60% 依次出现亮色裂缝，<30% 薄膜闪烁、像素剥落，归零时碎裂成像素碎片下落。
- 其他四系暂按元素色阶自动换色，纹样未单独设计。

动图 `docs/evidence/2026-11-01-barrier-pixel-gold.gif`（正常 → 受击 → 变弱出裂纹 → 碎裂），静帧 `docs/evidence/2026-11-01-barrier-pixel-gold.png`。`test-player-animation.mjs` 通过。用户确认方向后已在 Cocos 7456 预览第一关实机查看：方向、旗杆、受击波纹、25% 结界值的变暗与剥落均正常，控制台无报错。实机发现暗色裂纹在暗底上看不清，已改为高光芯线 + 主色描边的亮色裂缝（浏览器预览已确认，Cocos 内待编辑器刷新后复看）。
