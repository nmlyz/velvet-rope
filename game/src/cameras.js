// cameras.js — wall cameras that sweep their cones back and forth, and the
// laser grids across the room doorways. Both feed the alarm meter; the EMP
// tool shuts both down for a few seconds.
import { lineOfSightClear, pointInVisionCone } from './geometry.js';

export const CAMERA_RANGE = 215;
export const CAMERA_HALF_ANGLE = 0.34;
export const CAMERA_SPOT_RATE = 70; // alarm per second at point blank

export class SecurityCamera {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.base = def.base;     // centre direction of the sweep (radians)
    this.sweep = def.sweep;   // sweep amplitude (radians each side)
    this.speed = def.speed;
    this.range = def.range;
    this.phase = def.phase;
    this.disabledUntil = 0;   // game time until which the EMP holds it off
    this.spotted = false;
  }

  angleAt(time) {
    return this.base + Math.sin(time * this.speed + this.phase) * this.sweep;
  }

  disabled(time) {
    return time < this.disabledUntil;
  }

  update(dt, time, player, walls) {
    if (this.disabled(time)) {
      this.spotted = false;
      return 0;
    }
    const dir = this.angleAt(time);
    const inCone = pointInVisionCone(
      player.x, player.y, this.x, this.y, dir, this.range, CAMERA_HALF_ANGLE);
    const seen = inCone &&
      lineOfSightClear(this.x, this.y, player.x, player.y, walls) &&
      !player.hiddenBySmoke(this.x, this.y);
    this.spotted = seen;
    if (!seen) return 0;
    const proximity = 1 - Math.hypot(player.x - this.x, player.y - this.y) / this.range;
    return CAMERA_SPOT_RATE * (0.4 + 0.6 * proximity) * dt;
  }

  cone(time) {
    return {
      x: this.x, y: this.y, dir: this.angleAt(time),
      range: this.range, halfAngle: CAMERA_HALF_ANGLE,
      disabled: this.disabled(time),
    };
  }
}

export class LaserGrid {
  constructor(def) {
    this.x = def.x;
    this.y0 = def.y0;
    this.y1 = def.y1;
    this.period = def.period;
    this.onTime = def.onTime;
    this.offset = def.offset;
    this.disabledUntil = 0;
  }

  // Beams are lit during the first `onTime` seconds of each cycle.
  litAt(time) {
    if (time < this.disabledUntil) return false;
    return ((time + this.offset) % this.period) < this.onTime;
  }

  // The thief trips the grid when a beam is lit and they stand on its line.
  trippedBy(player, time) {
    if (!this.litAt(time)) return false;
    return Math.abs(player.x - this.x) < player.radius + 3 &&
      player.y > this.y0 - 6 && player.y < this.y1 + 6;
  }
}
