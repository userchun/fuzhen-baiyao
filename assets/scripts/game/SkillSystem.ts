import { TALISMANS, PASSIVES, COMBOS, GAME, GROWTH, TalismanId } from '../config/GameConfig';

export interface TalismanState { level: number; cdT: number; }

export interface Option {
    type: 'talisman' | 'passive' | 'heal';
    id: string;
    title: string;
    desc: string;
}

// 局内成长：灵气、等级、符咒、心法、五行合击
export class SkillSystem {
    /** 六符主动 id（T6 保底判定） */
    private static readonly ACTIVE_TALISMAN_IDS = new Set<string>([
        'metal', 'wood', 'water', 'fire', 'earth', 'thunder',
    ]);

    talismans = new Map<TalismanId, TalismanState>();
    passives = new Map<string, number>();
    combos = new Set<string>();
    level = 1;
    xp = 0;
    xpNeed = GAME.xpBase;
    pending = 0; // 待选择的升级次数
    /** 本局第几次打开三选（含 L2 startPicks），从 0；T6 前两次保底用 */
    pickIndex = 0;

    /** @param rng 随机源，测试时注入固定序列保证确定性 */
    constructor(private rng: () => number = Math.random) {}

    private isActiveTalisman(opt: Option): boolean {
        return opt.type === 'talisman' && SkillSystem.ACTIVE_TALISMAN_IDS.has(opt.id);
    }

    addXp(v: number): void {
        this.xp += v;
        while (this.xp >= this.xpNeed) {
            this.xp -= this.xpNeed;
            this.level++;
            this.pending++;
            this.xpNeed = Math.round(this.xpNeed * GAME.xpGrow);
        }
    }

    passive(id: string): number {
        return this.passives.get(id) ?? 0;
    }

    get extra(): number { return this.passive('multi'); }
    get regen(): number { return this.passive('ward'); }

    talismanLevel(id: TalismanId): number {
        return this.talismans.get(id)?.level ?? 0;
    }

    damage(id: TalismanId): number {
        const lv = Math.max(1, this.talismanLevel(id));
        return TALISMANS[id].damage * (1 + GROWTH.dmgPerLevel * (lv - 1)) * (1 + GROWTH.dmgPerPower * this.passive('power'));
    }

    cooldown(id: TalismanId): number {
        const lv = Math.max(1, this.talismanLevel(id));
        return TALISMANS[id].cd * Math.pow(GROWTH.cdPerLevel, lv - 1) / (1 + GROWTH.speedPerHaste * this.passive('haste'));
    }

    rollOptions(n = 3): Option[] {
        const pool: Option[] = [];
        (Object.keys(TALISMANS) as TalismanId[]).forEach((id) => {
            const d = TALISMANS[id];
            const st = this.talismans.get(id);
            if (!st) {
                if (this.talismans.size < GAME.maxTalismans) {
                    pool.push({ type: 'talisman', id, title: `${d.name}（新）`, desc: d.desc });
                }
            } else if (st.level < d.maxLevel) {
                pool.push({ type: 'talisman', id, title: `${d.name} Lv${st.level + 1}`, desc: d.upgrade });
            }
        });
        Object.keys(PASSIVES).forEach((id) => {
            const d = PASSIVES[id];
            const lv = this.passive(id);
            if (lv < d.maxLevel) pool.push({ type: 'passive', id, title: `${d.name} Lv${lv + 1}`, desc: d.desc });
        });
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const picked = pool.slice(0, n);
        if (picked.length === 0) picked.push({ type: 'heal', id: 'heal', title: '灵气回体', desc: '结界值回复 30' });

        // T6：前 2 次三选（pickIndex 0/1）保底 ≥1 主动符；≥2 同现网
        const idx = this.pickIndex++;
        if (idx >= 2) return picked;
        if (picked.some((o) => this.isActiveTalisman(o))) return picked;

        const t = pool.slice(n).find((o) => this.isActiveTalisman(o));
        if (!t) return picked; // 池枯竭：跳过保底

        const nonActiveIdxs: number[] = [];
        for (let i = 0; i < picked.length; i++) {
            if (!this.isActiveTalisman(picked[i])) nonActiveIdxs.push(i);
        }
        if (nonActiveIdxs.length === 0) {
            if (picked.length < n) picked.push(t);
        } else {
            const ri = nonActiveIdxs[Math.floor(this.rng() * nonActiveIdxs.length)];
            picked[ri] = t;
        }
        return picked;
    }

    /** 应用选项，返回本次新解锁的合击 id（burn/river）；展示名由调用方查 COMBOS */
    apply(opt: Option): string[] {
        if (opt.type === 'talisman') {
            const id = opt.id as TalismanId;
            const st = this.talismans.get(id);
            if (st) st.level++;
            else this.talismans.set(id, { level: 1, cdT: 0 });
        } else if (opt.type === 'passive') {
            this.passives.set(opt.id, this.passive(opt.id) + 1);
        }
        return this.checkCombos();
    }

    private checkCombos(): string[] {
        const unlocked: string[] = [];
        for (const c of COMBOS) {
            if (this.combos.has(c.id)) continue;
            if (c.need.every((id) => this.talismanLevel(id) >= c.level)) {
                this.combos.add(c.id);
                unlocked.push(c.id);
            }
        }
        return unlocked;
    }
}
