// 把符镇特效配方烘焙成透明精灵表，供 Cocos 当序列帧播放。
// 用法：node tools/fx-bake/bake.mjs [输出目录，默认 art/fx]
// 每种符咒 × 每个等级一张 PNG（每行 8 帧，24 fps），另出 index.json 记录帧尺寸、帧数、锚点。
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const FX = join(ROOT, "docs/evidence/pixelfx");
const OUT = join(ROOT, process.argv[2] ?? "art/fx");
const FPS = 24, COLS = 8;

const core = await import(join(FX, "core/index.js"));
const JOBS = [
  ["seal_bolt", "seal-bolt", [{}]],
  ["gold_pillar", "gold-pillar", null],
  ["vine_zone", "vine-zone", null, { bind: 0 }], // 束缚走命中特效 status_slow，不混进技能特效
  ["ice_burst", "ice-drop", null, { bounce: 0 }], // 弹射由游戏按实际目标飞，命中各自播冻结
  ["fire_burst", "meteor", null],
  ["stone_spike", "stone-pillar", null],
  ["thunder_chain", "thunder", null, { solo: 1 }], // 第一道雷带乌云；连锁由游戏逐个目标播放 thunder_hop
  ["thunder_hop", "thunder", null, { solo: 1, cloud: 0, charge: 0 }],
  ["status", "status", ["hit", "freeze", "burn", "stun", "slow"].map((n, i) => ({ state: i, _name: n }))],
];

// 最小 PNG 编码（RGBA 8 位）
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (b) => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync(OUT, { recursive: true });
const index = { fps: FPS, cols: COLS, note: "origin 为锚点（地面中心）在单帧内的像素坐标；由 tools/fx-bake/bake.mjs 生成，勿手改", sheets: {} };
for (const [id, file, variants, extra = {}] of JOBS) {
  const mod = await import(join(FX, "fx/fuzhen", file + ".js"));
  const [w, h] = mod.meta.size, [ox, oy] = mod.meta.origin, n = Math.round(mod.meta.duration * FPS);
  const vs = variants ?? [1, 2, 3, 4, 5].map((l) => ({ level: l, _name: "lv" + l }));
  for (const v of vs) {
    const name = v._name ? `${id}_${v._name}` : id, rows = Math.ceil(n / COLS);
    const sheet = new Uint8ClampedArray(w * COLS * h * rows * 4), frame = core.createFrame(w, h), img = new Uint8ClampedArray(w * h * 4);
    const fx = core.createFx(mod, { ...mod.meta.options, ...extra, ...v, x: ox, y: oy });
    for (let i = 0; i < n; i++) {
      core.clearFrame(frame); fx.draw(frame); core.composite(frame, img, null);
      const cx = (i % COLS) * w, cy = Math.floor(i / COLS) * h;
      for (let y = 0; y < h; y++) sheet.set(img.subarray(y * w * 4, (y + 1) * w * 4), ((cy + y) * w * COLS + cx) * 4);
      fx.update(1 / FPS);
    }
    writeFileSync(join(OUT, name + ".png"), png(w * COLS, h * rows, sheet));
    index.sheets[name] = { file: name + ".png", frameWidth: w, frameHeight: h, frames: n, origin: [ox, oy], loop: id === "status" };
    console.log(name, `${n} 帧`, `${w * COLS}×${h * rows}`);
  }
}
writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2) + "\n");
