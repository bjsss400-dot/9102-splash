// input-controls.js
// MECHANIC: User input  (mouse and keyboard)
//
// Idea: the viewer touches the scene in two ways.
//   click on the pool        -> a splash at that spot
//   drag the mouse left / right -> a gust of wind in that direction
// plus keyboard shortcuts that are handy when presenting:
//   1 2 3 4 -> jump to day, sunset, night, sunrise        M -> music on / off
//
// This member also owns index.html, style.css and artwork-base.js (the flat scene).
//
// Uses: mousePressed, mouseDragged, keyPressed, key, mouseX, mouseY, width, height,
//       if / else if, &&, !==, switch, arrays of objects, for loops, % operator, lerp.
//
// Other files use:
//   wind.gust                 (perlin-random-mechanic.js adds it to the wind)
//   drawWindStreaks()         (artwork-base.js)
// This file calls:
//   triggerSplash(), jumpToTimeOfDay()   (time-mechanic.js)
//   startAudio(), toggleAudio()          (audio-mechanic.js)

let lastMouseX = 0;     // where the mouse was on the previous event, to measure how far it moved
let windStreaks = [];   // faint lines in the sky that show which way the wind blows

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
}

// Runs every frame (see sketch.js).
function updateInputControls() {
  // Easing (Week 10): the gust loses 3% of its strength every frame, so it fades away smoothly.
  wind.gust = lerp(wind.gust, 0, 0.03);

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
