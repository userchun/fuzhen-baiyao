#!/usr/bin/env bash
# 用项目 imagegen skill 的 Agnes CLI 出一张候选静帧到 art/asf/<char>-takes/
# 真实 CLI：~/.claude/skills/imagegen/scripts/agnes.py（跳过 Magpie）
set -euo pipefail
AGNES="${AGNES:-$HOME/.claude/skills/imagegen/scripts/agnes.py}"

usage() {
  cat <<'U'
用法:
  tools/asf/imagegen-take.sh --char <id> --out-name take.png [--size WxH] [--model MODEL] [--dry-run] -- "<prompt>"

需要环境变量 AGNES_API_KEY（勿把密钥写进仓库）。
可选：AGNES_BASE_URL（默认 https://apihub.agnes-ai.com/v1）、AGNES_IMAGE_MODEL（默认 agnes-image-2.0-flash）。

示例:
  export AGNES_API_KEY=...   # 本机已有密钥时自行 export，不要贴进聊天
  tools/asf/imagegen-take.sh --char daoshi --out-name take.png --size 1024x1024 -- \
    "暗黑国风Q版道士主角，全身侧视朝右，黑发束发，青灰道袍，腰间符袋，手持桃木剑，脚底同高，无文字无水印"
U
  exit 2
}

CHAR=""; OUT_NAME="take.png"; SIZE="1024x1024"; MODEL=""; DRY=""; PROMPT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --char) CHAR=$2; shift 2;;
    --out-name) OUT_NAME=$2; shift 2;;
    --size) SIZE=$2; shift 2;;
    --model) MODEL=$2; shift 2;;
    --dry-run) DRY=1; shift;;
    --) shift; PROMPT=$*; break;;
    -h|--help) usage;;
    *) echo "未知参数: $1"; usage;;
  esac
done
[[ -n "$CHAR" && -n "$PROMPT" ]] || usage
[[ -f "$AGNES" ]] || { echo "找不到 agnes.py: $AGNES"; exit 1; }

DIR="art/asf/${CHAR}-takes"
mkdir -p "$DIR"
OUT="$DIR/$OUT_NAME"
ARGS=(-o "$OUT" --size "$SIZE")
[[ -n "$MODEL" ]] && ARGS+=(--model "$MODEL")
[[ -n "$DRY" ]] && ARGS+=(--dry-run)

echo "Agnes imagegen → $OUT (Magpie skipped)"
exec python3 "$AGNES" "${ARGS[@]}" "$PROMPT"
