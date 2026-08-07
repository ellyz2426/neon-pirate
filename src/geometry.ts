import {
	BoxGeometry,
	CylinderGeometry,
	ConeGeometry,
	SphereGeometry,
	RingGeometry,
	Mesh,
	MeshStandardMaterial,
	Group,
	PlaneGeometry,
	DoubleSide,
	AdditiveBlending,
	Color,
	FogExp2,
	Vector3,
	MathUtils,
} from '@iwsdk/core';

// Color schemes
export const COLOR_SCHEMES = [
	{ name: 'Cyan', primary: '#00ffff', secondary: '#0088ff', accent: '#ff00ff', water: '#001830', hull: '#1a3a4a' },
	{ name: 'Gold', primary: '#ffaa00', secondary: '#ff6600', accent: '#ffff00', water: '#1a1000', hull: '#4a3a1a' },
	{ name: 'Green', primary: '#00ff88', secondary: '#00cc44', accent: '#88ff00', water: '#001810', hull: '#1a4a2a' },
	{ name: 'Red', primary: '#ff3344', secondary: '#ff0066', accent: '#ff8800', water: '#180008', hull: '#4a1a1a' },
];

export function getScheme(idx: number) {
	return COLOR_SCHEMES[idx % COLOR_SCHEMES.length];
}

// Build player ship geometry
export function createPlayerShip(scheme: typeof COLOR_SCHEMES[0]): Group {
	const ship = new Group();
	const primary = new Color(scheme.primary);
	const secondary = new Color(scheme.secondary);
	const accent = new Color(scheme.accent);
	const hullColor = new Color(scheme.hull);

	// Hull - elongated box
	const hullGeo = new BoxGeometry(3, 1.2, 8);
	const hullMat = new MeshStandardMaterial({ color: hullColor, emissive: primary, emissiveIntensity: 0.15 });
	const hull = new Mesh(hullGeo, hullMat);
	hull.position.y = 0.6;
	ship.add(hull);

	// Bow (front) - cone
	const bowGeo = new ConeGeometry(1.5, 3, 4);
	const bowMat = new MeshStandardMaterial({ color: hullColor, emissive: primary, emissiveIntensity: 0.2 });
	const bow = new Mesh(bowGeo, bowMat);
	bow.rotation.x = Math.PI / 2;
	bow.position.set(0, 0.6, -5.5);
	ship.add(bow);

	// Stern raised section
	const sternGeo = new BoxGeometry(2.8, 1.5, 2.5);
	const sternMat = new MeshStandardMaterial({ color: hullColor, emissive: secondary, emissiveIntensity: 0.2 });
	const stern = new Mesh(sternGeo, sternMat);
	stern.position.set(0, 1.6, 3.5);
	ship.add(stern);

	// Mast
	const mastGeo = new CylinderGeometry(0.08, 0.1, 6, 8);
	const mastMat = new MeshStandardMaterial({ color: '#553322', emissive: secondary, emissiveIntensity: 0.1 });
	const mast = new Mesh(mastGeo, mastMat);
	mast.position.set(0, 4, -0.5);
	ship.add(mast);

	// Sail (plane)
	const sailGeo = new PlaneGeometry(3.5, 3);
	const sailMat = new MeshStandardMaterial({
		color: '#111111',
		emissive: accent,
		emissiveIntensity: 0.3,
		side: DoubleSide,
		transparent: true,
		opacity: 0.8,
	});
	const sail = new Mesh(sailGeo, sailMat);
	sail.position.set(0, 4.5, -0.5);
	ship.add(sail);

	// Crow's nest
	const nestGeo = new CylinderGeometry(0.4, 0.3, 0.3, 8);
	const nestMat = new MeshStandardMaterial({ color: '#332211', emissive: primary, emissiveIntensity: 0.3 });
	const nest = new Mesh(nestGeo, nestMat);
	nest.position.set(0, 7, -0.5);
	ship.add(nest);

	// Cannons (port side - left)
	for (let i = 0; i < 3; i++) {
		const cannonGroup = createCannon(primary);
		cannonGroup.position.set(-1.6, 0.8, -2 + i * 2);
		cannonGroup.rotation.y = Math.PI / 2;
		ship.add(cannonGroup);
	}

	// Cannons (starboard side - right)
	for (let i = 0; i < 3; i++) {
		const cannonGroup = createCannon(primary);
		cannonGroup.position.set(1.6, 0.8, -2 + i * 2);
		cannonGroup.rotation.y = -Math.PI / 2;
		ship.add(cannonGroup);
	}

	// Neon trim lines
	const trimGeo = new BoxGeometry(3.1, 0.05, 8.1);
	const trimMat = new MeshStandardMaterial({ color: primary, emissive: primary, emissiveIntensity: 1.0 });
	const trimTop = new Mesh(trimGeo, trimMat);
	trimTop.position.y = 1.2;
	ship.add(trimTop);
	const trimBot = new Mesh(trimGeo.clone(), trimMat);
	trimBot.position.y = 0.05;
	ship.add(trimBot);

	// Jolly Roger flag
	const flagGeo = new PlaneGeometry(0.8, 0.6);
	const flagMat = new MeshStandardMaterial({
		color: '#000000',
		emissive: primary,
		emissiveIntensity: 0.5,
		side: DoubleSide,
	});
	const flag = new Mesh(flagGeo, flagMat);
	flag.position.set(0, 7.3, -0.5);
	ship.add(flag);

	// Lanterns at bow and stern
	const lanternGeo = new SphereGeometry(0.15, 8, 8);
	const lanternMat = new MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 2.0 });
	const lanternBow = new Mesh(lanternGeo, lanternMat);
	lanternBow.position.set(0, 1.5, -6.5);
	ship.add(lanternBow);
	const lanternStern = new Mesh(lanternGeo.clone(), lanternMat);
	lanternStern.position.set(0, 2.5, 4.5);
	ship.add(lanternStern);

	return ship;
}

function createCannon(color: Color): Group {
	const g = new Group();
	const barrelGeo = new CylinderGeometry(0.12, 0.15, 1.2, 8);
	const barrelMat = new MeshStandardMaterial({ color: '#333333', emissive: color, emissiveIntensity: 0.3 });
	const barrel = new Mesh(barrelGeo, barrelMat);
	barrel.rotation.z = Math.PI / 2;
	g.add(barrel);
	const baseGeo = new BoxGeometry(0.3, 0.2, 0.4);
	const base = new Mesh(baseGeo, barrelMat);
	base.position.y = -0.15;
	g.add(base);
	return g;
}

// Enemy ship types
export enum EnemyType {
	Sloop = 0,       // Fast, weak
	Brigantine = 1,  // Medium
	Galleon = 2,     // Slow, tough
	ManOWar = 3,     // Boss
	GhostShip = 4,   // Spectral, phases in/out
}

export function createEnemyShip(type: EnemyType, scheme: typeof COLOR_SCHEMES[0]): Group {
	const ship = new Group();
	const enemyRed = new Color('#ff2222');
	const enemyDark = new Color('#331111');

	let hullW = 2, hullH = 0.8, hullL = 5;
	let mastH = 4;

	switch (type) {
		case EnemyType.Sloop:
			hullW = 1.8; hullH = 0.7; hullL = 4; mastH = 3.5;
			break;
		case EnemyType.Brigantine:
			hullW = 2.5; hullH = 1; hullL = 6; mastH = 5;
			break;
		case EnemyType.Galleon:
			hullW = 3; hullH = 1.3; hullL = 8; mastH = 6;
			break;
		case EnemyType.ManOWar:
			hullW = 4; hullH = 1.8; hullL = 12; mastH = 8;
			break;
	}

	// Hull
	const hullGeo = new BoxGeometry(hullW, hullH, hullL);
	const hullMat = new MeshStandardMaterial({ color: enemyDark, emissive: enemyRed, emissiveIntensity: 0.2 });
	const hull = new Mesh(hullGeo, hullMat);
	hull.position.y = hullH / 2;
	ship.add(hull);

	// Bow
	const bowGeo = new ConeGeometry(hullW / 2, hullL * 0.3, 4);
	const bowMat = new MeshStandardMaterial({ color: enemyDark, emissive: enemyRed, emissiveIntensity: 0.25 });
	const bow = new Mesh(bowGeo, bowMat);
	bow.rotation.x = Math.PI / 2;
	bow.position.set(0, hullH / 2, -(hullL / 2 + hullL * 0.15));
	ship.add(bow);

	// Mast
	const mastGeo = new CylinderGeometry(0.06, 0.08, mastH, 8);
	const mastMat = new MeshStandardMaterial({ color: '#442211', emissive: enemyRed, emissiveIntensity: 0.1 });
	const mast = new Mesh(mastGeo, mastMat);
	mast.position.set(0, hullH + mastH / 2, 0);
	ship.add(mast);

	// Sail
	const sailGeo = new PlaneGeometry(hullW * 1.2, mastH * 0.6);
	const sailMat = new MeshStandardMaterial({
		color: '#220000',
		emissive: enemyRed,
		emissiveIntensity: 0.4,
		side: DoubleSide,
		transparent: true,
		opacity: 0.7,
	});
	const sail = new Mesh(sailGeo, sailMat);
	sail.position.set(0, hullH + mastH * 0.6, 0);
	ship.add(sail);

	// Red neon trim
	const trimGeo = new BoxGeometry(hullW + 0.1, 0.04, hullL + 0.1);
	const trimMat = new MeshStandardMaterial({ color: enemyRed, emissive: enemyRed, emissiveIntensity: 1.0 });
	const trim = new Mesh(trimGeo, trimMat);
	trim.position.y = hullH;
	ship.add(trim);

	// HP bar (will be scaled by enemy system)
	const hpBarBg = new Mesh(
		new BoxGeometry(hullW * 0.8, 0.12, 0.04),
		new MeshStandardMaterial({ color: '#330000', emissive: '#330000', emissiveIntensity: 0.3 })
	);
	hpBarBg.position.set(0, hullH + mastH + 0.5, 0);
	hpBarBg.name = 'hp-bar-bg';
	ship.add(hpBarBg);

	const hpBar = new Mesh(
		new BoxGeometry(hullW * 0.8, 0.1, 0.05),
		new MeshStandardMaterial({ color: '#ff0000', emissive: '#ff0000', emissiveIntensity: 1.0 })
	);
	hpBar.position.set(0, hullH + mastH + 0.5, 0.01);
	hpBar.name = 'hp-bar';
	ship.add(hpBar);

	// Cannons for enemy ships
	const cannonCount = type === EnemyType.ManOWar ? 5 : type === EnemyType.Galleon ? 3 : type === EnemyType.Brigantine ? 2 : 1;
	for (let i = 0; i < cannonCount; i++) {
		const zOffset = -hullL / 2 + hullL * (i + 1) / (cannonCount + 1);
		const cannonL = createCannon(enemyRed);
		cannonL.position.set(-hullW / 2 - 0.2, hullH * 0.7, zOffset);
		cannonL.rotation.y = Math.PI / 2;
		ship.add(cannonL);
		const cannonR = createCannon(enemyRed);
		cannonR.position.set(hullW / 2 + 0.2, hullH * 0.7, zOffset);
		cannonR.rotation.y = -Math.PI / 2;
		ship.add(cannonR);
	}

	return ship;
}

export function createCannonball(isEnemy: boolean, scheme: typeof COLOR_SCHEMES[0]): Mesh {
	const geo = new SphereGeometry(0.2, 8, 8);
	const color = isEnemy ? '#ff3333' : scheme.primary;
	const mat = new MeshStandardMaterial({
		color,
		emissive: color,
		emissiveIntensity: 1.5,
	});
	return new Mesh(geo, mat);
}

// Treasure rarity: 0=common, 1=rare, 2=legendary
export function createTreasure(scheme: typeof COLOR_SCHEMES[0], rarity: number = 0): Group {
	const g = new Group();
	const chestColors = ['#886622', '#4488cc', '#cc44ff'];
	const glowColors = ['#ffdd00', '#44ccff', '#ff44ff'];
	const emissiveIntensities = [0.5, 1.0, 1.8];
	const scales = [1.0, 1.15, 1.35];
	const r = Math.min(rarity, 2);

	// Chest body
	const chestGeo = new BoxGeometry(0.6, 0.4, 0.4);
	const chestMat = new MeshStandardMaterial({
		color: chestColors[r],
		emissive: chestColors[r],
		emissiveIntensity: emissiveIntensities[r],
	});
	const chest = new Mesh(chestGeo, chestMat);
	g.add(chest);

	// Gold glow on top
	const glowGeo = new SphereGeometry(0.2, 8, 8);
	const glowMat = new MeshStandardMaterial({
		color: glowColors[r],
		emissive: glowColors[r],
		emissiveIntensity: 2.0 + r * 0.8,
		transparent: true,
		opacity: 0.9,
	});
	const glow = new Mesh(glowGeo, glowMat);
	glow.position.y = 0.3;
	g.add(glow);

	// Legendary gets an outer aura ring
	if (r === 2) {
		const auraGeo = new RingGeometry(0.5, 0.8, 12);
		const auraMat = new MeshStandardMaterial({
			color: '#ff44ff', emissive: '#ff44ff', emissiveIntensity: 2.5,
			transparent: true, opacity: 0.4, side: DoubleSide,
		});
		const aura = new Mesh(auraGeo, auraMat);
		aura.rotation.x = -Math.PI / 2;
		aura.position.y = 0.05;
		g.add(aura);
	}
	// Rare gets a shimmer ring
	if (r === 1) {
		const shimGeo = new RingGeometry(0.35, 0.55, 8);
		const shimMat = new MeshStandardMaterial({
			color: '#44ccff', emissive: '#44ccff', emissiveIntensity: 1.5,
			transparent: true, opacity: 0.3, side: DoubleSide,
		});
		const shim = new Mesh(shimGeo, shimMat);
		shim.rotation.x = -Math.PI / 2;
		shim.position.y = 0.05;
		g.add(shim);
	}

	g.scale.setScalar(scales[r]);
	return g;
}

// Wake foam — wider fan shape behind ships
export function createWakeFoam(): Mesh {
	const geo = new SphereGeometry(0.12, 4, 4);
	const mat = new MeshStandardMaterial({
		color: '#bbddff',
		emissive: '#88aacc',
		emissiveIntensity: 0.6,
		transparent: true,
		opacity: 0.6,
	});
	return new Mesh(geo, mat);
}

// Spray particle for turns
export function createSprayParticle(): Mesh {
	const geo = new SphereGeometry(0.06, 3, 3);
	const mat = new MeshStandardMaterial({
		color: '#ffffff',
		emissive: '#aaddff',
		emissiveIntensity: 1.0,
		transparent: true,
		opacity: 0.7,
	});
	return new Mesh(geo, mat);
}

export function createExplosion(scheme: typeof COLOR_SCHEMES[0]): Group {
	const g = new Group();
	const colors = ['#ff6600', '#ffaa00', '#ff3300', scheme.primary];
	for (let i = 0; i < 12; i++) {
		const geo = new SphereGeometry(0.1 + Math.random() * 0.2, 6, 6);
		const c = colors[Math.floor(Math.random() * colors.length)];
		const mat = new MeshStandardMaterial({
			color: c,
			emissive: c,
			emissiveIntensity: 2.0,
			transparent: true,
			opacity: 0.9,
		});
		const m = new Mesh(geo, mat);
		m.position.set(
			(Math.random() - 0.5) * 2,
			(Math.random() - 0.5) * 2,
			(Math.random() - 0.5) * 2,
		);
		g.add(m);
	}
	return g;
}

export function createOceanPlane(scheme: typeof COLOR_SCHEMES[0]): Mesh {
	const geo = new PlaneGeometry(300, 300, 64, 64);
	const mat = new MeshStandardMaterial({
		color: scheme.water,
		emissive: scheme.primary,
		emissiveIntensity: 0.05,
		transparent: true,
		opacity: 0.85,
		side: DoubleSide,
	});
	const mesh = new Mesh(geo, mat);
	mesh.rotation.x = -Math.PI / 2;
	mesh.position.y = -0.1;
	return mesh;
}

export function createSeaMine(scheme: typeof COLOR_SCHEMES[0]): Group {
	const g = new Group();
	const mineGeo = new SphereGeometry(0.5, 8, 8);
	const mineMat = new MeshStandardMaterial({
		color: '#333333',
		emissive: '#ff0000',
		emissiveIntensity: 0.5,
	});
	const mine = new Mesh(mineGeo, mineMat);
	g.add(mine);

	// Spikes
	for (let i = 0; i < 8; i++) {
		const spike = new Mesh(
			new ConeGeometry(0.08, 0.25, 4),
			new MeshStandardMaterial({ color: '#666666', emissive: '#ff4400', emissiveIntensity: 0.5 })
		);
		const theta = (i / 8) * Math.PI * 2;
		spike.position.set(Math.cos(theta) * 0.5, Math.sin(theta) * 0.5, 0);
		spike.lookAt(mine.position);
		g.add(spike);
	}
	return g;
}

export function createWaterSplash(scheme: typeof COLOR_SCHEMES[0]): Group {
	const g = new Group();
	for (let i = 0; i < 8; i++) {
		const dropGeo = new SphereGeometry(0.06, 4, 4);
		const dropMat = new MeshStandardMaterial({
			color: scheme.primary,
			emissive: scheme.primary,
			emissiveIntensity: 0.8,
			transparent: true,
			opacity: 0.7,
		});
		const drop = new Mesh(dropGeo, dropMat);
		const angle = (i / 8) * Math.PI * 2;
		drop.position.set(Math.cos(angle) * 0.5, Math.random() * 0.8, Math.sin(angle) * 0.5);
		g.add(drop);
	}
	return g;
}

// Starfield
export function createStarfield(): Group {
	const g = new Group();
	for (let i = 0; i < 300; i++) {
		const starGeo = new SphereGeometry(0.1 + Math.random() * 0.15, 4, 4);
		const brightness = 0.3 + Math.random() * 0.7;
		const starMat = new MeshStandardMaterial({
			color: '#ffffff',
			emissive: '#ffffff',
			emissiveIntensity: brightness * 2,
		});
		const star = new Mesh(starGeo, starMat);
		const theta = Math.random() * Math.PI * 2;
		const phi = Math.random() * Math.PI * 0.4;
		const r = 150 + Math.random() * 50;
		star.position.set(
			r * Math.sin(phi) * Math.cos(theta),
			r * Math.cos(phi) + 20,
			r * Math.sin(phi) * Math.sin(theta),
		);
		g.add(star);
	}
	return g;
}

// Compass rose indicator
export function createCompass(scheme: typeof COLOR_SCHEMES[0]): Group {
	const g = new Group();
	// Outer ring
	const ring = new Mesh(
		new RingGeometry(0.8, 1.0, 24),
		new MeshStandardMaterial({
			color: scheme.accent, emissive: scheme.accent, emissiveIntensity: 0.5,
			transparent: true, opacity: 0.4, side: DoubleSide,
		}),
	);
	ring.rotation.x = -Math.PI / 2;
	g.add(ring);

	// Inner ring
	const innerRing = new Mesh(
		new RingGeometry(0.3, 0.35, 16),
		new MeshStandardMaterial({
			color: scheme.primary, emissive: scheme.primary, emissiveIntensity: 0.8,
			transparent: true, opacity: 0.6, side: DoubleSide,
		}),
	);
	innerRing.rotation.x = -Math.PI / 2;
	g.add(innerRing);

	// North pointer
	const north = new Mesh(
		new ConeGeometry(0.08, 0.5, 4),
		new MeshStandardMaterial({
			color: '#ff3333', emissive: '#ff3333', emissiveIntensity: 1.5,
		}),
	);
	north.position.set(0, 0.02, -0.55);
	north.rotation.x = -Math.PI / 2;
	g.add(north);

	// South pointer
	const south = new Mesh(
		new ConeGeometry(0.06, 0.4, 4),
		new MeshStandardMaterial({
			color: scheme.primary, emissive: scheme.primary, emissiveIntensity: 0.5,
		}),
	);
	south.position.set(0, 0.02, 0.55);
	south.rotation.x = Math.PI / 2;
	g.add(south);

	// East/West marks
	for (let i = 0; i < 4; i++) {
		const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
		const tick = new Mesh(
			new BoxGeometry(0.03, 0.01, 0.12),
			new MeshStandardMaterial({
				color: scheme.accent, emissive: scheme.accent, emissiveIntensity: 0.4,
			}),
		);
		tick.position.set(Math.cos(angle) * 0.6, 0.01, Math.sin(angle) * 0.6);
		tick.lookAt(0, 0.01, 0);
		g.add(tick);
	}

	return g;
}

// Enemy radar blip
export function createRadarBlip(type: EnemyType, scheme: typeof COLOR_SCHEMES[0]): Mesh {
	const colors: Record<EnemyType, string> = {
		[EnemyType.Sloop]: '#00ff66',
		[EnemyType.Brigantine]: '#ffaa00',
		[EnemyType.Galleon]: '#ff4444',
		[EnemyType.ManOWar]: '#ff00ff',
		[EnemyType.GhostShip]: '#66ffff',
	};
	const sizes: Record<EnemyType, number> = {
		[EnemyType.Sloop]: 0.04,
		[EnemyType.Brigantine]: 0.05,
		[EnemyType.Galleon]: 0.06,
		[EnemyType.ManOWar]: 0.08,
		[EnemyType.GhostShip]: 0.06,
	};
	return new Mesh(
		new SphereGeometry(sizes[type], 4, 3),
		new MeshStandardMaterial({
			color: colors[type], emissive: colors[type], emissiveIntensity: 2,
		}),
	);
}

// Decorative floating lantern
export function createLantern(scheme: typeof COLOR_SCHEMES[0]): Group {
	const g = new Group();
	// Frame
	const frame = new Mesh(
		new BoxGeometry(0.15, 0.2, 0.15),
		new MeshStandardMaterial({
			color: '#444444', emissive: '#222222', emissiveIntensity: 0.2,
		}),
	);
	g.add(frame);

	// Light glow
	const glow = new Mesh(
		new SphereGeometry(0.1, 6, 4),
		new MeshStandardMaterial({
			color: scheme.accent, emissive: scheme.accent, emissiveIntensity: 3,
			transparent: true, opacity: 0.8,
		}),
	);
	g.add(glow);

	// Top hook
	const hook = new Mesh(
		new CylinderGeometry(0.01, 0.01, 0.1, 4),
		new MeshStandardMaterial({ color: '#555555' }),
	);
	hook.position.y = 0.15;
	g.add(hook);

	return g;
}

// Create island decoration (distant background)
export function createIsland(scheme: typeof COLOR_SCHEMES[0]): Group {
	const g = new Group();
	// Rock base
	const base = new Mesh(
		new CylinderGeometry(3, 4, 1.5, 8),
		new MeshStandardMaterial({
			color: '#2a1f0e', emissive: '#1a0f04', emissiveIntensity: 0.2,
		}),
	);
	g.add(base);

	// Palm tree trunk
	const trunk = new Mesh(
		new CylinderGeometry(0.15, 0.2, 3, 6),
		new MeshStandardMaterial({
			color: '#5c3a1e', emissive: '#3a200a', emissiveIntensity: 0.2,
		}),
	);
	trunk.position.set(0.5, 2, 0);
	trunk.rotation.z = -0.15;
	g.add(trunk);

	// Palm fronds
	for (let i = 0; i < 5; i++) {
		const angle = (i / 5) * Math.PI * 2;
		const frond = new Mesh(
			new ConeGeometry(0.6, 1.8, 3),
			new MeshStandardMaterial({
				color: '#006600', emissive: '#004400', emissiveIntensity: 0.3,
				transparent: true, opacity: 0.8,
			}),
		);
		frond.position.set(
			0.5 + Math.cos(angle) * 0.6,
			3.5,
			Math.sin(angle) * 0.6,
		);
		frond.rotation.set(Math.random() * 0.5, 0, Math.random() * 0.5 - 0.25);
		g.add(frond);
	}

	// Skull decoration
	const skull = new Mesh(
		new SphereGeometry(0.2, 6, 4),
		new MeshStandardMaterial({
			color: scheme.primary, emissive: scheme.primary, emissiveIntensity: 0.5,
		}),
	);
	skull.position.set(-1, 1, 0.5);
	g.add(skull);

	return g;
}

// Kraken tentacle segment
export function createKrakenTentacle(scheme: typeof COLOR_SCHEMES[0]): Group {
	const g = new Group();
	const segCount = 8;
	for (let i = 0; i < segCount; i++) {
		const radius = 0.6 - i * 0.06;
		const seg = new Mesh(
			new CylinderGeometry(radius, radius + 0.05, 1.5, 8),
			new MeshStandardMaterial({
				color: '#2a0040',
				emissive: scheme.accent,
				emissiveIntensity: 0.3 + i * 0.05,
			}),
		);
		seg.position.y = i * 1.3;
		seg.rotation.z = Math.sin(i * 0.5) * 0.15;
		g.add(seg);

		// Suction cups (small spheres on underside)
		if (i > 1 && i < segCount - 1) {
			const cup = new Mesh(
				new SphereGeometry(0.12, 6, 4),
				new MeshStandardMaterial({
					color: '#550066',
					emissive: scheme.accent,
					emissiveIntensity: 0.6,
				}),
			);
			cup.position.set(0, i * 1.3, radius * 0.7);
			g.add(cup);
		}
	}
	return g;
}

// Kraken head/body
export function createKrakenHead(scheme: typeof COLOR_SCHEMES[0]): Group {
	const g = new Group();
	// Main body - large elongated sphere
	const body = new Mesh(
		new SphereGeometry(3, 12, 10),
		new MeshStandardMaterial({
			color: '#1a0030',
			emissive: scheme.accent,
			emissiveIntensity: 0.4,
		}),
	);
	body.scale.set(1, 0.7, 1.3);
	g.add(body);

	// Eyes - two glowing orbs
	for (let side = -1; side <= 1; side += 2) {
		const eye = new Mesh(
			new SphereGeometry(0.5, 8, 6),
			new MeshStandardMaterial({
				color: '#ffff00',
				emissive: '#ffaa00',
				emissiveIntensity: 3,
			}),
		);
		eye.position.set(side * 1.5, 0.5, -2.5);
		g.add(eye);

		// Pupil
		const pupil = new Mesh(
			new SphereGeometry(0.2, 6, 4),
			new MeshStandardMaterial({
				color: '#000000',
				emissive: '#220000',
				emissiveIntensity: 0.3,
			}),
		);
		pupil.position.set(side * 1.5, 0.5, -2.9);
		g.add(pupil);
	}

	// Beak
	const beak = new Mesh(
		new ConeGeometry(0.8, 1.5, 6),
		new MeshStandardMaterial({
			color: '#110020',
			emissive: scheme.primary,
			emissiveIntensity: 0.4,
		}),
	);
	beak.position.set(0, -0.5, -3.5);
	beak.rotation.x = Math.PI / 2;
	g.add(beak);

	// Crown ridges
	for (let i = 0; i < 5; i++) {
		const ridge = new Mesh(
			new ConeGeometry(0.3, 1.2, 4),
			new MeshStandardMaterial({
				color: '#330055',
				emissive: scheme.accent,
				emissiveIntensity: 0.5,
			}),
		);
		const angle = ((i - 2) / 5) * Math.PI * 0.6;
		ridge.position.set(Math.sin(angle) * 2, 2, Math.cos(angle) * -1);
		ridge.rotation.z = angle * 0.4;
		g.add(ridge);
	}

	return g;
}

// Harpoon projectile
export function createHarpoon(scheme: typeof COLOR_SCHEMES[0]): Group {
	const g = new Group();
	// Shaft
	const shaft = new Mesh(
		new CylinderGeometry(0.04, 0.04, 3, 6),
		new MeshStandardMaterial({
			color: '#664422',
			emissive: scheme.secondary,
			emissiveIntensity: 0.3,
		}),
	);
	shaft.rotation.x = Math.PI / 2;
	g.add(shaft);

	// Barbed tip
	const tip = new Mesh(
		new ConeGeometry(0.12, 0.5, 4),
		new MeshStandardMaterial({
			color: '#888888',
			emissive: scheme.primary,
			emissiveIntensity: 0.8,
		}),
	);
	tip.rotation.x = -Math.PI / 2;
	tip.position.z = -1.7;
	g.add(tip);

	// Barbs
	for (let side = -1; side <= 1; side += 2) {
		const barb = new Mesh(
			new ConeGeometry(0.06, 0.25, 3),
			new MeshStandardMaterial({
				color: '#888888',
				emissive: scheme.primary,
				emissiveIntensity: 0.5,
			}),
		);
		barb.position.set(side * 0.1, 0, -1.3);
		barb.rotation.z = side * 0.6;
		barb.rotation.x = -0.3;
		g.add(barb);
	}

	return g;
}

// Rope segment for harpoon line
export function createRopeSegment(): Mesh {
	return new Mesh(
		new SphereGeometry(0.03, 3, 2),
		new MeshStandardMaterial({
			color: '#997744',
			emissive: '#554422',
			emissiveIntensity: 0.2,
		}),
	);
}

// Ship wreckage piece
export function createWreckage(): Group {
	const g = new Group();
	const woodColor = '#5c3a1e';
	const type = Math.floor(Math.random() * 3);

	if (type === 0) {
		// Broken plank
		const plank = new Mesh(
			new BoxGeometry(0.3 + Math.random() * 0.3, 0.08, 1.5 + Math.random()),
			new MeshStandardMaterial({ color: woodColor, emissive: '#2a1800', emissiveIntensity: 0.15 }),
		);
		g.add(plank);
	} else if (type === 1) {
		// Barrel half
		const half = new Mesh(
			new CylinderGeometry(0.3, 0.3, 0.5, 6, 1, false, 0, Math.PI),
			new MeshStandardMaterial({ color: '#8B4513', emissive: '#331100', emissiveIntensity: 0.2 }),
		);
		half.rotation.z = Math.PI / 2;
		g.add(half);
	} else {
		// Mast fragment
		const frag = new Mesh(
			new CylinderGeometry(0.06, 0.08, 2 + Math.random(), 6),
			new MeshStandardMaterial({ color: woodColor, emissive: '#1a0f04', emissiveIntensity: 0.15 }),
		);
		frag.rotation.z = Math.random() * Math.PI;
		g.add(frag);
		// Torn sail scrap
		const scrap = new Mesh(
			new PlaneGeometry(0.8, 0.5),
			new MeshStandardMaterial({
				color: '#222222', transparent: true, opacity: 0.5, side: DoubleSide,
			}),
		);
		scrap.position.set(0.3, 0.2, 0);
		scrap.rotation.z = 0.3;
		g.add(scrap);
	}

	return g;
}

// Floating seagull silhouette
export function createSeagull(): Group {
	const g = new Group();
	// Body
	const body = new Mesh(
		new SphereGeometry(0.08, 4, 3),
		new MeshStandardMaterial({
			color: '#888888', emissive: '#444444', emissiveIntensity: 0.3,
		}),
	);
	g.add(body);

	// Wings
	for (let side = -1; side <= 1; side += 2) {
		const wing = new Mesh(
			new BoxGeometry(0.25, 0.01, 0.08),
			new MeshStandardMaterial({
				color: '#999999', emissive: '#555555', emissiveIntensity: 0.3,
			}),
		);
		wing.position.set(side * 0.15, 0.02, 0);
		wing.rotation.z = side * 0.3;
		g.add(wing);
	}

	return g;
}

// Ghost Ship — spectral, semi-transparent vessel
export function createGhostShip(scheme: typeof COLOR_SCHEMES[0]): Group {
	const ship = new Group();
	const ghostColor = new Color('#88ddff');
	const ghostDark = new Color('#224455');

	// Hull — elongated, semi-transparent
	const hullGeo = new BoxGeometry(2.4, 1.0, 6);
	const hullMat = new MeshStandardMaterial({
		color: ghostDark, emissive: ghostColor, emissiveIntensity: 0.5,
		transparent: true, opacity: 0.45,
	});
	const hull = new Mesh(hullGeo, hullMat);
	hull.position.y = 0.6;
	ship.add(hull);

	// Bow — ghostly cone
	const bowGeo = new ConeGeometry(1.2, 2.5, 4);
	const bowMat = new MeshStandardMaterial({
		color: ghostDark, emissive: ghostColor, emissiveIntensity: 0.6,
		transparent: true, opacity: 0.4,
	});
	const bow = new Mesh(bowGeo, bowMat);
	bow.rotation.x = Math.PI / 2;
	bow.position.set(0, 0.6, -4.5);
	ship.add(bow);

	// Mast — tattered, ethereal
	const mastGeo = new CylinderGeometry(0.1, 0.1, 5, 6);
	const mastMat = new MeshStandardMaterial({
		color: '#556677', emissive: ghostColor, emissiveIntensity: 0.3,
		transparent: true, opacity: 0.5,
	});
	const mast = new Mesh(mastGeo, mastMat);
	mast.position.set(0, 3.6, 0);
	ship.add(mast);

	// Tattered sail — ragged triangle
	const sailGeo = new ConeGeometry(1.5, 3, 3);
	const sailMat = new MeshStandardMaterial({
		color: '#445566', emissive: ghostColor, emissiveIntensity: 0.4,
		transparent: true, opacity: 0.3, side: DoubleSide,
	});
	const sail = new Mesh(sailGeo, sailMat);
	sail.position.set(0, 3.5, -0.5);
	sail.rotation.z = Math.PI;
	ship.add(sail);

	// Ghostly glow orbs at bow and stern
	const orbGeo = new SphereGeometry(0.35, 8, 6);
	const orbMat = new MeshStandardMaterial({
		color: '#aaffff', emissive: '#aaffff', emissiveIntensity: 2,
		transparent: true, opacity: 0.7,
	});
	const orbBow = new Mesh(orbGeo, orbMat);
	orbBow.position.set(0, 1.5, -4);
	ship.add(orbBow);
	const orbStern = new Mesh(orbGeo, orbMat);
	orbStern.position.set(0, 1.5, 3);
	ship.add(orbStern);

	// HP bar
	const hpBg = new Mesh(
		new BoxGeometry(2.4, 0.12, 0.12),
		new MeshStandardMaterial({ color: '#222222' }),
	);
	hpBg.position.y = 3.5;
	hpBg.name = 'hp-bg';
	ship.add(hpBg);
	const hpBar = new Mesh(
		new BoxGeometry(2.4, 0.12, 0.12),
		new MeshStandardMaterial({ color: '#66ffff', emissive: '#66ffff', emissiveIntensity: 1 }),
	);
	hpBar.position.y = 3.5;
	hpBar.name = 'hp-bar';
	ship.add(hpBar);

	return ship;
}

// Moon mesh with glow halo
export function createMoonMesh(): Group {
	const g = new Group();
	const moonGeo = new SphereGeometry(3, 16, 12);
	const moonMat = new MeshStandardMaterial({
		color: '#eeeedd', emissive: '#aabbcc', emissiveIntensity: 0.8,
	});
	const moon = new Mesh(moonGeo, moonMat);
	g.add(moon);

	// Glow halo
	const glowGeo = new SphereGeometry(4.5, 16, 12);
	const glowMat = new MeshStandardMaterial({
		color: '#aabbdd', emissive: '#8899bb', emissiveIntensity: 0.6,
		transparent: true, opacity: 0.15,
	});
	const glow = new Mesh(glowGeo, glowMat);
	g.add(glow);

	return g;
}

// ── Merchant Ship Geometry ──────────────────────────────────
export function createMerchantShip(scheme: typeof COLOR_SCHEMES[0]): Group {
	const group = new Group();

	// Wider hull (merchant cargo ship)
	const hull = new Mesh(
		new BoxGeometry(3.5, 1.2, 7),
		new MeshStandardMaterial({
			color: '#6B4226', emissive: '#3B2210', emissiveIntensity: 0.3,
		}),
	);
	hull.position.y = 0.6;
	group.add(hull);

	// Bow
	const bow = new Mesh(
		new ConeGeometry(1.75, 2, 4),
		new MeshStandardMaterial({
			color: '#6B4226', emissive: '#3B2210', emissiveIntensity: 0.3,
		}),
	);
	bow.rotation.x = Math.PI / 2;
	bow.position.set(0, 0.6, -4.5);
	group.add(bow);

	// Stern
	const stern = new Mesh(
		new BoxGeometry(3.5, 2, 0.8),
		new MeshStandardMaterial({
			color: '#5A3620', emissive: '#2A1810', emissiveIntensity: 0.3,
		}),
	);
	stern.position.set(0, 1, 3.8);
	group.add(stern);

	// Main mast
	const mast = new Mesh(
		new CylinderGeometry(0.08, 0.1, 6, 6),
		new MeshStandardMaterial({ color: '#4A3018', emissive: '#1A1008', emissiveIntensity: 0.2 }),
	);
	mast.position.set(0, 4, -0.5);
	group.add(mast);

	// White sails (merchant identifying feature)
	const sail = new Mesh(
		new BoxGeometry(3, 3, 0.05),
		new MeshStandardMaterial({
			color: '#eeeeee', emissive: '#888888', emissiveIntensity: 0.3,
			transparent: true, opacity: 0.9, side: DoubleSide,
		}),
	);
	sail.position.set(0, 4.5, -0.5);
	group.add(sail);

	// Second smaller sail
	const sail2 = new Mesh(
		new BoxGeometry(2.2, 2, 0.05),
		new MeshStandardMaterial({
			color: '#dddddd', emissive: '#777777', emissiveIntensity: 0.25,
			transparent: true, opacity: 0.85, side: DoubleSide,
		}),
	);
	sail2.position.set(0, 3, 2);
	group.add(sail2);

	// Cargo crates on deck (3 crates)
	const crateColors = ['#8B6914', '#7A5C10', '#9B7924'];
	for (let i = 0; i < 3; i++) {
		const crate = new Mesh(
			new BoxGeometry(0.8, 0.7, 0.8),
			new MeshStandardMaterial({
				color: crateColors[i], emissive: '#332200', emissiveIntensity: 0.2,
			}),
		);
		crate.position.set(-0.8 + i * 0.9, 1.6, 0.5 + (i % 2) * 0.5);
		crate.rotation.y = Math.random() * 0.3;
		group.add(crate);
	}

	// Extra stacked crate
	const topCrate = new Mesh(
		new BoxGeometry(0.7, 0.6, 0.7),
		new MeshStandardMaterial({
			color: '#A08020', emissive: '#443300', emissiveIntensity: 0.2,
		}),
	);
	topCrate.position.set(0, 2.2, 0.7);
	topCrate.rotation.y = 0.4;
	group.add(topCrate);

	// HP bar background
	const hpBg = new Mesh(
		new BoxGeometry(3.5, 0.12, 0.05),
		new MeshStandardMaterial({ color: '#333333' }),
	);
	hpBg.position.set(0, 3, 0);
	hpBg.name = 'hp-bg';
	group.add(hpBg);

	// HP bar foreground (yellow for neutral)
	const hpBar = new Mesh(
		new BoxGeometry(3.5, 0.12, 0.06),
		new MeshStandardMaterial({ color: '#ffdd00', emissive: '#ffdd00', emissiveIntensity: 1 }),
	);
	hpBar.position.set(0, 3, 0);
	hpBar.name = 'hp-bar';
	group.add(hpBar);

	group.scale.setScalar(0.6);
	return group;
}

// ── Coral Reef Geometry ──────────────────────────────────────
export function createCoralReef(): Group {
	const group = new Group();

	// Base reef platform — irregular shape from multiple overlapping box/sphere pieces
	const baseMat = new MeshStandardMaterial({
		color: '#8B3A3A', emissive: '#5A1A1A', emissiveIntensity: 0.4,
		transparent: true, opacity: 0.85,
	});

	// Main base
	const base = new Mesh(new BoxGeometry(6, 0.4, 5), baseMat);
	base.position.y = -0.3;
	group.add(base);

	// Irregular edges
	for (let i = 0; i < 5; i++) {
		const edge = new Mesh(
			new SphereGeometry(1.2 + Math.random() * 0.8, 6, 5),
			baseMat.clone(),
		);
		const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
		edge.position.set(Math.cos(angle) * 2.5, -0.2, Math.sin(angle) * 2);
		edge.scale.y = 0.3;
		group.add(edge);
	}

	// Coral branches — vertical spiky bits
	const coralColors = ['#CC4444', '#AA3333', '#DD6655', '#BB5544'];
	for (let i = 0; i < 8; i++) {
		const branchColor = coralColors[Math.floor(Math.random() * coralColors.length)];
		const branch = new Mesh(
			new ConeGeometry(0.15 + Math.random() * 0.15, 0.8 + Math.random() * 0.6, 5),
			new MeshStandardMaterial({
				color: branchColor, emissive: branchColor, emissiveIntensity: 0.3,
			}),
		);
		branch.position.set(
			(Math.random() - 0.5) * 4,
			0.2 + Math.random() * 0.3,
			(Math.random() - 0.5) * 3,
		);
		branch.rotation.z = (Math.random() - 0.5) * 0.4;
		group.add(branch);
	}

	// Fan coral — flat rings
	for (let i = 0; i < 3; i++) {
		const fan = new Mesh(
			new RingGeometry(0.3, 0.7, 8),
			new MeshStandardMaterial({
				color: '#DD5555', emissive: '#AA2222', emissiveIntensity: 0.5,
				transparent: true, opacity: 0.7, side: DoubleSide,
			}),
		);
		fan.position.set(
			(Math.random() - 0.5) * 3,
			0.5 + Math.random() * 0.3,
			(Math.random() - 0.5) * 2,
		);
		fan.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.3);
		group.add(fan);
	}

	return group;
}

// ── Lava Rock Geometry ──────────────────────────────────────
export function createLavaRock(): Mesh {
	const rock = new Mesh(
		new SphereGeometry(0.6 + Math.random() * 0.3, 6, 5),
		new MeshStandardMaterial({
			color: '#441100', emissive: '#ff4400', emissiveIntensity: 1.5,
			transparent: true, opacity: 0.9,
		}),
	);
	return rock;
}


// ── Sea Fortress ────────────────────────────────────────────
export function createSeaFortress(scheme: typeof COLOR_SCHEMES[0]): Group {
	const g = new Group();

	// Stone base platform
	const baseMat = new MeshStandardMaterial({
		color: '#555555', emissive: '#222222', emissiveIntensity: 0.2,
	});
	const base = new Mesh(new CylinderGeometry(5, 6, 1.5, 8), baseMat);
	base.position.y = 0.5;
	g.add(base);

	// Wall sections (destructible)
	const wallMat = new MeshStandardMaterial({
		color: '#777777', emissive: '#333333', emissiveIntensity: 0.3,
	});
	for (let i = 0; i < 6; i++) {
		const angle = (i / 6) * Math.PI * 2;
		const wall = new Mesh(new BoxGeometry(2.5, 2.5, 0.6), wallMat);
		wall.position.set(Math.cos(angle) * 4.5, 2.2, Math.sin(angle) * 4.5);
		wall.rotation.y = angle + Math.PI / 2;
		wall.userData = { isWall: true, wallIndex: i };
		g.add(wall);
	}

	// Cannon turrets on top
	const turretMat = new MeshStandardMaterial({
		color: '#444444', emissive: scheme.accent, emissiveIntensity: 0.4,
	});
	for (let i = 0; i < 4; i++) {
		const angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
		const turret = new Group();
		const turretBase = new Mesh(new CylinderGeometry(0.5, 0.6, 0.8, 6), turretMat);
		turret.add(turretBase);
		const barrel = new Mesh(
			new CylinderGeometry(0.12, 0.12, 1.2, 6),
			new MeshStandardMaterial({ color: '#333333', emissive: scheme.primary, emissiveIntensity: 0.5 }),
		);
		barrel.position.set(0, 0.2, 0.7);
		barrel.rotation.x = Math.PI / 2;
		turret.add(barrel);
		turret.position.set(Math.cos(angle) * 3.8, 3.5, Math.sin(angle) * 3.8);
		turret.rotation.y = angle;
		g.add(turret);
	}

	// Flag on center
	const pole = new Mesh(
		new CylinderGeometry(0.06, 0.06, 4, 4),
		new MeshStandardMaterial({ color: '#8B4513', emissive: '#332200', emissiveIntensity: 0.3 }),
	);
	pole.position.y = 3.5;
	g.add(pole);
	const flag = new Mesh(
		new BoxGeometry(1.2, 0.7, 0.02),
		new MeshStandardMaterial({
			color: '#cc0000', emissive: '#cc0000', emissiveIntensity: 0.8,
			transparent: true, opacity: 0.9, side: DoubleSide,
		}),
	);
	flag.position.set(0.6, 5.2, 0);
	g.add(flag);

	return g;
}

// ── Iceberg ────────────────────────────────────────────────
export function createIceberg(): Group {
	const g = new Group();
	const mat = new MeshStandardMaterial({
		color: '#aaddee', emissive: '#66aacc', emissiveIntensity: 0.4,
		transparent: true, opacity: 0.8,
	});
	// Above water
	const above = new Mesh(new ConeGeometry(1.5, 3, 5), mat);
	above.position.y = 1.2;
	above.rotation.y = Math.random() * Math.PI;
	g.add(above);
	// Below water (bigger, semi-transparent)
	const below = new Mesh(
		new ConeGeometry(3, 2, 6),
		new MeshStandardMaterial({
			color: '#88bbdd', emissive: '#4488aa', emissiveIntensity: 0.2,
			transparent: true, opacity: 0.3,
		}),
	);
	below.position.y = -0.5;
	below.rotation.x = Math.PI;
	g.add(below);
	return g;
}

// ── Waterspout ─────────────────────────────────────────────
export function createWaterspout(): Group {
	const g = new Group();
	const mat = new MeshStandardMaterial({
		color: '#bbddff', emissive: '#88ccff', emissiveIntensity: 0.8,
		transparent: true, opacity: 0.5,
	});
	// Column of water rings
	for (let i = 0; i < 8; i++) {
		const radius = 0.8 + i * 0.15;
		const ring = new Mesh(new CylinderGeometry(radius, radius + 0.1, 1.2, 8, 1, true), mat);
		ring.position.y = i * 1.5 + 0.5;
		g.add(ring);
	}
	// Base splash
	const splash = new Mesh(
		new CylinderGeometry(2, 3, 0.5, 12, 1, true),
		new MeshStandardMaterial({
			color: '#ffffff', emissive: '#88ccee', emissiveIntensity: 0.6,
			transparent: true, opacity: 0.4,
		}),
	);
	splash.position.y = 0.3;
	g.add(splash);
	return g;
}
