// time-mechanic.js
// The Time member owns this file. This is only a starting point: nearly everything in it is for you to build.
// Keep the NAMES the same: everyone else's code calls them (see README.md).
//
// What is already here:
//   - lightColours: one fixed set of DAY colours (from the painting). Every other file paints with these.
//   - dayPhase: how far we are through the day (0 - 1). It already runs round, and the keys 1 - 4 jump to
//     the four times of day and the label in the top left changes. But NOTHING in the picture changes yet.
//   - a placeholder splash (it just goes up and down once) and an empty drawRipples().
//
// What YOU build (the whole Time mechanic):
//   1. THE LIGHT: day -> sunset -> night -> sunrise. Make a set of colours for each of the four moments
//      and blend between them, so the sky, house, deck, water and trees all change colour.
//      Fill lightColours every frame, and set nightAmount (0 = day, 1 = night).
//   2. THE SKY: a sun and a moon that travel across the sky (bigger and orange near the horizon, with a
//      glow); stars that come out at night; drawSkyObjects() draws them.
//   3. THE SPLASH: give every splash a life: rising -> peak -> falling -> fading (height and alpha).
//   4. THE RIPPLES: circles that spread on the water when a splash lands and when it falls back.
//
// Other files use: lightColours, nightAmount, splashes, triggerSplash(), mixColour(),
//                  jumpToTimeOfDay(), getTimeOfDayName(), drawSkyObjects(), drawRipples()

const DAY_LENGTH = 80000;   // one whole day, in milliseconds
const START_PHASE = 0.02;   // we start just after midday

// Where in the day each key (1 - 4) jumps to: day, sunset, night, sunrise.
const JUMP_PHASES = [0, 0.225, 0.5, 0.775];

// The current colour of everything. Each colour is [red, green, blue]. For now they are fixed daytime
// colours taken from the painting. Keep every name: other files use them.
let lightColours = {
  skyTop: [133, 182, 214],
  skyMid: [140, 189, 220],
  skyLow: [147, 195, 228],
  roof: [201, 192, 170],
  roofEdge: [145, 114, 93],
  wall: [176, 142, 124],
  wallSide: [150, 118, 100],
  frame: [181, 178, 171],
  glassDark: [75, 76, 81],
  glassLight: [98, 99, 104],
  hedge: [88, 95, 76],
  trunk: [140, 128, 92],
  leafDark: [70, 106, 90],
  leafLight: [112, 150, 112],
  deck: [197, 172, 161],
  shadow: [176, 152, 142],
  coping: [214, 202, 190],
  poolEdge: [56, 102, 151],
  waterTop: [98, 151, 175],
  waterBottom: [92, 145, 169],
  squiggle: [190, 222, 236],
  boardTop: [203, 195, 153],
  boardSide: [150, 140, 104],
  foam: [236, 242, 246]
};

let nightAmount = 0;      // 0 = bright day, 1 = deep night (you make it change)
let dayPhase = 0;         // 0 - 1 through the day: 0 midday, 0.25 sunset, 0.5 night, 0.75 sunrise
let timeShift = 0;        // lets the keys 1 - 4 jump to another time of day
let splashes = [];        // 6 splash objects that get reused

function setupTimeMechanic() {
  timeShift = -START_PHASE * DAY_LENGTH;
  for (let i = 0; i < 6; i++) {
    splashes.push({ active: false, x: 0.6, y: SPLASH_BASE_Y, power: 1, seed: 1,
                    phase: 'rising', phaseStart: 0, height: 0, alpha: 1 });
  }
}

function updateTimeMechanic() {
  // % keeps the number between 0 and 1, so the day repeats forever
  dayPhase = ((millis() - timeShift) / DAY_LENGTH) % 1;

  // TODO: use dayPhase to fill lightColours and nightAmount (the light of the day)

  // Placeholder splash: every splash just goes up and down once in one second.
  // TODO: replace this with the four phases (rising, peak, falling, fading) and the ripples.
  for (let i = 0; i < splashes.length; i++) {
    if (splashes[i].active) {
      let progress = (millis() - splashes[i].phaseStart) / 1000;
      if (progress >= 1) {
        splashes[i].active = false;
      } else {
        splashes[i].height = sin(progress * PI);
      }
    }
  }
}

// Blends two colours. Each colour is a list of three numbers, so we blend
// red with red, green with green and blue with blue using lerp (Week 10).
function mixColour(colourA, colourB, amount) {
  return [
    lerp(colourA[0], colourB[0], amount),
    lerp(colourA[1], colourB[1], amount),
    lerp(colourA[2], colourB[2], amount)
  ];
}

// Called by input-controls.js: 0 = day, 1 = sunset, 2 = night, 3 = sunrise.
function jumpToTimeOfDay(index) {
  timeShift = millis() - JUMP_PHASES[index] * DAY_LENGTH;
}

function getTimeOfDayName() {
  if (dayPhase < 0.125 || dayPhase >= 0.875) {
    return 'day';
  } else if (dayPhase < 0.375) {
    return 'sunset';
  } else if (dayPhase < 0.625) {
    return 'night';
  }
  return 'sunrise';
}

// artwork-base.js calls this right after the sky is painted, so the house, deck and palms are drawn
// on top of it and the sun can sink behind them.
// TODO: stars, sun and moon.
function drawSkyObjects() {}

// x = 0 - 1 across the picture, power = 1 normal (optional), y = 0 - 1 down the picture (optional).
function triggerSplash(x, power, y) {
  power = power ?? 1;
  y = y ?? SPLASH_BASE_Y;
  console.log('triggerSplash', x, power, y);

  // keep the splash inside the pool
  if (y < 0.68) {
    y = 0.68;
  }
  if (y > 0.95) {
    y = 0.95;
  }

  for (let i = 0; i < splashes.length; i++) {
    if (splashes[i].active === false) {
      splashes[i].active = true;
      splashes[i].x = x;
      splashes[i].y = y;
      splashes[i].power = power;
      splashes[i].phaseStart = millis();
      break;
    }
  }
}

// TODO: draw the ripples.
function drawRipples() {}
