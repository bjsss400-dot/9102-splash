// input-controls.js
// MECHANIC: User input  (mouse and keyboard)
//
// Idea: the viewer touches the scene in three ways.
//   click on the pool        -> a splash at that spot
//   drag the mouse left / right -> a gust of wind in that direction
//   move the mouse over the water -> faint ripples follow the pointer
// plus keyboard shortcuts that are handy when presenting:
//   1 2 3 4 -> jump to day, sunset, night, sunrise        M -> music on / off
//
// This member also owns index.html, style.css and artwork-base.js (the flat scene).
//
// AI acknowledgement: the mouse-following ripples were written with the help of Claude (Anthropic).
// A fixed pool of rings grows and fades; the comments below explain the motion and drawing.
//
// Uses: mouseMoved, frameCount, sin, cos, noise, mousePressed, mouseDragged, keyPressed, key, mouseX, mouseY, width, height,
//       if / else if, &&, !==, switch, arrays of objects, for loops, % operator, lerp.
//
// Other files use:
//   wind.gust                 (perlin-random-mechanic.js adds it to the wind)
//   drawWindStreaks(), drawTouchRipples()   (artwork-base.js)
// This file calls:
//   triggerSplash(), jumpToTimeOfDay()   (time-mechanic.js)
//   startAudio(), toggleAudio()          (audio-mechanic.js)

let lastMouseX = 0;     // where the mouse was on the previous event, to measure how far it moved
let windStreaks = [];   // faint lines in the sky that show which way the wind blows

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

function mousePressed() {
  startAudio();           // audio-mechanic.js: browsers only allow sound after a click
  lastMouseX = mouseX;    // the drag starts here

  // Was the click on the water? (&& means every part must be true.)
  if (mouseY > picY(WATER_TOP) && mouseY < picY(1) && mouseX > picX(0) && mouseX < picX(1)) {
    let splashX = (mouseX - BORDER) / PIC_W;
    let splashY = (mouseY - BORDER) / PIC_H;
    triggerSplash(splashX, 1, splashY);   // time-mechanic.js
  }
}

// While the mouse is dragged, how far it moved sideways since the last event
// becomes a push of wind: dragging right blows right, dragging left blows left.
function mouseDragged() {
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

