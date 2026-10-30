// Run with: node tests/input-charge.test.cjs
// Exercises the real group modules with small p5/Web Audio stubs.
// AI assistance: OpenAI Codex helped write these regression checks.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

function makeApp() {
  let now = 0, seed = 0, stack = 0;
  const loads = [], landings = [], drawing = [], sounds = new Map();
  const element = value => ({ value: () => value, html() {}, attribute() {}, mousePressed() {} });
  const parameter = () => ({ value: 0, cancelScheduledValues() {}, setTargetAtTime() {},
    setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
  const audioNode = () => ({ frequency: parameter(), gain: parameter(), connect() {},
    disconnect() {}, start() {}, stop() {} });
  const audioContext = { state: 'running', currentTime: 0, destination: {},
    resume: async () => {}, createOscillator: audioNode, createBiquadFilter: audioNode, createGain: audioNode };
  const s = {
    console, Math, PI: Math.PI, TWO_PI: Math.PI * 2,
    CENTER: 'center', LEFT: 'left', RIGHT: 'right', CLOSE: 'close',
    frameCount: 0, deltaTime: 1000 / 60, mouseX: 0, mouseY: 0, key: '', width: 660, height: 660,
    sin: Math.sin, cos: Math.cos, min: Math.min, max: Math.max, abs: Math.abs, floor: Math.floor, exp: Math.exp,
    constrain: (n, a, b) => Math.max(a, Math.min(b, n)), lerp: (a, b, t) => a + (b - a) * t,
    map: (n, a, b, c, d) => c + (n - a) / (b - a) * (d - c),
    millis: () => now, noise: (...args) => 0.5 + 0.3 * Math.sin(args.reduce((a, b) => a + b, 0)),
    randomSeed: n => { seed = n >>> 0; },
    random: (a = 1, b) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const n = seed / 4294967296;
      return Array.isArray(a) ? a[Math.floor(n * a.length)] : b === undefined ? a * n : a + (b - a) * n;
    },
    createCanvas() {}, createButton: element, createSpan: element, createP: element,
    createSlider: (min, max, value) => element(value),
    getAudioContext: () => audioContext, userStartAudio: async () => {},
    loadSound: (name, loaded) => {
      const sound = { plays: 0, playing: false, playMode() {}, setVolume() {},
        loop() { this.playing = true; }, pause() { this.playing = false; },
        isPlaying() { return this.playing; }, play() { this.plays++; } };
      sounds.set(name, sound); loads.push(loaded); return sound;
    },
    p5: { Amplitude: class { setInput() {} getLevel() { return 0.08; } } },
    push: () => { stack++; }, pop: () => { assert.ok(stack > 0); stack--; }, clip: draw => draw(),
    recordLanding: (...args) => landings.push(args)
  };
  for (const name of ['background', 'ellipse', 'line', 'fill', 'noFill', 'stroke', 'noStroke', 'strokeWeight',
    'quad', 'rect', 'rectMode', 'rotate', 'scale', 'text', 'textSize', 'textAlign', 'translate',
    'beginShape', 'endShape', 'vertex', 'bezierVertex']) {
    s[name] = (...args) => {
      for (const n of args.flat()) if (typeof n === 'number') assert.ok(Number.isFinite(n), name);
      if (name === 'ellipse' || name === 'line') drawing.push({ name, args });
    };
  }
  const context = vm.createContext(s);
  const run = code => vm.runInContext(code, context);
  for (const file of ['artwork-base.js', 'time-mechanic.js', 'perlin-random-mechanic.js',
    'input-controls.js', 'audio-mechanic.js', 'sketch.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
  }
  run('setup(); const originalTrigger = triggerSplash; triggerSplash = (...args) => { recordLanding(...args); originalTrigger(...args); };');
  loads.forEach(loaded => loaded());
  const snapshot = () => JSON.parse(run('JSON.stringify(diver)'));
  const frame = (time, fps) => {
    now = time; s.frameCount++; s.deltaTime = 1000 / fps; audioContext.currentTime = now / 1000;
    run('updateInputControls(); updateWind(); updateTimeMechanic(); updateAudioMechanic();');
  };
  const hold = (duration, fps) => {
    const start = now;
    for (let i = 1; i <= Math.floor(duration * fps / 1000); i++) frame(start + i * 1000 / fps, fps);
    now = start + duration; // release may happen between animation frames
  };
  const frames = (count, fps = 60) => { for (let i = 0; i < count; i++) frame(now + 1000 / fps, fps); };
  const press = () => { s.key = ' '; run('keyPressed();'); };
  const release = () => { s.key = ' '; run('keyReleased();'); };
  const render = () => { run('drawScene(); drawBorderText(); drawAudioMeter();'); assert.equal(stack, 0); };
  return { s, run, hold, frames, press, release, render, snapshot, landings, drawing, sounds };
}

async function main() {
  const samples = [];
  for (const duration of [0, 80, 400, 1250, 2500, 5000]) {
    let reference;
    for (const fps of [15, 30, 60, 144]) {
      const app = makeApp();
      app.press(); app.hold(duration, fps); app.release();
      const dive = app.snapshot();
      assert.equal(dive.state, 'flying');
      const result = [dive.landX, dive.landY, dive.power];
      if (reference) result.forEach((n, i) => assert.ok(Math.abs(n - reference[i]) < 1e-9,
        'equal hold durations must give equal landings at different frame rates'));
      reference = result;
      assert.equal(app.landings.length, 0, 'do not splash before flight ends');
      app.frames(21, fps); assert.equal(app.landings.length, 0);
      app.frames(1, fps); assert.equal(app.landings.length, 1);
      assert.deepEqual(app.landings[0], [dive.landX, dive.power, dive.landY]);
      app.render(); app.frames(60, fps); assert.equal(app.landings.length, 1);
    }
    samples.push({ duration, x: reference[0], y: reference[1], power: reference[2] });
  }
  for (let i = 1; i < samples.length - 1; i++) {
    const a = samples[i - 1], b = samples[i];
    assert.ok(Math.hypot(b.x - 0.59, b.y - 0.80) > Math.hypot(a.x - 0.59, a.y - 0.80));
    assert.ok(b.power > a.power, 'longer holds create larger splashes');
  }
  assert.equal(samples.at(-1).x, samples.at(-2).x, 'overlong holds stay within the pool');
  assert.equal(samples.at(-1).power, samples.at(-2).power);

  // A quick tap after a strong dive must not inherit its old, far-away landing.
  const quick = makeApp();
  quick.press(); quick.hold(2500, 60); quick.release(); quick.frames(22);
  const oldPower = quick.landings[0][1];
  quick.press(); quick.hold(8, 60); quick.release(); quick.frames(22);
  assert.ok(quick.landings[1][0] > quick.landings[0][0]);
  assert.ok(quick.landings[1][1] < oldPower / 2);

  // Keyboard auto-repeat and an unrelated pointer release cannot restart/release a hold.
  const keys = makeApp();
  keys.press(); keys.hold(700, 60); keys.press(); keys.run('mouseReleased();');
  assert.equal(keys.snapshot().state, 'charging');
  assert.equal(keys.snapshot().chargeStart, 0);
  keys.hold(300, 60); keys.release();
  assert.ok(Math.abs(keys.snapshot().charge - 0.4) < 1e-9);

  // Direct board pressing charges a dive and suppresses mouse-drag wind.
  const mouse = makeApp();
  mouse.s.mouseX = mouse.run('picX(0.83)'); mouse.s.mouseY = mouse.run('picY(0.91)');
  assert.equal(mouse.run('isOverDivingBoard(mouseX, mouseY)'), true);
  mouse.run('mousePressed({ button: 0 });');
  assert.equal(mouse.landings.length, 0);
  assert.equal(mouse.snapshot().chargeSource, 'mouse');
  mouse.hold(1250, 60); mouse.press(); mouse.release();
  assert.equal(mouse.snapshot().state, 'charging', 'SPACE release must not release a mouse hold');
  mouse.s.mouseX = -50; mouse.run('mouseDragged();');
  assert.equal(mouse.run('wind.gust'), 0);
  mouse.run('mouseReleased();'); // release outside the canvas still launches the same dive
  assert.equal(mouse.snapshot().state, 'flying');
  mouse.frames(22); assert.equal(mouse.landings.length, 1); mouse.render();
  assert.equal(mouse.sounds.get('audio/splash.wav').plays, 1, 'audio still sees one landing transition');

  // Off-board clicks never create splashes or landing sounds, including during a flight.
  const clicks = makeApp();
  for (const [x, y] of [[0.25, 0.8], [0.5, 0.7], [0.2, 0.95], [0.5, 0.3], [-0.1, 0.8]]) {
    clicks.s.mouseX = clicks.run(`picX(${x})`); clicks.s.mouseY = clicks.run(`picY(${y})`);
    for (const button of [0, 1, 2]) {
      clicks.run(`mousePressed({ button: ${button} }); mouseReleased();`);
      clicks.frames(24);
      assert.equal(clicks.snapshot().state, 'ready');
      assert.equal(clicks.landings.length, 0, 'off-board clicks must not produce a splash');
    }
  }
  clicks.s.mouseX = clicks.run('picX(0.83)'); clicks.s.mouseY = clicks.run('picY(0.91)');
  clicks.run('mousePressed({ button: 2 }); mouseReleased();'); clicks.frames(24);
  assert.equal(clicks.landings.length, 0, 'right-clicking the board does not start a dive');
  assert.equal(clicks.sounds.get('audio/splash.wav').plays, 0);
  clicks.press(); clicks.hold(80, 60); clicks.release();
  clicks.s.mouseX = clicks.run('picX(0.25)'); clicks.s.mouseY = clicks.run('picY(0.8)');
  clicks.run('mousePressed({ button: 0 }); mouseReleased();');
  assert.equal(clicks.landings.length, 0, 'a pool click must not add an immediate splash during flight');
  clicks.frames(22); assert.equal(clicks.landings.length, 1);

  // Wind and time controls remain usable without clicking a splash into the pool.
  mouse.s.mouseX = mouse.run('picX(0.25)'); mouse.s.mouseY = mouse.run('picY(0.8)');
  mouse.run('mousePressed({ button: 0 });'); assert.equal(mouse.landings.length, 1);
  mouse.s.mouseX += 100; mouse.run('mouseDragged();'); assert.ok(mouse.run('wind.gust') > 0);
  for (const [key, label] of [['1', 'day'], ['2', 'sunset'], ['3', 'night'], ['4', 'sunrise']]) {
    mouse.s.key = key; mouse.run('keyPressed();'); assert.equal(mouse.run('getTimeOfDayName()'), label);
  }
  mouse.render();

  // Measure the actual plume's drawing geometry at its peak, after p5 transforms.
  // Power alone is not enough: the renderer's old minimum made weak splashes look broad.
  function splashBounds(duration) {
    const app = makeApp();
    app.press(); app.hold(duration, 60); app.release(); app.frames(52);
    let transform = { x: 0, y: 0, sx: 1, sy: 1 };
    const saved = [], points = [];
    app.s.push = () => saved.push({ ...transform });
    app.s.pop = () => { assert.ok(saved.length); transform = saved.pop(); };
    app.s.translate = (x, y) => { transform.x += x * transform.sx; transform.y += y * transform.sy; };
    app.s.scale = (x, y = x) => { transform.sx *= x; transform.sy *= y; };
    const point = (x, y) => points.push([transform.x + x * transform.sx, transform.y + y * transform.sy]);
    app.s.line = (x1, y1, x2, y2) => { point(x1, y1); point(x2, y2); };
    app.s.ellipse = (x, y, w, h) => { point(x - w / 2, y - h / 2); point(x + w / 2, y + h / 2); };
    app.run('wind.value = 0; drawOneSplash(splashes.find(splash => splash.active));');
    assert.ok(points.length > 3000, 'measure the actual brush marks and droplets');
    assert.equal(saved.length, 0, 'splash transforms must not leak into the scene');
    assert.deepEqual(transform, { x: 0, y: 0, sx: 1, sy: 1 });
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }
  const shortSize = splashBounds(80), longSize = splashBounds(2500);
  assert.ok(shortSize.width < longSize.width * 0.4, 'a quick tap must be visibly narrower');
  assert.ok(shortSize.height < longSize.height * 0.3, 'a quick tap must be visibly shorter');
  assert.deepEqual(splashBounds(5000), longSize, 'holding past full charge does not enlarge the splash');
  console.log('Peak splash geometry:', { shortSize, longSize });
  console.log('PASS: 24 duration/frame-rate combinations; near-small to far-large ordering; charge cap;');
  console.log('quick tap after full charge; repeated/mixed controls; direct board hold and outside release;');
  console.log('one timed splash and landing sound; no off-board click splashes; wind/time controls;');
  console.log('smaller short-hold plume geometry; shared-module rendering.');
  console.table(samples);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
