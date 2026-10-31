import { _decorator, Component, Node, UITransform, EventTouch, view, ResolutionPolicy, input, Input, sys, screen } from 'cc';
import { GAME, LEVELS, COMBOS, ENEMIES, applyScreen } from './config/GameConfig';
import { Difficulty, HARD_HP_MULT } from './config/MetaConfig';
import { Profile, loadProfile, saveProfile, defaultProfile, defaultLevel, PROFILE_KEY, PROFILE_BAK_KEY, LEGACY_UNLOCK_KEY, buyStat, buyStar, nextRunId, commitSettlement } from './meta/Profile';
import { computeSettlement, metaSnapshot, MetaSnapshot } from './meta/Settlement';
import { StatId } from './config/MetaConfig';
import { TalismanId } from './config/GameConfig';
import { makeNode, rectNode } from './core/Draw';
import { loadArt, spriteNode } from './core/Art';
import { loadAudio, AudioManager } from './core/AudioManager';

const BG_ART = ['bg_level1_village', 'bg_level2_temple']; // 与 LEVELS 下标对应
const BGM_BY_LEVEL = ['village', 'temple'] as const; // 与 LEVELS 下标对应
// 背景图高宽比，与 BG_ART 对应：第一关是暗黑国风俯视荒村 1080×2340（9:19.5）；第二关仍是旧透视图 720×1280
const BG_ART_RATIO = [2340 / 1080, 1280 / 720];
import { SkillSystem } from './game/SkillSystem';
import { Combat } from './game/Combat';
import { Spawner } from './game/Spawner';
import { GameUI } from './game/GameUI';
import { Feedback } from './game/Feedback';
import { HomeUI } from './game/HomeUI';

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
    private audio: AudioManager;
    private state: 'menu' | 'play' | 'pick' | 'over' = 'menu';
    private relayout: (() => void) | null = null;
    private levelIndex = 0;
    private difficulty: Difficulty = 'normal';
    private profile: Profile = loadProfile(sys.localStorage, LEVELS.length);
    private home: HomeUI;
    private bg: Node;
    private time = 0;
    private runId = '';
    private eliteKills = 0;
    private meta: MetaSnapshot;

    onLoad(): void {
        view.setDesignResolutionSize(GAME.width, GAME.height, ResolutionPolicy.FIXED_WIDTH);
        applyScreen(view.getVisibleSize().height);
        const tf = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        tf.setContentSize(GAME.width, GAME.height);

        this.bg = makeNode('bgHolder', this.node);
        this.world = makeNode('world', this.node);
        this.audio = new AudioManager(this.node);
        this.ui = new GameUI(makeNode('ui', this.node), this.audio);
        this.home = new HomeUI(makeNode('homeLayer', this.node), this.audio);
        this.applySettings();

        // 窗口尺寸变化（换机型、拉伸预览窗口）：在主界面时按新高度重排，避免上下留黑边
        // 只监听 canvas-resize 时，窗口变矮后可见高度不会重算，主界面底部会被切掉；
        // 窗口变化时重新套用固定宽度策略，让可见高度跟着窗口走
        const relayout = () => {
            view.setDesignResolutionSize(GAME.width, GAME.height, ResolutionPolicy.FIXED_WIDTH);
            // 战斗中城墙、出怪线已按旧高度摆好，只在主界面重排
            if (this.state !== 'menu') return;
            applyScreen(view.getVisibleSize().height);
            tf.setContentSize(GAME.width, GAME.height);
            this.showMenu(this.home.currentLevel);
        };
        view.on('canvas-resize', relayout);
        screen.on('window-resize', relayout);
        this.relayout = relayout;

        // 2026-10-31 全自动攻击：整屏拖动 = 左右移动（瞄准分支保留但不再进入）
        let mode: 'move' | 'aim' | null = null;
        // 全局监听整屏触摸；UI 坐标原点在左下角，换算成以屏幕中心为原点
        const toLocal = (e: EventTouch) => {
            const loc = e.getUILocation();
            const vis = view.getVisibleSize();
            return { x: loc.x - vis.width / 2, y: loc.y - vis.height / 2 };
        };
        input.on(Input.EventType.TOUCH_START, () => {
            if (this.state !== 'play') return;
            mode = 'move';
        });
        input.on(Input.EventType.TOUCH_MOVE, (e: EventTouch) => {
            if (this.state !== 'play') return;
            if (mode === 'move') {
                this.ui.hideMoveHint();
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
        // 编辑器 Game View 等环境改画布大小时不一定发事件：主界面每帧按画布实际比例核对高度
        if (this.state === 'menu' && this.relayout) {
            const win = screen.windowSize;
            const want = Math.max(1280, Math.round(GAME.width * win.height / win.width));
            if (win.width > 0 && Math.abs(want - GAME.height) > 2) this.relayout();
        }
        this.ui.update(dt);
        this.home.update(dt);
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

    /** 写档；失败时提示并返回 false（内存里的结果保留，下次写档会一起带上） */
    private save(): boolean {
        const ok = saveProfile(sys.localStorage, this.profile, LEVELS.length);
        if (!ok) this.home.showToast('存档写入失败');
        return ok;
    }

    /** 把设置里的开关应用到音频（震屏已去掉，存档里的 shake 字段只为兼容保留） */
    private applySettings(): void {
        this.audio.setMusic(this.profile.settings.music);
        this.audio.setSfx(this.profile.settings.sfx);
    }

    /** 主界面：选关、切难度、出战；右侧入口和设置 */
    private showMenu(level = defaultLevel(this.profile, LEVELS.length)): void {
        this.world.destroyAllChildren();
        this.ui.clearOverlay();
        this.state = 'menu';
        this.syncBgm();
        this.home.show(this.profile, LEVELS, level, {
            onFight: (i, diff) => this.startLevel(i, diff),
            onEntry: (id) => {
                if (id === 'record') this.home.showToast('记录页开发中');
                else this.openUpgrade(id === 'upgrade' ? 'stat' : 'star');
            },
            onSettings: () => this.home.showSettings(
                this.profile,
                () => { this.applySettings(); this.syncBgm(); this.save(); },
                () => this.clearSave(),
            ),
        });
    }

    /** 养成页：买完立即存档；关闭后重画主界面刷新余额和红点 */
    private openUpgrade(tab: 'stat' | 'star'): void {
        this.home.showUpgrade(this.profile, tab, (kind, id) => {
            const ok = kind === 'stat' ? buyStat(this.profile, id as StatId) : buyStar(this.profile, id as TalismanId);
            if (ok) this.save();
            return ok;
        }, () => this.showMenu(this.home.currentLevel));
    }

    /** 清除存档：删掉主档、备份和旧版解锁进度，回到新档 */
    private clearSave(): void {
        [PROFILE_KEY, PROFILE_BAK_KEY, LEGACY_UNLOCK_KEY].forEach((k) => sys.localStorage.removeItem(k));
        this.profile = defaultProfile(LEVELS.length);
        this.applySettings();
        this.showMenu();
        this.home.showToast('存档已清除');
    }

    private startLevel(index: number, diff: Difficulty = this.difficulty): void {
        this.home.hide();
        this.levelIndex = index;
        this.difficulty = diff;
        const level = LEVELS[index];
        this.bg.destroyAllChildren();
        rectNode('bg', GAME.width, GAME.height * 2, level.bg, this.bg);
        // 背景图从屏幕顶边开始、等比盖满整屏（长屏手机裁掉两侧），不再加占位蒙层和等高线
        const ratio = BG_ART_RATIO[index] ?? 1280 / 720;
        const bgH = Math.max(GAME.height, GAME.width * ratio);
        const bgNode = spriteNode(BG_ART[index], bgH / ratio, bgH, this.bg);
        bgNode?.setPosition(0, GAME.height / 2 - bgH / 2);
        this.world.destroyAllChildren();
        this.ui.clearOverlay();
        const bossWave = level.waves.find((w) => ENEMIES[w.enemy]?.boss);
        this.ui.setBoss(bossWave ? ENEMIES[bossWave.enemy].name : '', bossWave?.time ?? 0);
        this.skills = new SkillSystem();
        this.world.setPosition(0, 0);
        const combatLayer = makeNode('combat', this.world);
        const textLayer = makeNode('texts', this.world); // 飘字在战斗层之上
        this.fb = new Feedback(textLayer, this.world);
        this.combat = new Combat(combatLayer, this.skills, this.fb, (e) => {
            if (e.def.elite) this.eliteKills++;
            this.skills.addXp(e.def.xp * this.meta.spiritMult);
        }, this.audio);
        this.combat.hpMult = level.hpMult * (diff === 'hard' ? HARD_HP_MULT : 1);
        // 开局冻结养成快照，本局中途不再变化
        this.meta = metaSnapshot(this.profile, GAME.wallHp);
        this.combat.wallMax = this.meta.wallMax;
        this.combat.wallHp = this.meta.wallMax;
        this.combat.brushMult = this.meta.brushMult;
        this.skills.starMult = this.meta.starMult;
        this.eliteKills = 0;
        this.runId = nextRunId(this.profile);
        this.save();
        this.spawner = new Spawner(level.waves, (id) => this.combat.spawnEnemy(id));
        this.skills.pending = level.startPicks + this.meta.extraPicks;
        this.time = 0;
        this.state = 'play';
        this.syncBgm();
        this.ui.showToast(diff === 'hard' ? `${level.name} · 困难` : level.name);
    }

    private openPick(): void {
        this.state = 'pick';
        this.combat.stopHold();
        this.audio.playSfx('levelup', 0.7);
        this.ui.showPick('灵气充盈 · 择一而修', this.skills.rollOptions(), (opt) => {
            this.skills.pending--;
            // click 由 GameUI 卡牌点击统一播放
            if (opt.type === 'heal') {
                this.combat.wallHp = Math.min(this.combat.wallMax, this.combat.wallHp + 30);
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

        // 先算好奖励（箱子在这里一次抽定），记进存档后再展示；同一 runId 只记一次
        const lv = this.levelIndex;
        const diff = this.difficulty;
        const st = computeSettlement(this.runId, {
            level: lv, diff, result: win ? 'win' : 'lose', time: this.time,
            eliteKills: this.eliteKills, firstClear: !this.profile.cleared[lv]?.[diff],
        });
        commitSettlement(this.profile, st, LEVELS.length);
        const saved = this.save();

        const toMenu = { text: '返回主界面', cb: () => this.showMenu(lv) };
        const toUpgrade = { text: '去养成', cb: () => { this.showMenu(lv); this.openUpgrade('stat'); } };
        let buttons: { text: string; cb: () => void }[];
        if (!win) buttons = [toUpgrade, { text: '再来一局', cb: () => this.startLevel(lv) }, toMenu];
        else if (diff === 'normal' && lv + 1 < LEVELS.length) {
            buttons = [{ text: '下一关', cb: () => this.startLevel(lv + 1, 'normal') }, toUpgrade, toMenu];
        } else buttons = [toMenu, toUpgrade];
        this.ui.showResult(win, this.combat.kills, this.time, buttons, { lines: st.lines, coin: st.coin, paper: st.paper, saved });
        this.ui.setResultTotal(this.profile.coin, this.profile.paper, saved);
    }
}
