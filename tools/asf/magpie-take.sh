#!/usr/bin/env bash
# 已废弃：跳过 Magpie。请改用 tools/asf/imagegen-take.sh（Agnes / imagegen skill）。
echo "magpie-take.sh 已废弃（用户要求跳过 Magpie）。改用: tools/asf/imagegen-take.sh $*" >&2
exec "$(dirname "$0")/imagegen-take.sh" "$@"
