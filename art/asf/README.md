# Agent Sprite Forge × 项目 `imagegen`（Agnes，跳过 Magpie）

本目录是符镇百妖的 **ASF 动作集工作区**。  
**原画（master still）走项目 imagegen skill 的 Agnes 后端**（`scripts/agnes.py` → `POST /v1/images/generations`）。**跳过 Magpie**（不调用 `magpie.py` / Magpie MCP）。

| 环节 | 工具 | 路径 |
|---|---|---|
| 静帧 imagegen | `~/.claude/skills/imagegen/scripts/agnes.py` | `art/asf/<char>-takes/` |
| 收成 ASF master | `tools/asf/approve-from-imagegen.sh` → `master_still.py approve --route external` | `art/asf/<char>-master/` |
| 动作集 I2V | ASF `$video2dsprite` / `sprite_set.py` | `art/asf/<char>-set/` |
| 进引擎 | 人工拷贝 | `assets/resources/textures/`（动画 `textures/anim/`） |

- Agnes base（文档默认）：`https://apihub.agnes-ai.com/v1`
- 默认模型：`agnes-image-2.0-flash`
- 鉴权：环境变量 `AGNES_API_KEY`（不要写入仓库或聊天）
- ASF 克隆：`~/Tools/agent-sprite-forge`（不进本仓库）
- 引擎：**Cocos Creator 3.8.8**

## 串联步骤

### 1) Agnes 出 master 候选

```bash
export AGNES_API_KEY=...   # 本机自行设置

tools/asf/imagegen-take.sh --char daoshi --out-name take.png --size 1024x1024 -- \
  "暗黑国风Q版道士主角，全身侧视朝右，黑发束发，青灰道袍，腰间符袋，手持桃木剑，脚底同高，无文字无水印"
```

等价：

```bash
python3 ~/.claude/skills/imagegen/scripts/agnes.py \
  -o art/asf/daoshi-takes/take.png --size 1024x1024 \
  "……同上 prompt……"
```

先 `--dry-run` 可检查 endpoint/model 且不发请求体里的密钥。

### 2) 批准为 ASF master

```bash
tools/asf/approve-from-imagegen.sh \
  --still art/asf/daoshi-takes/take.png \
  --name daoshi \
  --subject "符镇百妖道士主角，全身侧视" \
  --identity "黑发束发、青灰道袍、腰间符袋、手持桃木剑，暗黑国风Q版" \
  --class hero --facing right \
  --output-dir art/asf/daoshi-master
```

### 3) 动作集（ASF video2dsprite）

```text
Use $video2dsprite to animate the approved master at art/asf/daoshi-master/master.json：
idle、walk、run、attack、hurt。输出到 art/asf/daoshi-set。
```

### 4) 进 Cocos

帧确认后拷到 `assets/resources/textures/anim/<id>/`，按 `level-art` 命名，登记 `docs/art/asset-manifest.json`。

## 检查

```bash
python3 ~/.claude/skills/imagegen/scripts/agnes.py --dry-run -o /tmp/x.png "ping"
python3 ~/Tools/agent-sprite-forge/tools/install_skills.py --check --host codex
```

`tools/asf/magpie-take.sh` 仅保留为跳转 stub，实际走 Agnes。
