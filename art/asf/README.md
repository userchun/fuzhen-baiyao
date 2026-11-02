# 动作精灵图工作区（Agnes imagegen，不用视频）

本目录只做 **静帧 / 动作精灵表（sprite sheet）** 的暂存。  
**默认不用** Agent Sprite Forge 的 `video2dsprite` / 图生视频（Grok I2V）。ASF 对本项目可选、默认不走。

**跳过 Magpie。** 生图走项目 imagegen → Agnes（`agnes-image-2.5-flash`）。

| 环节 | 工具 | 输出 |
|---|---|---|
| 1. 定稿造型 | `tools/asf/imagegen-take.sh` 或 `~/.claude/skills/imagegen/scripts/agnes.py`；有参考图时优先仓库内 `scripts/agnes-image.py`（若存在） | `art/asf/<id>-takes/` 或 `generated-images/…` |
| 2. 动作精灵表 | 同一套 Agnes/imagegen：以定稿为参考出 **网格序列图**；或 AI 序列失败时用 `scripts/puppet-*.py` 部件合成 | `art/asf/<id>-sheets/` |
| 3. 切帧对齐 | `level-art` §3（现有切帧/像素化流程） | 帧 PNG |
| 4. 进引擎 | 拷贝 | `assets/resources/textures/anim/<id>/`（`move_00..` 等） |

- Agnes：`https://apihub.agnes-ai.com/v1`，模型 `agnes-image-2.5-flash`
- 鉴权：`AGNES_API_KEY`（勿写入仓库/聊天）
- 引擎：Cocos Creator 3.8.8
- `tools/asf/approve-from-imagegen.sh` 仅在显式启用 ASF 时才需要；默认精灵图表流程不调用它，也不调用 `$video2dsprite`。

## 推荐流程（精灵图）

### 1) 定稿

```bash
export AGNES_API_KEY=...

tools/asf/imagegen-take.sh --char daoshi --out-name take.png --size 1024x1024 -- \
  "暗黑国风Q版道士主角，全身正面俯视朝下，黑发束发，青灰道袍，腰间符袋，手持桃木剑，脚底同高，无文字无水印"
```

用户确认一张定稿后再继续。

### 2) 出动作精灵表（仍用 imagegen，不用视频）

用定稿作参考，按动作各出一张网格图（例如走路 12 帧：3×2 半周期再镜像，或 6×2），prompt 写明：每格同一角色、同大小、脚底同高、全身完整、朝向与 `level-art` 一致、动作分解。

有仓库脚本时：

```bash
# 示例：带参考 + 比例（以仓库 scripts/agnes-image.py 为准）
python3 scripts/agnes-image.py --prompt-file walk.txt --ref art/asf/daoshi-takes/take.png \
  --size 2K --ratio 3:2 --out art/asf/daoshi-sheets/walk.png
```

序列图连续失败 → 改用部件合成（见 `level-art`）：`scripts/puppet-walk.py` / `puppet-hop.py` / `puppet-fox.py` 等。

### 3) 切帧 → 进游戏

按 `.claude/skills/level-art/SKILL.md` §3–§4：切格、对齐、像素化（若需要），再拷到 `assets/resources/textures/anim/<id>/`，登记素材清单。

## 不要做的事

- 不要默认跑 ASF `$video2dsprite` / `sprite_set.py` / Grok 图生视频
- 不要用 Magpie MCP / `magpie.py`
- 不要把中间大图/视频提交进 git（`art/asf/**` 已忽略，仅保留本 README）

## 检查

```bash
python3 ~/.claude/skills/imagegen/scripts/agnes.py --dry-run -o /tmp/x.png "ping"
```

`tools/asf/magpie-take.sh` 只是跳到 `imagegen-take.sh` 的 stub。
