// artwork-base.js
// THE STATIC SCENE – our reinterpretation of David Hockney's "A Bigger Splash" (1967),
// laid out like the original painting.
// (Owner: User input member. This file only draws the flat blocks; it never decides colours.)
//
// What we noticed in the original:
//  - an almost square picture on a beige canvas, with an unpainted border
//  - everything is flat colour with sharp edges: sky, a low house, a wide pink deck, a pool
//  - the house is a long glass wall on the left (with palms and buildings reflected in it,
//    and beige curtains at the sides) and a plain pink wall on the right
//  - a small director's chair outside the window, and a low green bush in front of the wall
//  - two very tall, very thin palms behind the house, with small crowns
//  - the diving board comes in from the bottom right and points at the splash
//
// The geometry stays still. What moves and changes is handed to the mechanics:
//   colours of every block  -> time-mechanic.js   (lightColours)
//   palms, water, splash    -> perlin-random-mechanic.js
//   sun, moon, stars        -> time-mechanic.js

// ---- layout. The canvas is 660 x 660; the painted picture is 600 x 600 inside a 30 px border ----
const BORDER = 30;
const PIC_W = 600;
const PIC_H = 600;

// Positions inside the picture are fractions from 0 to 1 (0 = left / top, 1 = right / bottom).
const DECK_TOP = 0.454;      // where the house and the bush stand on the deck
const DECK_BOTTOM = 0.557;   // where the deck ends and the pool edge begins
const WATER_TOP = 0.574;     // where the water starts
const HORIZON = DECK_TOP;    // (old name, kept so nobody's code breaks)
const SPLASH_BASE_Y = 0.86;  // default depth of a splash on the water
const PERSPECTIVE = 0.25;    // circles on the water are squashed into ellipses

// Turn a fraction (0 - 1) into a pixel position on the canvas.
function picX(fraction) {
  return BORDER + fraction * PIC_W;
}

function picY(fraction) {
  return BORDER + fraction * PIC_H;
}

// Order matters (Week 6): things drawn first end up behind things drawn later.
function drawScene() {
  drawSky();
  drawSkyObjects();     // time-mechanic.js: stars, sun and moon
  drawWindStreaks();    // input-controls.js: faint lines that show the wind
  drawPalms();          // perlin-random-mechanic.js (they stand BEHIND the house)
  drawHouse();
  drawBush();
  drawDeck();
  drawChair();
  drawPool();
  drawRipples();        // time-mechanic.js
  drawSplashes();       // perlin-random-mechanic.js
  drawDivingBoard();
  drawBorder();
}

// The sky is a soft gradient with three colours (top, middle, low), cut into 64 thin strips.
// At sunrise and sunset the low colour is a glowing orange; at night all three are dark blue.
function drawSky() {
  noStroke();
  const strips = 64;
  const skyHeight = PIC_H * DECK_TOP;

  for (let i = 0; i < strips; i++) {
    let along = i / (strips - 1);   // 0 at the top, 1 at the deck
    let colour;
    if (along < 0.5) {
      colour = mixColour(lightColours.skyTop, lightColours.skyMid, along * 2);
    } else {
      colour = mixColour(lightColours.skyMid, lightColours.skyLow, (along - 0.5) * 2);
    }
    fill(colour);
    rect(picX(0), picY(0) + i * skyHeight / strips, PIC_W, skyHeight / strips + 1);
  }
}

// ---------------------------------------------------------------- the house

function drawHouse() {
  noStroke();

  // the plain wall on the right
  fill(lightColours.wall);
  rect(picX(0.412), picY(0.248), PIC_W * 0.347, PIC_H * (DECK_TOP - 0.248));

  // the shadow under the roof on that wall
  fill(lightColours.roofEdge);
  rect(picX(0.412), picY(0.248), PIC_W * 0.347, PIC_H * 0.016);

  drawGlassWall();

  // the flat roof slab, with a thin darker edge under it and a low pale box on top
  fill(lightColours.roof);
  rect(picX(0), picY(0.224), PIC_W * 0.78, PIC_H * 0.024);
  fill(lightColours.roofEdge);
  rect(picX(0), picY(0.246), PIC_W * 0.78, PIC_H * 0.003);
  fill(mixColour(lightColours.roof, [255, 255, 255], 0.4));
  rect(picX(0.47), picY(0.217), PIC_W * 0.15, PIC_H * 0.007);
}

// The glass wall on the left. By day it is dark grey and mirrors the palms and the city;
// at night the lights are on and it glows yellow (the colour comes from lightColours).
function drawGlassWall() {
  noStroke();

  // the dark glass, and a lighter pane at the far left
  fill(lightColours.glassDark);
  rect(picX(0), picY(0.252), PIC_W * 0.412, PIC_H * 0.196);
  fill(lightColours.glassLight);
  rect(picX(0), picY(0.252), PIC_W * 0.155, PIC_H * 0.196);

  // reflected buildings in the left pane: five dark towers of different heights
  fill(0, 0, 0, 45);
  for (let i = 0; i < 5; i++) {
    let towerHeight = 0.05 + (i * 7 % 4) * 0.02;
    rect(picX(0.01 + i * 0.028), picY(0.40 - towerHeight), PIC_W * 0.022, PIC_H * towerHeight);
  }

  // reflected palms: a trunk and a small crown of lines. They lean a little with the wind.
  drawReflectedPalm(0.32, 0.31, 1);
  drawReflectedPalm(0.105, 0.335, 0.6);
  drawReflectedPalm(0.285, 0.365, 0.6);

  // the frames between the panes (a thin double post) and the beige curtains at the sides
  fill(lightColours.frame);
  rect(picX(0.155), picY(0.252), 3, PIC_H * 0.196);
  rect(picX(0.161), picY(0.252), 3, PIC_H * 0.196);
  rect(picX(0.405), picY(0.252), PIC_W * 0.007, PIC_H * 0.196);

  fill(lightColours.frame[0], lightColours.frame[1], lightColours.frame[2], 230);
  rect(picX(0.131), picY(0.252), PIC_W * 0.022, PIC_H * 0.196);
  rect(picX(0.362), picY(0.252), PIC_W * 0.04, PIC_H * 0.196);
}

// One palm seen in the glass: a thin trunk down to the ground and six short lines for the crown.
function drawReflectedPalm(x, crownY, size) {
  let lean = wind.value * 0.04;

  push();
  translate(picX(x), picY(crownY));
  rotate(lean);
  stroke(0, 0, 0, 70);
  strokeWeight(2 * size);
  line(0, 0, 0, PIC_H * 0.13 * size);        // trunk
  strokeWeight(1.5 * size);
  for (let i = 0; i < 6; i++) {
    let angle = -PI + (i + 0.5) * PI / 6;     // from left, over the top, to the right
    line(0, 0, cos(angle) * 20 * size, sin(angle) * 14 * size + 4 * size);
  }
  pop();
  noStroke();
}

// A low bush in front of the pink wall, made of many short blades. The blades lean in the wind.
function drawBush() {
  noStroke();
  fill(lightColours.hedge);
  rect(picX(0.41), picY(0.447), PIC_W * 0.29, PIC_H * 0.007);

  strokeWeight(3);
  for (let i = 0; i < 70; i++) {
    let x = lerp(0.41, 0.70, i / 69);
    // blades of different heights, without random(): two sine waves of different speeds
    let bladeHeight = 0.014 + 0.008 * sin(i * 1.7) + 0.006 * sin(i * 0.45);
    let lean = wind.value * bladeHeight * PIC_H * 0.35;

    stroke(mixColour(lightColours.hedge, lightColours.leafLight, (i % 3) / 5));
    line(picX(x), picY(DECK_TOP), picX(x) + lean, picY(DECK_TOP - bladeHeight));
  }
  noStroke();
}

// ---------------------------------------------------------------- deck, chair, pool

function drawDeck() {
  noStroke();
  fill(lightColours.deck);
  rect(picX(0), picY(DECK_TOP), PIC_W, PIC_H * (DECK_BOTTOM - DECK_TOP));
}

// The director's chair outside the window: cloth seat and back, crossed legs.
function drawChair() {
  noStroke();
  fill(lightColours.frame);
  rect(picX(0.210), picY(0.408), PIC_W * 0.044, PIC_H * 0.020);   // the back
  rect(picX(0.208), picY(0.432), PIC_W * 0.048, PIC_H * 0.010);   // the seat

  stroke(lightColours.roofEdge);
  strokeWeight(2);
  line(picX(0.206), picY(0.428), picX(0.258), picY(0.428));       // the arm rail
  line(picX(0.212), picY(0.442), picX(0.252), picY(0.470));       // the crossed legs
  line(picX(0.252), picY(0.442), picX(0.212), picY(0.470));
  noStroke();
}

function drawPool() {
  noStroke();

  // pale stone edge, then the dark blue strip of tile at the water line
  fill(lightColours.coping);
  rect(picX(0), picY(DECK_BOTTOM), PIC_W, PIC_H * 0.007);
  fill(lightColours.poolEdge);
  rect(picX(0), picY(DECK_BOTTOM + 0.007), PIC_W, PIC_H * (WATER_TOP - DECK_BOTTOM - 0.007));

  // the flat water colour (the Perlin member's texture is painted over it)
  fill(lightColours.waterTop);
  rect(picX(0), picY(WATER_TOP), PIC_W, PIC_H * (1 - WATER_TOP));

  drawWaterTexture();   // perlin-random-mechanic.js (2D Perlin noise)
  drawWaterLines();     // perlin-random-mechanic.js (light squiggles)
}

// The diving board comes in from the bottom right corner and ends in front of the splash.
// Each corner is written as a fraction of the picture (x, y). It stays still.
function drawDivingBoard() {
  noStroke();

  // the top of the board
  // (two shapes that overlap a little, so no thin seam shows between them)
  fill(lightColours.boardTop);
  quad(picX(0.575), picY(0.798), picX(0.795), picY(0.797),
       picX(1.0), picY(1.01), picX(0.828), picY(1.01));
  quad(picX(0.795), picY(0.797), picX(1.0), picY(0.894),
       picX(1.0), picY(1.01), picX(0.90), picY(0.95));

  // the darker edge along the near side of the board
  fill(lightColours.boardSide);
  quad(picX(0.575), picY(0.798), picX(0.586), picY(0.822),
       picX(0.846), picY(1.01), picX(0.828), picY(1.01));
}

// Four beige rectangles hide anything that spills outside the picture
// and give us the printed border back.
function drawBorder() {
  noStroke();
  fill(228, 218, 201);   // the warm beige of the painting's canvas
  rect(0, 0, width, BORDER);
  rect(0, height - BORDER, width, BORDER);
  rect(0, 0, BORDER, height);
  rect(width - BORDER, 0, BORDER, height);
}
