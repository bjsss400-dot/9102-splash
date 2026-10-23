// AUDIO MECHANIC — loudness turns the frozen splash into a musical event.
// Developed with OpenAI Codex (ChatGPT): playback, adaptive peak detection,
// the meter, comments and tests. Read README.md for the contribution explanation.
// p5.sound references (the bundled p5 1.x library uses loadSound callbacks):
// https://p5js.org/reference/p5.sound/p5.Amplitude/
// https://p5js.org/reference/p5/userStartAudio/
// No timer creates beats: every automatic splash starts from measured audio.

const AUDIO_TRACK = 'assets/poolside-study.wav';
const AUDIO_SETTINGS = {
  gain: 3,             // analysis sensitivity; does not change speaker volume
  smoothingMs: 65,     // fast lerp: follow a beat without flickering
  averageMs: 1600,     // slow lerp: learn the usual loudness of this track
  warmupMs: 1400,      // learn the baseline before allowing the first splash
  peakWindowMs: 100,   // briefly collect the peak instead of judging its first frame
  cooldownMs: 420,    // minimum gap between automatic splashes
  silenceFloor: 0.045,
  historyLength: 60
};

// Existing names are kept for input-controls.js and sketch.js.
let audioState = {
  loaded: false, started: false, playing: false,
  status: 'loading', error: '', level: 0, average: 0,
  history: new Array(AUDIO_SETTINGS.historyLength).fill(0),
  lastPower: 0, lastSize: '', splashCount: 0
};
let audioTrack;
let audioAmplitude;
let audioWantsPlayback = false;
let audioUnlocking = false;
let audioUnlocked = false;
let audioLastUpdate = 0;
let audioWarmupUntil = 0;
let audioLastSplash = -Infinity;
let audioCandidate = null;
let audioArmed = true;

function setupAudioMechanic() {
  audioAmplitude = new p5.Amplitude(0);
  loadAudioTrack();
  audioLastUpdate = millis();
}

function loadAudioTrack() {
  audioState.status = 'loading';
  audioState.error = '';
  // Load in setup so the scene still works and shows a helpful message on failure.
  audioTrack = loadSound(AUDIO_TRACK, function (sound) {
    audioTrack = sound;
    audioTrack.setLoop(true);
    audioTrack.setVolume(0.65);
    audioAmplitude.setInput(audioTrack); // analyse only our track, never the microphone
    audioState.loaded = true;
    audioState.status = 'ready';
    if (audioWantsPlayback && audioUnlocked) beginAudioPlayback();
  }, function () {
    audioState.loaded = false;
    audioState.playing = false;
    audioWantsPlayback = false;
    audioState.status = 'error';
    audioState.error = 'Music unavailable: check assets and use a local server. M: retry';
  });
}

// This is called by the existing mouse/keyboard handler. A normal pool click
// must not restart a playing song or undo a deliberate pause with M.
function startAudio() {
  if (audioState.started || audioWantsPlayback) return;
  requestAudioPlayback();
}

function requestAudioPlayback() {
  audioWantsPlayback = true;
  if (audioState.status === 'error' && !audioState.loaded) loadAudioTrack();
  if (audioUnlocking) return;
  audioUnlocking = true;
  // A Promise waits for the browser to allow sound after a user gesture.
  // Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
  userStartAudio().then(function () {
    audioUnlocking = false;
    audioUnlocked = true;
    if (audioWantsPlayback && audioState.loaded) beginAudioPlayback();
  }).catch(function () {
    audioUnlocking = false;
    audioWantsPlayback = false;
    audioState.status = 'error';
    audioState.error = 'Sound could not start. Press M to retry.';
  });
}

function beginAudioPlayback() {
  if (!audioWantsPlayback || audioTrack.isPlaying()) return;
  try {
    audioTrack.play(); // resumes from the paused position; setLoop keeps looping
    audioState.started = true;
    audioState.playing = true;
    audioState.status = 'playing';
    audioState.error = '';
    resetAudioAnalysis();
  } catch (error) {
    audioWantsPlayback = false;
    audioState.status = 'error';
    audioState.error = 'Sound could not start. Press M to retry.';
  }
}

function toggleAudio() {
  if (audioWantsPlayback || audioState.playing) {
    audioWantsPlayback = false;
    if (audioState.loaded && audioTrack.isPlaying()) audioTrack.pause();
    audioState.playing = false;
    // If M cancels a pending first start, retain the loading status.
    if (audioState.loaded) audioState.status = audioState.started ? 'paused' : 'ready';
    resetAudioAnalysis();
  } else {
    requestAudioPlayback();
  }
}

function resetAudioAnalysis() {
  audioState.level = 0;
  audioState.average = 0;
  audioState.history.fill(0);
  audioState.lastPower = 0;
  audioState.lastSize = '';
  audioCandidate = null;
  audioArmed = true;
  audioLastUpdate = millis();
  audioWarmupUntil = millis() + AUDIO_SETTINGS.warmupMs;
  audioLastSplash = -Infinity;
}

function updateAudioMechanic() {
  let now = millis();
  let elapsed = now - audioLastUpdate;
  audioLastUpdate = now;
  if (!audioState.playing || !audioState.loaded) return;
  // After a background-tab stall, relearn instead of treating stale data as a beat.
  if (elapsed > 500) {
    resetAudioAnalysis();
    return;
  }
  analyseAudioLevel(audioAmplitude.getLevel(), now, Math.max(1, elapsed));
}

// Kept separate from playback so recorded/synthetic loudness can test the detector.
function analyseAudioLevel(rawLevel, now, elapsed) {
  if (!Number.isFinite(rawLevel)) rawLevel = 0;
  let target = constrain(rawLevel * AUDIO_SETTINGS.gain, 0, 1);
  // Exponential lerp factors make the response similar at 30 and 60 fps.
  // Math.exp reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/exp
  let fast = 1 - Math.exp(-elapsed / AUDIO_SETTINGS.smoothingMs);
  let slow = 1 - Math.exp(-elapsed / AUDIO_SETTINGS.averageMs);
  audioState.level = lerp(audioState.level, target, fast);
  audioState.average = lerp(audioState.average, audioState.level, slow);
  audioState.history.push(audioState.level);
  audioState.history.shift(); // exactly 60 recent drawing frames (about 1 s at 60 fps)

  if (now < audioWarmupUntil) return;
  let level = audioState.level;
  let average = audioState.average;
  let threshold = Math.max(AUDIO_SETTINGS.silenceFloor, average * 1.2 + 0.012);

  // Hysteresis: the sound must fall before the detector can hear a new attack.
  if (level < average * 1.08 + 0.006) audioArmed = true;
  if (audioCandidate) {
    audioCandidate.peak = Math.max(audioCandidate.peak, level);
    if (now - audioCandidate.startedAt >= AUDIO_SETTINGS.peakWindowMs) {
      makeAudioSplash(audioCandidate, now);
      audioCandidate = null;
    }
    return;
  }
  if (audioArmed && level > threshold && now - audioLastSplash >= AUDIO_SETTINGS.cooldownMs) {
    // Freeze the baseline at the onset so the beat cannot raise its own threshold.
    audioCandidate = { peak: level, baseline: average, startedAt: now };
    audioArmed = false;
  }
}

function makeAudioSplash(peak, now) {
  let contrast = (peak.peak - peak.baseline) / Math.max(peak.baseline, 0.06);
  let power = 0.55;
  let size = 'small';
  if (contrast >= 1.6) {
    power = 1.85;
    size = 'large';
  } else if (contrast >= 0.6) {
    power = 1.1;
    size = 'medium';
  }
  // Same point/depth for all three sizes: only power changes the splash scale.
  // Time owns the life cycle; Perlin owns its appearance. Audio only sends an event.
  triggerSplash(0.60, power, SPLASH_BASE_Y);
  audioLastSplash = now;
  audioState.lastPower = power;
  audioState.lastSize = size;
  audioState.splashCount++;
}

function drawAudioMeter() {
  push();
  let meterWidth = 120;
  let x = width - BORDER - meterWidth;
  let bottom = BORDER - 10;
  let meterHeight = 15;
  strokeWeight(1.5);
  stroke(112, 151, 190);
  for (let i = 0; i < audioState.history.length; i++) {
    let barX = x + i * meterWidth / audioState.history.length;
    line(barX, bottom, barX, bottom - audioState.history[i] * meterHeight);
  }
  stroke(172, 187, 197);
  strokeWeight(1);
  line(x, bottom, x + meterWidth, bottom);
  noStroke();
  fill(198, 207, 210);
  rect(x, bottom + 4, meterWidth, 3);
  fill(74, 128, 181);
  rect(x, bottom + 4, meterWidth * audioState.level, 3);
  pop(); // never leak meter styles into the artwork
}

function getAudioBorderMessage() {
  if (audioState.status === 'error') return audioState.error;
  if (audioState.status === 'loading') return 'loading music...';
  if (!audioState.started) return 'click the artwork or press M to start music';
  if (!audioState.playing) return 'music paused — M: resume   click pool: splash   drag: wind   1–4: light';
  return 'music playing — M: pause   click pool: splash   drag: wind   1–4: light';
}
