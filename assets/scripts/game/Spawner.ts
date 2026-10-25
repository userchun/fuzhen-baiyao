import { WaveDef } from '../config/GameConfig';

// 按波次配置定时出怪
export class Spawner {
    private t = 0;
    private states: { spawned: number; next: number }[];
    private stopped = false;

    constructor(private waves: WaveDef[], private spawn: (enemyId: string) => void) {
        this.states = waves.map((w) => ({ spawned: 0, next: w.time }));
    }

    /** Boss death / settle：停刷剩余波次（等价剩余 count→0） */
    stop(): void {
        if (this.stopped) return;
        this.stopped = true;
        this.waves.forEach((w, i) => {
            this.states[i].spawned = w.count;
        });
    }

    update(dt: number): void {
        if (this.stopped) return;
        this.t += dt;
        this.waves.forEach((w, i) => {
            const s = this.states[i];
            while (s.spawned < w.count && this.t >= s.next) {
                this.spawn(w.enemy);
                s.spawned++;
                s.next += w.interval;
            }
        });
    }
}
