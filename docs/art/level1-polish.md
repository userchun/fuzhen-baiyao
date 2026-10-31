# 第一关 · 荒村 素材重做（暗黑国风 Q 版）

> 2026-10-28 起，第一关全部素材按 `docs/art/art-bible.md` 的暗黑国风 Q 版重做。
> 出图用的提示词在 `docs/art/prompts-dark-qban.md`，流程见 `/level-art` skill。

## 1. 进度

| 顺序 | 素材 | 游戏里的用法 | 状态 | 说明 |
|---|---|---|---|---|
| 1 | 荒村背景 `bg_level1_village` | 全屏俯视地面，1080×2340（9:19.5） | ✅ 2026-10-31 用户在素材预览页确认 | 参考向僵尸开炮战斗地图：路面约 85%、两侧窄边约 7%、低对比无红光；`BG_ART_RATIO` 改为 2340/1080，长屏不再裁两侧。出怪范围 `roadHalfW` 暂保持 ±150，待看效果再放宽 |
| 2 | 城墙 `env_wall` | 1290×363，显示 860×242（两端被屏幕裁掉） | ✅ 2026-10-31 用户在素材预览页确认 | 参考向僵尸开炮城墙：正面略俯视、左右对称；正中石砌法坛给主角站，只有八卦镇妖牌是暖色；两侧矮角楼。垛口线 `wallFromBottom` 不变（258），`wallArtTopAbove` 96、`playerFromBottom` 333；城墙层移到妖怪层下面。破损两档（hurt1/hurt2）待做 |
| 3 | 主角 `player_taoist` | idle 12 / cast 8 / hit 6，显示 160 | 🔄 2026-10-31 按 v14 红袍造型重做，已换进游戏待确认 | 画风以主界面 v14 为准；agnes 2.5 不带参考图（agnes 参考图功能故障），定稿 `generated-images/style-v14-20261031/player_design_v4.png`；背景改用品红（偏紫），用「红蓝高、绿低」规则抠图保住红袍；hit 取 4×2 出图的前 6 格。旧帧备份在同目录 backup_*。新主角在法坛上略小，待试玩确认是否调 `PLAYER_ART_SIZE` |
| 4 | 纸人 `enemy_paperman` | idle 6 / move 12 / attack 10 / death 6 / hurt 1 | ⏳ 待做 | 旧半写实版仍在游戏里 |
| 4 | 跳尸 `enemy_jiangshi` | idle 6 / move 12 / attack 10 / death 6 / hurt 1，字印逐帧跟随 | ⏳ 待做 | 换图后要重新标 `sealYFrames` |
| 4 | 狐火 `enemy_foxfire` | idle 6 / move 12 / attack 10 / death 6 / hurt 1 | ⏳ 待做 | |
| 4 | 灯笼鬼 `enemy_lantern` | idle 6 / move 12 / attack 10 / death 6 / hurt 1 | ⏳ 待做 | |
| 5 | 黑山老妖 `boss_heishan` | appear 12 / idle 12 / move 12 / skill1 12 / skill2 16 / death 12，384 | ⏳ 待做 | 样板图里的岩山造型可直接作为方向；skill1 砸地召唤跳尸，skill2 半血后掷巨石砸城墙 |
| 6 | 符咒特效 | 金光、寒冰、烈焰已有半写实光效版；镇山、天雷、青藤还是色块 | ⏳ 待做 | 六种统一按新风格出 |
| 6 | 选卡、HUD | 选卡是红木卡底；血条、Boss 条是代码画的细条 | ⏳ 待做 | 新 UI 框见提示词包第 7 节 |

> 状态说明：✅ 已提交｜🔄 已换进游戏待确认｜⏳ 待做。
> 换图期间新旧风格会同时出现在画面上，属于正常过渡。

> 玩法规则（墙下攻城、动作接入、黑山老妖 skill2）见 `docs/gameplay-design.md` 第 2.3、2.4 节。

## 2. 每个素材的固定流程

按 `/level-art` skill（`.claude/skills/level-art/SKILL.md`）执行。

## 3. 验收标准

- 画风和样板图一致：厚涂、轮廓光、冷暖对比。
- 缩到手机实际尺寸（40–60px）还能认出是哪种怪。
- 图里没有任何文字、乱码、水印。
- 朝向正确：主角背对镜头，妖怪正面朝下走来。
- 序列帧之间大小一致、脚底对齐、循环接得上。

## 4. 做完第一关之后

把第一关的流程原样用到第二关（古寺）：先出古寺背景，再做铜甲尸、水鬼和白骨夫人三相。
