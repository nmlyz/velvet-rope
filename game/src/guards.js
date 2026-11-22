// guards.js — the night watch. Each guard walks a waypoint loop, pauses at
// each corner to look around, and watches a vision cone. Spotting the thief
// raises the alarm; the closer the thief, the faster it climbs.
import { angleDifference, distance, lineOfSightClear, pointInVisionCone } from './geometry.js';

export const GUARD_RANGE = 175;
export const GUARD_HALF_ANGLE = 0.42; // ~24 degrees each side
export const GUARD_SPOT_RATE = 55;    // alarm points per second at point blank
export const SNEAK_FACTOR = 0.4;      // sneaking slows detection this much

export class Guard {
  constructor(def) {
    this.name = def.name;
    this.room = def.room;
    this.speed = def.speed;
    this.pauseTime = def.pause;
    this.waypoints = def.waypoints.map(([x, y]) => ({ x, y }));
    this.pingPong = !!def.pingPong;
    this.wp = 0;
    this.dir = 1; // waypoint direction (ping-pong patrols reverse)
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.facing = Math.PI / 2;
    this.pausing = 0;
    this.scanPhase = Math.random() * Math.PI * 2;
    this.alert = 0;      // 0..1, how sure this guard is right now
    this.spotted = false; // currently has the thief in its cone
  }

  // Where this guard is looking right now (its cone centre line).
  lookDirection(time) {
    if (this.pausing > 0) {
      // Paused at a corner: sweep the head slowly, left and right.
      return this.facing + Math.sin(time * 1.4 + this.scanPhase) * 0.55;
    }
    return this.facing;
  }

  update(dt, time, player, walls) {
    // Patrol: walk to the next waypoint, pause, then move on.
    if (this.pausing > 0) {
      this.pausing -= dt;
    } else {
      const target = this.waypoints[this.wp];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) {
        this.pausing = this.pauseTime;
        if (this.pingPong) {
          if (this.wp === this.waypoints.length - 1) this.dir = -1;
          if (this.wp === 0) this.dir = 1;
          this.wp += this.dir;
        } else {
          this.wp = (this.wp + 1) % this.waypoints.length;
        }
      } else {
        const step = Math.min(d, this.speed * dt);
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
        this.facing = Math.atan2(dy, dx);
      }
    }

    // Vision: cone + clear line of sight + not hidden in smoke.
    const dir = this.lookDirection(time);
    const inCone = pointInVisionCone(
      player.x, player.y, this.x, this.y, dir, GUARD_RANGE, GUARD_HALF_ANGLE);
    const seen = inCone &&
      lineOfSightClear(this.x, this.y, player.x, player.y, walls) &&
      !player.hiddenBySmoke(this.x, this.y);
    this.spotted = seen;

    // Alert builds while seen, fades while unseen. Proximity matters: a
    // thief at arm's length is spotted almost at once, one at the cone's
    // far edge only slowly.
    const proximity = seen
      ? 1 - distance(this.x, this.y, player.x, player.y) / GUARD_RANGE
      : 0;
    const rate = seen
      ? (GUARD_SPOT_RATE * (0.35 + 0.65 * proximity)) *
        (player.sneaking ? SNEAK_FACTOR : 1)
      : -30;
    this.alert = Math.max(0, Math.min(100, this.alert + rate * dt));
    return seen ? rate * dt : 0;
  }

  // Cone the renderer draws (same numbers the logic uses).
  cone(time) {
    return {
      x: this.x, y: this.y, dir: this.lookDirection(time),
      range: GUARD_RANGE, halfAngle: GUARD_HALF_ANGLE, alert: this.alert,
    };
  }
}
