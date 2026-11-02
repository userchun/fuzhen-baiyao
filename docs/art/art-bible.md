# 美术规范（art bible）

### 2026-11-02 原图拆分首页预览

用户要求直接拆用所提供首页图。当前预览使用 `ui_ref_background` 保留原图标题、人物、灯笼精、纸人及构图；只在原 UI 遮挡区域拼入 Agnes Image 2.5 Flash 的补全结果。入口牌、资源框、关卡框、箭头和出战按钮从原图按轮廓生成透明 PNG，清除入口乱码与固定数字，真实文字和数值由 HomeUI 绘制。人物本次仍在背景内，未独立抠图或播放待机动画。屏幕较长时等比居中留深靛边，避免拉伸。此为用户查看用的接入预览，背景补全接缝、文字与透明边缘仍待视觉确认。素材明细见 `docs/art/asset-manifest.json`，提取脚本 `tools/asset-pipeline/extract_home_ui.py`。类型检查通过，浏览器点击出战可进入选卡。

### 2026-11-02 首页控件细化

用户确认优先优化右侧入口、出战按钮与选关面板。`HomeUI.ts` 将右侧入口改为多色像素符笔、朱砂符纸与卷册；出战按钮增加暖金边线、暗红层次、像素装饰和按压位移反馈；选关面板突出关名，普通首通奖励以铜钱、符纸、宝箱图标配数值显示。沿用当前背景和符师资源。浏览器已查看竖屏布局并点击出战进入选卡；截图见 `docs/evidence/2026-11-02-home-ui-polish.png`。按压视觉已检查，尚未真机验证；本轮不作为整体美术定稿。




> 当前方向：2026-11-01 用户经 paris / Codex 五套对照选定 **⑤ 精致像素**（复古夜色、独立游戏气质）。
> 唯一风格样板：`docs/art/ref/style_target.png`（来源 `codex-five/5-pixel.png`）。
> **③ 清爽国漫已退役**（旧候选图片已按用户要求清理）。
> 当前主页背景、独立符师及 HomeUI 像素图标 / 控件已接入像素风；**第一关符师已换像素动作，`bg_level1*` 背景与妖怪仍为旧风格，待换**。不得把旧资源标记为新风格验收完成。

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
- 战斗符师已换像素动作图集 `player_actions.png`，严格背面朝上；首页正面立绘不作战斗朝向。第一关战斗背景已换像素夜村（`bg_level1_village`），`enemy_*` 仍待更换。
- 妖怪五行靠外形和配色一眼可读，不只靠字印：金 暗金/白、木 青绿、水 靛蓝/黑、火 朱红、土 黄褐。第一关五种小怪轮廓各不相同（2026-11-01，名单与数值见 `docs/gameplay-design.md` 第 2.4 节）：槐树精 高瘦树干顶着向上张开的枝杈（Y 字形树冠，墨绿叶）、泥尸 矮胖方块、火狐 扁长低矮、井鬼 半身加涟漪、铜钱精 圆形；灯笼鬼最大，荒坟老妖为岩石巨妖带暗红裂纹。
- 妖怪尺寸与像素颗粒（2026-11-01 用户定）：普通小怪可见高度约为符师的 0.6（符师约 141，小怪约 85）；像素颗粒与背景、结界一致，每格 3 个设计单位，出图后先缩到整数格再整数倍放大，不直接缩小高清图。精英、Boss 的倍数另定。

## 4. 场景、色彩与特效

- 主页：复古夜城垛 / 灯笼 bloom、抖动夜空（dithered sky）；UI 铬与插画分层，不把按钮烘焙进底图。
- 战斗：近俯视地面；结界仍由代码绘制。`bg_level1_village.png` 等 **仍为旧风格，待换**。
- 特效短促局部；像素风可用有限调色板闪白/金点，忌大面积高斯光斑。
- 五行结界首批图片候选已停用。当前代码版已接入，但用户两次反馈视觉不合格，**不作为美术验收通过**；正在单独探索金系“两侧悬浮符箓 + 弧形通透护罩”的图像与代码混合方案，确认造型后再扩展其他元素。首批候选方向为：金为金白阵片 / 剑纹与碎光，木为青绿藤纹 / 叶形符印，水为蓝白流幕 / 方阶水波，火为朱红流焰 / 火星，土为赭金山纹 / 岩片。每种同时改变轮廓、纹样和受击反馈，不能只全屏换色；低矮半透明、人物始终在其后。同属性皮肤属于视觉变体。玩法和数值唯一来源见 `docs/gameplay-design.md` 第 2.3.1 节，当前尚未实现。

## 5. 主页与界面

- 当前主页背景：`assets/resources/textures/ui_home_bg.png`（852×1846 RGB），独立符师：`assets/resources/textures/ui_home_hero.png`（1024×1536 RGBA）；按原比例显示，纹理使用 nearest 过滤。背景与人物不烘焙 UI。
- HomeUI：Graphics 绘制统一硬边面板和方格图标；铜钱 / 符纸 / 设置、锤形养成图标 / 符纸 / 卷册、左右箭头 / 锁均为独立功能图形，不用单字占位。资源、标题、进度在顶部，养成 / 符咒 / 记录在右侧，底部为关卡牌与朱砂出战按钮；关卡牌不常驻无素材的 Boss 头像。
- 人物舞台按实际可用高度收缩；底部面板正负高度差都贴底，短屏不裁切出战按钮或覆盖右侧文字。文字、难度、奖励、锁定、红点由引擎动态绘制。
- 玩法与交互唯一来源：`docs/gameplay-design.md` 第 4.4 节。

## 6. 出图提示词

当前出图使用用户指定的 Magpie Image；具体模型、调用及保存规则唯一来源见 `.claude/skills/level-art/SKILL.md` 第 2 节。只附当前样板或已确认的本项目素材，保持⑤精致像素方向。

### 通用风格锁

> exquisite detailed pixel art, retro night indie game, deep indigo sky `#1A1C2C`, warm lantern bloom, gold accent `#F4B41B`, cinnabar red `#BC2525`, stone-wall cool blue-gray, dithered sky, hard readable silhouette, no photoreal, no glossy anime cel, no paper-cut collage.

### 当前主页构图

> 9:16 pixel home illustration, no baked UI/text/watermark; night battlement / town silhouette, small weak-contrast hero optional in upper third; reserve space for level card and fight CTA; match `docs/art/ref/style_target.png`.

### 战斗素材约束

> top-down orthographic pixel ground; no baked wall/UI; characters separate transparent pixel sprites; old guoman atlases are not new-style assets.

## 7. 历史记录

### 第一关像素符师动作（2026-11-01）

内置 GPT Image 使用首页符师作为造型参考生成一张 4×3 动作图集，原图保存在 `assets/resources/textures/player_actions.png`，1448×1086 RGBA。三行分别为待机、施法、受击，每行 4 帧；均为俯视背面朝屏幕上方。`Art.ts` 按每格双脚中心 / 脚底调整采样窗口，原图不做脚本裁改；第一帧同时注册为静态回退 `player_taoist`，停用旧静态图，避免异步加载覆盖像素造型。待机 4 fps，施法 / 受击 12 fps；攻击频率与伤害未改。现有动作回归通过；受击触发仍需自然掉血场景验收。

实际生成提示词：

> Create ONE production pixel-art animation SPRITE SHEET for the playable talisman exorcist in a top-down vertical defense game. Reference is CHARACTER AND PALETTE ONLY. Critical change: show the character STRICTLY FROM BEHIND, FACING NORTH / UPWARD in EVERY frame, viewed from an elevated camera about 30 degrees downward. Back of dark hair and back of navy robe visible, NO visible face, NO front chest, NO facing viewer, NO side-facing attacks. Same young black-haired Chinese Taoist, short red head tie, navy-indigo robe, modest ivory cuff/side trim, short cinnabar red scarf behind shoulders, small waist gourd. Simplify to readable 4-head-tall battle sprite with bold pixel clusters and 2-3 shade steps; avoid tiny jewelry, ornate embroidery, glossy anime or realistic painting. EXACTLY 12 equal square cells arranged in a REGULAR 4 COLUMN x 3 ROW GRID on a landscape 4:3 canvas, ideally 1536x1152 with each cell384x384. No gutters, no separators, no drawn cell borders or labels; each cell has generous transparent padding. Same character scale, fixed centerline, both feet on the SAME local baseline at 86% cell height in all frames. Entire character and arm motions stay within middle 70% of each cell. All frames face UP and keep boots at same coordinates. ROW 1 (idle loop 4 frames left to right): relaxed ready pose; shoulders breathe up 1-2 pixels; scarf end sways left; returns naturally toward first pose. ROW 2 (casting 4 frames left to right): clear anticipation right elbow draws back with a small gold paper talisman; right hand raises and reaches FORWARD TOWARD THE TOP OF THE CELL; decisive release with extended arm toward enemy above, ONE tiny angular gold spark above hand; arm recovers to ready. The arm must visibly bend, extend and retract, not identical redraws or whole-body rotations. ROW 3 (hit reaction 4 frames left to right): short recoil shoulders back toward bottom while feet planted; brief compressed torso and tucked arms; straightens; recovers ready pose. Preserve exact outfit, proportions, no costume changes, no extra arms. Sparse stepped pixel light only on talisman; NO large glows or particles crossing cell boundaries, NO circular magic floor, NO backdrop, NO scene, NO ground, NO platform, NO cast shadow, NO text, NO watermark. True transparent RGBA canvas with clean alpha, not black or checkerboard background. This single image must be directly usable as a 4x3 equal-grid atlas in a game engine.

### 首页独立背景新稿（2026-11-01）

用户确认继续后，内置 GPT Image 以唯一像素样板和首页符师为参考生成独立夜城背景，保存 `docs/art/deliver/ui_home_bg_pixel.png`。画面无人物和 UI，保留月夜古镇、两侧灯火和前景石台，供后续与符师及控件分层组合；已替换运行背景，组合与手机布局验收见本节末尾。生成原图保留实际尺寸，不拉伸冒充目标规格。

实际生成提示词：

> Generate ONE finished standalone BACKGROUND asset for a vertical mobile Chinese folklore exorcist game homepage. Portrait aspect ratio approximately 9:19.5, full bleed opaque background. Reference image 1 is the authoritative pixel-art style board: follow ONLY its LEFT homepage nighttime village mood. Reference image 2 is the separate hero cutout that will be composited later: use it only for palette and pixel rendering compatibility, DO NOT paint this hero or any other people into this background. Scene: moonlit ancient Chinese mountain town, layers of navy tiled roofs, slender pagoda silhouettes, mountains fading into deep blue night haze, a pale warm full moon in the upper-right quadrant, sparse stars and carefully stepped pixel cloud clusters; restrained amber lantern windows across the town, one lantern framing each lower outer edge. Foreground is an open cool slate-blue stone terrace viewed slightly from above, with a LOW edge parapet only at far sides, no tall wall blocking the composition. A hero will stand separately at x42% of canvas and feet around y72%; keep x15-70%, y33-73% low contrast with uncluttered medium-cool values to make the navy-clad hero visible, NOT a blank rectangular placeholder. Top 0-23% calm dark-blue sky for a title and resource UI added later. Rightmost 20%, y30-67% visually quiet for a vertical menu added later. Bottom 25% a quiet darker stone terrace with broad simple stones for overlaid level selector and start button; no central props or bright lanterns there. Strong handmade pixel clusters, crisp stair-step edges, coherent pixel density compatible with the reference hero, limited indigo / blue-gray / warm ivory / muted amber palette, selective dithering, beautiful atmospheric depth made with color steps, NOT smooth airbrush gradients, no photorealism, no 3D, no smooth cel anime, no HD illustration pixel filter. Mood adventurous and quietly supernatural, readable mobile indie game. No characters, no monsters, no pets, no silhouettes of people, no talisman hero, no foreground shrine or gate, no UI panels, no empty UI frames, no buttons, no icons, no HUD, no typography, no Chinese writing or signage glyphs, no title, no watermark. This is a compositable game environment layer, not a screenshot or mockup.

- 2026-10-31 的 3D 暗黑国风：已撤销；旧候选图片已清理。
- 2026-11-01「朱砂镇邪」：探索候选，未采用。
- 2026-11-01「青绿鎏金 · 东方奇幻绘卷」：曾采用后撤销；旧候选图片已清理。
- 2026-11-01「③ 清爽国漫」：曾采用；**2026-11-01 退役**，改选 **⑤ 精致像素**；旧候选图片已清理。
- 2026-11-01 Codex 五套对照：用户选定⑤精致像素；其余未采用。

## 8. 素材清单与验收

| 素材 | 路径 | 规格 | 状态 |
|---|---|---|---|
| 风格样板 | `docs/art/ref/style_target.png` | 1374×1145 | **⑤ 精致像素（现行）** |
| 主页背景 | `assets/resources/textures/ui_home_bg.png` | 852×1846 RGB | 已接入并验证长短屏 |
| 首页符师 | `assets/resources/textures/ui_home_hero.png` | 1024×1536 RGBA | 已独立分层接入 |
| 荒村战斗背景 | `assets/resources/textures/bg_level1_village.png` | 1080×2340 RGB | 2026-11-01 像素夜村已接入（路面约 ±280，`roadHalfW` 260） |
| 符师动作图集 | `assets/resources/textures/player_actions.png` | 1448×1086 RGBA，4×3，每格 362 | 已换像素背面，待机 / 施法 / 受击各 4 帧 |
| 妖怪 | `assets/resources/textures/enemy_*` | 槐树精 `enemy_paperman.png` + `anim/enemy_paperman/move_00..11`，均为 33×33 格放大的 495 方图（脚底 0.94） | 槐树精 2026-11-01 定稿与 12 帧走路已接入（定稿图拆部件合成，10 帧/秒）；泥尸 `enemy_jiangshi.png` + `anim/enemy_jiangshi/move_00..11` 2026-11-01 定稿（袍子由靛蓝调成黄褐）与 12 帧并脚跳已接入（部件合成，12 帧/秒，字印逐帧跟随）；火狐 `enemy_foxfire.png` + `anim/enemy_foxfire/move_00..11` 2026-11-01 定稿（正面奔跑、火焰尾巴）与 12 帧奔跑已接入（部件合成，14 帧/秒）；井鬼 `enemy_shuigui.png` + `anim/enemy_shuigui/move_00..11` 2026-11-01 定稿（湿发女鬼飘在水洼上）与 12 帧漂浮已接入（部件合成，8 帧/秒，潜水由代码半透明表现）；铜钱精 `enemy_tongqian.png` + `anim/enemy_tongqian/move_00..11` 2026-11-01 定稿（铜钱串成的圆身，铜锈程序调成暗金、缩到 0.85）与 12 帧摇摆走路已接入（部件合成，10 帧/秒）；均待试玩看手感；其余**旧风格，待换** |
| 主页图标与按钮 | `assets/scripts/game/HomeUI.ts` | Graphics 方格图标与面板，动态文字 | 已接入，旧五张控件图及 meta 已移入废纸篓 |

验收：主页在 Cocos Creator 3.8.8 Preview 检查 393×852、360×720；局内素材未像素化。

### 首页符师独立立绘（2026-11-01）

内置 GPT Image 参考唯一像素样板生成一张：首页符师、独立透明背景，深靛道袍 / 朱红飘带 / 暖金符光。交付 `docs/art/deliver/ui_home_hero_pixel.png`，1024×1536 RGBA；已核验存在透明像素。仅为首页静态候选，用户“继续”后已接入 HomeUI，不作战斗图或动作图集使用。

实际生成提示词：

> Create ONE production game asset: a standalone full-body homepage hero for the Chinese folklore exorcist game 符镇百妖. The provided image is a STYLE AND CHARACTER reference only; use ONLY the main young male exorcist in the LEFT homepage panel as the character basis. Do not reproduce the screenshot, scenery, UI, companions or enemies. Exquisite handcrafted retro pixel art, crisp square pixel clusters, deliberately limited palette, sharp pixel stepped contour, sparse dithering, 2-3 shade ramps per material; NOT a smooth anime illustration with a pixel filter. Young confident Chinese talisman master, tousled short black hair and red hair tie, indigo navy robe, warm ivory inner lapels and cloth panels, cinnabar red scarf trailing to his LEFT, dark trousers and boots, simple waist gourd and one gold charm, clear readable silhouette with few hanging accessories. About five-head-tall proportions, three-quarter front view facing slightly RIGHT. Natural wide stable stance, both boots fully visible, one relaxed hand down, other hand raised holding ONE small golden paper talisman with decorative red abstract strokes and restrained pixel amber sparks. Warm gold light on face and hand against cool indigo clothing. Match reference's night-time indie pixel aesthetic, not the previously retired bright blue-white anime style. Center one character with all scarf ends, hair, hands and boots inside generous transparent margins, vertical portrait canvas, character occupies roughly 85% height. True transparent RGBA background, no checkerboard baked in, no backdrop, no platform, no scenery, no cast-shadow plane, no text labels, no title, no border, no watermark, no duplicate poses, no sprite sheet. Output is a separable static homepage illustration, not battle animation.

### 2026-11-01 定稿后清理

用户确认以⑤精致像素为唯一风格。清理其他风格候选、过期背景、调试截图与重复导出，移除停用的 `env_wall.png`、`ui_home_kit.png` 及配套 meta；仅保留运行资源、唯一风格样板和最新像素主页预览。`docs/evidence/` 为历史功能验收记录，保留作验证依据，不作为当前风格参考。第一关仍在引用的旧风格背景、符师、纸人及动作图集暂留，像素替换完成后再清理。移除图片可从本机废纸篓本次清理目录恢复。

### 首页完整接入验收（2026-11-01）

已接入新背景 / 独立符师、完成首页布局与真实功能图标及按钮。浏览器实际点击验证设置音乐开关（验证后恢复原状态）、养成 / 符咒 / 记录进入和返回、切到第二关锁定态、锁定出战与困难难度提示、第一关出战进入选卡。360×720 检查人物、侧栏文字、关卡和出战不重叠，并验证点击记录文字可进入；393×852 检查完整布局。未购买升级、未清除存档，未验收已通关账户的困难解锁 / 购买红点和全部结算状态。LSP 工具不可用，项目类型检查通过。截图：`docs/evidence/2026-11-01-home-pixel-final-393x852.jpg`、`docs/evidence/2026-11-01-home-pixel-final-360x720.jpg`。

### 首页符师待机动效（2026-11-01）

`HomeUI.ts` 使用现有独立立绘实现轻待机：以图内脚底为支点，3.6 秒一轮呼吸（纵向最大 +0.8%、横向最大 -0.2%），2.4 秒符纸亮度循环，五粒像素符屑按 2.8 秒错相上浮。没有新增图片或序列帧，未实现手臂 / 飘带独立动作。切关只重建控件，不重启动画；离开首页销毁动效引用，重新进入从初始相位开始。LSP 不可用，项目类型检查通过。

待机验证：393×852 预览采样 90 帧约 6.8 秒，存在持续画面变化，浏览器无错误日志；录屏 `docs/evidence/2026-11-01-home-hero-idle.mp4`，静帧 `docs/evidence/2026-11-01-home-hero-idle.jpg`。

像素符师验证：393×852 第一关预览确认背面朝上、站在防线后方，待机和抬手施法真实切帧，血条无遮挡；录屏 `docs/evidence/2026-11-01-level1-pixel-player.mp4`，截图同名 `.jpg`。浏览器无错误日志。受击动作已注册并通过逻辑回归，本次未自然触发结界受损，受击实战观感待验收。背景与妖怪仍为旧素材。

### 五行结界动画首版候选（2026-11-01）

使用 Magpie Image，显式模型 `agnes/agnes-image-2.5-flash`。本轮带参考图调用仍返回 503；成功素材均为同一模型的纯文生图，通过详细像素风格提示词约束。未使用其他模型，未将文生图声称为图生图。统一原图尺寸 1312×736 RGBA，但背景为不透明纯黑，不能当作原生透明素材；预览采用 screen 滤色叠加，后续游戏需匹配的黑底特效材质。没有脚本抠图或改写生成原图。

| 元素 | 原图路径 | 实际排布 / 帧数 | 视觉 |
|---|---|---|---|
| 金 | `docs/art/deliver/barriers/barrier_metal.png` | 2 列 4 行 / 8 帧 | 金白阵片、剑纹、碎光 |
| 木 | `docs/art/deliver/barriers/barrier_wood.png` | 4 列 4 行 / 16 帧 | 青绿藤叶符网 |
| 水 | `docs/art/deliver/barriers/barrier_water.png` | 4 列 2 行 / 8 帧 | 蓝白水幕与波纹 |
| 火 | `docs/art/deliver/barriers/barrier_fire.png` | 4 列 4 行 / 16 帧 | 朱红流焰、符印、火星 |
| 土 | `docs/art/deliver/barriers/barrier_earth.png` | 2 列 4 行 / 8 帧 | 赭金山纹与砂光 |

模型未严格遵守统一八帧网格。逐帧预览按实际排布和非等距行区间取样、按每帧亮像素底沿校准；原图未裁改。预览源内保留全部帧取样坐标，见 `docs/evidence/2026-11-01-barrier-animation-preview.html`。预览支持播放 / 暂停、6 / 8 / 12 fps、地面 / 黑底切换。

浏览器检查五套可绘制且帧号持续变化，无错误日志。录屏 `docs/evidence/2026-11-01-five-barriers-preview.mp4`，截图同名 `.jpg`。当前为首版视觉候选：火系轮廓更拱，仍有帧间形变和循环衔接待验收，不能标为最终统一规格。尚未替换 Combat 结界、未实现五行选择 / 克制 / 相生数值；玩法见 gameplay-design 第 2.3.1 节。

<details>
<summary>五行结界实际生成提示词（Magpie Image，2.5 Flash，1312x736，未附参考图）</summary>

**金**

> Create a production pixel-art GOLD elemental magical barrier animation atlas for a Chinese folklore exorcist game. Style: exquisite handcrafted retro pixel art for a moonlit Chinese exorcist game, crisp square pixel clusters, deep-indigo surroundings with warm gold light, limited 2-3 shade palette, no anime smooth rendering. NO people, enemies, UI or scenery. Exactly 8 frames in a regular 2-column by 4-row grid. Landscape overall aspect16:9. Each frame is a wide low horizontal translucent golden energy screen spanning 90% of the cell width, with a gently arched top and fixed ground contact baseline at 80% of each cell height. It has visible area and thickness, NOT a single line. Linked thin golden geometric armor-like panels, simple sword motifs, warm ivory highlights; sparse silver-white pixel shards flow from left to right. All frames keep the same silhouette, size, center and endpoints. Across eight frames only local energy patterns and small glints advance, looping smoothly from last back to first without flashing or scaling. All motion stays inside each cell with transparent margins. OUTPUT FOR ADDITIVE BLENDING: background must be perfectly uniform pure BLACK (#000000). All empty space and cell margins must be pure black. Draw only luminous gold-white energy particles, filigree and outlined magical plates, with sparse low-intensity gold pixels suggesting the thin screen interior. Do not paint opaque stone or solid metal plates. Black will be removed by the game's additive compositing, so no gray gradient, navy background, ground shadows, checkerboard, text or grid lines. No masonry, walls, pillars, gates, platforms or circular bubble shield. Hard square pixel clusters and limited palette, not smooth airbrush or glossy 3D.

**木**

> Generate ONE production animated magical barrier sprite atlas for a Chinese folklore exorcist pixel-art game. Exactly EIGHT sequential frames in an even TWO COLUMN by FOUR ROW grid, overall image1312x736 pixels, each cell656x184. No borders, labels or grid lines. Same wide low arched energy screen in every cell, 90% cell width, top around30% cell height, FIXED baseline at80% cell height, generous empty margins. No changes to overall scale, center, endpoints or camera. The shape has area and thickness, NOT merely a horizontal line, no circular bubble. Frame-to-frame motion is a subtle coherent travelling energy ripple and few particles progressing smoothly left-to-right, loop last to first. Pure BLACK #000000 background and all empty space; intended ADDITIVE SCREEN blending in a game, only luminous pixels in the effect, no solid surfaces, black instead of fake transparency. Crisp hand-made square pixel clusters, limited 3-shade palette, old-school 2D indie game VFX, no soft airbrush, no photorealism, no 3D, no text, no people, no buildings, no stone wall, no tall posts or gate, no ground or floor circle. Subject: WOOD elemental barrier, jade and emerald green energy woven into a horizontal protective lattice of curved luminous vine strands, small leaf-shaped talisman outlines, warm pale-green highlights. No opaque wooden fence. Leaf-shaped pixel motes slowly slide upward and cycle away, small channels of green light travel along the vine lattice. Keep underlying screen surface sparse so the game ground remains visible after additive blending. Distinct botanical silhouette and leaf motif, not golden armor or a simple recolor.

**水**

> Generate ONE production animated magical barrier sprite atlas for a Chinese folklore exorcist pixel-art game. Exactly EIGHT sequential frames in an even TWO COLUMN by FOUR ROW grid, overall image1312x736 pixels, each cell656x184. No borders, labels or grid lines. Same wide low arched energy screen in every cell, 90% cell width, top around30% cell height, FIXED baseline at80% cell height, generous empty margins. No changes to overall scale, center, endpoints or camera. The shape has area and thickness, NOT merely a horizontal line, no circular bubble. Frame-to-frame motion is a subtle coherent travelling energy ripple and few particles progressing smoothly left-to-right, loop last to first. Pure BLACK #000000 background and all empty space; intended ADDITIVE SCREEN blending in a game, only luminous pixels in the effect, no solid surfaces, black instead of fake transparency. Crisp hand-made square pixel clusters, limited 3-shade palette, old-school 2D indie game VFX, no soft airbrush, no photorealism, no 3D, no text, no people, no buildings, no stone wall, no tall posts or gate, no ground or floor circle. Subject: WATER elemental barrier: clear blue-white and cyan horizontal water curtain, gently stepped pixel wave crest, slim luminous curling wave motifs rather than a geometric lattice. Sparse translucent cyan streaks fall and roll sideways, tiny square droplets rise and vanish along the crest. Eight frames show water ripples travelling left-to-right while overall barrier height and baseline stay fixed. Predominantly dark interior for additive blending, not a solid blue slab. Distinct flowing water silhouette, no vines, leaves, flames, armor or ice wall.

**火**

> Generate ONE production animated magical barrier sprite atlas for a Chinese folklore exorcist pixel-art game. Exactly EIGHT sequential frames in an even TWO COLUMN by FOUR ROW grid, overall image1312x736 pixels, each cell656x184. No borders, labels or grid lines. Same wide low arched energy screen in every cell, 90% cell width, top around30% cell height, FIXED baseline at80% cell height, generous empty margins. No changes to overall scale, center, endpoints or camera. The shape has area and thickness, NOT merely a horizontal line, no circular bubble. Frame-to-frame motion is a subtle coherent travelling energy ripple and few particles progressing smoothly left-to-right, loop last to first. Pure BLACK #000000 background and all empty space; intended ADDITIVE SCREEN blending in a game, only luminous pixels in the effect, no solid surfaces, black instead of fake transparency. Crisp hand-made square pixel clusters, limited 3-shade palette, old-school 2D indie game VFX, no soft airbrush, no photorealism, no 3D, no text, no people, no buildings, no stone wall, no tall posts or gate, no ground or floor circle. Subject: FIRE elemental barrier: cinnabar red and amber-orange magical fire screen, short controlled tongues of pixel flame sweeping horizontally from left to right, small warm ivory flame cores and a few red paper talisman-shaped energy marks. The defensive screen is a thin luminous membrane with sparse flame contours, not an opaque wall of lava, not a burning wooden fence and not a full screen explosion. Exactly8 loop frames: flame tips bend, split and reform gradually, a few tiny embers rise, then naturally return to first pose. Fixed low height and constant bottom edge. Distinct flame silhouette; no vegetation, water, stone or metal plates.

**土**

> Generate ONE production animated magical barrier sprite atlas for a Chinese folklore exorcist pixel-art game. Exactly EIGHT sequential frames in an even TWO COLUMN by FOUR ROW grid, overall image1312x736 pixels, each cell656x184. No borders, labels or grid lines. Same wide low arched energy screen in every cell, 90% cell width, top around30% cell height, FIXED baseline at80% cell height, generous empty margins. No changes to overall scale, center, endpoints or camera. The shape has area and thickness, NOT merely a horizontal line, no circular bubble. Frame-to-frame motion is a subtle coherent travelling energy ripple and few particles progressing smoothly left-to-right, loop last to first. Pure BLACK #000000 background and all empty space; intended ADDITIVE SCREEN blending in a game, only luminous pixels in the effect, no solid surfaces, black instead of fake transparency. Crisp hand-made square pixel clusters, limited 3-shade palette, old-school 2D indie game VFX, no soft airbrush, no photorealism, no 3D, no text, no people, no buildings, no stone wall, no tall posts or gate, no ground or floor circle. Subject: EARTH elemental barrier: ochre-gold / muted amber magical mountain-pattern screen, sparse layered angular mountain ridge sigils and hovering hexagonal rocky ENERGY outlines, fine sandstone-colored luminous fissures threading left-to-right. The rocks are magical transparent outlined fragments, not opaque brown stones, not physical masonry and not a stone wall. Dark interior lets underlying battle ground show through with additive blending. Eight frames: a low pulse passes through the mountain sigils, several tiny angular sand-light fragments rise then settle, constant silhouette, all loops quietly. Distinct mountain / earth motif, no gold swords or armor, no vines, water or flames.

</details>

### 五行结界代码试验与重做（2026-11-01）

`BarrierArt.ts` 提供 Cocos 与浏览器共用的确定性绘制数据，`BarrierView.ts` 负责 Cocos Graphics。首页加入金木水火土外观选择（仅本次会话），战斗符师保持在结界后；已有流动、局部受击、血量衰弱与破碎反馈。未实现五行伤害修正，规则仍见 gameplay-design 第 2.3.1 节。

用户拒绝代码线框版，以及加厚能量幕后的第二版：重复轮廓仍像栅栏，材质感不足。当前运行版属于待替换试验，不代表视觉定稿。下一步只出金系单张造型样板，不批量重出五系或动作图集。使用项目指定 Agnes 2.5 Flash；模型、参考图与实际生成结果据实登记。

金系重做样板：`docs/art/deliver/barriers/metal-ward-concept-v2.png`，1312×736，Agnes 2.5 Flash。带当前样板的图生图请求返回 503 no available server，随后同型号纯文生图成功；未使用参考图，不能标为图生图。深靛有底色，仅供造型评审，不是透明运行素材，未接入 Cocos，也未扩展其他元素。新造型为双悬浮金符、弧形金色能量幕及中央印记；透视方向、符箓尺寸、屏幕占位待确认。

实际成功提示词：

> Create ONE premium Chinese folklore pixel-art MAGIC BARRIER DESIGN, NOT an animation sheet. Wide 1312x736 canvas, single isolated golden magic ward on plain dark indigo #101526 background. Exquisite handmade retro indie pixel art with crisp pixel clusters, selective dithering, navy shadows, amber-gold #F4B41B, warm ivory highlights and cinnabar red accents. Camera slightly elevated 30 degrees, matching a top-down vertical mobile defense game. Show a low, broad crescent-shaped transparent shield, not a dome or ball. Exactly TWO ornate floating golden paper talismans form its left and right endpoints, tilted inward with vivid cinnabar decorative seal strokes. Between them is a flowing translucent curved golden energy veil, barely visible in the middle, beautifully luminous around the curved upper and lower rims. The two curved rims describe a subtle 3D crescent surface, with a narrow elliptical golden footprint on the ground below. A small elegant glowing Taoist seal is suspended in the center. Two graceful ribbon-like calligraphic golden streams flow along the shield, 5-8 tiny golden sparks. Rich crafted pixel textures on the talismans, high contrast selective ivory glints on the energy rims, restrained amber aura. Large quiet dark center remains see-through. The entire asset fits center 85% width and 55% height, generous empty margin. Beauty and supernatural material quality, avoid technical diagram appearance. NO fence, NO spikes, NO row of swords, NO masonry wall, NO rocks, NO repeating panels, NO sci-fi hexagons, NO circuit board, NO mechanical pylons, NO enclosing sphere, NO characters, NO landscape, NO UI, NO readable text or labels, NO watermark, NO checkerboard, NO grid, NO multiple views. Single finished design, pixel art not smooth anime or realistic rendering.

### 金系横向平直样板 v3（2026-11-01）

用户指出 v2 弧形不合理，确认继续改为横向防线。新候选 `docs/art/deliver/barriers/metal-ward-straight-v3.png`，1312×736，Agnes 2.5 Flash 纯文生图（未附参考图，沿用上轮已验证的可用路径）。两侧竖直悬浮符箓、上下平直金色能量屏、中央小菱形印记，取消下垂弧线。仍有深色底，仅作造型候选，未接入游戏、未制成动画；不代表五行定稿。

实际生成提示词：

> Create ONE premium handcrafted PIXEL ART asset concept for a Chinese Taoist five-element defense game: GOLD ELEMENT MAGIC BARRIER. Single landscape image 1312x736, dark solid midnight indigo background #101526. CRITICAL GEOMETRY: a STRAIGHT HORIZONTAL RECTANGULAR ENERGY SCREEN spanning left to right. Its top edge is a straight horizontal line at y=330, bottom edge straight horizontal at y=475. Both endpoint talismans are at exactly equal height. The center must NOT sag or bow. No U curve, no crescent, no arch, no necklace, no smile shape, no oval ground ring. View almost frontal with slight top-down game perspective, retain STRAIGHT horizontal top and bottom edges. Width from x130 to1180. A small upright floating amber paper talisman at each endpoint x150 and1160, from y260 to480, equal sizes. The talismans have sparse cinnabar abstract decorative strokes, no readable writing, no oversized banners. A transparent golden magical membrane stretches taut and level between them, about 140px tall, very thin softly uneven pixel edges, mostly dark transparent-looking center, subtle amber dithered energy texture. Warm ivory-gold filaments flow horizontally within it, sparse short elegant brush-stroke-like traces, tiny sparks drifting above. A SMALL abstract gold diamond seal at exact center, no text. Exquisite detailed retro indie pixel art, crisp stepped pixel clusters, selective dithering, controlled gold #F4B41B and ivory highlights, dark amber shadows, red cinnabar talisman markings. Supernatural crafted material, readable when reduced to phone width. Much quieter central area than endpoints, no solid opaque wall. Isolated asset only; no characters, no monsters, no environment, no UI, no labels, no watermark, no grid, no sprite sheet, no rock, no masonry, no fence, no sword row, no sci-fi hexagons, no blue force field, no dome. No curved silhouette of any kind. Keep all artwork in the middle horizontal third with generous empty dark margins. A flat transverse defensive line, two small talismans and a beautiful transparent golden veil.

### PixelFX 金系代码样板（2026-11-01）

用户改选现有 PixelFX 特效改制，并要求先看一套。使用上游 `holy/divine-shield` 的半透明薄膜、对角扫光、`cycle` 闪点配方，改为平直金色能量屏，两侧小符箓和中央菱形印记。效果及 core 位于 `docs/evidence/pixelfx/`，许可登记见 LICENSES.md；当前只做金系，不批量扩展五行。

交互预览：`docs/evidence/2026-11-01-pixelfx-gold-preview.html`，可暂停、点击局部受击、切换 100% / 20% 强度和战场 / 纯色底。符师在屏障下方，展示现有角色待机；此页是独立视觉样板，尚未接入 Cocos，也未改五行伤害。旧两版代码和图片候选均不视为最终定稿。

依 PixelFX 流程做三轮渲染检查：初版修正点状边框，第二版增强纸符明暗与薄膜，第三版消除内边的棋盘点纹并加沿边流光。`tools/check.mjs holy/gold-ward` 1 pass / 0 fail / 0 warnings。浏览器无错误日志，受击与强度切换已验证。截图 `docs/evidence/2026-11-01-pixelfx-gold-scene.jpg`，循环动画 `docs/evidence/2026-11-01-pixelfx-gold-ward.gif`。画面仍待用户判断。

### 像素画布结界 · 金系（2026-11-01）

用户认为 PixelFX 样板太弱（两条细线、中间空、两端太小），按“全代码、与画风同一像素密度”重做。`assets/scripts/game/BarrierPixels.ts` 在 240×62 低分辨率 RGBA 画布上逐帧绘制，`BarrierView.ts` 上传为贴图、每格放大 3 倍最近邻显示，每秒最多重绘 20 次；不依赖 PixelFX 和图片。

- 薄膜：4 级元素色阶 + Bayer 抖动，下实上虚；接地亮线、顶边亮线和符阵菱形节点；斜纹流光、横扫光、部分列上升的灵气光段；中段一排 5×7 篆意符文缓慢滚动、依次点亮。
- 两端镇妖旗杆：石座、木杆、小檐宝顶、横担挂 9 格宽朱砂符旗（随风摆、旗尾飘）、外侧灯笼带抖动光晕，颜色取自本文第 2 节色板。
- 受击：撞击点菱形波纹外扩 + 核心闪白，上下边线亮光沿边跑开，碎光迸出。结界值 <60% 依次出现亮色裂缝，<30% 薄膜闪烁、像素剥落，归零时碎裂成像素碎片下落。
- 其他四系暂按元素色阶自动换色，纹样未单独设计。

动图 `docs/evidence/2026-11-01-barrier-pixel-gold.gif`（正常 → 受击 → 变弱出裂纹 → 碎裂），静帧 `docs/evidence/2026-11-01-barrier-pixel-gold.png`。`test-player-animation.mjs` 通过。用户确认方向后已在 Cocos 7456 预览第一关实机查看：方向、旗杆、受击波纹、25% 结界值的变暗与剥落均正常，控制台无报错。实机发现暗色裂纹在暗底上看不清，已改为高光芯线 + 主色描边的亮色裂缝（浏览器预览已确认，Cocos 内待编辑器刷新后复看）。

### ChatGPT 首页拆分替换（2026-11-02）

用户确认候选后替换首页，原图和旧素材备份在 `generated-images/home-chatgpt-20261102/`。拆出 10 张透明 UI：铜钱栏、符纸栏、设置、养成、符咒、记录、关卡框、左右箭头、出战。数字与关卡名由运行时显示；人物、标题、灯笼和纸人仍保留在背景。背景仅在控件遮挡处合入 ChatGPT Image 补全，其他区域保留原候选。可复现切分脚本：`tools/asset-pipeline/extract_chatgpt_home.py`；尺寸与来源见 asset-manifest。保留普通/困难与五行外观交互；未修改玩法数值。

验证：类型检查使用本机 TypeScript 支持的 `--ignoreDeprecations 5.0 --skipLibCheck --lib ES2017,DOM` 通过；10 张 UI alpha 均含 0 和 255。Cocos 393×852 首页截图见 `docs/evidence/2026-11-02-home-chatgpt-integrated.png`，点击出战进入选卡已验证。9:16 插画完整等比显示，长屏上下留深靛边；角色尚未独立拆分。

### 首页长屏留白修复（2026-11-02）

原 9:16 插画居中完整显示在 393×852 上产生上下色带。改用 941×2040 背景：中心原图保持尺寸和人物比例，上下只延展星空与石阶；顶部资源栏贴顶，关卡框、出战和结界外观贴底。背景使用覆盖适配，控件使用独立锚点。393×852 已确认无上下纯色色带，出战进入选卡正常；截图 `docs/evidence/2026-11-02-home-fullscreen.png`。类型检查通过。本修复尚未提交。

### 荒村七怪阵容重设（2026-11-02）

用户确认纸扎童子、行尸、鬼火、落水鬼、铜钱鼠、引魂灯笼、荒坟老妖的新阵容。当前造型方案及制作状态唯一记录见 `docs/art/level1-polish.md`；玩法见 `docs/gameplay-design.md` 第 2.4 节。此前树精、圆胖泥尸与火狐等旧造型记录均属于历史，不代表新阵容定稿。新总览仍为审图候选，运行资源暂保留旧图占位。

### 荒村全动作素材已接入（2026-11-02）

七怪新造型已替换第一关运行资源，不再使用旧树精、泥尸、火狐、铜钱精等占位。36组动作286帧的清单、来源、切帧修复、状态机接入和验证边界统一见 `docs/art/level1-polish.md` 的“全阵容动作集接入”；全动作审看通过素材中心。前文旧素材状态仅作历史记录。

### 四位符师造型候选（2026-11-02，用户已确认）

造型对照图：`docs/art/deliver/heroes/four-heroes-specializations.png`。ChatGPT Image 以现有首页符师及唯一像素样板为参考生成。用户确认采用本版：现有符箓道士沿用，新增灰白短袍与桃木剑的镇邪剑客、青黑衣裙与银铃柳枝的引魂巫女、赭红破袍与葫芦符串的赤焰道人。专精与玩法唯一来源见 `docs/gameplay-design.md` 第4.8节，本页不重复技能规则。

本图为正面造型审图，不直接作为俯视战斗素材。当前已生成并接入四张独立首页立绘 `hero_home_*`，首页背景移除了原先烘焙的人物；新增三人的背面战斗静态图及 `anim/hero_{sword,medium,flame}` 待机 / 施法 / 受击序列，动作 GIF 在 `docs/art/deliver/heroes/`，原始生成图与背景备份在 `generated-images/home-heroes-20261102/`。首页具有轻待机与人物属性粒子。选人与武器规则见 gameplay-design 第4.8节。

已接入不等于完成视觉验收：仍需逐人核查首页上下轮播、立绘脚底与特效位置、战斗背面动作和专属武器弹道，并核对素材清单、像素采样 meta 与素材中心索引。完整专精机制尚未实现。
