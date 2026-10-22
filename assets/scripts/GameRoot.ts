import { _decorator, Component, Node, UITransform, EventTouch, view, ResolutionPolicy, input, Input } from 'cc';
import { GAME, LEVELS, applyScreen } from './config/GameConfig';
import { makeNode, rectNode } from './core/Draw';
import { SkillSystem } from './game/SkillSystem';
import { Combat } from './game/Combat';
import { Spawner } from './game/Spawner';
import { GameUI } from './game/GameUI';
import { Feedback } from './game/Feedback';

const { ccclass } = _decorator;

// 入口组件：挂在 Canvas 下的空节点上即可运行
@ccclass('GameRoot')
export class GameRoot extends Component {
    private world: Node;
    private ui: GameUI;
    private skills: SkillSystem;
    private combat: Combat;
    private spawner: Spawner;
    private fb: Feedback;
    private state: 'menu' | 'play' | 'pick' | 'over' = 'menu';
    private levelIndex = 0;
    private bg: Node;
    private time = 0;

    onLoad(): void {
        view.setDesignResolutionSize(GAME.width, GAME.height, ResolutionPolicy.FIXED_WIDTH);
        applyScreen(view.getVisibleSize().height);
        const tf = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        tf.setContentSize(GAME.width, GAME.height);

        this.bg = makeNode('bgHolder', this.node);
        this.world = makeNode('world', this.node);
        this.ui = new GameUI(makeNode('ui', this.node));

        // 底部区域拖动 = 移动；上方战场按住 = 瞄准并连发
        let mode: 'move' | 'aim' | null = null;
        // 全局监听整屏触摸；UI 坐标原点在左下角，换算成以屏幕中心为原点
        const toLocal = (e: EventTouch) => {
            const loc = e.getUILocation();
            const vis = view.getVisibleSize();
            return { x: loc.x - vis.width / 2, y: loc.y - vis.height / 2 };
        };
        input.on(Input.EventType.TOUCH_START, (e: EventTouch) => {
            if (this.state !== 'play') return;
            const p = toLocal(e);
            mode = p.y < GAME.moveZoneY ? 'move' : 'aim';
            if (mode === 'aim') this.combat.setAim(p.x, p.y, true);
        });
        input.on(Input.EventType.TOUCH_MOVE, (e: EventTouch) => {
            if (this.state !== 'play') return;
            if (mode === 'move') {
                const lim = GAME.width / 2 - 40;
                this.combat.playerX = Math.max(-lim, Math.min(lim, this.combat.playerX + e.getUIDelta().x));
            } else if (mode === 'aim') {
                const p = toLocal(e);
                this.combat.setAim(p.x, p.y, true);
            }
        });
        const release = () => {
            mode = null;
            this.combat?.stopHold();
        };
        input.on(Input.EventType.TOUCH_END, release);
        input.on(Input.EventType.TOUCH_CANCEL, release);

        this.showMenu();
    }

    onDestroy(): void {
        input.off(Input.EventType.TOUCH_START);
        input.off(Input.EventType.TOUCH_MOVE);
        input.off(Input.EventType.TOUCH_END);
        input.off(Input.EventType.TOUCH_CANCEL);
    }

    update(dt: number): void {
        this.ui.update(dt);
        if (this.state !== 'play') return;
        dt = Math.min(dt, 1 / 20);
        this.fb.update(dt);
        // 顿帧：短暂冻结战斗
        if (this.fb.hitStopT > 0) {
            this.fb.hitStopT -= dt;
            return;
        }
        this.time += dt;
        this.spawner.update(dt);
        this.combat.update(dt);
        this.ui.refresh(this.combat, this.skills, this.time);

        if (this.combat.wallHp <= 0) this.end(false);
        else if (this.combat.bossDead) this.end(true);
        else if (this.skills.pending > 0) this.openPick();
    }

    private showMenu(): void {
        this.world.destroyAllChildren();
        this.state = 'menu';
        this.ui.showLevels(LEVELS, (i) => this.startLevel(i));
    }

    private startLevel(index: number): void {
        this.levelIndex = index;
        const level = LEVELS[index];
        this.bg.destroyAllChildren();
        rectNode('bg', GAME.width, GAME.height * 2, level.bg, this.bg);
        this.world.destroyAllChildren();
        this.ui.clearOverlay();
        this.skills = new SkillSystem();
        this.world.setPosition(0, 0);
        const combatLayer = makeNode('combat', this.world);
        const textLayer = makeNode('texts', this.world); // 飘字在战斗层之上
        this.fb = new Feedback(textLayer, this.world);
        this.combat = new Combat(combatLayer, this.skills, this.fb, (e) => this.skills.addXp(e.def.xp));
        this.combat.hpMult = level.hpMult;
        this.spawner = new Spawner(level.waves, (id) => this.combat.spawnEnemy(id));
        this.skills.pending = level.startPicks;
        this.time = 0;
        this.state = 'play';
        this.ui.showToast(level.name);
    }

    private openPick(): void {
        this.state = 'pick';
        this.combat.stopHold();
        this.ui.showPick('灵气充盈 · 择一而修', this.skills.rollOptions(), (opt) => {
            this.skills.pending--;
            if (opt.type === 'heal') {
                this.combat.wallHp = Math.min(GAME.wallHp, this.combat.wallHp + 30);
            } else {
                this.skills.apply(opt).forEach((name) => this.ui.showToast(`五行相生 · ${name}`));
            }
            this.ui.clearOverlay();
            this.state = 'play';
        });
    }

    private end(win: boolean): void {
        this.state = 'over';
        this.combat.stopHold();
        const buttons = [{ text: '再来一局', cb: () => this.startLevel(this.levelIndex) }];
        if (win && this.levelIndex + 1 < LEVELS.length) {
            buttons.unshift({ text: '下一关', cb: () => this.startLevel(this.levelIndex + 1) });
        }
        buttons.push({ text: '返回选关', cb: () => this.showMenu() });
        this.ui.showResult(win, this.combat.kills, this.time, buttons);
    }
}
