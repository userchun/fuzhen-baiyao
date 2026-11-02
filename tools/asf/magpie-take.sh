#!/usr/bin/env bash
# 用项目 imagegen skill 的 Magpie CLI 出一张候选仍图到 art/asf/<char>-takes/
# 真实 CLI：~/.claude/skills/imagegen/scripts/magpie.py
set -euo pipefail
MAGPIE="${MAGPIE:-$HOME/.claude/skills/imagegen/scripts/magpie.py}"

usage() {
  cat <<'U'
用法:
  tools/asf/magpie-take.sh --char <id> --out-name take.png [--size WxH] [--background transparent] [--ref path]... -- "<prompt>"

示例:
  tools/asf/magpie-take.sh --char daoshi --out-name take.png --size 1024x1024 --background transparent -- \
    "暗黑国风Q版道士，侧视朝右，全身，黑发束发，青灰道袍，腰间符袋，桃木剑，透明背景，无文字无水印"
U
  exit 2
}

CHAR=""; OUT_NAME="take.png"; SIZE=""; BG=""; REFS=(); PROMPT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --char) CHAR=$2; shift 2;;
    --out-name) OUT_NAME=$2; shift 2;;
    --size) SIZE=$2; shift 2;;
    --background) BG=$2; shift 2;;
    --ref) REFS+=("$2"); shift 2;;
    --) shift; PROMPT=$*; break;;
    -h|--help) usage;;
    *) echo "未知参数: $1"; usage;;
  esac
done
[[ -n "$CHAR" && -n "$PROMPT" ]] || usage
[[ -f "$MAGPIE" ]] || { echo "找不到 magpie.py: $MAGPIE"; exit 1; }

DIR="art/asf/${CHAR}-takes"
mkdir -p "$DIR"
OUT="$DIR/$OUT_NAME"
ARGS=(-o "$OUT")
[[ -n "$SIZE" ]] && ARGS+=(--size "$SIZE")
[[ -n "$BG" ]] && ARGS+=(--background "$BG")
for r in "${REFS[@]:-}"; do [[ -n "$r" ]] && ARGS+=(-r "$r"); done

echo "Magpie → $OUT"
exec python3 "$MAGPIE" "${ARGS[@]}" "$PROMPT"
