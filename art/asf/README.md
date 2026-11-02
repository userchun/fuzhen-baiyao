# Agent Sprite Forge × 项目 `/imagegen`（Magpie）

本目录是符镇百妖的 **ASF 动作集工作区**。  
**原画（master still）一律走项目 imagegen skill（Magpie），不要用 Codex CLI / ASF `route_media` 生静帧。**

| 环节 | 工具 | 路径 |
|---|---|---|
| 静帧 /imagegen | `~/.claude/skills/imagegen` → `scripts/magpie.py` | 出到 `art/asf/<char>-takes/` |
| 关卡美术流程 | `.claude/skills/level-art/SKILL.md`（§2 出图） | 定稿造型同样用 Magpie |
| 收成 ASF master | `tools/asf/approve-from-imagegen.sh` → `master_still.py approve --route external` | `art/asf/<char>-master/` |
| 动作集 I2V | ASF `$video2dsprite` / `sprite_set.py`（本机 Grok ACP 等） | `art/asf/<char>-set/` |
| 进引擎 | 人工拷贝 | `assets/resources/textures/`（动画 `textures/anim/`） |

ASF 克隆：`~/Tools/agent-sprite-forge`（不进本仓库）。引擎是 **Cocos Creator 3.8.8**。

## 串联步骤

### 1) Magpie 出 master 候选（项目 imagegen）

```bash
# 单张（推荐一次一张，看完再改）
tools/asf/magpie-take.sh --char daoshi --out-name take.png --size 1024x1024 --background transparent -- \
  "暗黑国风Q版道士主角，全身侧视朝右，黑发束发，青灰道袍，腰间符袋，手持桃木剑，脚底同高，透明背景，无文字无水印"

# 或直接调 skill 脚本（与 level-art 一致）
python3 ~/.claude/skills/imagegen/scripts/magpie.py \
  -o art/asf/daoshi-takes/take.png \
  --size 1024x1024 --background transparent \
  "……同上 prompt……"
```

也可用会话里的 Magpie MCP：`mcp__magpie-image__generate_image`，再把图存进 `art/asf/<char>-takes/`。  
风格锁见 `docs/art/prompts-dark-qban.md` + `docs/art/ref/style_target.png`。

### 2) 用户选中一张 → 批准为 ASF master

```bash
tools/asf/approve-from-imagegen.sh \
  --still art/asf/daoshi-takes/take.png \
  --name daoshi \
  --subject "符镇百妖道士主角，全身侧视" \
  --identity "黑发束发、青灰道袍、腰间符袋、手持桃木剑，暗黑国风Q版" \
  --class hero --facing right \
  --output-dir art/asf/daoshi-master
```

底层是：

```bash
python3 ~/Tools/agent-sprite-forge/skills/generate2dsprite/scripts/master_still.py approve \
  --still art/asf/daoshi-takes/take.png \
  --route external \
  --name daoshi --class hero --facing right \
  --output-dir art/asf/daoshi-master
```

会写出 `master.png` / `master_rgba.png` / `master.json`（`generate2dsprite.master.v1`）。

### 3) 动作集（ASF video2dsprite）

在已装 ASF 技能的 Codex/Grok 会话里：

```text
Use $video2dsprite to animate the approved master at art/asf/daoshi-master/master.json：
idle、walk、run、attack、hurt。输出到 art/asf/daoshi-set，导出 web / Aseprite JSON。
```

或脚本：

```bash
python3 ~/Tools/agent-sprite-forge/skills/video2dsprite/scripts/sprite_set.py plan \
  --master art/asf/daoshi-master/master.json \
  --output-dir art/asf/daoshi-set \
  --actions idle,walk,run,attack,hurt
python3 ~/Tools/agent-sprite-forge/skills/video2dsprite/scripts/sprite_set.py run \
  --plan art/asf/daoshi-set/set_plan.json
```

视频路由本机当前是 **local:grok-acp**（无 API key 时）；静帧不要再走 ASF `route_media` / Codex `image_gen`。

### 4) 进 Cocos

确认帧后拷到 `assets/resources/textures/anim/<id>/`，按 `level-art` 命名（`move_00..` 等），登记 `docs/art/asset-manifest.json`。中间 mp4/webm 默认被 `.gitignore` 忽略。

## 检查

```bash
python3 ~/Tools/agent-sprite-forge/skills/generate2dmedia/scripts/forge_doctor.py
# 期望：image 可有 local:codex-cli，但本项目静帧约定仍用 Magpie /imagegen
python3 ~/Tools/agent-sprite-forge/tools/install_skills.py --check --host codex
```

Magpie 需本机 `/Applications/magpie.app` 在跑；HTTP 默认 `http://127.0.0.1:3425/mcp/magpie/image`（可用 `MAGPIE_IMAGE_URL` 覆盖）。
