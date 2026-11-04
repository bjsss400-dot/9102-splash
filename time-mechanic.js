// TIME MECHANIC: 80-second days, timed splashes, solar shadows and reflections.
// AI ACKNOWLEDGEMENT — OpenAI ChatGPT (Codex)
// ChatGPT helped structure the original code, like generate the shadow/reflection
// layers and explain/test their integration, solar progress projects shadows, etc.
const DAY_LENGTH = 80000, START_PHASE = 0.02;
const JUMP_PHASES = [0, 0.225, 0.5, 0.775]; // keys 1–4: day, sunset, night, sunrise
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

// Lighting stops hold a palette briefly, then blend towards the next one.
const TIME_LIGHT_STOPS = [
  [0, 'day', 0], [0.10, 'day', 0], [0.225, 'sunset', 0], [0.25, 'sunset', 0],
  [0.40, 'night', 1], [0.60, 'night', 1], [0.75, 'sunrise', 0],
  [0.775, 'sunrise', 0], [0.90, 'day', 0], [1, 'day', 0]
];
const TIME_SPLASH_DURATION = { rising: 480, peak: 180, falling: 620, fading: 600 };
const TIME_RIPPLE_DURATION = 2200, TIME_MAX_RIPPLES = 36;
// `MDN Object.keys()`: lists the palette colour names so every part of the scene can change colour together.
// This technique is from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
const TIME_COLOUR_NAMES = Object.keys(TIME_PALETTES.day);
let lightColours = {}, nightAmount = 0, dayPhase = START_PHASE, timeShift = 0;
let splashes = [], timeRipples = [], timeStars = [], timeSplashSeed = 0;
let timeHooksInstalled = false;

// AI assistance: reuse six splash objects and place fixed stars with %.
// No random() or randomSeed() calls: Perlin's saved random sequence stays intact.
// Background on object pools (the six slots are reused for successive splashes):
function setupTimeMechanic() {
  timeShift = millis() - START_PHASE * DAY_LENGTH;
  splashes = [];
  timeRipples = [];
  timeStars = [];
  timeSplashSeed = 0;
  // `Object pooling`: reuses six splash records, choosing a free one first or the oldest active one when all six are in use.
  // This technique is documented at https://gameprogrammingpatterns.com/object-pool.html
  for (let i = 0; i < 6; i++) splashes.push({ active: false, startedAt: 0 });
  for (let i = 0; i < 55; i++) {
    timeStars.push({ x: 0.025 + (i * 37 % 101) / 101 * 0.95,
      y: 0.02 + (i * 23 % 97) / 97 * (HORIZON - 0.04),
      size: 1 + i % 3 * 0.55, speed: 0.65 + i % 5 * 0.17, offset: i * 1.7 });
  }
  installTimeDrawing();
  updateTimeMechanic();
}

// AI assistance: a millisecond clock keeps the 80-second day independent
// of frame rate. Backwards removal keeps every remaining array index valid.
function updateTimeMechanic() {
  // `p5.js millis()`: reads elapsed milliseconds for the 80-second day cycle and the separate splash and ripple timers.
  // This technique is from https://p5js.org/reference/p5/millis/
  let now = millis();
  // `JavaScript remainder (%)`: wraps the clock offset into the current 80-second cycle before converting it to a value from 0 up to 1.
  // This technique is documented at https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
  dayPhase = ((now - timeShift) % DAY_LENGTH + DAY_LENGTH) % DAY_LENGTH / DAY_LENGTH;
  updateTimeLighting();
  // `JavaScript for...of`: visits each splash record so active splashes can be updated using the current time.
  // This technique is documented at https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of
  for (let splash of splashes) if (splash.active) updateTimedSplash(splash, now);
  for (let i = timeRipples.length - 1; i >= 0; i--) {
    if (now - timeRipples[i].startedAt >= TIME_RIPPLE_DURATION) timeRipples.splice(i, 1);
  }
}

// AI assistance: cosine easing slows both ends; lerp mixes RGB channels.
function easeTimeBlend(amount) {
  // `Sine easing`: makes a lighting transition change slowly at the start and end and faster in the middle.
  // This technique is documented at https://easings.net/#easeInOutSine
  return (1 - cos(constrain(amount, 0, 1) * PI)) / 2;
}
function mixColour(a, b, amount) {
  return [lerp(a[0], b[0], amount), lerp(a[1], b[1], amount), lerp(a[2], b[2], amount)];
}
function updateTimeLighting() {
  for (let i = 0; i < TIME_LIGHT_STOPS.length - 1; i++) {
    let a = TIME_LIGHT_STOPS[i], b = TIME_LIGHT_STOPS[i + 1];
    if (dayPhase < a[0] || dayPhase >= b[0]) continue;
    let amount = easeTimeBlend((dayPhase - a[0]) / (b[0] - a[0]));
    for (let name of TIME_COLOUR_NAMES) {
      lightColours[name] = mixColour(TIME_PALETTES[a[1]][name], TIME_PALETTES[b[1]][name], amount);
    }
    nightAmount = lerp(a[2], b[2], amount);
    break;
  }
}

// AI assistance: jump only the day clock, never splash/ripple timers.
function jumpToTimeOfDay(index) {
  if (index !== 0 && index !== 1 && index !== 2 && index !== 3) return;
  timeShift = millis() - JUMP_PHASES[index] * DAY_LENGTH;
  dayPhase = JUMP_PHASES[index];
  updateTimeLighting();
}
function getTimeOfDayName() {
  if (dayPhase < 0.125 || dayPhase >= 0.875) return 'day';
  if (dayPhase < 0.375) return 'sunset';
  if (dayPhase < 0.625) return 'night';
  return 'sunrise';
}

// AI assistance: fixed stars twinkle with sine; two half-day arcs
// move the sun and moon right to left. Their low altitude gives warmer colours.
function drawSkyObjects() {
  push();
  noStroke();
  let visibility = easeTimeBlend((nightAmount - 0.15) / 0.85);
  for (let star of timeStars) {
    let twinkle = 0.72 + 0.28 * sin(millis() / 1000 * star.speed + star.offset);
    fill(239, 244, 255, 220 * visibility * twinkle);
    ellipse(picX(star.x), picY(star.y), star.size, star.size);
  }
  for (let i = 0; i < 2; i++) {
    let progress = ((dayPhase + 0.25 + i * 0.5) % 1) * 2;
    if (progress <= 1) drawTimeOrb(progress, i === 1);
  }
  pop();
}

function drawTimeOrb(progress, isMoon) {
  let elevation = sin(progress * PI), low = 1 - elevation;
  let x = picX(lerp(0.92, 0.08, progress));
  // `MDN Math.pow()`: raises the elevation to the power of 0.75 to shape the vertical path of the sun and moon.
  // This technique is from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/pow
  let y = picY(lerp(HORIZON + 0.02, 0.28, progress) - 0.30 * Math.pow(elevation, 0.75));
  // `JavaScript conditional operator (? :)`: chooses the size, colour and glow for the sun or moon.
  // This technique is documented at https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Conditional_operator
  let diameter = PIC_W * (isMoon ? 0.033 : 0.037) * (1 + 0.65 * low);
  let colour = mixColour(isMoon ? [242, 246, 220] : [255, 249, 204],
    isMoon ? [255, 228, 184] : [255, 159, 77], low);
  let visibility = easeTimeBlend(progress / 0.035) * easeTimeBlend((1 - progress) / 0.035);
  for (let layer = 6; layer >= 0; layer--) {
    fill(colour[0], colour[1], colour[2], visibility * (layer === 0 ? 255 : isMoon ? 5 : 7));
    ellipse(x, y, diameter * (1 + layer * 0.24), diameter * (1 + layer * 0.24));
  }
}

// AI assistance : free/oldest-object reuse preserves Input/Audio's API.
// isFinite rejects invalid drawing coordinates; defaults preserve old callers.
// `JavaScript default parameters`: gives a splash its default strength and water position when those arguments are omitted.
// This technique is from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters
function triggerSplash(x, power = 1, y = SPLASH_BASE_Y) {
  if (power == undefined) power = 1;
  if (y == undefined) y = SPLASH_BASE_Y;
  // `MDN Number.isFinite()`: checks that the splash coordinates and strength are finite before applying their limits.
  // This technique is from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite
  if (!Number.isFinite(x) || !Number.isFinite(power) || !Number.isFinite(y) || !splashes.length) return;
  let splash = splashes[0];
  for (let item of splashes) {
    if (!item.active) { splash = item; break; }
    if (item.startedAt < splash.startedAt) splash = item;
  }
  splash.active = true;
  splash.x = constrain(x, 0.02, 0.98);
  splash.y = constrain(y, 0.68, 0.95);
  splash.power = constrain(power, 0.2, 2);
  splash.seed = ++timeSplashSeed;
  splash.startedAt = splash.phaseStart = millis();
  splash.phase = 'rising';
  splash.height = 0;
  splash.alpha = 1;
  splash.returnRippleCreated = false;
  addTimeRipple(splash, splash.startedAt, 0.8);
}

// AI assistance: elapsed time selects four stages, even after a slow
// frame. The return ripple uses its scheduled time and is created exactly once.
function updateTimedSplash(splash, now) {
  let age = now - splash.startedAt, duration = TIME_SPLASH_DURATION;
  let rise = duration.rising, peak = rise + duration.peak, fall = peak + duration.falling;
  if (age >= fall && !splash.returnRippleCreated) {
    addTimeRipple(splash, splash.startedAt + fall, 1);
    splash.returnRippleCreated = true;
  }
  splash.alpha = 1;
  if (age < rise) {
    splash.phase = 'rising';
    splash.phaseStart = splash.startedAt;
    let remaining = 1 - constrain(age / rise, 0, 1);
    splash.height = 1 - remaining * remaining;
  } else if (age < peak) {
    splash.phase = 'peak';
    splash.phaseStart = splash.startedAt + rise;
    splash.height = 1;
  } else if (age < fall) {
    splash.phase = 'falling';
    splash.phaseStart = splash.startedAt + peak;
    let progress = (age - peak) / duration.falling;
    splash.height = lerp(1, 0.16, progress * progress);
  } else {
    splash.phase = 'fading';
    splash.phaseStart = splash.startedAt + fall;
    splash.alpha = 1 - easeTimeBlend((age - fall) / duration.fading);
    splash.height = 0.16 * splash.alpha;
    if (age >= fall + duration.fading) splash.active = false;
  }
}

// AI assistance: splice removes expired/oldest entries without copying
// a whole array.
function addTimeRipple(splash, startedAt, strength) {
  // `JavaScript property shorthand`: stores startedAt and strength on each ripple using their existing variable names.
  // This technique is documented at https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer
  timeRipples.push({ x: splash.x, y: splash.y, power: splash.power, startedAt, strength });
  // `MDN Array.splice()`: drops the oldest ripples above the limit of 36 and removes expired ripples in updateTimeMechanic().
  // This technique is from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
  if (timeRipples.length > TIME_MAX_RIPPLES) timeRipples.splice(0, timeRipples.length - TIME_MAX_RIPPLES);
}
// AI assistance: elapsed progress expands and fades flattened rings.
function drawRipples() {
  push();
  noFill();
  let colour = lightColours.squiggle;
  for (let ripple of timeRipples) {
    let remaining = 1 - constrain((millis() - ripple.startedAt) / TIME_RIPPLE_DURATION, 0, 1);
    let depth = lerp(0.8, 1.15, (ripple.y - 0.68) / 0.27);
    let radius = lerp(6, 80 + ripple.power * 28, 1 - remaining * remaining) * depth;
    let room = min(picY(ripple.y) - picY(WATER_TOP) - 2, picY(1) - picY(ripple.y) - 2);
    radius = min(radius, room / PERSPECTIVE);
    stroke(colour[0], colour[1], colour[2], 155 * ripple.strength * remaining * remaining);
    strokeWeight(1.4 * depth);
    ellipse(picX(ripple.x), picY(ripple.y), radius * 2, radius * 2 * PERSPECTIVE);
  }
  pop();
}

// AI assistance: install drawing hooks ONCE. A saved function is called before/after Time's layer (same pattern as
// Audio's updateBoard wrapper). Only the board renderer is replaced, to remove
// its old fixed shadow; its 24 slices, bend limits and faces are retained below.
function installTimeDrawing() {
  if (timeHooksInstalled) return;
  // `JavaScript functions as values`: saves the original deck and water drawing functions so shadows and reflections can be added in order.
  // This technique is from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions
  let deck = drawDeck, texture = drawWaterTexture;
  drawDeck = function () { deck(); drawTimeShadows(DECK_TOP, DECK_BOTTOM); };
  drawWaterTexture = function () {
    drawTimeReflections();
    drawTimeShadows(WATER_TOP, 1);
    drawTimeBoard(true); // Reflected board/shadow stay UNDER waves, leaves and splashes.
    texture();
  };
  drawDivingBoard = function () { drawTimeBoard(false); };
  timeHooksInstalled = true;
}

// AI assistance: use the SAME solar progress as drawSkyObjects.
// Low sun lengthens shadows; x points away from the sun. Below the horizon,
// strength is zero; the short fade avoids a pop at dawn/dusk.
function timeSunlight() {
  let progress = ((dayPhase + 0.25) % 1) * 2;
  let elevation = max(0, sin(progress * PI));
  return { x: -cos(progress * PI) * 0.9, y: 0.20 + 0.75 * (1 - elevation),
    strength: easeTimeBlend(elevation / 0.12) * (1 - nightAmount) };
}

// AI assistance: clip prevents drawing over the coping/border.
// The Perlin mechanic also uses this mask technique.
function timeSurfaceClip(top, bottom) {
  fill(255); // Input's touch rings leave noFill() active; a mask needs a filled path.
  noStroke();
  // `p5.js clip()`: keeps shadows inside the selected deck or water area and reflections inside the pool.
  // This technique is from https://p5js.org/reference/p5/clip/
  // `JavaScript arrow function`: passes a callback to clip() that draws the rectangle used as the mask.
  // This technique is documented at https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions
  clip(() => rect(picX(0), picY(top), PIC_W, PIC_H * (bottom - top)));
}

// AI assistance: draw black silhouettes directly with fill/stroke.
// Avoid Canvas brightness filters: filtering each small stroke can force costly
// intermediate rendering, especially while the long morning shadows are visible.
// applyMatrix maps a point to x + sun.x*(base-y), base + sun.y*(base-y).
// globalAlpha makes the silhouette translucent. push/pop
// restore ALL drawing settings. The chair's existing small ellipse is contact shade.
function drawTimeShadows(top, bottom) {
  let sun = timeSunlight();
  if (sun.strength === 0) return;
  push();
  timeSurfaceClip(top, bottom);
  fill(0);
  // `p5.js drawingContext`: accesses the underlying 2D canvas context so a whole shadow or reflection layer can share one opacity.
  // This technique is from https://p5js.org/reference/p5/drawingContext/
  // `Canvas 2D globalAlpha`: sets shadow opacity from the sunlight strength and dims reflected objects at night.
  // This technique is from https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalAlpha
  drawingContext.globalAlpha = 0.16 * sun.strength;
  let objects = [drawTimeHouseShadow, drawTimePalmShadow, drawTimeChairShadow], bases = [DECK_TOP, 0.456, 0.472];
  for (let i = 0; i < objects.length; i++) {
    push();
    let base = picY(bases[i]);
    // `p5.js applyMatrix()`: projects the house, palm and chair silhouettes away from the sun, with longer shadows when the sun is low.
    // This technique is from https://p5js.org/reference/p5/applyMatrix/
    applyMatrix(1, 0, -sun.x, -sun.y, sun.x * base, (1 + sun.y) * base);
    objects[i]();
    pop();
  }
  pop();
}

// AI assistance: solid roof/wall silhouettes avoid projecting window
// details as stripes. Simplified palm crowns use only ordinary lines;
// trunk pieces use Perlin's existing bow and palmWind without updating them.
function drawTimeHouseShadow() {
  noStroke();
  rect(picX(0), picY(0.224), PIC_W * 0.78, PIC_H * (DECK_TOP - 0.224));
  rect(picX(0.47), picY(0.217), PIC_W * 0.15, PIC_H * 0.007);
}
// AI assistance: match Artwork's chair back, seat and frame in black,
// so the shadow needs no colour filter. These are drawing coordinates only;
// the actual chair and its small contact shadow remain owned by Artwork.
function drawTimeChairShadow() {
  noStroke();
  rect(picX(0.202), picY(0.410), PIC_W * 0.050, PIC_H * 0.017);
  rect(picX(0.210), picY(0.437), PIC_W * 0.040, PIC_H * 0.009);
  stroke(0);
  strokeWeight(1.6);
  let bars = [[0.202, 0.410, 0.202, 0.447], [0.252, 0.410, 0.252, 0.447],
    [0.198, 0.440, 0.256, 0.440], [0.204, 0.472, 0.243, 0.438], [0.249, 0.470, 0.211, 0.438]];
  for (let bar of bars) line(picX(bar[0]), picY(bar[1]), picX(bar[2]), picY(bar[3]));
}
function drawTimePalmShadow() {
  for (let p = 0; p < PALMS.length; p++) {
    push();
    translate(picX(PALMS[p].x), picY(PALMS[p].baseY));
    stroke(0);
    strokeWeight(PALMS[p].trunkWidth);
    for (let i = 0; i < 14; i++) {
      rotate(PALMS[p].bow / 14 + palmWind[p] * 0.014);
      line(0, 0, 0, -PIC_H * PALMS[p].height / 14);
      translate(0, -PIC_H * PALMS[p].height / 14);
    }
    for (let i = 0; i < 10; i++) {
      let angle = -PI + (i + 0.5) * PI / 10 + palmWind[p] * 0.27;
      line(0, 0, cos(angle) * 27, sin(angle) * 18 + 9);
    }
    pop();
  }
}

// AI assistance:translate/scale mirror the existing objects
// vertically and compress their height. Their current palette supplies warm
// sunset and cool night reflections; lower opacity makes night reflections dim.
// Water texture is drawn afterwards so existing waves/leaves remain on top.
function drawTimeReflections() {
  push();
  timeSurfaceClip(WATER_TOP, 1);
  drawingContext.globalAlpha = lerp(0.26, 0.12, nightAmount);
  translate(sin(millis() / 950) * 1.2, picY(WATER_TOP) + 0.62 * picY(DECK_TOP));
  // `p5.js scale()`: flips the house, palms and chair vertically and compresses their reflections to 62% of their height.
  // This technique is documented at https://p5js.org/reference/p5/scale/
  scale(1, -0.62);
  drawPalms();
  // Blend small offsets to soften only the house, without a costly per-stroke blur.
  // The centre has more weight so the reflection stays soft rather than doubled.
  // Each offset redraw uses its row and column weights to set opacity. The 25 weights sum to 256 before normalisation.
  // `5 × 5 binomial weights`: softens the house reflection by drawing 25 shifted copies, giving the centre copy the most opacity.
  // This technique is documented at https://docs.opencv.org/4.8.0/d4/d86/group__imgproc__filter.html
  let weights = [1, 4, 6, 4, 1], opacity = drawingContext.globalAlpha;
  for (let y = 0; y < weights.length; y++) {
    for (let x = 0; x < weights.length; x++) {
      push();
      drawingContext.globalAlpha = opacity * weights[x] * weights[y] / 256;
      translate((x - 2) * 4, (y - 2) * 6);
      drawHouse();
      pop();
    }
  }
  drawChair();
  pop();
}

// AI assistance: reproduce Artwork's board geometry using one vertex
// loop per face instead of 24 separate quads. Only READ board.bend/BOARD_DROP:
// Input's spring and Audio's offset stay in control. Shadow direction follows
// the sun; its gap shrinks when the board bends towards the water.
function drawTimeBoard(waterOnly) {
  let edges = [], sun = timeSunlight();
  let drop = constrain(board.bend * BOARD_DROP, -0.06, 0.09);
  let gap = max(0.014, 0.040 - board.bend * 0.026);
  for (let i = 0; i <= 24; i++) {
    let t = i / 24, down = drop * (1 - t) * (1 - t);
    edges.push([lerp(0.575, 0.828, t), lerp(0.798, 1.01, t) + down,
      lerp(0.795, 1.245, t), lerp(0.797, 1.01, t) + down]);
  }
  push();
  noStroke();
  timeSurfaceClip(WATER_TOP, 1);
  if (waterOnly) {
    let reflected = mixColour(lightColours.boardTop, lightColours.waterTop, 0.65);
    fill(reflected[0], reflected[1], reflected[2], lerp(75, 32, nightAmount));
    timeBoardFace(edges, sin(millis() / 950) * 0.002, gap * 2.2, false);
    fill(15, 23, 45, 48 * sun.strength);
    timeBoardFace(edges, gap * sun.x * 2.5, gap * (0.7 + sun.y), false);
    pop();
    return;
  }
  fill(lightColours.boardSide);
  timeBoardFace(edges, 0, 0.014, true);
  fill(lightColours.boardTop);
  timeBoardFace(edges, 0, 0, false);
  fill(lightColours.boardSide);
  let tip = edges[0];
  quad(picX(tip[0]), picY(tip[1]), picX(tip[2]), picY(tip[3]),
    picX(tip[2]), picY(tip[3] + 0.014), picX(tip[0]), picY(tip[1] + 0.014));
  pop();
}

// Walk one edge forwards and the opposite edge backwards to close the strip.
function timeBoardFace(edges, dx, dy, side) {
  // `p5.js beginShape()`: starts the outline of one face of the bending diving board.
  // This technique is from https://p5js.org/reference/p5/beginShape/
  beginShape();
  // `p5.js vertex()`: traces the board along one edge and back along the opposite edge to form the face.
  // This technique is from https://p5js.org/reference/p5/vertex/
  for (let e of edges) vertex(picX(e[0] + dx), picY(e[1] + (side ? 0 : dy)));
  for (let i = edges.length - 1; i >= 0; i--) {
    let e = edges[i], column = side ? 0 : 2;
    vertex(picX(e[column] + dx), picY(e[column + 1] + dy));
  }
  // `p5.js endShape(CLOSE)`: joins the last point to the first to close the board face.
  // This technique is documented at https://p5js.org/reference/p5/endShape/
  endShape(CLOSE);
}
