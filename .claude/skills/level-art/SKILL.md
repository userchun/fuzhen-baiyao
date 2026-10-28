---
name: level-art
description: 符阵白妖（fuzhen-baiyao）按关卡做美术素材的流程：定稿造型 → 序列图出帧 → 切帧对齐 → 换进游戏 → 用户在游戏里确认 → hold push 提交。用户说"做第 N 关素材 / 重做某个怪 / 换背景城墙 / /level-art"时使用。
---

# /level-art：一关的美术素材流程

第一关（荒村）就是按这个流程做完的，后面的关卡照着做。

## 0. 先定范围

- 读 `design/art/art-bible.md`（美术总纲）、`design/art/asset-manifest.json`（顶层是 `{"assets":[...]}`）、`design/level1-polish.md`（第一关的完整记录，可当范本）。
- 从 `assets/scripts/config/GameConfig.ts` 的 `ENEMIES` 和这一关的 `LEVELn_WAVES` 列出要做的素材：小怪、Boss、背景、城墙，主角一般沿用。
- 先把清单和顺序发给用户确认，然后**一个素材一个素材做**。每做完一个都要等用户在游戏里看过、确认，再做下一个。

## 1. 硬规格

| 类型 | 动画 | 帧数 | 单帧尺寸 |
|---|---|---|---|
| 小怪 | move | **12** | 256 |
| Boss | idle / hit / death | **20** / 6 / 12 | 384 |
| 主角 | idle / cast / hit | 12 / 8 / 6 | 256 |

- 风格是 **暗黑国风 Q 版**（见 `design/art/art-bible.md`，样板图 `design/art/ref/style_target.png`）：厚涂、轮廓光、青蓝妖气对朱红金黑、造型狰狞、大头比例。提示词一律从 `design/prompts-dark-qban.md` 拼（风格锁 + 主体 + 构图 + 约束 + 负面词），出图时附上样板图。每张新图都要检查四项：画风一致、轮廓清楚、没有文字、俯视朝向正确。
- 视角统一是**俯视**（可读性参考休闲俯视射击，不照搬任何游戏画面）。背景是 1024×1536 的俯视地面，屏幕顶部到底部都是路。城墙是 1440×304 的俯视城墙顶。
- 配色：妖怪和背景不能撞色。背景里的暖红灯光要压暗或改冷，把暖色留给怪物和主角的符光。
- 怪物胸口要留封印（字印）的位置。

## 2. 出图（`/imagegen`）

- 调用 `~/.claude/skills/imagegen/scripts/magpie.py`，MCP 断开时也能用：
  `python3 magpie.py -o out.png -r ref.png --size 1536x1024 --background transparent "prompt"`
- **只出一张**，不要并行出多个候选。先说明选了哪个方向，出完给用户看，不满意再改。
- 出图分两步：
  1. 先出**定稿造型**单张，用户确认后再继续。
  2. 用定稿图作参考（`-r`），出**等网格序列图**：
     - 12 帧用 6×2 网格；
     - 20 帧可以出 6×2 + 4×2 两张，或 5×4 一张；
     - prompt 里写明"每格同一角色、同大小、脚底同高、格间留空、透明背景"，以及动作的分解。
- 原图和中间产物都放到 `generated-images/<关卡>-<主题>-<日期>/`。替换游戏里的旧图之前，先把旧图备份到这里。

## 3. 切帧

```bash
python3 tools/asset-pipeline/slice_sheet.py sheet.png outdir --cols 6 --rows 2 --size 256 --name move --count 12 --strip strip.png --gif preview.gif --fps 12
```

- 脚本会做这几件事：
  - 用连通域只保留主体，去掉混进来的邻格碎块；
  - 去掉透明区残留的背景色；
  - 统一缩放，以最高的一帧为准；
  - 横向按上半身质心对齐，脚底对到 0.94 高度。
- 封印会发光的怪，加 `--seal-band y0,y1`，按封印位置横向对齐。
- 同一个角色有好几套动画时，要检查各套之间的身体高度是否一致。不一致就调 `--fill` 重切。
- 切完先看 gif 和 strip，确认没有抖动、没有残边，再发给用户。

## 4. 换进游戏

- 帧放到 `assets/resources/textures/anim/<id>/`，命名为 `move_00..11`、`idle_00..`、`hit_..`、`death_..`。单张立绘放到 `assets/resources/textures/<id>.png`。
- 新文件要等 Cocos Creator 编辑器导入后才会生成 `.meta`。提醒用户在编辑器里刷新，`.meta` 要一起提交。
- 代码里要对应调整的参数：
  - `assets/scripts/core/Art.ts` 的 `ENEMY_ART`：调字印位置 `sealY / sealX / sealR`。字印逐帧跟随时用 `sealYFrames`（每帧一个值）。
  - `assets/scripts/game/Combat.ts` 的 `ENEMY_MOVE`：调 `fps / bobPx / swayDeg`。生成怪物时已经会随机起始帧，并加上轻微摇摆。
  - 主角：调 `PLAYER_ART_SIZE`，以及 cast 的 fps。
  - 背景：调 `GameRoot.ts` 的 `BG_ART` 和 `BG_ART_RATIO`（高宽比）。
  - 城墙和布局：调 `GameConfig.ts` 的 `LAYOUT`，包括 `wallArtH / wallArtTopAbove / roadHalfW`。
- 改完代码后跑类型检查：
  `tsc --noEmit -p . --ignoreDeprecations 6.0 2>&1 | grep '^assets/'`。
  引擎声明文件的报错可以忽略；`AudioManager.ts` 里 `Object.values` 的报错是之前就有的。

## 5. 记录与提交

- 同步更新两个文件：
  - `design/art/asset-manifest.json`：写尺寸、帧数、状态（JSON 用 indent 2）；
  - `design/level<N>-polish.md`：写做了什么、为什么这样做。
- **用户在游戏里看过、确认之后才提交**。提交方式是 hold push：只 commit，不 push。
- commit message 用中文，格式是 `feat(art): …（hold push）`，末尾加 Co-Authored-By 行。
- `generated-images/` 不纳入版本管理。

## 第一关踩过的坑

- 8 帧走路太僵，所以小怪统一用 12 帧。另外要随机起始帧、加轻微摇摆，同屏的怪才不会同步动作。
- 透视背景会让怪物看起来像从天上掉下来，城墙也会被压扁，所以统一改成俯视。
- 出怪的横向范围要收在路面以内（`roadHalfW`），不然怪会从房顶冒出来。
- 主角用 3/4 背面、浅色道袍、暖金符光，这样在深色背景上才看得清。
- 中文字体用 `/System/Library/Fonts/Hiragino Sans GB.ttc`，PingFang 打不开。
- zsh 不会自动拆分 `$REF`。要传多个参考图时，用数组。
