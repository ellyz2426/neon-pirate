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
	MeshBasicMaterial,
	SphereGeometry,
	CylinderGeometry,
	BoxGeometry,
	ConeGeometry,
	RingGeometry,
	Group,
	AdditiveBlending,
	DoubleSide,
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
	playDash,
	playPowerUpCollect,
	playLightningStrike,
	playBarrelBreak,
	playSplashImpact,
	playWhirlpoolHum,
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

interface PowerUpData {
	group: Group;
	type: number; // 0=speed, 1=damage, 2=shield, 3=repair, 4=multishot
	px: number;
	pz: number;
	bobPhase: number;
	lifetime: number;
}

interface WhirlpoolData {
	group: Group;
	px: number;
	pz: number;
	strength: number;
	rotationSpeed: number;
	lifetime: number;
	maxLifetime: number;
}

// Power-up types
const PU_SPEED = 0;
const PU_DAMAGE = 1;
const PU_SHIELD = 2;
const PU_REPAIR = 3;
const PU_MULTISHOT = 4;

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
	private gameStartTime = 0;

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

	// Tutorial panel
	private tutorialPanel: UIKitMLAsset | undefined;

	// Power-ups
	private powerUps: PowerUpData[] = [];
	private activePowerUps: { type: number; timer: number; duration: number }[] = [];
	private shieldMesh: Mesh | null = null;

	// Whirlpools
	private whirlpools: WhirlpoolData[] = [];

	// Dash ability
	private dashCooldown = 0;
	private dashTimer = 0;
	private isDashing = false;
	private dashInvincible = false;
	private prevDashKey = false;

	// Muzzle flash
	private muzzleFlashes: { mesh: Mesh; timer: number }[] = [];

	// Water foam particles around ship
	private foamParticles: { mesh: Mesh; life: number; maxLife: number; ox: number; oz: number }[] = [];

	// Lightning effect during boss waves
	private lightningTimer = 0;
	private lightningFlash: Mesh | null = null;

	// Floating barrels (destructible obstacles)
	private barrels: { mesh: Mesh; px: number; pz: number; hp: number; bobPhase: number }[] = [];

	// Water column splash effect
	private splashes: { group: Group; timer: number }[] = [];

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

		// Tutorial
		this.tutorialPanel = this.world.getSceneObject<UIKitMLAsset>('tutorial-panel');
		this.menuPanel?.getElementById('btn-tutorial')?.addEventListener('click', () => {
			playMenuSelect(this.volume); this.showPanel('tutorial');
		});
		this.tutorialPanel?.getElementById('btn-tutorial-back')?.addEventListener('click', () => {
			playMenuSelect(this.volume); this.showPanel('menu');
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
			tutorial: this.tutorialPanel,
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
		this.gameStartTime = this.time;
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

		// Whirlpools on wave 5+
		if (this.wave >= 5) {
			const wpCount = Math.min(Math.floor((this.wave - 3) / 3), 3);
			for (let i = 0; i < wpCount; i++) {
				this.spawnWhirlpool();
			}
		}

		// Floating barrels
		const barrelCount = Math.min(2 + Math.floor(this.wave / 2), 8);
		for (let i = 0; i < barrelCount; i++) {
			this.spawnBarrel();
		}

		// Formation spawn on wave 4+
		if (this.wave >= 4 && !isBoss && Math.random() < 0.4) {
			this.spawnFormation();
		}

		// Wave announcement
		if (isBoss) {
			this.showWaveAnnouncement(`⚓ WAVE ${this.wave} — BOSS INCOMING ⚓`);
		} else if (this.wave % 10 === 0) {
			this.showWaveAnnouncement(`WAVE ${this.wave} — THE ARMADA GROWS`);
		} else {
			this.showWaveAnnouncement(`WAVE ${this.wave}`);
		}

		const bpm = 100 + Math.min(this.wave * 5, 60);
		setBPM(bpm, this.volume);
	}

	private spawnFormation() {
		// Spawn 3-5 ships in a V or line formation
		const count = 3 + Math.floor(Math.random() * 3);
		const angle = Math.random() * Math.PI * 2;
		const dist = 40;
		const centerX = Math.cos(angle) * dist;
		const centerZ = Math.sin(angle) * dist;
		const perpX = -Math.sin(angle);
		const perpZ = Math.cos(angle);
		const isV = Math.random() < 0.5;

		for (let i = 0; i < count; i++) {
			const offset = (i - (count - 1) / 2) * 5;
			const fwdOffset = isV ? Math.abs(offset) * 0.5 : 0;
			const sx = centerX + perpX * offset + Math.cos(angle) * fwdOffset;
			const sz = centerZ + perpZ * offset + Math.sin(angle) * fwdOffset;

			const scheme = getScheme(this.colorScheme);
			const diffMult = [0.7, 1.0, 1.4][this.difficulty];
			const type = this.wave < 5 ? EnemyType.Sloop : EnemyType.Brigantine;
			const group = createEnemyShip(type, scheme);
			group.position.set(sx, 0, sz);
			group.lookAt(0, 0, 0);
			this.world.scene.add(group);

			const hpMult = type === EnemyType.Brigantine ? 1.3 : 1;
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
				speed: type === EnemyType.Sloop ? 3 + this.wave * 0.1 : 2.5,
				damage: 10 * diffMult,
				fireRate: type === EnemyType.Sloop ? 2.5 : 2.0,
				lastFireTime: this.time + Math.random() * 2,
				shipType: type,
				engageRange: 20 + Math.random() * 10,
				scoreValue: type === EnemyType.Brigantine ? 200 : 100,
				isSinking: false,
				sinkTimer: 0,
				hullWidth: hullWidths[type],
				circleDir: Math.random() < 0.5 ? 1 : -1,
				dashCooldown: 0,
			});

			// These don't count toward spawn quota — they're bonus enemies
			this.enemiesRemaining++;
			this.enemiesTotal++;
		}
	}

	// Wave announcement visual
	private waveAnnounceMesh: Mesh | null = null;
	private waveAnnounceTimer = 0;

	private showWaveAnnouncement(text: string) {
		// Create a floating announcement sphere that pulses
		if (this.waveAnnounceMesh) this.waveAnnounceMesh.removeFromParent();
		const scheme = getScheme(this.colorScheme);
		this.waveAnnounceMesh = new Mesh(
			new SphereGeometry(0.5, 8, 6),
			new MeshStandardMaterial({
				color: scheme.primary,
				emissive: scheme.primary,
				emissiveIntensity: 3,
				transparent: true,
				opacity: 1,
			}),
		);
		if (this.playerShipGroup) {
			this.waveAnnounceMesh.position.set(
				this.playerShipGroup.position.x,
				6,
				this.playerShipGroup.position.z - 3,
			);
		} else {
			this.waveAnnounceMesh.position.set(0, 6, -3);
		}
		this.scene.add(this.waveAnnounceMesh);
		this.waveAnnounceTimer = 2.5;
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
		this.resultsPanel?.getElementById('result-combo')?.setProperties({ text: `Best Combo: ${this.maxCombo}x` });
		this.resultsPanel?.getElementById('result-cannons')?.setProperties({ text: `Cannons Fired: ${this.sessionCannonsFired}` });
		const accuracy = this.sessionCannonsFired > 0
			? Math.round((this.sessionKills / this.sessionCannonsFired) * 100) : 0;
		this.resultsPanel?.getElementById('result-accuracy')?.setProperties({ text: `Accuracy: ${accuracy}%` });
		const elapsed = Math.floor(this.time - (this.gameStartTime || 0));
		const mins = Math.floor(elapsed / 60);
		const secs = elapsed % 60;
		this.resultsPanel?.getElementById('result-time')?.setProperties({ text: `Time: ${mins}:${secs.toString().padStart(2, '0')}` });

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
		for (const pu of this.powerUps) pu.group.removeFromParent();
		this.powerUps = [];
		for (const wp of this.whirlpools) wp.group.removeFromParent();
		this.whirlpools = [];
		this.activePowerUps = [];
		for (const mf of this.muzzleFlashes) mf.mesh.removeFromParent();
		this.muzzleFlashes = [];
		for (const b of this.barrels) b.mesh.removeFromParent();
		this.barrels = [];
		for (const s of this.splashes) s.group.removeFromParent();
		this.splashes = [];
		if (this.lightningFlash) { this.lightningFlash.removeFromParent(); this.lightningFlash = null; }
		if (this.waveAnnounceMesh) { this.waveAnnounceMesh.removeFromParent(); this.waveAnnounceMesh = null; }
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

		const speed = this.hasPowerUp(PU_SPEED) ? 32 : 25;
		const dmgMult = this.hasPowerUp(PU_DAMAGE) ? 2 : 1;
		const extraShot = this.hasPowerUp(PU_MULTISHOT);
		const spreadAngles: number[] = [];
		const baseSpread = extraShot ? Math.max(this.cannonSpread + 1, 3) : this.cannonSpread;
		if (baseSpread === 1) {
			spreadAngles.push(0);
		} else if (baseSpread === 2) {
			spreadAngles.push(-0.1, 0.1);
		} else if (baseSpread === 3) {
			spreadAngles.push(-0.15, 0, 0.15);
		} else {
			spreadAngles.push(-0.2, -0.07, 0.07, 0.2);
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

			// Muzzle flash
			this.spawnMuzzleFlash(startX, 2.2, startZ);

			this.cannonballs.push({
				mesh, vx, vy, vz,
				damage: this.cannonDamage * dmgMult,
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
		const baseVx = (dx / dist) * speed;
		const baseVz = (dz / dist) * speed;

		// Type-specific fire patterns
		if (enemy.shipType === EnemyType.ManOWar) {
			// Boss: 3 aimed shots + 2 random scatter
			for (let s = 0; s < 5; s++) {
				const spreadAngle = s < 3 ? (s - 1) * 0.12 : (Math.random() - 0.5) * 0.6;
				const cos = Math.cos(spreadAngle);
				const sin = Math.sin(spreadAngle);
				const svx = baseVx * cos - baseVz * sin;
				const svz = baseVx * sin + baseVz * cos;
				const mesh = createCannonball(true, scheme);
				mesh.position.set(enemy.group.position.x, 2, enemy.group.position.z);
				this.world.scene.add(mesh);
				this.spawnMuzzleFlash(enemy.group.position.x, 2.5, enemy.group.position.z);
				this.cannonballs.push({
					mesh, vx: svx + (Math.random() - 0.5), vy: 3 + Math.random(),
					vz: svz + (Math.random() - 0.5),
					damage: enemy.damage, isEnemy: true, lifetime: 0, maxLifetime: 5, trail: [],
				});
			}
		} else if (enemy.shipType === EnemyType.Brigantine) {
			// Brigantine: 2-shot spread
			for (let s = 0; s < 2; s++) {
				const spreadAngle = (s - 0.5) * 0.15;
				const cos = Math.cos(spreadAngle);
				const sin = Math.sin(spreadAngle);
				const svx = baseVx * cos - baseVz * sin;
				const svz = baseVx * sin + baseVz * cos;
				const mesh = createCannonball(true, scheme);
				mesh.position.set(enemy.group.position.x + (s - 0.5) * 2, 2, enemy.group.position.z);
				this.world.scene.add(mesh);
				this.cannonballs.push({
					mesh, vx: svx, vy: 3 + Math.random() * 0.5,
					vz: svz, damage: enemy.damage, isEnemy: true, lifetime: 0, maxLifetime: 4, trail: [],
				});
			}
		} else if (enemy.shipType === EnemyType.Galleon) {
			// Galleon: single heavy shot with high arc
			const mesh = createCannonball(true, scheme);
			mesh.position.set(enemy.group.position.x, 2, enemy.group.position.z);
			mesh.scale.setScalar(1.5);
			this.world.scene.add(mesh);
			this.cannonballs.push({
				mesh, vx: baseVx * 0.8, vy: 6,
				vz: baseVz * 0.8, damage: enemy.damage * 1.5, isEnemy: true, lifetime: 0, maxLifetime: 5, trail: [],
			});
		} else {
			// Sloop: single quick shot
			const mesh = createCannonball(true, scheme);
			mesh.position.set(enemy.group.position.x, 2, enemy.group.position.z);
			this.world.scene.add(mesh);
			this.cannonballs.push({
				mesh, vx: baseVx + (Math.random() - 0.5) * 2,
				vy: 3 + Math.random(), vz: baseVz + (Math.random() - 0.5) * 2,
				damage: enemy.damage, isEnemy: true, lifetime: 0, maxLifetime: 4, trail: [],
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

		// Active power-ups display
		const puNames = ['SPD', 'DMG', 'SHD', 'REP', 'MLT'];
		const puText = this.activePowerUps.map(p => `${puNames[p.type]} ${Math.ceil(p.timer)}s`).join(' | ');
		this.hudPanel?.getElementById('hud-powerups')?.setProperties({ text: puText });

		// Dash display
		const dashText = this.dashCooldown > 0 ? `Dash: ${this.dashCooldown.toFixed(1)}s` : 'Dash: Ready';
		this.hudPanel?.getElementById('hud-dash')?.setProperties({ text: dashText });
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
		const aButtonDown = rightGamepad?.getButtonDown(InputComponent.A_Button) ?? false;

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

			const effectiveSpeed = this.playerSpeed * (this.hasPowerUp(PU_SPEED) ? 1.8 : 1.0);
			this.playerShipGroup.position.x += moveX * effectiveSpeed * delta;
			this.playerShipGroup.position.z += moveZ * effectiveSpeed * delta;
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

			// Dash ability
			const dashKey = this.keys.has('shift') || aButtonDown;
			if (dashKey && !this.prevDashKey && this.dashCooldown <= 0 && (Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1)) {
				this.isDashing = true;
				this.dashTimer = 0.3;
				this.dashCooldown = 2.0;
				this.dashInvincible = true;
				playDash(this.volume);
			}
			this.prevDashKey = dashKey;

			if (this.isDashing) {
				this.dashTimer -= delta;
				const dashSpeed = 20;
				this.playerShipGroup.position.x += moveX * dashSpeed * delta;
				this.playerShipGroup.position.z += moveZ * dashSpeed * delta;
				this.playerShipGroup.position.x = MathUtils.clamp(this.playerShipGroup.position.x, -40, 40);
				this.playerShipGroup.position.z = MathUtils.clamp(this.playerShipGroup.position.z, -40, 40);

				// Dash trail
				const scheme = getScheme(this.colorScheme);
				this.spawnWakeTrail(this.playerShipGroup.position.x, this.playerShipGroup.position.z, scheme);

				if (this.dashTimer <= 0) {
					this.isDashing = false;
					this.dashInvincible = false;
				}
			}

			if (this.dashCooldown > 0) this.dashCooldown -= delta;

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
		this.updatePowerUps(delta);
		this.updateActivePowerUps(delta);
		this.updateWhirlpools(delta);
		this.updateMuzzleFlashes(delta);
		this.updateFoamParticles(delta);
		this.updateBarrels(delta);
		this.updateSplashes(delta);
		this.updateLightning(delta);
		this.updateWaveAnnouncement(delta);

		// Spawn random power-ups
		if (Math.random() < 0.002 * (1 + this.wave * 0.05) && this.powerUps.length < 3) {
			this.spawnPowerUp();
		}

		// Spawn foam around player ship
		if (this.playerShipGroup && Math.random() < 0.15) {
			this.spawnFoamParticle();
		}

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
				// Different behaviors by ship type
				if (enemy.shipType === EnemyType.Sloop) {
					// Sloops: fast flanking — orbit quickly, dash in on hard
					const orbitSpeed = enemy.speed * 0.8;
					const circleAngle = Math.atan2(dz, dx) + (Math.PI / 2) * enemy.circleDir;
					enemy.group.position.x += Math.cos(circleAngle) * orbitSpeed * delta;
					enemy.group.position.z += Math.sin(circleAngle) * orbitSpeed * delta;

					if (this.difficulty === DIFF_HARD && enemy.dashCooldown <= 0 && dist < 15) {
						enemy.group.position.x += (dx / dist) * 10 * delta;
						enemy.group.position.z += (dz / dist) * 10 * delta;
						enemy.dashCooldown = 4;
					}
				} else if (enemy.shipType === EnemyType.Galleon) {
					// Galleons: ram behavior — charge directly when close enough
					if (dist < 10 && enemy.dashCooldown <= 0) {
						// Ram charge
						enemy.group.position.x += (dx / dist) * enemy.speed * 2.5 * delta;
						enemy.group.position.z += (dz / dist) * enemy.speed * 2.5 * delta;
						// Ram hit
						if (dist < 4 && !this.dashInvincible && !this.hasPowerUp(PU_SHIELD)) {
							this.playerHp -= 15;
							this.damageFlashTimer = 0.3;
							this.shakeIntensity = Math.max(this.shakeIntensity, 1.5);
							playHit(this.volume);
							enemy.dashCooldown = 8;
							// Knockback player
							playerPos.x += (dx / dist) * -5;
							playerPos.z += (dz / dist) * -5;
						}
					} else {
						// Normal circle
						const circleAngle = Math.atan2(dz, dx) + (Math.PI / 2) * enemy.circleDir;
						enemy.group.position.x += Math.cos(circleAngle) * enemy.speed * 0.3 * delta;
						enemy.group.position.z += Math.sin(circleAngle) * enemy.speed * 0.3 * delta;
					}
				} else if (enemy.shipType === EnemyType.ManOWar) {
					// Boss: slow advance, tries to close distance
					if (dist > 8) {
						enemy.group.position.x += (dx / dist) * enemy.speed * 0.6 * delta;
						enemy.group.position.z += (dz / dist) * enemy.speed * 0.6 * delta;
					}
					// Slight orbit at close range
					const circleAngle = Math.atan2(dz, dx) + (Math.PI / 2) * enemy.circleDir;
					enemy.group.position.x += Math.cos(circleAngle) * enemy.speed * 0.2 * delta;
					enemy.group.position.z += Math.sin(circleAngle) * enemy.speed * 0.2 * delta;
				} else {
					// Brigantine: standard circle strafe
					const circleAngle = Math.atan2(dz, dx) + (Math.PI / 2) * enemy.circleDir;
					enemy.group.position.x += Math.cos(circleAngle) * enemy.speed * 0.5 * delta;
					enemy.group.position.z += Math.sin(circleAngle) * enemy.speed * 0.5 * delta;
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

			// Avoid whirlpools
			for (const wp of this.whirlpools) {
				const wx = enemy.group.position.x - wp.px;
				const wz = enemy.group.position.z - wp.pz;
				const wdist = Math.sqrt(wx * wx + wz * wz);
				if (wdist < 8 && wdist > 0.5) {
					enemy.group.position.x += (wx / wdist) * enemy.speed * delta;
					enemy.group.position.z += (wz / wdist) * enemy.speed * delta;
				}
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
				this.spawnSplash(ball.mesh.position.x, ball.mesh.position.z);
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
					// Check shield or dash invincibility
					const hasShield = this.activePowerUps.some(p => p.type === PU_SHIELD);
					if (this.dashInvincible || hasShield) {
						// Deflect
						this.spawnExplosion(ball.mesh.position.x, ball.mesh.position.y, ball.mesh.position.z, 0.3);
						toRemove.push(i);
						continue;
					}
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

				// Hit barrels
				if (!hitSomething) {
					for (let j = 0; j < this.barrels.length; j++) {
						const barrel = this.barrels[j];
						const dx = ball.mesh.position.x - barrel.mesh.position.x;
						const dz = ball.mesh.position.z - barrel.mesh.position.z;
						if (Math.sqrt(dx * dx + dz * dz) < 1.2) {
							barrel.hp -= ball.damage;
							toRemove.push(i);
							hitSomething = true;
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

	// ── Power-ups ──────────────────────────────────────────────
	private spawnPowerUp() {
		const type = Math.floor(Math.random() * 5);
		const px = (Math.random() - 0.5) * 70;
		const pz = (Math.random() - 0.5) * 70;
		const group = new Group();

		const scheme = getScheme(this.colorScheme);
		const colors = [0x00ffff, 0xff4444, 0x8888ff, 0x00ff88, 0xffaa00];
		const icons = ['SPD', 'DMG', 'SHD', 'REP', 'MLT'];
		const color = colors[type];

		// Glowing orb
		const orb = new Mesh(
			new SphereGeometry(0.6, 12, 8),
			new MeshBasicMaterial({ color, transparent: true, opacity: 0.7 }),
		);
		group.add(orb);

		// Outer ring
		const ring = new Mesh(
			new RingGeometry(0.8, 1.0, 16),
			new MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: DoubleSide }),
		);
		group.add(ring);

		group.position.set(px, 1.5, pz);
		this.scene.add(group);
		this.powerUps.push({ group, type, px, pz, bobPhase: Math.random() * Math.PI * 2, lifetime: 15 });
	}

	private updatePowerUps(delta: number) {
		if (!this.playerShipGroup) return;
		const playerPos = this.playerShipGroup.position;
		const toRemove: number[] = [];

		for (let i = 0; i < this.powerUps.length; i++) {
			const pu = this.powerUps[i];
			pu.lifetime -= delta;
			pu.bobPhase += delta * 3;
			pu.group.position.y = 1.5 + Math.sin(pu.bobPhase) * 0.5;
			pu.group.rotation.y += delta * 2;

			// Fade when expiring
			if (pu.lifetime < 3) {
				const children = pu.group.children as Mesh[];
				for (const ch of children) {
					if (ch.material && 'opacity' in ch.material) {
						(ch.material as MeshBasicMaterial).opacity = (pu.lifetime / 3) * 0.7;
					}
				}
			}

			if (pu.lifetime <= 0) {
				toRemove.push(i);
				continue;
			}

			// Player collection
			const dx = playerPos.x - pu.group.position.x;
			const dz = playerPos.z - pu.group.position.z;
			const dist = Math.sqrt(dx * dx + dz * dz);
			if (dist < 3) {
				this.activatePowerUp(pu.type);
				toRemove.push(i);
				playPowerUpCollect(this.volume);
				this.spawnExplosion(pu.group.position.x, pu.group.position.y, pu.group.position.z, 0.3);
			}
		}

		for (let i = toRemove.length - 1; i >= 0; i--) {
			this.powerUps[toRemove[i]].group.removeFromParent();
			this.powerUps.splice(toRemove[i], 1);
		}
	}

	private activatePowerUp(type: number) {
		if (!this.playerShipGroup) return;
		const durations = [8, 8, 10, 0, 6];
		const names = ['SPEED BOOST', 'DOUBLE DAMAGE', 'SHIELD', 'REPAIR', 'MULTISHOT'];
		this.spawnScorePopup(this.playerShipGroup.position.x, 5, this.playerShipGroup.position.z, 999);

		if (type === PU_REPAIR) {
			this.playerHp = Math.min(this.playerMaxHp, this.playerHp + Math.floor(this.playerMaxHp * 0.3));
			return;
		}

		// Remove existing of same type
		this.activePowerUps = this.activePowerUps.filter(p => p.type !== type);
		this.activePowerUps.push({ type, timer: durations[type], duration: durations[type] });

		// Shield visual
		if (type === PU_SHIELD) {
			if (!this.shieldMesh) {
				this.shieldMesh = new Mesh(
					new SphereGeometry(3.5, 16, 12),
					new MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.15, side: DoubleSide }),
				);
			}
			if (this.playerShipGroup) this.playerShipGroup.add(this.shieldMesh);
		}
	}

	private updateActivePowerUps(delta: number) {
		for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
			this.activePowerUps[i].timer -= delta;
			if (this.activePowerUps[i].timer <= 0) {
				if (this.activePowerUps[i].type === PU_SHIELD && this.shieldMesh) {
					this.shieldMesh.removeFromParent();
				}
				this.activePowerUps.splice(i, 1);
			}
		}

		// Shield pulse
		if (this.shieldMesh && this.shieldMesh.parent) {
			(this.shieldMesh.material as MeshBasicMaterial).opacity = 0.1 + Math.sin(this.time * 4) * 0.05;
		}
	}

	private hasPowerUp(type: number): boolean {
		return this.activePowerUps.some(p => p.type === type);
	}

	// ── Whirlpools ──────────────────────────────────────────────
	private spawnWhirlpool() {
		const px = (Math.random() - 0.5) * 60;
		const pz = (Math.random() - 0.5) * 60;

		// Don't spawn too close to player
		const psx = this.playerShipGroup?.position.x ?? 0;
		const psz = this.playerShipGroup?.position.z ?? 0;
		const dx = psx - px;
		const dz = psz - pz;
		if (Math.sqrt(dx * dx + dz * dz) < 15) return;

		const group = new Group();
		const maxLife = 20 + Math.random() * 15;

		// Spiral rings
		for (let r = 0; r < 4; r++) {
			const ring = new Mesh(
				new RingGeometry(2 + r * 1.5, 2.5 + r * 1.5, 24),
				new MeshBasicMaterial({ color: 0x0066aa, transparent: true, opacity: 0.3 - r * 0.05, side: DoubleSide }),
			);
			ring.rotation.x = -Math.PI / 2;
			ring.position.y = 0.1 + r * 0.05;
			group.add(ring);
		}

		group.position.set(px, 0.3, pz);
		this.scene.add(group);
		this.whirlpools.push({ group, px, pz, strength: 3 + this.wave * 0.3, rotationSpeed: 2, lifetime: 0, maxLifetime: maxLife });
	}

	private updateWhirlpools(delta: number) {
		if (!this.playerShipGroup) return;
		const playerPos = this.playerShipGroup.position;
		const toRemove: number[] = [];

		for (let i = 0; i < this.whirlpools.length; i++) {
			const wp = this.whirlpools[i];
			wp.lifetime += delta;
			wp.group.rotation.y += wp.rotationSpeed * delta;

			// Fade in/out
			const fadeIn = Math.min(wp.lifetime / 2, 1);
			const fadeOut = Math.max(0, 1 - (wp.lifetime - wp.maxLifetime + 3) / 3);
			const fade = Math.min(fadeIn, fadeOut);
			const children = wp.group.children as Mesh[];
			for (let c = 0; c < children.length; c++) {
				(children[c].material as MeshBasicMaterial).opacity = (0.3 - c * 0.05) * fade;
			}

			if (wp.lifetime >= wp.maxLifetime) {
				toRemove.push(i);
				continue;
			}

			// Pull player
			const dx = wp.px - playerPos.x;
			const dz = wp.pz - playerPos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);
			if (dist < 12 && dist > 0.5 && !this.isDashing) {
				const pull = (wp.strength / dist) * delta * fade;
				playerPos.x += (dx / dist) * pull;
				playerPos.z += (dz / dist) * pull;

				// Circular drag
				const tangentX = -dz / dist;
				const tangentZ = dx / dist;
				playerPos.x += tangentX * pull * 0.5;
				playerPos.z += tangentZ * pull * 0.5;
			}

			// Damage if too close
			if (dist < 3 && !this.dashInvincible) {
				this.playerHp -= delta * 5;
				this.damageFlashTimer = 0.2;
			}

			// Hum when player is near
			if (dist < 8 && Math.random() < 0.01) {
				playWhirlpoolHum(this.volume * 0.5);
			}

			// Pull enemies too
			for (const enemy of this.enemies) {
				const ex = wp.px - enemy.group.position.x;
				const ez = wp.pz - enemy.group.position.z;
				const edist = Math.sqrt(ex * ex + ez * ez);
				if (edist < 12 && edist > 0.5) {
					const pull = (wp.strength * 0.5 / edist) * delta * fade;
					enemy.group.position.x += (ex / edist) * pull;
					enemy.group.position.z += (ez / edist) * pull;
				}
			}
		}

		for (let i = toRemove.length - 1; i >= 0; i--) {
			this.whirlpools[toRemove[i]].group.removeFromParent();
			this.whirlpools.splice(toRemove[i], 1);
		}
	}

	// ── Muzzle Flashes ──────────────────────────────────────────
	private spawnMuzzleFlash(x: number, y: number, z: number) {
		const flash = new Mesh(
			new SphereGeometry(0.4, 6, 4),
			new MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.9 }),
		);
		flash.position.set(x, y, z);
		this.scene.add(flash);
		this.muzzleFlashes.push({ mesh: flash, timer: 0.08 });
	}

	private updateMuzzleFlashes(delta: number) {
		for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
			this.muzzleFlashes[i].timer -= delta;
			const f = this.muzzleFlashes[i];
			(f.mesh.material as MeshBasicMaterial).opacity = Math.max(0, f.timer / 0.08);
			f.mesh.scale.setScalar(1 + (0.08 - f.timer) * 8);
			if (f.timer <= 0) {
				f.mesh.removeFromParent();
				this.muzzleFlashes.splice(i, 1);
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

	// ── Water Foam Particles ──────────────────────────────────
	private spawnFoamParticle() {
		if (!this.playerShipGroup) return;
		const px = this.playerShipGroup.position.x + (Math.random() - 0.5) * 4;
		const pz = this.playerShipGroup.position.z + (Math.random() - 0.5) * 4;
		const mesh = new Mesh(
			new SphereGeometry(0.1 + Math.random() * 0.1, 4, 3),
			new MeshBasicMaterial({
				color: 0xaaddff, transparent: true, opacity: 0.4,
			}),
		);
		mesh.position.set(px, 0.05, pz);
		this.scene.add(mesh);
		const maxLife = 1.5 + Math.random();
		this.foamParticles.push({ mesh, life: maxLife, maxLife, ox: (Math.random() - 0.5) * 0.3, oz: (Math.random() - 0.5) * 0.3 });
	}

	private updateFoamParticles(delta: number) {
		for (let i = this.foamParticles.length - 1; i >= 0; i--) {
			const fp = this.foamParticles[i];
			fp.life -= delta;
			fp.mesh.position.x += fp.ox * delta;
			fp.mesh.position.z += fp.oz * delta;
			const t = fp.life / fp.maxLife;
			(fp.mesh.material as MeshBasicMaterial).opacity = t * 0.4;
			fp.mesh.scale.setScalar(1 + (1 - t) * 0.5);
			if (fp.life <= 0) {
				fp.mesh.removeFromParent();
				this.foamParticles.splice(i, 1);
			}
		}
	}

	// ── Floating Barrels ──────────────────────────────────────
	private spawnBarrel() {
		const px = (Math.random() - 0.5) * 70;
		const pz = (Math.random() - 0.5) * 70;
		const barrel = new Mesh(
			new CylinderGeometry(0.4, 0.4, 0.8, 8),
			new MeshStandardMaterial({
				color: 0x8B4513, emissive: 0x331100, emissiveIntensity: 0.3,
			}),
		);
		// Add bands
		const band1 = new Mesh(
			new CylinderGeometry(0.42, 0.42, 0.06, 8),
			new MeshStandardMaterial({ color: 0x666666, emissive: 0x333333, emissiveIntensity: 0.2 }),
		);
		band1.position.y = 0.2;
		barrel.add(band1);
		const band2 = band1.clone();
		band2.position.y = -0.2;
		barrel.add(band2);

		barrel.position.set(px, 0.3, pz);
		barrel.rotation.z = Math.random() * 0.3;
		this.scene.add(barrel);
		this.barrels.push({ mesh: barrel, px, pz, hp: 1, bobPhase: Math.random() * Math.PI * 2 });
	}

	private updateBarrels(delta: number) {
		for (let i = this.barrels.length - 1; i >= 0; i--) {
			const b = this.barrels[i];
			b.bobPhase += delta * 1.5;
			b.mesh.position.y = 0.3 + Math.sin(b.bobPhase) * 0.1;
			b.mesh.rotation.y += delta * 0.3;

			if (b.hp <= 0) {
				this.spawnExplosion(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z, 0.5);
				this.spawnSplash(b.mesh.position.x, b.mesh.position.z);
				playBarrelBreak(this.volume);
				// Drop treasure or power-up
				if (Math.random() < 0.3) {
					this.spawnTreasure(b.mesh.position.x, b.mesh.position.z, 30 + this.wave * 5);
				}
				b.mesh.removeFromParent();
				this.barrels.splice(i, 1);
			}
		}
	}

	// ── Water Splash ──────────────────────────────────────────
	private spawnSplash(x: number, z: number) {
		playSplashImpact(this.volume);
		const group = new Group();
		for (let i = 0; i < 8; i++) {
			const angle = (i / 8) * Math.PI * 2;
			const droplet = new Mesh(
				new SphereGeometry(0.08, 4, 3),
				new MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6 }),
			);
			droplet.position.set(Math.cos(angle) * 0.5, 0.5, Math.sin(angle) * 0.5);
			group.add(droplet);
		}
		// Central column
		const column = new Mesh(
			new CylinderGeometry(0.15, 0.3, 1, 6),
			new MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.4 }),
		);
		column.position.y = 0.5;
		group.add(column);

		group.position.set(x, 0.1, z);
		this.scene.add(group);
		this.splashes.push({ group, timer: 0 });
	}

	private updateSplashes(delta: number) {
		for (let i = this.splashes.length - 1; i >= 0; i--) {
			const s = this.splashes[i];
			s.timer += delta;
			const t = s.timer / 0.6;
			// Expand outward
			for (let c = 0; c < s.group.children.length - 1; c++) {
				const child = s.group.children[c];
				const angle = (c / 8) * Math.PI * 2;
				child.position.set(Math.cos(angle) * (0.5 + t * 2), 0.5 + t - t * t * 3, Math.sin(angle) * (0.5 + t * 2));
				(child as Mesh).scale.setScalar(1 - t);
			}
			// Column shrinks
			const col = s.group.children[s.group.children.length - 1] as Mesh;
			col.scale.y = Math.max(0, 1 - t * 2);
			(col.material as MeshBasicMaterial).opacity = Math.max(0, 0.4 * (1 - t));

			if (s.timer >= 0.6) {
				s.group.removeFromParent();
				this.splashes.splice(i, 1);
			}
		}
	}

	// ── Lightning Effect (Boss Waves) ──────────────────────────
	private updateWaveAnnouncement(delta: number) {
		if (this.waveAnnounceMesh && this.waveAnnounceTimer > 0) {
			this.waveAnnounceTimer -= delta;
			const t = this.waveAnnounceTimer / 2.5;
			this.waveAnnounceMesh.position.y = 6 + (1 - t) * 2;
			const scale = 0.3 + Math.sin(this.time * 8) * 0.1 + t * 0.5;
			this.waveAnnounceMesh.scale.setScalar(scale);
			(this.waveAnnounceMesh.material as MeshStandardMaterial).opacity = Math.min(1, t * 2);
			if (this.waveAnnounceTimer <= 0) {
				this.waveAnnounceMesh.removeFromParent();
				this.waveAnnounceMesh = null;
			}
		}
	}

	private updateLightning(delta: number) {

		const isBossWave = this.wave % 5 === 0 && this.enemies.some(e => e.shipType === EnemyType.ManOWar);
		if (!isBossWave) {
			if (this.lightningFlash) { this.lightningFlash.removeFromParent(); this.lightningFlash = null; }
			return;
		}

		this.lightningTimer -= delta;
		if (this.lightningTimer <= 0) {
			// Random lightning flash
			this.lightningTimer = 3 + Math.random() * 5;

			if (!this.lightningFlash) {
				this.lightningFlash = new Mesh(
					new BoxGeometry(200, 200, 0.1),
					new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
				);
				this.lightningFlash.position.set(0, 50, 0);
				this.lightningFlash.rotation.x = -Math.PI / 2;
				this.scene.add(this.lightningFlash);
			}
			(this.lightningFlash.material as MeshBasicMaterial).opacity = 0.15 + Math.random() * 0.1;
			playLightningStrike(this.volume);
		}

		if (this.lightningFlash) {
			const mat = this.lightningFlash.material as MeshBasicMaterial;
			if (mat.opacity > 0) {
				mat.opacity *= Math.exp(-12 * delta);
				if (mat.opacity < 0.005) mat.opacity = 0;
			}
		}
	}
}
