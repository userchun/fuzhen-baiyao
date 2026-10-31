#!/bin/bash
# 把游戏里真实的战斗 / 刷怪 / 选卡逻辑编译成浏览器能跑的 JS，给 index.html 的「试玩」用。
# 改了 assets/scripts 下的逻辑或数值后重新跑一次：bash tools/art-preview/build.sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$DIR/../../assets/scripts"
OUT="$DIR/game"
command -v tsc >/dev/null || { echo "未找到 tsc，请先安装 TypeScript。" >&2; exit 1; }
rm -rf "$OUT" && mkdir -p "$OUT"
TMP="$(mktemp -d)"
cat > "$TMP/tsconfig.json" <<JSON
{ "compilerOptions": { "target": "ES2020", "module": "ESNext", "moduleResolution": "bundler", "skipLibCheck": true,
  "noCheck": true, "rootDir": "$SRC", "outDir": "$OUT" },
  "files": ["$SRC/game/Combat.ts", "$SRC/game/Spawner.ts", "$SRC/game/SkillSystem.ts", "$SRC/game/Feedback.ts", "$SRC/config/GameConfig.ts"] }
JSON
tsc -p "$TMP/tsconfig.json"
rm -rf "$TMP"
# 浏览器 ES 模块的相对路径要带 .js
find "$OUT" -name "*.js" -exec sed -i.bak -E "s#(from '\.[^']*)'#\1.js'#g" {} \; -exec rm -f {}.bak \;
# cc 引擎换成只做数据的替身（和平衡模拟同一份）
cp "$DIR/../../scripts/balance-sim/stub/cc/index.js" "$OUT/cc.js"
echo "已编译到 $OUT"
