// 本地存档（docs/gameplay-design.md 4.3 节）：一个 JSON 存在 fuzhen.profile，并保留上一份有效存档 fuzhen.profile.bak。
// 只依赖一个 getItem/setItem 接口，不直接引用 cc，方便在 Node 里测试。

import { TalismanId } from '../config/GameConfig';
import { Difficulty, StatId, STAT_UPGRADES, STAR_COSTS, TALISMAN_IDS, FIRST_CLEAR_NORMAL, FIRST_CLEAR_HARD_PAPER } from '../config/MetaConfig';

export interface KV {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export const PROFILE_KEY = 'fuzhen.profile';
export const PROFILE_BAK_KEY = 'fuzhen.profile.bak';
export const LEGACY_UNLOCK_KEY = 'fuzhen.unlockedLevels';

export interface Profile {
    v: 1;
    unlockedLevels: number;
    coin: number;
    paper: number;
    stats: Record<StatId, number>;
    stars: Record<TalismanId, number>;
    cleared: { normal: boolean; hard: boolean }[];
    flags: { metaTutorialDone: boolean };
    settings: { music: boolean; sfx: boolean; shake: boolean };
}

export function defaultProfile(levelCount: number): Profile {
    const stars = {} as Record<TalismanId, number>;
    TALISMAN_IDS.forEach((id) => (stars[id] = 0));
    return {
        v: 1,
        unlockedLevels: 1,
        coin: 0,
        paper: 0,
        stats: { wall: 0, brush: 0, spirit: 0, altar: 0 },
        stars,
        cleared: Array.from({ length: levelCount }, () => ({ normal: false, hard: false })),
        flags: { metaTutorialDone: false },
        settings: { music: true, sfx: true, shake: true },
    };
}

const int = (v: unknown, lo: number, hi: number, d: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : d;
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);

/** 把读到的 JSON 校正成合法存档；不是本版本的存档返回 null */
export function sanitize(raw: unknown, levelCount: number): Profile | null {
    if (!raw || typeof raw !== 'object' || (raw as { v?: unknown }).v !== 1) return null;
    const r = raw as Partial<Profile>;
    const p = defaultProfile(levelCount);
    p.unlockedLevels = int(r.unlockedLevels, 1, levelCount, 1);
    p.coin = int(r.coin, 0, 1e9, 0);
    p.paper = int(r.paper, 0, 1e9, 0);
    (Object.keys(STAT_UPGRADES) as StatId[]).forEach((k) => (p.stats[k] = int(r.stats?.[k], 0, STAT_UPGRADES[k].costs.length, 0)));
    TALISMAN_IDS.forEach((k) => (p.stars[k] = int(r.stars?.[k], 0, STAR_COSTS.length, 0)));
    p.cleared.forEach((c, i) => {
        c.normal = bool(r.cleared?.[i]?.normal, false);
        c.hard = bool(r.cleared?.[i]?.hard, false);
    });
    p.flags.metaTutorialDone = bool(r.flags?.metaTutorialDone, false);
    p.settings.music = bool(r.settings?.music, true);
    p.settings.sfx = bool(r.settings?.sfx, true);
    p.settings.shake = bool(r.settings?.shake, true);
    return p;
}

function parse(kv: KV, key: string, levelCount: number): Profile | null {
    try {
        const s = kv.getItem(key);
        return s ? sanitize(JSON.parse(s), levelCount) : null;
    } catch {
        return null;
    }
}

/** 读档顺序：主档 → 备份 → 旧版只有解锁进度的存档 → 新档。任何错误都不清档 */
export function loadProfile(kv: KV, levelCount: number): Profile {
    const main = parse(kv, PROFILE_KEY, levelCount) ?? parse(kv, PROFILE_BAK_KEY, levelCount);
    if (main) return main;
    const p = defaultProfile(levelCount);
    let legacy = NaN;
    try {
        legacy = parseInt(kv.getItem(LEGACY_UNLOCK_KEY) ?? '', 10);
    } catch { /* 读不到就当新档 */ }
    if (Number.isFinite(legacy)) {
        p.unlockedLevels = Math.max(1, Math.min(levelCount, legacy));
        // 已开放关卡之前的关卡记为普通首通（不补发奖励）
        for (let i = 0; i < p.unlockedLevels - 1; i++) p.cleared[i].normal = true;
    }
    return p;
}

/** 写档：先把当前主档挪到备份，再写主档；失败返回 false，不覆盖唯一有效存档 */
export function saveProfile(kv: KV, p: Profile, levelCount: number): boolean {
    try {
        const cur = kv.getItem(PROFILE_KEY);
        if (cur && parse(kv, PROFILE_KEY, levelCount)) kv.setItem(PROFILE_BAK_KEY, cur);
        kv.setItem(PROFILE_KEY, JSON.stringify(p));
        return true;
    } catch {
        return false;
    }
}

// ---- 主界面用到的查询 ----

/** 这一关这个难度现在能不能打 */
export function canPlay(p: Profile, level: number, diff: Difficulty): boolean {
    if (level >= p.unlockedLevels) return false;
    return diff === 'normal' || p.cleared[level]?.normal === true;
}

/** 主界面箭头最多能切到哪一关：已开放的关卡再多看一个未解锁的 */
export function maxBrowsableLevel(p: Profile, levelCount: number): number {
    return Math.min(levelCount - 1, p.unlockedLevels);
}

/** 进主界面时默认停的关：最高已开放、且普通未通关的关；全通则停最后一关 */
export function defaultLevel(p: Profile, levelCount: number): number {
    const open = Math.min(levelCount, p.unlockedLevels);
    for (let i = 0; i < open; i++) if (!p.cleared[i]?.normal) return i;
    return open - 1;
}

/** 养成红点：有买得起的属性升级 */
export function canAffordUpgrade(p: Profile): boolean {
    return (Object.keys(STAT_UPGRADES) as StatId[]).some((k) => {
        const costs = STAT_UPGRADES[k].costs;
        return p.stats[k] < costs.length && costs[p.stats[k]] <= p.coin;
    });
}

/** 符咒红点：有买得起的升星 */
export function canAffordStar(p: Profile): boolean {
    return TALISMAN_IDS.some((k) => p.stars[k] < STAR_COSTS.length && STAR_COSTS[p.stars[k]] <= p.paper);
}

/** 主界面首通奖励那一行的文字 */
export function firstClearText(p: Profile, level: number, diff: Difficulty): string {
    const done = p.cleared[level]?.[diff];
    if (diff === 'normal') {
        const r = FIRST_CLEAR_NORMAL[level];
        if (!r) return '';
        return done ? '首通奖励 · 已领' : `首通奖励 · 铜钱 ${r.coin} · 符纸 ${r.paper} · ${r.chest}`;
    }
    const paper = FIRST_CLEAR_HARD_PAPER[level];
    if (paper === undefined) return '';
    return done ? '困难首通 · 已领' : `困难首通 · 额外符纸 ${paper} · 收益 ×2`;
}

/** 通关后记录：首通标记、解锁下一关。返回这次是不是首通 */
export function recordClear(p: Profile, level: number, diff: Difficulty, levelCount: number): boolean {
    const c = p.cleared[level];
    if (!c) return false;
    const first = !c[diff];
    c[diff] = true;
    if (diff === 'normal') p.unlockedLevels = Math.max(p.unlockedLevels, Math.min(levelCount, level + 2));
    return first;
}

/** 资源数字：四位以上千分位，超过 99,999 用"万" */
export function formatAmount(n: number): string {
    if (n > 99999) return `${Math.floor(n / 1000) / 10}万`;
    return n.toLocaleString('en-US');
}
