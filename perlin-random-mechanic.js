// perlin-random-mechanic.js
// The Perlin / random member takes over this file and extends it.
// Keep these NAMES the same: artwork-base.js and sketch.js call them.
//
// What this starting version already does, so the scene looks like the original painting:
//   - two very tall, thin palms with small drooping crowns (they stand behind the house)
//   - they lean with the wind (wind.value), so Input's wind can be tested
//   - the splash is one soft white cloud, painted like the original with about 1600 tiny, faint brush
//     marks (solid white in the middle, feathery at the edges and the top) and a few droplets
// What the Perlin / random member still has to do:
//   - TODO: setupVariation(): give every frond its own random look (length, curve, thickness,
//           shade, softness) with randomSeed() + random(), stored in an array of objects
//   - TODO: updateWind(): a smooth Perlin noise breeze (two noise layers) + wind.gust
//   - TODO: a small noise() flutter on every frond, bent by its own softness
//   - TODO: the splash: replace scatter() with random() + randomSeed(splash seed), so every splash is
//           different but does not flicker, and use noise() so neighbouring strokes get similar heights
//   - TODO: the water texture and the light squiggles (drawWaterTexture, drawWaterLines)

// Each palm: where its foot is, how tall it is (fraction of the picture height),
// how much the trunk bows (radians, negative = towards the left) and how thick it is.
const PALMS = [
  { x: 0.707, baseY: 0.456, height: 0.349, bow: -0.05, trunkWidth: 3 },
  { x: 0.800, baseY: 0.456, height: 0.373, bow: 0.04, trunkWidth: 3.4 }
];
const FRONDS_PER_PALM = 12;
const SEGMENTS = 6;           // every frond is built from 6 short pieces

function setupVariation() {}

// Placeholder: the wind is only the mouse gust. The real file adds a smooth Perlin noise breeze.
// wind.gust is written by input-controls.js; wind.value is written HERE.
function updateWind() {
  wind.value = wind.gust;
}

// ---------------------------------------------------------------- the palms

function drawPalms() {
  const pieces = 14;

  for (let p = 0; p < PALMS.length; p++) {
    let pieceLength = PIC_H * PALMS[p].height / pieces;

    push();
    translate(picX(PALMS[p].x), picY(PALMS[p].baseY));   // origin at the foot of the palm

    // The trunk is 14 short pieces. After each piece the drawing turns a tiny bit and moves up,
    // so the little turns add up to a curve. The wind adds to the turn, so the top moves most.
    stroke(lightColours.trunk);
    strokeWeight(PALMS[p].trunkWidth);
    for (let i = 0; i < pieces; i++) {
      rotate(PALMS[p].bow / pieces + wind.value * 0.008);
      line(0, 0, 0, -pieceLength);
      translate(0, -pieceLength);
    }

    // we are now at the top of the trunk: a dark knot, then the small crown
    noStroke();
    fill(lightColours.leafDark);
    ellipse(0, 0, 6, 7);

    for (let f = 0; f < FRONDS_PER_PALM; f++) {
      drawFrond(f);
    }
    pop();
  }
}

// A frond is built like the trunk: 6 short pieces, each one turning a little towards the
// ground. At the start of every piece we add two tiny leaves, one on each side.
// Every frond is identical except for its angle: the Perlin / random member makes them differ.
function drawFrond(f) {
  // fronds fan out from straight left, over the top, to straight right
  let baseAngle = -PI + (f + 0.5) * PI / FRONDS_PER_PALM;

  // fronds on the left droop anti-clockwise, fronds on the right clockwise
  let droop = 1;
  if (cos(baseAngle) < 0) {
    droop = -1;
  }

  let length = PIC_W * 0.058;
  let pieceLength = length / SEGMENTS;
  let curl = droop * 0.2;

  // every third frond is a lighter green (f % 3 is 0, 1 or 2)
  let tone = (f % 3) / 2;
  let colour = mixColour(lightColours.leafDark, lightColours.leafLight, tone * tone);

  push();
  rotate(baseAngle + wind.value * 0.2);
  stroke(colour);

  for (let j = 0; j < SEGMENTS; j++) {
    strokeWeight(1.8);
    line(0, 0, pieceLength, 0);                       // one piece of the spine

    // the two tiny leaves slant outwards, and get shorter towards the tip
    let leafLength = length * 0.34 * (1 - j / (SEGMENTS + 2));
    strokeWeight(1.1);
    line(0, 0, leafLength * 0.57, leafLength * 0.82);
    line(0, 0, leafLength * 0.57, -leafLength * 0.82);

    translate(pieceLength, 0);
    rotate(curl);                                     // turn a little towards the ground
  }
  pop();
}

// ---------------------------------------------------------------- the water

function drawWaterTexture() {}
function drawWaterLines() {}

// ---------------------------------------------------------------- the splash

// The time mechanic decides WHEN a splash rises and falls (splashes[i].height) and how
// strong it is (power). Here we decide what it LOOKS like.
function drawSplashes() {
  for (let i = 0; i < splashes.length; i++) {
    if (splashes[i].active) {
      drawOneSplash(splashes[i]);
    }
  }
}

// A repeatable "random" number between 0 and 1 for the number n. The same n always gives the
// same answer, so the splash does not flicker. (This is a stand-in: the Perlin / random member
// replaces it with random() and randomSeed().)
function scatter(n) {
  let v = sin(n * 12.9898) * 43758.5453;
  return ((v % 1) + 1) % 1;
}

// How wide the plume is at a given height u (0 = water, 1 = top): narrow at the foot, widest
// a little below the middle, narrow again at the top. It makes the splash a rounded blob.
function plumeProfile(u) {
  return sin(PI * (0.1 + 0.8 * u));
}

// The splash is one soft white cloud, painted with a dry brush: lots of tiny, faint marks that pile up.
// Where many marks overlap (the middle) it looks solid white; at the edges only a few are left, so it
// fades into the water. There is nothing else around it: no lines, no sheets.
// Layers, back to front:
//   1. a soft pale glow around the cloud
//   2. the cloud: 1600 short faint strokes, 60 longer streaks, and a soft white core
//   3. fine feathery tips at the top
//   4. a few droplets close to the cloud
// reach (splashes[i].height, 0 - 1) says how far the splash has grown. alpha fades it out.
function drawOneSplash(thisSplash) {
  let reach = thisSplash.height;
  if (reach < 0.02) {
    return;
  }

  // splashes nearer the bottom of the picture are a little bigger
  let depthScale = lerp(0.8, 1.15, (thisSplash.y - 0.68) / 0.27);
  let baseX = picX(thisSplash.x);
  let baseY = picY(thisSplash.y);
  let power = thisSplash.power;

  let plumeHeight = PIC_H * 0.28 * (0.4 + 0.6 * power) * depthScale * reach;   // how tall it is right now
  let halfWidth = 68 * depthScale * (0.75 + 0.25 * power);                     // half the width of the cloud
  let alpha = 255 * thisSplash.alpha;
  let lean = wind.value * 10 * reach;                                          // the wind pushes the top sideways
  let foam = lightColours.foam;
  let pale = lightColours.squiggle;

  // every splash has its own seed, so scatter() gives every splash its own shape
  let s0 = thisSplash.seed % 1000;

  // 1) a soft pale glow around the cloud, and a faint one where it goes into the water
  noStroke();
  for (let k = 0; k < 8; k++) {
    fill(pale[0], pale[1], pale[2], alpha * 0.05);
    ellipse(baseX + lean * 0.4, baseY - plumeHeight * 0.42, halfWidth * (1.1 + 0.2 * k), plumeHeight * (0.6 + 0.08 * k));
  }
  fill(pale[0], pale[1], pale[2], alpha * 0.1);
  ellipse(baseX, baseY + 14 * depthScale, halfWidth * 1.5, 40 * depthScale * reach);

  // 2) the cloud. Each mark sits at a height u (more of them near the middle: the average of two
  //    numbers between 0 and 1 is most often near 0.5) and across the width at that height
  //    (adding two numbers and taking 1 away gives -1 to 1, most often near 0). Marks near the
  //    middle are brighter and thicker than marks at the edge.
  for (let i = 0; i < 1600; i++) {
    let r1 = scatter(i + s0 + 200);
    let r2 = scatter(i + s0 + 400);
    let r3 = scatter(i + s0 + 600);
    let r4 = scatter(i + s0 + 700);
    let r5 = scatter(i + s0 + 900);

    let u = 0.08 + 0.84 * (r1 + r2) / 2;
    let side = r3 + r4 - 1;
    let x = baseX + side * halfWidth * plumeProfile(u) + lean * u + 0.12 * halfWidth * u;   // leans a little to the right
    let y = baseY - plumeHeight * u;

    // a short mark that is mostly upright and leans outwards
    let markLength = (7 + 18 * r5) * (0.6 + u);
    let tilt = side * 9 + (r2 - 0.5) * 8;
    let centre = 1 - side * side;

    stroke(foam[0], foam[1], foam[2], alpha * (0.08 + 0.34 * centre));
    strokeWeight(1.3 + 3 * r2 * centre);
    line(x - tilt / 2, y + markLength / 2, x + tilt / 2, y - markLength / 2);
  }

  // longer streaks, so the cloud still has some vertical movement in it
  strokeWeight(1.2);
  for (let i = 0; i < 60; i++) {
    let side = scatter(i + s0 + 1000) + scatter(i + s0 + 1100) - 1;
    let uMid = 0.2 + 0.6 * scatter(i + s0 + 1200);
    let halfLength = 0.08 + 0.12 * scatter(i + s0 + 1300);
    let x = baseX + side * halfWidth * plumeProfile(uMid) + lean * uMid;

    stroke(foam[0], foam[1], foam[2], alpha * 0.32);
    line(x - side * 3, baseY - plumeHeight * (uMid - halfLength), x + side * 9, baseY - plumeHeight * (uMid + halfLength));
  }

  // a soft white core: faint discs on top of each other, so the middle looks solid white
  noStroke();
  for (let k = 0; k < 8; k++) {
    fill(foam[0], foam[1], foam[2], alpha * 0.11);
    ellipse(baseX + lean * 0.5 + 6, baseY - plumeHeight * 0.4, halfWidth * (0.5 + 0.1 * k), plumeHeight * (0.4 + 0.07 * k));
  }

  // 3) fine feathery tips along the top of the cloud
  noFill();
  strokeWeight(1);
  for (let i = 0; i < 45; i++) {
    let side = (scatter(i + s0 + 800) - 0.5) * 1.6;
    let u = 0.62 + 0.22 * scatter(i + s0 + 820);
    let startX = baseX + side * halfWidth * plumeProfile(u) + lean * u;
    let startY = baseY - plumeHeight * u;
    let flick = 10 + 24 * scatter(i + s0 + 840);

    stroke(foam[0], foam[1], foam[2], alpha * 0.5);
    line(startX, startY, startX + side * 14 + lean * 0.3, startY - flick * reach);
  }

  // 4) a few droplets, all close to the cloud
  noStroke();
  fill(foam[0], foam[1], foam[2], alpha);
  for (let i = 0; i < 14; i++) {
    let dropX = baseX + (scatter(i + s0 + 600) - 0.5) * halfWidth * 2.2 + lean;
    let dropY = baseY - plumeHeight * (0.45 + 0.7 * scatter(i + s0 + 620));
    let size = 1.5 + 2.5 * scatter(i + s0 + 640);
    ellipse(dropX, dropY, size, size);
  }
}
