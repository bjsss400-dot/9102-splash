// input-controls.js
// MECHANIC: User input  (mouse and keyboard)
//
// Idea: the viewer touches the scene in four ways.
//   click on the pool            -> a splash at that spot
//   drag the mouse left / right  -> a gust of wind in that direction
//   hold the board / SPACE, then release -> THE UNSEEN DIVER: charge, jump and splash
//   move the mouse over the water -> TOUCHING THE WATER: faint ripples follow the pointer
// plus keyboard shortcuts that are handy when presenting:
//   1 2 3 4 -> jump to day, sunset, night, sunrise        M -> music on / off
//
// The painting shows a splash but no diver. In our piece the viewer is the diver nobody sees:
// A short hold makes a small splash near the board; a longer hold makes a larger splash farther away.
// This iteration measures elapsed milliseconds, so holding for the same time gives the same result
// at different frame rates. The release event samples the charge once more, including very quick taps.
//
// This member also owns index.html, style.css and artwork-base.js (the flat scene).
//
// AI acknowledgement: the dive (hold SPACE) and the ripples that follow the mouse were written with the help of
// Claude (Anthropic). The dive is a small set of states (ready, charging, flying);
// the board is a spring (it is pulled back to flat and keeps a little speed, so it wobbles);
// the ripples are a fixed list of rings that grow and fade. Each part is explained in the comments below.
// This duration-and-distance iteration was developed with OpenAI Codex: elapsed-time charge,
// release-time sampling, direct board pressing, and the landing preview.
//
// Uses: mousePressed, mouseReleased, mouseDragged, mouseMoved, keyPressed, keyReleased, key, mouseX, mouseY,
//       millis, frameCount, if / else if, &&, !==, switch, arrays, for loops, %, constrain, lerp, sin, cos, noise.
//
// Other files use:
//   wind.gust                 (perlin-random-mechanic.js adds it to the wind)
//   board.bend                (artwork-base.js bends the diving board with it)
//   drawWindStreaks(), drawTouchRipples(), drawDiveArc()   (artwork-base.js)
// This file calls:
//   triggerSplash(), jumpToTimeOfDay()   (time-mechanic.js)
//   startAudio(), toggleAudio()          (audio-mechanic.js)

let lastMouseX = 0;     // where the mouse was on the previous event, to measure how far it moved
let windStreaks = [];   // faint lines in the sky that show which way the wind blows

// ---- the unseen diver (hold the board or SPACE) ----
const CHARGE_DURATION_MS = 2500; // 2.5 seconds reaches full charge; longer holds stay at this maximum
const FLIGHT_FRAMES = 22;   // how long the diver is in the air before the splash
const TIP_X = 0.59;         // where the end of the diving board is (fractions of the picture)
const TIP_Y = 0.80;
const BOARD_DROP = 0.10;    // how far the end of the board goes down when it is fully bent (fraction of the picture height)
const NEAR_SPLASH_X = 0.54;
const FAR_SPLASH_X = 0.18;
const DIVE_SPLASH_Y = 0.84; // same water depth: perspective must not make a distant splash look smaller
const MIN_DIVE_POWER = 0.35;
const MAX_DIVE_POWER = 1.8;

let diver = {
  state: 'ready',           // 'ready' -> 'charging' -> 'flying' -> 'ready'
  chargeStart: 0,           // millis() when this hold began
  chargeSource: null,       // 'keyboard' or 'mouse': only that control can release this dive
  charge: 0,                // 0 - 1: how long SPACE has been held
  flyStart: 0,              // the frame when SPACE was let go
  landX: NEAR_SPLASH_X,
  landY: DIVE_SPLASH_Y,
  power: MIN_DIVE_POWER
};

// The diving board: bend = 0 is flat, 1 is bent right down. velocity is how fast the bend is changing.
let board = { bend: 0, velocity: 0 };

// ---- touching the water (move the mouse over the pool) ----
const MAX_TOUCH_RIPPLES = 12;
const TOUCH_RIPPLE_FRAMES = 80;   // how long one touch lives
const RIPPLE_PIECES = 36;         // a ring is drawn as 36 short pieces, so it does not have to be a perfect circle
let touchRipples = [];            // a fixed list of rings that we reuse
let lastTouchX = 0;
let lastTouchY = 0;
let touchTravel = 0;              // how far the mouse has moved since the last ring (squared, so never negative)
let lastRippleFrame = 0;

function setupInputControls() {
  // Eight streaks. Their positions come from the % operator, not from random():
  // the random numbers belong to the Perlin / random mechanic.
  for (let i = 0; i < 8; i++) {
    windStreaks.push({
      x: picX((i * 37 % 100) / 100),
      y: picY(0.05 + (i * 17 % 40) / 100),
      length: 30 + i * 13 % 40
    });
  }

  for (let i = 0; i < MAX_TOUCH_RIPPLES; i++) {
    touchRipples.push({ active: false, x: 0, y: 0, radius: 0, maxRadius: 0, born: 0, seed: 0 });
  }
}

// Runs every frame (see sketch.js).
function updateInputControls() {
  // Easing (Week 10): the gust loses 3% of its strength every frame, so it fades away smoothly.
  wind.gust = lerp(wind.gust, 0, 0.03);

  updateDiver();
  updateBoard();
  updateTouchRipples();

  // move the streaks along with the wind, and wrap them round when they leave the picture
  for (let i = 0; i < windStreaks.length; i++) {
    windStreaks[i].x = windStreaks[i].x + wind.value * 5;

    if (windStreaks[i].x > picX(1) + windStreaks[i].length) {
      windStreaks[i].x = picX(0) - windStreaks[i].length;
    } else if (windStreaks[i].x < picX(0) - windStreaks[i].length) {
      windStreaks[i].x = picX(1) + windStreaks[i].length;
    }
  }
}

// ---------------------------------------------------------------- mouse

function mousePressed(event) {
  startAudio();           // audio-mechanic.js: browsers only allow sound after a click
  lastMouseX = mouseX;    // the drag starts here

  // The board lies over the pool, so test it before the water. Pressing it must
  // charge one dive rather than also creating a splash under the board.
  if (isOverDivingBoard(mouseX, mouseY) && (!event || event.button === 0)) {
    beginDiveCharge('mouse');
    return false;
  }

  // Was the click on the water? (&& means every part must be true.)
  if (mouseY > picY(WATER_TOP) && mouseY < picY(1) && mouseX > picX(0) && mouseX < picX(1)) {
    let splashX = (mouseX - BORDER) / PIC_W;
    let splashY = (mouseY - BORDER) / PIC_H;
    triggerSplash(splashX, 1, splashY);   // time-mechanic.js
  }
}

function mouseReleased() {
  if (diver.state === 'charging' && diver.chargeSource === 'mouse') {
    releaseDiveCharge('mouse');
    return false;
  }
}

// Test the bent board's top outline, using the same 14 slices as artwork-base.js.
// A horizontal ray crosses an odd number of edges when the point is inside.
function isOverDivingBoard(x, y) {
  if (x < picX(0) || x > picX(1) || y < picY(0) || y > picY(1)) return false;
  let outline = [];
  const slices = 14;
  for (let i = 0; i <= slices; i++) {
    let t = i / slices;
    let down = board.bend * BOARD_DROP * (1 - t) * (1 - t);
    outline.push({ x: picX(lerp(0.575, 0.828, t)), y: picY(lerp(0.798, 1.01, t) + down) });
  }
  for (let i = slices; i >= 0; i--) {
    let t = i / slices;
    let down = board.bend * BOARD_DROP * (1 - t) * (1 - t);
    outline.push({ x: picX(lerp(0.795, 1.245, t)), y: picY(lerp(0.797, 1.01, t) + down) });
  }
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    let a = outline[i];
    let b = outline[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

// While the mouse is dragged, how far it moved sideways since the last event
// becomes a push of wind: dragging right blows right, dragging left blows left.
function mouseDragged() {
  // Moving the pointer during a board hold does not turn that hold into wind.
  if (diver.state === 'charging' && diver.chargeSource === 'mouse') return false;
  let movedSideways = mouseX - lastMouseX;
  wind.gust = wind.gust + movedSideways * 0.02;

  // keep the gust between -1.5 and 1.5 so it cannot go wild
  if (wind.gust > 1.5) {
    wind.gust = 1.5;
  }
  if (wind.gust < -1.5) {
    wind.gust = -1.5;
  }

  lastMouseX = mouseX;
}

// ---------------------------------------------------------------- touching the water

// mouseMoved only happens while NO button is pressed (dragging is the wind). When the pointer moves over
// the water it leaves faint rings: a slow hand makes small rings, a fast hand makes bigger ones.
function mouseMoved() {
  let overWater = mouseY > picY(WATER_TOP) && mouseY < picY(1) && mouseX > picX(0) && mouseX < picX(1);

  if (overWater) {
    // dx * dx + dy * dy grows with the distance moved and is never negative
    let dx = mouseX - lastTouchX;
    let dy = mouseY - lastTouchY;
    touchTravel = touchTravel + dx * dx + dy * dy;

    // at most one ring every 4 frames, and only if the mouse has really moved
    if (frameCount - lastRippleFrame >= 4 && touchTravel > 60) {
      let size = 16 + touchTravel * 0.025;
      if (size > 46) {
        size = 46;
      }
      addTouchRipple(mouseX, mouseY, size);
      touchTravel = 0;
      lastRippleFrame = frameCount;
    }
  }

  lastTouchX = mouseX;
  lastTouchY = mouseY;
}

// Takes the first free ring in the list (like the splashes in time-mechanic.js).
function addTouchRipple(x, y, maxRadius) {
  for (let i = 0; i < touchRipples.length; i++) {
    if (touchRipples[i].active === false) {
      touchRipples[i].active = true;
      touchRipples[i].x = x;
      touchRipples[i].y = y;
      touchRipples[i].radius = 0;
      touchRipples[i].maxRadius = maxRadius;
      touchRipples[i].born = frameCount;
      touchRipples[i].seed = x * 0.013 + y * 0.007 + frameCount * 0.1;   // a different place on the noise for every touch
      break;
    }
  }
}

function updateTouchRipples() {
  for (let i = 0; i < touchRipples.length; i++) {
    if (touchRipples[i].active) {
      let life = (frameCount - touchRipples[i].born) / TOUCH_RIPPLE_FRAMES;   // 0 (new) to 1 (gone)
      if (life >= 1) {
        touchRipples[i].active = false;
      } else {
        // lerp fills the gap between 0 and maxRadius; the ease-out makes the ring slow down as it grows
        touchRipples[i].radius = lerp(0, touchRipples[i].maxRadius, 1 - (1 - life) * (1 - life));
        // the wind carries the ring a little way along the water
        touchRipples[i].x = touchRipples[i].x + wind.value * 0.25;
      }
    }
  }
}

// Each touch is two rings, the second a smaller copy of the first. A ring is NOT a perfect circle:
//   - it is made of 36 short pieces, and noise() nudges every piece in or out, so the outline wobbles
//   - noise() also decides how strong each piece is, so some pieces fade out completely: the ring breaks up,
//     like a line drawn by hand
//   - the pieces near the viewer (the bottom of the ring) are a little thicker than the far ones
//   - every piece is drawn twice: a wide faint line under a thin clear one, which makes a soft edge
// The ring fades in quickly, then fades away as it gets older.
function drawTouchRipples() {
  let colour = lightColours.squiggle;
  noFill();

  for (let i = 0; i < touchRipples.length; i++) {
    if (touchRipples[i].active) {
      let ripple = touchRipples[i];
      let life = (frameCount - ripple.born) / TOUCH_RIPPLE_FRAMES;

      // fade in during the first part of its life, then fade out
      let strength = 1 - life;
      if (life < 0.12) {
        strength = life / 0.12;
      }

      for (let ring = 0; ring < 2; ring++) {
        let r = ripple.radius * (1 - ring * 0.4);

        for (let piece = 0; piece < RIPPLE_PIECES; piece++) {
          let angle1 = TWO_PI * piece / RIPPLE_PIECES;
          let angle2 = TWO_PI * (piece + 1) / RIPPLE_PIECES;

          // noise on the circle (cos and sin make the end meet the start): the outline wobbles
          let wobble1 = 1 + (noise(ripple.seed + cos(angle1) * 0.7, ripple.seed + sin(angle1) * 0.7 + ring * 5) - 0.5) * 0.32;
          let wobble2 = 1 + (noise(ripple.seed + cos(angle2) * 0.7, ripple.seed + sin(angle2) * 0.7 + ring * 5) - 0.5) * 0.32;

          // noise decides how much of this piece you can see: low numbers = a gap in the ring
          let seen = noise(ripple.seed * 2 + piece * 0.16, ring * 10);
          let pieceStrength = 0;
          if (seen > 0.3) {
            pieceStrength = (seen - 0.3) / 0.4;
            if (pieceStrength > 1) {
              pieceStrength = 1;
            }
          }

          // sin(angle1) is near 1 at the bottom of the ring (close to us) and near -1 at the top (far away)
          let near = 0.5 + 0.5 * sin(angle1);

          let x1 = ripple.x + cos(angle1) * r * wobble1;
          let y1 = ripple.y + sin(angle1) * r * PERSPECTIVE * wobble1;
          let x2 = ripple.x + cos(angle2) * r * wobble2;
          let y2 = ripple.y + sin(angle2) * r * PERSPECTIVE * wobble2;

          // the wide, faint line first, then the thin, clear one on top
          stroke(colour[0], colour[1], colour[2], 70 * strength * pieceStrength);
          strokeWeight(3.4 + near * 1.6);
          line(x1, y1, x2, y2);
          stroke(colour[0], colour[1], colour[2], 210 * strength * pieceStrength);
          strokeWeight(0.9 + near * 1.1);
          line(x1, y1, x2, y2);
        }
      }
    }
  }
}

// ---------------------------------------------------------------- the unseen diver

function beginDiveCharge(source) {
  if (diver.state !== 'ready') return;
  diver.state = 'charging';
  diver.chargeSource = source;
  diver.chargeStart = millis();
  updateDiveCharge(); // reset the next landing immediately, even after a previous full-power dive
}

function updateDiveCharge() {
  diver.charge = constrain((millis() - diver.chargeStart) / CHARGE_DURATION_MS, 0, 1);
  diver.landX = lerp(NEAR_SPLASH_X, FAR_SPLASH_X, diver.charge);
  diver.landY = DIVE_SPLASH_Y;
  diver.power = lerp(MIN_DIVE_POWER, MAX_DIVE_POWER, diver.charge);
}

function releaseDiveCharge(source) {
  if (diver.state !== 'charging' || diver.chargeSource !== source) return;
  // The release can arrive between draw frames. Sample its exact elapsed time,
  // then keep the landing position and strength fixed throughout the flight.
  updateDiveCharge();
  diver.state = 'flying';
  diver.chargeSource = null;
  diver.flyStart = frameCount;
}

// Runs every frame. The diver is a little machine with three states (switch, Week 4).
function updateDiver() {
  switch (diver.state) {
    case 'charging':
      updateDiveCharge();
      break;

    case 'flying':
      // the diver is in the air for a few frames, then the splash appears
      if (frameCount - diver.flyStart >= FLIGHT_FRAMES) {
        triggerSplash(diver.landX, diver.power, diver.landY);   // time-mechanic.js
        diver.state = 'ready';
        diver.charge = 0;
      }
      break;
  }
}

// The board is a spring. While the board / SPACE is held it eases down towards the charge (lerp, Week 10).
// On release, the spring pulls the bend back to 0 (flat), but the speed it already has carries it
// past flat, so the board springs up and wobbles a little before it settles.
function updateBoard() {
  if (diver.state === 'charging') {
    board.bend = lerp(board.bend, diver.charge, 0.2);
    board.velocity = 0;
  } else {
    board.velocity = (board.velocity - board.bend * 0.2) * 0.82;
    board.bend = board.bend + board.velocity;
  }
}

// A faint arc of dots from the end of the board to where the splash will be. You never see the diver,
// only the path they take. While charging it gets clearer; after the jump it fades away.
function drawDiveArc() {
  if (diver.state !== 'ready') {
    let alpha = 70 + 120 * diver.charge;
    if (diver.state === 'flying') {
      alpha = alpha * (1 - (frameCount - diver.flyStart) / FLIGHT_FRAMES);
    }

    let arcHeight = 0.10 + 0.14 * diver.charge;   // how high the arc goes (fraction of the picture)
    noStroke();
    fill(255, 255, 255, alpha);
    for (let k = 0; k <= 14; k++) {
      let along = k / 14;
      let x = lerp(TIP_X, diver.landX, along);
      // a straight line from the board to the water, lifted by a sine hump in the middle = an arc
      let y = lerp(TIP_Y + board.bend * BOARD_DROP, diver.landY, along) - arcHeight * sin(PI * along);
      ellipse(picX(x), picY(y), 4, 4);
    }
    if (diver.state === 'charging') {
      // The landing ring moves away and grows while the viewer holds the board.
      push();
      noFill();
      stroke(255, 255, 255, alpha);
      strokeWeight(1.2);
      let diameter = lerp(16, 46, diver.charge);
      ellipse(picX(diver.landX), picY(diver.landY), diameter, diameter * PERSPECTIVE);
      pop();
    }
  }
}

// ---------------------------------------------------------------- keyboard

function keyPressed() {
  // any key starts the music for the first time, except M (M is the on / off switch)
  if (key !== 'm' && key !== 'M') {
    startAudio();
  }

  switch (key) {
    case '1':
      jumpToTimeOfDay(0);
      break;
    case '2':
      jumpToTimeOfDay(1);
      break;
    case '3':
      jumpToTimeOfDay(2);
      break;
    case '4':
      jumpToTimeOfDay(3);
      break;
    case 'm':
    case 'M':
      toggleAudio();
      break;
    case ' ':
      beginDiveCharge('keyboard');
      break;
  }

  return false;   // stops the browser from scrolling the page when SPACE is pressed
}

// Letting go of SPACE samples the final hold duration and launches one dive.
function keyReleased() {
  if (key === ' ') {
    releaseDiveCharge('keyboard');
  }
}

// ---------------------------------------------------------------- feedback

// Light lines in the sky. The stronger the wind, the clearer they are.
function drawWindStreaks() {
  let alpha = wind.value * wind.value * 200;   // wind.value * wind.value is never negative
  if (alpha > 140) {
    alpha = 140;
  }

  stroke(255, 255, 255, alpha);
  strokeWeight(2);
  for (let i = 0; i < windStreaks.length; i++) {
    line(windStreaks[i].x, windStreaks[i].y, windStreaks[i].x + windStreaks[i].length, windStreaks[i].y);
  }
}

