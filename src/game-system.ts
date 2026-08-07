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
	createCompass,
	createIsland,
	createSeagull,
	createRadarBlip,
	createKrakenTentacle,
	createKrakenHead,
	createHarpoon,
	createRopeSegment,
	createWreckage,
	createGhostShip,
	createMoonMesh,
	createMerchantShip,
	createCoralReef,
	createLavaRock,
	createWakeFoam,
	createSprayParticle,
	createSeaFortress,
	createIceberg,
	createWaterspout,
	createSeaSerpentHead,
	createSeaSerpentSegment,
	createMortarShell,
	createChainShot,
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
	playThunder,
	playTreasureMapFound,
	playKrakenRoar,
	playKrakenSweep,
	playHarpoonLaunch,
	playHarpoonHit,
	playWreckageCreak,
	playChainLightning,
	playRepairBurst,
	playBroadside,
	playGhostAppear,
	playBoarding,
	playChainExplosion,
	playFireIgnite,
	playSignalFlare,
	playVolcanoRumble,
	playLavaWhoosh,
	playMerchantHorn,
	playCrewHire,
	playLegendaryChest,
	playNightfall,
	playDawn,
	playFortressCannon,
	playFortressDestroyed,
	playIcebergHit,
	playWaterspoutSpin,
	playShipLogEntry,
	playSerpentHiss,
	playSerpentDeath,
	playSerpentBite,
	playMortarLaunch,
	playMortarImpact,
	playChainShotFire,
	playChainShotHit,
	playCannonSwitch,
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
	onFire: boolean;
	fireDOTTimer: number;
	fireParticles: Mesh[];
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
	rarity: number;
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

interface KrakenData {
	headGroup: Group;
	tentacles: { group: Group; baseAngle: number; sweepPhase: number }[];
	hp: number;
	maxHp: number;
	px: number;
	pz: number;
	phase: 'emerge' | 'idle' | 'sweep' | 'ink' | 'submerge';
	phaseTimer: number;
	sweepAngle: number;
	sweepDir: number;
	emergeProgress: number;
	attackCooldown: number;
}

interface HarpoonData {
	group: Group;
	vx: number;
	vz: number;
	lifetime: number;
	attached: boolean;
	attachedEnemy: EnemyData | null;
	ropeSegments: Mesh[];
	pullTimer: number;
}

interface WreckageData {
	group: Group;
	px: number;
	pz: number;
	bobPhase: number;
	lifetime: number;
	rotSpeed: number;
	driftX: number;
	driftZ: number;
}

interface MerchantData {
	group: Group;
	hp: number;
	maxHp: number;
	speed: number;
	px: number;
	pz: number;
	targetAngle: number;
	fleeing: boolean;
	fireRate: number;
	lastFireTime: number;
	isSinking: boolean;
	sinkTimer: number;
}

interface CoralReefData {
	group: Group;
	px: number;
	pz: number;
	radius: number;
}

interface LavaRockData {
	mesh: Mesh;
	vx: number;
	vy: number;
	vz: number;
	lifetime: number;
}

interface VolcanoEventData {
	islandIndex: number;
	timer: number;
	glowMesh: Mesh;
	rocks: LavaRockData[];
	spawned: number;
}

// Crew member types
const CREW_GUNNER = 0;   // faster cannon fire rate
const CREW_NAVIGATOR = 1; // speed boost
const CREW_DOCTOR = 2;    // passive heal
const CREW_LOOKOUT = 3;   // larger radar range

interface CrewMember {
	type: number;
	name: string;
}

// Sea fortress data
interface FortressData {
	group: Group;
	hp: number;
	maxHp: number;
	px: number;
	pz: number;
	wallsDestroyed: boolean[];
	turretCooldowns: number[];
	turretAngles: number[];
}

// Iceberg data
interface IcebergData {
	group: Group;
	px: number;
	pz: number;
	bobPhase: number;
}

// Waterspout data
interface WaterspoutData {
	group: Group;
	px: number;
	pz: number;
	lifetime: number;
	maxLifetime: number;
	rotSpeed: number;
	pullRadius: number;
}

// Ship log entry
interface ShipLogEntry {
	text: string;
	time: number; // game time when logged
}

// Sea Serpent data
interface SeaSerpentData {
	head: Group;
	segments: Group[];
	hp: number;
	maxHp: number;
	speed: number;
	damage: number;
	angle: number; // current heading
	turnRate: number;
	biteTimer: number; // cooldown for bite attack
	segmentPositions: { x: number; z: number; angle: number }[];
	isSinking: boolean;
	sinkTimer: number;
	scoreValue: number;
	undulatePhase: number;
}

// Cannon types
const CANNON_STANDARD = 0;
const CANNON_MORTAR = 1;
const CANNON_CHAIN = 2;
const CANNON_TYPE_COUNT = 3;

// Mortar projectile data
interface MortarData {
	mesh: Mesh;
	startX: number;
	startZ: number;
	targetX: number;
	targetZ: number;
	flightTime: number;
	elapsed: number;
	damage: number;
	splashRadius: number;
}

// Chain shot projectile data
interface ChainShotData {
	group: Group;
	vx: number;
	vz: number;
	lifetime: number;
	maxLifetime: number;
	damage: number;
	slowDuration: number;
}

// Treasure rarity
const RARITY_COMMON = 0;
const RARITY_RARE = 1;
const RARITY_LEGENDARY = 2;

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

	// Seagulls
	private seagulls: Group[] = [];

	// Compass
	private compass: Group | null = null;

	// Radar blips for minimap
	private radarBlips: { mesh: Mesh; enemy: EnemyData | null }[] = [];
	private radarScale = 0.02; // world units to radar units

	// Weather system
	private weatherState: 'calm' | 'cloudy' | 'storm' = 'calm';
	private weatherTimer = 0;
	private weatherTransition = 0;
	private targetFogDensity = 0.008;
	private currentFogDensity = 0.008;
	private rainParticles: { mesh: Mesh; vy: number; resetY: number }[] = [];
	private thunderTimer = 0;

	// Treasure map events
	private treasureMapMarker: Group | null = null;
	private treasureMapActive = false;
	private treasureMapX = 0;
	private treasureMapZ = 0;
	private treasureMapTimer = 0;
	private treasureMapBeacon: Mesh | null = null;

	// Kraken boss
	private kraken: KrakenData | null = null;
	private krakenActive = false;

	// Harpoon secondary weapon
	private harpoon: HarpoonData | null = null;
	private harpoonCooldown = 0;
	private prevHarpoonKey = false;

	// Ship wreckage
	private wreckages: WreckageData[] = [];

	// Captain abilities
	private captainAbility = 0; // 0=ChainLightning, 1=RepairBurst, 2=Broadside
	private abilityCooldowns = [0, 0, 0]; // seconds remaining per ability
	private readonly ABILITY_COOLDOWNS = [8, 12, 6]; // max cooldown per ability
	private prevAbilityKey = false;
	private prevAbilityCycleUp = false;
	private prevAbilityCycleDown = false;

	// Night sky
	private moonGroup: Group | null = null;
	private shootingStars: { mesh: Mesh; vx: number; vy: number; vz: number; life: number }[] = [];
	private shootingStarTimer = 0;

	// Ship damage visuals
	private smokeParticles: { mesh: Mesh; life: number; maxLife: number; vx: number; vy: number; vz: number }[] = [];
	private fireParticles: { mesh: Mesh; life: number; maxLife: number; baseX: number; baseZ: number }[] = [];

	// Boarding mechanic
	private boardingTarget: EnemyData | null = null;
	private boardingProgress = 0;
	private boardingPromptVisible = false;
	private prevBoardKey = false;
	private totalBoarded = 0;

	// Signal flare ability (replaces one captain slot)
	private signalFlareActive = false;
	private signalFlareTimer = 0;
	private signalFlareMesh: Mesh | null = null;

	// Merchant ships
	private merchants: MerchantData[] = [];
	private merchantReputation = 0; // tracks reputation bonus
	private shopDiscount = false; // 10% discount flag
	private totalMerchantAttacks = 0;
	private totalMerchantPasses = 0;

	// Coral reefs
	private coralReefs: CoralReefData[] = [];

	// Volcanic eruption event
	private volcanoEvent: VolcanoEventData | null = null;
	private backgroundIslands: Group[] = [];
	private lavaRocks: LavaRockData[] = [];

	// Crew system
	private crew: CrewMember[] = [];
	private crewGunners = 0;
	private crewNavigators = 0;
	private crewDoctors = 0;
	private crewLookouts = 0;
	private healAccumulator = 0; // for doctor passive heal timing

	// Day/night cycle
	private dayNightPhase = 0; // 0=day, progresses toward 1=night, then back
	private isNight = false;
	private dayNightTransition = 0; // 0-1 lerp factor
	private baseSkyColor = 0x0a1428;
	private nightSkyColor = 0x020408;
	private baseFogDensity = 0.008;
	private nightFogDensity = 0.018;
	private ambientLightRef: AmbientLight | null = null;
	private dirLightRef: DirectionalLight | null = null;

	// Spray particles for wakes
	private sprayParticles: { mesh: Mesh; life: number; maxLife: number; vx: number; vy: number; vz: number }[] = [];

	// Sea fortress
	private fortress: FortressData | null = null;
	private fortressActive = false;

	// Navigation hazards
	private icebergs: IcebergData[] = [];
	private waterspouts: WaterspoutData[] = [];

	// Sea serpents
	private seaSerpents: SeaSerpentData[] = [];
	private serpentSpawnTimer = 0;

	// Cannon type system
	private cannonType = CANNON_STANDARD;
	private prevCannonCycleKey = false;
	private mortars: MortarData[] = [];
	private chainShots: ChainShotData[] = [];

	// Ship visual upgrade tracking
	private totalUpgradeLevel = 0; // sum of cannon + hull + speed levels
	private shipUpgradeVisuals: Mesh[] = [];

	// Ship log
	private shipLog: ShipLogEntry[] = [];
	private logPanel: UIKitMLAsset | undefined;

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
		this.ambientLightRef = ambient;

		const dirLight = new DirectionalLight(new Color(scheme.primary), 0.3);
		dirLight.position.set(20, 30, -10);
		this.world.scene.add(dirLight);
		this.dirLightRef = dirLight;

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

		// Moon with glow
		this.moonGroup = createMoonMesh();
		this.moonGroup.position.set(-60, 55, -90);
		this.world.scene.add(this.moonGroup);

		// Background islands
		this.backgroundIslands = [];
		for (let i = 0; i < 4; i++) {
			const island = createIsland(scheme);
			const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
			const r = 80 + Math.random() * 30;
			island.position.set(Math.cos(angle) * r, -0.5, Math.sin(angle) * r);
			island.scale.setScalar(0.8 + Math.random() * 0.6);
			island.rotation.y = Math.random() * Math.PI * 2;
			this.world.scene.add(island);
			this.backgroundIslands.push(island);
		}

		// Seagulls
		for (let i = 0; i < 6; i++) {
			const gull = createSeagull();
			gull.position.set(
				(Math.random() - 0.5) * 80,
				15 + Math.random() * 15,
				(Math.random() - 0.5) * 80,
			);
			gull.userData = {
				baseX: gull.position.x,
				baseZ: gull.position.z,
				circleRadius: 10 + Math.random() * 20,
				circleSpeed: 0.2 + Math.random() * 0.3,
				wingPhase: Math.random() * Math.PI * 2,
			};
			this.world.scene.add(gull);
			this.seagulls.push(gull);
		}

		// Compass indicator (minimap)
		this.compass = createCompass(scheme);
		this.compass.position.set(0, 0.5, 0);
		this.compass.scale.setScalar(1.5);
		this.world.scene.add(this.compass);

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
		this.shopPanel?.getElementById('btn-hire-gunner')?.addEventListener('click', () => this.hireCrew(CREW_GUNNER));
		this.shopPanel?.getElementById('btn-hire-navigator')?.addEventListener('click', () => this.hireCrew(CREW_NAVIGATOR));
		this.shopPanel?.getElementById('btn-hire-doctor')?.addEventListener('click', () => this.hireCrew(CREW_DOCTOR));
		this.shopPanel?.getElementById('btn-hire-lookout')?.addEventListener('click', () => this.hireCrew(CREW_LOOKOUT));
		this.shopPanel?.getElementById('btn-shop-continue')?.addEventListener('click', () => {
			playMenuSelect(this.volume); this.startNextWave();
		});

		// Tutorial
		this.tutorialPanel = this.world.getSceneObject<UIKitMLAsset>('tutorial-panel');
		this.logPanel = this.world.getSceneObject<UIKitMLAsset>('log-panel');
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
			log: this.logPanel,
		};

		for (const [name, p] of Object.entries(panels)) {
			if (p) {
				// Log panel stays visible during gameplay alongside HUD
				p.visible = name === panel ||
					(panel === 'playing' && (name === 'hud' || name === 'log'));
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
		this.totalBoarded = 0;
		this.merchantReputation = 0;
		this.shopDiscount = false;
		this.totalMerchantAttacks = 0;
		this.totalMerchantPasses = 0;

		// Reset crew
		this.crew = [];
		this.crewGunners = 0;
		this.crewNavigators = 0;
		this.crewDoctors = 0;
		this.crewLookouts = 0;
		this.healAccumulator = 0;

		// Reset day/night
		this.dayNightPhase = 0;
		this.isNight = false;
		this.dayNightTransition = 0;

		// Reset ship log
		this.shipLog = [];

		// Reset fortress/hazards
		if (this.fortress) { this.fortress.group.removeFromParent(); this.fortress = null; }
		this.fortressActive = false;
		for (const berg of this.icebergs) berg.group.removeFromParent();
		this.icebergs = [];
		for (const ws of this.waterspouts) ws.group.removeFromParent();
		this.waterspouts = [];

		this.clearAllEntities();
		this.spawnPlayerShip();

		this.stats.totalGames++;
		saveStats(this.stats);

		this.startWave();
		this.showPanel('playing');
		startMusic(this.volume, 100);
		this.addLogEntry('⛵ Set sail! Good luck, Captain!');
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

		// Coral reefs — spawn once at wave 1, persist all game
		if (this.wave === 1) {
			this.spawnCoralReefs();
		}

		// Merchant ships — spawn between waves (wave 2+, not boss waves)
		if (this.wave >= 2 && !isBoss) {
			this.spawnMerchant();
		}

		// Volcanic island event — 10% chance per wave after wave 5
		if (this.wave > 5 && Math.random() < 0.1) {
			this.triggerVolcanoEvent();
		}

		// Sea fortress every 15th wave
		if (this.wave % 15 === 0 && !this.fortressActive) {
			this.spawnFortress();
		}

		// Icebergs — wave 8+, spawn 1-3
		if (this.wave >= 8 && Math.random() < 0.4) {
			const count = 1 + Math.floor(Math.random() * Math.min(3, Math.floor(this.wave / 8)));
			for (let i = 0; i < count; i++) {
				this.spawnIceberg();
			}
		}

		// Waterspouts — wave 10+, 25% chance
		if (this.wave >= 10 && Math.random() < 0.25) {
			this.spawnWaterspout();
		}

		// Wave announcement
		if (isBoss) {
			this.showWaveAnnouncement(`⚓ WAVE ${this.wave} — BOSS INCOMING ⚓`);
			this.addLogEntry(`⚓ Wave ${this.wave} — Boss incoming!`);
		} else if (this.wave % 10 === 0) {
			this.showWaveAnnouncement(`WAVE ${this.wave} — THE ARMADA GROWS`);
			this.addLogEntry(`Wave ${this.wave} — The armada grows`);
		} else {
			this.showWaveAnnouncement(`WAVE ${this.wave}`);
			if (this.wave > 1) this.addLogEntry(`Wave ${this.wave} begins`);
		}

		const bpm = 100 + Math.min(this.wave * 5, 60);
		setBPM(bpm, this.volume);

		// Weather transitions - storms on boss waves, random weather otherwise
		if (isBoss) {
			this.setWeather('storm');
		} else if (this.wave % 3 === 0) {
			this.setWeather('cloudy');
		} else {
			this.setWeather('calm');
		}

		// Kraken encounter on every 10th wave
		if (this.wave % 10 === 0) {
			setTimeout(() => this.spawnKraken(), 3000);
		}

		// Sea serpent encounter on waves 8, 13, 18, 23, ...
		if (this.wave >= 8 && (this.wave - 8) % 5 === 0) {
			const serpentCount = Math.min(1 + Math.floor((this.wave - 8) / 10), 3);
			for (let i = 0; i < serpentCount; i++) {
				setTimeout(() => this.spawnSeaSerpent(), 2000 + i * 3000);
			}
		}
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
				[EnemyType.GhostShip]: 2.2,
			[EnemyType.SeaSerpent]: 1.2,
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
				onFire: false,
				fireDOTTimer: 0,
				fireParticles: [],
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
		this.shopDiscount = false; // Consume one-time discount
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
		this.resultsPanel?.getElementById('result-boarded')?.setProperties({ text: this.totalBoarded > 0 ? `Boarded: ${this.totalBoarded}` : '' });
		const merchantTotal = this.totalMerchantAttacks + this.totalMerchantPasses;
		this.resultsPanel?.getElementById('result-merchants')?.setProperties({
			text: merchantTotal > 0 ? `Merchants: ${this.totalMerchantAttacks} raided / ${this.totalMerchantPasses} spared` : ''
		});
		this.resultsPanel?.getElementById('result-crew')?.setProperties({
			text: this.crew.length > 0 ? `Crew: ${this.crew.length} (G${this.crewGunners} N${this.crewNavigators} D${this.crewDoctors} L${this.crewLookouts})` : ''
		});

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
		// Clean up radar blips
		for (const blip of this.radarBlips) blip.mesh.removeFromParent();
		this.radarBlips = [];
		// Clean up rain
		for (const rp of this.rainParticles) rp.mesh.removeFromParent();
		this.rainParticles = [];
		// Clean up treasure map
		this.cleanupTreasureMap();
		// Clean up kraken
		this.cleanupKraken();
		// Clean up harpoon
		this.cleanupHarpoon();
		// Clean up wreckage
		for (const wr of this.wreckages) wr.group.removeFromParent();
		this.wreckages = [];
		// Clean up smoke/fire particles
		for (const sp of this.smokeParticles) sp.mesh.removeFromParent();
		this.smokeParticles = [];
		for (const fp of this.fireParticles) fp.mesh.removeFromParent();
		this.fireParticles = [];
		// Clean up boarding
		this.boardingTarget = null;
		// Clean up signal flare
		if (this.signalFlareMesh) { this.signalFlareMesh.removeFromParent(); this.signalFlareMesh = null; }
		this.signalFlareActive = false;
		// Clean up merchants
		for (const m of this.merchants) m.group.removeFromParent();
		this.merchants = [];
		// Clean up coral reefs
		for (const cr of this.coralReefs) cr.group.removeFromParent();
		this.coralReefs = [];
		// Clean up volcano event
		this.cleanupVolcanoEvent();
		// Clean up lava rocks
		for (const lr of this.lavaRocks) lr.mesh.removeFromParent();
		this.lavaRocks = [];
		// Clean up spray particles
		for (const sp of this.sprayParticles) sp.mesh.removeFromParent();
		this.sprayParticles = [];
		// Clean up fortress (if still active after clear)
		if (this.fortress) { this.fortress.group.removeFromParent(); this.fortress = null; }
		this.fortressActive = false;
		// Clean up icebergs
		for (const berg of this.icebergs) berg.group.removeFromParent();
		this.icebergs = [];
		// Clean up waterspouts
		for (const ws of this.waterspouts) ws.group.removeFromParent();
		this.waterspouts = [];
		// Clean up sea serpents
		for (const ss of this.seaSerpents) {
			ss.head.removeFromParent();
			for (const seg of ss.segments) seg.removeFromParent();
		}
		this.seaSerpents = [];
		// Clean up mortars
		for (const m of this.mortars) m.mesh.removeFromParent();
		this.mortars = [];
		// Clean up chain shots
		for (const cs of this.chainShots) cs.group.removeFromParent();
		this.chainShots = [];
		// Reset cannon type
		this.cannonType = CANNON_STANDARD;
		// Clean up ship upgrade visuals
		for (const v of this.shipUpgradeVisuals) v.removeFromParent();
		this.shipUpgradeVisuals = [];
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
			if (this.wave >= 7 && r < 0.15) {
				type = EnemyType.GhostShip;
			} else if (r < 0.3) {
				type = EnemyType.Sloop;
			} else if (r < 0.7) {
				type = EnemyType.Brigantine;
			} else {
				type = EnemyType.Galleon;
			}
		} else {
			const r = Math.random();
			if (r < 0.2) {
				type = EnemyType.GhostShip;
			} else if (r < 0.35) {
				type = EnemyType.Sloop;
			} else if (r < 0.6) {
				type = EnemyType.Brigantine;
			} else {
				type = EnemyType.Galleon;
			}
		}

		const group = type === EnemyType.GhostShip ? createGhostShip(scheme) : createEnemyShip(type, scheme);
		const angle = Math.random() * Math.PI * 2;
		const dist = 35 + Math.random() * 15;
		group.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
		group.lookAt(0, 0, 0);
		this.world.scene.add(group);

		if (type === EnemyType.GhostShip) {
			playGhostAppear(this.volume);
		}

		const hpMult = type === EnemyType.ManOWar ? 5 : type === EnemyType.GhostShip ? 1.5 : type === EnemyType.Galleon ? 2 : type === EnemyType.Brigantine ? 1.3 : 1;
		const baseHp = (30 + this.wave * 5) * hpMult * diffMult;
		const hullWidths: Record<EnemyType, number> = {
			[EnemyType.Sloop]: 1.8,
			[EnemyType.Brigantine]: 2.5,
			[EnemyType.Galleon]: 3,
			[EnemyType.ManOWar]: 4,
			[EnemyType.GhostShip]: 2.2,
			[EnemyType.SeaSerpent]: 1.2,
		};

		this.enemies.push({
			group,
			hp: baseHp,
			maxHp: baseHp,
			speed: type === EnemyType.GhostShip ? 2.8 + this.wave * 0.08 : type === EnemyType.Sloop ? 3 + this.wave * 0.1 : type === EnemyType.ManOWar ? 1.5 : type === EnemyType.Galleon ? 1.8 : 2.5,
			damage: (type === EnemyType.ManOWar ? 25 : type === EnemyType.GhostShip ? 12 : type === EnemyType.Galleon ? 15 : 10) * diffMult,
			fireRate: type === EnemyType.ManOWar ? 0.8 : type === EnemyType.GhostShip ? 1.8 : type === EnemyType.Galleon ? 1.5 : type === EnemyType.Brigantine ? 2.0 : 2.5,
			lastFireTime: this.time + Math.random() * 2,
			shipType: type,
			engageRange: type === EnemyType.ManOWar ? 30 : 20 + Math.random() * 10,
			scoreValue: type === EnemyType.ManOWar ? 1000 : type === EnemyType.GhostShip ? 400 : type === EnemyType.Galleon ? 300 : type === EnemyType.Brigantine ? 200 : 100,
			isSinking: false,
			sinkTimer: 0,
			circleDir: Math.random() < 0.5 ? 1 : -1,
			dashCooldown: 0,
			hullWidth: hullWidths[type],
			onFire: false,
			fireDOTTimer: 0,
			fireParticles: [],
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

		// Dispatch based on cannon type
		if (this.cannonType === CANNON_MORTAR) {
			this.fireMortar();
			return;
		}
		if (this.cannonType === CANNON_CHAIN) {
			this.fireChainShot();
			return;
		}

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
		} else if (enemy.shipType === EnemyType.GhostShip) {
			// Ghost ship: ethereal shot — slightly homing, ghostly color
			const mesh = createCannonball(true, scheme);
			mesh.position.set(enemy.group.position.x, 2, enemy.group.position.z);
			// Make it look ghostly
			const ballMat = mesh.material as MeshStandardMaterial;
			ballMat.color.set('#88ddff');
			ballMat.emissive.set('#88ddff');
			ballMat.transparent = true;
			ballMat.opacity = 0.6;
			this.world.scene.add(mesh);
			this.cannonballs.push({
				mesh, vx: baseVx * 1.1, vy: 3.5,
				vz: baseVz * 1.1, damage: enemy.damage, isEnemy: true, lifetime: 0, maxLifetime: 5, trail: [],
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

	private spawnTreasure(x: number, z: number, value: number, forceRarity?: number) {
		const scheme = getScheme(this.colorScheme);
		// Determine rarity based on value or forced rarity
		let rarity = RARITY_COMMON;
		if (forceRarity !== undefined) {
			rarity = forceRarity;
		} else if (value >= 200) {
			rarity = RARITY_LEGENDARY;
		} else if (value >= 80) {
			rarity = RARITY_RARE;
		}
		// Apply rarity value multiplier
		const valueMult = [1.0, 1.5, 3.0][rarity];
		const finalValue = Math.round(value * valueMult);

		const group = createTreasure(scheme, rarity);
		group.position.set(x, 0.5, z);
		this.world.scene.add(group);
		this.treasures.push({ group, value: finalValue, bobPhase: Math.random() * Math.PI * 2, lifetime: 0, px: x, pz: z, rarity });

		if (rarity === RARITY_LEGENDARY) {
			playLegendaryChest(this.volume);
		}
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
		const baseCosts: Record<string, number> = {
			cannon: 100 + this.cannonLevel * 50,
			hull: 100 + this.hullLevel * 50,
			speed: 100 + this.speedLevel * 50,
			repair: 50,
		};
		let cost = baseCosts[type] || 0;
		// Apply merchant reputation discount
		if (this.shopDiscount) {
			cost = Math.round(cost * 0.9);
		}
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

		this.totalUpgradeLevel = this.cannonLevel + this.hullLevel + this.speedLevel;
		this.refreshShipVisuals();
		this.updateShopPanel();
	}

	private hireCrew(type: number) {
		const crewNames = ['Gunner', 'Navigator', 'Doctor', 'Lookout'];
		const costs = [150, 180, 200, 120];
		let cost = costs[type];
		if (this.shopDiscount) cost = Math.round(cost * 0.9);
		if (this.playerGold < cost) return;

		this.playerGold -= cost;
		playCrewHire(this.volume);

		const member: CrewMember = { type, name: crewNames[type] };
		this.crew.push(member);
		this.addLogEntry(`🧑‍✈️ Hired ${crewNames[type]} (crew: ${this.crew.length})`);

		switch (type) {
			case CREW_GUNNER:
				this.crewGunners++;
				// Each gunner reduces fire rate by 8% (stacking)
				this.fireRate = Math.max(0.2, this.fireRate * 0.92);
				break;
			case CREW_NAVIGATOR:
				this.crewNavigators++;
				// Each navigator adds 0.4 speed
				this.playerSpeed += 0.4;
				break;
			case CREW_DOCTOR:
				this.crewDoctors++;
				break;
			case CREW_LOOKOUT:
				this.crewLookouts++;
				// Lookouts increase radar scale (makes enemies visible from further)
				this.radarScale = 0.02 + this.crewLookouts * 0.005;
				break;
		}

		this.updateShopPanel();
	}

	private updateShopPanel() {
		const discountMult = this.shopDiscount ? 0.9 : 1;
		const cannonCost = Math.round((100 + this.cannonLevel * 50) * discountMult);
		const hullCost = Math.round((100 + this.hullLevel * 50) * discountMult);
		const speedCost = Math.round((100 + this.speedLevel * 50) * discountMult);
		const repairCost = Math.round(50 * discountMult);
		const discountLabel = this.shopDiscount ? ' 🏪-10%' : '';

		this.shopPanel?.getElementById('shop-gold')?.setProperties({ text: `Gold: ${this.playerGold}${discountLabel}` });
		this.shopPanel?.getElementById('shop-cannon-info')?.setProperties({
			text: `Lv${this.cannonLevel}${this.cannonLevel >= 9 ? ' 🔥' : ''} → Lv${this.cannonLevel + 1}${this.cannonLevel + 1 >= 9 ? ' 🔥FIRE' : ''} (${cannonCost}g)`
		});
		this.shopPanel?.getElementById('shop-hull-info')?.setProperties({
			text: `Lv${this.hullLevel} → Lv${this.hullLevel + 1} (${hullCost}g)`
		});
		this.shopPanel?.getElementById('shop-speed-info')?.setProperties({
			text: `Lv${this.speedLevel} → Lv${this.speedLevel + 1} (${speedCost}g)`
		});
		this.shopPanel?.getElementById('shop-repair-info')?.setProperties({
			text: `HP: ${this.playerHp}/${this.playerMaxHp} (${repairCost}g)`
		});

		// Crew hire info
		const crewCosts = [150, 180, 200, 120];
		const crewCounts = [this.crewGunners, this.crewNavigators, this.crewDoctors, this.crewLookouts];
		const crewLabels = ['Gunner', 'Navigator', 'Doctor', 'Lookout'];
		const crewBonuses = ['-8% fire rate', '+0.4 speed', '+1 HP/s', '+radar range'];
		for (let c = 0; c < 4; c++) {
			const cc = Math.round(crewCosts[c] * discountMult);
			this.shopPanel?.getElementById(`shop-crew-${c}`)?.setProperties({
				text: `${crewLabels[c]} x${crewCounts[c]} (${cc}g) ${crewBonuses[c]}`
			});
		}
		this.shopPanel?.getElementById('shop-crew-count')?.setProperties({
			text: `Crew: ${this.crew.length}`
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

		// Active power-ups display with timers
		const puNames = ['SPD', 'DMG', 'SHD', 'REP', 'MLT'];
		const puIcons = ['🚀', '💥', '🛡', '❤', '🔫'];
		const puText = this.activePowerUps.map(p => `${puIcons[p.type]}${puNames[p.type]} ${Math.ceil(p.timer)}s`).join(' | ');
		this.hudPanel?.getElementById('hud-powerups')?.setProperties({ text: puText });

		// Dash display
		const dashText = this.dashCooldown > 0 ? `Dash: ${this.dashCooldown.toFixed(1)}s` : 'Dash: Ready';
		this.hudPanel?.getElementById('hud-dash')?.setProperties({ text: dashText });

		// Harpoon display
		const harpText = this.harpoon ? 'Harpoon: ACTIVE' :
			this.harpoonCooldown > 0 ? `Harpoon: ${this.harpoonCooldown.toFixed(1)}s` : 'Harpoon: Ready';
		this.hudPanel?.getElementById('hud-harpoon')?.setProperties({ text: harpText });

		// Captain ability display — show all 3 cooldowns
		const abilityNames = ['⚡ Chain', '🔧 Repair', '💥 Broad'];
		const abIdx = this.captainAbility;
		const abParts: string[] = [];
		for (let a = 0; a < 3; a++) {
			const cd = this.abilityCooldowns[a];
			const prefix = a === abIdx ? '►' : ' ';
			abParts.push(cd > 0 ? `${prefix}${abilityNames[a]}:${cd.toFixed(0)}s` : `${prefix}${abilityNames[a]}:RDY`);
		}
		this.hudPanel?.getElementById('hud-ability')?.setProperties({ text: abParts.join(' ') });

		// Kraken HP
		if (this.krakenActive && this.kraken) {
			this.hudPanel?.getElementById('hud-boss')?.setProperties({
				text: `KRAKEN: ${Math.round((this.kraken.hp / this.kraken.maxHp) * 100)}%`
			});
		}

		// Weather / treasure map info
		if (!this.treasureMapActive) {
			const weatherNames = { calm: '☀ Calm', cloudy: '☁ Cloudy', storm: '⛈ Storm' };
			const dayLabel = this.isNight ? '🌙 Night' : '☀ Day';
			this.hudPanel?.getElementById('hud-weather')?.setProperties({ text: `${weatherNames[this.weatherState]} | ${dayLabel}` });
		}

		// Crew display
		if (this.crew.length > 0) {
			this.hudPanel?.getElementById('hud-crew')?.setProperties({
				text: `Crew: ${this.crew.length} (G${this.crewGunners} N${this.crewNavigators} D${this.crewDoctors} L${this.crewLookouts})`
			});
		} else {
			this.hudPanel?.getElementById('hud-crew')?.setProperties({ text: '' });
		}

		// Cannon type display
		const cannonNames = ['⚔ Standard', '💣 Mortar', '⛓ Chain Shot'];
		this.hudPanel?.getElementById('hud-cannon-type')?.setProperties({
			text: `Cannon: ${cannonNames[this.cannonType]}`
		});

		// Sea serpent HP
		if (this.seaSerpents.length > 0) {
			const serpent = this.seaSerpents.find(s => !s.isSinking);
			if (serpent) {
				this.hudPanel?.getElementById('hud-boss')?.setProperties({
					text: `SERPENT: ${Math.round((serpent.hp / serpent.maxHp) * 100)}%`
				});
			}
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
		this.updateWeather(delta);
		this.updateRadarBlips();
		this.updateShootingStars(delta);

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

		// Harpoon secondary weapon (right-click or B button)
		const bButtonDown = rightGamepad?.getButtonDown(InputComponent.B_Button) ?? false;
		const harpoonKey = this.keys.has('r') || bButtonDown;
		if (harpoonKey && !this.prevHarpoonKey && this.state === STATE_PLAYING && this.harpoonCooldown <= 0 && !this.harpoon) {
			this.fireHarpoon();
		}
		this.prevHarpoonKey = harpoonKey;

		// Captain abilities: cycle with 1/2/3 keys or D-pad up/down, activate with X key / Y button
		const leftDpadUp = leftGamepad?.getButtonDown(InputComponent.Thumbstick) ?? false;
		const yButtonDown = rightGamepad?.getButtonDown(InputComponent.A_Button) ?? false; // use left Y
		const leftYButton = leftGamepad?.getButtonDown(InputComponent.A_Button) ?? false;
		const abilityActivateKey = this.keys.has('x') || leftYButton;
		const abilityCycleUp = this.keys.has('1') || this.keys.has('2') || this.keys.has('3') || leftDpadUp;
		if (this.keys.has('1')) this.captainAbility = 0;
		if (this.keys.has('2')) this.captainAbility = 1;
		if (this.keys.has('3')) this.captainAbility = 2;
		if (leftDpadUp && !this.prevAbilityCycleUp) {
			this.captainAbility = (this.captainAbility + 1) % 3;
		}
		this.prevAbilityCycleUp = leftDpadUp;
		if (abilityActivateKey && !this.prevAbilityKey && this.state === STATE_PLAYING && this.abilityCooldowns[this.captainAbility] <= 0) {
			this.activateCaptainAbility();
		}
		this.prevAbilityKey = abilityActivateKey;

		// Boarding input (G key / Y button on right controller)
		const boardKey = this.keys.has('g') || ((rightGamepad?.getButtonDown(InputComponent.B_Button) && leftGamepad?.getButtonPressed(InputComponent.Trigger)) ?? false);
		if (boardKey && !this.prevBoardKey && this.state === STATE_PLAYING && this.boardingTarget && !this.boardingTarget.isSinking) {
			this.executeBoarding();
		}
		this.prevBoardKey = boardKey ?? false;

		// Move player ship
		if (this.state === STATE_PLAYING && this.playerShipGroup) {
			this.playerMoveX = moveX;
			this.playerMoveZ = moveZ;

			const effectiveSpeed = this.playerSpeed * (this.hasPowerUp(PU_SPEED) ? 1.8 : 1.0) * this.getCoralSpeedMult(this.playerShipGroup.position.x, this.playerShipGroup.position.z);
			this.playerShipGroup.position.x += moveX * effectiveSpeed * delta;
			this.playerShipGroup.position.z += moveZ * effectiveSpeed * delta;
			this.playerShipGroup.position.x = MathUtils.clamp(this.playerShipGroup.position.x, -40, 40);
			this.playerShipGroup.position.z = MathUtils.clamp(this.playerShipGroup.position.z, -40, 40);

			if (Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1) {
				const targetAngle = Math.atan2(moveX, -moveZ);
				this.playerAngle = MathUtils.lerp(this.playerAngle, targetAngle, 5 * delta);

				// Wake trail — wider fan with foam particles
				const scheme = getScheme(this.colorScheme);
				if (Math.random() < 0.4) {
					// Main wake
					this.spawnWakeTrail(
						this.playerShipGroup.position.x - Math.sin(this.playerAngle) * 4 + (Math.random() - 0.5),
						this.playerShipGroup.position.z + Math.cos(this.playerAngle) * 4 + (Math.random() - 0.5),
						scheme,
					);
					// Side foam particles for V-wake
					const perpX = Math.cos(this.playerAngle);
					const perpZ = Math.sin(this.playerAngle);
					const side = Math.random() < 0.5 ? 1 : -1;
					const foam = createWakeFoam();
					const fx = this.playerShipGroup.position.x - Math.sin(this.playerAngle) * 3 + perpX * side * (1 + Math.random());
					const fz = this.playerShipGroup.position.z + Math.cos(this.playerAngle) * 3 + perpZ * side * (1 + Math.random());
					foam.position.set(fx, 0.08, fz);
					this.world.scene.add(foam);
					this.wakeParticles.push({
						mesh: foam,
						life: 0,
						maxLife: 2.0,
						vx: perpX * side * 0.8 + (Math.random() - 0.5) * 0.2,
						vz: perpZ * side * 0.8 + (Math.random() - 0.5) * 0.2,
					});
				}
				// Spray on turns
				if (Math.abs(moveX) > 0.5) {
					const sprayDir = moveX > 0 ? -1 : 1;
					this.spawnSpray(
						this.playerShipGroup.position.x + Math.cos(this.playerAngle) * sprayDir * 2,
						this.playerShipGroup.position.z + Math.sin(this.playerAngle) * sprayDir * 2,
						sprayDir,
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
			if (this.harpoonCooldown > 0) this.harpoonCooldown -= delta;
			for (let ab = 0; ab < 3; ab++) {
				if (this.abilityCooldowns[ab] > 0) this.abilityCooldowns[ab] -= delta;
			}

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
		this.updateSeagulls(delta);
		this.updateCompass();
		this.updateTreasureMap(delta);
		this.updateKraken(delta);
		this.updateHarpoon(delta);
		this.updateWreckage(delta);
		this.updateShipDamageVisuals(delta);
		this.updateBoarding(delta);
		this.updateSignalFlare(delta);
		this.updateMerchants(delta);
		this.updateCoralReefEffects(delta);
		this.updateVolcanoEvent(delta);
		this.updateLavaRocks(delta);
		this.updateDayNightCycle(delta);
		this.updateCrewPassives(delta);
		this.updateSprayParticles(delta);
		this.updateFortress(delta);
		this.updateIcebergs(delta);
		this.updateWaterspouts(delta);
		this.updateSeaSerpents(delta);
		this.updateMortars(delta);
		this.updateChainShots(delta);
		this.updateCannonTypeCycle();

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
				} else if (enemy.shipType === EnemyType.GhostShip) {
					// Ghost ship: erratic teleport-like drifting, phase through obstacles
					const circleAngle = Math.atan2(dz, dx) + (Math.PI / 2) * enemy.circleDir;
					enemy.group.position.x += Math.cos(circleAngle) * enemy.speed * 0.7 * delta;
					enemy.group.position.z += Math.sin(circleAngle) * enemy.speed * 0.7 * delta;
					// Occasional short-range teleport
					if (Math.random() < 0.003) {
						const teleAngle = Math.random() * Math.PI * 2;
						enemy.group.position.x += Math.cos(teleAngle) * 5;
						enemy.group.position.z += Math.sin(teleAngle) * 5;
					}
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

			// Ghost ship phasing — oscillate transparency
			if (enemy.shipType === EnemyType.GhostShip) {
				const phase = Math.sin(time * 1.5 + i * 2.3) * 0.5 + 0.5; // 0..1
				const opacity = 0.2 + phase * 0.6; // 0.2..0.8
				enemy.group.traverse((child) => {
					if ((child as Mesh).isMesh) {
						const mat = (child as Mesh).material as MeshStandardMaterial;
						if (mat.transparent) mat.opacity = opacity;
					}
				});
			}

			// Fire at player
			if (dist < enemy.engageRange + 10 && time - enemy.lastFireTime > enemy.fireRate) {
				// Ghost ships can fire while partially phased
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

			// Fire DOT processing
			if (enemy.onFire) {
				enemy.fireDOTTimer -= delta;
				enemy.hp -= this.cannonDamage * 0.15 * delta; // 15% cannon damage per second
				// Fire particles on enemy
				if (Math.random() < 0.3) {
					const fireGeo = new SphereGeometry(0.15 + Math.random() * 0.1, 4, 3);
					const fireMat = new MeshStandardMaterial({
						color: Math.random() < 0.5 ? '#ff4400' : '#ffaa00',
						emissive: '#ff4400', emissiveIntensity: 3,
						transparent: true, opacity: 0.8,
					});
					const fireMesh = new Mesh(fireGeo, fireMat);
					fireMesh.position.set(
						(Math.random() - 0.5) * enemy.hullWidth,
						1 + Math.random() * 2,
						(Math.random() - 0.5) * 2,
					);
					enemy.group.add(fireMesh);
					enemy.fireParticles.push(fireMesh);
					if (enemy.fireParticles.length > 6) {
						enemy.fireParticles[0].removeFromParent();
						enemy.fireParticles.shift();
					}
				}
				// Fade fire particles
				for (const fp of enemy.fireParticles) {
					fp.position.y += delta * 2;
					const fmat = fp.material as MeshStandardMaterial;
					fmat.opacity *= 0.97;
				}
				if (enemy.fireDOTTimer <= 0) {
					enemy.onFire = false;
					for (const fp of enemy.fireParticles) fp.removeFromParent();
					enemy.fireParticles = [];
				}
				if (enemy.hp <= 0 && !enemy.isSinking) {
					this.sinkEnemy(enemy);
				}
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

			// Avoid coral reefs (steer away)
			for (const cr of this.coralReefs) {
				const cx = enemy.group.position.x - cr.px;
				const cz = enemy.group.position.z - cr.pz;
				const cdist = Math.sqrt(cx * cx + cz * cz);
				if (cdist < cr.radius + 4 && cdist > 0.5) {
					// Steer away from reef center
					const avoidStr = Math.max(0, 1 - (cdist / (cr.radius + 4))) * enemy.speed * 1.5;
					enemy.group.position.x += (cx / cdist) * avoidStr * delta;
					enemy.group.position.z += (cz / cdist) * avoidStr * delta;
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

						// Fire DOT: cannon level 9+ sets enemies ablaze
						if (this.cannonLevel >= 9 && !enemy.onFire && enemy.shipType !== EnemyType.GhostShip) {
							enemy.onFire = true;
							enemy.fireDOTTimer = 5; // 5 seconds of fire
							playFireIgnite(this.volume * 0.5);
						}

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

				// Hit merchants
				if (!hitSomething) {
					for (const merchant of this.merchants) {
						if (merchant.isSinking) continue;
						const dx = ball.mesh.position.x - merchant.group.position.x;
						const dz = ball.mesh.position.z - merchant.group.position.z;
						if (Math.sqrt(dx * dx + dz * dz) < 2.5 && ball.mesh.position.y < 5) {
							merchant.hp -= ball.damage;
							playHit(this.volume);
							this.spawnExplosion(ball.mesh.position.x, ball.mesh.position.y, ball.mesh.position.z, 0.5);
							if (!merchant.fleeing) {
								merchant.fleeing = true;
								this.totalMerchantAttacks++;
							}
							if (merchant.hp <= 0) {
								this.sinkMerchant(merchant);
							}
							toRemove.push(i);
							hitSomething = true;
							break;
						}
					}
				}

				// Hit fortress
				if (!hitSomething && this.fortressActive && this.fortress) {
					const fx = ball.mesh.position.x - this.fortress.px;
					const fz = ball.mesh.position.z - this.fortress.pz;
					if (Math.sqrt(fx * fx + fz * fz) < 6 && ball.mesh.position.y < 6) {
						this.damageFortress(ball.damage);
						playHit(this.volume);
						this.spawnExplosion(ball.mesh.position.x, ball.mesh.position.y, ball.mesh.position.z, 0.5);
						toRemove.push(i);
						hitSomething = true;
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
		enemy.onFire = false;
		for (const fp of enemy.fireParticles) fp.removeFromParent();
		enemy.fireParticles = [];
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

		// Spawn wreckage debris (ghost ships don't leave physical wreckage)
		const wreckCount = enemy.shipType === EnemyType.GhostShip ? 0 :
			enemy.shipType === EnemyType.ManOWar ? 5 :
			enemy.shipType === EnemyType.Galleon ? 3 : 2;
		for (let i = 0; i < wreckCount; i++) {
			this.spawnWreckage(
				enemy.group.position.x + (Math.random() - 0.5) * 4,
				enemy.group.position.z + (Math.random() - 0.5) * 4,
			);
		}

		// Treasure drop
		const treasureValue = enemy.shipType === EnemyType.ManOWar ? 200 :
			enemy.shipType === EnemyType.GhostShip ? 120 :
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
			t.group.rotation.y += delta * (1 + t.rarity * 0.5); // legendaries spin faster

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
		this.addLogEntry(`Wave ${this.wave} cleared! +${waveBonus}g`);

		// Treasure map chance after boss waves
		if (this.wave % 5 === 0 && !this.treasureMapActive) {
			this.spawnTreasureMapEvent();
		}

		setTimeout(() => {
			if (this.state === STATE_WAVE_CLEAR) {
				this.state = STATE_SHOP;
				this.updateShopPanel();
				this.showPanel('shop');
			}
		}, 2000);
	}

	private updateSeagulls(delta: number) {
		for (const gull of this.seagulls) {
			const ud = gull.userData as {
				baseX: number; baseZ: number;
				circleRadius: number; circleSpeed: number; wingPhase: number;
			};
			ud.wingPhase += delta * 4;
			// Circle flight
			const angle = this.time * ud.circleSpeed;
			gull.position.x = ud.baseX + Math.cos(angle) * ud.circleRadius;
			gull.position.z = ud.baseZ + Math.sin(angle) * ud.circleRadius;
			gull.position.y += Math.sin(this.time * 0.5 + ud.wingPhase) * 0.01;
			// Face direction of travel
			gull.rotation.y = -angle + Math.PI / 2;

			// Wing flap animation
			if (gull.children.length >= 3) {
				gull.children[1].rotation.z = Math.sin(ud.wingPhase) * 0.5;
				gull.children[2].rotation.z = -Math.sin(ud.wingPhase) * 0.5;
			}
		}
	}

	private updateCompass() {
		if (!this.compass || !this.playerShipGroup) return;
		// Position compass above and in front of player
		this.compass.position.set(
			this.playerShipGroup.position.x,
			0.3,
			this.playerShipGroup.position.z,
		);
		// Scale down to minimap size
		this.compass.scale.setScalar(2);
		// Show enemy positions on compass (as blips from geometry)
		// Just spin the compass ring subtly
		this.compass.rotation.y = this.time * 0.1;
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

	// ── Spray Particles (turn effect) ─────────────────────────
	private spawnSpray(x: number, z: number, dir: number) {
		for (let i = 0; i < 3; i++) {
			const mesh = createSprayParticle();
			mesh.position.set(x + (Math.random() - 0.5) * 0.5, 0.2 + Math.random() * 0.3, z + (Math.random() - 0.5) * 0.5);
			this.world.scene.add(mesh);
			this.sprayParticles.push({
				mesh,
				life: 0.6 + Math.random() * 0.3,
				maxLife: 0.9,
				vx: dir * (0.5 + Math.random() * 1.0),
				vy: 1.5 + Math.random() * 1.5,
				vz: (Math.random() - 0.5) * 0.8,
			});
		}
	}

	private updateSprayParticles(delta: number) {
		for (let i = this.sprayParticles.length - 1; i >= 0; i--) {
			const sp = this.sprayParticles[i];
			sp.life -= delta;
			sp.mesh.position.x += sp.vx * delta;
			sp.mesh.position.y += sp.vy * delta;
			sp.mesh.position.z += sp.vz * delta;
			sp.vy -= 4 * delta; // gravity
			const t = Math.max(0, sp.life / sp.maxLife);
			(sp.mesh.material as MeshStandardMaterial).opacity = t * 0.7;
			if (sp.life <= 0 || sp.mesh.position.y < -0.5) {
				sp.mesh.removeFromParent();
				this.sprayParticles.splice(i, 1);
			}
		}
	}

	// ── Day/Night Cycle ───────────────────────────────────────
	private updateDayNightCycle(delta: number) {
		// Every 4 waves, toggle day/night. Transition over ~3 seconds.
		const shouldBeNight = Math.floor((this.wave - 1) / 4) % 2 === 1;

		if (shouldBeNight !== this.isNight) {
			this.isNight = shouldBeNight;
			if (this.isNight) {
				playNightfall(this.volume);
			} else {
				playDawn(this.volume);
			}
		}

		const target = this.isNight ? 1.0 : 0.0;
		this.dayNightTransition = MathUtils.lerp(this.dayNightTransition, target, 0.5 * delta);

		const t = this.dayNightTransition;

		// Interpolate sky color
		const dayColor = new Color(this.baseSkyColor);
		const nightColor = new Color(this.nightSkyColor);
		const skyColor = dayColor.clone().lerp(nightColor, t);
		if (this.world.scene.background instanceof Color) {
			(this.world.scene.background as Color).copy(skyColor);
		}

		// Interpolate fog density
		if (this.world.scene.fog instanceof FogExp2) {
			const baseFog = this.weatherState === 'storm' ? this.baseFogDensity * 1.5 : this.baseFogDensity;
			const nightFog = this.weatherState === 'storm' ? this.nightFogDensity * 1.2 : this.nightFogDensity;
			(this.world.scene.fog as FogExp2).density = MathUtils.lerp(baseFog, nightFog, t);
			(this.world.scene.fog as FogExp2).color.copy(skyColor);
		}

		// Interpolate light intensities
		if (this.ambientLightRef) {
			this.ambientLightRef.intensity = MathUtils.lerp(0.4, 0.15, t);
		}
		if (this.dirLightRef) {
			this.dirLightRef.intensity = MathUtils.lerp(0.3, 0.08, t);
		}

		// Moon brightness at night
		if (this.moonGroup) {
			const moonMat = (this.moonGroup.children[0] as Mesh).material as MeshStandardMaterial;
			moonMat.emissiveIntensity = MathUtils.lerp(1.0, 2.5, t);
		}
	}

	// ── Crew Passives ─────────────────────────────────────────
	private updateCrewPassives(delta: number) {
		// Doctor passive heal: 1 HP/s per doctor
		if (this.crewDoctors > 0 && this.playerHp < this.playerMaxHp) {
			this.healAccumulator += this.crewDoctors * delta;
			if (this.healAccumulator >= 1) {
				const healAmt = Math.floor(this.healAccumulator);
				this.playerHp = Math.min(this.playerHp + healAmt, this.playerMaxHp);
				this.healAccumulator -= healAmt;
			}
		}
	}

	// ── Ship Log ──────────────────────────────────────────────
	private addLogEntry(text: string) {
		const elapsed = Math.floor(this.time - (this.gameStartTime || 0));
		const mins = Math.floor(elapsed / 60);
		const secs = elapsed % 60;
		const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
		this.shipLog.unshift({ text: `[${timeStr}] ${text}`, time: this.time });
		if (this.shipLog.length > 8) this.shipLog.length = 8;
		this.updateLogPanel();
		playShipLogEntry(this.volume);
	}

	private updateLogPanel() {
		for (let i = 0; i < 8; i++) {
			const entry = this.shipLog[i];
			this.logPanel?.getElementById(`log-${i}`)?.setProperties({
				text: entry ? entry.text : ''
			});
		}
	}

	// ── Sea Fortress ──────────────────────────────────────────
	private spawnFortress() {
		if (this.fortressActive) return;
		const scheme = getScheme(this.colorScheme);
		const group = createSeaFortress(scheme);
		// Place fortress at edge of play area
		const angle = Math.random() * Math.PI * 2;
		const r = 25 + Math.random() * 10;
		const px = Math.cos(angle) * r;
		const pz = Math.sin(angle) * r;
		group.position.set(px, 0, pz);
		this.world.scene.add(group);

		const hp = 300 + this.wave * 20;
		this.fortress = {
			group, hp, maxHp: hp, px, pz,
			wallsDestroyed: [false, false, false, false, false, false],
			turretCooldowns: [0, 0, 0, 0],
			turretAngles: [0, 0, 0, 0],
		};
		this.fortressActive = true;
		this.addLogEntry('⚔ Sea fortress spotted!');
	}

	private updateFortress(delta: number) {
		if (!this.fortressActive || !this.fortress) return;
		const f = this.fortress;
		const playerPos = this.playerShipGroup?.position || new Vector3();

		// Turrets fire at player
		for (let t = 0; t < 4; t++) {
			f.turretCooldowns[t] -= delta;
			if (f.turretCooldowns[t] <= 0) {
				const dx = playerPos.x - f.px;
				const dz = playerPos.z - f.pz;
				const dist = Math.sqrt(dx * dx + dz * dz);
				if (dist < 50) {
					const angle = Math.atan2(dx, -dz);
					f.turretAngles[t] = angle;
					// Fire cannonball at player
					const speed = 15;
					const vx = Math.sin(angle) * speed;
					const vz = -Math.cos(angle) * speed;
					const scheme = getScheme(this.colorScheme);
					const ball = createCannonball(true, scheme);
					ball.position.set(f.px, 3.5, f.pz);
					this.world.scene.add(ball);
					this.cannonballs.push({
						mesh: ball, vx, vy: 0, vz,
						damage: 15 + Math.floor(this.wave / 5) * 3,
						isEnemy: true, lifetime: 0, maxLifetime: 4,
						trail: [],
					});
					playFortressCannon(this.volume);
					f.turretCooldowns[t] = 1.5 + Math.random();
				}
			}
		}

		// Check if fortress is destroyed
		if (f.hp <= 0 && this.fortressActive) {
			this.fortressActive = false;
			this.spawnExplosion(f.px, 2, f.pz, 4);
			this.spawnExplosion(f.px + 2, 3, f.pz - 2, 3);
			this.spawnExplosion(f.px - 2, 1, f.pz + 2, 3);
			playFortressDestroyed(this.volume);
			this.shakeIntensity = 3;
			// Big treasure reward
			for (let i = 0; i < 5; i++) {
				this.spawnTreasure(
					f.px + (Math.random() - 0.5) * 8,
					f.pz + (Math.random() - 0.5) * 8,
					150 + this.wave * 10,
				);
			}
			this.score += 1000;
			this.spawnScorePopup(f.px, 5, f.pz, 1000);
			this.addLogEntry('🏰 Sea fortress destroyed! +1000pts');
			// Remove after a delay
			setTimeout(() => {
				f.group.removeFromParent();
				this.fortress = null;
			}, 2000);
		}
	}

	private damageFortress(amount: number) {
		if (!this.fortress || !this.fortressActive) return;
		this.fortress.hp -= amount;
		// Destroy walls as HP decreases
		const hpPct = this.fortress.hp / this.fortress.maxHp;
		for (let i = 0; i < 6; i++) {
			if (!this.fortress.wallsDestroyed[i] && hpPct < (1 - (i + 1) / 7)) {
				this.fortress.wallsDestroyed[i] = true;
				// Hide the wall mesh
				const wall = this.fortress.group.children.find(
					(c) => c.userData?.isWall && c.userData?.wallIndex === i
				);
				if (wall) {
					this.spawnExplosion(wall.position.x + this.fortress.px, 2, wall.position.z + this.fortress.pz, 1.5);
					wall.visible = false;
				}
			}
		}
	}

	// ── Icebergs ──────────────────────────────────────────────
	private spawnIceberg() {
		const group = createIceberg();
		const px = (Math.random() - 0.5) * 70;
		const pz = (Math.random() - 0.5) * 70;
		group.position.set(px, 0, pz);
		this.world.scene.add(group);
		this.icebergs.push({ group, px, pz, bobPhase: Math.random() * Math.PI * 2 });
	}

	private updateIcebergs(delta: number) {
		const playerPos = this.playerShipGroup?.position || new Vector3();
		for (const berg of this.icebergs) {
			berg.bobPhase += delta;
			berg.group.position.y = Math.sin(berg.bobPhase * 0.5) * 0.1;
			berg.group.rotation.y += delta * 0.05;

			// Check collision with player
			const dx = playerPos.x - berg.px;
			const dz = playerPos.z - berg.pz;
			const dist = Math.sqrt(dx * dx + dz * dz);
			if (dist < 2.5 && this.state === STATE_PLAYING) {
				// Push player away and damage
				if (!this.dashInvincible) {
					this.playerHp -= 20;
					this.damageFlashTimer = 0.3;
					this.shakeIntensity = 1.5;
					playIcebergHit(this.volume);
					this.addLogEntry('🧊 Hit an iceberg! -20 HP');
					// Push player back
					if (this.playerShipGroup) {
						this.playerShipGroup.position.x += (dx / dist) * 5;
						this.playerShipGroup.position.z += (dz / dist) * 5;
						this.playerShipGroup.position.x = MathUtils.clamp(this.playerShipGroup.position.x, -40, 40);
						this.playerShipGroup.position.z = MathUtils.clamp(this.playerShipGroup.position.z, -40, 40);
					}
					// Move iceberg so it doesn't keep hitting
					berg.px += (Math.random() - 0.5) * 20;
					berg.pz += (Math.random() - 0.5) * 20;
					berg.group.position.x = berg.px;
					berg.group.position.z = berg.pz;
				}
			}

			// Check collision with enemies
			for (const enemy of this.enemies) {
				if (enemy.isSinking) continue;
				const ex = enemy.group.position.x - berg.px;
				const ez = enemy.group.position.z - berg.pz;
				const eDist = Math.sqrt(ex * ex + ez * ez);
				if (eDist < 3) {
					enemy.hp -= 10;
					enemy.group.position.x += (ex / eDist) * 3;
					enemy.group.position.z += (ez / eDist) * 3;
				}
			}
		}
	}

	// ── Waterspouts ───────────────────────────────────────────
	private spawnWaterspout() {
		const group = createWaterspout();
		const px = (Math.random() - 0.5) * 60;
		const pz = (Math.random() - 0.5) * 60;
		group.position.set(px, 0, pz);
		this.world.scene.add(group);
		this.waterspouts.push({
			group, px, pz,
			lifetime: 0, maxLifetime: 10 + Math.random() * 8,
			rotSpeed: 2 + Math.random() * 2,
			pullRadius: 8 + Math.random() * 4,
		});
		this.addLogEntry('🌪 Waterspout appeared!');
	}

	private updateWaterspouts(delta: number) {
		const playerPos = this.playerShipGroup?.position || new Vector3();
		for (let i = this.waterspouts.length - 1; i >= 0; i--) {
			const ws = this.waterspouts[i];
			ws.lifetime += delta;
			ws.group.rotation.y += ws.rotSpeed * delta;

			// Scale pulsing
			const pulse = 0.9 + Math.sin(ws.lifetime * 3) * 0.1;
			ws.group.scale.setScalar(pulse);

			// Pull player toward center
			const dx = playerPos.x - ws.px;
			const dz = playerPos.z - ws.pz;
			const dist = Math.sqrt(dx * dx + dz * dz);
			if (dist < ws.pullRadius && dist > 0.5 && this.playerShipGroup && this.state === STATE_PLAYING) {
				const pullStrength = (1 - dist / ws.pullRadius) * 4 * delta;
				this.playerShipGroup.position.x -= (dx / dist) * pullStrength;
				this.playerShipGroup.position.z -= (dz / dist) * pullStrength;

				// Launch player if too close
				if (dist < 2 && !this.dashInvincible) {
					// Fling the ship upward and outward
					const launchDir = Math.random() * Math.PI * 2;
					if (this.playerShipGroup) {
						this.playerShipGroup.position.x += Math.cos(launchDir) * 12;
						this.playerShipGroup.position.z += Math.sin(launchDir) * 12;
						this.playerShipGroup.position.x = MathUtils.clamp(this.playerShipGroup.position.x, -40, 40);
						this.playerShipGroup.position.z = MathUtils.clamp(this.playerShipGroup.position.z, -40, 40);
					}
					this.playerHp -= 15;
					this.damageFlashTimer = 0.3;
					this.shakeIntensity = 2;
					playWaterspoutSpin(this.volume);
					this.addLogEntry('🌪 Launched by waterspout! -15 HP');
				}
			}

			// Pull enemies too
			for (const enemy of this.enemies) {
				if (enemy.isSinking) continue;
				const ex = enemy.group.position.x - ws.px;
				const ez = enemy.group.position.z - ws.pz;
				const eDist = Math.sqrt(ex * ex + ez * ez);
				if (eDist < ws.pullRadius && eDist > 1) {
					enemy.group.position.x -= (ex / eDist) * 2 * delta;
					enemy.group.position.z -= (ez / eDist) * 2 * delta;
				}
			}

			// Remove expired
			if (ws.lifetime >= ws.maxLifetime) {
				const fadeT = (ws.lifetime - ws.maxLifetime + 1);
				if (fadeT > 1) {
					ws.group.removeFromParent();
					this.waterspouts.splice(i, 1);
				} else {
					ws.group.scale.setScalar(1 - fadeT);
				}
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

				// Chain explosion: trigger nearby barrels
				for (let j = this.barrels.length - 1; j >= 0; j--) {
					if (j === i) continue;
					const ob = this.barrels[j];
					const cdx = b.mesh.position.x - ob.mesh.position.x;
					const cdz = b.mesh.position.z - ob.mesh.position.z;
					if (Math.sqrt(cdx * cdx + cdz * cdz) < 6) {
						ob.hp = 0; // trigger chain next frame
					}
				}
				// Chain explosion also damages nearby enemies
				for (const enemy of this.enemies) {
					if (enemy.isSinking) continue;
					const edx = b.mesh.position.x - enemy.group.position.x;
					const edz = b.mesh.position.z - enemy.group.position.z;
					if (Math.sqrt(edx * edx + edz * edz) < 5) {
						enemy.hp -= 15;
						this.spawnExplosion(enemy.group.position.x, 1.5, enemy.group.position.z, 0.6);
						if (enemy.hp <= 0) this.sinkEnemy(enemy);
					}
				}

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

	// ── Weather System ──────────────────────────────────────────
	private setWeather(weather: 'calm' | 'cloudy' | 'storm') {
		this.weatherState = weather;
		this.weatherTransition = 0;
		switch (weather) {
			case 'calm':
				this.targetFogDensity = 0.008;
				break;
			case 'cloudy':
				this.targetFogDensity = 0.014;
				break;
			case 'storm':
				this.targetFogDensity = 0.022;
				this.thunderTimer = 2 + Math.random() * 4;
				break;
		}
	}

	private updateWeather(delta: number) {
		// Smooth fog transition
		this.currentFogDensity += (this.targetFogDensity - this.currentFogDensity) * delta * 0.5;
		if (this.world.scene.fog) {
			(this.world.scene.fog as FogExp2).density = this.currentFogDensity;
		}

		this.weatherTransition += delta;

		if (this.weatherState === 'storm') {
			// Spawn rain particles
			if (this.rainParticles.length < 120 && this.playerShipGroup) {
				const px = this.playerShipGroup.position.x + (Math.random() - 0.5) * 50;
				const pz = this.playerShipGroup.position.z + (Math.random() - 0.5) * 50;
				const rainDrop = new Mesh(
					new CylinderGeometry(0.015, 0.015, 0.6, 3),
					new MeshBasicMaterial({ color: 0x6688bb, transparent: true, opacity: 0.4 }),
				);
				rainDrop.position.set(px, 15 + Math.random() * 10, pz);
				this.scene.add(rainDrop);
				this.rainParticles.push({ mesh: rainDrop, vy: -18 - Math.random() * 8, resetY: 15 + Math.random() * 10 });
			}

			// Thunder during storm
			this.thunderTimer -= delta;
			if (this.thunderTimer <= 0) {
				this.thunderTimer = 4 + Math.random() * 8;
				playThunder(this.volume * 0.6);
				this.shakeIntensity = Math.max(this.shakeIntensity, 0.15);
			}
		} else {
			// Remove rain when not storming
			if (this.rainParticles.length > 0 && Math.random() < delta * 2) {
				const rp = this.rainParticles.pop();
				if (rp) rp.mesh.removeFromParent();
			}
		}

		// Update rain particles
		for (const rp of this.rainParticles) {
			rp.mesh.position.y += rp.vy * delta;
			if (rp.mesh.position.y < 0) {
				rp.mesh.position.y = rp.resetY;
				if (this.playerShipGroup) {
					rp.mesh.position.x = this.playerShipGroup.position.x + (Math.random() - 0.5) * 50;
					rp.mesh.position.z = this.playerShipGroup.position.z + (Math.random() - 0.5) * 50;
				}
			}
		}

		// Cloudy weather: slightly dim ambient light (visual cue via fog is enough)
	}

	// ── Radar Minimap ──────────────────────────────────────────
	private updateRadarBlips() {
		if (!this.compass || !this.playerShipGroup) return;

		const playerPos = this.playerShipGroup.position;

		// Remove stale blips
		while (this.radarBlips.length > this.enemies.length) {
			const blip = this.radarBlips.pop();
			if (blip) blip.mesh.removeFromParent();
		}

		// Add/update blips for each enemy
		for (let i = 0; i < this.enemies.length; i++) {
			const enemy = this.enemies[i];
			if (enemy.isSinking) {
				if (this.radarBlips[i]) {
					this.radarBlips[i].mesh.visible = false;
				}
				continue;
			}

			// Create blip if needed
			if (!this.radarBlips[i]) {
				const scheme = getScheme(this.colorScheme);
				const mesh = createRadarBlip(enemy.shipType, scheme);
				this.compass.add(mesh);
				this.radarBlips[i] = { mesh, enemy };
			}

			const blip = this.radarBlips[i];
			blip.mesh.visible = true;
			blip.enemy = enemy;

			// Map world position to minimap
			const relX = (enemy.group.position.x - playerPos.x) * this.radarScale;
			const relZ = (enemy.group.position.z - playerPos.z) * this.radarScale;
			// Clamp to compass radius
			const maxR = 0.75;
			const dist = Math.sqrt(relX * relX + relZ * relZ);
			if (dist > maxR) {
				blip.mesh.position.set(
					(relX / dist) * maxR,
					0.1,
					(relZ / dist) * maxR,
				);
			} else {
				blip.mesh.position.set(relX, 0.1, relZ);
			}

			// Pulse boss blips
			if (enemy.shipType === EnemyType.ManOWar) {
				const pulse = 0.8 + Math.sin(this.time * 6) * 0.4;
				blip.mesh.scale.setScalar(pulse);
			}
		}
	}

	// ── Treasure Map Events ──────────────────────────────────────
	private spawnTreasureMapEvent() {
		if (this.treasureMapActive) return;
		this.treasureMapActive = true;

		// Random location, not too close to player
		let px: number, pz: number;
		do {
			px = (Math.random() - 0.5) * 60;
			pz = (Math.random() - 0.5) * 60;
		} while (this.playerShipGroup && Math.sqrt(
			(px - this.playerShipGroup.position.x) ** 2 +
			(pz - this.playerShipGroup.position.z) ** 2
		) < 15);

		this.treasureMapX = px;
		this.treasureMapZ = pz;
		this.treasureMapTimer = 30; // 30 seconds to reach it

		const scheme = getScheme(this.colorScheme);

		// Create the treasure map marker — "X marks the spot"
		const marker = new Group();

		// X shape from two crossed bars
		const bar1 = new Mesh(
			new BoxGeometry(0.15, 0.1, 2),
			new MeshStandardMaterial({ color: '#ffdd00', emissive: '#ffdd00', emissiveIntensity: 1.5 }),
		);
		bar1.rotation.y = Math.PI / 4;
		marker.add(bar1);
		const bar2 = new Mesh(
			new BoxGeometry(0.15, 0.1, 2),
			new MeshStandardMaterial({ color: '#ffdd00', emissive: '#ffdd00', emissiveIntensity: 1.5 }),
		);
		bar2.rotation.y = -Math.PI / 4;
		marker.add(bar2);

		// Outer ring
		const ring = new Mesh(
			new RingGeometry(1.5, 1.7, 16),
			new MeshStandardMaterial({
				color: '#ffdd00', emissive: '#ffdd00', emissiveIntensity: 0.8,
				transparent: true, opacity: 0.5, side: DoubleSide,
			}),
		);
		ring.rotation.x = -Math.PI / 2;
		ring.position.y = 0.05;
		marker.add(ring);

		marker.position.set(px, 0.3, pz);
		this.scene.add(marker);
		this.treasureMapMarker = marker;

		// Beacon column
		const beacon = new Mesh(
			new CylinderGeometry(0.08, 0.3, 12, 6),
			new MeshStandardMaterial({
				color: '#ffdd00', emissive: '#ffdd00', emissiveIntensity: 1.2,
				transparent: true, opacity: 0.25,
			}),
		);
		beacon.position.set(px, 6, pz);
		this.scene.add(beacon);
		this.treasureMapBeacon = beacon;

		playTreasureMapFound(this.volume);
		this.showWaveAnnouncement('⚓ TREASURE MAP! ⚓');
	}

	private updateTreasureMap(delta: number) {
		if (!this.treasureMapActive || !this.playerShipGroup) return;

		this.treasureMapTimer -= delta;

		// Animate the marker
		if (this.treasureMapMarker) {
			this.treasureMapMarker.rotation.y += delta * 0.8;
			this.treasureMapMarker.position.y = 0.3 + Math.sin(this.time * 2) * 0.2;
		}

		// Pulse beacon
		if (this.treasureMapBeacon) {
			const mat = this.treasureMapBeacon.material as MeshStandardMaterial;
			mat.opacity = 0.15 + Math.sin(this.time * 3) * 0.1;
			this.treasureMapBeacon.rotation.y += delta * 2;
		}

		// Check if player reached the treasure
		const dx = this.playerShipGroup.position.x - this.treasureMapX;
		const dz = this.playerShipGroup.position.z - this.treasureMapZ;
		const dist = Math.sqrt(dx * dx + dz * dz);

		if (dist < 4) {
			// Collected! Big reward
			const reward = 300 + this.wave * 50;
			this.playerGold += reward;
			this.score += reward * 2;
			playTreasureCollect(this.volume);
			this.spawnExplosion(this.treasureMapX, 1, this.treasureMapZ, 2);
			this.spawnScorePopup(this.treasureMapX, 3, this.treasureMapZ, reward * 2);

			// Spawn extra treasures around the spot
			for (let i = 0; i < 5; i++) {
				this.spawnTreasure(
					this.treasureMapX + (Math.random() - 0.5) * 6,
					this.treasureMapZ + (Math.random() - 0.5) * 6,
					50 + this.wave * 10,
				);
			}

			this.cleanupTreasureMap();
			return;
		}

		// Timer expired
		if (this.treasureMapTimer <= 0) {
			this.cleanupTreasureMap();
			return;
		}

		// Update HUD with treasure map info
		const timerText = `MAP: ${Math.ceil(this.treasureMapTimer)}s | ${Math.round(dist)}m`;
		this.hudPanel?.getElementById('hud-weather')?.setProperties({ text: timerText });
	}

	private cleanupTreasureMap() {
		this.treasureMapActive = false;
		if (this.treasureMapMarker) {
			this.treasureMapMarker.removeFromParent();
			this.treasureMapMarker = null;
		}
		if (this.treasureMapBeacon) {
			this.treasureMapBeacon.removeFromParent();
			this.treasureMapBeacon = null;
		}
	}

	// ── Kraken Boss ──────────────────────────────────────────────
	private spawnKraken() {
		if (this.krakenActive) return;
		this.krakenActive = true;

		const scheme = getScheme(this.colorScheme);
		const diffMult = [0.7, 1.0, 1.4][this.difficulty];

		// Choose spawn location away from player
		let px: number, pz: number;
		do {
			px = (Math.random() - 0.5) * 50;
			pz = (Math.random() - 0.5) * 50;
		} while (this.playerShipGroup && Math.sqrt(
			(px - this.playerShipGroup.position.x) ** 2 +
			(pz - this.playerShipGroup.position.z) ** 2
		) < 20);

		// Create head
		const headGroup = createKrakenHead(scheme);
		headGroup.position.set(px, -6, pz); // Start submerged
		this.scene.add(headGroup);

		// Create tentacles around the head
		const tentacles: KrakenData['tentacles'] = [];
		const tentCount = 6;
		for (let i = 0; i < tentCount; i++) {
			const angle = (i / tentCount) * Math.PI * 2;
			const tGroup = createKrakenTentacle(scheme);
			const tx = px + Math.cos(angle) * 6;
			const tz = pz + Math.sin(angle) * 6;
			tGroup.position.set(tx, -8, tz); // Start submerged
			tGroup.rotation.y = -angle;
			this.scene.add(tGroup);
			tentacles.push({ group: tGroup, baseAngle: angle, sweepPhase: Math.random() * Math.PI * 2 });
		}

		const maxHp = (500 + this.wave * 30) * diffMult;
		this.kraken = {
			headGroup,
			tentacles,
			hp: maxHp,
			maxHp,
			px,
			pz,
			phase: 'emerge',
			phaseTimer: 0,
			sweepAngle: 0,
			sweepDir: 1,
			emergeProgress: 0,
			attackCooldown: 0,
		};

		playKrakenRoar(this.volume);
		this.showWaveAnnouncement('⚓ THE KRAKEN AWAKENS ⚓');
		this.shakeIntensity = Math.max(this.shakeIntensity, 2);
	}

	private updateKraken(delta: number) {
		if (!this.krakenActive || !this.kraken || !this.playerShipGroup) return;
		const k = this.kraken;
		const playerPos = this.playerShipGroup.position;

		k.phaseTimer += delta;

		switch (k.phase) {
			case 'emerge': {
				k.emergeProgress = Math.min(1, k.phaseTimer / 3);
				const targetY = -1;
				k.headGroup.position.y = -6 + (targetY + 6) * k.emergeProgress;
				for (const t of k.tentacles) {
					const tentTargetY = 0;
					t.group.position.y = -8 + (tentTargetY + 8) * k.emergeProgress;
				}
				if (k.emergeProgress >= 1) {
					k.phase = 'idle';
					k.phaseTimer = 0;
				}
				break;
			}
			case 'idle': {
				// Bob gently, face player
				k.headGroup.position.y = -1 + Math.sin(this.time * 0.8) * 0.3;
				const dx = playerPos.x - k.px;
				const dz = playerPos.z - k.pz;
				const targetAngle = Math.atan2(dx, dz);
				k.headGroup.rotation.y = MathUtils.lerp(k.headGroup.rotation.y, targetAngle, delta * 2);

				// Tentacle idle animation
				for (const t of k.tentacles) {
					t.sweepPhase += delta * 1.5;
					const sway = Math.sin(t.sweepPhase) * 0.3;
					t.group.rotation.z = sway;
					t.group.position.y = Math.sin(this.time * 0.8 + t.baseAngle) * 0.4;
					// Tentacle segments wave
					for (let s = 0; s < t.group.children.length; s++) {
						const child = t.group.children[s];
						child.rotation.z = Math.sin(t.sweepPhase + s * 0.4) * 0.15;
					}
				}

				// Attack timer
				k.attackCooldown -= delta;
				if (k.phaseTimer > 2 && k.attackCooldown <= 0) {
					// Choose attack
					const dist = Math.sqrt((dx * dx) + (dz * dz));
					if (dist < 25) {
						k.phase = 'sweep';
					} else {
						k.phase = 'ink';
					}
					k.phaseTimer = 0;
					k.attackCooldown = 4 + Math.random() * 2;
				}
				break;
			}
			case 'sweep': {
				// Tentacles sweep across — damages player if hit
				playKrakenSweep(this.volume * 0.5);
				const sweepDuration = 2;
				const progress = Math.min(1, k.phaseTimer / sweepDuration);

				for (const t of k.tentacles) {
					// Extend tentacles outward during sweep
					const extendFactor = Math.sin(progress * Math.PI);
					const angle = t.baseAngle + Math.sin(progress * Math.PI * 2 + t.sweepPhase) * 0.8;
					const reach = 6 + extendFactor * 8;
					t.group.position.x = k.px + Math.cos(angle) * reach;
					t.group.position.z = k.pz + Math.sin(angle) * reach;
					t.group.rotation.y = -angle;
					// Whip motion
					for (let s = 0; s < t.group.children.length; s++) {
						const child = t.group.children[s];
						child.rotation.z = Math.sin(progress * Math.PI * 3 + s * 0.6) * 0.4 * extendFactor;
					}

					// Check tentacle hit on player
					const tx = t.group.position.x;
					const tz = t.group.position.z;
					const hitDist = Math.sqrt((playerPos.x - tx) ** 2 + (playerPos.z - tz) ** 2);
					if (hitDist < 4 && !this.dashInvincible && !this.hasPowerUp(PU_SHIELD) && extendFactor > 0.3) {
						this.playerHp -= delta * 30;
						this.damageFlashTimer = 0.2;
						this.shakeIntensity = Math.max(this.shakeIntensity, 0.5);
					}
				}

				if (progress >= 1) {
					k.phase = 'idle';
					k.phaseTimer = 0;
				}
				break;
			}
			case 'ink': {
				// Ink cloud — spawns dark patches that slow the player
				if (k.phaseTimer < 0.1) {
					// Spawn ink clouds toward the player
					const dx = playerPos.x - k.px;
					const dz = playerPos.z - k.pz;
					const dist = Math.sqrt(dx * dx + dz * dz);
					if (dist > 0.1) {
						for (let i = 0; i < 3; i++) {
							const spread = (Math.random() - 0.5) * 15;
							const inkX = k.px + (dx / dist) * (10 + i * 8) + spread;
							const inkZ = k.pz + (dz / dist) * (10 + i * 8) + spread;
							this.spawnInkCloud(inkX, inkZ);
						}
					}
					playKrakenRoar(this.volume * 0.3);
				}

				if (k.phaseTimer > 1.5) {
					k.phase = 'idle';
					k.phaseTimer = 0;
				}
				break;
			}
			case 'submerge': {
				const progress = Math.min(1, k.phaseTimer / 2);
				k.headGroup.position.y = -1 - progress * 6;
				for (const t of k.tentacles) {
					t.group.position.y = 0 - progress * 8;
				}
				if (progress >= 1) {
					this.cleanupKraken();
				}
				break;
			}
		}

		// Check cannonball hits on kraken head
		if (k.phase !== 'emerge' && k.phase !== 'submerge') {
			for (let i = this.cannonballs.length - 1; i >= 0; i--) {
				const ball = this.cannonballs[i];
				if (ball.isEnemy) continue;
				const dx = ball.mesh.position.x - k.headGroup.position.x;
				const dz = ball.mesh.position.z - k.headGroup.position.z;
				const dist = Math.sqrt(dx * dx + dz * dz);
				if (dist < 4 && ball.mesh.position.y < 4) {
					k.hp -= ball.damage;
					playHit(this.volume);
					this.spawnExplosion(ball.mesh.position.x, ball.mesh.position.y, ball.mesh.position.z, 0.5);
					ball.mesh.removeFromParent();
					for (const tr of ball.trail) tr.removeFromParent();
					this.cannonballs.splice(i, 1);

					if (k.hp <= 0) {
						this.defeatKraken();
						return;
					}
				}
			}

			// Also check hits on tentacles
			for (const t of k.tentacles) {
				for (let i = this.cannonballs.length - 1; i >= 0; i--) {
					const ball = this.cannonballs[i];
					if (ball.isEnemy) continue;
					const dx = ball.mesh.position.x - t.group.position.x;
					const dz = ball.mesh.position.z - t.group.position.z;
					const dist = Math.sqrt(dx * dx + dz * dz);
					if (dist < 2 && ball.mesh.position.y < 6) {
						k.hp -= ball.damage * 0.5; // Half damage on tentacles
						this.spawnExplosion(ball.mesh.position.x, ball.mesh.position.y, ball.mesh.position.z, 0.3);
						ball.mesh.removeFromParent();
						for (const tr of ball.trail) tr.removeFromParent();
						this.cannonballs.splice(i, 1);

						if (k.hp <= 0) {
							this.defeatKraken();
							return;
						}
					}
				}
			}
		}

		// HP bar update via HUD (already handled in updateHUD)
	}

	private defeatKraken() {
		if (!this.kraken) return;
		const k = this.kraken;

		// Massive explosion chain
		for (let i = 0; i < 8; i++) {
			const ex = k.px + (Math.random() - 0.5) * 12;
			const ez = k.pz + (Math.random() - 0.5) * 12;
			setTimeout(() => {
				this.spawnExplosion(ex, Math.random() * 4, ez, 1.5 + Math.random());
				playExplosion(this.volume);
			}, i * 250);
		}

		// Big score reward
		const points = 2000 + this.wave * 100;
		this.score += points;
		this.spawnScorePopup(k.px, 5, k.pz, points);

		// Treasure rain
		for (let i = 0; i < 8; i++) {
			this.spawnTreasure(
				k.px + (Math.random() - 0.5) * 10,
				k.pz + (Math.random() - 0.5) * 10,
				100 + this.wave * 15,
			);
		}

		playKrakenRoar(this.volume);
		this.shakeIntensity = Math.max(this.shakeIntensity, 3);
		this.showWaveAnnouncement('⚓ KRAKEN DEFEATED! ⚓');

		// Submerge and clean up
		k.phase = 'submerge';
		k.phaseTimer = 0;
	}

	private spawnInkCloud(x: number, z: number) {
		// Ink cloud is a dark expanding sphere that fades
		const cloud = new Mesh(
			new SphereGeometry(1.5, 8, 6),
			new MeshStandardMaterial({
				color: '#110022',
				emissive: '#220044',
				emissiveIntensity: 0.3,
				transparent: true,
				opacity: 0.5,
			}),
		);
		cloud.position.set(x, 0.3, z);
		this.scene.add(cloud);

		// Treat as a special wreckage-like obstacle that damages on contact
		this.wreckages.push({
			group: new Group(), // placeholder
			px: x,
			pz: z,
			bobPhase: 0,
			lifetime: 8, // Longer-lived
			rotSpeed: 0,
			driftX: 0,
			driftZ: 0,
		});
		// Attach the cloud mesh to the wreckage group
		const wrapper = this.wreckages[this.wreckages.length - 1];
		wrapper.group.add(cloud);
		wrapper.group.position.set(x, 0.3, z);
		this.scene.add(wrapper.group);
		cloud.position.set(0, 0, 0);
	}

	private cleanupKraken() {
		if (!this.kraken) return;
		this.kraken.headGroup.removeFromParent();
		for (const t of this.kraken.tentacles) {
			t.group.removeFromParent();
		}
		this.kraken = null;
		this.krakenActive = false;
	}

	// ── Harpoon Secondary Weapon ──────────────────────────────────
	private fireHarpoon() {
		if (!this.playerShipGroup) return;
		this.harpoonCooldown = 5; // 5 second cooldown

		const scheme = getScheme(this.colorScheme);
		playHarpoonLaunch(this.volume);

		const harpGroup = createHarpoon(scheme);
		const px = this.playerShipGroup.position.x + Math.sin(this.aimAngleH) * 3;
		const pz = this.playerShipGroup.position.z - Math.cos(this.aimAngleH) * 3;
		harpGroup.position.set(px, 1.5, pz);
		harpGroup.rotation.y = this.aimAngleH;
		this.scene.add(harpGroup);

		const speed = 30;
		const vx = Math.sin(this.aimAngleH) * speed;
		const vz = -Math.cos(this.aimAngleH) * speed;

		// Create rope segments
		const ropeSegs: Mesh[] = [];
		for (let i = 0; i < 20; i++) {
			const seg = createRopeSegment();
			seg.position.set(px, 1.5, pz);
			this.scene.add(seg);
			ropeSegs.push(seg);
		}

		this.harpoon = {
			group: harpGroup,
			vx,
			vz,
			lifetime: 0,
			attached: false,
			attachedEnemy: null,
			ropeSegments: ropeSegs,
			pullTimer: 0,
		};
	}

	private updateHarpoon(delta: number) {
		if (!this.harpoon || !this.playerShipGroup) return;
		const h = this.harpoon;
		h.lifetime += delta;

		if (!h.attached) {
			// Flying phase
			h.group.position.x += h.vx * delta;
			h.group.position.z += h.vz * delta;

			// Check hit on enemies
			for (const enemy of this.enemies) {
				if (enemy.isSinking) continue;
				const dx = h.group.position.x - enemy.group.position.x;
				const dz = h.group.position.z - enemy.group.position.z;
				const dist = Math.sqrt(dx * dx + dz * dz);
				if (dist < enemy.hullWidth) {
					// Attach!
					h.attached = true;
					h.attachedEnemy = enemy;
					h.pullTimer = 3; // 3 seconds of pulling
					playHarpoonHit(this.volume);
					enemy.hp -= this.cannonDamage * 0.5; // Small damage on attach
					this.spawnScorePopup(enemy.group.position.x, 3, enemy.group.position.z, 50);
					this.score += 50;
					break;
				}
			}

			// Check hit on kraken head
			if (!h.attached && this.krakenActive && this.kraken) {
				const dx = h.group.position.x - this.kraken.headGroup.position.x;
				const dz = h.group.position.z - this.kraken.headGroup.position.z;
				if (Math.sqrt(dx * dx + dz * dz) < 4) {
					h.attached = true;
					h.pullTimer = 2;
					playHarpoonHit(this.volume);
					this.kraken.hp -= this.cannonDamage;
					if (this.kraken.hp <= 0) {
						this.defeatKraken();
					}
				}
			}

			// Max range
			if (h.lifetime > 1.5) {
				this.cleanupHarpoon();
				return;
			}
		} else {
			// Pulling phase
			h.pullTimer -= delta;

			if (h.attachedEnemy) {
				if (h.attachedEnemy.isSinking || h.pullTimer <= 0) {
					this.cleanupHarpoon();
					return;
				}

				// Pull enemy toward player
				const ex = h.attachedEnemy.group.position.x;
				const ez = h.attachedEnemy.group.position.z;
				const px = this.playerShipGroup.position.x;
				const pz = this.playerShipGroup.position.z;
				const dx = px - ex;
				const dz = pz - ez;
				const dist = Math.sqrt(dx * dx + dz * dz);
				if (dist > 5) {
					const pullSpeed = 6;
					h.attachedEnemy.group.position.x += (dx / dist) * pullSpeed * delta;
					h.attachedEnemy.group.position.z += (dz / dist) * pullSpeed * delta;
				}

				// Keep harpoon on enemy
				h.group.position.set(ex, 1.5, ez);
			} else {
				// Attached to kraken or nothing — just expire
				if (h.pullTimer <= 0) {
					this.cleanupHarpoon();
					return;
				}
			}
		}

		// Update rope segments — line from player to harpoon
		const px = this.playerShipGroup.position.x;
		const pz = this.playerShipGroup.position.z;
		const hx = h.group.position.x;
		const hz = h.group.position.z;
		for (let i = 0; i < h.ropeSegments.length; i++) {
			const t = i / (h.ropeSegments.length - 1);
			const sag = Math.sin(t * Math.PI) * 0.3; // Slight sag
			h.ropeSegments[i].position.set(
				px + (hx - px) * t,
				1.5 - sag,
				pz + (hz - pz) * t,
			);
		}
	}

	private cleanupHarpoon() {
		if (!this.harpoon) return;
		this.harpoon.group.removeFromParent();
		for (const seg of this.harpoon.ropeSegments) seg.removeFromParent();
		this.harpoon = null;
	}

	// ── Ship Wreckage ──────────────────────────────────────────────
	private spawnWreckage(x: number, z: number) {
		const group = createWreckage();
		group.position.set(x, 0.15, z);
		group.rotation.y = Math.random() * Math.PI * 2;
		this.scene.add(group);
		this.wreckages.push({
			group,
			px: x,
			pz: z,
			bobPhase: Math.random() * Math.PI * 2,
			lifetime: 25 + Math.random() * 10,
			rotSpeed: (Math.random() - 0.5) * 0.3,
			driftX: (Math.random() - 0.5) * 0.3,
			driftZ: (Math.random() - 0.5) * 0.3,
		});

		if (Math.random() < 0.15) {
			playWreckageCreak(this.volume * 0.3);
		}
	}

	private updateWreckage(delta: number) {
		if (!this.playerShipGroup) return;
		const playerPos = this.playerShipGroup.position;

		for (let i = this.wreckages.length - 1; i >= 0; i--) {
			const wr = this.wreckages[i];
			wr.lifetime -= delta;
			wr.bobPhase += delta * 1.2;

			// Drift and bob
			wr.px += wr.driftX * delta;
			wr.pz += wr.driftZ * delta;
			wr.group.position.set(wr.px, 0.15 + Math.sin(wr.bobPhase) * 0.08, wr.pz);
			wr.group.rotation.y += wr.rotSpeed * delta;

			// Fade out near end of life
			if (wr.lifetime < 3) {
				const fade = wr.lifetime / 3;
				for (const child of wr.group.children) {
					const mat = (child as Mesh).material;
					if (mat && 'opacity' in mat) {
						(mat as MeshStandardMaterial).transparent = true;
						(mat as MeshStandardMaterial).opacity = fade;
					}
				}
			}

			// Slow player slightly if they collide
			const dx = playerPos.x - wr.px;
			const dz = playerPos.z - wr.pz;
			const dist = Math.sqrt(dx * dx + dz * dz);
			if (dist < 2 && !this.isDashing) {
				// Gentle push and slow
				playerPos.x += (dx / dist) * 0.5 * delta;
				playerPos.z += (dz / dist) * 0.5 * delta;
				// Occasional creak
				if (Math.random() < 0.005) playWreckageCreak(this.volume * 0.2);
			}

			if (wr.lifetime <= 0) {
				wr.group.removeFromParent();
				this.wreckages.splice(i, 1);
			}
		}

		// Cap wreckage count
		while (this.wreckages.length > 30) {
			this.wreckages[0].group.removeFromParent();
			this.wreckages.shift();
		}
	}

	// ==== CAPTAIN ABILITIES ====

	private activateCaptainAbility() {
		const ab = this.captainAbility;
		this.abilityCooldowns[ab] = this.ABILITY_COOLDOWNS[ab];

		switch (ab) {
			case 0: this.chainLightning(); break;
			case 1: this.repairBurst(); break;
			case 2: this.broadsideBlast(); break;
		}
	}

	private chainLightning() {
		playChainLightning(this.volume);
		const playerPos = this.playerShipGroup?.position;
		if (!playerPos) return;

		// Sort enemies by distance, pick 3 nearest non-sinking
		const validEnemies = this.enemies
			.filter(e => !e.isSinking)
			.map(e => ({
				enemy: e,
				dist: Math.sqrt(
					(e.group.position.x - playerPos.x) ** 2 +
					(e.group.position.z - playerPos.z) ** 2,
				),
			}))
			.sort((a, b) => a.dist - b.dist)
			.slice(0, 3);

		const scheme = getScheme(this.colorScheme);
		let prevX = playerPos.x;
		let prevZ = playerPos.z;

		for (const { enemy } of validEnemies) {
			const dmg = this.cannonDamage * 2;
			enemy.hp -= dmg;
			this.spawnExplosion(enemy.group.position.x, 1.5, enemy.group.position.z, 0.8);
			this.spawnScorePopup(enemy.group.position.x, 3, enemy.group.position.z, Math.round(dmg));

			// Lightning bolt visual: line of small spheres between targets
			const steps = 6;
			for (let s = 0; s <= steps; s++) {
				const t = s / steps;
				const lx = prevX + (enemy.group.position.x - prevX) * t + (Math.random() - 0.5) * 1.5;
				const lz = prevZ + (enemy.group.position.z - prevZ) * t + (Math.random() - 0.5) * 1.5;
				const boltGeo = new SphereGeometry(0.15, 4, 4);
				const boltMat = new MeshStandardMaterial({
					color: scheme.primary, emissive: scheme.primary, emissiveIntensity: 3,
					transparent: true, opacity: 0.9,
				});
				const bolt = new Mesh(boltGeo, boltMat);
				bolt.position.set(lx, 2 + Math.random(), lz);
				this.world.scene.add(bolt);
				// Auto-remove after brief flash
				setTimeout(() => bolt.removeFromParent(), 300);
			}

			if (enemy.hp <= 0) {
				this.sinkEnemy(enemy);
			}
			prevX = enemy.group.position.x;
			prevZ = enemy.group.position.z;
		}

		this.shakeIntensity = Math.max(this.shakeIntensity, 1.0);
	}

	private repairBurst() {
		playRepairBurst(this.volume);
		const healAmount = this.playerMaxHp * 0.25;
		this.playerHp = Math.min(this.playerHp + healAmount, this.playerMaxHp);

		// Visual: green pulse ring expanding outward
		if (this.playerShipGroup) {
			const ringGeo = new RingGeometry(1, 2, 16);
			const ringMat = new MeshStandardMaterial({
				color: '#00ff88', emissive: '#00ff88', emissiveIntensity: 2,
				transparent: true, opacity: 0.8, side: DoubleSide,
			});
			const ring = new Mesh(ringGeo, ringMat);
			ring.position.copy(this.playerShipGroup.position);
			ring.position.y = 1;
			ring.rotation.x = -Math.PI / 2;
			this.world.scene.add(ring);

			// Animate expansion and fade
			let life = 0;
			const expandInterval = setInterval(() => {
				life += 0.016;
				ring.scale.setScalar(1 + life * 8);
				const mat = ring.material as MeshStandardMaterial;
				mat.opacity = Math.max(0, 0.8 - life * 2);
				if (life > 0.5) {
					clearInterval(expandInterval);
					ring.removeFromParent();
				}
			}, 16);
		}
	}

	private broadsideBlast() {
		playBroadside(this.volume);
		if (!this.playerShipGroup) return;

		const scheme = getScheme(this.colorScheme);
		const px = this.playerShipGroup.position.x;
		const pz = this.playerShipGroup.position.z;
		const dmgMult = this.hasPowerUp(PU_DAMAGE) ? 2 : 1;
		const speed = 25;

		// Fire 8 cannonballs in a circle (broadside all directions)
		for (let i = 0; i < 8; i++) {
			const angle = (i / 8) * Math.PI * 2;
			const vx = Math.sin(angle) * speed;
			const vz = -Math.cos(angle) * speed;

			const mesh = createCannonball(false, scheme);
			mesh.position.set(px + Math.sin(angle) * 2, 2, pz - Math.cos(angle) * 2);
			this.world.scene.add(mesh);

			this.spawnMuzzleFlash(mesh.position.x, 2.2, mesh.position.z);

			this.cannonballs.push({
				mesh, vx, vy: 4, vz,
				damage: this.cannonDamage * dmgMult * 0.8,
				isEnemy: false,
				lifetime: 0,
				maxLifetime: 3,
				trail: [],
			});
		}

		this.shakeIntensity = Math.max(this.shakeIntensity, 1.5);
		this.sessionCannonsFired += 8;
	}

	// ==== SHIP DAMAGE VISUALS ====

	private updateShipDamageVisuals(delta: number) {
		if (!this.playerShipGroup) return;
		const hpRatio = this.playerHp / this.playerMaxHp;
		const px = this.playerShipGroup.position.x;
		const pz = this.playerShipGroup.position.z;

		// Smoke when HP < 70%
		if (hpRatio < 0.7 && Math.random() < (0.7 - hpRatio) * 0.6) {
			const smokeGeo = new SphereGeometry(0.15 + Math.random() * 0.15, 4, 4);
			const smokeMat = new MeshStandardMaterial({
				color: '#444444', emissive: '#222222', emissiveIntensity: 0.3,
				transparent: true, opacity: 0.5,
			});
			const smoke = new Mesh(smokeGeo, smokeMat);
			smoke.position.set(px + (Math.random() - 0.5) * 3, 2, pz + (Math.random() - 0.5) * 2);
			this.world.scene.add(smoke);
			this.smokeParticles.push({
				mesh: smoke, life: 0, maxLife: 1.5 + Math.random(),
				vx: (Math.random() - 0.5) * 0.3, vy: 1.5 + Math.random(), vz: (Math.random() - 0.5) * 0.3,
			});
		}

		// Fire when HP < 35%
		if (hpRatio < 0.35 && Math.random() < (0.35 - hpRatio) * 0.8) {
			const fireGeo = new SphereGeometry(0.1 + Math.random() * 0.12, 4, 3);
			const colors = ['#ff2200', '#ff6600', '#ffaa00'];
			const fireColor = colors[Math.floor(Math.random() * colors.length)];
			const fireMat = new MeshStandardMaterial({
				color: fireColor, emissive: fireColor, emissiveIntensity: 3,
				transparent: true, opacity: 0.8,
			});
			const fire = new Mesh(fireGeo, fireMat);
			const fx = px + (Math.random() - 0.5) * 2.5;
			const fz = pz + (Math.random() - 0.5) * 1.5;
			fire.position.set(fx, 1.5, fz);
			this.world.scene.add(fire);
			this.fireParticles.push({
				mesh: fire, life: 0, maxLife: 0.5 + Math.random() * 0.3,
				baseX: fx - px, baseZ: fz - pz,
			});
		}

		// Update smoke
		for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
			const sp = this.smokeParticles[i];
			sp.life += delta;
			sp.mesh.position.x += sp.vx * delta;
			sp.mesh.position.y += sp.vy * delta;
			sp.mesh.position.z += sp.vz * delta;
			sp.mesh.scale.setScalar(1 + sp.life * 1.5);
			const mat = sp.mesh.material as MeshStandardMaterial;
			mat.opacity = Math.max(0, 0.5 * (1 - sp.life / sp.maxLife));
			if (sp.life >= sp.maxLife) {
				sp.mesh.removeFromParent();
				this.smokeParticles.splice(i, 1);
			}
		}
		// Cap smoke count
		while (this.smokeParticles.length > 20) {
			this.smokeParticles[0].mesh.removeFromParent();
			this.smokeParticles.shift();
		}

		// Update fire
		for (let i = this.fireParticles.length - 1; i >= 0; i--) {
			const fp = this.fireParticles[i];
			fp.life += delta;
			if (this.playerShipGroup) {
				fp.mesh.position.x = this.playerShipGroup.position.x + fp.baseX;
				fp.mesh.position.z = this.playerShipGroup.position.z + fp.baseZ;
			}
			fp.mesh.position.y += delta * 3;
			const mat = fp.mesh.material as MeshStandardMaterial;
			mat.opacity = Math.max(0, 0.8 * (1 - fp.life / fp.maxLife));
			fp.mesh.scale.setScalar(1 + fp.life * 2);
			if (fp.life >= fp.maxLife) {
				fp.mesh.removeFromParent();
				this.fireParticles.splice(i, 1);
			}
		}
		while (this.fireParticles.length > 15) {
			this.fireParticles[0].mesh.removeFromParent();
			this.fireParticles.shift();
		}
	}

	// ==== BOARDING MECHANIC ====

	private updateBoarding(delta: number) {
		if (!this.playerShipGroup) return;
		const playerPos = this.playerShipGroup.position;

		// Find boardable enemy: < 25% HP, within 6 units, not sinking, not ghost
		this.boardingTarget = null;
		let closestDist = 6;
		for (const enemy of this.enemies) {
			if (enemy.isSinking || enemy.shipType === EnemyType.GhostShip) continue;
			if (enemy.hp / enemy.maxHp > 0.25) continue;
			const dx = playerPos.x - enemy.group.position.x;
			const dz = playerPos.z - enemy.group.position.z;
			const dist = Math.sqrt(dx * dx + dz * dz);
			if (dist < closestDist) {
				closestDist = dist;
				this.boardingTarget = enemy;
			}
		}

		// Show boarding prompt on HUD
		const promptText = this.boardingTarget ? '⚔ BOARD [G] ⚔' : '';
		this.hudPanel?.getElementById('hud-boarding')?.setProperties({ text: promptText });
	}

	private executeBoarding() {
		if (!this.boardingTarget || !this.playerShipGroup) return;
		const enemy = this.boardingTarget;

		playBoarding(this.volume);

		// Board the ship: kill it and gain 3x gold + bonus score + heal
		const goldReward = enemy.scoreValue * 3;
		this.playerGold += goldReward;
		this.sessionTreasure += goldReward;
		this.score += enemy.scoreValue * 2;
		this.playerHp = Math.min(this.playerHp + 15, this.playerMaxHp);
		this.totalBoarded++;

		// Visual: grappling hook line
		const scheme = getScheme(this.colorScheme);
		const hookLine = new Mesh(
			new CylinderGeometry(0.03, 0.03, 1, 4),
			new MeshStandardMaterial({ color: scheme.accent, emissive: scheme.accent, emissiveIntensity: 2 }),
		);
		const mx = (this.playerShipGroup.position.x + enemy.group.position.x) / 2;
		const mz = (this.playerShipGroup.position.z + enemy.group.position.z) / 2;
		const dx = enemy.group.position.x - this.playerShipGroup.position.x;
		const dz = enemy.group.position.z - this.playerShipGroup.position.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		hookLine.position.set(mx, 2, mz);
		hookLine.scale.y = dist;
		hookLine.rotation.z = Math.PI / 2;
		hookLine.rotation.y = Math.atan2(dx, dz);
		this.world.scene.add(hookLine);
		setTimeout(() => hookLine.removeFromParent(), 500);

		this.spawnScorePopup(enemy.group.position.x, 3, enemy.group.position.z, goldReward);
		this.sinkEnemy(enemy);

		this.boardingTarget = null;
		this.shakeIntensity = Math.max(this.shakeIntensity, 1.0);
	}

	// ==== SIGNAL FLARE ====

	private updateSignalFlare(delta: number) {
		if (!this.signalFlareActive) return;
		this.signalFlareTimer -= delta;

		// Signal flare mesh rises and illuminates
		if (this.signalFlareMesh) {
			this.signalFlareMesh.position.y += delta * 5;
			const mat = this.signalFlareMesh.material as MeshStandardMaterial;
			const t = this.signalFlareTimer / 6;
			mat.opacity = Math.max(0, t * 0.9);
			mat.emissiveIntensity = 3 + Math.sin(this.time * 8) * 1.5;
		}

		if (this.signalFlareTimer <= 0) {
			this.signalFlareActive = false;
			if (this.signalFlareMesh) {
				this.signalFlareMesh.removeFromParent();
				this.signalFlareMesh = null;
			}
		}
	}

	// ==== SHOOTING STARS ====

	private updateShootingStars(delta: number) {
		this.shootingStarTimer -= delta;
		if (this.shootingStarTimer <= 0) {
			this.shootingStarTimer = 3 + Math.random() * 8; // every 3-11 seconds
			this.spawnShootingStar();
		}

		for (let i = this.shootingStars.length - 1; i >= 0; i--) {
			const star = this.shootingStars[i];
			star.life -= delta;
			star.mesh.position.x += star.vx * delta;
			star.mesh.position.y += star.vy * delta;
			star.mesh.position.z += star.vz * delta;
			const mat = star.mesh.material as MeshStandardMaterial;
			mat.opacity = Math.max(0, star.life * 2);
			if (star.life <= 0) {
				star.mesh.removeFromParent();
				this.shootingStars.splice(i, 1);
			}
		}
	}

	private spawnShootingStar() {
		const geo = new SphereGeometry(0.3, 4, 3);
		const mat = new MeshStandardMaterial({
			color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 3,
			transparent: true, opacity: 1,
		});
		const mesh = new Mesh(geo, mat);
		const startX = (Math.random() - 0.5) * 120;
		const startY = 50 + Math.random() * 30;
		const startZ = -60 - Math.random() * 40;
		mesh.position.set(startX, startY, startZ);
		this.world.scene.add(mesh);

		this.shootingStars.push({
			mesh,
			vx: (Math.random() - 0.5) * 20,
			vy: -15 - Math.random() * 10,
			vz: Math.random() * 5,
			life: 0.6 + Math.random() * 0.4,
		});
	}

	// ==== MERCHANT SHIPS ====

	private spawnMerchant() {
		const scheme = getScheme(this.colorScheme);
		const group = createMerchantShip(scheme);
		// Spawn from one edge, heading to the other
		const side = Math.floor(Math.random() * 4); // 0=N, 1=E, 2=S, 3=W
		let px: number, pz: number, targetAngle: number;
		switch (side) {
			case 0: px = (Math.random() - 0.5) * 40; pz = -45; targetAngle = Math.PI; break;
			case 1: px = 45; pz = (Math.random() - 0.5) * 40; targetAngle = Math.PI * 1.5; break;
			case 2: px = (Math.random() - 0.5) * 40; pz = 45; targetAngle = 0; break;
			default: px = -45; pz = (Math.random() - 0.5) * 40; targetAngle = Math.PI * 0.5; break;
		}
		group.position.set(px, 0, pz);
		group.rotation.y = targetAngle;
		this.world.scene.add(group);

		const diffMult = [0.7, 1.0, 1.4][this.difficulty];
		const maxHp = (40 + this.wave * 3) * diffMult;

		this.merchants.push({
			group, hp: maxHp, maxHp, speed: 2.5,
			px, pz, targetAngle, fleeing: false,
			fireRate: 3, lastFireTime: this.time,
			isSinking: false, sinkTimer: 0,
		});

		playMerchantHorn(this.volume * 0.5);
	}

	private updateMerchants(delta: number) {
		if (!this.playerShipGroup) return;
		const playerPos = this.playerShipGroup.position;
		const toRemove: number[] = [];

		for (let i = 0; i < this.merchants.length; i++) {
			const m = this.merchants[i];

			if (m.isSinking) {
				m.sinkTimer += delta;
				m.group.position.y -= delta * 1.5;
				m.group.rotation.z += delta * 0.5;
				if (m.sinkTimer > 3) toRemove.push(i);
				continue;
			}

			const dx = playerPos.x - m.group.position.x;
			const dz = playerPos.z - m.group.position.z;
			const distToPlayer = Math.sqrt(dx * dx + dz * dz);

			// Coral reef speed penalty for merchants too
			const coralMult = this.getCoralSpeedMult(m.group.position.x, m.group.position.z);

			if (m.fleeing) {
				// Flee: move away from player
				const fleeAngle = Math.atan2(-dx, -dz);
				m.targetAngle = fleeAngle;
				m.group.position.x -= (dx / Math.max(distToPlayer, 0.1)) * m.speed * 1.3 * coralMult * delta;
				m.group.position.z -= (dz / Math.max(distToPlayer, 0.1)) * m.speed * 1.3 * coralMult * delta;

				// Weak return fire when fleeing
				if (this.time - m.lastFireTime > m.fireRate && distToPlayer < 20) {
					m.lastFireTime = this.time;
					this.fireMerchantCannon(m);
				}
			} else {
				// Normal: sail along target heading
				m.group.position.x += Math.sin(m.targetAngle) * m.speed * coralMult * delta;
				m.group.position.z -= Math.cos(m.targetAngle) * m.speed * coralMult * delta;
			}

			// Smooth rotation toward target angle
			m.group.rotation.y = MathUtils.lerp(m.group.rotation.y, m.targetAngle, delta * 3);

			// Bob on water
			m.group.position.y = Math.sin(this.time * 1.3 + i * 2) * 0.12;

			// Update HP bar
			const hpBar = m.group.getObjectByName('hp-bar');
			if (hpBar) {
				const ratio = m.hp / m.maxHp;
				hpBar.scale.x = Math.max(0.01, ratio);
			}

			// Off-screen removal (passed through) = merchant spared
			if (Math.abs(m.group.position.x) > 55 || Math.abs(m.group.position.z) > 55) {
				if (!m.fleeing) {
					// Merchant passed peacefully — reputation bonus
					this.totalMerchantPasses++;
					this.merchantReputation++;
					this.shopDiscount = true;
					this.spawnScorePopup(m.group.position.x, 3, m.group.position.z, 0);
				}
				toRemove.push(i);
			}

			// Coral reef damage to merchants
			for (const cr of this.coralReefs) {
				const cx = m.group.position.x - cr.px;
				const cz = m.group.position.z - cr.pz;
				if (Math.sqrt(cx * cx + cz * cz) < cr.radius) {
					m.hp -= 2 * delta;
					if (m.hp <= 0 && !m.isSinking) {
						this.sinkMerchant(m);
					}
				}
			}
		}

		for (let i = toRemove.length - 1; i >= 0; i--) {
			this.merchants[toRemove[i]].group.removeFromParent();
			this.merchants.splice(toRemove[i], 1);
		}
	}

	private fireMerchantCannon(m: MerchantData) {
		const scheme = getScheme(this.colorScheme);
		const playerPos = this.playerShipGroup?.position || new Vector3();
		const dx = playerPos.x - m.group.position.x;
		const dz = playerPos.z - m.group.position.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist < 0.1) return;

		playEnemyFire(this.volume * 0.6);
		const speed = 12; // Slower than enemy cannons
		const mesh = createCannonball(true, scheme);
		mesh.position.set(m.group.position.x, 2, m.group.position.z);
		mesh.scale.setScalar(0.7); // Smaller shot
		this.world.scene.add(mesh);
		const diffMult = [0.7, 1.0, 1.4][this.difficulty];
		this.cannonballs.push({
			mesh,
			vx: (dx / dist) * speed + (Math.random() - 0.5) * 3,
			vy: 3,
			vz: (dz / dist) * speed + (Math.random() - 0.5) * 3,
			damage: 5 * diffMult, // Weak damage
			isEnemy: true, lifetime: 0, maxLifetime: 3, trail: [],
		});
	}

	private sinkMerchant(m: MerchantData) {
		m.isSinking = true;
		playShipSink(this.volume * 0.7);
		this.spawnExplosion(m.group.position.x, 1, m.group.position.z, 1);

		// Bonus gold for attacking merchant
		const goldReward = 80 + this.wave * 10;
		this.playerGold += goldReward;
		this.sessionTreasure += goldReward;
		this.score += goldReward;
		this.spawnScorePopup(m.group.position.x, 2, m.group.position.z, goldReward);

		// Drop extra treasure
		for (let i = 0; i < 3; i++) {
			this.spawnTreasure(
				m.group.position.x + (Math.random() - 0.5) * 4,
				m.group.position.z + (Math.random() - 0.5) * 4,
				20 + this.wave * 5,
			);
		}

		// Wreckage
		for (let i = 0; i < 3; i++) {
			this.spawnWreckage(
				m.group.position.x + (Math.random() - 0.5) * 3,
				m.group.position.z + (Math.random() - 0.5) * 3,
			);
		}
	}

	// ==== CORAL REEFS ====

	private spawnCoralReefs() {
		const count = 3 + Math.floor(Math.random() * 3); // 3-5 reefs
		for (let i = 0; i < count; i++) {
			let px: number, pz: number;
			let attempts = 0;
			do {
				px = (Math.random() - 0.5) * 60;
				pz = (Math.random() - 0.5) * 60;
				attempts++;
			} while (
				attempts < 20 &&
				(Math.sqrt(px * px + pz * pz) < 10 || // Not too close to center
				this.coralReefs.some(cr => Math.sqrt((cr.px - px) ** 2 + (cr.pz - pz) ** 2) < 12)) // Not too close to other reefs
			);

			const group = createCoralReef();
			const radius = 3 + Math.random() * 1.5;
			group.position.set(px, -0.2, pz);
			group.scale.setScalar(radius / 4); // Scale relative to base radius
			this.world.scene.add(group);
			this.coralReefs.push({ group, px, pz, radius });
		}
	}

	private getCoralSpeedMult(x: number, z: number): number {
		for (const cr of this.coralReefs) {
			const dx = x - cr.px;
			const dz = z - cr.pz;
			if (Math.sqrt(dx * dx + dz * dz) < cr.radius) {
				return 0.6; // 40% slowdown
			}
		}
		return 1.0;
	}

	private updateCoralReefEffects(delta: number) {
		if (!this.playerShipGroup) return;
		const playerPos = this.playerShipGroup.position;

		// Coral reef damage to player
		for (const cr of this.coralReefs) {
			const dx = playerPos.x - cr.px;
			const dz = playerPos.z - cr.pz;
			const dist = Math.sqrt(dx * dx + dz * dz);
			if (dist < cr.radius && !this.dashInvincible) {
				this.playerHp -= 2 * delta; // 2 HP/sec
				if (Math.random() < 0.05) this.damageFlashTimer = 0.1;
				if (this.playerHp <= 0) {
					this.playerHp = 0;
					this.endGame();
				}
			}
		}

		// Coral reef damage to enemies
		for (const enemy of this.enemies) {
			if (enemy.isSinking) continue;
			for (const cr of this.coralReefs) {
				const dx = enemy.group.position.x - cr.px;
				const dz = enemy.group.position.z - cr.pz;
				if (Math.sqrt(dx * dx + dz * dz) < cr.radius) {
					enemy.hp -= 2 * delta;
					// Slow enemy in reef
					enemy.group.position.x -= (enemy.group.position.x - cr.px) * 0.1 * delta;
					enemy.group.position.z -= (enemy.group.position.z - cr.pz) * 0.1 * delta;
					if (enemy.hp <= 0 && !enemy.isSinking) {
						this.sinkEnemy(enemy);
					}
				}
			}
		}

		// Subtle reef animation — slight bob
		for (const cr of this.coralReefs) {
			cr.group.position.y = -0.2 + Math.sin(this.time * 0.5) * 0.05;
		}
	}

	// ==== VOLCANIC ERUPTION EVENT ====

	private triggerVolcanoEvent() {
		if (this.volcanoEvent || this.backgroundIslands.length === 0) return;

		const islandIdx = Math.floor(Math.random() * this.backgroundIslands.length);
		const island = this.backgroundIslands[islandIdx];

		// Add orange glow to the island
		const glow = new Mesh(
			new SphereGeometry(3, 8, 6),
			new MeshStandardMaterial({
				color: '#ff4400', emissive: '#ff6600', emissiveIntensity: 4,
				transparent: true, opacity: 0.6,
			}),
		);
		glow.position.copy(island.position);
		glow.position.y = 3;
		this.world.scene.add(glow);

		playVolcanoRumble(this.volume);
		this.shakeIntensity = Math.max(this.shakeIntensity, 1.5);
		this.showWaveAnnouncement('🌋 ERUPTION!');

		this.volcanoEvent = {
			islandIndex: islandIdx,
			timer: 8, // 8 seconds duration
			glowMesh: glow,
			rocks: [],
			spawned: 0,
		};
	}

	private updateVolcanoEvent(delta: number) {
		if (!this.volcanoEvent) return;
		const v = this.volcanoEvent;
		v.timer -= delta;

		// Pulse the glow
		const mat = v.glowMesh.material as MeshStandardMaterial;
		mat.emissiveIntensity = 3 + Math.sin(this.time * 6) * 2;
		mat.opacity = 0.4 + Math.sin(this.time * 4) * 0.2;

		// Screen shake during eruption
		this.shakeIntensity = Math.max(this.shakeIntensity, 0.3);

		// Spawn 3-5 lava rocks, staggered over the duration
		const totalRocks = 3 + Math.floor(Math.random() * 0.5); // Mostly 3-4
		const spawnInterval = 6 / totalRocks; // Spread over first 6 seconds
		if (v.timer > 2 && v.spawned < totalRocks && (8 - v.timer) > v.spawned * spawnInterval) {
			this.spawnLavaRock(v);
			v.spawned++;
		}

		if (v.timer <= 0) {
			this.cleanupVolcanoEvent();
		}
	}

	private spawnLavaRock(v: VolcanoEventData) {
		const island = this.backgroundIslands[v.islandIndex];
		const rock = createLavaRock();

		// Start from above the island
		rock.position.set(
			island.position.x + (Math.random() - 0.5) * 4,
			20 + Math.random() * 10,
			island.position.z + (Math.random() - 0.5) * 4,
		);

		// Arc toward the play area (where ships are)
		const targetX = (Math.random() - 0.5) * 50;
		const targetZ = (Math.random() - 0.5) * 50;
		const dist = Math.sqrt(
			(targetX - rock.position.x) ** 2 + (targetZ - rock.position.z) ** 2,
		);
		const flightTime = 1.5 + Math.random() * 0.5;
		const vx = (targetX - rock.position.x) / flightTime;
		const vz = (targetZ - rock.position.z) / flightTime;
		const vy = 5; // Upward arc at start

		this.world.scene.add(rock);
		this.lavaRocks.push({ mesh: rock, vx, vy, vz, lifetime: flightTime + 0.5 });

		playLavaWhoosh(this.volume * 0.7);
	}

	private updateLavaRocks(delta: number) {
		const playerPos = this.playerShipGroup?.position;

		for (let i = this.lavaRocks.length - 1; i >= 0; i--) {
			const lr = this.lavaRocks[i];
			lr.lifetime -= delta;

			// Gravity
			lr.vy -= 12 * delta;

			lr.mesh.position.x += lr.vx * delta;
			lr.mesh.position.y += lr.vy * delta;
			lr.mesh.position.z += lr.vz * delta;

			// Spin
			lr.mesh.rotation.x += delta * 5;
			lr.mesh.rotation.z += delta * 3;

			// Glow pulsing
			const lmat = lr.mesh.material as MeshStandardMaterial;
			lmat.emissiveIntensity = 1.5 + Math.sin(this.time * 8) * 0.5;

			// Impact when hitting water level
			if (lr.mesh.position.y < 0.5) {
				// Damage anything near impact
				const impactX = lr.mesh.position.x;
				const impactZ = lr.mesh.position.z;

				// Damage player
				if (playerPos) {
					const dx = playerPos.x - impactX;
					const dz = playerPos.z - impactZ;
					if (Math.sqrt(dx * dx + dz * dz) < 5 && !this.dashInvincible && !this.hasPowerUp(PU_SHIELD)) {
						this.playerHp -= 15;
						this.damageFlashTimer = 0.3;
						this.shakeIntensity = Math.max(this.shakeIntensity, 1);
						playHit(this.volume);
						if (this.playerHp <= 0) {
							this.playerHp = 0;
							this.endGame();
						}
					}
				}

				// Damage enemies
				for (const enemy of this.enemies) {
					if (enemy.isSinking) continue;
					const dx = enemy.group.position.x - impactX;
					const dz = enemy.group.position.z - impactZ;
					if (Math.sqrt(dx * dx + dz * dz) < 5) {
						enemy.hp -= 15;
						if (enemy.hp <= 0) this.sinkEnemy(enemy);
					}
				}

				this.spawnExplosion(impactX, 0.5, impactZ, 1.5);
				playExplosion(this.volume * 0.8);
				this.spawnSplash(impactX, impactZ);
				lr.mesh.removeFromParent();
				this.lavaRocks.splice(i, 1);
				continue;
			}

			if (lr.lifetime <= 0) {
				lr.mesh.removeFromParent();
				this.lavaRocks.splice(i, 1);
			}
		}
	}

	private cleanupVolcanoEvent() {
		if (this.volcanoEvent) {
			this.volcanoEvent.glowMesh.removeFromParent();
			this.volcanoEvent = null;
		}
	}

	// ==== SEA SERPENT ====

	private spawnSeaSerpent() {
		const scheme = getScheme(this.colorScheme);
		const diffMult = [0.7, 1.0, 1.4][this.difficulty];
		const segmentCount = 8;
		const angle = Math.random() * Math.PI * 2;
		const dist = 40 + Math.random() * 15;

		const head = createSeaSerpentHead(scheme);
		const startX = Math.cos(angle) * dist;
		const startZ = Math.sin(angle) * dist;
		head.position.set(startX, 0.3, startZ);
		this.world.scene.add(head);

		const segments: Group[] = [];
		const segmentPositions: { x: number; z: number; angle: number }[] = [];

		// Place head position
		segmentPositions.push({ x: startX, z: startZ, angle: angle + Math.PI });

		for (let i = 0; i < segmentCount; i++) {
			const seg = createSeaSerpentSegment(scheme, i);
			const segX = startX + Math.cos(angle) * (i + 1) * 1.2;
			const segZ = startZ + Math.sin(angle) * (i + 1) * 1.2;
			seg.position.set(segX, 0.2, segZ);
			this.world.scene.add(seg);
			segments.push(seg);
			segmentPositions.push({ x: segX, z: segZ, angle: angle + Math.PI });
		}

		const baseHp = (80 + this.wave * 10) * diffMult;

		this.seaSerpents.push({
			head,
			segments,
			hp: baseHp,
			maxHp: baseHp,
			speed: 4 + this.wave * 0.15,
			damage: 15 * diffMult,
			angle: angle + Math.PI, // Face toward center
			turnRate: 1.5,
			biteTimer: 0,
			segmentPositions,
			isSinking: false,
			sinkTimer: 0,
			scoreValue: 600 + this.wave * 20,
			undulatePhase: Math.random() * Math.PI * 2,
		});

		this.enemiesRemaining++;
		playSerpentHiss(this.volume);
		this.showWaveAnnouncement('🐍 SEA SERPENT!');
		this.addLogEntry('🐍 Sea Serpent spotted in deep water!');
	}

	private updateSeaSerpents(delta: number) {
		if (!this.playerShipGroup) return;
		const playerPos = this.playerShipGroup.position;

		for (let si = this.seaSerpents.length - 1; si >= 0; si--) {
			const ss = this.seaSerpents[si];

			if (ss.isSinking) {
				ss.sinkTimer += delta;
				// Sink all parts
				ss.head.position.y -= delta * 2;
				ss.head.rotation.z += delta * 3;
				for (const seg of ss.segments) {
					seg.position.y -= delta * 1.5;
					seg.rotation.z += delta * 2;
				}
				// Fade out
				const sinkProgress = ss.sinkTimer / 3;
				for (const child of ss.head.children) {
					const mat = (child as Mesh).material as MeshStandardMaterial;
					if (mat?.opacity !== undefined) mat.opacity = Math.max(0, 1 - sinkProgress);
				}

				if (ss.sinkTimer > 3) {
					ss.head.removeFromParent();
					for (const seg of ss.segments) seg.removeFromParent();
					// Drop treasure
					this.spawnTreasure(ss.segmentPositions[0].x, ss.segmentPositions[0].z, ss.scoreValue, RARITY_RARE);
					this.seaSerpents.splice(si, 1);
				}
				continue;
			}

			// Head chases player with sinusoidal weaving
			const dx = playerPos.x - ss.head.position.x;
			const dz = playerPos.z - ss.head.position.z;
			const dist = Math.sqrt(dx * dx + dz * dz);
			const targetAngle = Math.atan2(dz, dx);

			// Smooth turning with undulation
			ss.undulatePhase += delta * 2;
			let angleDiff = targetAngle - ss.angle;
			while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
			while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
			ss.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), ss.turnRate * delta);
			// Add sinusoidal weave to heading
			const weaveAngle = ss.angle + Math.sin(ss.undulatePhase) * 0.4;

			// Move head
			const moveSpeed = ss.speed * delta;
			ss.head.position.x += Math.cos(weaveAngle) * moveSpeed;
			ss.head.position.z += Math.sin(weaveAngle) * moveSpeed;
			ss.head.position.y = 0.3 + Math.sin(this.time * 2 + ss.undulatePhase) * 0.2;
			ss.head.rotation.y = -weaveAngle + Math.PI / 2;

			// Update head's tracked position
			ss.segmentPositions[0].x = ss.head.position.x;
			ss.segmentPositions[0].z = ss.head.position.z;
			ss.segmentPositions[0].angle = weaveAngle;

			// Each segment follows the one ahead of it
			for (let i = 0; i < ss.segments.length; i++) {
				const prev = ss.segmentPositions[i];
				const curr = ss.segmentPositions[i + 1];
				const fdx = prev.x - curr.x;
				const fdz = prev.z - curr.z;
				const fdist = Math.sqrt(fdx * fdx + fdz * fdz);
				const segSpacing = 1.2;

				if (fdist > segSpacing) {
					const followAngle = Math.atan2(fdz, fdx);
					curr.x = prev.x - Math.cos(followAngle) * segSpacing;
					curr.z = prev.z - Math.sin(followAngle) * segSpacing;
					curr.angle = followAngle;
				}

				ss.segments[i].position.x = curr.x;
				ss.segments[i].position.z = curr.z;
				ss.segments[i].position.y = 0.2 + Math.sin(this.time * 2 + ss.undulatePhase + (i + 1) * 0.5) * 0.15;
				ss.segments[i].rotation.y = -curr.angle + Math.PI / 2;
			}

			// Bite attack when close
			ss.biteTimer -= delta;
			if (dist < 4 && ss.biteTimer <= 0) {
				this.playerHp -= ss.damage;
				this.damageFlashTimer = 0.3;
				this.shakeIntensity = Math.max(this.shakeIntensity, 0.8);
				playSerpentBite(this.volume);
				ss.biteTimer = 2; // 2 second cooldown
				if (this.playerHp <= 0) {
					this.playerHp = 0;
					this.endGame();
				}
			}

			// Check cannonball hits against head and segments
			for (let ci = this.cannonballs.length - 1; ci >= 0; ci--) {
				const cb = this.cannonballs[ci];
				if (cb.isEnemy) continue;

				// Hit head?
				const hdx = cb.mesh.position.x - ss.head.position.x;
				const hdz = cb.mesh.position.z - ss.head.position.z;
				if (Math.sqrt(hdx * hdx + hdz * hdz) < 1.5) {
					ss.hp -= cb.damage * 1.5; // Head takes bonus damage
					this.spawnExplosion(cb.mesh.position.x, 1, cb.mesh.position.z, 0.5);
					playHit(this.volume);
					cb.mesh.removeFromParent();
					for (const t of cb.trail) t.removeFromParent();
					this.cannonballs.splice(ci, 1);

					if (ss.hp <= 0 && !ss.isSinking) {
						this.killSerpent(ss);
					}
					continue;
				}

				// Hit segments?
				let segHit = false;
				for (const seg of ss.segments) {
					const sdx = cb.mesh.position.x - seg.position.x;
					const sdz = cb.mesh.position.z - seg.position.z;
					if (Math.sqrt(sdx * sdx + sdz * sdz) < 1.0) {
						ss.hp -= cb.damage;
						this.spawnExplosion(cb.mesh.position.x, 0.5, cb.mesh.position.z, 0.4);
						playHit(this.volume * 0.8);
						cb.mesh.removeFromParent();
						for (const t of cb.trail) t.removeFromParent();
						this.cannonballs.splice(ci, 1);
						segHit = true;

						if (ss.hp <= 0 && !ss.isSinking) {
							this.killSerpent(ss);
						}
						break;
					}
				}
				if (segHit) continue;
			}
		}
	}

	private killSerpent(ss: SeaSerpentData) {
		ss.isSinking = true;
		ss.sinkTimer = 0;
		this.score += ss.scoreValue;
		this.combo++;
		this.comboTimer = 3;
		if (this.combo > this.maxCombo) this.maxCombo = this.combo;
		this.enemiesRemaining--;
		playSerpentDeath(this.volume);
		this.spawnScorePopup(ss.head.position.x, 3, ss.head.position.z, ss.scoreValue);
		this.addLogEntry(`🐍 Sea Serpent defeated! +${ss.scoreValue} pts`);
	}

	// ==== MORTAR CANNON ====

	private fireMortar() {
		const mortarRate = this.fireRate * 2.0; // Slower than standard
		if (this.time - this.lastFireTime < mortarRate) return;
		this.lastFireTime = this.time;
		this.sessionCannonsFired++;

		const scheme = getScheme(this.colorScheme);
		playMortarLaunch(this.volume);

		const dmgMult = this.hasPowerUp(PU_DAMAGE) ? 2 : 1;
		const aimRadH = this.aimAngleH;
		const startX = (this.playerShipGroup?.position.x || 0) + Math.sin(aimRadH) * 2;
		const startZ = (this.playerShipGroup?.position.z || 0) - Math.cos(aimRadH) * 2;
		// Target 15-20 units ahead
		const range = 18;
		const targetX = startX + Math.sin(aimRadH) * range;
		const targetZ = startZ - Math.cos(aimRadH) * range;

		const mesh = createMortarShell(scheme);
		mesh.position.set(startX, 2, startZ);
		this.world.scene.add(mesh);

		this.spawnMuzzleFlash(startX, 2.5, startZ);

		this.mortars.push({
			mesh,
			startX, startZ,
			targetX, targetZ,
			flightTime: 1.2,
			elapsed: 0,
			damage: this.cannonDamage * 1.5 * dmgMult,
			splashRadius: 6,
		});

		this.shakeIntensity = Math.max(this.shakeIntensity, 0.5);
	}

	private updateMortars(delta: number) {
		for (let i = this.mortars.length - 1; i >= 0; i--) {
			const m = this.mortars[i];
			m.elapsed += delta;
			const t = m.elapsed / m.flightTime;

			if (t >= 1) {
				// Impact!
				playMortarImpact(this.volume);
				this.spawnExplosion(m.targetX, 0.5, m.targetZ, 2.0);
				this.spawnSplash(m.targetX, m.targetZ);
				this.shakeIntensity = Math.max(this.shakeIntensity, 0.7);

				// Splash damage to enemies
				for (const enemy of this.enemies) {
					if (enemy.isSinking) continue;
					const edx = enemy.group.position.x - m.targetX;
					const edz = enemy.group.position.z - m.targetZ;
					const edist = Math.sqrt(edx * edx + edz * edz);
					if (edist < m.splashRadius) {
						const falloff = 1 - edist / m.splashRadius;
						const dmg = m.damage * falloff;
						enemy.hp -= dmg;
						if (enemy.hp <= 0 && !enemy.isSinking) {
							this.sinkEnemy(enemy);
						}
					}
				}

				// Splash damage to serpent segments
				for (const ss of this.seaSerpents) {
					if (ss.isSinking) continue;
					const sdx = ss.head.position.x - m.targetX;
					const sdz = ss.head.position.z - m.targetZ;
					if (Math.sqrt(sdx * sdx + sdz * sdz) < m.splashRadius) {
						ss.hp -= m.damage * 0.8;
						if (ss.hp <= 0) this.killSerpent(ss);
					}
				}

				m.mesh.removeFromParent();
				this.mortars.splice(i, 1);
				continue;
			}

			// Arcing trajectory: lerp X/Z, parabolic Y
			m.mesh.position.x = m.startX + (m.targetX - m.startX) * t;
			m.mesh.position.z = m.startZ + (m.targetZ - m.startZ) * t;
			m.mesh.position.y = 2 + Math.sin(t * Math.PI) * 12; // High arc
			m.mesh.rotation.x += delta * 8;
			m.mesh.rotation.z += delta * 5;

			// Glow pulse
			const mat = m.mesh.material as MeshStandardMaterial;
			mat.emissiveIntensity = 1.5 + Math.sin(this.time * 10) * 0.5;
		}
	}

	// ==== CHAIN SHOT ====

	private fireChainShot() {
		const chainRate = this.fireRate * 1.3; // Slightly slower
		if (this.time - this.lastFireTime < chainRate) return;
		this.lastFireTime = this.time;
		this.sessionCannonsFired++;

		const scheme = getScheme(this.colorScheme);
		playChainShotFire(this.volume);

		const aimRadH = this.aimAngleH;
		const speed = 20;
		const startX = (this.playerShipGroup?.position.x || 0) + Math.sin(aimRadH) * 2;
		const startZ = (this.playerShipGroup?.position.z || 0) - Math.cos(aimRadH) * 2;
		const vx = Math.sin(aimRadH) * speed;
		const vz = -Math.cos(aimRadH) * speed;

		const group = createChainShot(scheme);
		group.position.set(startX, 2, startZ);
		this.world.scene.add(group);

		this.spawnMuzzleFlash(startX, 2.2, startZ);

		const dmgMult = this.hasPowerUp(PU_DAMAGE) ? 2 : 1;
		this.chainShots.push({
			group, vx, vz,
			lifetime: 0,
			maxLifetime: 3,
			damage: this.cannonDamage * 0.6 * dmgMult, // Lower damage
			slowDuration: 4, // 4 seconds slow
		});

		this.shakeIntensity = Math.max(this.shakeIntensity, 0.2);
	}

	private updateChainShots(delta: number) {
		for (let i = this.chainShots.length - 1; i >= 0; i--) {
			const cs = this.chainShots[i];
			cs.lifetime += delta;

			cs.group.position.x += cs.vx * delta;
			cs.group.position.z += cs.vz * delta;
			cs.group.position.y = 2 + Math.sin(cs.lifetime * 3) * 0.3;
			cs.group.rotation.y += delta * 12; // Spin rapidly

			if (cs.lifetime >= cs.maxLifetime) {
				cs.group.removeFromParent();
				this.chainShots.splice(i, 1);
				continue;
			}

			// Hit detection against enemies
			let hit = false;
			for (const enemy of this.enemies) {
				if (enemy.isSinking) continue;
				const edx = enemy.group.position.x - cs.group.position.x;
				const edz = enemy.group.position.z - cs.group.position.z;
				const edist = Math.sqrt(edx * edx + edz * edz);
				if (edist < enemy.hullWidth + 0.5) {
					enemy.hp -= cs.damage;
					// SLOW the enemy
					enemy.speed *= 0.5;
					// Schedule speed restore
					const originalSpeed = enemy.speed * 2; // undo the halving
					setTimeout(() => {
						if (!enemy.isSinking) {
							enemy.speed = originalSpeed;
						}
					}, cs.slowDuration * 1000);

					playChainShotHit(this.volume);
					this.spawnExplosion(cs.group.position.x, 1, cs.group.position.z, 0.4);
					this.addLogEntry(`⛓ Chain shot hit! Enemy slowed ${cs.slowDuration}s`);

					if (enemy.hp <= 0) this.sinkEnemy(enemy);

					cs.group.removeFromParent();
					this.chainShots.splice(i, 1);
					hit = true;
					break;
				}
			}
			if (hit) continue;
		}
	}

	// ==== CANNON TYPE CYCLING ====

	private updateCannonTypeCycle() {
		// Q key to cycle cannon type
		const cycleKey = this.keys.has('q') || this.keys.has('Q');

		// XR controller: left thumbstick click to cycle
		const leftGamepad = this.world.input.xr.gamepads.left;
		const leftThumbClick = leftGamepad?.getButtonDown(InputComponent.Thumbstick) ?? false;

		if ((cycleKey || leftThumbClick) && !this.prevCannonCycleKey) {
			this.cannonType = (this.cannonType + 1) % CANNON_TYPE_COUNT;
			playCannonSwitch(this.volume);
			const cannonNames = ['Standard', 'Mortar', 'Chain Shot'];
			this.addLogEntry(`⚔ Switched to ${cannonNames[this.cannonType]} cannon`);
		}
		this.prevCannonCycleKey = cycleKey || leftThumbClick;
	}

	// ==== SHIP VISUAL UPGRADES ====

	private refreshShipVisuals() {
		if (!this.playerShipGroup) return;
		const scheme = getScheme(this.colorScheme);

		// Remove old upgrade visuals
		for (const v of this.shipUpgradeVisuals) v.removeFromParent();
		this.shipUpgradeVisuals = [];

		const totalLv = this.totalUpgradeLevel;

		// Scale up slightly with upgrades (max 1.3x at level 15+)
		const scaleFactor = 1 + Math.min(totalLv * 0.02, 0.3);
		this.playerShipGroup.scale.setScalar(scaleFactor);

		// Tier 1 (level 5+): Gold trim on hull
		if (totalLv >= 5) {
			const trim = new Mesh(
				new BoxGeometry(3.2 * scaleFactor, 0.15, 0.15),
				new MeshStandardMaterial({
					color: '#ffcc00', emissive: '#ffaa00',
					emissiveIntensity: 1.0, metalness: 0.9, roughness: 0.1,
				}),
			);
			trim.position.set(0, 0.8, 0);
			this.playerShipGroup.add(trim);
			this.shipUpgradeVisuals.push(trim);
		}

		// Tier 2 (level 8+): Bow ornament
		if (totalLv >= 8) {
			const ornament = new Mesh(
				new ConeGeometry(0.2, 0.6, 6),
				new MeshStandardMaterial({
					color: scheme.primary, emissive: scheme.primary,
					emissiveIntensity: 2.0,
				}),
			);
			ornament.position.set(0, 1.2, -2.2);
			ornament.rotation.x = -Math.PI / 4;
			this.playerShipGroup.add(ornament);
			this.shipUpgradeVisuals.push(ornament);
		}

		// Tier 3 (level 12+): Port & starboard lanterns
		if (totalLv >= 12) {
			for (const side of [-1, 1]) {
				const lantern = new Mesh(
					new SphereGeometry(0.15, 6, 6),
					new MeshStandardMaterial({
						color: side === -1 ? '#ff3300' : '#00ff33',
						emissive: side === -1 ? '#ff3300' : '#00ff33',
						emissiveIntensity: 3.0,
					}),
				);
				lantern.position.set(side * 1.8, 1.0, 0);
				this.playerShipGroup.add(lantern);
				this.shipUpgradeVisuals.push(lantern);
			}
		}

		// Tier 4 (level 16+): Crown atop main mast
		if (totalLv >= 16) {
			const crown = new Mesh(
				new CylinderGeometry(0.3, 0.15, 0.4, 6),
				new MeshStandardMaterial({
					color: '#ffdd00', emissive: '#ffaa00',
					emissiveIntensity: 2.5, metalness: 1.0, roughness: 0,
				}),
			);
			crown.position.set(0, 6.5, 0);
			this.playerShipGroup.add(crown);
			this.shipUpgradeVisuals.push(crown);

			// Crown spikes
			for (let s = 0; s < 5; s++) {
				const spike = new Mesh(
					new ConeGeometry(0.05, 0.3, 4),
					new MeshStandardMaterial({
						color: '#ffdd00', emissive: '#ffbb00', emissiveIntensity: 2,
					}),
				);
				const a = (s / 5) * Math.PI * 2;
				spike.position.set(Math.cos(a) * 0.2, 6.8, Math.sin(a) * 0.2);
				this.playerShipGroup.add(spike);
				this.shipUpgradeVisuals.push(spike);
			}
		}
	}
}
