// TIME MECHANIC: an 80-second day, moving sky objects, and timed splash events.
// Developed with assistance from OpenAI Codex (ChatGPT): palette interpolation,
// sun/moon motion, star twinkling, splash timing, ripples, and these comments.
// millis() counts milliseconds since the sketch started, so timing does not depend on frame rate.
// Extra timing reference: https://p5js.org/reference/p5/millis/

const DAY_LENGTH = 80000; // milliseconds per complete day/night cycle
const START_PHASE = 0.02;
const JUMP_PHASES = [0, 0.225, 0.5, 0.775]; // Press keys 1, 2, 3, 4 to switch to day, sunset, night, sunrise

// To determine each time period's color pattern
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

// phase is the fraction of one day: 0 = start, 0.5 = halfway, 1 = next day
// Using the same palette twice keeps those colors still for a short time
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

// Control each ripple and splash's time and duration
const TIME_SPLASH_DURATION = { rising: 480, peak: 180, falling: 620, fading: 600 };
const TIME_RIPPLE_DURATION = 2200;
const TIME_MAX_RIPPLES = 36; // Limit how many ripples can stay on screen

// List the color names so a normal loop can update them
const TIME_COLOUR_NAMES = [
  'skyTop', 'skyMid', 'skyLow', 'roof', 'roofEdge', 'wall', 'wallSide',
  'frame', 'glassDark', 'glassLight', 'hedge', 'trunk', 'leafDark', 'leafLight',
  'deck', 'shadow', 'coping', 'poolEdge', 'waterTop', 'waterBottom', 'squiggle',
  'boardTop', 'boardSide', 'foam'
];

// setupTimeMechanic fills the current colors before the first frame is drawn
let lightColours = {};
let nightAmount = 0; // 0 = daylight, 1 = full night; also used by window reflections
let dayPhase = START_PHASE;
let timeShift = 0;
let splashes = [];
let timeRipples = [];
let timeStars = [];
let timeSplashSeed = 0;

// Set things to default when the sketch starts
function setupTimeMechanic() {
  timeShift = millis() - START_PHASE * DAY_LENGTH;
  splashes = [];
  timeRipples = [];
  timeStars = [];
  timeSplashSeed = 0;

  for (let i = 0; i < 6; i++) {
    splashes.push({
      active: false, x: 0.6, y: SPLASH_BASE_Y, power: 1, seed: 1,
      phase: 'rising', phaseStart: 0, startedAt: 0,
      height: 0, alpha: 0, returnRippleCreated: false
    });
  }

  // % gives the remainder; these numbers spread stars without using random()
  // This keeps the stars fixed and leaves the Perlin member's random seed alone
  for (let i = 0; i < 55; i++) {
    timeStars.push({
      x: 0.025 + ((i * 37) % 101) / 101 * 0.95,
      y: 0.02 + ((i * 23) % 97) / 97 * (HORIZON - 0.04),
      size: 1 + (i % 3) * 0.55,
      speed: 0.65 + (i % 5) * 0.17,
      offset: i * 1.7 // Start each star at a different point in its sparkle
    });
  }
  updateTimeMechanic();
}

// Update the time, splashes and ripples in every frame
function updateTimeMechanic() {
  let now = millis();
  // % removes complete days; dividing by DAY_LENGTH gives progress from 0 to 1
  let timeInDay = (now - timeShift) % DAY_LENGTH;
  if (timeInDay < 0) {
    timeInDay = timeInDay + DAY_LENGTH;
  }
  dayPhase = timeInDay / DAY_LENGTH;
  updateTimeLighting();
  // Update each splash that is still active
  for (let splash of splashes) {
    if (splash.active) {
      updateTimedSplash(splash, now);
    }
  }
  // Keep only the ripples that have not finished
  let remainingRipples = [];
  for (let ripple of timeRipples) {
    if (now - ripple.startedAt < TIME_RIPPLE_DURATION) {
      remainingRipples.push(ripple);
    }
  }
  timeRipples = remainingRipples;
}

// To make the change start slowly, become faster, then slow down at the end
function easeTimeBlend(amount) {
  amount = constrain(amount, 0, 1);
  // cos goes from 1 to -1; (1 - cos) / 2 changes that range to 0 to 1
  return (1 - cos(amount * PI)) / 2;
}

// Change the colors of the scene according to the current time
function updateTimeLighting() {
  for (let i = 0; i < TIME_LIGHT_STOPS.length - 1; i++) {
    let from = TIME_LIGHT_STOPS[i];
    let to = TIME_LIGHT_STOPS[i + 1];
    // Find which two color settings the current time is between
    if (dayPhase >= from.phase && dayPhase < to.phase) {
      // Progress is 0 at 'from', 1 at 'to', and 0.5 halfway between them
      let progress = (dayPhase - from.phase) / (to.phase - from.phase);
      let amount = easeTimeBlend(progress);
      let fromColours = TIME_PALETTES[from.palette];
      let toColours = TIME_PALETTES[to.palette];
      // [name] uses a color name from the list, such as 'skyTop'
      for (let name of TIME_COLOUR_NAMES) {
        lightColours[name] = mixColour(fromColours[name], toColours[name], amount);
      }
      // Change the night level together with the colors
      nightAmount = lerp(from.night, to.night, amount);
      break;
    }
  }
}

// Mix the red, green and blue values of two colors using the same amount
function mixColour(colourA, colourB, amount) {
  let red = lerp(colourA[0], colourB[0], amount);
  let green = lerp(colourA[1], colourB[1], amount);
  let blue = lerp(colourA[2], colourB[2], amount);
  return [red, green, blue];
}

// Switch to the time selected by the keyboard controls
function jumpToTimeOfDay(index) {
  // Only accept the four time choices, numbered from 0 to 3
  if (index !== 0 && index !== 1 && index !== 2 && index !== 3) {
    return;
  }
  timeShift = millis() - JUMP_PHASES[index] * DAY_LENGTH;
  dayPhase = JUMP_PHASES[index];
  // Update the colors immediately without changing the splash timers
  updateTimeLighting();
}

// To show the current time period's name at the top of the picture
function getTimeOfDayName() {
  if (dayPhase < 0.125 || dayPhase >= 0.875) {
    return 'day';
  } else if (dayPhase < 0.375) {
    return 'sunset';
  } else if (dayPhase < 0.625) {
    return 'night';
  } else {
    return 'sunrise';
  }
}

// Draw the sky objects before the house so the house can cover them
function drawSkyObjects() {
  push();
  noStroke();
  let seconds = millis() / 1000;
  // Make stars appear gradually as the scene gets darker
  let starVisibility = easeTimeBlend((nightAmount - 0.15) / 0.85);
  if (starVisibility > 0) {
    for (let star of timeStars) {
      // sin goes back and forth from -1 to 1, so brightness changes from 0.44 to 1
      let twinkle = 0.72 + 0.28 * sin(seconds * star.speed + star.offset);
      fill(239, 244, 255, 220 * starVisibility * twinkle);
      ellipse(picX(star.x), picY(star.y), star.size, star.size);
    }
  }

  // Shift their starting times; * 2 makes each journey last half a day
  // Only draw progress from 0 to 1; values above 1 mean it is below the horizon
  let sunProgress = ((dayPhase + 0.25) % 1) * 2;
  let moonProgress = ((dayPhase + 0.75) % 1) * 2;
  if (sunProgress <= 1) {
    drawTimeOrb(sunProgress, false);
  }
  if (moonProgress <= 1) {
    drawTimeOrb(moonProgress, true);
  }
  pop();
}

// Use the same movement for the sun and moon, but different sizes and colors
function drawTimeOrb(progress, isMoon) {
  // sin rises from 0 to 1, then falls to 0 as progress moves from 0 to 1
  let elevation = sin(progress * PI);
  let nearHorizon = 1 - elevation;
  // Move from the right side of the picture to the left side
  let x = picX(lerp(0.92, 0.08, progress));
  // Make a curved path and keep the sun visible before it goes behind the roof
  // Extra technique: Math.pow raises a number to a power; 0.75 keeps the existing flatter arc
  // Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/pow
  let arch = Math.pow(elevation, 0.75);
  let baseHeight = lerp(HORIZON + 0.02, 0.28, progress);
  let y = picY(baseHeight - 0.30 * arch); // Smaller y means higher on the screen

  // Start with the sun's settings, then change them if this is the moon
  let size = 0.037;
  let highColour = [255, 249, 204];
  let lowColour = [255, 159, 77];
  let glowAlpha = 7;
  if (isMoon) {
    size = 0.033;
    highColour = [242, 246, 220];
    lowColour = [255, 228, 184];
    glowAlpha = 5;
  }
  // Make the sun and moon bigger and warmer in color near the horizon
  let diameter = PIC_W * size * (1 + 0.65 * nearHorizon);
  let colour = mixColour(highColour, lowColour, nearHorizon);
  // Fade during the first and last 3.5% of the path
  let fadeIn = easeTimeBlend(progress / 0.035);
  let fadeOut = easeTimeBlend((1 - progress) / 0.035);
  let visibility = fadeIn * fadeOut;

  // Draw several transparent circles to create a soft glow
  for (let layer = 6; layer >= 1; layer--) {
    let glowSize = diameter * (1 + layer * 0.24);
    fill(colour[0], colour[1], colour[2], visibility * glowAlpha);
    ellipse(x, y, glowSize, glowSize);
  }
  // Draw the main circle of the sun or moon over the glow
  fill(colour[0], colour[1], colour[2], 255 * visibility);
  ellipse(x, y, diameter, diameter);
}

// Start a splash when the input or audio code calls this function
function triggerSplash(x, power, y) {
  // x and y use 0 to 1 across the picture; use defaults for missing arguments
  if (power == undefined) {
    power = 1;
  }
  if (y == undefined) {
    y = SPLASH_BASE_Y;
  }
  // Number.isFinite rejects NaN, Infinity and non-numbers before drawing
  // Extra reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite
  if (!Number.isFinite(x) || !Number.isFinite(power) || !Number.isFinite(y) || splashes.length == 0) {
    return;
  }

  // Use the first free splash; if all are active, keep the oldest one found
  let splash = splashes[0];
  for (let item of splashes) {
    if (item.active == false) {
      splash = item;
      break;
    }
    if (item.startedAt < splash.startedAt) {
      splash = item;
    }
  }

  let now = millis();
  splash.active = true;
  // Keep the splash's center inside the pool and limit its strength
  splash.x = constrain(x, 0.02, 0.98);
  splash.y = constrain(y, 0.68, 0.95);
  splash.power = constrain(power, 0.2, 2);
  // Give each new splash a different seed for the Perlin member's drawing code
  timeSplashSeed = timeSplashSeed + 1;
  splash.seed = timeSplashSeed;
  // Reset the splash's time, height and visibility for a new animation
  splash.startedAt = now;
  splash.phaseStart = now;
  splash.phase = 'rising';
  splash.height = 0;
  splash.alpha = 1;
  splash.returnRippleCreated = false;
  addTimeRipple(splash, now, 0.8); // Create the first ripple when the splash starts
}

// Determine which stage the splash is in by checking how long it has lasted
function updateTimedSplash(splash, now) {
  let age = now - splash.startedAt;
  // Calculate when each stage should finish
  let riseEnd = TIME_SPLASH_DURATION.rising;
  let peakEnd = riseEnd + TIME_SPLASH_DURATION.peak;
  let fallEnd = peakEnd + TIME_SPLASH_DURATION.falling;

  // Create the second ripple only once when the splash falls back
  // Use its planned start time to keep it on time even if a frame is missed
  if (age >= fallEnd && !splash.returnRippleCreated) {
    addTimeRipple(splash, splash.startedAt + fallEnd, 1);
    splash.returnRippleCreated = true;
  }
  splash.alpha = 1; // Stay fully visible until the fading stage
  if (age < riseEnd) {
    // Make the splash rise quickly, then slow down near the top
    splash.phase = 'rising';
    splash.phaseStart = splash.startedAt;
    let progress = constrain(age / riseEnd, 0, 1);
    let remaining = 1 - progress;
    // At halfway, height is 1 - 0.5 * 0.5 = 0.75, so most of the rise happens early
    splash.height = 1 - remaining * remaining;
  } else if (age < peakEnd) {
    // Keep the splash at its highest point for a short time
    splash.phase = 'peak';
    splash.phaseStart = splash.startedAt + riseEnd;
    splash.height = 1;
  } else if (age < fallEnd) {
   // Make the splash fall slowly at first, then become faster
    splash.phase = 'falling';
    splash.phaseStart = splash.startedAt + peakEnd;
    let progress = (age - peakEnd) / TIME_SPLASH_DURATION.falling;
    // At halfway, progress * progress is only 0.25, so the fall starts slowly
    splash.height = lerp(1, 0.16, progress * progress);
  } else {
    // Make the remaining splash shorter and more transparent until it disappears
    splash.phase = 'fading';
    splash.phaseStart = splash.startedAt + fallEnd;
    let progress = (age - fallEnd) / TIME_SPLASH_DURATION.fading;
    // easeTimeBlend stops at 1, so height and alpha stay at 0 after the fade
    let fadeAmount = easeTimeBlend(progress);
    splash.height = lerp(0.16, 0, fadeAmount);
    splash.alpha = 1 - fadeAmount;
    if (progress >= 1) {
      splash.active = false; // This splash is ready to be used again
    }
  }
}

// Store a new ripple at the same position as the splash
function addTimeRipple(splash, startedAt, strength) {
  timeRipples.push({
    x: splash.x, y: splash.y, power: splash.power, startedAt: startedAt, strength: strength
  });
  // If there are too many, keep only the newest ripples
  if (timeRipples.length > TIME_MAX_RIPPLES) {
    let remainingRipples = [];
    let firstToKeep = timeRipples.length - TIME_MAX_RIPPLES;
    for (let i = firstToKeep; i < timeRipples.length; i++) {
      remainingRipples.push(timeRipples[i]);
    }
    timeRipples = remainingRipples;
  }
}

// Draw ripples that spread across the water and slowly disappear
function drawRipples() {
  push();
  noFill();
  let now = millis();
  let colour = lightColours.squiggle;
  for (let ripple of timeRipples) {
    let progress = constrain((now - ripple.startedAt) / TIME_RIPPLE_DURATION, 0, 1);
    // Make ripples near the bottom of the picture slightly bigger
    let depthScale = lerp(0.8, 1.15, (ripple.y - 0.68) / 0.27);
    // Let the ripple spread quickly at first, then slow down
    let remaining = 1 - progress;
    let expansion = 1 - remaining * remaining;
    let radius = lerp(6, 80 + ripple.power * 28, expansion) * depthScale;
    // min chooses the smaller value, keeping the ripple inside the pool
    let roomAbove = picY(ripple.y) - picY(WATER_TOP) - 2;
    let roomBelow = picY(1) - picY(ripple.y) - 2;
    // The visible height is flattened by PERSPECTIVE, so divide to find the radius limit
    let radiusLimit = min(roomAbove, roomBelow) / PERSPECTIVE;
    radius = min(radius, radiusLimit);
    // Make the ripple more transparent as time passes
    let alpha = 155 * ripple.strength * remaining * remaining;
    stroke(colour[0], colour[1], colour[2], alpha);
    strokeWeight(1.4 * depthScale);
    // Draw a flat ellipse to make the ripple look like it is lying on the water
    ellipse(picX(ripple.x), picY(ripple.y), radius * 2, radius * 2 * PERSPECTIVE);
  }
  pop();
}