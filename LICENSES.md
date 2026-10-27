# 素材来源与授权

完整的逐项清单见 `design/art/asset-manifest.json`（每项都有 `source` / `license` 字段）。本文件按来源汇总。

> ⚠️ 上架或收费发布前，必须先把下面「待核实」的条目全部确认。

| 来源 | 范围 | 数量 | 授权 / 商用 | 状态 |
|---|---|---|---|---|
| AI 出图（平台待核实：即梦 / LiblibAI / 魔搭等） | `assets/resources/textures/` 下全部贴图和帧动画 | 119 项 | 取决于出图平台的用户协议；所用 LoRA 另有单独授权 | ⚠️ 待核实：补上每批图的平台和出图日期 |
| 程序生成：`tools/asset-pipeline/gen_audio.py` | 2 首 BGM（village / temple）、26 个音效 / 环境音 | 28 项 | 自有，可商用 | ✅ |
| 来源不明的音频 | `baigu_*`（5）、`heishan_*`（2）、`barrier_crack`、`combo_sheng`、`jiangshi_presence`、`lantern_split` 等 | 13 项 | 未知 | ⚠️ 待核实：补上来源；不能确认的就重新生成替换 |
| 第三方 CC0（Kenney 等） | 暂无 | 0 | CC0，无需署名 | — |

## 规则
- 新素材入库时，同步在 manifest 里填 `source` 和 `license`。
- CC-BY 素材要在游戏内署名；CC-BY-SA、GPL 素材不要用。
- 不用他人立绘或 IP 角色作参考图生成可售卖素材。
