// Audio mechanic — music amplitude drives the diving board.
// AI assistance: initial implementation created with OpenAI Codex.
// Replace this path with a file inside audio/ to use your own music.
const AUDIO_FILE = 'audio/demo.wav';
const SPLASH_FILE = 'audio/splash.wav';
let landingSound, landingSoundReady = false;
let audioState = { loaded: false, started: false, level: 0 };
let audioTrack, audioAnalyser, audioButton, audioStatus, audioGain;
let audioStarting = false;
let audioLastOffset = 0;

function setupAudioMechanic() {
  landingSound = loadSound(SPLASH_FILE, () => {
    landingSoundReady = true;
    landingSound.playMode('restart');
  }, () => {
    console.error('Could not load landing sound: ' + SPLASH_FILE);
    audioStatus.html('Water sound could not load. Check audio/splash.wav and refresh.');
  });
  // Strip our visual offset before the input member updates its spring.
  const originalUpdateBoard = updateBoard;
  updateBoard = function () {
    board.bend -= audioLastOffset;
    audioLastOffset = 0;
    originalUpdateBoard();
  };
  // Keep the controls together below the shared canvas.
  const controls = createDiv();
  controls.class('audio-controls');
  audioButton = createButton('Play music');
  audioButton.parent(controls);
  audioButton.mousePressed(toggleAudio);
  audioButton.attribute('type', 'button');
  audioButton.attribute('aria-label', 'Play or pause music');
  createSpan('Board amplitude').parent(controls);
  audioGain = createSlider(0, 2, 1, 0.05);
  audioGain.parent(controls);
  audioGain.attribute('aria-label', 'Music response strength');
  audioStatus = createP('Loading music…');
  audioStatus.parent(controls);
  audioStatus.attribute('role', 'status');
  audioAnalyser = new p5.Amplitude(0.75);
  audioTrack = loadSound(AUDIO_FILE, () => {
    audioState.loaded = true;
    audioAnalyser.setInput(audioTrack);
    audioTrack.setVolume(0.55);
    audioStatus.html('Ready — click the painting or Play music. M: pause / resume.');
  }, () => {
    audioStatus.html('Music could not load. Check AUDIO_FILE and open this project with a web server.');
  });
}

async function startAudio() {
  // Unlock effects on the same user gesture, even while music is loading/paused.
  unlockBoardEffects();
  // Existing painting clicks call this repeatedly; paused music stays paused.
  if (audioState.started || audioStarting || !audioState.loaded) return;
  audioStarting = true;
  try {
    await userStartAudio();
    audioTrack.loop();
    audioState.started = true;
    audioButton.html('Pause music');
    audioStatus.html('Playing — music loudness moves the board.');
  } catch (error) {
    audioStatus.html('Press Play music to try starting audio again.');
  } finally {
    audioStarting = false;
  }
}

async function toggleAudio() {
  if (!audioState.started) { await startAudio(); return; }
  if (audioStarting) return;
  if (audioTrack.isPlaying()) {
    audioTrack.pause();
    audioButton.html('Resume music');
    audioStatus.html('Paused');
  } else {
    audioStarting = true;
    try {
      await userStartAudio();
      audioTrack.loop();
      audioButton.html('Pause music');
      audioStatus.html('Playing — music loudness moves the board.');
    } catch (error) {
      audioStatus.html('Unable to resume. Press Resume music to retry.');
    } finally { audioStarting = false; }
  }
}

function updateAudioMechanic() {
  updateBoardEffects();
  const playing = audioState.loaded && audioTrack.isPlaying();
  const level = playing ? constrain(audioAnalyser.getLevel() * 5, 0, 1) : 0;
  audioState.level = lerp(audioState.level, level, 0.22);
  // updateBoard() already ran this frame. Remove the previous audio contribution
  // before adding this one, so the existing spring cannot accumulate displacement.
  // Charging and flight keep full control of the board for the user's dive.
  if (diver.state === 'ready') {
    const offset = audioState.level * Number(audioGain.value()) * 0.95;
    board.bend += offset - audioLastOffset;
    audioLastOffset = offset;
  } else {
    board.bend -= audioLastOffset;
    audioLastOffset = 0;
    if (diver.state === 'charging') {
      audioLastOffset = diver.charge * 0.45;
      board.bend += audioLastOffset;
    }
  }
}

function drawAudioMeter() {
  push();
  noStroke();
  fill(120, 112, 100);
  textSize(10);
  textAlign(RIGHT, CENTER);
  text('AUDIO', width - 95, 15);
  fill(201, 192, 175);
  rect(width - 85, 10, 55, 9, 3);
  fill(57, 139, 150);
  rect(width - 85, 10, 55 * audioState.level, 9, 3);
  pop();
}

// ---- Interaction sound effects (Web Audio; no extra sound files required) ----
// One continuous creak follows charge. Short sounds happen once per transition.
let boardEffects = { context: null, creak: null, previous: 'ready', charge: 0 };

function unlockBoardEffects() {
  const context = getAudioContext();
  boardEffects.context = context;
  if (context.state === 'suspended') context.resume().catch(() => {});
}

function stopBoardCreak() {
  const voice = boardEffects.creak;
  if (!voice) return;
  const now = boardEffects.context.currentTime;
  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setTargetAtTime(0, now, 0.025);
  voice.osc.stop(now + 0.18);
  boardEffects.creak = null;
}

function updateBoardEffects() {
  const state = diver.state;
  const context = boardEffects.context;
  if (!context || context.state !== 'running') {
    boardEffects.previous = state;
    return;
  }
  const now = context.currentTime;
  if (state === 'charging') {
    const charge = constrain(diver.charge, 0, 1);
    boardEffects.charge = charge;
    if (!boardEffects.creak) {
      const osc = context.createOscillator();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      osc.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.value = 650;
      gain.gain.value = 0;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
      osc.start();
      boardEffects.creak = { osc, gain };
    }
    // A slow pitch drop and irregular friction suggest wood under pressure.
    const friction = 0.7 + 0.3 * Math.sin(now * 31) ** 2;
    boardEffects.creak.osc.frequency.setTargetAtTime(155 - charge * 75 + Math.sin(now * 19) * 5, now, 0.04);
    boardEffects.creak.gain.gain.setTargetAtTime((0.012 + charge * 0.045) * friction, now, 0.04);
  } else {
    stopBoardCreak();
  }
  if (state === 'flying' && boardEffects.previous === 'charging') {
    playBoardRebound(boardEffects.charge);
  }
  if (state === 'ready' && boardEffects.previous === 'flying') {
    playLandingSplash(boardEffects.charge);
  }
  boardEffects.previous = state;
}

function playBoardRebound(charge) {
  const context = boardEffects.context;
  const now = context.currentTime;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(260 + charge * 160, now);
  osc.frequency.exponentialRampToValueAtTime(65, now + 0.32);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.09 + charge * 0.05, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  osc.start(now);
  osc.stop(now + 0.42);
}

function playLandingSplash(charge) {
  if (!landingSoundReady) return;
  // Use the supplied recording at its original pitch; charge changes volume only.
  landingSound.setVolume(0.65 + constrain(charge, 0, 1) * 0.25);
  landingSound.play();
}

