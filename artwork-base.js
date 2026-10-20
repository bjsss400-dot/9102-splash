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
  fill(255, 255, 255, 150);
  rect(picX(0), picY(0.224), PIC_W * 0.78, 1.5);
}

// The buildings reflected in the glass: left edge, right edge and top of each dark block
// (fractions of the picture). Together they make a skyline, like in the painting.
const SKYLINE = [
  { left: 0.000, right: 0.048, top: 0.290 },
  { left: 0.048, right: 0.136, top: 0.282 },
  { left: 0.146, right: 0.190, top: 0.290 },
  { left: 0.190, right: 0.322, top: 0.316 },
  { left: 0.322, right: 0.410, top: 0.304 },
  { left: 0.010, right: 0.030, top: 0.272 },     // a few smaller blocks on top, for a stepped look
  { left: 0.074, right: 0.100, top: 0.268 },
  { left: 0.150, right: 0.178, top: 0.275 },
  { left: 0.345, right: 0.372, top: 0.290 }
];

// The glass wall on the left. By day it mirrors the outside: a pale grey sky, dark buildings,
// the dark ground and a few palms. At night the lights are on and it glows yellow
// (the colours come from lightColours). It is drawn in layers, back to front.
function drawGlassWall() {
  noStroke();
  const glassTop = 0.252;
  const glassBottom = 0.448;
  const glassWidth = 0.412;

  // 1) the sky in the glass: a pale grey, a little lighter than the glass itself
  fill(mixColour(lightColours.glassLight, [255, 255, 255], 0.32));
  rect(picX(0), picY(glassTop), PIC_W * glassWidth, PIC_H * (glassBottom - glassTop));

  // 2) the buildings: grey blocks, darker than the sky, that run down to the bottom of the glass
  fill(mixColour(lightColours.glassDark, lightColours.glassLight, 0.3));
  for (let i = 0; i < SKYLINE.length; i++) {
    rect(picX(SKYLINE[i].left), picY(SKYLINE[i].top),
         PIC_W * (SKYLINE[i].right - SKYLINE[i].left), PIC_H * (glassBottom - SKYLINE[i].top));
  }

  // 3) the ground in the glass is darker still, with a few dark bushes on it
  fill(0, 0, 0, 40);
  rect(picX(0), picY(0.40), PIC_W * glassWidth, PIC_H * (glassBottom - 0.40));
  drawReflectedBush(0.096, 0.425);
  drawReflectedBush(0.262, 0.432);
  drawReflectedBush(0.352, 0.434);

  // 4) the palms outside, reflected: a big one, a small one, and one on the left
  drawReflectedPalm(0.327, 0.314, 0.093, 1);
  drawReflectedPalm(0.297, 0.376, 0.07, 0.6);
  drawReflectedPalm(0.096, 0.345, 0.095, 0.75);

  // 5) the white posts between the panes, and the curtains, which have vertical folds
  let post = mixColour(lightColours.frame, [255, 255, 255], 0.6);
  fill(post);
  rect(picX(0.048) - 1.5, picY(glassTop), 3, PIC_H * (glassBottom - glassTop));
  rect(picX(0.231) - 1.5, picY(glassTop), 3, PIC_H * (glassBottom - glassTop));
  rect(picX(0.320) - 1.5, picY(glassTop), 3, PIC_H * (glassBottom - glassTop));
  rect(picX(0.1363), picY(glassTop), PIC_W * 0.0102, PIC_H * (glassBottom - glassTop));   // the thick post
  rect(picX(0.406), picY(glassTop), PIC_W * 0.006, PIC_H * (glassBottom - glassTop));     // the post at the end

  drawCurtain(0.1117, 0.1363);
  drawCurtain(0.362, 0.406);

  // the thin white sill under the glass
  fill(post);
  rect(picX(0), picY(glassBottom), PIC_W * glassWidth, PIC_H * (DECK_TOP - glassBottom));
}

// A small dark bush on the ground in the glass: a cluster of little overlapping ovals.
function drawReflectedBush(x, y) {
  fill(0, 0, 0, 55 * (1 - nightAmount * 0.5));
  ellipse(picX(x), picY(y), PIC_W * 0.028, PIC_H * 0.02);
  ellipse(picX(x) - 7, picY(y) + 2, PIC_W * 0.02, PIC_H * 0.014);
  ellipse(picX(x) + 8, picY(y) + 1, PIC_W * 0.022, PIC_H * 0.016);
  ellipse(picX(x) + 1, picY(y) - 4, PIC_W * 0.016, PIC_H * 0.012);
}

// A beige curtain: a flat panel with many thin darker lines down it, like folds.
function drawCurtain(left, right) {
  let beige = mixColour(lightColours.roof, lightColours.wall, 0.35);
  noStroke();
  fill(beige);
  rect(picX(left), picY(0.252), PIC_W * (right - left), PIC_H * 0.196);

  stroke(0, 0, 0, 22);
  strokeWeight(1);
  for (let x = picX(left) + 2; x < picX(right); x += 3.5) {
    line(x, picY(0.252), x, picY(0.448));
  }
  noStroke();
}

// One palm seen in the glass: a thin dark trunk and a small crown of drooping fronds.
// A frond is a few short pieces, each turning a little towards the ground, with two tiny leaves
// on each piece. The palm leans a little with the wind.
function drawReflectedPalm(x, crownY, trunkLength, size) {
  let ink = 95 * (1 - nightAmount * 0.5);    // dark grey by day, fainter at night

  push();
  translate(picX(x), picY(crownY));
  rotate(wind.value * 0.03);

  stroke(0, 0, 0, ink);
  strokeWeight(2 * size);
  line(0, 0, 0, PIC_H * trunkLength);          // the trunk

  for (let f = 0; f < 8; f++) {
    let angle = -PI + (f + 0.5) * PI / 8;      // from left, over the top, to the right
    let droop = 1;
    if (cos(angle) < 0) {
      droop = -1;
    }

    push();
    rotate(angle);
    strokeWeight(1.3 * size);
    for (let j = 0; j < 6; j++) {
      // the pieces get shorter and the two tiny leaves smaller towards the tip
      let pieceLength = (4.6 - j * 0.35) * size;
      let leafLength = (3 - j * 0.35) * size;
      line(0, 0, pieceLength, 0);
      line(0, 0, leafLength * 0.7, leafLength * 0.8);
      line(0, 0, leafLength * 0.7, -leafLength * 0.8);
      translate(pieceLength, 0);
      rotate(droop * 0.2);
    }
    pop();
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

// The director's chair outside the window: a white canvas back and seat on a dark frame with
// crossed legs, and a soft shadow on the deck.
function drawChair() {
  noStroke();

  // the shadow on the deck
  fill(0, 0, 0, 32);
  ellipse(picX(0.236), picY(0.478), PIC_W * 0.075, PIC_H * 0.012);

  // the dark frame: two back posts, the arm rails, and the crossed legs
  stroke(45, 45, 48);
  strokeWeight(1.6);
  line(picX(0.202), picY(0.410), picX(0.202), picY(0.447));
  line(picX(0.252), picY(0.410), picX(0.252), picY(0.447));
  line(picX(0.198), picY(0.440), picX(0.256), picY(0.440));
  line(picX(0.204), picY(0.472), picX(0.243), picY(0.438));
  line(picX(0.249), picY(0.470), picX(0.211), picY(0.438));

  // the white canvas: the back and the seat
  noStroke();
  fill(mixColour(lightColours.frame, [255, 255, 255], 0.55));
  rect(picX(0.202), picY(0.410), PIC_W * 0.050, PIC_H * 0.017);
  rect(picX(0.210), picY(0.437), PIC_W * 0.040, PIC_H * 0.009);
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
