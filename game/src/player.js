// player.js — the thief. Walks with WASD or arrows, sneaks with Shift,
// cracks a display case by holding E (or instantly with a lockpick), and
// spends tools: EMP to kill cameras and lasers, smoke to vanish from cones.
import { circleHitsRect, clamp, moveCircle } from './geometry.js';

export const THIEF_SPEED = 165;
export const THIEF_SNEAK_SPEED = 92;
export const PICK_TIME = 2.0;      // seconds holding E to crack a case
export const EMP_DURATION = 8;     // seconds cameras and lasers stay dead
export const SMOKE_DURATION = 6;
export const SMOKE_RADIUS = 95;

export class Thief {
  constructor(spawn) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.radius = 12;
    this.facing = -Math.PI / 2;
    this.sneaking = false;
    this.moving = false;
    this.stepPhase = 0;
    this.tools = { emp: 2, smoke: 2, lockpick: 1 };
    this.loot = [];          // ids of stolen masterpieces
    this.pickTarget = -1;    // loot id currently being cracked, else -1
    this.pickProgress = 0;   // 0..1
    this.smokes = [];        // {x, y, until}
    this.empUntil = 0;
    this.alarmTrips = 0;
  }

  hasLoot(id) {
    return this.loot.includes(id);
  }

  lootCount() {
    return this.loot.length;
  }

  // True when this point is inside one of the thief's smoke clouds.
  hiddenBySmoke(x, y) {
    return this.smokes.some(s => Math.hypot(x - s.x, y - s.y) < SMOKE_RADIUS);
  }

  inSmoke() {
    return this.hiddenBySmoke(this.x, this.y);
  }

  // Nearest uncracked loot pedestal within reach (48 px of its edge).
  nearLoot(level) {
    for (const p of level.pedestals) {
      if (p.loot < 0 || this.hasLoot(p.loot)) continue;
      const cx = clamp(this.x, p.x, p.x + p.w);
      const cy = clamp(this.y, p.y, p.y + p.h);
      if (Math.hypot(this.x - cx, this.y - cy) < 46) return p.loot;
    }
    return -1;
  }

  useEmp(time) {
    if (this.tools.emp <= 0) return false;
    this.tools.emp -= 1;
    this.empUntil = time + EMP_DURATION;
    return true;
  }

  useSmoke(time) {
    if (this.tools.smoke <= 0) return false;
    this.tools.smoke -= 1;
    this.smokes.push({ x: this.x, y: this.y, until: time + SMOKE_DURATION });
    return true;
  }

  // Instant crack with a lockpick, or start/continue the slow crack.
  tryPick(level, dt, holdingE, lockpickTap) {
    const target = this.nearLoot(level);
    if (target < 0) {
      this.pickTarget = -1;
      this.pickProgress = 0;
      return null;
    }
    if (lockpickTap && this.tools.lockpick > 0) {
      this.tools.lockpick -= 1;
      this.loot.push(target);
      this.pickTarget = -1;
      this.pickProgress = 0;
      return target;
    }
    if (holdingE) {
      if (this.pickTarget !== target) {
        this.pickTarget = target;
        this.pickProgress = 0;
      }
      this.pickProgress += dt / PICK_TIME;
      if (this.pickProgress >= 1) {
        this.loot.push(target);
        this.pickTarget = -1;
        this.pickProgress = 0;
        return target;
      }
    } else {
      this.pickTarget = -1;
      this.pickProgress = 0;
    }
    return null;
  }

  update(dt, time, input, level) {
    // Movement: WASD or arrows; Shift sneaks (slower, harder to spot).
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    this.moving = mx !== 0 || my !== 0;
    this.sneaking = !!input.sneak && this.moving;
    if (this.moving) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
      this.facing = Math.atan2(my, mx);
      const speed = this.sneaking ? THIEF_SNEAK_SPEED : THIEF_SPEED;
      const next = moveCircle(
        this.x, this.y, mx * speed * dt, my * speed * dt,
        this.radius, level.walls, level.playBounds);
      // Pedestals are solid too.
      const blocked = level.pedestals.some(p =>
        circleHitsRect(next.x, next.y, this.radius, p));
      if (!blocked) {
        this.x = next.x;
        this.y = next.y;
      } else {
        // Try sliding on each axis alone.
        const sx = moveCircle(this.x, this.y, mx * speed * dt, 0,
          this.radius, level.walls, level.playBounds);
        if (!level.pedestals.some(p => circleHitsRect(sx.x, sx.y, this.radius, p))) {
          this.x = sx.x;
        } else {
          const sy = moveCircle(this.x, this.y, 0, my * speed * dt,
            this.radius, level.walls, level.playBounds);
          if (!level.pedestals.some(p => circleHitsRect(sy.x, sy.y, this.radius, p))) {
            this.y = sy.y;
          }
        }
      }
      this.stepPhase += dt * (this.sneaking ? 6 : 11);
    }

    // Smoke clouds fade out.
    this.smokes = this.smokes.filter(s => time < s.until);
    return this.tryPick(level, dt, input.pick, input.lockpickTap);
  }

  // Standing in the van zone with every masterpiece: the getaway.
  atVan(level) {
    return circleHitsRect(this.x, this.y, this.radius, level.vanZone);
  }
}
