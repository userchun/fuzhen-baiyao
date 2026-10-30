# 符镇百妖 — 构建与运行

1. 安装并打开 **Cocos Creator 3.8.8**（Dashboard 或 `/Applications/Cocos/Creator/3.8.8/CocosCreator.app`）。
2. **打开项目**：选择本仓库根目录 `fuzhen-baiyao`（含 `package.json` / `assets`）。
3. 等待资源导入完成后，点编辑器上方 **播放 / 预览**（浏览器预览默认 `http://127.0.0.1:7456/`）。
4. 预览里 **先点击一次画布**（解锁音频），进入选关菜单「符镇百妖」。
5. 点 **第一关·荒村** 开战；通关后解锁 **第二关·古寺**（白骨夫人 / temple BGM）。

## 素材预览页（不开 Cocos）

在项目根目录运行 `python3 -m http.server 8765 --bind 127.0.0.1`，浏览器打开 `http://127.0.0.1:8765/tools/art-preview/index.html`。页面按 `GameConfig.ts` 的 `LAYOUT` 和 `Combat.ts` 的尺寸摆出第一关背景、城墙、主角、小怪动画和黑山老妖，可切屏幕比例、开关图层和辅助线。图片直接读 `assets/resources/textures/`，换图后刷新即可。只看素材摆放和动画，不含战斗逻辑；改了布局数值要同步改页面开头的常量。

## 发布第一个可分享版本（itch.io）

1. Cocos 构建 **Web Mobile**，检查竖屏适配（375×812 和平板尺寸）。
2. 补全 `LICENSES.md`，按目录登记素材来源。⚠️ 即梦等出图平台的商用条款还没核实，收费上架前必须先看用户协议。
3. 发到 itch.io，先设成私密链接。
4. 收集 3–5 人的试玩反馈（配合设置页导出的试玩记录），再决定先做第三关还是继续打磨。
5. 以后再考虑微信小游戏。
