import { _decorator, Component, Node, UITransform, EventTouch, view, ResolutionPolicy, input, Input, sys, Graphics } from 'cc';
import { GAME, LEVELS, COMBOS, applyScreen, SAVE_KEY_UNLOCKED } from './config/GameConfig';
import { makeNode, rectNode, hex } from './core/Draw';
import { loadArt, spriteNode } from './core/Art';
import { loadAudio, AudioManager } from './core/AudioManager';

const BG_ART = ['bg_level1_village', 'bg_level2_temple']; // 与 LEVELS 下标对应
const BGM_BY_LEVEL = ['village', 'temple'] as const; // 与 LEVELS 下标对应
const BG_ART_RATIO = 1280 / 720; // W2 pads 720×1280 (9:16); was 2340/1080 for old art
import { SkillSystem } from './game/SkillSystem';
import { Combat } from './game/Combat';
import { Spawner } from './game/Spawner';
import { GameUI } from './game/GameUI';
import { Feedback } from './game/Feedback';

const { ccclass } = _decorator;

/** 读取已解锁关卡数；存档缺失或损坏时只开放第一关 */
function loadUnlocked(): number {
    const n = parseInt(sys.localStorage.getItem(SAVE_KEY_UNLOCKED) ?? '', 10);
    return Number.isFinite(n) ? Math.max(1, Math.min(LEVELS.length, n)) : 1;
}

function saveUnlocked(n: number): void {
    sys.localStorage.setItem(SAVE_KEY_UNLOCKED, String(n));
}

// 入口组件：挂在 Canvas 下的空节点上即可运行
@ccclass('GameRoot')
export class GameRoot extends Component {
    private world: Node;
    private ui: GameUI;
    private skills: SkillSystem;
    private combat: Combat;
    private spawner: Spawner;
    private fb: Feedback;
    private audio: AudioManager;
    private state: 'menu' | 'play' | 'pick' | 'over' = 'menu';
    private levelIndex = 0;
    private unlocked = loadUnlocked();
    private bg: Node;
    private time = 0;

    onLoad(): void {
        view.setDesignResolutionSize(GAME.width, GAME.height, ResolutionPolicy.FIXED_WIDTH);
        applyScreen(view.getVisibleSize().height);
        const tf = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        tf.setContentSize(GAME.width, GAME.height);

        this.bg = makeNode('bgHolder', this.node);
        this.world = makeNode('world', this.node);
        this.audio = new AudioManager(this.node);
        this.ui = new GameUI(makeNode('ui', this.node), this.audio);

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
                // 缓动目标；实位由 Combat.update exp-smooth 追赶
                this.combat.playerTargetX = Math.max(-lim, Math.min(lim, this.combat.playerTargetX + e.getUIDelta().x));
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

        // 先加载美术素材再进菜单；加载失败时各处退回色块绘制
        loadArt().then(() => this.showMenu());
        // 音频异步加载，失败静默（无声音仍可玩）；按当前状态切 BGM
        loadAudio().then(() => this.syncBgm());
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
        // D：Boss death/settle 起手停刷（含 death 动画期间）
        if (this.combat.spawnStopped) this.spawner.stop();
        this.spawner.update(dt);
        this.combat.update(dt);
        this.ui.refresh(this.combat, this.skills, this.time);

        if (this.combat.wallHp <= 0) this.end(false);
        else if (this.combat.bossDead) this.end(true); // bossDead 仅 death onDone / 无帧 fallback 后置位 → 面板不中途弹出
        else if (this.skills.pending > 0) this.openPick();
    }

    /** 菜单播荒村曲；关卡按索引切村/寺 BGM（音频未就绪时静默） */
    private syncBgm(): void {
        if (this.state === 'menu') this.audio.playBgm('village');
        else this.audio.playBgm(BGM_BY_LEVEL[this.levelIndex] ?? 'village');
    }

    private showMenu(): void {
        this.world.destroyAllChildren();
        this.state = 'menu';
        this.syncBgm();
        this.ui.showLevels(LEVELS, this.unlocked, (i) => this.startLevel(i));
    }

    private startLevel(index: number): void {
        this.levelIndex = index;
        const level = LEVELS[index];
        this.bg.destroyAllChildren();
        rectNode('bg', GAME.width, GAME.height * 2, level.bg, this.bg);
        // 背景图按宽度铺满（1080×2340 → 720×1560），纯色底兜住更高的屏幕
        spriteNode(BG_ART[index], GAME.width, GAME.width * BG_ART_RATIO, this.bg);
        this.addGroundDepth(); // 2.5D：地平线 + 纵深等高线（在背景图之上）
        this.world.destroyAllChildren();
        this.ui.clearOverlay();
        this.skills = new SkillSystem();
        this.world.setPosition(0, 0);
        const combatLayer = makeNode('combat', this.world);
        const textLayer = makeNode('texts', this.world); // 飘字在战斗层之上
        this.fb = new Feedback(textLayer, this.world);
        this.combat = new Combat(combatLayer, this.skills, this.fb, (e) => this.skills.addXp(e.def.xp), this.audio);
        this.combat.hpMult = level.hpMult;
        this.spawner = new Spawner(level.waves, (id) => this.combat.spawnEnemy(id));
        this.skills.pending = level.startPicks;
        this.time = 0;
        this.state = 'play';
        this.syncBgm();
        this.ui.showToast(level.name);
    }

    /** 2.5D 纵深地面：地平线 + 半透明地面 + 纵深等高线（P1 占位，后续换透视地面素材） */
    private addGroundDepth(): void {
        const g = makeNode('ground', this.bg).addComponent(Graphics);
        const w = GAME.width;
        const topY = GAME.horizonY;
        const bottomY = GAME.wallY;
        // 地面：地平线以下到城墙的半透明色块
        g.fillColor = hex('#1A1830', 120);
        g.rect(-w / 2, bottomY, w, topY - bottomY);
        g.fill();
        // 纵深等高线：近疏远密，暗示透视
        const lines = 8;
        g.lineWidth = 2;
        for (let i = 1; i <= lines; i++) {
            const d = i / (lines + 1);
            const y = bottomY + (topY - bottomY) * d;
            g.strokeColor = hex('#3A3560', Math.round(60 + 60 * d));
            g.moveTo(-w / 2, y);
            g.lineTo(w / 2, y);
        }
        g.stroke();
        // 地平线
        g.lineWidth = 3;
        g.strokeColor = hex('#6A5FA0', 120);
        g.moveTo(-w / 2, topY);
        g.lineTo(w / 2, topY);
        g.stroke();
    }

    private openPick(): void {
        this.state = 'pick';
        this.combat.stopHold();
        this.audio.playSfx('levelup', 0.7);
        this.ui.showPick('灵气充盈 · 择一而修', this.skills.rollOptions(), (opt) => {
            this.skills.pending--;
            // click 由 GameUI 卡牌点击统一播放
            if (opt.type === 'heal') {
                this.combat.wallHp = Math.min(GAME.wallHp, this.combat.wallHp + 30);
            } else {
                const unlocked = this.skills.apply(opt);
                unlocked.forEach((id) => {
                    const def = COMBOS.find((c) => c.id === id);
                    this.ui.showToast(`五行相生 · ${def ? `${def.name}：${def.desc}` : id}`);
                    // E T1：toast 同帧相生仪式（sfx 含在 playComboSheng）
                    if (id === 'burn' || id === 'river') {
                        this.combat.playComboSheng(id, 0, GAME.wallY + 80);
                    }
                });
            }
            this.ui.clearOverlay();
            this.state = 'play';
        });
    }

    private end(win: boolean): void {
        this.state = 'over';
        this.spawner.stop(); // D：胜/负均停刷
        this.combat.stopHold();
        // D：win 播一次（短金属石）；lose = barrier_crack（CD）；Combat 不再播 win
        this.audio.playSfx(win ? 'win' : 'barrier_crack', 0.9);
        if (win && this.levelIndex + 2 > this.unlocked) {
            this.unlocked = Math.min(LEVELS.length, this.levelIndex + 2);
            saveUnlocked(this.unlocked);
        }
        const buttons = [{ text: '再来一局', cb: () => this.startLevel(this.levelIndex) }];
        if (win && this.levelIndex + 1 < LEVELS.length) {
            buttons.unshift({ text: '下一关', cb: () => this.startLevel(this.levelIndex + 1) });
        }
        buttons.push({ text: '返回选关', cb: () => this.showMenu() });
        this.ui.showResult(win, this.combat.kills, this.time, buttons);
    }
}
