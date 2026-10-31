// 结算发奖与养成加成（docs/gameplay-design.md 第 3.2、3.3、4.1 节）。
// 纯计算，不依赖 cc，方便在 Node 里测试。

import { TalismanId } from '../config/GameConfig';
import {
    Difficulty, ChestTier, CHESTS, REWARD, STAT_EFFECT, FIRST_CLEAR_NORMAL, FIRST_CLEAR_HARD_PAPER, TALISMAN_IDS,
} from '../config/MetaConfig';
import { Profile } from './Profile';

export type RunResult = 'win' | 'lose' | 'quit';

export interface SettleInput {
    level: number;
    diff: Difficulty;
    result: RunResult;
    time: number;        // 活动秒数
    eliteKills: number;  // 实际击杀的精英数
    firstClear: boolean; // 这一关这个难度此前没通过（只在胜利时有意义）
}

export interface ChestRoll { tier: ChestTier; coin: number; paper: number; }

/** 结算页逐行展示的明细；所有行加起来等于 coin / paper */
export interface SettleLine { text: string; coin: number; paper: number; }

export interface Settlement {
    runId: string;
    level: number;
    diff: Difficulty;
    result: RunResult;
    time: number;
    first: boolean;
    coin: number;
    paper: number;
    chests: ChestRoll[];
    lines: SettleLine[];
}

const randInt = (lo: number, hi: number, rng: () => number) => lo + Math.floor(rng() * (hi - lo + 1));

export function rollChest(tier: ChestTier, rng: () => number): ChestRoll {
    const c = CHESTS[tier];
    return { tier, coin: randInt(c.coin[0], c.coin[1], rng), paper: randInt(c.paper[0], c.paper[1], rng) };
}

/** 按第 3.2 节结果矩阵算奖励。箱子在这里一次抽好，之后只展示、不再重抽 */
export function computeSettlement(runId: string, inp: SettleInput, rng: () => number = Math.random): Settlement {
    const { level, diff, result } = inp;
    const M = diff === 'hard' ? REWARD.hardMult : 1;
    const win = result === 'win';
    const first = win && inp.firstClear;
    const lines: SettleLine[] = [];
    const chests: ChestRoll[] = [];

    // 基础收益
    let baseCoin: number;
    let basePaper = 0;
    if (win) {
        const normalFirst = first && diff === 'normal';
        baseCoin = normalFirst ? FIRST_CLEAR_NORMAL[level].coin : REWARD.repeatCoin[level];
        basePaper = normalFirst ? 0 : REWARD.repeatPaper[level];
    } else {
        baseCoin = Math.min(REWARD.failStep * Math.floor(inp.time / 10), REWARD.failCap[level]);
    }
    lines.push({ text: win ? '通关奖励' : `坚守 ${Math.floor(inp.time)} 秒`, coin: baseCoin * M, paper: basePaper * M });

    // 精英与铜箱：主动退出不发
    if (result !== 'quit' && inp.eliteKills > 0) {
        let c = REWARD.eliteCoin * inp.eliteKills;
        let p = 0;
        for (let i = 0; i < inp.eliteKills; i++) {
            const ch = rollChest('铜箱', rng);
            chests.push(ch);
            c += ch.coin;
            p += ch.paper;
        }
        lines.push({ text: `精英 ×${inp.eliteKills} · 铜箱 ×${inp.eliteKills}`, coin: c * M, paper: p * M });
    }

    // 首通额外项，不乘倍率
    if (first) {
        if (diff === 'normal') {
            const r = FIRST_CLEAR_NORMAL[level];
            const ch = rollChest(r.chest, rng);
            chests.push(ch);
            lines.push({ text: `首通 · ${r.chest}`, coin: ch.coin, paper: r.paper + ch.paper });
        } else {
            lines.push({ text: '困难首通', coin: 0, paper: FIRST_CLEAR_HARD_PAPER[level] });
        }
    }

    const coin = lines.reduce((s, l) => s + l.coin, 0);
    const paper = lines.reduce((s, l) => s + l.paper, 0);
    return { runId, level, diff, result, time: inp.time, first, coin, paper, chests, lines };
}

/** 开局冻结的养成快照：局内只读这份，不受中途购买影响 */
export interface MetaSnapshot {
    wallMax: number;
    brushMult: number;
    spiritMult: number;
    extraPicks: number;
    starMult: Record<TalismanId, number>;
}

export function metaSnapshot(p: Profile, baseWall: number): MetaSnapshot {
    const starMult = {} as Record<TalismanId, number>;
    TALISMAN_IDS.forEach((id) => (starMult[id] = 1 + STAT_EFFECT.starPerLv * (p.stars[id] ?? 0)));
    return {
        wallMax: baseWall + STAT_EFFECT.wallPerLv * p.stats.wall,
        brushMult: 1 + STAT_EFFECT.brushPerLv * p.stats.brush,
        spiritMult: 1 + STAT_EFFECT.spiritPerLv * p.stats.spirit,
        extraPicks: STAT_EFFECT.altarPerLv * p.stats.altar,
        starMult,
    };
}
