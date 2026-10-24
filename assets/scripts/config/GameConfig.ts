// 游戏全部数值配置。调平衡只改这里。

export type Element = 'metal' | 'wood' | 'water' | 'fire' | 'earth' | 'none';
export type TalismanId = 'metal' | 'wood' | 'water' | 'fire' | 'earth' | 'thunder';

export const GAME = {
    width: 720,
    height: 1280,
    wallY: -440,      // 城墙顶部 y（由 applyScreen 按屏幕高度重算）
    playerY: -470,
    moveZoneY: -350,  // 此线以下拖动移动，以上点按瞄准/攻击
    horizonY: 520,    // 地平线 y（2.5D 纵深最远点，由 applyScreen 按屏幕高度重算）
    wallHp: 100,
    xpBase: 5,        // 第一次升级所需灵气
    xpGrow: 1.3,      // 每级所需灵气倍率
    maxTalismans: 4,  // 最多持有符咒数
};

/** 按实际可见高度重算布局：宽固定 720，高随机型变化，城墙贴底 */
export function applyScreen(visibleHeight: number): void {
    GAME.height = Math.max(1280, Math.round(visibleHeight));
    GAME.wallY = -GAME.height / 2 + 200;
    GAME.playerY = GAME.wallY - 30;
    GAME.moveZoneY = GAME.wallY + 90;
    GAME.horizonY = GAME.height / 2 - 120; // 顶部留 120px 作天空/地平线
}

// ---- 2.5D 俯视纵深（P1：线性投影）----
// depth 0 = 远（地平线/出怪），1 = 近（城墙）
export const DEPTH = {
    farScale: 0.35,   // 地平线处敌人缩放（近处为 1）
};

/** 纵深 → 屏幕 y：0 在地平线，1 在城墙 */
export function depthY(d: number): number {
    return GAME.horizonY + (GAME.wallY - GAME.horizonY) * d;
}

/** 纵深 → 敌人缩放：远处小、近处大 */
export function depthScale(d: number): number {
    return DEPTH.farScale + (1 - DEPTH.farScale) * d;
}

/** 纵深满程（地平线→城墙）的屏幕像素长度，用于把 speed(px/s) 换算成 depth 速率 */
export function lanePixels(): number {
    return GAME.horizonY - GAME.wallY;
}

// 基础攻击（镇妖符）：按住瞄准时射速更快，鼓励手动操作
export const BASE_ATTACK = { damage: 12, holdCd: 0.25, autoCd: 0.7, speed: 1100 };

export const ELEMENT_COLOR: Record<Element, string> = {
    metal: '#F5D76E', wood: '#5FBF6A', water: '#5AB4F0',
    fire: '#F06A4A', earth: '#B08A55', none: '#CCCCCC',
};

// 相克：key 克 value
export const COUNTER: Partial<Record<Element, Element>> = {
    metal: 'wood', wood: 'earth', earth: 'water', water: 'fire', fire: 'metal',
};
export const COUNTER_MULT = 1.5;   // 克制
export const RESIST_MULT = 0.7;    // 被克
export const MIN_HIT_DAMAGE = 1;   // 护甲减免后的最低伤害，保证命中总有反馈

export const ELEMENT_NAME: Record<Element, string> = {
    metal: '金', wood: '木', water: '水', fire: '火', earth: '土', none: '',
};

export type HitTier = 'crit' | 'normal' | 'resist';

/** 攻击属性 vs 目标属性 */
export function elementTier(attack: Element, target: Element): HitTier {
    if (COUNTER[attack] === target) return 'crit';
    if (COUNTER[target] === attack) return 'resist';
    return 'normal';
}

export const TIER_MULT: Record<HitTier, number> = { crit: COUNTER_MULT, normal: 1, resist: RESIST_MULT };

export interface EnemyDef {
    id: string; name: string; char: string; element: Element;
    hp: number; speed: number; radius: number; xp: number;
    damage: number;        // 撞墙伤害；Boss 为抵达城墙后的每秒攻城伤害
    move: 'straight' | 'hop' | 'sine';
    elite?: boolean; boss?: boolean;
    splitInto?: string; splitCount?: number;
    summon?: string; summonCount?: number; summonInterval?: number;
    armor?: number;        // 每次直接命中减免的固定伤害
    dive?: boolean;        // 周期潜水，潜水时无敌
    phases?: Element[];    // Boss 按血量阶段切换属性
}

export const ENEMIES: Record<string, EnemyDef> = {
    paperman: { id: 'paperman', name: '小纸人', char: '纸', element: 'wood', hp: 80, speed: 60, radius: 22, damage: 5, xp: 1, move: 'straight' },
    jiangshi: { id: 'jiangshi', name: '跳尸', char: '尸', element: 'earth', hp: 120, speed: 70, radius: 26, damage: 10, xp: 2, move: 'hop' },
    foxfire: { id: 'foxfire', name: '狐火', char: '狐', element: 'fire', hp: 38, speed: 110, radius: 18, damage: 5, xp: 1, move: 'sine' },
    lantern: {
        id: 'lantern', name: '灯笼鬼', char: '灯', element: 'fire', hp: 700, speed: 40, radius: 36, damage: 20, xp: 10,
        move: 'straight', elite: true, splitInto: 'foxfire', splitCount: 3,
    },
    heishan: {
        id: 'heishan', name: '黑山老妖', char: '山', element: 'earth', hp: 2600, speed: 22, radius: 70, damage: 15, xp: 0,
        move: 'straight', boss: true, summon: 'jiangshi', summonCount: 2, summonInterval: 5,
    },
    // ---- 第二章 · 古寺 ----
    tongjia: { id: 'tongjia', name: '铜甲尸', char: '铜', element: 'metal', hp: 240, speed: 45, radius: 28, damage: 15, xp: 3, move: 'straight', armor: 5 },
    shuigui: { id: 'shuigui', name: '水鬼', char: '水', element: 'water', hp: 80, speed: 80, radius: 22, damage: 8, xp: 2, move: 'straight', dive: true },
    baigu: {
        id: 'baigu', name: '白骨夫人', char: '骨', element: 'metal', hp: 5000, speed: 20, radius: 70, damage: 18, xp: 0,
        move: 'straight', boss: true, summon: 'shuigui', summonCount: 2, summonInterval: 6,
        phases: ['metal', 'water', 'fire'],
    },
};

export interface WaveDef { time: number; enemy: string; count: number; interval: number; }

// 第 1 关：荒村
export const LEVEL1_WAVES: WaveDef[] = [
    { time: 0, enemy: 'paperman', count: 10, interval: 1.0 },
    { time: 15, enemy: 'foxfire', count: 8, interval: 1.2 },
    { time: 25, enemy: 'paperman', count: 30, interval: 0.4 },
    { time: 45, enemy: 'jiangshi', count: 8, interval: 1.5 },
    { time: 60, enemy: 'lantern', count: 1, interval: 0 },
    { time: 70, enemy: 'foxfire', count: 15, interval: 0.6 },
    { time: 85, enemy: 'paperman', count: 45, interval: 0.25 },
    { time: 100, enemy: 'jiangshi', count: 16, interval: 0.6 },
    { time: 110, enemy: 'lantern', count: 2, interval: 8 },
    { time: 130, enemy: 'foxfire', count: 30, interval: 0.3 },
    { time: 150, enemy: 'heishan', count: 1, interval: 0 },
    { time: 155, enemy: 'paperman', count: 60, interval: 0.4 },
];

// 第 2 关：古寺
export const LEVEL2_WAVES: WaveDef[] = [
    { time: 0, enemy: 'paperman', count: 15, interval: 0.6 },
    { time: 10, enemy: 'shuigui', count: 8, interval: 1.0 },
    { time: 25, enemy: 'tongjia', count: 6, interval: 2.0 },
    { time: 35, enemy: 'foxfire', count: 15, interval: 0.5 },
    { time: 50, enemy: 'lantern', count: 2, interval: 5 },
    { time: 60, enemy: 'shuigui', count: 15, interval: 0.6 },
    { time: 75, enemy: 'tongjia', count: 10, interval: 1.2 },
    { time: 90, enemy: 'jiangshi', count: 15, interval: 0.6 },
    { time: 100, enemy: 'lantern', count: 3, interval: 6 },
    { time: 115, enemy: 'paperman', count: 40, interval: 0.25 },
    { time: 130, enemy: 'tongjia', count: 8, interval: 1.0 },
    { time: 130, enemy: 'shuigui', count: 20, interval: 0.4 },
    { time: 150, enemy: 'baigu', count: 1, interval: 0 },
    { time: 160, enemy: 'foxfire', count: 40, interval: 0.5 },
];

export interface LevelDef { name: string; desc: string; bg: string; waves: WaveDef[]; startPicks: number; hpMult: number; }

export const LEVELS: LevelDef[] = [
    { name: '第一关 · 荒村', desc: 'Boss：黑山老妖', bg: '#141428', waves: LEVEL1_WAVES, startPicks: 0, hpMult: 1.0 },
    { name: '第二关 · 古寺', desc: 'Boss：白骨夫人（三相变化）\n新妖：铜甲尸（护甲）、水鬼（潜水无敌）', bg: '#1E1A2B', waves: LEVEL2_WAVES, startPicks: 2, hpMult: 1.2 },
];

/** 本地存档：已解锁关卡数（默认 1，即只开放第一关） */
export const SAVE_KEY_UNLOCKED = 'fuzhen.unlockedLevels';

export interface TalismanDef {
    id: TalismanId; name: string; element: Element;
    cd: number; damage: number; maxLevel: number; desc: string; upgrade: string;
}

export const TALISMANS: Record<TalismanId, TalismanDef> = {
    metal: { id: 'metal', name: '金光符', element: 'metal', cd: 0.6, damage: 12, maxLevel: 5, desc: '直线穿透光束，克木\n与寒冰符相生：天河倒悬', upgrade: '伤害提升，穿透 +1' },
    water: { id: 'water', name: '寒冰符', element: 'water', cd: 1.3, damage: 15, maxLevel: 5, desc: '冰锥弹射并冻结，克火\n与金光符相生：天河倒悬', upgrade: '伤害提升，弹射 +1' },
    fire: { id: 'fire', name: '烈焰符', element: 'fire', cd: 1.8, damage: 22, maxLevel: 5, desc: '火球落地爆炸，克金\n与青藤符相生：焚林燎原', upgrade: '伤害提升，爆炸范围扩大' },
    earth: { id: 'earth', name: '镇山符', element: 'earth', cd: 2.0, damage: 20, maxLevel: 5, desc: '石柱砸地，击退并眩晕，克水', upgrade: '伤害提升，范围扩大' },
    thunder: { id: 'thunder', name: '天雷符', element: 'none', cd: 1.8, damage: 20, maxLevel: 5, desc: '随机落雷，在妖群中连锁弹跳', upgrade: '伤害提升，连锁 +1' },
    wood: { id: 'wood', name: '青藤符', element: 'wood', cd: 3.0, damage: 8, maxLevel: 5, desc: '藤蔓减速并持续伤害，克土\n与烈焰符相生：焚林燎原', upgrade: '伤害提升，范围扩大' },
};

export interface PassiveDef { name: string; desc: string; maxLevel: number; }

export const PASSIVES: Record<string, PassiveDef> = {
    haste: { name: '疾书', desc: '施法速度 +15%', maxLevel: 5 },
    power: { name: '朱砂', desc: '全部伤害 +20%', maxLevel: 5 },
    multi: { name: '分符', desc: '符咒数量 +1', maxLevel: 2 },
    ward: { name: '固元', desc: '结界每秒回复 +1', maxLevel: 3 },
};

/** 符咒成长系数：伤害 = 基础 ×(1+dmgPerLevel×(级−1)) ×(1+dmgPerPower×朱砂级)；冷却 = 基础 ×cdPerLevel^(级−1) ÷(1+speedPerHaste×疾书级) */
export const GROWTH = { dmgPerLevel: 0.35, dmgPerPower: 0.2, cdPerLevel: 0.92, speedPerHaste: 0.15 };

export interface ComboDef { id: string; name: string; desc: string; need: TalismanId[]; level: number; }

// 两个相生符咒都达到 level 级时解锁
export const COMBOS: ComboDef[] = [
    { id: 'burn', name: '焚林燎原', desc: '藤蔓被点燃，伤害 ×3', need: ['wood', 'fire'], level: 3 },
    { id: 'river', name: '天河倒悬', desc: '每 6 秒水龙横扫全屏', need: ['metal', 'water'], level: 3 },
];
export const RIVER_INTERVAL = 6; // 天河倒悬触发间隔（秒），改动时同步 desc
