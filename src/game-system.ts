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
	Mesh,
	MeshStandardMaterial,
	SphereGeometry,
	CylinderGeometry,
	BoxGeometry,
	ConeGeometry,
	Group,
	AdditiveBlending,
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
	group: Group;
	hp: number;
	maxHp: number;
	speed: number;
	damage: number;
	fireRate: number;
	lastFireTime: number;
	shipType: EnemyType;
	engageRange: number;
	scoreValue: number;
	isSinking: boolean;
	sinkTimer: number;
	circleDir: number;
	dashCooldown: number;
	hullWidth: number;
}

interface CannonballData {
	mesh: Mesh;
	vx: number;
	vy: number;
	vz: number;
	damage: number;
	isEnemy: boolean;
	lifetime: number;
	maxLifetime: number;
	trail: Mesh[];
}

interface TreasureData {
	group: Group;
	value: number;
	bobPhase: number;
	lifetime: number;
	px: number;
	pz: number;
}

interface ExplosionData {
	group: Group;
	timer: number;
	maxTime: number;
}

interface MineData {
	group: Group;
	px: number;
	pz: number;
	bobPhase: number;
}

interface WakeParticle {
	mesh: Mesh;
	life: number;
	maxLife: number;
	vx: number;
	vz: number;
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
	longestCombo: number;
}

function loadStats(): CareerStats {
	try {
		const s = localStorage.getItem('neon-pirate-stats');
		if (s) return JSON.parse(s);
	} catch { /* empty */ }
	return {
		totalGames: 0, totalKills: 0, totalGoldEarned: 0,
		totalWavesCompleted: 0, highScore: 0, bestWave: 0,
		totalCannonsFired: 0, totalTreasureCollected: 0,
		bossesDefeated: 0, minesDestroyed: 0, longestCombo: 0,
	};
}

function saveStats(s: CareerStats) {
	try { localStorage.setItem('neon-pirate-stats', JSON.stringify(s)); } catch { /* empty */ }
}

function loadSettings(): { difficulty: number; volume: number; colorScheme: number } {
	try {
		const s = localStorage.getItem('neon-pirate-settings');
		if (s) return JSON.parse(s);
	} catch { /* empty */ }
	return { difficulty: DIFF_NORMAL, volume: 0.7, colorScheme: 0 };
}

function saveSettings(s: { difficulty: number; volume: number; colorScheme: number }) {
	try { localStorage.setItem('neon-pirate-settings', JSON.stringify(s)); } catch { /* empty */ }
}

function loadHighScores(): { score: number; wave: number; kills: number }[] {
	try {
		const s = localStorage.getItem('neon-pirate-highscores');
		if (s) return JSON.parse(s);
	} catch { /* empty */ }
	return [];
}

function saveHighScores(scores: { score: number; wave: number; kills: number }[]) {
	try { localStorage.setItem('neon-pirate-highscores', JSON.stringify(scores)); } catch { /* empty */ }
}

export class GameSystem extends createSystem({}) {
	private state = STATE_MENU;
	private wave = 1;
	private score = 0;
	private playerHp = 100;
	private playerMaxHp = 100;
	private playerGold = 0;
	private cannonDamage = 20;
	private fireRate = 1.0;
	private playerSpeed = 3;
	private cannonLevel = 1;
	private hullLevel = 1;
	private speedLevel = 1;
	private lastFireTime = 0;
	private time = 0;
	private cannonSpread = 1; // number of cannonballs per shot
	private cannonPierce = false;

	// Wave management
	private enemiesRemaining = 0;
	private enemiesSpawned = 0;
	private enemiesTotal = 0;
	private spawnTimer = 0;
	private waveClearDelay = 0;

	// Entities
	private enemies: EnemyData[] = [];
	private cannonballs: CannonballData[] = [];
	private treasures: TreasureData[] = [];
	private explosions: ExplosionData[] = [];
	private mines: MineData[] = [];
	private wakeParticles: WakeParticle[] = [];

	// Player ship
	private playerShipGroup: Group | null = null;
	private playerAngle = 0;
	private playerMoveX = 0;
	private playerMoveZ = 0;

	// Ocean
	private oceanMesh: Mesh | null = null;

	// Aiming
	private aimAngleH = 0;
	private aimReticle: Mesh | null = null;

	// UI panels
	private menuPanel: UIKitMLAsset | undefined;
	private hudPanel: UIKitMLAsset | undefined;
	private pausePanel: UIKitMLAsset | undefined;
	private resultsPanel: UIKitMLAsset | undefined;
	private settingsPanel: UIKitMLAsset | undefined;
	private statsPanel: UIKitMLAsset | undefined;
	private shopPanel: UIKitMLAsset | undefined;

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
	private maxCombo = 0;

	// Keyboard
	private keys: Set<string> = new Set();
	private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
	private keyupHandler: ((e: KeyboardEvent) => void) | null = null;
	private prevPauseKey = false;

	// Screen shake
	private shakeIntensity = 0;
	private shakeDecay = 5;
	private baseCamPos = new Vector3(0, 8, 15);

	// Boss tracking
	private bossActive = false;

	// Damage flash
	private damageFlashTimer = 0;
	private damageOverlay: Mesh | null = null;

	// Score popups
	private scorePopups: { mesh: Mesh; timer: number; vy: number }[] = [];

	// Ambient particles (floating embers on water)
	private ambientParticles: { mesh: Mesh; vx: number; vz: number; vy: number; life: number }[] = [];

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

		// Fog and background
		this.world.scene.fog = new FogExp2(scheme.water, 0.008);
		this.world.scene.background = new Color(scheme.water);

		// Lights
		const ambient = new AmbientLight(0x334455, 0.4);
		this.world.scene.add(ambient);

		const dirLight = new DirectionalLight(new Color(scheme.primary), 0.3);
		dirLight.position.set(20, 30, -10);
		this.world.scene.add(dirLight);

		const moonLight = new PointLight(new Color('#aabbff'), 0.5, 200);
		moonLight.position.set(-50, 60, -80);
		this.world.scene.add(moonLight);

		// Point lights around the play area for atmosphere
		const lightPositions = [
			[-30, 3, -30], [30, 3, -30], [-30, 3, 30], [30, 3, 30],
		];
		for (const pos of lightPositions) {
			const light = new PointLight(new Color(scheme.primary), 0.15, 40);
			light.position.set(pos[0], pos[1], pos[2]);
			this.world.scene.add(light);
		}

		// Ocean
		const oceanPlane = createOceanPlane(scheme);
		this.oceanMesh = oceanPlane;
		this.world.createTransformEntity(oceanPlane);

		// Starfield
		const stars = createStarfield();
		this.world.scene.add(stars);

		// Player ship
		this.spawnPlayerShip();

		// Aim reticle (floating ring showing fire direction)
		const reticleGeo = new CylinderGeometry(0.6, 0.6, 0.05, 16, 1, true);
		const reticleMat = new MeshStandardMaterial({
			color: scheme.primary,
			emissive: scheme.primary,
			emissiveIntensity: 1.5,
			transparent: true,
			opacity: 0.6,
		});
		this.aimReticle = new Mesh(reticleGeo, reticleMat);
		this.aimReticle.position.set(0, 0.5, -5);
		this.world.scene.add(this.aimReticle);

		// Damage overlay
		const overlayGeo = new BoxGeometry(100, 60, 0.01);
		const overlayMat = new MeshStandardMaterial({
			color: '#ff0000',
			emissive: '#ff0000',
			emissiveIntensity: 1,
			transparent: true,
			opacity: 0,
		});
		this.damageOverlay = new Mesh(overlayGeo, overlayMat);
		this.damageOverlay.position.set(0, 8, 14.5);
		this.world.scene.add(this.damageOverlay);

		// Ambient floating particles
		this.spawnAmbientParticles(scheme);
	}

	private spawnAmbientParticles(scheme: typeof COLOR_SCHEMES[0]) {
		for (let i = 0; i < 40; i++) {
			const geo = new SphereGeometry(0.04 + Math.random() * 0.06, 4, 4);
			const mat = new MeshStandardMaterial({
				color: scheme.primary,
				emissive: scheme.primary,
				emissiveIntensity: 1.5,
				transparent: true,
				opacity: 0.4 + Math.random() * 0.4,
			});
			const mesh = new Mesh(geo, mat);
			mesh.position.set(
				(Math.random() - 0.5) * 60,
				0.5 + Math.random() * 3,
				(Math.random() - 0.5) * 60,
			);
			this.world.scene.add(mesh);
			this.ambientParticles.push({
				mesh,
				vx: (Math.random() - 0.5) * 0.5,
				vz: (Math.random() - 0.5) * 0.5,
				vy: (Math.random() - 0.5) * 0.2,
				life: Math.random() * 20,
			});
		}
	}

	private spawnPlayerShip() {
		const scheme = getScheme(this.colorScheme);
		if (this.playerShipGroup) {
			this.playerShipGroup.removeFromParent();
		}
		this.playerShipGroup = createPlayerShip(scheme);
		this.world.createTransformEntity(this.playerShipGroup);
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
			this.updateSettingsDisplay();
			this.showPanel('settings');
		});
		this.menuPanel?.getElementById('btn-stats')?.addEventListener('click', () => {
			playMenuSelect(this.volume);
			this.updateStatsPanel();
			this.showPanel('stats');
		});

		// Settings buttons
		this.settingsPanel?.getElementById('btn-diff-easy')?.addEventListener('click', () => {
			this.difficulty = DIFF_EASY; this.updateSettingsDisplay(); playMenuSelect(this.volume);
		});
		this.settingsPanel?.getElementById('btn-diff-normal')?.addEventListener('click', () => {
			this.difficulty = DIFF_NORMAL; this.updateSettingsDisplay(); playMenuSelect(this.volume);
		});
		this.settingsPanel?.getElementById('btn-diff-hard')?.addEventListener('click', () => {
			this.difficulty = DIFF_HARD; this.updateSettingsDisplay(); playMenuSelect(this.volume);
		});
		this.settingsPanel?.getElementById('btn-vol-down')?.addEventListener('click', () => {
			this.volume = Math.max(0, this.volume - 0.1); this.updateSettingsDisplay(); playMenuSelect(this.volume);
		});
		this.settingsPanel?.getElementById('btn-vol-up')?.addEventListener('click', () => {
			this.volume = Math.min(1, this.volume + 0.1); this.updateSettingsDisplay(); playMenuSelect(this.volume);
		});
		this.settingsPanel?.getElementById('btn-color')?.addEventListener('click', () => {
			this.colorScheme = (this.colorScheme + 1) % COLOR_SCHEMES.length;
			this.updateSettingsDisplay(); playMenuSelect(this.volume);
		});
		this.settingsPanel?.getElementById('btn-settings-back')?.addEventListener('click', () => {
			saveSettings({ difficulty: this.difficulty, volume: this.volume, colorScheme: this.colorScheme });
			playMenuSelect(this.volume);
			this.showPanel(this.state === STATE_PAUSED ? 'pause' : 'menu');
		});

		// Pause buttons
		this.pausePanel?.getElementById('btn-resume')?.addEventListener('click', () => {
			playMenuSelect(this.volume); this.resumeGame();
		});
		this.pausePanel?.getElementById('btn-pause-settings')?.addEventListener('click', () => {
			playMenuSelect(this.volume); this.updateSettingsDisplay(); this.showPanel('settings');
		});
		this.pausePanel?.getElementById('btn-quit')?.addEventListener('click', () => {
			playMenuSelect(this.volume); this.endGame();
		});

		// Results buttons
		this.resultsPanel?.getElementById('btn-retry')?.addEventListener('click', () => {
			playMenuSelect(this.volume); this.startGame();
		});
		this.resultsPanel?.getElementById('btn-results-menu')?.addEventListener('click', () => {
			playMenuSelect(this.volume); this.showPanel('menu'); this.state = STATE_MENU;
		});

		// Stats back
		this.statsPanel?.getElementById('btn-stats-back')?.addEventListener('click', () => {
			playMenuSelect(this.volume); this.showPanel('menu');
		});

		// Shop buttons
		this.shopPanel?.getElementById('btn-upgrade-cannons')?.addEventListener('click', () => this.buyUpgrade('cannon'));
		this.shopPanel?.getElementById('btn-upgrade-hull')?.addEventListener('click', () => this.buyUpgrade('hull'));
		this.shopPanel?.getElementById('btn-upgrade-speed')?.addEventListener('click', () => this.buyUpgrade('speed'));
		this.shopPanel?.getElementById('btn-repair')?.addEventListener('click', () => this.buyUpgrade('repair'));
		this.shopPanel?.getElementById('btn-shop-continue')?.addEventListener('click', () => {
			playMenuSelect(this.volume); this.startNextWave();
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
		this.maxCombo = 0;
		this.bossActive = false;
		this.cannonSpread = 1;
		this.cannonPierce = false;
		this.aimAngleH = 0;

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
			this.enemiesTotal = 2 + Math.floor(this.wave / 10);
			this.enemiesTotal++; // +1 for boss
		} else {
			this.enemiesTotal = 3 + Math.floor(this.wave * 1.2 * diffMult);
		}

		this.enemiesRemaining = this.enemiesTotal;
		this.enemiesSpawned = 0;
		this.spawnTimer = 0;
		this.waveClearDelay = 0;

		// Mines on wave 3+
		if (this.wave >= 3) {
			const mineCount = Math.min(Math.floor(this.wave / 3), 6);
			for (let i = 0; i < mineCount; i++) {
				this.spawnMine();
			}
		}

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

		this.stats.totalKills += this.sessionKills;
		this.stats.totalGoldEarned += this.sessionTreasure;
		this.stats.totalCannonsFired += this.sessionCannonsFired;
		if (this.maxCombo > this.stats.longestCombo) this.stats.longestCombo = this.maxCombo;
		if (this.score > this.stats.highScore) this.stats.highScore = this.score;
		if (this.wave > this.stats.bestWave) this.stats.bestWave = this.wave;
		saveStats(this.stats);

		const highScores = loadHighScores();
		highScores.push({ score: this.score, wave: this.wave, kills: this.sessionKills });
		highScores.sort((a, b) => b.score - a.score);
		if (highScores.length > 5) highScores.length = 5;
		saveHighScores(highScores);

		this.resultsPanel?.getElementById('result-score')?.setProperties({ text: `Score: ${this.score}` });
		this.resultsPanel?.getElementById('result-wave')?.setProperties({ text: `Wave: ${this.wave}` });
		this.resultsPanel?.getElementById('result-kills')?.setProperties({ text: `Kills: ${this.sessionKills}` });
		this.resultsPanel?.getElementById('result-gold')?.setProperties({ text: `Gold: ${this.sessionTreasure}` });

		const isNewHigh = highScores[0]?.score === this.score;
		this.resultsPanel?.getElementById('result-highscore')?.setProperties({
			text: isNewHigh ? '★ NEW HIGH SCORE! ★' : `Best: ${this.stats.highScore}`
		});

		for (let i = 0; i < 5; i++) {
			const entry = highScores[i];
			this.resultsPanel?.getElementById(`lb-${i}`)?.setProperties({
				text: entry ? `#${i + 1}  ${entry.score}pts  W${entry.wave}  ${entry.kills}K` : `#${i + 1}  ---`
			});
		}

		this.showPanel('results');
	}

	private clearAllEntities() {
		for (const e of this.enemies) e.group.removeFromParent();
		this.enemies = [];
		for (const c of this.cannonballs) {
			c.mesh.removeFromParent();
			for (const t of c.trail) t.removeFromParent();
		}
		this.cannonballs = [];
		for (const t of this.treasures) t.group.removeFromParent();
		this.treasures = [];
		for (const ex of this.explosions) ex.group.removeFromParent();
		this.explosions = [];
		for (const m of this.mines) m.group.removeFromParent();
		this.mines = [];
		for (const w of this.wakeParticles) w.mesh.removeFromParent();
		this.wakeParticles = [];
		for (const sp of this.scorePopups) sp.mesh.removeFromParent();
		this.scorePopups = [];
	}

	// ==== SPAWNING ====

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
		const angle = Math.random() * Math.PI * 2;
		const dist = 35 + Math.random() * 15;
		group.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
		group.lookAt(0, 0, 0);
		this.world.scene.add(group);

		const hpMult = type === EnemyType.ManOWar ? 5 : type === EnemyType.Galleon ? 2 : type === EnemyType.Brigantine ? 1.3 : 1;
		const baseHp = (30 + this.wave * 5) * hpMult * diffMult;
		const hullWidths: Record<EnemyType, number> = {
			[EnemyType.Sloop]: 1.8,
			[EnemyType.Brigantine]: 2.5,
			[EnemyType.Galleon]: 3,
			[EnemyType.ManOWar]: 4,
		};

		this.enemies.push({
			group,
			hp: baseHp,
			maxHp: baseHp,
			speed: type === EnemyType.Sloop ? 3 + this.wave * 0.1 : type === EnemyType.ManOWar ? 1.5 : type === EnemyType.Galleon ? 1.8 : 2.5,
			damage: (type === EnemyType.ManOWar ? 25 : type === EnemyType.Galleon ? 15 : 10) * diffMult,
			fireRate: type === EnemyType.ManOWar ? 0.8 : type === EnemyType.Galleon ? 1.5 : type === EnemyType.Brigantine ? 2.0 : 2.5,
			lastFireTime: this.time + Math.random() * 2,
			shipType: type,
			engageRange: type === EnemyType.ManOWar ? 30 : 20 + Math.random() * 10,
			scoreValue: type === EnemyType.ManOWar ? 1000 : type === EnemyType.Galleon ? 300 : type === EnemyType.Brigantine ? 200 : 100,
			isSinking: false,
			sinkTimer: 0,
			circleDir: Math.random() < 0.5 ? 1 : -1,
			dashCooldown: 0,
			hullWidth: hullWidths[type],
		});

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
		this.mines.push({ group, px, pz, bobPhase: Math.random() * Math.PI * 2 });
	}

	private firePlayerCannon() {
		if (this.time - this.lastFireTime < this.fireRate) return;
		this.lastFireTime = this.time;
		this.sessionCannonsFired++;

		const scheme = getScheme(this.colorScheme);
		playCannonFire(this.volume);

		const speed = 25;
		const spreadAngles: number[] = [];
		if (this.cannonSpread === 1) {
			spreadAngles.push(0);
		} else if (this.cannonSpread === 2) {
			spreadAngles.push(-0.1, 0.1);
		} else {
			spreadAngles.push(-0.15, 0, 0.15);
		}

		for (const spreadOff of spreadAngles) {
			const aimRadH = this.aimAngleH + spreadOff;
			const vx = Math.sin(aimRadH) * speed;
			const vz = -Math.cos(aimRadH) * speed;
			const vy = 5;

			const mesh = createCannonball(false, scheme);
			const startX = (this.playerShipGroup?.position.x || 0) + Math.sin(aimRadH) * 2;
			const startZ = (this.playerShipGroup?.position.z || 0) - Math.cos(aimRadH) * 2;
			mesh.position.set(startX, 2, startZ);
			this.world.scene.add(mesh);

			this.cannonballs.push({
				mesh, vx, vy, vz,
				damage: this.cannonDamage,
				isEnemy: false,
				lifetime: 0,
				maxLifetime: 4,
				trail: [],
			});
		}

		this.shakeIntensity = Math.max(this.shakeIntensity, 0.3);
	}

	private fireEnemyCannon(enemy: EnemyData) {
		const scheme = getScheme(this.colorScheme);
		playEnemyFire(this.volume);

		const playerPos = this.playerShipGroup?.position || new Vector3();
		const dx = playerPos.x - enemy.group.position.x;
		const dz = playerPos.z - enemy.group.position.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist < 0.1) return;

		const speed = 15;
		const vx = (dx / dist) * speed;
		const vz = (dz / dist) * speed;

		// Boss fires multiple
		const shots = enemy.shipType === EnemyType.ManOWar ? 3 : 1;
		for (let s = 0; s < shots; s++) {
			const spreadX = s === 0 ? 0 : (s === 1 ? 3 : -3);
			const mesh = createCannonball(true, scheme);
			mesh.position.set(
				enemy.group.position.x + spreadX,
				2,
				enemy.group.position.z,
			);
			this.world.scene.add(mesh);

			this.cannonballs.push({
				mesh,
				vx: vx + (Math.random() - 0.5) * 2,
				vy: 3 + Math.random(),
				vz: vz + (Math.random() - 0.5) * 2,
				damage: enemy.damage,
				isEnemy: true,
				lifetime: 0,
				maxLifetime: 4,
				trail: [],
			});
		}
	}

	private spawnExplosion(x: number, y: number, z: number, scale: number = 1) {
		const scheme = getScheme(this.colorScheme);
		const group = createExplosion(scheme);
		group.position.set(x, y, z);
		group.scale.setScalar(scale);
		this.world.scene.add(group);
		this.explosions.push({ group, timer: 0, maxTime: 0.8 });
	}

	private spawnTreasure(x: number, z: number, value: number) {
		const scheme = getScheme(this.colorScheme);
		const group = createTreasure(scheme);
		group.position.set(x, 0.5, z);
		this.world.scene.add(group);
		this.treasures.push({ group, value, bobPhase: Math.random() * Math.PI * 2, lifetime: 0, px: x, pz: z });
	}

	private spawnScorePopup(x: number, y: number, z: number, points: number) {
		// Create a small glowing sphere that floats up
		const color = points >= 500 ? '#ffdd00' : points >= 200 ? '#ff8800' : '#00ffff';
		const geo = new SphereGeometry(0.15, 4, 4);
		const mat = new MeshStandardMaterial({
			color, emissive: color, emissiveIntensity: 2,
			transparent: true, opacity: 1,
		});
		const mesh = new Mesh(geo, mat);
		mesh.position.set(x, y + 1, z);
		this.world.scene.add(mesh);
		this.scorePopups.push({ mesh, timer: 0, vy: 2 });
	}

	private spawnWakeTrail(x: number, z: number, scheme: typeof COLOR_SCHEMES[0]) {
		const geo = new SphereGeometry(0.08, 4, 4);
		const mat = new MeshStandardMaterial({
			color: scheme.primary,
			emissive: scheme.primary,
			emissiveIntensity: 0.8,
			transparent: true,
			opacity: 0.5,
		});
		const mesh = new Mesh(geo, mat);
		mesh.position.set(x, 0.1, z);
		this.world.scene.add(mesh);
		this.wakeParticles.push({
			mesh,
			life: 0,
			maxLife: 1.5,
			vx: (Math.random() - 0.5) * 0.5,
			vz: (Math.random() - 0.5) * 0.5,
		});
	}

	// ==== UPGRADES ====

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
				this.fireRate = Math.max(0.3, this.fireRate - 0.08);
				if (this.cannonLevel === 3) this.cannonSpread = 2;
				if (this.cannonLevel === 5) this.cannonSpread = 3;
				if (this.cannonLevel >= 7) this.cannonPierce = true;
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
		this.hudPanel?.getElementById('hud-combo')?.setProperties({ text: this.combo > 1 ? `Combo x${this.combo}` : '' });

		if (this.bossActive) {
			const boss = this.enemies.find(e => e.shipType === EnemyType.ManOWar && !e.isSinking);
			this.hudPanel?.getElementById('hud-boss')?.setProperties({
				text: boss ? `BOSS: ${Math.round((boss.hp / boss.maxHp) * 100)}%` : ''
			});
		} else {
			this.hudPanel?.getElementById('hud-boss')?.setProperties({ text: '' });
		}
	}

	// ==== MAIN UPDATE ====

	update(delta: number, time: number) {
		this.time = time;
		delta = Math.min(delta, 0.05); // Cap delta

		this.handleInput(delta);

		if (this.state === STATE_PLAYING) {
			this.updateGameplay(delta, time);
			this.updateHUD();
		}

		this.updateExplosions(delta);
		this.updateScorePopups(delta);
		this.updateWakeParticles(delta);
		this.updateAmbientParticles(delta, time);
		this.animateOcean(time);
		this.updateDamageFlash(delta);
		this.updateAimReticle();

		// Screen shake
		if (this.shakeIntensity > 0.01) {
			const cam = this.world.camera;
			cam.position.x = this.baseCamPos.x + (Math.random() - 0.5) * this.shakeIntensity;
			cam.position.y = this.baseCamPos.y + (Math.random() - 0.5) * this.shakeIntensity;
			this.shakeIntensity *= Math.exp(-this.shakeDecay * delta);
		}
	}

	private handleInput(delta: number) {
		const rightGamepad = this.world.input.xr.gamepads.right;
		const leftGamepad = this.world.input.xr.gamepads.left;
		const leftStick = leftGamepad?.getAxesValues(InputComponent.Thumbstick);
		const rightStick = rightGamepad?.getAxesValues(InputComponent.Thumbstick);
		const triggerDown = rightGamepad?.getButtonPressed(InputComponent.Trigger) ?? false;
		const gripDown = rightGamepad?.getButtonDown(InputComponent.Squeeze) ?? false;

		const moveX = (this.keys.has('a') || this.keys.has('arrowleft') ? -1 : 0) +
			(this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) +
			(leftStick?.x || 0);
		const moveZ = (this.keys.has('w') || this.keys.has('arrowup') ? -1 : 0) +
			(this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0) +
			(leftStick?.y || 0);

		const aimH = (this.keys.has('q') ? -1 : 0) + (this.keys.has('e') ? 1 : 0) +
			(rightStick?.x || 0);
		this.aimAngleH += aimH * 2 * delta;

		const fireKey = this.keys.has(' ') || this.keys.has('f');
		if ((fireKey || triggerDown) && this.state === STATE_PLAYING) {
			this.firePlayerCannon();
		}

		const pauseKey = this.keys.has('escape') || this.keys.has('p') || gripDown;
		if (pauseKey && !this.prevPauseKey) {
			if (this.state === STATE_PLAYING) this.pauseGame();
			else if (this.state === STATE_PAUSED) this.resumeGame();
		}
		this.prevPauseKey = pauseKey;

		// Move player ship
		if (this.state === STATE_PLAYING && this.playerShipGroup) {
			this.playerMoveX = moveX;
			this.playerMoveZ = moveZ;

			this.playerShipGroup.position.x += moveX * this.playerSpeed * delta;
			this.playerShipGroup.position.z += moveZ * this.playerSpeed * delta;
			this.playerShipGroup.position.x = MathUtils.clamp(this.playerShipGroup.position.x, -40, 40);
			this.playerShipGroup.position.z = MathUtils.clamp(this.playerShipGroup.position.z, -40, 40);

			if (Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1) {
				const targetAngle = Math.atan2(moveX, -moveZ);
				this.playerAngle = MathUtils.lerp(this.playerAngle, targetAngle, 5 * delta);

				// Wake trail
				const scheme = getScheme(this.colorScheme);
				if (Math.random() < 0.3) {
					this.spawnWakeTrail(
						this.playerShipGroup.position.x - Math.sin(this.playerAngle) * 4 + (Math.random() - 0.5),
						this.playerShipGroup.position.z + Math.cos(this.playerAngle) * 4 + (Math.random() - 0.5),
						scheme,
					);
				}
			}
			this.playerShipGroup.rotation.y = this.playerAngle;

			// Ship roll when turning
			this.playerShipGroup.rotation.z = -moveX * 0.08;

			// Bob on water
			this.playerShipGroup.position.y = Math.sin(this.time * 1.5) * 0.15;

			// Follow camera
			this.baseCamPos.x = MathUtils.lerp(this.baseCamPos.x, this.playerShipGroup.position.x, 2 * delta);
			this.baseCamPos.z = MathUtils.lerp(this.baseCamPos.z, this.playerShipGroup.position.z + 15, 2 * delta);
			this.world.camera.position.x = this.baseCamPos.x;
			this.world.camera.position.z = this.baseCamPos.z;
			this.world.camera.lookAt(this.playerShipGroup.position.x, 2, this.playerShipGroup.position.z);
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

		this.updateEnemies(delta, time);
		this.updateCannonballs(delta);
		this.updateTreasures(delta);
		this.updateMines(delta);

		// Combo decay
		if (this.combo > 0) {
			this.comboTimer -= delta;
			if (this.comboTimer <= 0) this.combo = 0;
		}

		// Wave completion check
		if (this.enemiesRemaining <= 0 && this.enemiesSpawned >= this.enemiesTotal) {
			this.waveClearDelay += delta;
			if (this.waveClearDelay > 0.5) {
				this.waveComplete();
			}
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
				enemy.group.rotation.x += delta * 0.2;
				if (enemy.sinkTimer > 3) toRemove.push(i);
				continue;
			}

			const dx = playerPos.x - enemy.group.position.x;
			const dz = playerPos.z - enemy.group.position.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			// Dash cooldown
			if (enemy.dashCooldown > 0) enemy.dashCooldown -= delta;

			if (dist > enemy.engageRange) {
				// Move closer
				enemy.group.position.x += (dx / dist) * enemy.speed * delta;
				enemy.group.position.z += (dz / dist) * enemy.speed * delta;
			} else {
				// Circle strafe
				const circleAngle = Math.atan2(dz, dx) + (Math.PI / 2) * enemy.circleDir;
				enemy.group.position.x += Math.cos(circleAngle) * enemy.speed * 0.5 * delta;
				enemy.group.position.z += Math.sin(circleAngle) * enemy.speed * 0.5 * delta;

				// Occasional dash toward player (sloops only, hard difficulty)
				if (enemy.shipType === EnemyType.Sloop && this.difficulty === DIFF_HARD && enemy.dashCooldown <= 0 && dist < 15) {
					enemy.group.position.x += (dx / dist) * 8 * delta;
					enemy.group.position.z += (dz / dist) * 8 * delta;
					enemy.dashCooldown = 5;
				}

				// Change circle direction occasionally
				if (Math.random() < 0.002) enemy.circleDir *= -1;
			}

			// Face player
			enemy.group.lookAt(playerPos.x, 0, playerPos.z);
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
				hpBar.position.x = -(1 - ratio) * (enemy.hullWidth * 0.4);
			}

			// Boss special: repair at low HP
			if (enemy.shipType === EnemyType.ManOWar && enemy.hp < enemy.maxHp * 0.3 && Math.random() < 0.001) {
				enemy.hp = Math.min(enemy.hp + 5, enemy.maxHp);
			}
		}

		for (let i = toRemove.length - 1; i >= 0; i--) {
			this.enemies[toRemove[i]].group.removeFromParent();
			this.enemies.splice(toRemove[i], 1);
		}
	}

	private updateCannonballs(delta: number) {
		const playerPos = this.playerShipGroup?.position || new Vector3();
		const toRemove: number[] = [];

		for (let i = 0; i < this.cannonballs.length; i++) {
			const ball = this.cannonballs[i];
			ball.lifetime += delta;

			// Gravity
			ball.vy -= 9.8 * delta;

			// Move
			ball.mesh.position.x += ball.vx * delta;
			ball.mesh.position.y += ball.vy * delta;
			ball.mesh.position.z += ball.vz * delta;

			// Trail particles
			if (ball.lifetime < ball.maxLifetime && Math.random() < 0.4) {
				const scheme = getScheme(this.colorScheme);
				const trailGeo = new SphereGeometry(0.06, 4, 4);
				const trailColor = ball.isEnemy ? '#ff2222' : scheme.primary;
				const trailMat = new MeshStandardMaterial({
					color: trailColor, emissive: trailColor, emissiveIntensity: 1,
					transparent: true, opacity: 0.5,
				});
				const trailMesh = new Mesh(trailGeo, trailMat);
				trailMesh.position.copy(ball.mesh.position);
				this.world.scene.add(trailMesh);
				ball.trail.push(trailMesh);
				// Limit trail length
				if (ball.trail.length > 8) {
					ball.trail[0].removeFromParent();
					ball.trail.shift();
				}
			}

			// Fade trail
			for (let t = 0; t < ball.trail.length; t++) {
				const tm = ball.trail[t];
				const mat = tm.material as MeshStandardMaterial;
				mat.opacity *= 0.95;
				if (mat.opacity < 0.05) {
					tm.removeFromParent();
					ball.trail.splice(t, 1);
					t--;
				}
			}

			// Hit water
			if (ball.mesh.position.y < 0) {
				playSplash(this.volume);
				this.spawnExplosion(ball.mesh.position.x, 0.2, ball.mesh.position.z, 0.3);
				toRemove.push(i);
				continue;
			}

			if (ball.lifetime > ball.maxLifetime) {
				toRemove.push(i);
				continue;
			}

			if (ball.isEnemy) {
				// Hit player check
				const dx = ball.mesh.position.x - playerPos.x;
				const dz = ball.mesh.position.z - playerPos.z;
				const dist = Math.sqrt(dx * dx + dz * dz);
				if (dist < 3 && ball.mesh.position.y < 3) {
					this.playerHp -= ball.damage;
					playHit(this.volume);
					this.spawnExplosion(ball.mesh.position.x, ball.mesh.position.y, ball.mesh.position.z, 0.5);
					this.shakeIntensity = Math.max(this.shakeIntensity, 0.8);
					this.damageFlashTimer = 0.3;
					toRemove.push(i);
					if (this.playerHp <= 0) {
						this.playerHp = 0;
						this.endGame();
					}
					continue;
				}
			} else {
				// Hit enemies
				let hitSomething = false;
				for (let j = 0; j < this.enemies.length; j++) {
					const enemy = this.enemies[j];
					if (enemy.isSinking) continue;

					const dx = ball.mesh.position.x - enemy.group.position.x;
					const dz = ball.mesh.position.z - enemy.group.position.z;
					const hitRadius = enemy.hullWidth * 0.8;
					const dist = Math.sqrt(dx * dx + dz * dz);

					if (dist < hitRadius && ball.mesh.position.y < 5) {
						enemy.hp -= ball.damage;
						playHit(this.volume);
						this.spawnExplosion(ball.mesh.position.x, ball.mesh.position.y, ball.mesh.position.z, 0.6);

						if (enemy.hp <= 0) {
							this.sinkEnemy(enemy);
						}

						if (!this.cannonPierce) {
							hitSomething = true;
							toRemove.push(i);
						}
						break;
					}
				}

				// Hit mines
				if (!hitSomething) {
					for (let j = 0; j < this.mines.length; j++) {
						const mine = this.mines[j];
						const dx = ball.mesh.position.x - mine.px;
						const dz = ball.mesh.position.z - mine.pz;
						if (Math.sqrt(dx * dx + dz * dz) < 1.5) {
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
		}

		// Remove in reverse order
		const uniqueRemove = [...new Set(toRemove)].sort((a, b) => b - a);
		for (const idx of uniqueRemove) {
			if (idx < this.cannonballs.length) {
				const ball = this.cannonballs[idx];
				ball.mesh.removeFromParent();
				for (const t of ball.trail) t.removeFromParent();
				this.cannonballs.splice(idx, 1);
			}
		}
	}

	private sinkEnemy(enemy: EnemyData) {
		enemy.isSinking = true;
		this.enemiesRemaining--;
		this.sessionKills++;

		// Combo
		this.combo++;
		this.comboTimer = 3;
		if (this.combo > this.maxCombo) this.maxCombo = this.combo;
		playCombo(this.combo, this.volume);

		const multiplier = Math.min(1 + this.combo * 0.25, 3);
		const points = Math.round(enemy.scoreValue * multiplier);
		this.score += points;

		playShipSink(this.volume);
		this.spawnExplosion(enemy.group.position.x, 1, enemy.group.position.z, 1.5);
		this.spawnScorePopup(enemy.group.position.x, 2, enemy.group.position.z, points);

		// Treasure drop
		const treasureValue = enemy.shipType === EnemyType.ManOWar ? 200 :
			enemy.shipType === EnemyType.Galleon ? 100 :
			enemy.shipType === EnemyType.Brigantine ? 60 : 30;
		this.spawnTreasure(enemy.group.position.x, enemy.group.position.z, treasureValue);

		if (enemy.shipType === EnemyType.ManOWar) {
			this.stats.bossesDefeated++;
			this.bossActive = false;
			// Chain explosions for boss
			for (let k = 0; k < 5; k++) {
				const ex = enemy.group.position.x + (Math.random() - 0.5) * 6;
				const ez = enemy.group.position.z + (Math.random() - 0.5) * 6;
				setTimeout(() => {
					this.spawnExplosion(ex, Math.random() * 3, ez, 1 + Math.random());
					playExplosion(this.volume);
				}, k * 200);
			}
			// Extra treasure from boss
			for (let t = 0; t < 3; t++) {
				this.spawnTreasure(
					enemy.group.position.x + (Math.random() - 0.5) * 5,
					enemy.group.position.z + (Math.random() - 0.5) * 5,
					100,
				);
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
			t.group.position.y = 0.3 + Math.sin(t.bobPhase) * 0.15;
			t.group.rotation.y += delta;

			const dx = playerPos.x - t.px;
			const dz = playerPos.z - t.pz;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist < 5) {
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
					this.spawnScorePopup(t.px, 1, t.pz, t.value);
					toRemove.push(i);
					continue;
				}
			}

			if (t.lifetime > 15) {
				t.group.position.y -= (t.lifetime - 15) * delta * 2;
				const mat = (t.group.children[1] as Mesh).material as MeshStandardMaterial;
				mat.opacity = Math.max(0, 1 - (t.lifetime - 15) / 3);
				if (t.lifetime > 18) toRemove.push(i);
			}
		}

		for (let i = toRemove.length - 1; i >= 0; i--) {
			this.treasures[toRemove[i]].group.removeFromParent();
			this.treasures.splice(toRemove[i], 1);
		}
	}

	private updateMines(delta: number) {
		const playerPos = this.playerShipGroup?.position || new Vector3();

		for (let i = this.mines.length - 1; i >= 0; i--) {
			const mine = this.mines[i];
			mine.bobPhase += delta;
			mine.group.position.y = 0.3 + Math.sin(mine.bobPhase * 1.5) * 0.1;
			mine.group.rotation.y += delta * 0.5;

			const dx = playerPos.x - mine.px;
			const dz = playerPos.z - mine.pz;
			if (Math.sqrt(dx * dx + dz * dz) < 3) {
				this.spawnExplosion(mine.px, 0.5, mine.pz, 2);
				playMineExplode(this.volume);
				this.playerHp -= 20;
				this.shakeIntensity = Math.max(this.shakeIntensity, 1.5);
				this.damageFlashTimer = 0.4;
				mine.group.removeFromParent();
				this.mines.splice(i, 1);
				if (this.playerHp <= 0) {
					this.playerHp = 0;
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

			for (const child of ex.group.children) {
				child.position.multiplyScalar(1 + delta * 3);
				const mat = (child as Mesh).material as MeshStandardMaterial;
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

	private updateScorePopups(delta: number) {
		for (let i = this.scorePopups.length - 1; i >= 0; i--) {
			const sp = this.scorePopups[i];
			sp.timer += delta;
			sp.mesh.position.y += sp.vy * delta;
			const mat = sp.mesh.material as MeshStandardMaterial;
			mat.opacity = Math.max(0, 1 - sp.timer / 1.5);
			sp.mesh.scale.setScalar(1 + sp.timer);

			if (sp.timer > 1.5) {
				sp.mesh.removeFromParent();
				this.scorePopups.splice(i, 1);
			}
		}
	}

	private updateWakeParticles(delta: number) {
		for (let i = this.wakeParticles.length - 1; i >= 0; i--) {
			const w = this.wakeParticles[i];
			w.life += delta;
			w.mesh.position.x += w.vx * delta;
			w.mesh.position.z += w.vz * delta;
			const mat = w.mesh.material as MeshStandardMaterial;
			mat.opacity = Math.max(0, 0.5 * (1 - w.life / w.maxLife));

			if (w.life > w.maxLife) {
				w.mesh.removeFromParent();
				this.wakeParticles.splice(i, 1);
			}
		}
	}

	private updateAmbientParticles(delta: number, time: number) {
		for (const p of this.ambientParticles) {
			p.life += delta;
			p.mesh.position.x += p.vx * delta;
			p.mesh.position.z += p.vz * delta;
			p.mesh.position.y = 0.5 + Math.sin(time + p.life * 2) * 0.3 + Math.sin(p.life * 0.7) * 0.5;

			// Wrap around
			if (p.mesh.position.x > 35) p.mesh.position.x = -35;
			if (p.mesh.position.x < -35) p.mesh.position.x = 35;
			if (p.mesh.position.z > 35) p.mesh.position.z = -35;
			if (p.mesh.position.z < -35) p.mesh.position.z = 35;
		}
	}

	private updateDamageFlash(delta: number) {
		if (this.damageFlashTimer > 0) {
			this.damageFlashTimer -= delta;
			if (this.damageOverlay) {
				const mat = this.damageOverlay.material as MeshStandardMaterial;
				mat.opacity = Math.max(0, this.damageFlashTimer * 0.5);
			}
		}
	}

	private updateAimReticle() {
		if (!this.aimReticle || !this.playerShipGroup) return;
		const px = this.playerShipGroup.position.x;
		const pz = this.playerShipGroup.position.z;
		this.aimReticle.position.x = px + Math.sin(this.aimAngleH) * 8;
		this.aimReticle.position.z = pz - Math.cos(this.aimAngleH) * 8;
		this.aimReticle.position.y = 0.5 + Math.sin(this.time * 3) * 0.1;
		this.aimReticle.rotation.y += 0.02;

		// Only visible during gameplay
		this.aimReticle.visible = this.state === STATE_PLAYING;
	}

	private waveComplete() {
		this.state = STATE_WAVE_CLEAR;
		this.waveClearDelay = 0;
		this.stats.totalWavesCompleted++;
		saveStats(this.stats);

		playWaveComplete(this.volume);

		const waveBonus = 50 + this.wave * 20;
		this.playerGold += waveBonus;
		this.score += waveBonus;

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
			const z = pos.getY(i); // PlaneGeometry rotated, Y is original Z
			const wave1 = Math.sin(x * 0.05 + time * 0.8) * 0.3;
			const wave2 = Math.sin(z * 0.07 + time * 0.6) * 0.2;
			const wave3 = Math.sin((x + z) * 0.03 + time * 1.2) * 0.15;
			pos.setZ(i, wave1 + wave2 + wave3);
		}
		pos.needsUpdate = true;
	}
}
