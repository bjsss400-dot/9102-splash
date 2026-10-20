// time-mechanic.js
// The Time member owns this file. It is a working starting point: the whole day already runs.
// Keep the NAMES the same: everyone else's code calls them.
//
// Already done here:
//   - one full day (DAY_LENGTH): day -> sunset -> night -> sunrise, every colour in the scene follows it
//   - a real-looking sun: it rises beside the palms on the right, climbs, and sinks behind the roof
//     on the left. Near the horizon it grows, turns orange and gets a glow. The moon does the same at night.
//   - stars that appear at night
//   - the keys 1 - 4 (input-controls.js) jump to day / sunset / night / sunrise
// Still to do (Time member):
//   - TODO: the life of a splash: rising -> peak -> falling -> fading (switch), with lerp easing
//   - TODO: ripples: events when a splash lands and when it falls back
//
// Uses: millis(), the % operator, if / else if, objects, arrays, bracket notation, for loops,
//       lerp, translate / rotate / push / pop, sin.
//
// Other files use: lightColours, nightAmount, splashes, triggerSplash(), mixColour(),
//                  jumpToTimeOfDay(), getTimeOfDayName(), drawSkyObjects(), drawRipples()

const DAY_LENGTH = 80000;   // one whole day, in milliseconds
const START_PHASE = 0.02;   // we start just after midday, so the sun begins high in the sky

// Each colour is [red, green, blue]. The palettes are the four "key moments" of the day.
// The day colours were taken from Hockney's painting.
const COLOUR_NAMES = ['skyTop', 'skyMid', 'skyLow', 'roof', 'roofEdge', 'wall', 'wallSide', 'frame',
                      'glassDark', 'glassLight', 'hedge', 'trunk', 'leafDark', 'leafLight', 'deck',
                      'shadow', 'coping', 'poolEdge', 'waterTop', 'waterBottom', 'squiggle',
                      'boardTop', 'boardSide', 'foam'];

const PALETTES = [
  {   // 0: day
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
    foam: [236, 242, 246],
    night: 0
  },
  {   // 1: sunset
    skyTop: [80, 86, 146],
    skyMid: [214, 120, 128],
    skyLow: [255, 176, 96],
    roof: [206, 170, 142],
    roofEdge: [169, 119, 90],
    wall: [190, 137, 111],
    wallSide: [173, 122, 95],
    frame: [193, 162, 142],
    glassDark: [110, 80, 90],
    glassLight: [200, 128, 100],
    hedge: [68, 70, 56],
    trunk: [110, 92, 72],
    leafDark: [46, 70, 62],
    leafLight: [96, 112, 84],
    deck: [203, 157, 136],
    shadow: [190, 143, 123],
    coping: [215, 177, 155],
    poolEdge: [110, 110, 129],
    waterTop: [170, 120, 140],
    waterBottom: [96, 100, 150],
    squiggle: [255, 205, 160],
    boardTop: [208, 173, 130],
    boardSide: [173, 136, 98],
    foam: [255, 232, 215],
    night: 0.3
  },
  {   // 2: night (the lights in the house are on)
    skyTop: [10, 18, 48],
    skyMid: [18, 28, 66],
    skyLow: [36, 48, 96],
    roof: [73, 74, 92],
    roofEdge: [57, 51, 69],
    wall: [66, 59, 78],
    wallSide: [58, 52, 72],
    frame: [130, 126, 138],
    glassDark: [206, 150, 72],
    glassLight: [252, 214, 120],
    hedge: [26, 40, 38],
    trunk: [52, 50, 54],
    leafDark: [20, 32, 38],
    leafLight: [46, 66, 66],
    deck: [71, 68, 89],
    shadow: [66, 62, 84],
    coping: [76, 76, 97],
    poolEdge: [28, 60, 110],
    waterTop: [22, 44, 86],
    waterBottom: [12, 30, 68],
    squiggle: [120, 160, 215],
    boardTop: [128, 120, 100],
    boardSide: [78, 74, 68],
    foam: [205, 220, 245],
    night: 1
  },
  {   // 3: sunrise
    skyTop: [110, 128, 190],
    skyMid: [236, 150, 150],
    skyLow: [255, 200, 130],
    roof: [210, 187, 170],
    roofEdge: [166, 126, 110],
    wall: [190, 148, 134],
    wallSide: [170, 129, 115],
    frame: [194, 176, 171],
    glassDark: [118, 104, 120],
    glassLight: [212, 160, 140],
    hedge: [121, 112, 97],
    trunk: [162, 137, 109],
    leafDark: [107, 120, 108],
    leafLight: [140, 154, 125],
    deck: [206, 172, 163],
    shadow: [190, 156, 148],
    coping: [220, 195, 186],
    poolEdge: [96, 117, 155],
    waterTop: [132, 150, 188],
    waterBottom: [94, 128, 168],
    squiggle: [250, 222, 220],
    boardTop: [211, 190, 157],
    boardSide: [170, 147, 119],
    foam: [255, 244, 240],
    night: 0.35
  }
];

let lightColours = {};   // the current colour of everything, updated every frame
let nightAmount = 0;     // 0 = bright day, 1 = deep night
let dayPhase = 0;        // 0 - 1 through the day: 0 midday, 0.25 sunset, 0.5 night, 0.75 sunrise
let timeShift = 0;       // lets the keys 1 - 4 jump to another time of day
let splashes = [];       // 6 splash objects that get reused

function setupTimeMechanic() {
  timeShift = -START_PHASE * DAY_LENGTH;
  for (let i = 0; i < 6; i++) {
    splashes.push({ active: false, x: 0.6, y: SPLASH_BASE_Y, power: 1, seed: 1,
                    phase: 'rising', phaseStart: 0, height: 0, alpha: 1 });
  }
  updateDayCycle();   // so lightColours has values before the first frame is drawn
}

function updateTimeMechanic() {
  updateDayCycle();

  // Placeholder splash: every splash just goes up and down once in one second.
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

// ---------------------------------------------------------------- the light

// Blends two colours. Each colour is a list of three numbers, so we blend
// red with red, green with green and blue with blue using lerp (Week 10).
function mixColour(colourA, colourB, amount) {
  return [
    lerp(colourA[0], colourB[0], amount),
    lerp(colourA[1], colourB[1], amount),
    lerp(colourA[2], colourB[2], amount)
  ];
}

function updateDayCycle() {
  // % keeps the number between 0 and 1, so the day repeats forever
  dayPhase = ((millis() - timeShift) / DAY_LENGTH) % 1;

  // Which two palettes are we between, and how far along are we?
  let fromIndex = 0;
  let toIndex = 1;
  let amount = 0;
  if (dayPhase < 0.25) {
    fromIndex = 0;
    toIndex = 1;
    amount = dayPhase / 0.25;
  } else if (dayPhase < 0.5) {
    fromIndex = 1;
    toIndex = 2;
    amount = (dayPhase - 0.25) / 0.25;
  } else if (dayPhase < 0.75) {
    fromIndex = 2;
    toIndex = 3;
    amount = (dayPhase - 0.5) / 0.25;
  } else {
    fromIndex = 3;
    toIndex = 0;
    amount = (dayPhase - 0.75) / 0.25;
  }

  // Easing (Week 10): slow at the start and the end, quicker in the middle.
  // Doing it twice makes each colour linger even longer, so the afternoon sky stays blue
  // for a while and the change to sunset is quick, like in real life.
  amount = amount * amount * (3 - 2 * amount);
  amount = amount * amount * (3 - 2 * amount);

  // blend every colour in the list; the name picks the colour out of the palette
  // with bracket notation (Week 3)
  for (let i = 0; i < COLOUR_NAMES.length; i++) {
    let name = COLOUR_NAMES[i];
    lightColours[name] = mixColour(PALETTES[fromIndex][name], PALETTES[toIndex][name], amount);
  }
  nightAmount = lerp(PALETTES[fromIndex].night, PALETTES[toIndex].night, amount);
}

// Where in the day each key (1 - 4) jumps to. Sunset and sunrise are placed just before the
// colours peak, so you can SEE the sun sinking behind the roof or rising beside the palms.
const JUMP_PHASES = [0, 0.225, 0.5, 0.775];

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

// ---------------------------------------------------------------- sun, moon and stars

// The sun rises on the RIGHT, just above the deck beside the tall palms, climbs high, and sets
// on the LEFT behind the roof of the house. t says how far along its trip it is:
// 0 = rising, 0.5 = highest, 1 = setting.
function bodyX(t) {
  return lerp(picX(0.90), picX(0.22), t);
}

function bodyY(t) {
  // the line from the deck to the roof, minus a hump in the middle (sin) = an arc over the sky
  return lerp(picY(0.454), picY(0.23), t) - PIC_H * 0.27 * sin(PI * t);
}

// Everything in the sky. artwork-base.js calls this right after the sky is painted,
// so the house, deck and palms are drawn on top and the sun can sink behind them.
function drawSkyObjects() {
  noStroke();

  // Stars: positions come from the % operator, which scatters them without random().
  // They only come out when it is properly dark (nightAmount above 0.5) and twinkle with a sine wave.
  let starAmount = (nightAmount - 0.5) * 2;
  if (starAmount < 0) {
    starAmount = 0;
  }
  for (let i = 0; i < 60; i++) {
    let starX = picX((i * 73 % 100) / 100);
    let starY = picY((i * 41 % 45) / 100);
    let twinkle = 0.6 + 0.4 * sin(millis() * 0.003 + i);
    fill(255, 255, 240, starAmount * 255 * twinkle);
    ellipse(starX, starY, 2 + i % 3, 2 + i % 3);
  }

  // The sun is up for a quarter of the day before and a quarter after midday (dayPhase 0.75 -> 0.25).
  // sunT turns dayPhase into the 0 - 1 trip described above. Above 1 the sun is below the horizon.
  let sunT = ((dayPhase + 0.25) % 1) / 0.5;
  if (sunT <= 1) {
    drawSun(sunT);
  }

  // The moon makes the same trip half a day later.
  let moonT = ((dayPhase + 0.75) % 1) / 0.5;
  if (moonT <= 1) {
    drawMoon(moonT);
  }
}

// A real sun is not a flat dot. Near the horizon it looks bigger, orange and red, and it lights
// the sky around it. "low" is 1 on the horizon and 0 when the sun is high in the sky.
function drawSun(t) {
  let x = bodyX(t);
  let y = bodyY(t);

  let low = 1 - sin(PI * t) / 0.5;
  if (low < 0) {
    low = 0;
  }

  let colour = mixColour([255, 246, 214], [255, 118, 52], low);   // pale yellow -> deep orange
  let size = 30 + 28 * low;                                        // bigger near the horizon

  // the glow: eighteen very faint see-through discs on top of each other, from big to small.
  // Many faint discs blend into a soft glow; a few strong ones would show hard rings.
  for (let i = 18; i >= 1; i--) {
    let glowSize = size + i * size * (0.12 + 0.55 * low);
    fill(colour[0], colour[1], colour[2], 1.2 + 5.5 * low);
    ellipse(x, y, glowSize, glowSize);
  }

  fill(colour[0], colour[1], colour[2]);
  ellipse(x, y, size, size);
}

function drawMoon(t) {
  let x = bodyX(t);
  let y = bodyY(t);

  let low = 1 - sin(PI * t) / 0.5;
  if (low < 0) {
    low = 0;
  }

  let colour = mixColour([238, 238, 226], [255, 220, 170], low);   // white -> warm near the horizon
  let size = 30 + 8 * low;

  for (let i = 10; i >= 1; i--) {
    fill(colour[0], colour[1], colour[2], 3);
    ellipse(x, y, size + i * 7, size + i * 7);
  }
  fill(colour[0], colour[1], colour[2]);
  ellipse(x, y, size, size);
}

// ---------------------------------------------------------------- splashes (placeholder)

// x = 0 - 1 across the picture, power = 1 normal (optional), y = 0 - 1 down the picture (optional).
function triggerSplash(x, power, y) {
  power = power ?? 1;
  y = y ?? SPLASH_BASE_Y;
  console.log('triggerSplash', x.toFixed(2), power, y.toFixed(2));

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

function drawRipples() {}
