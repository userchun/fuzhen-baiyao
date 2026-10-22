import { TALISMANS, PASSIVES, COMBOS, GAME, TalismanId } from '../config/GameConfig';

export interface TalismanState { level: number; cdT: number; }

export interface Option {
    type: 'talisman' | 'passive' | 'heal';
    id: string;
    title: string;
    desc: string;
}

// 局内成长：灵气、等级、符咒、心法、五行合击
export class SkillSystem {
    talismans = new Map<TalismanId, TalismanState>();
    passives = new Map<string, number>();
    combos = new Set<string>();
    level = 1;
    xp = 0;
    xpNeed = GAME.xpBase;
    pending = 0; // 待选择的升级次数

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
        return TALISMANS[id].damage * (1 + 0.35 * (lv - 1)) * (1 + 0.2 * this.passive('power'));
    }

    cooldown(id: TalismanId): number {
        const lv = Math.max(1, this.talismanLevel(id));
        return TALISMANS[id].cd * Math.pow(0.92, lv - 1) / (1 + 0.15 * this.passive('haste'));
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
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const picked = pool.slice(0, n);
        if (picked.length === 0) picked.push({ type: 'heal', id: 'heal', title: '灵气回体', desc: '结界值回复 30' });
        return picked;
    }

    /** 应用选项，返回本次新解锁的合击技名称 */
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
                unlocked.push(`${c.name}：${c.desc}`);
            }
        }
        return unlocked;
    }
}
