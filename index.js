window.addEventListener('load', () => {
	const canvas = document.getElementById('visualizer');
	const fileInput = document.getElementById('audio-file');
	const playToggle = document.getElementById('play-toggle');
	const restartBtn = document.getElementById('restart-btn');
	const sampleSelect = document.getElementById('sample-select');
	const randomSampleBtn = document.getElementById('random-sample');
	const fullscreenBtn = document.getElementById('fullscreen-btn');
	const ctx = canvas.getContext('2d');

	const audioElement = new Audio();
	let audioContext;
	let analyser;
	let sourceNode;
	let freqData = new Uint8Array(1024);
	let timeData = new Uint8Array(1024);
	let currentColor = 0;
	let bassFlash = 0;
	let guitarFlash = 0;
	let drumsPulse = 0;
	let harmonyGlow = 0;
	let highNoteGlow = 0;
	let loaded = false;
	let isPlaying = false;

	let shuffledPlaylist = [];
	let playlistIndex = 0;

	function resizeCanvas() {
		const ratio = window.devicePixelRatio || 1;
		canvas.width = canvas.clientWidth * ratio;
		canvas.height = canvas.clientHeight * ratio;
		ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
	}

	function createAudioGraph() {
		if (audioContext) return;
		audioContext = new (window.AudioContext || window.webkitAudioContext)();
		analyser = audioContext.createAnalyser();
		analyser.fftSize = 2048;
		analyser.smoothingTimeConstant = 0.85;
		sourceNode = audioContext.createMediaElementSource(audioElement);
		sourceNode.connect(analyser);
		analyser.connect(audioContext.destination);
		freqData = new Uint8Array(analyser.frequencyBinCount);
		timeData = new Uint8Array(analyser.frequencyBinCount);
	}

	function getBandEnergy(data, minFreq, maxFreq) {
		const sampleRate = audioContext.sampleRate;
		const binSize = sampleRate / analyser.fftSize;
		const start = Math.floor(minFreq / binSize);
		const end = Math.min(data.length - 1, Math.ceil(maxFreq / binSize));
		let sum = 0;
		for (let i = start; i <= end; i += 1) {
			sum += data[i];
		}
		return sum / (end - start + 1 || 1);
	}

	function lerp(start, end, amt) {
		return start + (end - start) * amt;
	}

	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	function drawVintageStatic(width, height) {
		const t = Date.now();

		// Soft moving scanlines for an old-TV vibe.
		ctx.lineWidth = 1;
		for (let y = 0; y < height; y += 2) {
			const drift = Math.sin(y * 0.06 + t * 0.0032) * 0.5 + 0.5;
			const lineAlpha = 0.02 + drift * 0.055;
			ctx.strokeStyle = `rgba(210, 235, 255, ${lineAlpha})`;
			ctx.beginPath();
			ctx.moveTo(0, y + Math.sin(t * 0.002 + y * 0.03) * 0.55);
			ctx.lineTo(width, y + Math.sin(t * 0.002 + y * 0.03) * 0.55);
			ctx.stroke();
		}

		// Heavier moving grain to reinforce the vintage analog feel.
		const grainCount = Math.floor((width * height) / 1150);
		for (let i = 0; i < grainCount; i += 1) {
			const x = (Math.random() * width + t * 0.028) % width;
			const y = Math.random() * height;
			const a = 0.03 + Math.random() * 0.11;
			const size = Math.random() > 0.82 ? 2 : 1;
			ctx.fillStyle = `rgba(240, 248, 255, ${a})`;
			ctx.fillRect(x, y, size, size);
		}

		// Dark specks help the grain look more film-like and less flat.
		const darkGrainCount = Math.floor((width * height) / 2100);
		for (let i = 0; i < darkGrainCount; i += 1) {
			const x = (Math.random() * width + t * 0.019) % width;
			const y = Math.random() * height;
			const a = 0.012 + Math.random() * 0.06;
			ctx.fillStyle = `rgba(15, 20, 25, ${a})`;
			ctx.fillRect(x, y, 1, 1);
		}

		// Subtle sweeping band to mimic CRT signal roll.
		const sweepY = (t * 0.058) % (height + 100) - 50;
		const sweep = ctx.createLinearGradient(0, sweepY - 28, 0, sweepY + 28);
		sweep.addColorStop(0, 'rgba(255,255,255,0)');
		sweep.addColorStop(0.5, 'rgba(225, 240, 255, 0.085)');
		sweep.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = sweep;
		ctx.fillRect(0, sweepY - 28, width, 56);

		const flicker = 0.02 + (Math.sin(t * 0.025) * 0.5 + 0.5) * 0.03;
		ctx.fillStyle = `rgba(235, 245, 255, ${flicker})`;
		ctx.fillRect(0, 0, width, height);
	}

	function shufflePlaylist() {
		shuffledPlaylist = [...samples].sort(() => Math.random() - 0.5);
		playlistIndex = 0;
	}

	function getNextRandomSample() {
		if (shuffledPlaylist.length === 0) shufflePlaylist();
		const sample = shuffledPlaylist[playlistIndex];
		playlistIndex = (playlistIndex + 1) % shuffledPlaylist.length;
		if (playlistIndex === 0) shufflePlaylist();
		return sample;
	}

	function draw() {
		let bass = 0;
		let guitar = 0;
		let drums = 0;
		let voice = 0;
		let highNote = 0;

		if (loaded) {
			analyser.getByteFrequencyData(freqData);
			analyser.getByteTimeDomainData(timeData);

			bass = getBandEnergy(freqData, 20, 250);
			guitar = getBandEnergy(freqData, 250, 1400);
			drums = getBandEnergy(freqData, 80, 300);
			voice = getBandEnergy(freqData, 400, 3000);
			highNote = getBandEnergy(freqData, 2500, 10000);
		} else {
			const t = Date.now() * 0.001;
			bass = 60 + Math.sin(t * 1.5) * 20;
			guitar = 45 + Math.cos(t * 1.7) * 18;
			drums = 50 + Math.sin(t * 1.9) * 22;
			voice = 40 + Math.cos(t * 1.6) * 20;
			highNote = 46 + Math.sin(t * 1.3) * 12;
			for (let i = 0; i < timeData.length; i += 1) {
				timeData[i] = 128 + Math.sin(i * 0.12 + t * 3.1) * 60;
			}
		}

		bassFlash = lerp(bassFlash, bass / 260, 0.15);
		guitarFlash = lerp(guitarFlash, guitar / 300, 0.16);
		drumsPulse = lerp(drumsPulse, drums / 280, 0.14);
		harmonyGlow = lerp(harmonyGlow, voice / 260, 0.12);
		highNoteGlow = lerp(highNoteGlow, highNote / 260, 0.12);

		currentColor = (currentColor + 0.18 + bassFlash * 0.12) % 360;

		const { width, height } = canvas.getBoundingClientRect();
		ctx.clearRect(0, 0, width, height);

		const spotlightX = width * 0.2 + Math.sin(Date.now() * 0.0009) * width * 0.12;
		const spotlightY = height * 0.18 + Math.cos(Date.now() * 0.0012) * height * 0.08;
		const spotlightRadius = width * 0.8;
		const spotlightGradient = ctx.createRadialGradient(
			spotlightX,
			spotlightY,
			40,
			spotlightX,
			spotlightY,
			spotlightRadius,
		);
		spotlightGradient.addColorStop(0, `hsla(${currentColor}, 100%, 72%, ${0.28 + bassFlash * 0.3})`);
		spotlightGradient.addColorStop(0.5, 'rgba(10, 4, 25, 0.1)');
		spotlightGradient.addColorStop(1, 'rgba(0,0,0,0.98)');
		ctx.fillStyle = spotlightGradient;
		ctx.fillRect(0, 0, width, height);

		ctx.fillStyle = 'rgba(2, 8, 25, 0.7)';
		ctx.fillRect(0, 0, width, height);

		const squareCount = 22;
		for (let x = 0; x < squareCount; x += 1) {
			for (let y = 0; y < 9; y += 1) {
				const size = width * 0.048 * 1.05;
				const offsetX = (width / squareCount) * x + size * 0.28;
				const offsetY = height * 0.06 + y * (size * 1.95);
				const pulse = Math.sin((x + y + Date.now() * 0.0018) * 1.8) * 0.5 + 0.5;
				const beatGate = clamp((guitarFlash * 2.4) - 0.28 + pulse * 0.18, 0, 1);
				const beatFlash = Math.pow(beatGate, 5);
				const brightness = clamp(guitarFlash * 1.8 + pulse * 0.55, 0.08, 0.98);
				const alpha = 0.005 + beatFlash * (0.35 + brightness * 0.28);
				ctx.fillStyle = `hsla(${(currentColor + x * 12 + y * 18) % 360}, 88%, ${48 + brightness * 28}%, ${alpha})`;
				ctx.fillRect(offsetX, offsetY, size, size);
			}
		}

		const shapeTime = (Date.now() * 0.00042) % 3.2;
		const segment = 0.8;
		const shapeIndex = Math.floor(shapeTime / segment);
		const segmentProgress = (shapeTime % segment) / segment;
		const transitionPhase = clamp((segmentProgress - 0.72) / 0.28, 0, 1);
		const easedMorph = Math.pow(transitionPhase, 0.25);

		function shapeRadiusFactor(angle) {
			const circleR = 1;
			const triangleR = 1 - 0.45 * Math.abs(Math.cos(angle * 3));
			const squareR = 1 - 0.34 * Math.abs(Math.cos(angle * 2));
			const hexR = 1 - 0.22 * Math.abs(Math.cos(angle * 6));
			const shapes = [circleR, triangleR, squareR, hexR, circleR];
			return lerp(shapes[shapeIndex], shapes[shapeIndex + 1], easedMorph);
		}

		const centerX = width * 0.5;
		const centerY = height * 0.45 + 18;
		const centerBase = width * 0.16;
		const shapeRadius = centerBase + drumsPulse * width * 0.16 + bassFlash * width * 0.07 + guitarFlash * width * 0.04;
		const sides = 60;
		const neonAlpha = 0.32 + drumsPulse * 0.28 + bassFlash * 0.15 + highNoteGlow * 0.18;
		ctx.lineWidth = 3.5 + bassFlash * 0.6 + highNoteGlow * 1.2;
		ctx.strokeStyle = `hsla(${(currentColor + 90) % 360}, 100%, ${70 + bassFlash * 8 + highNoteGlow * 6}%, ${neonAlpha})`;
		ctx.fillStyle = `hsla(${(currentColor + 80) % 360}, 100%, ${40 + highNoteGlow * 12}%, ${0.08 + drumsPulse * 0.05 + highNoteGlow * 0.06})`;
		ctx.beginPath();
		for (let i = 0; i < sides; i += 1) {
			const angle = ((Math.PI * 2) / sides) * i;
			const profile = shapeRadiusFactor(angle);
			const wobble = Math.sin(angle * 6 + Date.now() * 0.0018) * drumsPulse * 20 + Math.cos(angle * 4) * bassFlash * 14;
			const radius = shapeRadius * profile + wobble;
			const x = centerX + Math.cos(angle) * radius;
			const y = centerY + Math.sin(angle) * radius;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		const glowRadius = shapeRadius * (1.1 + highNoteGlow * 0.28);
		const innerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
		innerGlow.addColorStop(0, `hsla(${(currentColor + 80) % 360}, 100%, 82%, ${0.42 + drumsPulse * 0.16 + bassFlash * 0.1 + highNoteGlow * 0.34})`);
		innerGlow.addColorStop(0.55, `hsla(${(currentColor + 80) % 360}, 100%, 88%, ${0.18 + highNoteGlow * 0.24})`);
		innerGlow.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = innerGlow;
		ctx.beginPath();
		ctx.arc(centerX, centerY, shapeRadius * 1.05, 0, Math.PI * 2);
		ctx.fill();

		ctx.lineWidth = 4;
		ctx.strokeStyle = `hsla(${(currentColor + 180) % 360}, 90%, 70%, ${0.85 - harmonyGlow * 0.3})`;
		ctx.beginPath();
		const waveHeight = height * 0.14;
		const waveTop = height * 0.78;
		for (let i = 0; i < timeData.length; i += 4) {
			const percent = i / timeData.length;
			const x = width * percent;
			const normalized = (timeData[i] - 128) / 128;
			const amplitude = normalized * waveHeight * (0.75 + harmonyGlow * 0.9);
			const y = waveTop + amplitude;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();

		ctx.lineWidth = 1.4;
		ctx.strokeStyle = `hsla(${(currentColor + 210) % 360}, 100%, 62%, 0.18)`;
		ctx.beginPath();
		for (let i = 0; i < timeData.length; i += 8) {
			const x = width * (i / timeData.length);
			const normalized = (timeData[i] - 128) / 128;
			const y = waveTop + normalized * waveHeight * 0.52;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();

		// Upper waveform for high-frequency sounds
		ctx.lineWidth = 2.2;
		ctx.strokeStyle = `hsla(${(currentColor + 120) % 360}, 95%, 68%, ${0.42 + harmonyGlow * 0.15})`;
		ctx.beginPath();
		const waveTopUpper = height * 0.18;
		const waveHeightUpper = height * 0.12;
		for (let i = 0; i < timeData.length; i += 3) {
			const percent = i / timeData.length;
			const x = width * percent;
			const normalized = (timeData[i] - 128) / 128;
			const smoothing = Math.sin(i * 0.02) * 0.4 + 0.6;
			const amplitude = normalized * waveHeightUpper * (0.55 + harmonyGlow * 0.4) * smoothing;
			const y = waveTopUpper + amplitude;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();

		ctx.lineWidth = 0.8;
		ctx.strokeStyle = `hsla(${(currentColor + 140) % 360}, 100%, 55%, 0.12)`;
		ctx.beginPath();
		for (let i = 0; i < timeData.length; i += 6) {
			const x = width * (i / timeData.length);
			const normalized = (timeData[i] - 128) / 128;
			const y = waveTopUpper + normalized * waveHeightUpper * 0.35;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();

		drawVintageStatic(width, height);

		requestAnimationFrame(draw);
	}

	function updatePlayButton() {
		// prefer deriving state from the audio element when available
		if (audioElement && audioElement.src) {
			isPlaying = !!(!audioElement.paused && !audioElement.ended);
		}
		playToggle.textContent = isPlaying ? 'Pause' : 'Play';
	}

	function startAudio() {
		createAudioGraph();
		if (audioContext.state === 'suspended') {
			audioContext.resume();
		}
		audioElement.play().catch(() => {});
		isPlaying = true;
		updatePlayButton();
	}

	function stopAudio() {
		audioElement.pause();
		isPlaying = false;
		updatePlayButton();
	}

	// Keep play/pause state synced with the actual audio element
	audioElement.addEventListener('play', () => { isPlaying = true; updatePlayButton(); });
	audioElement.addEventListener('pause', () => { isPlaying = false; updatePlayButton(); });
	audioElement.addEventListener('ended', () => {
		isPlaying = false;
		updatePlayButton();
		// Auto-play next sample
		if (samples.length > 0) {
			const current = audioElement.src;
			let currentIndex = -1;
			for (let i = 0; i < samples.length; i++) {
				try {
					const u = new URL(samples[i], location.href);
					if (u.href === current) currentIndex = i;
				} catch (e) {
					if (samples[i] === current) currentIndex = i;
				}
			}
			const nextIndex = (currentIndex + 1) % samples.length;
			const nextSample = samples[nextIndex];
			if (sampleSelect) {
				for (let i = 0; i < sampleSelect.options.length; i++) {
					if (sampleSelect.options[i].value === nextSample) {
						sampleSelect.selectedIndex = i;
						break;
					}
				}
			}
			setAudioSource(nextSample);
		}
	});

	// Button glow: add small neon yellow glow while pressed
	(function attachButtonGlow() {
		const controls = document.querySelectorAll('.controls button, .controls .file-label');
		controls.forEach((el) => {
			// Add glow on pointerdown/mousedown
			el.addEventListener('pointerdown', (e) => {
				el.classList.add('btn-glow');
			});
			// Remove on pointerup/cancel/leave
			['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => {
				el.addEventListener(ev, () => el.classList.remove('btn-glow'));
			});
			// Also remove after a short timeout on click to ensure visible feedback
			el.addEventListener('click', () => {
				setTimeout(() => el.classList.remove('btn-glow'), 220);
			});
		});
	})();

		function setAudioSource(fileUrl) {
			audioElement.src = fileUrl;
			audioElement.loop = true;
			loaded = true;
			startAudio();
		}

		// Sample library: add relative filenames here (must be present in project folder)
		const samples = [
			'Daft Punk ft. Julian Casablancas - Instant Crush (HQ).mp3',
			'Bill Withers - Use Me (Official Audio).mp3',
			'Florence  The Machine - Dog Days Are Over (Official Lyric Video).mp3',
			'Hang on to Your Love.mp3',
			'On Sight.mp3',
			'Lenny Kravitz - Honey (Official Audio).mp3',
			"It Ain't Over 'Til It's Over (Remastered 2012).mp3",
			'Lenny Kravitz - Low.mp3',
			'Lenny Kravitz - Thinking Of You.mp3',
			'Master of Puppets (Remastered).mp3',
			'Smooth Operator (2011 Remastered).mp3',
			'Linger.mp3',
			'Sitting, Waiting, Wishing - Jack Johnson.mp3',
			'PINK FLOYD - Learning To Fly.mp3',
			'Hey.mp3',
			'What More Can I Do.mp3',
			'Animals - Maroon 5 (Audio).mp3',
			'Maroon 5 - She Will Be Loved (Official Audio).mp3',
			'Maroon 5 - This Love (Audio).mp3',
			'Duke Ellington & John Coltrane - In a sentimental mood.mp3',
			'Superlove.mp3',
			'Venice Queen.mp3',
			'Since I\'ve Been Loving You (Remaster).mp3'
		];

		function populateSampleSelect() {
			if (!sampleSelect) return;
			sampleSelect.innerHTML = '';

			samples.forEach((s) => {
				const opt = document.createElement('option');
				opt.value = s;
				opt.textContent = s.replace(/[-_\.]/g, ' ');
				sampleSelect.appendChild(opt);
			});

			// add a special option that lets the user choose a local file (last)
			const chooseOpt = document.createElement('option');
			chooseOpt.value = '__choose_file__';
			chooseOpt.textContent = 'Choose local file...';
			sampleSelect.appendChild(chooseOpt);

			// default to first sample if available (don't select the choose-local option)
			if (sampleSelect.options.length > 0) {
				if (samples.length > 0) sampleSelect.selectedIndex = 0;
				else sampleSelect.selectedIndex = sampleSelect.options.length - 1;
			}
		}

		populateSampleSelect();

		// If user selects the special "Choose local file..." option, open file picker
		if (sampleSelect) {
			sampleSelect.addEventListener('change', (e) => {
				if (sampleSelect.value === '__choose_file__') {
					fileInput.click();
					return;
				}
				// If user explicitly picks a sample from the dropdown, load it
				const val = sampleSelect.value;
				if (val) {
					setAudioSource(val);
				}
			});
		}


		if (randomSampleBtn) randomSampleBtn.addEventListener('click', () => {
			if (!samples.length) return;
			const pick = getNextRandomSample();
			// reflect selection in the dropdown
			if (sampleSelect) {
				for (let i = 0; i < sampleSelect.options.length; i++) {
					if (sampleSelect.options[i].value === pick) {
						sampleSelect.selectedIndex = i;
						break;
					}
				}
			}
			setAudioSource(pick);
		});

	fileInput.addEventListener('change', (event) => {
		const file = event.target.files[0];
		if (!file) return;
		const objectUrl = URL.createObjectURL(file);

		// add/replace a local-file option in the select so it shows up
		if (sampleSelect) {
			let localOpt = Array.from(sampleSelect.options).find(o => o.value === objectUrl);
			if (!localOpt) {
				localOpt = document.createElement('option');
				localOpt.value = objectUrl;
				localOpt.textContent = 'Local: ' + file.name;
				// append after the choose option
				sampleSelect.insertBefore(localOpt, sampleSelect.children[1] || null);
			}
			sampleSelect.value = objectUrl;
		}

		setAudioSource(objectUrl);
	});

		// Restart button: restart current audio from the beginning
		if (restartBtn) restartBtn.addEventListener('click', () => {
			if (!audioElement.src) return;
			audioElement.currentTime = 0;
			createAudioGraph();
			if (audioContext && audioContext.state === 'suspended') audioContext.resume();
			audioElement.play().catch(() => {});
			isPlaying = true;
			updatePlayButton();
		});

	// Keyboard: space bar for play/pause in fullscreen
	window.addEventListener('keydown', (e) => {
		if (e.code === 'Space' && document.fullscreenElement) {
			e.preventDefault();
			const sel = sampleSelect && sampleSelect.value;
			if (!loaded) {
				if (sel) {
					setAudioSource(sel);
				}
				return;
			}
			if (isPlaying) stopAudio();
			else startAudio();
		}
		// Keyboard shortcut: press 'r' to play random sample in fullscreen
		if (e.key && e.key.toLowerCase() === 'r' && document.fullscreenElement) {
			if (!samples.length) return;
			const pick = getNextRandomSample();
			// reflect selection in the dropdown
			if (sampleSelect) {
				for (let i = 0; i < sampleSelect.options.length; i++) {
					if (sampleSelect.options[i].value === pick) {
						sampleSelect.selectedIndex = i;
						break;
					}
				}
			}
			setAudioSource(pick);
		}
		// Keyboard shortcut: press 'z' to restart current audio
		if (e.key && e.key.toLowerCase() === 'z') {
			if (!audioElement.src) return;
			audioElement.currentTime = 0;
			createAudioGraph();
			if (audioContext && audioContext.state === 'suspended') audioContext.resume();
			audioElement.play().catch(() => {});
			isPlaying = true;
			updatePlayButton();
		}
	});

	playToggle.addEventListener('click', () => {
		const sel = sampleSelect && sampleSelect.value;

		function srcIsSelected(name) {
			if (!audioElement.src) return false;
			try {
				const p = new URL(audioElement.src, location.href).pathname;
				return p.endsWith('/' + name) || p.endsWith(name);
			} catch (e) {
				return audioElement.src === name;
			}
		}

		if (!loaded) {
			if (sel) {
				setAudioSource(sel);
				return; // setAudioSource starts playback
			}
			return;
		}



		if (isPlaying) stopAudio();
		else startAudio();
	});

	// Fullscreen toggle
	if (fullscreenBtn) {
		fullscreenBtn.addEventListener('click', () => {
			const fullscreenTarget = canvas.closest('.visual-wrap') || canvas.parentElement;
			if (!document.fullscreenElement) {
				fullscreenTarget.requestFullscreen().catch((err) => {
					console.error(`Error attempting to enable fullscreen: ${err.message}`);
				});
			} else {
				document.exitFullscreen();
			}
		});
	}

	// Handle canvas resize when exiting fullscreen
	document.addEventListener('fullscreenchange', () => {
		if (!document.fullscreenElement) {
			resizeCanvas();
		}
	});

	window.addEventListener('resize', resizeCanvas);
	resizeCanvas();
	draw();
});
