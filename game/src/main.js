// main.js — Velvet Rope: a night at the Meridian Gallery. Boots the game,
// runs the loop, owns the alarm meter and the win/lose states, and wires
// keyboard and mouse input. The game is one canvas, one level, three
// paintings and a van waiting outside.
import { LEVEL, PLAY_BOUNDS, VIEW_W, VIEW_H } from './levels.js';
import { Guard } from './guards.js';
import { SecurityCamera, LaserGrid } from './cameras.js';
import { Thief } from './player.js';
import { SoundEngine } from './audio.js';
import { Renderer } from './render.js';
import { stageShot } from './shots.js';

const ALARM_DECAY = 4;      // points per second while unseen
const LASER_ALARM_RATE = 45; // points per second inside a lit grid

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.level = { ...LEVEL, playBounds: PLAY_BOUNDS };
    this.renderer = new Renderer(canvas);
    this.sound = new SoundEngine();
    this.reset();
  }

  reset() {
    this.state = 'title'; // title | playing | caught | escaped
    this.time = 0;        // clock for sweeps, pulses and lasers
    this.elapsed = 0;     // time spent inside the gallery
    this.alarm = 0;       // 0..100; 100 means caught
    this.alarmTrips = 0;  // times the meter crossed 75 (for the rating)
    this.above75 = false;
    this.laserZapped = false;
    this.caughtBy = '';
    this.banner = null;
    this.bannerUntil = 0;
    this.shotMode = null;
    this.player = new Thief(this.level.playerSpawn);
    this.guards = this.level.guards.map(g => new Guard(g));
    this.cameras = this.level.cameras.map(c => new SecurityCamera(c));
    this.lasers = this.level.lasers.map(l => new LaserGrid(l));
    this.input = {
      up: false, down: false, left: false, right: false,
      sneak: false, pick: false, lockpickTap: false,
    };
    this.lastStep = 0;
    this.wasSeen = false;
  }

  start() {
    this.reset();
    this.state = 'playing';
    this.sound.ensure();
  }

  // Recompute every cone once (used by staged screenshots after posing).
  refreshVision() {
    for (const g of this.guards) {
      g.update(0, this.time, this.player, this.level.walls);
    }
    for (const cam of this.cameras) cam.update(0, this.time, this.player, this.level.walls);
  }

  caught(guardName) {
    if (this.state !== 'playing') return;
    this.state = 'caught';
    this.caughtBy = guardName ? `${guardName} caught you under the lights.` : 'The cameras caught you under the lights.';
    this.sound.caughtSting();
    this.sound.stopAlarm();
  }

  escaped() {
    if (this.state !== 'playing') return;
    this.state = 'escaped';
    this.sound.winJingle();
    this.sound.stopAlarm();
  }

  showBanner(text, seconds) {
    this.banner = text;
    this.bannerUntil = this.time + seconds;
  }

  update(dt) {
    if (this.state !== 'playing') return;
    this.time += dt;
    this.elapsed += dt;
    const player = this.player;

    if (this.banner && this.time > this.bannerUntil) this.banner = null;

    // Tools: EMP (1) and smoke (2) fire on a key tap.
    if (this.input.empTap) {
      this.input.empTap = false;
      if (player.useEmp(this.time)) {
        for (const cam of this.cameras) cam.disabledUntil = player.empUntil;
        for (const laser of this.lasers) laser.disabledUntil = player.empUntil;
        this.sound.empBuzz();
        this.showBanner('EMP BURST — CAMERAS & LASERS OFFLINE', 2.5);
      }
    }
    if (this.input.smokeTap) {
      this.input.smokeTap = false;
      if (player.useSmoke(this.time)) {
        this.sound.smokePuff();
        this.showBanner('SMOKE OUT — THEY CANNOT SEE YOU IN IT', 2.5);
      }
    }

    // The thief moves, cracks cases, spends the lockpick.
    const stolen = player.update(dt, this.time, this.input, this.level);
    this.input.lockpickTap = false;
    if (stolen !== null && stolen !== undefined) {
      const loot = this.level.loot[stolen];
      this.sound.lootChime();
      this.showBanner(`STOLEN: ${loot.name.toUpperCase()} — $${loot.value.toLocaleString('en-US')}`, 3);
      if (player.lootCount() === 3) {
        this.showBanner('ALL THREE PAINTINGS — GET TO THE VAN!', 4);
      }
    }
    if (player.pickTarget >= 0 && Math.floor(this.time * 6) !== this.lastStep) {
      this.lastStep = Math.floor(this.time * 6);
      this.sound.pickTick();
    }
    if (player.moving && Math.floor(player.stepPhase) !== this.lastStep) {
      this.lastStep = Math.floor(player.stepPhase);
      this.sound.footstep(player.sneaking);
    }

    // Vision: every guard and camera that sees the thief feeds the meter.
    let seen = false;
    let seenBy = '';
    for (const g of this.guards) {
      const rise = g.update(dt, this.time, player, this.level.walls);
      if (g.spotted) { seen = true; seenBy = g.name; }
      this.alarm += rise;
    }
    for (const cam of this.cameras) {
      const rise = cam.update(dt, this.time, player, this.level.walls);
      if (cam.spotted) { seen = true; seenBy = seenBy || 'Camera'; }
      this.alarm += rise;
    }
    // Lasers: standing in a lit grid trips the alarm fast.
    for (const laser of this.lasers) {
      if (laser.trippedBy(player, this.time)) {
        seen = true;
        seenBy = seenBy || 'Laser grid';
        this.alarm += LASER_ALARM_RATE * dt;
        if (!this.laserZapped) {
          this.laserZapped = true;
          this.sound.laserZap();
        }
      }
    }
    if (!this.lasers.some(l => l.trippedBy(player, this.time))) this.laserZapped = false;

    if (seen && !this.wasSeen) this.sound.spottedBlip();
    this.wasSeen = seen;
    if (!seen) this.alarm = Math.max(0, this.alarm - ALARM_DECAY * dt);
    this.alarm = Math.min(100, this.alarm);
    if (this.alarm >= 75 && !this.above75) { this.alarmTrips += 1; this.above75 = true; }
    if (this.alarm < 60) this.above75 = false;
    this.sound.setAlarmLevel(this.alarm);

    if (this.alarm >= 100) {
      this.caught(seenBy);
      return;
    }

    // The getaway: all three paintings, then the van.
    if (player.atVan(this.level)) {
      if (player.lootCount() === 3) {
        this.escaped();
      } else if (!this.banner) {
        this.showBanner(`THE VAN NEEDS ALL THREE PAINTINGS — YOU HAVE ${player.lootCount()}`, 2);
      }
    }
  }

  frame(dt) {
    this.update(dt);
    this.renderer.draw(this);
  }

  run() {
    let last = performance.now();
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  bindInput() {
    const keyMap = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      ShiftLeft: 'sneak', ShiftRight: 'sneak',
      KeyE: 'pick',
    };
    window.addEventListener('keydown', e => {
      this.sound.ensure();
      if (e.code === 'Enter' && this.state === 'title') { this.start(); return; }
      if (e.code === 'KeyR' && (this.state === 'caught' || this.state === 'escaped')) {
        this.start();
        return;
      }
      if (e.code === 'KeyM') {
        this.sound.setMuted(!this.sound.muted);
        return;
      }
      if (this.state !== 'playing') return;
      const field = keyMap[e.code];
      if (field) {
        this.input[field] = true;
        e.preventDefault();
      }
      if (e.code === 'Digit1' && !e.repeat) this.input.empTap = true;
      if (e.code === 'Digit2' && !e.repeat) this.input.smokeTap = true;
      if (e.code === 'Digit3' && !e.repeat) this.input.lockpickTap = true;
    });
    window.addEventListener('keyup', e => {
      const field = keyMap[e.code];
      if (field) this.input[field] = false;
    });
    // Mouse: click the title to begin, click again after an ending.
    this.canvas.addEventListener('click', () => {
      this.sound.ensure();
      if (this.state === 'title') this.start();
      else if (this.state === 'caught' || this.state === 'escaped') this.start();
    });
  }
}

// Boot: fit the 1280x720 canvas to the window, then either stage a
// screenshot (?shot=cover|laser|camera|getaway, or window.__SHOT__) or play.
export function boot() {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  game.bindInput();
  const params = new URLSearchParams(window.location.search);
  const shot = window.__SHOT__ || params.get('shot');
  if (shot) {
    stageShot(game, shot);
    return game; // frozen frame; no loop, no audio
  }
  const fit = () => {
    const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
    canvas.style.width = Math.floor(VIEW_W * scale) + 'px';
    canvas.style.height = Math.floor(VIEW_H * scale) + 'px';
  };
  window.addEventListener('resize', fit);
  fit();
  window.__game = game; // exposed for debugging and automated play-tests
  game.run();
  return game;
}

boot();
