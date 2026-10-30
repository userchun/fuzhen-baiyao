// 局外数值：养成价格、符咒星级、首通奖励、难度。规则见 docs/gameplay-design.md 第 3、4、5 节。
// 全部是待验证初稿（🧪），调数值只改这里，调完回写文档。

import { TalismanId } from './GameConfig';

export type Difficulty = 'normal' | 'hard';
export type StatId = 'wall' | 'brush' | 'spirit' | 'altar';

/** 四项属性：每级价格（数组长度即等级上限） */
export const STAT_UPGRADES: Record<StatId, { name: string; costs: number[] }> = {
    wall: { name: '城墙加固', costs: [50, 65, 85, 110, 143] },
    brush: { name: '符笔', costs: [60, 78, 101, 132, 171] },
    spirit: { name: '聚灵', costs: [80, 104, 135, 176, 228] },
    altar: { name: '开坛', costs: [400] },
};

/** 符咒星级：升到第 1/2/3 星的符纸价格 */
export const STAR_COSTS = [3, 6, 10];

export const TALISMAN_IDS: TalismanId[] = ['metal', 'water', 'fire', 'earth', 'thunder', 'wood'];

/** 普通难度首通奖励，下标对应 LEVELS */
export const FIRST_CLEAR_NORMAL = [
    { coin: 100, paper: 5, chest: '银箱' },
    { coin: 150, paper: 8, chest: '金箱' },
];

/** 困难难度首通额外符纸（常规收益另按 ×2 结算） */
export const FIRST_CLEAR_HARD_PAPER = [10, 15];

/** 困难难度：妖怪血量倍率。其余三条规则（精英 +1、Boss 召唤加快、城墙伤害上限 10）待战斗侧实现 */
export const HARD_HP_MULT = 1.5;
