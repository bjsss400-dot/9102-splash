// perlin-random-mechanic.js
// Owner: Aokun Liu (Okun) - Perlin noise and randomness.
// Iteration 4.4: every leaf starts in the sky and responds more strongly to wind.
// Perspective water reflections retain sunlight and moonlight.
// Green leaves settle onto the water, float, then fade gradually as they sink.
// The existing wind, palms and splash behaviour are preserved.
// Built on the group's existing palms and splash drawing.
// References: https://p5js.org/reference/p5/noise/
//             https://p5js.org/reference/p5/random/
//             https://p5js.org/reference/p5/randomSeed/
//             https://p5js.org/reference/p5/clip/
// Keep these NAMES the same: artwork-base.js and sketch.js call them.
//
// What this starting version already does, so the scene looks like the original painting:
//   - two very tall, thin palms with small drooping crowns (they stand behind the house)
//   - they lean with the wind (wind.value), so Input's wind can be tested
//   - the splash is one soft white cloud, painted like the original with about 1600 tiny, faint brush
//     marks (solid white in the middle, feathery at the edges and the top) and a few droplets
// This iteration adds:
//   - saved random length, curve, thickness, shade and softness for each frond
//   - a continuous noise() breeze, combined with Input's wind.gust
//   - stronger independent flutter and slightly delayed palm movement
//   - curved pool reflections and random batches of wind-driven falling leaves
//   - each leaf floats for 1.5 seconds before gently sinking and disappearing
// Later iterations can add:
//   - TODO: the splash: replace scatter() with random() + randomSeed(splash seed), so every splash is
//           different but does not flicker, and use noise() so neighbouring strokes get similar heights

// Each palm: where its foot is, how tall it is (fraction of the picture height),
// how much the trunk bows (radians, negative = towards the left) and how thick it is.
const PALMS = [
  { x: 0.707, baseY: 0.456, height: 0.349, bow: -0.05, trunkWidth: 3 },
  { x: 0.800, baseY: 0.456, height: 0.373, bow: 0.04, trunkWidth: 3.4 }
];
const FRONDS_PER_PALM = 12;
const SEGMENTS = 6;           // every frond is built from 6 short pieces

const FROND_SEED = 9103;       // same seed = same leaf shapes after refreshing
let frondTraits = [];         // one list of fronds for each palm
let windNoisePosition = 0;
let palmWind = [0, 0];         // the two palms take a little time to follow the wind
let surfaceTime = 0;
let waterTravel = 0;
let waterMarks = [];
let waterReflections = [];    // small connected pieces of the moving reflection lines
let poolLeaves = [];           // falling, floating and sinking leaves share one list
let leafBatchNumber = 0;
let previousLeafCount = 0;
let nextLeafBatchAt = 0;
let leafSerial = 0;

const WATER_MARK_COUNT = 36;
const LEAF_BATCH_COUNTS = [2, 3, 4, 5];

function setupVariation() {
  randomSeed(FROND_SEED);
  frondTraits = [];
  windNoisePosition = 0;
  palmWind = [0, 0];
  surfaceTime = 0;
  waterTravel = 0;
  waterMarks = [];
  poolLeaves = [];
  leafBatchNumber = 0;
  previousLeafCount = 0;
  nextLeafBatchAt = 0;
  leafSerial = 0;

  for (let p = 0; p < PALMS.length; p++) {
    let palmFronds = [];
    for (let f = 0; f < FRONDS_PER_PALM; f++) {
      // Keep small ranges so both crowns still match the original scene.
      // Store these once: calling random() while drawing would make leaves flicker.
      palmFronds.push({
        lengthScale: random(0.9, 1.1),
        curl: random(0.17, 0.23),
        width: random(1.5, 2.0),
        tone: random(0.15, 0.85),
        softness: random(0.8, 1.2),
        noiseOffset: p * 1000 + f * 10 + random(0, 5)
      });
    }
    frondTraits.push(palmFronds);
  }

  // A loose grid spreads the marks out; random values keep it from looking tiled.
  // Store these once. The drawing functions never create fresh random shapes.
  const waterHeight = PIC_H * (1 - WATER_TOP);
  for (let i = 0; i < WATER_MARK_COUNT; i++) {
    waterMarks.push({
      x: (i % 6 + random(0.1, 0.9)) * PIC_W / 6,
      y: picY(WATER_TOP) + (floor(i / 6) + random(0.15, 0.85)) * waterHeight / 6,
      length: random(24, 64),
      weight: random(0.7, 1.2),
      opacity: random(60, 110),
      offset: random(100, 1000)
    });
  }

  spawnLeafBatch();
}

function spawnLeafBatch() {
  // Only the batch count and starting horizontal positions are random.
  // Every leaf starts above the picture; none are created on the water.
  const counts = LEAF_BATCH_COUNTS.filter(count => count !== previousLeafCount);
  const count = random(counts);
  previousLeafCount = count;
  leafBatchNumber++;

  for (let i = 0; i < count; i++) {
    poolLeaves.push({
      id: ++leafSerial,
      batch: leafBatchNumber,
      state: 'falling',
      age: -i * 0.22,
      x: lerp(36, PIC_W - 36, (i + random(0.1, 0.9)) / count),
      y: picY(0) - 24,
      // The upper part of the pool stays clear of the diving board.
      landingY: picY(0.70),
      fallSpeed: 78,
      floatFor: 1.5,
      sinkFor: 2.2,
      length: 18,
      width: 5.2,
      angle: -PI * 0.2,
      shade: 0.55,
      mobility: 1,
      offset: 1200 + leafSerial * 73.1,
      vx: 0,
      vy: 0
    });
  }
}

function moveLeafSideways(leaf, targetSpeed, seconds, response) {
  // Slow down gently near the picture edges instead of wrapping or jumping.
  // A reversed wind can immediately draw the leaf away from the edge again.
  const margin = 16;
  const room = targetSpeed > 0 ? PIC_W - margin - leaf.x : leaf.x - margin;
  targetSpeed *= constrain(room / 80, 0, 1);
  leaf.vx = lerp(leaf.vx, targetSpeed, 1 - exp(-response * seconds));
  const nextX = leaf.x + leaf.vx * seconds;
  leaf.x = constrain(nextX, margin, PIC_W - margin);
  if (leaf.x !== nextX) leaf.vx = 0;
}

// wind.gust is written by input-controls.js; wind.value is written HERE.
function updateWind() {
  // deltaTime is milliseconds since the last frame; divide by 1000 for seconds.
  // Cap long gaps so returning to this tab does not cause a sudden jump.
  let seconds = min(deltaTime, 50) / 1000;
  windNoisePosition += seconds * 0.16;
  surfaceTime += seconds;

  // Slow changes give the main breeze; a second layer adds smaller gusts.
  let breeze = (noise(200 + windNoisePosition) - 0.5) * 1.6;
  breeze += (noise(800 + windNoisePosition * 2.3) - 0.5) * 0.5;

  // A deliberate drag takes priority over the small natural breeze.
  // Input still owns wind.gust. This file only reads it and writes wind.value.
  let dragAmount = constrain(abs(wind.gust) / 0.35, 0, 1);
  let targetWind = wind.gust + breeze * (1 - 0.85 * dragAmount);
  targetWind = constrain(targetWind, -1.65, 1.65);
  wind.value = lerp(wind.value, targetWind, 1 - exp(-8 * seconds));

  for (let p = 0; p < PALMS.length; p++) {
    palmWind[p] = lerp(palmWind[p], wind.value, 1 - exp(-(4 + p) * seconds));
  }

  // Update the surface once per frame, here. The water hooks only draw it.
  updateWaterSurface(seconds);
}

function updateWaterSurface(seconds) {
  waterTravel += (2 + wind.value * 20) * seconds;

  for (let mark of waterMarks) {
    let current = 1.8 + (noise(mark.offset, surfaceTime * 0.12) - 0.5) * 2;
    mark.x += (current + wind.value * 22) * seconds;
    mark.x = wrapPoolX(mark.x, 75);
  }

  for (let leaf of poolLeaves) {
    leaf.age += seconds;
    if (leaf.age < 0) continue;

    if (leaf.state === 'falling') {
      let sway = (noise(leaf.offset, surfaceTime * 0.45) - 0.5) * 32;
      let targetX = wind.value * 110 + sway;
      moveLeafSideways(leaf, targetX, seconds, 5);
      let fall = leaf.fallSpeed * (0.9 + noise(leaf.offset + 30, surfaceTime * 0.3) * 0.2);
      leaf.y += fall * seconds;

      if (leaf.y >= leaf.landingY) {
        leaf.y = leaf.landingY;
        leaf.landingPose = leafFallPose(leaf);
        leaf.state = 'floating';
        leaf.age = 0;          // The 1.5 second float starts at contact with the water.
      }
      continue;
    }

    // A slow current remains even when wind.value is zero.
    let current = 2 + (noise(leaf.offset, surfaceTime * 0.14) - 0.5) * 3;
    let targetX = current + wind.value * 60;
    let targetY = (noise(leaf.offset + 50, surfaceTime * 0.16) - 0.5) * 5;

    // Gently steer away from the top and bottom of the pool.
    const top = picY(WATER_TOP) + 18;
    const bottom = picY(1) - 18;
    targetY += max(0, top + 12 - leaf.y) * 0.5;
    targetY -= max(0, leaf.y - bottom + 12) * 0.5;

    let follow = 1 - exp(-3.5 * seconds);
    moveLeafSideways(leaf, targetX, seconds, 4.5);
    leaf.vy = lerp(leaf.vy, targetY, follow);
    leaf.y = constrain(leaf.y + leaf.vy * seconds, top, bottom);

    if (leaf.state === 'floating' && leaf.age >= leaf.floatFor) {
      leaf.state = 'sinking';
      leaf.age = 0;
    }
  }

  const hadLeaves = poolLeaves.length > 0;
  poolLeaves = poolLeaves.filter(leaf => leafSinkAmount(leaf) < 1);
  if (hadLeaves && poolLeaves.length === 0) {
    nextLeafBatchAt = surfaceTime + 0.5;
  }
  if (poolLeaves.length === 0 && surfaceTime >= nextLeafBatchAt) spawnLeafBatch();
}

// Recycling happens fully outside the painted area, hidden by the pool mask.
function wrapPoolX(x, margin) {
  if (x > PIC_W + margin) return -margin;
  if (x < -margin) return PIC_W + margin;
  return x;
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
      rotate(PALMS[p].bow / pieces + palmWind[p] * 0.014);
      line(0, 0, 0, -pieceLength);
      translate(0, -pieceLength);
    }

    // we are now at the top of the trunk: a dark knot, then the small crown
    noStroke();
    fill(lightColours.leafDark);
    ellipse(0, 0, 6, 7);

    for (let f = 0; f < FRONDS_PER_PALM; f++) {
      drawFrond(p, f);
    }
    pop();
  }
}

// A frond is built like the trunk: 6 short pieces, each one turning a little towards the
// ground. At the start of every piece we add two tiny leaves, one on each side.
// The stored traits change the shape without generating new random values each frame.
function drawFrond(p, f) {
  let traits = frondTraits[p][f];
  // fronds fan out from straight left, over the top, to straight right
  let baseAngle = -PI + (f + 0.5) * PI / FRONDS_PER_PALM;

  // fronds on the left droop anti-clockwise, fronds on the right clockwise
  let droop = 1;
  if (cos(baseAngle) < 0) {
    droop = -1;
  }

  let length = PIC_W * 0.058 * traits.lengthScale;
  let pieceLength = length / SEGMENTS;
  let flutter = (noise(traits.noiseOffset, windNoisePosition * 3) - 0.5) * 1.1;
  let curl = droop * (traits.curl + flutter * 0.055);

  // Keep only a shade ratio, so Time's changing day/night palette still colours the leaves.
  let colour = mixColour(lightColours.leafDark, lightColours.leafLight, traits.tone);
  push();
  rotate(baseAngle + palmWind[p] * 0.27 * traits.softness + flutter);
  stroke(colour);

  for (let j = 0; j < SEGMENTS; j++) {
    strokeWeight(traits.width);
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

// p5 clip() keeps the strokes and leaves in the pool. push()/pop() restore
// drawing state so Time's ripples, the splash and the board remain unaffected.
function clipPoolSurface() {
  // p5 skips a rect when both fill and stroke are disabled. Set the mask's
  // style before clip() makes it transparent; the caller's pop restores it.
  rectMode(CORNER);
  fill(255);
  noStroke();
  clip(() => rect(picX(0), picY(WATER_TOP), PIC_W, PIC_H * (1 - WATER_TOP)));
}

// The water is built in its own flat coordinates, then projected into the pool.
// Distant shapes become smaller and flatter; foreground shapes open out.
let waterCellEdges = [];

function projectPoolPoint(x, depth) {
  const scale = 1 / (2.6 - 1.6 * depth);
  return {
    x: picX(0.5) + (x - PIC_W * 0.5) * scale,
    y: picY(WATER_TOP) + PIC_H * (1 - WATER_TOP) * depth * scale,
    scale: scale
  };
}

// Read the same orbit phase that Time uses, without changing its clock or palette.
// Moonlight is cooler and much weaker than direct sunlight.
function poolReflectionLight() {
  const sunProgress = ((dayPhase + 0.25) % 1) * 2;
  const moonProgress = ((dayPhase + 0.75) % 1) * 2;
  function strength(progress) {
    if (progress > 1) return 0;
    const elevation = max(0, sin(progress * PI));
    const fade = easeTimeBlend(progress / 0.035) * easeTimeBlend((1 - progress) / 0.035);
    return pow(elevation, 0.8) * fade;
  }
  const sun = strength(sunProgress);
  const moon = strength(moonProgress) * 0.24;
  const progress = sunProgress <= 1 ? sunProgress : moonProgress;
  return {
    sun: sun, moon: moon, strength: sun + moon,
    x: picX(lerp(0.92, 0.08, progress)),
    ink: sunProgress <= 1
      ? mixColour(lightColours.squiggle, lightColours.foam, 0.72)
      : [174, 210, 238]
  };
}

// Clip a cell to the half-plane closer to its own centre than a neighbouring one.
// This makes an irregular shared network, rather than separate circles or stripes.
function clipWaterCell(polygon, centre, neighbour) {
  const nx = neighbour.x - centre.x;
  const ny = neighbour.y - centre.y;
  const limit = (neighbour.x * neighbour.x + neighbour.y * neighbour.y
               - centre.x * centre.x - centre.y * centre.y) / 2;
  const result = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const da = a.x * nx + a.y * ny - limit;
    const db = b.x * nx + b.y * ny - limit;
    if (da <= 0) result.push(a);
    if ((da <= 0) !== (db <= 0)) {
      const amount = da / (da - db);
      result.push({ x: lerp(a.x, b.x, amount), y: lerp(a.y, b.y, amount) });
    }
  }
  return result;
}

function createWaterCellEdges() {
  const centres = [];
  const spacing = 125;
  // Sample once to choose irregular centres. All later motion comes from noise.
  // This does not consume random() values used by the fronds and falling leaves.
  for (let row = -1; row <= 8; row++) {
    for (let column = -7; column <= 11; column++) {
      centres.push({
        x: (column + (row % 2) * 0.5) * spacing
           + (noise(220 + column * 7.3, 380 + row * 9.1) - 0.5) * spacing * 1.9,
        y: row * spacing + (noise(520 + column * 6.1, 780 + row * 8.7) - 0.5) * spacing * 1.9
      });
    }
  }
  const edges = [];
  const seen = new Set();
  for (const centre of centres) {
    let cell = [{x:-1050,y:-250}, {x:1600,y:-250}, {x:1600,y:1150}, {x:-1050,y:1150}];
    for (const neighbour of centres) {
      if (neighbour === centre) continue;
      cell = clipWaterCell(cell, centre, neighbour);
      if (!cell.length) break;
    }
    for (let i = 0; i < cell.length; i++) {
      const a = cell[i];
      const b = cell[(i + 1) % cell.length];
      const key = [a.x.toFixed(2) + ',' + a.y.toFixed(2),
                   b.x.toFixed(2) + ',' + b.y.toFixed(2)].sort().join(':');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({a:a, b:b});
    }
  }
  return edges;
}

function buildWaterReflections() {
  if (!waterCellEdges.length) waterCellEdges = createWaterCellEdges();
  const pieces = [];
  const light = poolReflectionLight();
  const time = surfaceTime * 0.16;
  // Keep the unchanging network in world coordinates. Smooth noise deforms it,
  // while wind advects the noise field; no cells are regenerated during drawing.
  for (const edge of waterCellEdges) {
    const points = [];
    for (let i = 0; i <= 8; i++) {
      const x = lerp(edge.a.x, edge.b.x, i / 8);
      const y = lerp(edge.a.y, edge.b.y, i / 8);
      const u = (x - waterTravel * 1.6) * 0.004;
      const v = y * 0.004;
      const dx = (noise(40 + u, 70 + v, time) - 0.5) * 160;
      const dy = (noise(180 + u, 230 + v, time) - 0.5) * 120;
      // Bow each shared edge between its endpoints to soften the cell outlines.
      // Reversing the edge reverses both its normal and bend, so neighbours agree.
      const ex = edge.b.x - edge.a.x;
      const ey = edge.b.y - edge.a.y;
      const length = max(1, sqrt(ex * ex + ey * ey));
      const midpointX = (edge.a.x + edge.b.x) * 0.004;
      const midpointY = (edge.a.y + edge.b.y) * 0.004;
      const direction = ex < 0 || (ex === 0 && ey < 0) ? -1 : 1;
      const bow = (noise(620 + midpointX, 740 + midpointY, time * 0.8) - 0.5)
                  * min(length * 0.9, 100) * sin(PI * i / 8) * direction;
      points.push(projectPoolPoint(x + dx - ey / length * bow,
                                   (y + dy + ex / length * bow) / 900));
    }
    if (points.every(p => p.x < picX(0) - 20) || points.every(p => p.x > picX(1) + 20)
        || points.every(p => p.y < picY(WATER_TOP) - 15) || points.every(p => p.y > picY(1) + 25)) continue;
    const middle = points[4];
    const shimmer = noise(360 + (edge.a.x - waterTravel) * 0.009, 480 + edge.a.y * 0.009, time * 1.2);
    const depth = constrain((middle.y - picY(WATER_TOP)) / (PIC_H * (1 - WATER_TOP)), 0, 1);
    // A broad sun reflection, or a narrower, quieter path under the moon.
    const spread = light.sun > 0 ? 390 : 110 + depth * 160;
    const distance = (middle.x - light.x) / spread;
    const path = exp(-distance * distance * 2);
    const focus = light.sun > 0 ? 0.62 + path * 0.38 : 0.22 + path * 0.78;
    pieces.push({
      points: points,
      width: (1.7 + shimmer * 2.4) * middle.scale,
      alpha: (105 + shimmer * 160) * light.strength * focus,
      ink: light.ink
    });
  }
  return pieces;
}

function drawWaterCurve(points) {
  beginShape();
  curveVertex(points[0].x, points[0].y);
  for (const point of points) curveVertex(point.x, point.y);
  const last = points[points.length - 1];
  curveVertex(last.x, last.y);
  endShape();
}

function drawWaterTexture() {
  push();
  clipPoolSurface();
  noFill();
  waterReflections = buildWaterReflections();
  // A faint broad stroke gives each bright edge a soft, painted reflection.
  for (const piece of waterReflections) {
    stroke(piece.ink[0], piece.ink[1], piece.ink[2], piece.alpha * 0.12);
    strokeWeight(piece.width * 4.5);
    drawWaterCurve(piece.points);
  }
  pop();
}

function drawWaterLines() {
  push();
  clipPoolSurface();
  noFill();
  for (const piece of waterReflections) {
    stroke(piece.ink[0], piece.ink[1], piece.ink[2], piece.alpha);
    strokeWeight(piece.width);
    drawWaterCurve(piece.points);
  }

  // Saved short marks use the same projection and light strength as the network.
  const light = poolReflectionLight();
  const height = PIC_H * (1 - WATER_TOP);
  for (const mark of waterMarks) {
    const depth = (mark.y - picY(WATER_TOP)) / height;
    const point = projectPoolPoint(mark.x, depth);
    const shimmer = max(0, noise(mark.offset, surfaceTime * 0.4) - 0.4);
    const length = mark.length * 0.45 * point.scale;
    const bend = (noise(mark.offset + 40, surfaceTime * 0.2) - 0.5) * 5 * point.scale;
    stroke(light.ink[0], light.ink[1], light.ink[2], shimmer * mark.opacity * 2 * light.strength);
    strokeWeight(mark.weight * point.scale);
    bezier(point.x, point.y, point.x + length * 0.3, point.y + bend,
           point.x + length * 0.7, point.y - bend, point.x + length, point.y);
  }

  for (let leaf of poolLeaves) {
    if (leaf.state !== 'falling') drawPoolLeaf(leaf);
  }
  pop();
}

function poolLeafColour(leaf) {
  // All falling leaves use the same green, adjusted by the existing day/night light.
  const green = mixColour([43, 119, 48], [102, 178, 70], leaf.shade);
  const treeColour = mixColour(lightColours.leafDark, lightColours.leafLight, leaf.shade);
  // Keep a clear green silhouette while following the palms' changing light.
  return mixColour(green, treeColour, 0.35 + nightAmount * 0.2);
}

function leafFallPose(leaf) {
  return {
    turn: (noise(leaf.offset + 150, surfaceTime * 0.4) - 0.5) * 1.8 + wind.value * 0.35,
    tilt: 0.45 + noise(leaf.offset + 90, surfaceTime * 0.65) * 0.8
  };
}

function leafSinkAmount(leaf) {
  if (leaf.state !== 'sinking') return 0;
  const progress = constrain(leaf.age / leaf.sinkFor, 0, 1);
  // Start and finish gently, so the last visible frame is almost transparent.
  return progress * progress * (3 - 2 * progress);
}

function drawPoolLeaf(leaf) {
  let sinking = leafSinkAmount(leaf);
  let alpha = 240 * (1 - sinking);
  let settle = leaf.state === 'floating' ? constrain(leaf.age / 0.45, 0, 1) : 1;
  settle = settle * settle * (3 - 2 * settle);
  let bob = (noise(leaf.offset + 100, surfaceTime * 0.35) - 0.5) * 2.5;
  let turn = (noise(leaf.offset + 150, surfaceTime * 0.2) - 0.5) * 0.8 + wind.value * 0.12;
  const landed = leaf.landingPose || { turn, tilt: 0.68 };
  let shade = poolLeafColour(leaf);
  shade = mixColour(shade, lightColours.waterTop, sinking * 0.45);

  push();
  translate(picX(0) + leaf.x, leaf.y + bob * settle + sinking * 18);

  // A small contact ripple places the leaf on the surface.
  noFill();
  const reflection = lightColours.squiggle;
  stroke(reflection[0], reflection[1], reflection[2], alpha * 0.18);
  strokeWeight(0.7);
  ellipse(-leaf.vx * 0.06, 1.5, leaf.length * 1.8, leaf.width * 1.2);

  // A small, short contact ring shows where the falling leaf met the water.
  if (leaf.state === 'floating' && leaf.age < 0.6) {
    let contact = leaf.age / 0.6;
    stroke(reflection[0], reflection[1], reflection[2], 90 * (1 - contact));
    ellipse(0, 1.5, leaf.length * (1 + contact * 2.5), 3 + contact * 6);
  }

  rotate(leaf.angle + lerp(landed.turn, turn, settle));
  scale(1 - sinking * 0.12, (1 - sinking * 0.12) * lerp(landed.tilt, 0.68, settle));
  drawLeafShape(leaf, shade, alpha);
  pop();
}

function drawFallingLeaves() {
  push();
  // Earlier ripple drawing may leave noFill() and noStroke() active.
  // Enable the rectangle mask before clip(), even when there are no ripples.
  rectMode(CORNER);
  fill(255);
  noStroke();
  clip(() => rect(picX(0), picY(0), PIC_W, PIC_H));
  for (let leaf of poolLeaves) {
    if (leaf.state !== 'falling' || leaf.age < 0) continue;
    let pose = leafFallPose(leaf);
    let shade = poolLeafColour(leaf);
    push();
    translate(picX(0) + leaf.x, leaf.y);
    rotate(leaf.angle + pose.turn);
    // Tipping as it falls changes the silhouette smoothly, without new randomness.
    scale(1, pose.tilt);
    drawLeafShape(leaf, shade, 240);
    pop();
  }
  pop();
}

function drawLeafShape(leaf, shade, alpha) {
  const edge = mixColour([21, 69, 36], [17, 44, 32], nightAmount);
  stroke(edge[0], edge[1], edge[2], alpha * 0.85);
  strokeWeight(0.65);
  fill(shade[0], shade[1], shade[2], alpha);
  let l = leaf.length;
  let w = leaf.width;
  beginShape();
  vertex(-l / 2, 0);
  bezierVertex(-l * 0.15, -w, l * 0.3, -w * 0.65, l / 2, 0);
  bezierVertex(l * 0.08, w * 0.85, -l * 0.35, w * 0.65, -l / 2, 0);
  endShape(CLOSE);
  const vein = mixColour(shade, lightColours.foam, 0.38);
  stroke(vein[0], vein[1], vein[2], alpha * 0.85);
  strokeWeight(0.65);
  line(-l * 0.38, 0, l * 0.35, 0);
}

// ---------------------------------------------------------------- the splash

// The time mechanic decides WHEN a splash rises and falls (splashes[i].height) and how
// strong it is (power). Here we decide what it LOOKS like.
function drawSplashes() {
  for (let i = 0; i < splashes.length; i++) {
    if (splashes[i].active) {
      drawOneSplash(splashes[i]);
    }
  }
  // This existing hook runs after the house and pool, so airborne leaves stay visible.
  // The board and border are drawn afterwards by the shared scene file.
  drawFallingLeaves();
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

  // Input iteration (OpenAI Codex assistance): the plume formulas have a broad
  // minimum, so shrink the entire weak splash, including its marks and droplets.
  // Scale around its landing point; stronger splashes keep their original size.
  let sizeScale = constrain(0.3 + power, 0.5, 1);
  push();
  translate(baseX, baseY);
  scale(sizeScale);
  translate(-baseX, -baseY);

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
  pop();
}
