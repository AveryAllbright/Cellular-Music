/* scheduler.js
 * Author: Steven Yi
 *
 * Simple scheduler and clock classes for executing events in 
 * conjunction with the soundcard (WebAudio) clock. Events are 
 * scheduled according to sample time.
 * 
 */

function event(start, func, ...args) {
  return [start, func, args];
}

class Scheduler {
  constructor() {
    this.sampleTime = 0;
    this.blockSize = 1;
    this.events = [];
    this.events.peek = function() {
      return this[this.length - 1];
    };
  }

  schedule(event) {
    this.events.push(event);
    this.events.sort((a, b) => b[0] - a[0]);
  }

  processEvents() {
    let window = this.sampleTime + this.blockSize;
    while (this.events.length > 0 && this.events.peek()[0] <= window) {
      let evt = this.events.pop();
      evt[1].apply(null, evt[2]);
    }
    this.sampleTime = window;
  }

  attach(audioCtx) {
    let runner = audioCtx.createScriptProcessor(256, 0, 1);
    runner.scheduler = this;
    runner.onaudioprocess = function(evt) {
      let outputBuffer = evt.outputBuffer.getChannelData(0);
      let s = this.scheduler;
      for (let i = 0; i < outputBuffer.length; i++) {
        s.processEvents();
      }
    };

    runner.connect(audioCtx.destination);
  }
}

class Clock {
  constructor() {
    this.sampleTime = 0;
    this.tempo = 60; // beats per minute
    this.ctx = null;
  }

  attach(audioCtx) {
    this.ctx = audioCtx;
    let runner = audioCtx.createScriptProcessor(256, 0, 1);
    runner.clk = this;
    runner.onaudioprocess = function(evt) {
      let outputBuffer = evt.outputBuffer.getChannelData(0);
      let c = this.clk;
      c.sampleTime += outputBuffer.length;
    };

    runner.connect(audioCtx.destination);
  }

  now() {
    return this.sampleTime;
  }

  setTempo(tempo) {
    this.tempo = tempo;
  }

  /* returns value of time in ticks (16th notes) */
  ticks(num) {
    let sr = this.ctx.sampleRate;
    let tickDur = sr / ((this.tempo / 60) * 4);

    return tickDur * num;
  }

  /* returns value of time in beats (quarter notes) */
  beats(num) {
    return this.ticks(num * 4); 
  } 

  /* returns value of time in measures (4 quarter notes) */
  measures(num) {
    return this.ticks(num * 16); 
  }
}
