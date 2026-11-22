// audio.js — every sound is synthesised with WebAudio oscillators. No audio
// files, no network: the game stays a handful of static files.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.alarmOsc = null;
    this.alarmGain = null;
    this.humOsc = null;
  }

  // Browsers only let audio start after a user gesture; call from input.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    // Low gallery hum underneath everything.
    const hum = this.ctx.createOscillator();
    const humGain = this.ctx.createGain();
    hum.type = 'sine';
    hum.frequency.value = 55;
    humGain.gain.value = 0.018;
    hum.connect(humGain).connect(this.ctx.destination);
    hum.start();
    this.humOsc = hum;
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) this.ctx.suspend();
    if (!m && this.ctx) this.ctx.resume();
  }

  // Short tone: frequency, seconds, shape, volume.
  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol || 0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  footstep(sneaking) {
    this.tone(sneaking ? 140 : 190, 0.05, 'triangle', sneaking ? 0.015 : 0.03);
  }

  pickTick() {
    this.tone(880, 0.06, 'square', 0.03);
  }

  lootChime() {
    this.tone(523, 0.14, 'sine', 0.09);
    setTimeout(() => this.tone(784, 0.2, 'sine', 0.09), 90);
    setTimeout(() => this.tone(1047, 0.28, 'sine', 0.08), 190);
  }

  laserZap() {
    this.tone(220, 0.25, 'sawtooth', 0.06, 90);
  }

  empBuzz() {
    this.tone(1200, 0.4, 'sawtooth', 0.05, 120);
  }

  smokePuff() {
    this.tone(300, 0.3, 'sine', 0.05, 90);
  }

  spottedBlip() {
    this.tone(660, 0.09, 'square', 0.05);
    setTimeout(() => this.tone(660, 0.09, 'square', 0.05), 130);
  }

  winJingle() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((n, i) => setTimeout(() => this.tone(n, 0.3, 'triangle', 0.09), i * 120));
  }

  caughtSting() {
    this.tone(392, 0.5, 'sawtooth', 0.08, 98);
    setTimeout(() => this.tone(311, 0.7, 'sawtooth', 0.08, 78), 180);
  }

  // The alarm siren rises and falls while the meter is high, and stops
  // when the thief is clear again.
  setAlarmLevel(level) {
    if (!this.ctx || this.muted) {
      this.stopAlarm();
      return;
    }
    if (level > 45 && !this.alarmOsc) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 620;
      gain.gain.value = 0.0;
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 1.6;
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain).connect(osc.frequency);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start();
      lfo.start();
      this.alarmOsc = osc;
      this.alarmGain = gain;
      this.alarmLfo = lfo;
    }
    if (this.alarmGain) {
      this.alarmGain.gain.setTargetAtTime(
        level > 45 ? 0.02 + (level - 45) / 55 * 0.035 : 0,
        this.ctx.currentTime, 0.2);
    }
    if (level <= 45) this.stopAlarm();
  }

  stopAlarm() {
    if (this.alarmOsc) {
      try { this.alarmOsc.stop(); this.alarmLfo.stop(); } catch (e) { /* already stopped */ }
      this.alarmOsc = null;
      this.alarmGain = null;
      this.alarmLfo = null;
    }
  }
}
