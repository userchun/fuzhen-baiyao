# Agent Sprite Forge 输出目录（符镇百妖）

本目录是 [Agent Sprite Forge](https://github.com/0x0funky/agent-sprite-forge) 在本项目的约定输出位置。

- 工具克隆：`~/Tools/agent-sprite-forge`
- Codex 技能已安装到：`~/.codex/skills`（`generate2dsprite` / `video2dsprite` 等）
- 引擎：本仓库是 **Cocos Creator 3.8.8**（不是 Phaser）。成品精灵请拷到 `assets/resources/textures/`（动画可放 `textures/anim/`），不要把 ASF 中间视频直接当正式资源。

## 生成流程（在 Codex 新会话里）

1. 出原画（master still），输出到本目录下角色子文件夹，例如 `art/asf/daoshi-master/`：

```text
Use $generate2dsprite to make a master still of 符镇百妖道士主角：黑发束发、青灰道袍、腰间符袋、手持桃木剑，侧视朝右，暗黑Q版，HD。输出到 art/asf/daoshi-master。给我三张 takes。
```

2. 批准一张后，再出动作集（idle/walk/run/attack 等），例如 `art/asf/daoshi-set/`：

```text
Use $video2dsprite to animate the approved master in art/asf/daoshi-master：idle、walk、run、attack、hurt。像素后期可选。输出到 art/asf/daoshi-set，并导出 web / Aseprite JSON（便于再导入 Cocos）。
```

## 本机依赖

- Python 3.10+（已用 conda `python3`）+ `~/Tools/agent-sprite-forge/requirements.txt`
- ffmpeg 5.1+（本机 7.1，含 libvpx-vp9 / libx264）
- 无 API key 时走已登录的 Codex / Grok CLI；图生视频优先 Grok ACP

检查：

```bash
python3 ~/Tools/agent-sprite-forge/skills/generate2dmedia/scripts/forge_doctor.py
python3 ~/Tools/agent-sprite-forge/tools/install_skills.py --check --host codex
```

中间 mp4/webm/clips 默认被 `.gitignore` 忽略；确认可用的 PNG atlas / animation.json 再拷进 `assets/resources/textures/` 并登记 `docs/art/asset-manifest.json`。
