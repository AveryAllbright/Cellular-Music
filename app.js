/* Clock 
 *
 * This example introduces a Clock object that keeps track of
 * tempo and has conversion functions for ticks (16th notes), 
 * beats (quarter notes), and measures.
 * 
 * The conversion functions return a value in samples relative  to
 * the AudioContext sampleRate and tempo. 
 * 
 * Time values for scheduling in the example is now done using
 * values derived from the clock. The tempo of the clock may
 * be changed by the user using the tempo slider.
 */

const startAudioButton = document.querySelector("#startAudio"),
      clockSlider = document.querySelector("#clockTempo"),
      tempoVal = document.querySelector("#tempoValue"),
      canvas = document.getElementById("canvas"),
      ctx = canvas.getContext('2d');

let ruleNum = 30;
let generation = 0;

let cells, nextGen;
let w = window.innerWidth;
let h = window.innerHeight;
let cellWidth = 5;


function updateCanvasSize()
{
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    generation = 0;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0,0,w,h);
    cells = new Array(Math.floor(w / cellWidth));
  nextGen = new Array(cells.length);
    cells.fill(0);
    nextGen.fill(0);
    cells[Math.floor(cells.length / 2)] = 1;
}

updateCanvasSize();


function processRule(ruleNum, a,b,c)
{
    let val = (a << 2) + (b << 1) + c;
    let ret = (ruleNum >> val) & 1;
    return ret;
}

function computeNextGeneration()
{
    for (let i  = 0; i < cells.length; i++)
        {
            nextGen[i] = processRule(ruleNum, cells[i - 1], cells[i], cells[i + 1]); 
        }
    let temp = cells;
  cells = nextGen;
  nextGen = temp;
}


function draw(timeStamp) {
  let y = generation * cellWidth;
  if(y < h) {
    ctx.fillStyle = 'black';

    // draw current generation of cells 
    for(let i = 0; i < cells.length; i++) {
      if(cells[i] == 1) {
        ctx.fillRect(i * cellWidth, y, cellWidth, cellWidth); 
      }
    }
    generation++;
    computeNextGeneration();
  }

  requestAnimationFrame(draw);

}

requestAnimationFrame(draw);

window.addEventListener('resize', updateCanvasSize);


/* Utility Code */

/* Converts a MIDI note number to frequency in hertz.
   MIDI note numbers use 60 as Middle C */
function hertz(midiNoteNum) {
    return 440 * Math.pow(2.0, (midiNoteNum - 69) / 12);
}

/* MAIN AUDIO CODE */

function playNote(duration, frequency, amplitude) {
    // grab current time from audioContext
    // all time-based scheduling in WebAudio is done in relationship 
    // to the absolute time of audioContext
    let currentTime = audioContext.currentTime;
    // 1. Create our Nodes
    let osc = audioContext.createOscillator();
    let filter = audioContext.createBiquadFilter();
    let gain = audioContext.createGain();

    // 2. configure nodes
    osc.type = 'sawtooth';
    osc.frequency.value = frequency;

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2000, 0);
    filter.frequency.exponentialRampToValueAtTime(0.001, currentTime + duration);
    gain.gain.value = amplitude;

    // 3. connect nodes
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);

    // 4. Get audio signals flowing
    osc.start();
    osc.stop(currentTime + duration);
}

// 1. Create AudioContext. 
let audioContext = new (window.AudioContext || window.webkitAudioContext);

let scheduler = new Scheduler();
scheduler.attach(audioContext);

let clock = new Clock(); 
clock.setTempo(60);
clock.attach(audioContext);


function cause(start, func, ...args) {
    scheduler.schedule([start, func, args]);
}

function renderPiece() {
    // deal with browser audio policies that pause on page start
    audioContext.resume();

    let now = clock.now();
    for(let i = 0; i < 60; i++) {
        cause( 
            now + clock.ticks(i),  // when
            playNote,           // what function to call
            4,                  // what arguments to call...
            hertz(60 + i), 
            0.25);
    }

}

startAudioButton.addEventListener('click', renderPiece);

clockSlider.addEventListener('change', () => {
    let val = clockSlider.value;
    clock.setTempo(val)
    tempoVal.innerHTML = val;
});
