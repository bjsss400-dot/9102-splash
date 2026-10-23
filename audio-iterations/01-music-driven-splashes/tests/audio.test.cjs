// Behaviour tests developed with OpenAI Codex (ChatGPT).
// Run: node tests/audio.test.cjs (no npm packages required).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'audio-mechanic.js'), 'utf8');

function harness(options = {}) {
  let now = 0, raw = 0, playing = false, plays = 0;
  const hits = [];
  let success, failure, unlock;
  const track = {
    setLoop() {}, setVolume() {}, isPlaying: () => playing,
    play() { playing = true; plays++; }, pause() { playing = false; }
  };
  const context = vm.createContext({
    console, Math, Number, Infinity, Promise,
    millis: () => now, constrain: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    SPLASH_BASE_Y: 0.86,
    triggerSplash: (x, power, y) => hits.push({ now, x, power, y }),
    p5: { Amplitude: function () { this.setInput = () => {}; this.getLevel = () => raw; } },
    loadSound: (_, ok, fail) => { success = ok; failure = fail; return track; },
    userStartAudio: () => options.delayedUnlock ? new Promise(r => { unlock = r; }) : Promise.resolve()
  });
  const run = code => vm.runInContext(code, context);
  run(source);
  run('setupAudioMechanic()');
  return {
    run, hits, state: () => run('JSON.parse(JSON.stringify(audioState))'),
    loaded: () => success(track), failed: () => failure(),
    unlock: () => unlock(), plays: () => plays,
    tick(value, dt = 1000 / 60) { raw = value; now += dt; run('updateAudioMechanic()'); },
    async start() { success(track); run('startAudio()'); await Promise.resolve(); }
  };
}

(async () => {
  const a = harness();
  await a.start();
  for (let i = 0; i < 240; i++) a.tick(0);
  assert.equal(a.hits.length, 0, 'silence must not trigger');
  a.run('toggleAudio()');
  a.run('startAudio()');
  assert.equal(a.state().playing, false, 'pool clicks must preserve deliberate pause');
  assert.equal(a.plays(), 1);
  a.run('toggleAudio()');
  await Promise.resolve();
  for (let i = 0; i < 60; i++) a.tick(0.3);
  assert.equal(a.hits.length, 0, 'resume warmup suppresses a false onset');
  for (let i = 0; i < 600; i++) a.tick(0.3);
  assert.ok(a.hits.length <= 1, 'a sustained tone cannot repeatedly splash');
  assert.equal(a.state().history.length, 60);
  a.tick(NaN);
  assert.ok(Number.isFinite(a.state().level));
  const count = a.hits.length;
  a.tick(0.8, 2000);
  assert.equal(a.hits.length, count, 'tab stall must not trigger a stale peak');

  const b = harness({ delayedUnlock: true });
  b.run('startAudio(); startAudio(); toggleAudio()');
  b.loaded(); b.unlock(); await Promise.resolve();
  assert.equal(b.plays(), 0, 'M cancels pending playback even if loading finishes');

  const c = harness();
  c.failed();
  assert.equal(c.state().status, 'error');
  assert.match(c.run('getAudioBorderMessage()'), /local server/);
  c.run('toggleAudio()'); c.loaded(); await Promise.resolve();
  assert.equal(c.state().playing, true, 'failed load can be retried');

  // Replay RMS windows from the shipped music, not a beat clock.
  const wav = fs.readFileSync(path.join(root, 'assets/poolside-study.wav'));
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  const rate = wav.readUInt32LE(24);
  const sampleCount = (wav.length - 44) / 2;
  async function replay(fps) {
    const h = harness(); await h.start();
    for (let frame = 0; frame < 24 * fps; frame++) {
      const end = Math.min(sampleCount, Math.round((frame + 1) * rate / fps));
      const start = Math.max(0, end - 1024);
      let sum = 0;
      for (let i = start; i < end; i++) {
        const sample = wav.readInt16LE(44 + i * 2) / 32768;
        sum += sample * sample;
      }
      h.tick(Math.sqrt(sum / (end - start)) * 0.65, 1000 / fps);
    }
    const sizes = [0.55, 1.1, 1.85].map(power => h.hits.filter(hit => hit.power === power).length);
    assert.ok(sizes.every(n => n > 0), `all 3 sizes at ${fps}fps: ${sizes}`);
    assert.ok(h.hits.every((hit, i) => !i || hit.now - h.hits[i - 1].now >= 420));
    assert.ok(h.hits.every(hit => hit.x === 0.60 && hit.y === 0.86));
    for (let second = 3; second <= 21; second += 3) {
      assert.ok(h.hits.some(hit => hit.power === 1.85 && Math.abs(hit.now - second * 1000) < 400),
        `strong audio downbeat near ${second}s at ${fps}fps`);
    }
    console.log(`${fps} fps music replay: small / medium / large = ${sizes.join(' / ')}`);
  }
  await replay(60);
  await replay(30);
  console.log('PASS: silence, warmup, pause/resume, load retry, cancellation, stalls, history, real WAV peaks.');
})().catch(error => { console.error(error); process.exitCode = 1; });
