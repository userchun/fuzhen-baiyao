#!/bin/bash
# 数值平衡模拟：把战斗逻辑编译成 JS，用 cc 桩在 Node 里批量跑关卡
# 用法：bash scripts/balance-sim/run.sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$DIR/../../assets/scripts"
rm -rf "$DIR/out" "$DIR/node_modules"
mkdir -p "$DIR/node_modules" && cp -r "$DIR/stub/cc" "$DIR/node_modules/cc"
TSC="$(command -v tsc || true)"
if [ -z "$TSC" ]; then
  echo "未找到 tsc；请先配置本地 TypeScript 编译器。" >&2
  exit 1
fi
cat > "$DIR/tsconfig.sim.json" <<JSON
{ "compilerOptions": { "target": "ES2020", "module": "ESNext", "moduleResolution": "bundler", "skipLibCheck": true,
  "noCheck": true, "rootDir": "$SRC", "outDir": "$DIR/out" },
  "files": ["$SRC/game/Combat.ts", "$SRC/game/Spawner.ts", "$SRC/meta/Settlement.ts", "$SRC/meta/Profile.ts"] }
JSON
$TSC -p "$DIR/tsconfig.sim.json"
echo '{"type":"module"}' > "$DIR/out/package.json"
find "$DIR/out" -name "*.js" -exec sed -i.bak -E "s#(from '\.[^']*)'#\1.js'#g" {} \; -exec rm -f {}.bak \;
cd "$DIR"
node test-siege.mjs
node test-settlement.mjs
node sim.mjs
