// Audio system for Neon Pirate VR
const audioCtx = typeof AudioContext !== 'undefined' ? new AudioContext() : null;

function ensureAudio() {
	if (audioCtx && audioCtx.state === 'suspended') {
		audioCtx.resume();
	}
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume: number = 0.15, detune: number = 0) {
	if (!audioCtx) return;
	ensureAudio();
	const osc = audioCtx.createOscillator();
	const gain = audioCtx.createGain();
	osc.type = type;
	osc.frequency.value = freq;
	osc.detune.value = detune;
	gain.gain.setValueAtTime(volume, audioCtx.currentTime);
	gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
	osc.connect(gain);
	gain.connect(audioCtx.destination);
	osc.start();
	osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration: number, volume: number = 0.1) {
	if (!audioCtx) return;
	ensureAudio();
	const bufferSize = audioCtx.sampleRate * duration;
	const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) {
		data[i] = (Math.random() * 2 - 1) * volume;
	}
	const source = audioCtx.createBufferSource();
	const gain = audioCtx.createGain();
	source.buffer = buffer;
	gain.gain.setValueAtTime(volume, audioCtx.currentTime);
	gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
	source.connect(gain);
	gain.connect(audioCtx.destination);
	source.start();
}

export function playCannonFire(vol: number = 0.7) {
	playNoise(0.3, 0.15 * vol);
	playTone(80, 0.15, 'sawtooth', 0.12 * vol);
	playTone(60, 0.2, 'triangle', 0.08 * vol, -10);
	setTimeout(() => playNoise(0.2, 0.08 * vol), 50);
}

export function playExplosion(vol: number = 0.7) {
	playNoise(0.5, 0.2 * vol);
	playTone(50, 0.3, 'sawtooth', 0.15 * vol);
	playTone(30, 0.4, 'triangle', 0.1 * vol);
	setTimeout(() => playNoise(0.3, 0.12 * vol), 100);
	setTimeout(() => playTone(40, 0.2, 'sawtooth', 0.08 * vol), 150);
}

export function playEnemyFire(vol: number = 0.7) {
	playTone(100, 0.1, 'square', 0.08 * vol);
	playNoise(0.15, 0.06 * vol);
}

export function playTreasureCollect(vol: number = 0.7) {
	playTone(880, 0.1, 'sine', 0.12 * vol);
	setTimeout(() => playTone(1100, 0.1, 'sine', 0.12 * vol), 80);
	setTimeout(() => playTone(1320, 0.15, 'sine', 0.1 * vol), 160);
}

export function playSplash(vol: number = 0.7) {
	playNoise(0.2, 0.06 * vol);
	playTone(200, 0.1, 'sine', 0.05 * vol);
}

export function playHit(vol: number = 0.7) {
	playTone(150, 0.08, 'square', 0.1 * vol);
	playTone(100, 0.12, 'sawtooth', 0.08 * vol);
	playNoise(0.1, 0.06 * vol);
}

export function playShipSink(vol: number = 0.7) {
	playTone(200, 0.3, 'sawtooth', 0.1 * vol);
	setTimeout(() => playTone(150, 0.3, 'sawtooth', 0.08 * vol), 200);
	setTimeout(() => playTone(100, 0.4, 'sawtooth', 0.06 * vol), 400);
	setTimeout(() => playNoise(0.4, 0.08 * vol), 300);
}

export function playWaveComplete(vol: number = 0.7) {
	const notes = [523, 659, 784, 1047];
	notes.forEach((n, i) => {
		setTimeout(() => playTone(n, 0.2, 'triangle', 0.1 * vol), i * 120);
	});
}

export function playGameOver(vol: number = 0.7) {
	const notes = [440, 392, 349, 262];
	notes.forEach((n, i) => {
		setTimeout(() => playTone(n, 0.3, 'triangle', 0.1 * vol), i * 200);
	});
}

export function playMenuSelect(vol: number = 0.7) {
	playTone(660, 0.08, 'sine', 0.08 * vol);
}

export function playUpgrade(vol: number = 0.7) {
	playTone(440, 0.1, 'sine', 0.1 * vol);
	setTimeout(() => playTone(660, 0.1, 'sine', 0.1 * vol), 100);
	setTimeout(() => playTone(880, 0.15, 'sine', 0.08 * vol), 200);
}

export function playMineExplode(vol: number = 0.7) {
	playNoise(0.6, 0.25 * vol);
	playTone(40, 0.4, 'sawtooth', 0.15 * vol);
	playTone(25, 0.5, 'triangle', 0.12 * vol);
}

export function playCombo(combo: number, vol: number = 0.7) {
	const baseFreq = 400 + combo * 80;
	playTone(baseFreq, 0.08, 'sine', 0.08 * vol);
	setTimeout(() => playTone(baseFreq * 1.25, 0.1, 'sine', 0.08 * vol), 60);
}

// Music engine
let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicPlaying = false;

export function startMusic(vol: number = 0.7, bpm: number = 100) {
	if (musicPlaying) return;
	musicPlaying = true;
	const beatMs = 60000 / bpm;
	let beat = 0;

	// Sea shanty-inspired procedural music
	const bassLine = [65, 82, 98, 82, 65, 73, 87, 73]; // C2-ish progression
	const melodyLine = [262, 330, 392, 330, 262, 294, 349, 294];

	musicInterval = setInterval(() => {
		if (!musicPlaying) return;
		const bassNote = bassLine[beat % bassLine.length];
		const melNote = melodyLine[beat % melodyLine.length];

		// Bass on every beat
		playTone(bassNote, beatMs / 1000 * 0.8, 'triangle', 0.04 * vol);

		// Melody on every other beat
		if (beat % 2 === 0) {
			playTone(melNote, beatMs / 1000 * 0.6, 'square', 0.025 * vol);
		}

		// Percussion
		if (beat % 4 === 0) {
			playNoise(0.05, 0.03 * vol);
		}
		if (beat % 4 === 2) {
			playTone(200, 0.03, 'square', 0.02 * vol);
		}

		beat++;
	}, beatMs / 2);
}

export function stopMusic() {
	musicPlaying = false;
	if (musicInterval) {
		clearInterval(musicInterval);
		musicInterval = null;
	}
}

export function setBPM(bpm: number, vol: number = 0.7) {
	if (musicPlaying) {
		stopMusic();
		startMusic(vol, bpm);
	}
}

export function playDash(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	o.connect(g); g.connect(ctx.destination);
	o.type = 'sawtooth';
	o.frequency.setValueAtTime(200, ctx.currentTime);
	o.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
	g.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
	g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
	o.start(ctx.currentTime);
	o.stop(ctx.currentTime + 0.15);
}

export function playPowerUpCollect(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	const notes = [523, 659, 784, 1047]; // C5-E5-G5-C6
	notes.forEach((freq, i) => {
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.connect(g); g.connect(ctx.destination);
		o.type = 'sine';
		o.frequency.value = freq;
		const t = ctx.currentTime + i * 0.08;
		g.gain.setValueAtTime(vol * 0.25, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
		o.start(t);
		o.stop(t + 0.15);
	});
}

export function playLightningStrike(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	// White noise burst
	const bufferSize = ctx.sampleRate * 0.3;
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) {
		data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
	}
	const source = ctx.createBufferSource();
	source.buffer = buffer;
	const g = ctx.createGain();
	source.connect(g); g.connect(ctx.destination);
	g.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
	g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
	source.start(ctx.currentTime);
}

export function playBarrelBreak(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	// Wood cracking sound - two short noise bursts
	for (let b = 0; b < 2; b++) {
		const bufSize = ctx.sampleRate * 0.05;
		const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
		const d = buf.getChannelData(0);
		for (let i = 0; i < bufSize; i++) {
			d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.015));
		}
		const src = ctx.createBufferSource();
		src.buffer = buf;
		const filter = ctx.createBiquadFilter();
		filter.type = 'bandpass';
		filter.frequency.value = 800 + b * 400;
		filter.Q.value = 2;
		const g = ctx.createGain();
		src.connect(filter); filter.connect(g); g.connect(ctx.destination);
		const t = ctx.currentTime + b * 0.04;
		g.gain.setValueAtTime(vol * 0.3, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
		src.start(t);
	}
}

export function playSplashImpact(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	o.connect(g); g.connect(ctx.destination);
	o.type = 'sine';
	o.frequency.setValueAtTime(150, ctx.currentTime);
	o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
	g.gain.setValueAtTime(vol * 0.2, ctx.currentTime);
	g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
	o.start(ctx.currentTime);
	o.stop(ctx.currentTime + 0.25);
}

export function playWhirlpoolHum(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	const lfo = ctx.createOscillator();
	const lfoG = ctx.createGain();
	o.connect(g); g.connect(ctx.destination);
	lfo.connect(lfoG); lfoG.connect(o.frequency);
	o.type = 'sine';
	o.frequency.value = 60;
	lfo.frequency.value = 3;
	lfoG.gain.value = 15;
	g.gain.setValueAtTime(vol * 0.08, ctx.currentTime);
	g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
	o.start(ctx.currentTime);
	lfo.start(ctx.currentTime);
	o.stop(ctx.currentTime + 0.5);
	lfo.stop(ctx.currentTime + 0.5);
}

export function playThunder(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	// Deep rumbling thunder
	const bufferSize = ctx.sampleRate * 1.2;
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) {
		const env = Math.exp(-i / (ctx.sampleRate * 0.4));
		data[i] = (Math.random() * 2 - 1) * env;
	}
	const source = ctx.createBufferSource();
	source.buffer = buffer;
	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 200;
	filter.Q.value = 1;
	const g = ctx.createGain();
	source.connect(filter);
	filter.connect(g);
	g.connect(ctx.destination);
	g.gain.setValueAtTime(vol * 0.35, ctx.currentTime);
	g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
	source.start(ctx.currentTime);
}

export function playKrakenRoar(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	// Deep rumbling growl with LFO modulation
	const o1 = ctx.createOscillator();
	const o2 = ctx.createOscillator();
	const lfo = ctx.createOscillator();
	const lfoGain = ctx.createGain();
	const g = ctx.createGain();
	o1.type = 'sawtooth';
	o1.frequency.setValueAtTime(40, ctx.currentTime);
	o1.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 1.5);
	o2.type = 'triangle';
	o2.frequency.setValueAtTime(55, ctx.currentTime);
	o2.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 1.5);
	lfo.type = 'sine';
	lfo.frequency.value = 5;
	lfoGain.gain.value = 12;
	lfo.connect(lfoGain);
	lfoGain.connect(o1.frequency);
	o1.connect(g);
	o2.connect(g);
	g.connect(ctx.destination);
	g.gain.setValueAtTime(vol * 0.35, ctx.currentTime);
	g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
	o1.start(ctx.currentTime);
	o2.start(ctx.currentTime);
	lfo.start(ctx.currentTime);
	o1.stop(ctx.currentTime + 1.5);
	o2.stop(ctx.currentTime + 1.5);
	lfo.stop(ctx.currentTime + 1.5);
	// Add noise burst for the initial attack
	const bufSize = ctx.sampleRate * 0.4;
	const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
	const d = buf.getChannelData(0);
	for (let i = 0; i < bufSize; i++) {
		d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15));
	}
	const src = ctx.createBufferSource();
	src.buffer = buf;
	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 120;
	const gn = ctx.createGain();
	src.connect(filter);
	filter.connect(gn);
	gn.connect(ctx.destination);
	gn.gain.setValueAtTime(vol * 0.25, ctx.currentTime);
	gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
	src.start(ctx.currentTime);
}

export function playKrakenSweep(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	// Whooshing tentacle sweep
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	o.type = 'sawtooth';
	o.frequency.setValueAtTime(100, ctx.currentTime);
	o.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);
	o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.4);
	o.connect(g);
	g.connect(ctx.destination);
	g.gain.setValueAtTime(vol * 0.2, ctx.currentTime);
	g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
	o.start(ctx.currentTime);
	o.stop(ctx.currentTime + 0.4);
	playNoise(0.25, 0.08 * vol);
}

export function playHarpoonLaunch(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	// Sharp ascending whistle + rope tension
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	o.type = 'triangle';
	o.frequency.setValueAtTime(300, ctx.currentTime);
	o.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);
	o.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2);
	o.connect(g);
	g.connect(ctx.destination);
	g.gain.setValueAtTime(vol * 0.25, ctx.currentTime);
	g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
	o.start(ctx.currentTime);
	o.stop(ctx.currentTime + 0.25);
	// Rope twang
	setTimeout(() => {
		const o2 = ctx.createOscillator();
		const g2 = ctx.createGain();
		o2.type = 'sine';
		o2.frequency.value = 180;
		o2.connect(g2);
		g2.connect(ctx.destination);
		g2.gain.setValueAtTime(vol * 0.12, ctx.currentTime);
		g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
		o2.start(ctx.currentTime);
		o2.stop(ctx.currentTime + 0.15);
	}, 120);
}

export function playHarpoonHit(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	// Thud impact
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	o.type = 'triangle';
	o.frequency.setValueAtTime(120, ctx.currentTime);
	o.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
	o.connect(g);
	g.connect(ctx.destination);
	g.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
	g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
	o.start(ctx.currentTime);
	o.stop(ctx.currentTime + 0.15);
	playNoise(0.08, 0.1 * vol);
}

export function playWreckageCreak(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	// Creaking wood — frequency-modulated sine
	const o = ctx.createOscillator();
	const lfo = ctx.createOscillator();
	const lfoG = ctx.createGain();
	const g = ctx.createGain();
	o.type = 'sine';
	o.frequency.value = 250 + Math.random() * 100;
	lfo.type = 'sine';
	lfo.frequency.value = 8 + Math.random() * 4;
	lfoG.gain.value = 40;
	lfo.connect(lfoG);
	lfoG.connect(o.frequency);
	o.connect(g);
	g.connect(ctx.destination);
	g.gain.setValueAtTime(vol * 0.06, ctx.currentTime);
	g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
	o.start(ctx.currentTime);
	lfo.start(ctx.currentTime);
	o.stop(ctx.currentTime + 0.3);
	lfo.stop(ctx.currentTime + 0.3);
}

export function playTreasureMapFound(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	// Mystery / discovery jingle
	const notes = [392, 440, 523, 659, 784]; // G4 A4 C5 E5 G5
	notes.forEach((freq, i) => {
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.connect(g); g.connect(ctx.destination);
		o.type = 'triangle';
		o.frequency.value = freq;
		const t = ctx.currentTime + i * 0.12;
		g.gain.setValueAtTime(vol * 0.2, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
		o.start(t);
		o.stop(t + 0.25);
	});
}

export function playChainLightning(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	// Crackling zap cascade
	for (let i = 0; i < 3; i++) {
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.type = 'sawtooth';
		o.frequency.value = 800 + i * 400 + Math.random() * 200;
		o.connect(g); g.connect(ctx.destination);
		const t = ctx.currentTime + i * 0.08;
		g.gain.setValueAtTime(vol * 0.15, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
		o.start(t);
		o.stop(t + 0.15);
	}
}

export function playRepairBurst(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	// Warm shimmer rising tone
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	o.type = 'sine';
	o.frequency.setValueAtTime(300, ctx.currentTime);
	o.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.4);
	o.connect(g); g.connect(ctx.destination);
	g.gain.setValueAtTime(vol * 0.18, ctx.currentTime);
	g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
	o.start(); o.stop(ctx.currentTime + 0.5);
}

export function playBroadside(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	// Heavy double cannon salvo
	for (let i = 0; i < 4; i++) {
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.type = 'square';
		o.frequency.value = 80 + Math.random() * 40;
		o.connect(g); g.connect(ctx.destination);
		const t = ctx.currentTime + i * 0.04;
		g.gain.setValueAtTime(vol * 0.2, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
		o.start(t); o.stop(t + 0.2);
	}
}

export function playGhostAppear(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	// Eerie rising wail
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	o.type = 'sine';
	o.frequency.setValueAtTime(200, ctx.currentTime);
	o.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.6);
	o.connect(g); g.connect(ctx.destination);
	g.gain.setValueAtTime(vol * 0.1, ctx.currentTime);
	g.gain.linearRampToValueAtTime(vol * 0.15, ctx.currentTime + 0.2);
	g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
	o.start(); o.stop(ctx.currentTime + 0.8);
}

export function playBoarding(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	const t = ctx.currentTime;
	// Crunching wood + triumphant horn
	for (let i = 0; i < 3; i++) {
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.type = 'sawtooth';
		o.frequency.setValueAtTime(80 + i * 40, t + i * 0.08);
		o.connect(g); g.connect(ctx.destination);
		g.gain.setValueAtTime(vol * 0.12, t + i * 0.08);
		g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.15);
		o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.15);
	}
	// Horn
	const horn = ctx.createOscillator();
	const hg = ctx.createGain();
	horn.type = 'triangle';
	horn.frequency.setValueAtTime(330, t + 0.25);
	horn.frequency.linearRampToValueAtTime(440, t + 0.6);
	horn.connect(hg); hg.connect(ctx.destination);
	hg.gain.setValueAtTime(vol * 0.15, t + 0.25);
	hg.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
	horn.start(t + 0.25); horn.stop(t + 0.8);
}

export function playChainExplosion(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	const t = ctx.currentTime;
	// Rapid cascading booms
	for (let i = 0; i < 3; i++) {
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.type = 'square';
		o.frequency.setValueAtTime(60 - i * 10, t + i * 0.12);
		o.frequency.exponentialRampToValueAtTime(20, t + i * 0.12 + 0.25);
		o.connect(g); g.connect(ctx.destination);
		g.gain.setValueAtTime(vol * (0.2 - i * 0.04), t + i * 0.12);
		g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3);
		o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.3);
	}
}

export function playFireIgnite(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	const t = ctx.currentTime;
	// Whoosh + crackle
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	o.type = 'sawtooth';
	o.frequency.setValueAtTime(400, t);
	o.frequency.exponentialRampToValueAtTime(100, t + 0.3);
	o.connect(g); g.connect(ctx.destination);
	g.gain.setValueAtTime(vol * 0.08, t);
	g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
	o.start(t); o.stop(t + 0.35);
}

export function playSignalFlare(vol: number = 0.7) {
	if (!audioCtx) return;
	ensureAudio();
	const ctx = audioCtx;
	const t = ctx.currentTime;
	// Rising whistle then pop
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	o.type = 'sine';
	o.frequency.setValueAtTime(400, t);
	o.frequency.exponentialRampToValueAtTime(2000, t + 0.4);
	o.connect(g); g.connect(ctx.destination);
	g.gain.setValueAtTime(vol * 0.12, t);
	g.gain.linearRampToValueAtTime(vol * 0.08, t + 0.35);
	g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
	o.start(t); o.stop(t + 0.5);
	// Pop
	const p = ctx.createOscillator();
	const pg = ctx.createGain();
	p.type = 'square';
	p.frequency.setValueAtTime(150, t + 0.4);
	p.connect(pg); pg.connect(ctx.destination);
	pg.gain.setValueAtTime(vol * 0.15, t + 0.4);
	pg.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
	p.start(t + 0.4); p.stop(t + 0.55);
}
