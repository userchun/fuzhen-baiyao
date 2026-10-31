# 符镇百妖 — 构建与运行

1. 安装并打开 **Cocos Creator 3.8.8**（Dashboard 或 `/Applications/Cocos/Creator/3.8.8/CocosCreator.app`）。
2. **打开项目**：选择本仓库根目录 `fuzhen-baiyao`（含 `package.json` / `assets`）。
3. 等待资源导入完成后，点编辑器上方 **播放 / 预览**（浏览器预览默认 `http://127.0.0.1:7456/`）。
4. 预览里 **先点击一次画布**（解锁音频），进入选关菜单「符镇百妖」。
5. 点 **第一关·荒村** 开战；通关后解锁 **第二关·古寺**（白骨夫人 / temple BGM）。

## 网页试玩 / 素材预览（不开 Cocos）

1. 编译战斗逻辑：`bash tools/art-preview/build.sh`（把 `assets/scripts` 里的战斗、刷怪、选卡、配置编译到 `tools/art-preview/game/`，不进 git；改了逻辑或数值要重跑）。
2. 在项目根目录运行 `python3 -m http.server 8770 --bind 127.0.0.1`，浏览器打开 `http://localhost:8770/tools/art-preview/index.html`。
3. 默认是首页（`ui_home_bg`），点「出战」进入第一关试玩：战场按住瞄准连发，城墙下方拖动移动，键盘 A/D 也能移动，空格暂停。右侧可切 1×/2×/0.5× 速度、开关图层和辅助线，「刷新素材」重新读取 `assets/resources/textures/` 里的图，边玩边换图。
4. 画面只按游戏坐标近似绘制（无粒子、音效、Boss 演出），规则以 Cocos 为准；只用来看素材效果和手感。

## 发布第一个可分享版本（itch.io）

1. Cocos 构建 **Web Mobile**，检查竖屏适配（375×812 和平板尺寸）。
2. 补全 `LICENSES.md`，按目录登记素材来源。⚠️ 即梦等出图平台的商用条款还没核实，收费上架前必须先看用户协议。
3. 发到 itch.io，先设成私密链接。
4. 收集 3–5 人的试玩反馈（配合设置页导出的试玩记录），再决定先做第三关还是继续打磨。
5. 以后再考虑微信小游戏。
