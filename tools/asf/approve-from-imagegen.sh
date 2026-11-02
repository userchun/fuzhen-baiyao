#!/usr/bin/env bash
# 把 Magpie /imagegen 产出的定稿 PNG 收成 ASF master（master.png + master.json）。
# 真实 CLI：master_still.py approve --still ... --route external（默认 external = 外部工具出图）
set -euo pipefail
ASF_ROOT="${ASF_ROOT:-$HOME/Tools/agent-sprite-forge}"
MASTER_STILL="$ASF_ROOT/skills/generate2dsprite/scripts/master_still.py"

usage() {
  cat <<'U'
用法:
  tools/asf/approve-from-imagegen.sh \
    --still art/asf/<char>-takes/take.png \
    --name <id> \
    --output-dir art/asf/<char>-master \
    [--subject "..."] [--identity "..."] [--class hero|mob|boss|prop] \
    [--facing right|left|front|back|none] [--finish hd|pixel] [--key "#FF00FF"]

示例（道士侧视 master）:
  tools/asf/approve-from-imagegen.sh \
    --still art/asf/daoshi-takes/take.png \
    --name daoshi \
    --subject "符镇百妖道士主角，全身侧视" \
    --identity "黑发束发、青灰道袍、腰间符袋、手持桃木剑，暗黑国风Q版" \
    --class hero --facing right \
    --output-dir art/asf/daoshi-master
U
  exit 2
}

STILL=""; NAME=""; OUT=""; SUBJECT=""; IDENTITY=""; CLASS="hero"; FACING="right"; FINISH="hd"; KEY="#FF00FF"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --still) STILL=$2; shift 2;;
    --name) NAME=$2; shift 2;;
    --output-dir) OUT=$2; shift 2;;
    --subject) SUBJECT=$2; shift 2;;
    --identity) IDENTITY=$2; shift 2;;
    --class) CLASS=$2; shift 2;;
    --facing) FACING=$2; shift 2;;
    --finish) FINISH=$2; shift 2;;
    --key) KEY=$2; shift 2;;
    -h|--help) usage;;
    *) echo "未知参数: $1"; usage;;
  esac
done
[[ -n "$STILL" && -n "$NAME" && -n "$OUT" ]] || usage
[[ -f "$STILL" ]] || { echo "找不到 still: $STILL"; exit 1; }
[[ -f "$MASTER_STILL" ]] || { echo "找不到 ASF master_still.py: $MASTER_STILL"; exit 1; }

ARGS=(approve --still "$STILL" --route external --name "$NAME" --class "$CLASS" --facing "$FACING" --finish "$FINISH" --key "$KEY" --output-dir "$OUT")
[[ -n "$SUBJECT" ]] && ARGS+=(--subject "$SUBJECT")
[[ -n "$IDENTITY" ]] && ARGS+=(--identity "$IDENTITY")

exec python3 "$MASTER_STILL" "${ARGS[@]}"
