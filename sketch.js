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
  let message = 'hold board / SPACE: dive   click pool: splash   drag: wind   1 2 3 4: time   M: music';
  if (diver.state === 'charging') {
    let seconds = (diver.charge * CHARGE_DURATION_MS / 1000).toFixed(1);
    message = 'Hold: ' + seconds + ' s   |   short: near + small   |   long: far + big   |   release to dive';
  } else if (audioState.started === false) {
    message = 'hold board or SPACE, then release   |   short: near + small   |   long: far + big';
  }
  text(message, width / 2, height - BORDER / 2);
}

