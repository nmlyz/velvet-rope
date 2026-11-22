// geometry.js — small 2D helpers: angles, segment tests and movement collision.
// Nothing here knows about the game; every other module builds on these tests.
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Shortest signed difference between two angles, in (-PI, PI].
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// True when point (px,py) sits inside the vision cone of an observer at
// (ox,oy) facing `dir` (radians), with the given range and half-angle.
export function pointInVisionCone(px, py, ox, oy, dir, range, halfAngle) {
  const d = distance(ox, oy, px, py);
  if (d > range) return false;
  if (d < 4) return true;
  const a = Math.atan2(py - oy, px - ox);
  return Math.abs(angleDifference(a, dir)) <= halfAngle;
}

// Do the segments (x1,y1)-(x2,y2) and (x3,y3)-(x4,y4) cross (endpoints count)?
export function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
  const d2 = (x4 - x3) * (y2 - y3) - (y4 - y3) * (x2 - x3);
  const d3 = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  const d4 = (x2 - x1) * (y4 - y1) - (y2 - y1) * (x4 - x1);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
         ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

// True when the segment hits the rectangle (including a point inside it).
export function segmentHitsRect(x1, y1, x2, y2, r) {
  if (x1 >= r.x && x1 <= r.x + r.w && y1 >= r.y && y1 <= r.y + r.h) return true;
  if (x2 >= r.x && x2 <= r.x + r.w && y2 >= r.y && y2 <= r.y + r.h) return true;
  const L = r.x, R = r.x + r.w, T = r.y, B = r.y + r.h;
  return segmentsCross(x1, y1, x2, y2, L, T, R, T) ||
         segmentsCross(x1, y1, x2, y2, R, T, R, B) ||
         segmentsCross(x1, y1, x2, y2, R, B, L, B) ||
         segmentsCross(x1, y1, x2, y2, L, B, L, T);
}

// Line of sight between two points: clear when no wall rectangle blocks it.
export function lineOfSightClear(ax, ay, bx, by, walls) {
  for (const w of walls) {
    if (segmentHitsRect(ax, ay, bx, by, w)) return false;
  }
  return true;
}

// Move a circle of radius r by (dx,dy), sliding along wall rectangles and
// staying inside `bounds`. Returns the new {x, y}.
export function moveCircle(x, y, dx, dy, r, walls, bounds) {
  let nx = x + dx;
  for (const w of walls) {
    if (nx + r > w.x && nx - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) {
      nx = dx > 0 ? w.x - r : w.x + w.w + r;
    }
  }
  let ny = y + dy;
  for (const w of walls) {
    if (nx + r > w.x && nx - r < w.x + w.w && ny + r > w.y && ny - r < w.y + w.h) {
      ny = dy > 0 ? w.y - r : w.y + w.h + r;
    }
  }
  nx = clamp(nx, bounds.x + r, bounds.x + bounds.w - r);
  ny = clamp(ny, bounds.y + r, bounds.y + bounds.h - r);
  return { x: nx, y: ny };
}

// True when a circle overlaps a rectangle (used for loot, lasers, the van).
export function circleHitsRect(cx, cy, r, rect) {
  const qx = clamp(cx, rect.x, rect.x + rect.w);
  const qy = clamp(cy, rect.y, rect.y + rect.h);
  return (cx - qx) * (cx - qx) + (cy - qy) * (cy - qy) <= r * r;
}
