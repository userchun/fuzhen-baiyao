# 符镇百妖 — 构建与运行

1. 安装并打开 **Cocos Creator 3.8.8**（Dashboard 或 `/Applications/Cocos/Creator/3.8.8/CocosCreator.app`）。
2. **打开项目**：选择本仓库根目录 `fuzhen-baiyao`（含 `package.json` / `assets`）。
3. 等待资源导入完成后，点编辑器上方 **播放 / 预览**（浏览器预览默认 `http://127.0.0.1:7456/`）。
4. 预览里 **先点击一次画布**（解锁音频），进入选关菜单「符镇百妖」。
5. 点 **第一关·荒村** 开战；通关后解锁 **第二关·古寺**（白骨夫人 / temple BGM）。

## 发布第一个可分享版本（itch.io）

1. Cocos 构建 **Web Mobile**，检查竖屏适配（375×812 和平板尺寸）。
2. 补全 `LICENSES.md`，按目录登记素材来源。⚠️ 即梦等出图平台的商用条款还没核实，收费上架前必须先看用户协议。
3. 发到 itch.io，先设成私密链接。
4. 收集 3–5 人的试玩反馈（配合设置页导出的试玩记录），再决定先做第三关还是继续打磨。
5. 以后再考虑微信小游戏。

## 2026-11-01 本地验证

- 青绿鎏金主页已接入 `HomeUI.ts` 与 `assets/resources/textures/ui_home_bg.png`，Cocos Creator 3.8.8 已导入资源。
- 浏览器预览：`http://127.0.0.1:7456/`；已检查 360×720、375×812，点击“出战”可进入第一关选卡与战斗。
- 主页插画与 UI 分离，战斗图片和音频仍缺失，当前以代码图形及静音运行。
- 类型检查：`tsc --noEmit -p . --ignoreDeprecations 6.0 --skipLibCheck --lib ES2017,DOM` 通过。默认命令存在引擎声明及 ES2017 库配置报错，未在本次换肤中修改项目编译配置。
- 主页截图：`docs/evidence/2026-11-01-home-jade-gold-375x812.jpg`。

### 编辑器外改代码后的刷新

脚本保存后先运行 `curl --max-time 30 http://127.0.0.1:7456/asset-db/refresh`，返回 `success` 后刷新预览。2026-11-01 已验证此接口触发脚本重新导入和预览编译；仅刷新浏览器可能继续运行旧代码。当前主页布局验收图见 `docs/evidence/2026-11-01-home-layout-v2-375x812.jpg` 与 `docs/evidence/2026-11-01-home-layout-v2-360x720.jpg`。

### 符师动作衔接回归

运行 `node scripts/balance-sim/test-player-animation.mjs`，在临时目录编译真实 Combat / FrameAnim 并替换 cc 渲染接口；检查动作切换、恢复、优先级与受击期间攻击不中断。不会改游戏存档，不代替 Cocos 内视觉验收。

### 2026-11-01 精致像素首页交付

当前首页背景与符师分层，图标、按钮和面板由 HomeUI 绘制。运行入口仍为 `http://127.0.0.1:7456/`。已验证 393×852 / 360×720 和主页各入口至出战选卡；完整记录与截图见 `docs/art/art-bible.md` 第 8 节。上述青绿鎏金截图为历史记录，不能作当前视觉标准。项目类型检查命令沿用上文，已通过。

### 2026-11-01 Agnes 生图排查

使用现有 Magpie Image 工具，未修改全局模型、供应商或凭据。显式指定 2.5 / 2.0 做对照：

| 路径 | 结果 |
|---|---|
| 2.5，1024×1024 纯文生图，不传 background | 成功，`generated-images/agnes-debug-2026-11-01/probe-25.png` |
| 2.0，1024×768 纯文生图，不传 background | 成功，`generated-images/agnes-debug-2026-11-01/probe-20-minimal.png` |
| 2.5 纯文生图，加 background=transparent | HTTP 400：background is not supported by text image queue |
| 2.5 带参考图，移除 background、改标准 1024×768 | HTTP 503：no available server |
| 2.0 带参考图，移除 background、标准 1024×768 | HTTP 500：could not convert string to float: '' |
| 按用户粘贴官方文档直接 POST 2.0，extra_body.image / response_format，不传 background | HTTP 503：image queue is full, please retry later |

结论：纯文生图存在成功路径，不能称全部型号停服；background 参数确实不兼容，已在出图流程中移除。带参考图失败同时出现无可用实例、队列已满和服务端 500；尚不能把全部错误归因于 Magpie 封装，也不能声称图生图已修复。2.5 最小成功图 alpha 范围为 248–255，不符合可用透明素材要求。测试图片仅诊断用途，未接入游戏；五行结界图集尚未生成成功。后续透明图必须核验实际 alpha，不能只依据 PNG / RGBA 文件格式。

补充：根据用户提供的 2.5 专用文档，以 `model=agnes-image-2.5-flash`、`size=1K`、`ratio=16:9`、`extra_body.image`（当前样板 Data URI）、`extra_body.response_format=b64_json` 直接验证，不传 background / tags / 顶层 response_format。约 3.3 秒返回 HTTP 503：`image queue is full, please retry later`。因此使用推荐档位和比例仍遇到服务端排队，尚不能确认图生图可用；不能继续归因为精确尺寸本身。Magpie MCP 当前没有独立 ratio 参数，测试直接调用 API，未改默认模型或游戏资源。

### 五行结界候选预览

本轮同一 Agnes 2.5 Flash 纯文生图成功生成五套图集，原图与验收状态见 art-bible 第 8 节末尾。浏览器预览使用 `python3 -m http.server 8769 --bind 127.0.0.1`（仓库根目录运行），地址 `http://127.0.0.1:8769/docs/evidence/2026-11-01-barrier-animation-preview.html`。服务仅绑定本机；游戏预览仍为 7456 端口，两者独立。

### 五行结界代码预览（待视觉重做）

上述 8769 预览页现已改用与 Cocos 相同的 `BarrierArt.ts` 绘制数据，原 Agnes 图集保留作历史候选。更新预览模块：

```bash
tsc --ignoreConfig assets/scripts/game/BarrierArt.ts --target ES2020 --module ESNext --outDir docs/evidence/barrier-code
```

回归：`node scripts/balance-sim/test-player-animation.mjs`；类型检查：`tsc --noEmit -p . --ignoreDeprecations 6.0 --skipLibCheck --lib ES2017,DOM`。当前无可用 LSP 工具，使用上述仓库检查回退。用户已拒绝两版代码视觉，运行成功不等于美术验收通过。

### PixelFX 单套金系样板

沿用 8769 本机静态服务，查看 `http://127.0.0.1:8769/docs/evidence/2026-11-01-pixelfx-gold-preview.html`。无需构建；页面直接运行 `docs/evidence/pixelfx/fx/holy/gold-ward.js`。该预览不是 7456 的 Cocos 运行版。源码来源和许可见 LICENSES.md，视觉状态见 art-bible。当前无可用 LSP 工具，已用 `node --check` 和 PixelFX 原生检查回退。

### 本地素材中心（2026-11-02）

在仓库根目录运行 `python3 tools/asset-center/serve.py`，打开 `http://127.0.0.1:8770/tools/asset-center/`。仅监听本机，无需安装依赖。刷新页面或点击“刷新索引”会重新扫描运行素材和 `docs/art/deliver/` 候选。

支持分类、搜索、仅看动效、透明棋盘 / 深浅底 / 战场底、缩放、像素锐利、原图查看与下载、复制路径。序列动画可切动作、调整速度、暂停、拖动时间轴与逐帧查看；怪物帧率采用当前 Combat 配置，符师沿用 Art.ts 的图集采样与脚底校准。GIF 为原生循环录制，播放控制仅针对序列帧；结界交互页标明为历史独立预览，不代表当前 Cocos 实战效果。静态图、候选、缺失资源均明确区分。

入口文件：`tools/asset-center/index.html`；扫描器：`tools/asset-center/build_catalog.py`；自动索引服务：`tools/asset-center/serve.py`。可单独执行扫描器更新 `catalog.json`，再用仓库根目录的任意静态 HTTP 服务访问。浏览器已验证序列播放 / 暂停 / 逐帧、动作切换与搜索；35 项文件路径及 72 帧边界已核验。
