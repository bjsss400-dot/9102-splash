// sketch.js
// The main file. It only brings the other scripts together (Week 6: setup and draw).
// Owner: Audio member (the order things run in, the text in the border, final testing).
//
//   artwork-base.js            the flat scene from "A Bigger Splash"            (User input)
//   time-mechanic.js           TIME      – day / night colours, splash life     (Time)
//   perlin-random-mechanic.js  PERLIN / RANDOM – variation, wind, palms, water  (Perlin / random)
//   input-controls.js          INPUT     – click for splash, drag for wind      (User input)
//   audio-mechanic.js          AUDIO     – loudness triggers splashes           (Audio)

// The wind is shared by two files, and each writes only its own part:
//   gust  = a push from the mouse            (written by input-controls.js)
//   value = smooth wind + gust, every frame  (written by perlin-random-mechanic.js)
// Negative = blowing left, positive = blowing right.
let wind = {
  gust: 0,
  value: 0
};

function setup() {
  createCanvas(660, 660);   // a 30 px border all round a 600 x 600 picture

  setupTimeMechanic();      // palettes, splash and ripple lists
  setupVariation();         // random look of every frond and squiggle
  setupInputControls();
  setupAudioMechanic();
}

// Order matters (Week 6): each mechanic updates its numbers, then the whole scene is drawn.
function draw() {
  background(228, 218, 201);   // warm beige: the border of the picture

  updateInputControls();    // the gust fades
  updateWind();             // smooth wind = noise + gust
  updateTimeMechanic();     // light, splashes, ripples
  updateAudioMechanic();    // may start a splash

  drawScene();              // artwork-base.js calls the drawing functions of each mechanic
  drawBorderText();
  drawAudioMeter();
}

// Text in the beige border: the time of day at the top, instructions at the bottom.
function drawBorderText() {
  noStroke();
  fill(120, 112, 100);
  textSize(11);

  textAlign(LEFT, CENTER);
  text(getTimeOfDayName(), BORDER, BORDER / 2);

  textAlign(CENTER, CENTER);
  let message = 'click the pool: splash   drag left / right: wind   1 2 3 4: time of day   M: music';
  if (audioState.started === false) {
    message = 'click anywhere to start the music';
  }
  text(message, width / 2, height - BORDER / 2);
}
