import {
	createSystem,
	World,
	InputComponent,
	UIKitMLAsset,
	Vector3,
	MathUtils,
	AmbientLight,
	PointLight,
	DirectionalLight,
	Color,
	FogExp2,
} from '@iwsdk/core';

import {
	createPlayerShip,
	createEnemyShip,
	createCannonball,
	createTreasure,
	createExplosion,
	createOceanPlane,
	createSeaMine,
	createWaterSplash,
	createStarfield,
	getScheme,
	COLOR_SCHEMES,
	EnemyType,
} from './geometry.js';

import {
	playCannonFire,
	playExplosion,
	playEnemyFire,
	playTreasureCollect,
	playSplash,
	playHit,
	playShipSink,
	playWaveComplete,
	playGameOver,
	playMenuSelect,
	playUpgrade,
	playMineExplode,
	playCombo,
	startMusic,
	stopMusic,
	setBPM,
} from './audio.js';

// Game states
const STATE_MENU = 0;
const STATE_PLAYING = 1;
const STATE_WAVE_CLEAR = 2;
const STATE_SHOP = 3;
const STATE_GAME_OVER = 4;
const STATE_PAUSED = 5;

// Difficulty levels
const DIFF_EASY = 0;
const DIFF_NORMAL = 1;
const DIFF_HARD = 2;

interface EnemyData {
	entity: any;
	group: any;
	hp: number;
	maxHp: number;
	speed: number;
	damage: number;
	fireRate: number;
	lastFireTime: number;
	shipType: EnemyType;
	angle: number;
	distance: number;
	engageRange: number;
	scoreValue: number;
	isSinking: boolean;
	sinkTimer: number;
}

interface CannonballData {
	entity: any;
	mesh: any;
	vx: number;
	vy: number;
	vz: number;
	damage: number;
	isEnemy: boolean;
	lifetime: number;
	maxLifetime: number;
}

interface TreasureData {
	entity: any;
	group: any;
	value: number;
	bobPhase: number;
	lifetime: number;
	px: number;
	pz: number;
}

interface ExplosionData {
	entity: any;
	group: any;
	timer: number;
	maxTime: number;
}

interface MineData {
	entity: any;
	group: any;
	px: number;
	pz: number;
	bobPhase: number;
}

// Stats stored in localStorage
interface CareerStats {
	totalGames: number;
	totalKills: number;
	totalGoldEarned: number;
	totalWavesCompleted: number;
	highScore: number;
	bestWave: number;
	totalCannonsFired: number;
	totalTreasureCollected: number;
	bossesDefeated: number;
	minesDestroyed: number;
}

function loadStats(): CareerStats {
	try {
		const s = localStorage.getItem('neon-pirate-stats');
		if (s) return JSON.parse(s);
	} catch { }
	return {
		totalGames: 0, totalKills: 0, totalGoldEarned: 0,
		totalWavesCompleted: 0, highScore: 0, bestWave: 0,
		totalCannonsFired: 0, totalTreasureCollected: 0,
		bossesDefeated: 0, minesDestroyed: 0,
	};
}

function saveStats(s: CareerStats) {
	try { localStorage.setItem('neon-pirate-stats', JSON.stringify(s)); } catch { }
}

function loadSettings(): { difficulty: number; volume: number; colorScheme: number } {
	try {
		const s = localStorage.getItem('neon-pirate-settings');
		if (s) return JSON.parse(s);
	} catch { }
	return { difficulty: DIFF_NORMAL, volume: 0.7, colorScheme: 0 };
}

function saveSettings(s: { difficulty: number; volume: number; colorScheme: number }) {
	try { localStorage.setItem('neon-pirate-settings', JSON.stringify(s)); } catch { }
}

function loadHighScores(): { score: number; wave: number; kills: number }[] {
	try {
		const s = localStorage.getItem('neon-pirate-highscores');
		if (s) return JSON.parse(s);
	} catch { }
	return [];
}

function saveHighScores(scores: { score: number; wave: number; kills: number }[]) {
	try { localStorage.setItem('neon-pirate-highscores', JSON.stringify(scores)); } catch { }
}

export class GameSystem extends createSystem({}) {
	private state = STATE_MENU;
	private wave = 1;
	private score = 0;
	private playerHp = 100;
	private playerMaxHp = 100;
	private playerGold = 0;
	private cannonDamage = 20;
	private cannonRange = 40;
	private fireRate = 1.0;
	private playerSpeed = 3;
	private cannonLevel = 1;
	private hullLevel = 1;
	private speedLevel = 1;
	private lastFireTime = 0;
	private time = 0;

	// Wave management
	private enemiesRemaining = 0;
	private enemiesSpawned = 0;
	private enemiesTotal = 0;
	private spawnTimer = 0;
	private waveTimer = 0;
	private waveClearTimer = 0;

	// Entities
	private enemies: EnemyData[] = [];
	private cannonballs: CannonballData[] = [];
	private treasures: TreasureData[] = [];
	private explosions: ExplosionData[] = [];
	private mines: MineData[] = [];

	// Player ship
	private playerShipGroup: any = null;
	private playerShipEntity: any = null;
	private playerAngle = 0;

	// Ocean
	private oceanMesh: any = null;
	private oceanEntity: any = null;
	private starfieldGroup: any = null;

	// Aiming
	private aimAngleH = 0;
	private aimAngleV = 0;
	private aimIndicator: any = null;

	// UI panels
	private menuPanel: UIKitMLAsset | undefined = undefined;
	private hudPanel: UIKitMLAsset | undefined = undefined;
	private pausePanel: UIKitMLAsset | undefined = undefined;
	private resultsPanel: UIKitMLAsset | undefined = undefined;
	private settingsPanel: UIKitMLAsset | undefined = undefined;
	private statsPanel: UIKitMLAsset | undefined = undefined;
	private shopPanel: UIKitMLAsset | undefined = undefined;

	// Settings
	private difficulty = DIFF_NORMAL;
	private volume = 0.7;
	private colorScheme = 0;

	// Stats
	private stats: CareerStats = loadStats();
	private sessionKills = 0;
	private sessionCannonsFired = 0;
	private sessionTreasure = 0;
	private combo = 0;
	private comboTimer = 0;

	// Keyboard
	private keys: Set<string> = new Set();
	private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
	private keyupHandler: ((e: KeyboardEvent) => void) | null = null;
	private prevPauseKey = false;

	// Screen shake
	private shakeIntensity = 0;
	private shakeDecay = 5;

	// Boss tracking
	private bossActive = false;

	init() {
		const settings = loadSettings();
		this.difficulty = settings.difficulty;
		this.volume = settings.volume;
		this.colorScheme = settings.colorScheme;

		this.setupScene();
		this.setupInput();
		this.setupPanels();
		this.showPanel('menu');
	}

	private setupScene() {
		const scheme = getScheme(this.colorScheme);

		// Fog
		this.world.scene.fog = new FogExp2(scheme.water, 0.008);
		this.world.scene.background = new Color(scheme.water);

		// Lights
		const ambient = new AmbientLight(0x334455, 0.4);
		this.world.scene.add(ambient);

		const dirLight = new DirectionalLight(new Color(scheme.primary), 0.3);
		dirLight.position.set(20, 30, -10);
		this.world.scene.add(dirLight);

		// Moon/Sun
		const moonLight = new PointLight(new Color('#aabbff'), 0.5, 200);
		moonLight.position.set(-50, 60, -80);
		this.world.scene.add(moonLight);

		// Ocean
		const oceanPlane = createOceanPlane(scheme);
		this.oceanMesh = oceanPlane;
		this.oceanEntity = this.world.createTransformEntity(oceanPlane);

		// Starfield
		this.starfieldGroup = createStarfield();
		this.world.scene.add(this.starfieldGroup);

		// Player ship
		this.spawnPlayerShip();
	}

	private createAimIndicator(_scheme: typeof COLOR_SCHEMES[0]) {
		// Aim indicator is handled by the cannon firing direction
	}

	private spawnPlayerShip() {
		const scheme = getScheme(this.colorScheme);
		if (this.playerShipGroup) {
			this.playerShipGroup.removeFromParent();
		}
		this.playerShipGroup = createPlayerShip(scheme);
		this.playerShipEntity = this.world.createTransformEntity(this.playerShipGroup);
		this.playerShipGroup.position.set(0, 0, 0);
	}

	private setupInput() {
		this.keydownHandler = (e: KeyboardEvent) => {
			this.keys.add(e.key.toLowerCase());
		};
		this.keyupHandler = (e: KeyboardEvent) => {
			this.keys.delete(e.key.toLowerCase());
		};
		document.addEventListener('keydown', this.keydownHandler);
		document.addEventListener('keyup', this.keyupHandler);
	}

	private setupPanels() {
		this.menuPanel = this.world.getSceneObject<UIKitMLAsset>('menu-panel');
		this.hudPanel = this.world.getSceneObject<UIKitMLAsset>('hud-panel');
		this.pausePanel = this.world.getSceneObject<UIKitMLAsset>('pause-panel');
		this.resultsPanel = this.world.getSceneObject<UIKitMLAsset>('results-panel');
		this.settingsPanel = this.world.getSceneObject<UIKitMLAsset>('settings-panel');
		this.statsPanel = this.world.getSceneObject<UIKitMLAsset>('stats-panel');
		this.shopPanel = this.world.getSceneObject<UIKitMLAsset>('shop-panel');

		// Wire menu buttons
		this.menuPanel?.getElementById('btn-play')?.addEventListener('click', () => {
			playMenuSelect(this.volume);
			this.startGame();
		});
		this.menuPanel?.getElementById('btn-settings')?.addEventListener('click', () => {
			playMenuSelect(this.volume);
			this.showPanel('settings');
		});
		this.menuPanel?.getElementById('btn-stats')?.addEventListener('click', () => {
			playMenuSelect(this.volume);
			this.updateStatsPanel();
			this.showPanel('stats');
		});

		// Settings buttons
		this.settingsPanel?.getElementById('btn-diff-easy')?.addEventListener('click', () => {
			this.difficulty = DIFF_EASY;
			this.updateSettingsDisplay();
			playMenuSelect(this.volume);
		});
		this.settingsPanel?.getElementById('btn-diff-normal')?.addEventListener('click', () => {
			this.difficulty = DIFF_NORMAL;
			this.updateSettingsDisplay();
			playMenuSelect(this.volume);
		});
		this.settingsPanel?.getElementById('btn-diff-hard')?.addEventListener('click', () => {
			this.difficulty = DIFF_HARD;
			this.updateSettingsDisplay();
			playMenuSelect(this.volume);
		});
		this.settingsPanel?.getElementById('btn-vol-down')?.addEventListener('click', () => {
			this.volume = Math.max(0, this.volume - 0.1);
			this.updateSettingsDisplay();
			playMenuSelect(this.volume);
		});
		this.settingsPanel?.getElementById('btn-vol-up')?.addEventListener('click', () => {
			this.volume = Math.min(1, this.volume + 0.1);
			this.updateSettingsDisplay();
			playMenuSelect(this.volume);
		});
		this.settingsPanel?.getElementById('btn-color')?.addEventListener('click', () => {
			this.colorScheme = (this.colorScheme + 1) % COLOR_SCHEMES.length;
			this.updateSettingsDisplay();
			playMenuSelect(this.volume);
		});
		this.settingsPanel?.getElementById('btn-settings-back')?.addEventListener('click', () => {
			saveSettings({ difficulty: this.difficulty, volume: this.volume, colorScheme: this.colorScheme });
			playMenuSelect(this.volume);
			if (this.state === STATE_PAUSED) {
				this.showPanel('pause');
			} else {
				this.showPanel('menu');
			}
		});

		// Pause buttons
		this.pausePanel?.getElementById('btn-resume')?.addEventListener('click', () => {
			playMenuSelect(this.volume);
			this.resumeGame();
		});
		this.pausePanel?.getElementById('btn-pause-settings')?.addEventListener('click', () => {
			playMenuSelect(this.volume);
			this.showPanel('settings');
		});
		this.pausePanel?.getElementById('btn-quit')?.addEventListener('click', () => {
			playMenuSelect(this.volume);
			this.endGame();
		});

		// Results buttons
		this.resultsPanel?.getElementById('btn-retry')?.addEventListener('click', () => {
			playMenuSelect(this.volume);
			this.startGame();
		});
		this.resultsPanel?.getElementById('btn-results-menu')?.addEventListener('click', () => {
			playMenuSelect(this.volume);
			this.showPanel('menu');
			this.state = STATE_MENU;
		});

		// Stats back
		this.statsPanel?.getElementById('btn-stats-back')?.addEventListener('click', () => {
			playMenuSelect(this.volume);
			this.showPanel('menu');
		});

		// Shop buttons
		this.shopPanel?.getElementById('btn-upgrade-cannons')?.addEventListener('click', () => {
			this.buyUpgrade('cannon');
		});
		this.shopPanel?.getElementById('btn-upgrade-hull')?.addEventListener('click', () => {
			this.buyUpgrade('hull');
		});
		this.shopPanel?.getElementById('btn-upgrade-speed')?.addEventListener('click', () => {
			this.buyUpgrade('speed');
		});
		this.shopPanel?.getElementById('btn-repair')?.addEventListener('click', () => {
			this.buyUpgrade('repair');
		});
		this.shopPanel?.getElementById('btn-shop-continue')?.addEventListener('click', () => {
			playMenuSelect(this.volume);
			this.startNextWave();
		});

		this.updateSettingsDisplay();
	}

	private showPanel(panel: string) {
		const panels: Record<string, UIKitMLAsset | undefined> = {
			menu: this.menuPanel,
			hud: this.hudPanel,
			pause: this.pausePanel,
			results: this.resultsPanel,
			settings: this.settingsPanel,
			stats: this.statsPanel,
			shop: this.shopPanel,
		};

		for (const [name, p] of Object.entries(panels)) {
			if (p) {
				p.visible = name === panel || (panel === 'playing' && name === 'hud');
			}
		}

		if (panel === 'playing') {
			if (this.hudPanel) this.hudPanel.visible = true;
		}
	}

	private updateSettingsDisplay() {
		const diffNames = ['EASY', 'NORMAL', 'HARD'];
		const scheme = getScheme(this.colorScheme);
		this.settingsPanel?.getElementById('diff-label')?.setProperties({ text: diffNames[this.difficulty] });
		this.settingsPanel?.getElementById('vol-label')?.setProperties({ text: `${Math.round(this.volume * 100)}%` });
		this.settingsPanel?.getElementById('color-label')?.setProperties({ text: scheme.name.toUpperCase() });
	}

	private updateStatsPanel() {
		this.statsPanel?.getElementById('stat-games')?.setProperties({ text: `Games: ${this.stats.totalGames}` });
		this.statsPanel?.getElementById('stat-kills')?.setProperties({ text: `Total Kills: ${this.stats.totalKills}` });
		this.statsPanel?.getElementById('stat-gold')?.setProperties({ text: `Gold Earned: ${this.stats.totalGoldEarned}` });
		this.statsPanel?.getElementById('stat-waves')?.setProperties({ text: `Waves: ${this.stats.totalWavesCompleted}` });
		this.statsPanel?.getElementById('stat-highscore')?.setProperties({ text: `High Score: ${this.stats.highScore}` });
		this.statsPanel?.getElementById('stat-bestwave')?.setProperties({ text: `Best Wave: ${this.stats.bestWave}` });
		this.statsPanel?.getElementById('stat-cannons')?.setProperties({ text: `Cannons Fired: ${this.stats.totalCannonsFired}` });
		this.statsPanel?.getElementById('stat-treasure')?.setProperties({ text: `Treasure: ${this.stats.totalTreasureCollected}` });
		this.statsPanel?.getElementById('stat-bosses')?.setProperties({ text: `Bosses: ${this.stats.bossesDefeated}` });
	}

	private startGame() {
		this.state = STATE_PLAYING;
		this.wave = 1;
		this.score = 0;
		this.playerHp = 100;
		this.playerMaxHp = 100;
		this.playerGold = 0;
		this.cannonDamage = 20;
		this.fireRate = 1.0;
		this.playerSpeed = 3;
		this.cannonLevel = 1;
		this.hullLevel = 1;
		this.speedLevel = 1;
		this.sessionKills = 0;
		this.sessionCannonsFired = 0;
		this.sessionTreasure = 0;
		this.combo = 0;
		this.comboTimer = 0;
		this.bossActive = false;

		// Clear any existing entities
		this.clearAllEntities();
		this.spawnPlayerShip();

		this.stats.totalGames++;
		saveStats(this.stats);

		this.startWave();
		this.showPanel('playing');
		startMusic(this.volume, 100);
	}

	private startWave() {
		const diffMult = [0.7, 1.0, 1.4][this.difficulty];
		const isBoss = this.wave % 5 === 0;
		this.bossActive = isBoss;

		if (isBoss) {
			// Boss wave
			this.enemiesTotal = 2 + Math.floor(this.wave / 10);
			// Add a boss ship
			this.enemiesTotal++;
		} else {
			this.enemiesTotal = 3 + Math.floor(this.wave * 1.2 * diffMult);
		}

		this.enemiesRemaining = this.enemiesTotal;
		this.enemiesSpawned = 0;
		this.spawnTimer = 0;
		this.waveTimer = 0;

		// Spawn mines on higher waves
		if (this.wave >= 3) {
			const mineCount = Math.min(Math.floor(this.wave / 3), 6);
			for (let i = 0; i < mineCount; i++) {
				this.spawnMine();
			}
		}

		// Increase music tempo on higher waves
		const bpm = 100 + Math.min(this.wave * 5, 60);
		setBPM(bpm, this.volume);
	}

	private startNextWave() {
		this.wave++;
		this.startWave();
		this.state = STATE_PLAYING;
		this.showPanel('playing');
	}

	private pauseGame() {
		if (this.state !== STATE_PLAYING) return;
		this.state = STATE_PAUSED;
		this.pausePanel?.getElementById('pause-wave')?.setProperties({ text: `Wave ${this.wave}` });
		this.pausePanel?.getElementById('pause-score')?.setProperties({ text: `Score: ${this.score}` });
		this.showPanel('pause');
		stopMusic();
	}

	private resumeGame() {
		this.state = STATE_PLAYING;
		this.showPanel('playing');
		startMusic(this.volume, 100 + Math.min(this.wave * 5, 60));
	}

	private endGame() {
		this.state = STATE_GAME_OVER;
		stopMusic();
		playGameOver(this.volume);

		// Update stats
		this.stats.totalKills += this.sessionKills;
		this.stats.totalGoldEarned += this.sessionTreasure;
		this.stats.totalCannonsFired += this.sessionCannonsFired;
		if (this.score > this.stats.highScore) this.stats.highScore = this.score;
		if (this.wave > this.stats.bestWave) this.stats.bestWave = this.wave;
		saveStats(this.stats);

		// Update high scores
		const highScores = loadHighScores();
		highScores.push({ score: this.score, wave: this.wave, kills: this.sessionKills });
		highScores.sort((a, b) => b.score - a.score);
		if (highScores.length > 5) highScores.length = 5;
		saveHighScores(highScores);

		// Update results panel
		this.resultsPanel?.getElementById('result-score')?.setProperties({ text: `Score: ${this.score}` });
		this.resultsPanel?.getElementById('result-wave')?.setProperties({ text: `Wave: ${this.wave}` });
		this.resultsPanel?.getElementById('result-kills')?.setProperties({ text: `Kills: ${this.sessionKills}` });
		this.resultsPanel?.getElementById('result-gold')?.setProperties({ text: `Gold: ${this.sessionTreasure}` });

		const isNewHigh = highScores[0]?.score === this.score;
		this.resultsPanel?.getElementById('result-highscore')?.setProperties({
			text: isNewHigh ? '★ NEW HIGH SCORE! ★' : `Best: ${this.stats.highScore}`
		});

		// Leaderboard
		for (let i = 0; i < 5; i++) {
			const entry = highScores[i];
			const el = this.resultsPanel?.getElementById(`lb-${i}`);
			if (el) {
				el.setProperties({
					text: entry ? `#${i + 1}  ${entry.score}pts  W${entry.wave}  ${entry.kills}K` : `#${i + 1}  ---`
				});
			}
		}

		this.showPanel('results');
	}

	private clearAllEntities() {
		for (const e of this.enemies) {
			e.group.removeFromParent();
		}
		this.enemies = [];

		for (const c of this.cannonballs) {
			c.mesh.removeFromParent();
		}
		this.cannonballs = [];

		for (const t of this.treasures) {
			t.group.removeFromParent();
		}
		this.treasures = [];

		for (const ex of this.explosions) {
			ex.group.removeFromParent();
		}
		this.explosions = [];

		for (const m of this.mines) {
			m.group.removeFromParent();
		}
		this.mines = [];
	}

	// Spawn enemies
	private spawnEnemy() {
		const scheme = getScheme(this.colorScheme);
		const diffMult = [0.7, 1.0, 1.4][this.difficulty];
		const isBossWave = this.wave % 5 === 0;
		const isLastEnemy = this.enemiesSpawned === this.enemiesTotal - 1 && isBossWave;

		let type: EnemyType;
		if (isLastEnemy && isBossWave) {
			type = EnemyType.ManOWar;
		} else if (this.wave < 3) {
			type = EnemyType.Sloop;
		} else if (this.wave < 6) {
			type = Math.random() < 0.6 ? EnemyType.Sloop : EnemyType.Brigantine;
		} else if (this.wave < 10) {
			const r = Math.random();
			type = r < 0.3 ? EnemyType.Sloop : r < 0.7 ? EnemyType.Brigantine : EnemyType.Galleon;
		} else {
			const r = Math.random();
			type = r < 0.2 ? EnemyType.Sloop : r < 0.5 ? EnemyType.Brigantine : EnemyType.Galleon;
		}

		const group = createEnemyShip(type, scheme);

		// Spawn at distance around player
		const angle = Math.random() * Math.PI * 2;
		const dist = 35 + Math.random() * 15;
		const px = Math.cos(angle) * dist;
		const pz = Math.sin(angle) * dist;
		group.position.set(px, 0, pz);

		// Face toward player
		group.lookAt(0, 0, 0);

		this.world.scene.add(group);

		const hpMult = type === EnemyType.ManOWar ? 5 : type === EnemyType.Galleon ? 2 : type === EnemyType.Brigantine ? 1.3 : 1;
		const baseHp = (30 + this.wave * 5) * hpMult * diffMult;

		const enemy: EnemyData = {
			entity: null,
			group,
			hp: baseHp,
			maxHp: baseHp,
			speed: type === EnemyType.Sloop ? 3 + this.wave * 0.1 : type === EnemyType.ManOWar ? 1.5 : type === EnemyType.Galleon ? 1.8 : 2.5,
			damage: (type === EnemyType.ManOWar ? 25 : type === EnemyType.Galleon ? 15 : 10) * diffMult,
			fireRate: type === EnemyType.ManOWar ? 0.8 : type === EnemyType.Galleon ? 1.5 : type === EnemyType.Brigantine ? 2.0 : 2.5,
			lastFireTime: this.time + Math.random() * 2,
			shipType: type,
			angle,
			distance: dist,
			engageRange: type === EnemyType.ManOWar ? 30 : 20 + Math.random() * 10,
			scoreValue: type === EnemyType.ManOWar ? 1000 : type === EnemyType.Galleon ? 300 : type === EnemyType.Brigantine ? 200 : 100,
			isSinking: false,
			sinkTimer: 0,
		};

		this.enemies.push(enemy);
		this.enemiesSpawned++;
	}

	private spawnMine() {
		const scheme = getScheme(this.colorScheme);
		const group = createSeaMine(scheme);
		const angle = Math.random() * Math.PI * 2;
		const dist = 10 + Math.random() * 20;
		const px = Math.cos(angle) * dist;
		const pz = Math.sin(angle) * dist;
		group.position.set(px, 0.3, pz);
		this.world.scene.add(group);

		this.mines.push({
			entity: null,
			group,
			px, pz,
			bobPhase: Math.random() * Math.PI * 2,
		});
	}

	private firePlayerCannon() {
		if (this.time - this.lastFireTime < this.fireRate) return;
		this.lastFireTime = this.time;
		this.sessionCannonsFired++;

		const scheme = getScheme(this.colorScheme);
		playCannonFire(this.volume);

		// Fire toward aim direction
		const speed = 25;
		const aimRadH = this.aimAngleH;
		const vx = Math.sin(aimRadH) * speed;
		const vz = -Math.cos(aimRadH) * speed;
		const vy = 5; // Arc upward

		const mesh = createCannonball(false, scheme);
		const startX = Math.sin(aimRadH) * 2;
		const startZ = -Math.cos(aimRadH) * 2;
		mesh.position.set(startX, 2, startZ);
		this.world.scene.add(mesh);

		this.cannonballs.push({
			entity: null,
			mesh,
			vx, vy, vz,
			damage: this.cannonDamage,
			isEnemy: false,
			lifetime: 0,
			maxLifetime: 4,
		});

		// Screen shake on fire
		this.shakeIntensity = Math.max(this.shakeIntensity, 0.3);
	}

	private fireEnemyCannon(enemy: EnemyData) {
		const scheme = getScheme(this.colorScheme);
		playEnemyFire(this.volume);

		// Aim toward player
		const dx = -enemy.group.position.x;
		const dz = -enemy.group.position.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		const speed = 15;
		const vx = (dx / dist) * speed;
		const vz = (dz / dist) * speed;
		const vy = 3;

		const mesh = createCannonball(true, scheme);
		mesh.position.copy(enemy.group.position);
		mesh.position.y = 2;
		this.world.scene.add(mesh);

		this.cannonballs.push({
			entity: null,
			mesh,
			vx, vy, vz,
			damage: enemy.damage,
			isEnemy: true,
			lifetime: 0,
			maxLifetime: 4,
		});
	}

	private spawnExplosion(x: number, y: number, z: number, scale: number = 1) {
		const scheme = getScheme(this.colorScheme);
		const group = createExplosion(scheme);
		group.position.set(x, y, z);
		group.scale.setScalar(scale);
		this.world.scene.add(group);
		this.explosions.push({ entity: null, group, timer: 0, maxTime: 0.8 });
	}

	private spawnTreasure(x: number, z: number, value: number) {
		const scheme = getScheme(this.colorScheme);
		const group = createTreasure(scheme);
		group.position.set(x, 0.5, z);
		this.world.scene.add(group);
		this.treasures.push({
			entity: null,
			group,
			value,
			bobPhase: Math.random() * Math.PI * 2,
			lifetime: 0,
			px: x, pz: z,
		});
	}

	private buyUpgrade(type: string) {
		const costs: Record<string, number> = {
			cannon: 100 + this.cannonLevel * 50,
			hull: 100 + this.hullLevel * 50,
			speed: 100 + this.speedLevel * 50,
			repair: 50,
		};
		const cost = costs[type] || 0;
		if (this.playerGold < cost) return;

		this.playerGold -= cost;
		playUpgrade(this.volume);

		switch (type) {
			case 'cannon':
				this.cannonLevel++;
				this.cannonDamage += 10;
				this.fireRate = Math.max(0.3, this.fireRate - 0.1);
				break;
			case 'hull':
				this.hullLevel++;
				this.playerMaxHp += 25;
				this.playerHp = Math.min(this.playerHp + 25, this.playerMaxHp);
				break;
			case 'speed':
				this.speedLevel++;
				this.playerSpeed += 0.5;
				break;
			case 'repair':
				this.playerHp = Math.min(this.playerHp + 30, this.playerMaxHp);
				break;
		}

		this.updateShopPanel();
	}

	private updateShopPanel() {
		const cannonCost = 100 + this.cannonLevel * 50;
		const hullCost = 100 + this.hullLevel * 50;
		const speedCost = 100 + this.speedLevel * 50;

		this.shopPanel?.getElementById('shop-gold')?.setProperties({ text: `Gold: ${this.playerGold}` });
		this.shopPanel?.getElementById('shop-cannon-info')?.setProperties({
			text: `Lv${this.cannonLevel} → Lv${this.cannonLevel + 1} (${cannonCost}g)`
		});
		this.shopPanel?.getElementById('shop-hull-info')?.setProperties({
			text: `Lv${this.hullLevel} → Lv${this.hullLevel + 1} (${hullCost}g)`
		});
		this.shopPanel?.getElementById('shop-speed-info')?.setProperties({
			text: `Lv${this.speedLevel} → Lv${this.speedLevel + 1} (${speedCost}g)`
		});
		this.shopPanel?.getElementById('shop-repair-info')?.setProperties({
			text: `HP: ${this.playerHp}/${this.playerMaxHp} (50g)`
		});
	}

	private updateHUD() {
		const hpPct = Math.round((this.playerHp / this.playerMaxHp) * 100);
		this.hudPanel?.getElementById('hud-hp')?.setProperties({ text: `HP: ${hpPct}%` });
		this.hudPanel?.getElementById('hud-score')?.setProperties({ text: `Score: ${this.score}` });
		this.hudPanel?.getElementById('hud-wave')?.setProperties({ text: `Wave ${this.wave}` });
		this.hudPanel?.getElementById('hud-gold')?.setProperties({ text: `Gold: ${this.playerGold}` });
		this.hudPanel?.getElementById('hud-enemies')?.setProperties({ text: `Enemies: ${this.enemiesRemaining}` });

		if (this.combo > 1) {
			this.hudPanel?.getElementById('hud-combo')?.setProperties({ text: `Combo x${this.combo}` });
		} else {
			this.hudPanel?.getElementById('hud-combo')?.setProperties({ text: '' });
		}

		// Boss HP bar
		if (this.bossActive) {
			const boss = this.enemies.find(e => e.shipType === EnemyType.ManOWar && !e.isSinking);
			if (boss) {
				const bossHpPct = Math.round((boss.hp / boss.maxHp) * 100);
				this.hudPanel?.getElementById('hud-boss')?.setProperties({ text: `BOSS: ${bossHpPct}%` });
			} else {
				this.hudPanel?.getElementById('hud-boss')?.setProperties({ text: '' });
			}
		} else {
			this.hudPanel?.getElementById('hud-boss')?.setProperties({ text: '' });
		}
	}

	update(delta: number, time: number) {
		this.time = time;

		// Handle input
		this.handleInput(delta);

		if (this.state === STATE_PLAYING) {
			this.updateGameplay(delta, time);
			this.updateHUD();
		}

		// Update explosions
		this.updateExplosions(delta);

		// Animate ocean
		this.animateOcean(time);

		// Screen shake
		if (this.shakeIntensity > 0.01) {
			const cam = this.world.camera;
			cam.position.x += (Math.random() - 0.5) * this.shakeIntensity;
			cam.position.y += (Math.random() - 0.5) * this.shakeIntensity;
			this.shakeIntensity *= Math.exp(-this.shakeDecay * delta);
		}
	}

	private handleInput(delta: number) {
		// XR input
		const rightGamepad = this.world.input.xr.gamepads.right;
		const leftGamepad = this.world.input.xr.gamepads.left;
		const leftStick = leftGamepad?.getAxesValues(InputComponent.Thumbstick);
		const rightStick = rightGamepad?.getAxesValues(InputComponent.Thumbstick);
		const triggerDown = rightGamepad?.getButtonPressed(InputComponent.Trigger) ?? false;
		const gripDown = rightGamepad?.getButtonDown(InputComponent.Squeeze) ?? false;

		// Keyboard input
		const moveX = (this.keys.has('a') || this.keys.has('arrowleft') ? -1 : 0) +
			(this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) +
			(leftStick?.x || 0);
		const moveZ = (this.keys.has('w') || this.keys.has('arrowup') ? -1 : 0) +
			(this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0) +
			(leftStick?.y || 0);

		// Aim with right stick or Q/E keys
		const aimH = (this.keys.has('q') ? -1 : 0) + (this.keys.has('e') ? 1 : 0) +
			(rightStick?.x || 0);
		this.aimAngleH += aimH * 2 * delta;

		// Fire
		const fireKey = this.keys.has(' ') || this.keys.has('f');
		if ((fireKey || triggerDown) && this.state === STATE_PLAYING) {
			this.firePlayerCannon();
		}

		// Pause
		const pauseKey = this.keys.has('escape') || this.keys.has('p') || gripDown;
		if (pauseKey && !this.prevPauseKey) {
			if (this.state === STATE_PLAYING) {
				this.pauseGame();
			} else if (this.state === STATE_PAUSED) {
				this.resumeGame();
			}
		}
		this.prevPauseKey = pauseKey;

		// Move player ship
		if (this.state === STATE_PLAYING && this.playerShipGroup) {
			this.playerShipGroup.position.x += moveX * this.playerSpeed * delta;
			this.playerShipGroup.position.z += moveZ * this.playerSpeed * delta;

			// Clamp position
			this.playerShipGroup.position.x = MathUtils.clamp(this.playerShipGroup.position.x, -40, 40);
			this.playerShipGroup.position.z = MathUtils.clamp(this.playerShipGroup.position.z, -40, 40);

			// Rotate ship to face movement direction
			if (Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1) {
				const targetAngle = Math.atan2(moveX, -moveZ);
				this.playerAngle = MathUtils.lerp(this.playerAngle, targetAngle, 5 * delta);
			}
			this.playerShipGroup.rotation.y = this.playerAngle;

			// Slight bobbing
			this.playerShipGroup.position.y = Math.sin(this.time * 1.5) * 0.15;
		}
	}

	private updateGameplay(delta: number, time: number) {
		// Spawn enemies
		this.spawnTimer += delta;
		const spawnInterval = Math.max(1, 3 - this.wave * 0.1);
		if (this.spawnTimer >= spawnInterval && this.enemiesSpawned < this.enemiesTotal) {
			this.spawnEnemy();
			this.spawnTimer = 0;
		}

		// Update enemies
		this.updateEnemies(delta, time);

		// Update cannonballs
		this.updateCannonballs(delta);

		// Update treasures
		this.updateTreasures(delta);

		// Update mines
		this.updateMines(delta);

		// Combo decay
		if (this.combo > 0) {
			this.comboTimer -= delta;
			if (this.comboTimer <= 0) {
				this.combo = 0;
			}
		}

		// Check wave completion
		if (this.enemiesRemaining <= 0 && this.enemiesSpawned >= this.enemiesTotal) {
			this.waveComplete();
		}
	}

	private updateEnemies(delta: number, time: number) {
		const playerPos = this.playerShipGroup?.position || new Vector3();
		const toRemove: number[] = [];

		for (let i = 0; i < this.enemies.length; i++) {
			const enemy = this.enemies[i];

			if (enemy.isSinking) {
				enemy.sinkTimer += delta;
				enemy.group.position.y -= delta * 1.5;
				enemy.group.rotation.z += delta * 0.5;
				if (enemy.sinkTimer > 3) {
					toRemove.push(i);
				}
				continue;
			}

			// Move toward player
			const dx = playerPos.x - enemy.group.position.x;
			const dz = playerPos.z - enemy.group.position.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist > enemy.engageRange) {
				// Move closer
				enemy.group.position.x += (dx / dist) * enemy.speed * delta;
				enemy.group.position.z += (dz / dist) * enemy.speed * delta;
			} else {
				// Circle around player
				const circleSpeed = enemy.speed * 0.5;
				const circleAngle = Math.atan2(dz, dx) + Math.PI / 2;
				enemy.group.position.x += Math.cos(circleAngle) * circleSpeed * delta;
				enemy.group.position.z += Math.sin(circleAngle) * circleSpeed * delta;
			}

			// Face player
			enemy.group.lookAt(playerPos.x, 0, playerPos.z);

			// Bob on water
			enemy.group.position.y = Math.sin(time * 1.2 + i * 0.7) * 0.12;

			// Fire at player
			if (dist < enemy.engageRange + 10 && time - enemy.lastFireTime > enemy.fireRate) {
				enemy.lastFireTime = time;
				this.fireEnemyCannon(enemy);
			}

			// Update HP bar
			const hpBar = enemy.group.getObjectByName('hp-bar');
			if (hpBar) {
				const ratio = enemy.hp / enemy.maxHp;
				hpBar.scale.x = Math.max(0.01, ratio);
				hpBar.position.x = -(1 - ratio) * 0.4;
			}
		}

		// Remove sunk ships
		for (let i = toRemove.length - 1; i >= 0; i--) {
			const idx = toRemove[i];
			const enemy = this.enemies[idx];
			enemy.group.removeFromParent();
			this.enemies.splice(idx, 1);
		}
	}

	private updateCannonballs(delta: number) {
		const playerPos = this.playerShipGroup?.position || new Vector3();
		const toRemove: number[] = [];

		for (let i = 0; i < this.cannonballs.length; i++) {
			const ball = this.cannonballs[i];
			ball.lifetime += delta;

			// Apply gravity
			ball.vy -= 9.8 * delta;

			// Move
			ball.mesh.position.x += ball.vx * delta;
			ball.mesh.position.y += ball.vy * delta;
			ball.mesh.position.z += ball.vz * delta;

			// Check if hit water
			if (ball.mesh.position.y < 0) {
				playSplash(this.volume);
				this.spawnExplosion(ball.mesh.position.x, 0.2, ball.mesh.position.z, 0.3);
				toRemove.push(i);
				continue;
			}

			// Lifetime
			if (ball.lifetime > ball.maxLifetime) {
				toRemove.push(i);
				continue;
			}

			if (ball.isEnemy) {
				// Check hit player
				const dx = ball.mesh.position.x - playerPos.x;
				const dz = ball.mesh.position.z - playerPos.z;
				const dist = Math.sqrt(dx * dx + dz * dz);
				if (dist < 3 && ball.mesh.position.y < 3) {
					this.playerHp -= ball.damage;
					playHit(this.volume);
					this.spawnExplosion(ball.mesh.position.x, ball.mesh.position.y, ball.mesh.position.z, 0.5);
					this.shakeIntensity = Math.max(this.shakeIntensity, 0.8);
					toRemove.push(i);

					if (this.playerHp <= 0) {
						this.endGame();
					}
					continue;
				}
			} else {
				// Check hit enemies
				for (let j = 0; j < this.enemies.length; j++) {
					const enemy = this.enemies[j];
					if (enemy.isSinking) continue;

					const dx = ball.mesh.position.x - enemy.group.position.x;
					const dz = ball.mesh.position.z - enemy.group.position.z;
					const hitRadius = enemy.shipType === EnemyType.ManOWar ? 5 : enemy.shipType === EnemyType.Galleon ? 3.5 : 2.5;
					const dist = Math.sqrt(dx * dx + dz * dz);

					if (dist < hitRadius && ball.mesh.position.y < 5) {
						enemy.hp -= ball.damage;
						playHit(this.volume);
						this.spawnExplosion(ball.mesh.position.x, ball.mesh.position.y, ball.mesh.position.z, 0.6);
						toRemove.push(i);

						if (enemy.hp <= 0) {
							// Enemy sunk
							enemy.isSinking = true;
							this.enemiesRemaining--;
							this.sessionKills++;
							this.stats.totalKills++;

							// Combo
							this.combo++;
							this.comboTimer = 3;
							playCombo(this.combo, this.volume);

							const multiplier = Math.min(1 + this.combo * 0.25, 3);
							this.score += Math.round(enemy.scoreValue * multiplier);

							playShipSink(this.volume);
							this.spawnExplosion(enemy.group.position.x, 1, enemy.group.position.z, 1.5);

							// Spawn treasure
							const treasureValue = enemy.shipType === EnemyType.ManOWar ? 200 : enemy.shipType === EnemyType.Galleon ? 100 : enemy.shipType === EnemyType.Brigantine ? 60 : 30;
							this.spawnTreasure(enemy.group.position.x, enemy.group.position.z, treasureValue);

							if (enemy.shipType === EnemyType.ManOWar) {
								this.stats.bossesDefeated++;
								this.bossActive = false;
								// Extra explosion for boss
								for (let k = 0; k < 5; k++) {
									setTimeout(() => {
										this.spawnExplosion(
											enemy.group.position.x + (Math.random() - 0.5) * 6,
											Math.random() * 3,
											enemy.group.position.z + (Math.random() - 0.5) * 6,
											1 + Math.random(),
										);
										playExplosion(this.volume);
									}, k * 200);
								}
							}
						}
						break;
					}
				}

				// Check hit mines
				for (let j = 0; j < this.mines.length; j++) {
					const mine = this.mines[j];
					const dx = ball.mesh.position.x - mine.px;
					const dz = ball.mesh.position.z - mine.pz;
					const dist = Math.sqrt(dx * dx + dz * dz);
					if (dist < 1.5) {
						this.spawnExplosion(mine.px, 0.5, mine.pz, 2);
						playMineExplode(this.volume);
						mine.group.removeFromParent();
						this.mines.splice(j, 1);
						this.stats.minesDestroyed++;
						this.score += 50;
						toRemove.push(i);
						break;
					}
				}
			}
		}

		for (let i = toRemove.length - 1; i >= 0; i--) {
			const idx = toRemove[i];
			if (idx < this.cannonballs.length) {
				this.cannonballs[idx].mesh.removeFromParent();
				this.cannonballs.splice(idx, 1);
			}
		}
	}

	private updateTreasures(delta: number) {
		const playerPos = this.playerShipGroup?.position || new Vector3();
		const toRemove: number[] = [];

		for (let i = 0; i < this.treasures.length; i++) {
			const t = this.treasures[i];
			t.lifetime += delta;
			t.bobPhase += delta * 2;

			// Bob on water
			t.group.position.y = 0.3 + Math.sin(t.bobPhase) * 0.15;
			t.group.rotation.y += delta;

			// Check player collection
			const dx = playerPos.x - t.px;
			const dz = playerPos.z - t.pz;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist < 4) {
				// Magnet pull
				t.px += (playerPos.x - t.px) * 3 * delta;
				t.pz += (playerPos.z - t.pz) * 3 * delta;
				t.group.position.x = t.px;
				t.group.position.z = t.pz;

				if (dist < 2) {
					this.playerGold += t.value;
					this.sessionTreasure += t.value;
					this.stats.totalTreasureCollected++;
					this.score += t.value;
					playTreasureCollect(this.volume);
					toRemove.push(i);
					continue;
				}
			}

			// Lifetime
			if (t.lifetime > 15) {
				// Fade and sink
				t.group.position.y -= (t.lifetime - 15) * delta * 2;
				if (t.lifetime > 18) {
					toRemove.push(i);
				}
			}
		}

		for (let i = toRemove.length - 1; i >= 0; i--) {
			const idx = toRemove[i];
			this.treasures[idx].group.removeFromParent();
			this.treasures.splice(idx, 1);
		}
	}

	private updateMines(delta: number) {
		const playerPos = this.playerShipGroup?.position || new Vector3();

		for (let i = this.mines.length - 1; i >= 0; i--) {
			const mine = this.mines[i];
			mine.bobPhase += delta;
			mine.group.position.y = 0.3 + Math.sin(mine.bobPhase * 1.5) * 0.1;
			mine.group.rotation.y += delta * 0.5;

			// Check proximity to player
			const dx = playerPos.x - mine.px;
			const dz = playerPos.z - mine.pz;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist < 3) {
				// Mine explodes
				this.spawnExplosion(mine.px, 0.5, mine.pz, 2);
				playMineExplode(this.volume);
				this.playerHp -= 20;
				this.shakeIntensity = Math.max(this.shakeIntensity, 1.5);
				mine.group.removeFromParent();
				this.mines.splice(i, 1);

				if (this.playerHp <= 0) {
					this.endGame();
				}
			}
		}
	}

	private updateExplosions(delta: number) {
		for (let i = this.explosions.length - 1; i >= 0; i--) {
			const ex = this.explosions[i];
			ex.timer += delta;
			const progress = ex.timer / ex.maxTime;

			// Move particles outward and fade
			for (const child of ex.group.children) {
				child.position.multiplyScalar(1 + delta * 3);
				const mat = (child as any).material;
				if (mat && mat.opacity !== undefined) {
					mat.opacity = Math.max(0, 1 - progress);
				}
			}

			if (ex.timer > ex.maxTime) {
				ex.group.removeFromParent();
				this.explosions.splice(i, 1);
			}
		}
	}

	private waveComplete() {
		this.state = STATE_WAVE_CLEAR;
		this.waveClearTimer = 0;
		this.stats.totalWavesCompleted++;
		saveStats(this.stats);

		playWaveComplete(this.volume);

		// Bonus gold for wave completion
		const waveBonus = 50 + this.wave * 20;
		this.playerGold += waveBonus;
		this.score += waveBonus;

		// Show shop after brief delay
		setTimeout(() => {
			if (this.state === STATE_WAVE_CLEAR) {
				this.state = STATE_SHOP;
				this.updateShopPanel();
				this.showPanel('shop');
			}
		}, 2000);
	}

	private animateOcean(time: number) {
		if (!this.oceanMesh) return;
		const geo = this.oceanMesh.geometry;
		const pos = geo.attributes.position;
		if (!pos) return;

		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const z = pos.getZ(i);
			const wave1 = Math.sin(x * 0.05 + time * 0.8) * 0.3;
			const wave2 = Math.sin(z * 0.07 + time * 0.6) * 0.2;
			const wave3 = Math.sin((x + z) * 0.03 + time * 1.2) * 0.15;
			pos.setZ(i, wave1 + wave2 + wave3);
		}
		pos.needsUpdate = true;
	}
}
