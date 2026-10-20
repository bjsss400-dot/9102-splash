// TIME MECHANIC: an 80-second day, moving sky objects, and timed splash events.
// Developed with assistance from OpenAI Codex (ChatGPT): palette interpolation,
// sun/moon motion, star twinkling, splash timing, ripples, and these comments.
// millis() supplies elapsed time; lerp() blends RGB channels; sine/cosine ease motion.
// Shared names and splash fields are retained for the team's drawing/input/audio files.

const DAY_LENGTH = 80000; // milliseconds per complete day/night cycle
const START_PHASE = 0.02;
const JUMP_PHASES = [0, 0.225, 0.5, 0.775]; // keys 1–4: day, sunset, night, sunrise

// Each palette has the same keys. The daytime colours preserve the original artwork.
const TIME_PALETTES = {
  day: {
    skyTop: [133, 182, 214], skyMid: [140, 189, 220], skyLow: [147, 195, 228],
    roof: [201, 192, 170], roofEdge: [145, 114, 93],
    wall: [176, 142, 124], wallSide: [150, 118, 100],
    frame: [181, 178, 171], glassDark: [75, 76, 81], glassLight: [98, 99, 104],
    hedge: [88, 95, 76], trunk: [140, 128, 92],
    leafDark: [70, 106, 90], leafLight: [112, 150, 112],
    deck: [197, 172, 161], shadow: [176, 152, 142], coping: [214, 202, 190],
    poolEdge: [56, 102, 151], waterTop: [98, 151, 175], waterBottom: [92, 145, 169],
    squiggle: [190, 222, 236], boardTop: [203, 195, 153],
    boardSide: [150, 140, 104], foam: [236, 242, 246]
  },
  sunset: {
    skyTop: [91, 80, 130], skyMid: [211, 126, 137], skyLow: [255, 182, 105],
    roof: [225, 193, 160], roofEdge: [156, 111, 88],
    wall: [188, 139, 112], wallSide: [156, 108, 93],
    frame: [217, 189, 171], glassDark: [112, 85, 91], glassLight: [168, 127, 121],
    hedge: [80, 84, 64], trunk: [121, 100, 80],
    leafDark: [66, 76, 67], leafLight: [116, 125, 89],
    deck: [201, 158, 139], shadow: [158, 116, 116], coping: [228, 191, 162],
    poolEdge: [105, 105, 145], waterTop: [164, 121, 144], waterBottom: [124, 98, 135],
    squiggle: [247, 202, 175], boardTop: [218, 187, 128],
    boardSide: [162, 130, 94], foam: [255, 231, 212]
  },
  night: {
    skyTop: [10, 16, 43], skyMid: [22, 30, 65], skyLow: [49, 51, 91],
    roof: [100, 101, 120], roofEdge: [47, 44, 65],
    wall: [64, 58, 82], wallSide: [43, 42, 66],
    frame: [129, 131, 148], glassDark: [193, 145, 65], glassLight: [255, 215, 126],
    hedge: [28, 40, 43], trunk: [67, 70, 67],
    leafDark: [28, 45, 48], leafLight: [57, 74, 67],
    deck: [72, 69, 94], shadow: [43, 43, 65], coping: [125, 127, 151],
    poolEdge: [34, 45, 79], waterTop: [35, 61, 91], waterBottom: [22, 40, 66],
    squiggle: [128, 171, 203], boardTop: [137, 140, 141],
    boardSide: [78, 83, 98], foam: [200, 222, 242]
  },
  sunrise: {
    skyTop: [115, 128, 175], skyMid: [220, 156, 171], skyLow: [255, 192, 140],
    roof: [219, 198, 178], roofEdge: [160, 129, 117],
    wall: [185, 151, 139], wallSide: [151, 122, 119],
    frame: [200, 187, 184], glassDark: [115, 107, 125], glassLight: [169, 153, 158],
    hedge: [91, 99, 83], trunk: [143, 133, 111],
    leafDark: [79, 103, 97], leafLight: [132, 151, 123],
    deck: [207, 175, 165], shadow: [173, 144, 148], coping: [231, 208, 190],
    poolEdge: [102, 122, 158], waterTop: [133, 155, 180], waterBottom: [105, 129, 158],
    squiggle: [239, 214, 207], boardTop: [216, 199, 161],
    boardSide: [164, 145, 119], foam: [255, 238, 227]
  }
};

// Repeated colours create short holds; the final stop makes the loop seamless.
const TIME_LIGHT_STOPS = [
  { phase: 0, palette: 'day', night: 0 },
  { phase: 0.10, palette: 'day', night: 0 },
  { phase: 0.225, palette: 'sunset', night: 0 },
  { phase: 0.25, palette: 'sunset', night: 0 },
  { phase: 0.40, palette: 'night', night: 1 },
  { phase: 0.60, palette: 'night', night: 1 },
  { phase: 0.75, palette: 'sunrise', night: 0 },
  { phase: 0.775, palette: 'sunrise', night: 0 },
  { phase: 0.90, palette: 'day', night: 0 },
  { phase: 1, palette: 'day', night: 0 }
];

const TIME_SPLASH_DURATION = { rising: 480, peak: 180, falling: 620, fading: 600 };
const TIME_RIPPLE_DURATION = 2200;
const TIME_MAX_RIPPLES = 36;

let lightColours = {};
for (let name in TIME_PALETTES.day) {
  lightColours[name] = TIME_PALETTES.day[name].slice();
}
let nightAmount = 0; // 0 = daylight, 1 = full night; also used by window reflections
let dayPhase = START_PHASE;
let timeShift = 0;
let splashes = [];
let timeRipples = [];
let timeStars = [];
let timeSplashSeed = 0;

function setupTimeMechanic() {
  timeShift = millis() - START_PHASE * DAY_LENGTH;
  splashes.length = 0;
  timeRipples.length = 0;
  timeStars.length = 0;
  timeSplashSeed = 0;

  for (let i = 0; i < 6; i++) {
    splashes.push({
      active: false, x: 0.6, y: SPLASH_BASE_Y, power: 1, seed: 1,
      phase: 'rising', phaseStart: 0, startedAt: 0,
      height: 0, alpha: 0, returnRippleCreated: false
    });
  }

  // Fixed positions avoid changing the Perlin member's global random/noise seed.
  for (let i = 0; i < 55; i++) {
    timeStars.push({
      x: 0.025 + ((i * 37) % 101) / 101 * 0.95,
      y: 0.02 + ((i * 23) % 97) / 97 * (HORIZON - 0.04),
      size: 1 + (i % 3) * 0.55,
      speed: 0.65 + (i % 5) * 0.17,
      offset: i * 1.7
    });
  }
  updateTimeMechanic();
}

function updateTimeMechanic() {
  const now = millis();
  dayPhase = (((now - timeShift) / DAY_LENGTH) % 1 + 1) % 1;
  updateTimeLighting();

  for (let splash of splashes) {
    if (splash.active) {
      updateTimedSplash(splash, now);
    }
  }
  // Remove expired rings, including after a long pause in a background tab.
  for (let i = timeRipples.length - 1; i >= 0; i--) {
    if (now - timeRipples[i].startedAt >= TIME_RIPPLE_DURATION) {
      timeRipples.splice(i, 1);
    }
  }
}

// A half cosine slows interpolation at both ends without a frame-rate dependency.
function easeTimeBlend(amount) {
  return (1 - cos(constrain(amount, 0, 1) * PI)) / 2;
}

function updateTimeLighting() {
  for (let i = 0; i < TIME_LIGHT_STOPS.length - 1; i++) {
    const from = TIME_LIGHT_STOPS[i];
    const to = TIME_LIGHT_STOPS[i + 1];
    if (dayPhase >= from.phase && dayPhase < to.phase) {
      const amount = easeTimeBlend((dayPhase - from.phase) / (to.phase - from.phase));
      for (let name in lightColours) {
        lightColours[name] = mixColour(
          TIME_PALETTES[from.palette][name], TIME_PALETTES[to.palette][name], amount
        );
      }
      nightAmount = lerp(from.night, to.night, amount);
      break;
    }
  }
}

// Shared RGB helper used by the artwork and Perlin drawing files.
function mixColour(colourA, colourB, amount) {
  return [
    lerp(colourA[0], colourB[0], amount),
    lerp(colourA[1], colourB[1], amount),
    lerp(colourA[2], colourB[2], amount)
  ];
}

function jumpToTimeOfDay(index) {
  if (!Number.isInteger(index) || index < 0 || index >= JUMP_PHASES.length) return;
  timeShift = millis() - JUMP_PHASES[index] * DAY_LENGTH;
  dayPhase = JUMP_PHASES[index];
  updateTimeLighting(); // Only the day clock jumps; existing splash timers keep running.
}

function getTimeOfDayName() {
  if (dayPhase < 0.125 || dayPhase >= 0.875) return 'day';
  if (dayPhase < 0.375) return 'sunset';
  if (dayPhase < 0.625) return 'night';
  return 'sunrise';
}

// Called before the house/palms: they naturally hide the setting sun and moon.
function drawSkyObjects() {
  push();
  noStroke();
  const seconds = millis() / 1000;
  const starVisibility = easeTimeBlend((nightAmount - 0.15) / 0.85);
  if (starVisibility > 0) {
    for (let star of timeStars) {
      const twinkle = 0.72 + 0.28 * sin(seconds * star.speed + star.offset);
      fill(239, 244, 255, 220 * starVisibility * twinkle);
      ellipse(picX(star.x), picY(star.y), star.size, star.size);
    }
  }

  const sunProgress = ((dayPhase + 0.25) % 1) * 2;
  const moonProgress = ((dayPhase + 0.75) % 1) * 2;
  if (sunProgress <= 1) drawTimeOrb(sunProgress, false);
  if (moonProgress <= 1) drawTimeOrb(moonProgress, true);
  pop();
}

function drawTimeOrb(progress, isMoon) {
  const elevation = sin(progress * PI);
  const nearHorizon = 1 - elevation;
  const x = picX(lerp(0.92, 0.08, progress));
  // A flatter sine arch keeps the orb visible near sunset before it sinks behind the roof.
  // The right horizon is open; the left endpoint lies behind the house.
  const arch = Math.pow(elevation, 0.75);
  const y = picY(lerp(HORIZON + 0.02, 0.28, progress) - 0.30 * arch);
  const diameter = PIC_W * (isMoon ? 0.033 : 0.037) * (1 + 0.65 * nearHorizon);
  const colour = isMoon
    ? mixColour([242, 246, 220], [255, 228, 184], nearHorizon)
    : mixColour([255, 249, 204], [255, 159, 77], nearHorizon);
  const visibility = easeTimeBlend(progress / 0.035) * easeTimeBlend((1 - progress) / 0.035);

  for (let layer = 6; layer >= 1; layer--) {
    const size = diameter * (1 + layer * 0.24);
    fill(colour[0], colour[1], colour[2], visibility * (isMoon ? 5 : 7));
    ellipse(x, y, size, size);
  }
  fill(colour[0], colour[1], colour[2], 255 * visibility);
  ellipse(x, y, diameter, diameter);
}

// Input/audio can call triggerSplash(x, power, y); coordinates are picture fractions.
function triggerSplash(x, power, y) {
  power = power ?? 1;
  y = y ?? SPLASH_BASE_Y;
  if (!Number.isFinite(x) || !Number.isFinite(power) || !Number.isFinite(y)) return;

  let splash = splashes.find(item => !item.active);
  // If all six are busy, replace the oldest so a new click still responds.
  if (!splash) {
    splash = splashes[0];
    for (let item of splashes) {
      if (item.startedAt < splash.startedAt) splash = item;
    }
  }
  if (!splash) return;

  const now = millis();
  splash.active = true;
  splash.x = constrain(x, 0.02, 0.98);
  splash.y = constrain(y, 0.68, 0.95);
  splash.power = constrain(power, 0.2, 2);
  splash.seed = ++timeSplashSeed;
  splash.startedAt = now;
  splash.phaseStart = now;
  splash.phase = 'rising';
  splash.height = 0;
  splash.alpha = 1;
  splash.returnRippleCreated = false;
  addTimeRipple(splash, now, 0.8); // First impact on the water.
}

function updateTimedSplash(splash, now) {
  const age = now - splash.startedAt;
  const riseEnd = TIME_SPLASH_DURATION.rising;
  const peakEnd = riseEnd + TIME_SPLASH_DURATION.peak;
  const fallEnd = peakEnd + TIME_SPLASH_DURATION.falling;
  const fadeEnd = fallEnd + TIME_SPLASH_DURATION.fading;

  // Timestamp the return event at its intended time, even if a frame was skipped.
  if (age >= fallEnd && !splash.returnRippleCreated) {
    addTimeRipple(splash, splash.startedAt + fallEnd, 1);
    splash.returnRippleCreated = true;
  }
  if (age < riseEnd) {
    splash.phase = 'rising';
    splash.phaseStart = splash.startedAt;
    const amount = constrain(age / riseEnd, 0, 1);
    splash.height = 1 - (1 - amount) * (1 - amount); // Fast rise, slowing at the top.
    splash.alpha = 1;
  } else if (age < peakEnd) {
    splash.phase = 'peak';
    splash.phaseStart = splash.startedAt + riseEnd;
    splash.height = 1;
    splash.alpha = 1;
  } else if (age < fallEnd) {
    splash.phase = 'falling';
    splash.phaseStart = splash.startedAt + peakEnd;
    const amount = (age - peakEnd) / TIME_SPLASH_DURATION.falling;
    splash.height = lerp(1, 0.16, amount * amount); // Slow start, accelerating downward.
    splash.alpha = 1;
  } else if (age < fadeEnd) {
    splash.phase = 'fading';
    splash.phaseStart = splash.startedAt + fallEnd;
    const amount = (age - fallEnd) / TIME_SPLASH_DURATION.fading;
    splash.height = lerp(0.16, 0, easeTimeBlend(amount));
    splash.alpha = 1 - easeTimeBlend(amount);
  } else {
    splash.active = false;
    splash.phase = 'fading';
    splash.phaseStart = splash.startedAt + fallEnd;
    splash.height = 0;
    splash.alpha = 0;
  }
}

function addTimeRipple(splash, startedAt, strength) {
  timeRipples.push({
    x: splash.x, y: splash.y, power: splash.power, startedAt: startedAt, strength: strength
  });
  if (timeRipples.length > TIME_MAX_RIPPLES) timeRipples.shift();
}

// Rings expand independently of their splash and flatten to match the pool perspective.
function drawRipples() {
  push();
  noFill();
  const now = millis();
  const colour = lightColours.squiggle;
  for (let ripple of timeRipples) {
    const progress = constrain((now - ripple.startedAt) / TIME_RIPPLE_DURATION, 0, 1);
    const depthScale = lerp(0.8, 1.15, (ripple.y - 0.68) / 0.27);
    const expansion = 1 - (1 - progress) * (1 - progress);
    let radius = lerp(6, 80 + ripple.power * 28, expansion) * depthScale;
    // Keep the ellipse on the water even when the impact is close to a pool edge.
    const roomAbove = picY(ripple.y) - picY(WATER_TOP) - 2;
    const roomBelow = picY(1) - picY(ripple.y) - 2;
    radius = Math.min(radius, Math.min(roomAbove, roomBelow) / PERSPECTIVE);
    const alpha = 155 * ripple.strength * (1 - progress) * (1 - progress);
    stroke(colour[0], colour[1], colour[2], alpha);
    strokeWeight(1.4 * depthScale);
    ellipse(picX(ripple.x), picY(ripple.y), radius * 2, radius * 2 * PERSPECTIVE);
  }
  pop();
}
