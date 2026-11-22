// render.js — everything the player sees: the night gallery, vision cones,
// lasers, the thief, the guards, the van, the HUD with its alarm meter, and
// the title / caught / getaway screens. All art is drawn shapes, no images.
import { VIEW_W, VIEW_H, HUD_H, FLOOR, DOCK } from './levels.js';
import { EMP_DURATION, SMOKE_RADIUS } from './player.js';

const GOLD = '#c9a227';
const ROPE_RED = '#a02030';
const CONE_GUARD = 'rgba(255, 190, 60, 0.20)';
const CONE_GUARD_EDGE = 'rgba(255, 190, 60, 0.55)';
const CONE_CAMERA = 'rgba(255, 70, 70, 0.17)';
const CONE_CAMERA_EDGE = 'rgba(255, 70, 70, 0.5)';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  // A cone of light: filled wedge from the observer, with a bright edge.
  drawCone(x, y, dir, range, halfAngle, fill, edge) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x, y);
    c.arc(x, y, range, dir - halfAngle, dir + halfAngle);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(dir - halfAngle) * range, y + Math.sin(dir - halfAngle) * range);
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(dir + halfAngle) * range, y + Math.sin(dir + halfAngle) * range);
    c.strokeStyle = edge;
    c.lineWidth = 1.5;
    c.stroke();
  }

  drawFloor(level, time) {
    const c = this.ctx;
    // Parquet checker.
    const s = 46;
    for (let y = FLOOR.y; y < FLOOR.y + FLOOR.h; y += s) {
      for (let x = FLOOR.x; x < FLOOR.x + FLOOR.w; x += s) {
        const even = ((x - FLOOR.x) / s + (y - FLOOR.y) / s) % 2 === 0;
        c.fillStyle = even ? '#211b31' : '#1a1526';
        c.fillRect(x, y, s, s);
      }
    }
    // Red carpet runner from the exit door up through the atrium.
    c.fillStyle = '#5d1420';
    c.fillRect(596, 300, 88, 286);
    c.strokeStyle = GOLD;
    c.lineWidth = 2;
    c.strokeRect(596, 300, 88, 286);
    // Loading dock: concrete, with a yellow parking box for the van.
    c.fillStyle = '#26262e';
    c.fillRect(DOCK.x, DOCK.y, DOCK.w, DOCK.h);
    c.strokeStyle = '#c9a227';
    c.setLineDash([10, 8]);
    c.strokeRect(576, 610, 128, 74);
    c.setLineDash([]);
    // Room labels on the floor.
    c.fillStyle = 'rgba(201, 162, 39, 0.5)';
    c.font = '600 13px Georgia, serif';
    c.textAlign = 'left';
    for (const r of level.rooms) c.fillText(r.label, r.x, r.y);
  }

  drawWalls(level) {
    const c = this.ctx;
    for (const w of level.walls) {
      c.fillStyle = '#3a3247';
      c.fillRect(w.x, w.y, w.w, w.h);
      c.fillStyle = '#574a6b';
      c.fillRect(w.x, w.y, w.w, 3);
    }
    // Gold trim on the outer frame.
    c.strokeStyle = GOLD;
    c.lineWidth = 2;
    c.strokeRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);
  }

  drawWallArt(level) {
    const c = this.ctx;
    for (const a of level.wallArt) {
      c.fillStyle = '#6b5320';
      c.fillRect(a.x - 4, a.y - 4, a.w + 8, a.h + 8);
      c.fillStyle = a.hue;
      c.fillRect(a.x, a.y, a.w, a.h);
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.fillRect(a.x, a.y, a.w, a.h / 3);
    }
  }

  // The little framed picture that sits on a loot pedestal.
  drawMiniPainting(x, y, w, h, loot, time) {
    const c = this.ctx;
    c.fillStyle = '#6b5320';
    c.fillRect(x - 3, y - 3, w + 6, h + 6);
    if (loot.id === 0) {
      c.fillStyle = '#0f5a52';
      c.fillRect(x, y, w, h);
      c.strokeStyle = loot.glow;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(x + w / 2, y + h / 2, 9, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.arc(x + w / 2 - 8, y + h / 2 + 4, 5, 0, Math.PI * 2);
      c.stroke();
    } else if (loot.id === 1) {
      c.fillStyle = '#3a1f4d';
      c.fillRect(x, y, w, h);
      c.fillStyle = loot.glow;
      c.beginPath();
      c.arc(x + w / 2, y + h / 2 - 3, 7, 0, Math.PI * 2);
      c.fill();
      c.fillRect(x + w / 2 - 9, y + h / 2 + 4, 18, 10);
    } else {
      c.fillStyle = '#12264d';
      c.fillRect(x, y, w, h);
      c.strokeStyle = loot.glow;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(x + 3, y + h - 4);
      c.lineTo(x + w / 2, y + 5);
      c.lineTo(x + w - 3, y + h - 6);
      c.stroke();
      c.beginPath();
      c.moveTo(x + 3, y + 6);
      c.lineTo(x + w - 3, y + h - 4);
      c.stroke();
    }
    // Glow pulse so a loot target reads at a glance.
    const pulse = 0.25 + 0.15 * Math.sin(time * 3);
    c.strokeStyle = loot.glow;
    c.globalAlpha = pulse + 0.25;
    c.lineWidth = 3;
    c.strokeRect(x - 3, y - 3, w + 6, h + 6);
    c.globalAlpha = 1;
  }

  drawPedestals(level, player, time) {
    const c = this.ctx;
    for (const p of level.pedestals) {
      // Marble plinth.
      c.fillStyle = '#cfc8b8';
      c.fillRect(p.x, p.y, p.w, p.h);
      c.fillStyle = '#8f887a';
      c.fillRect(p.x, p.y + p.h - 6, p.w, 6);
      if (p.loot >= 0) {
        const loot = level.loot[p.loot];
        if (!player.hasLoot(p.loot)) {
          this.drawMiniPainting(p.x + 7, p.y + 7, p.w - 14, p.h - 14, loot, time);
          // Velvet rope ring around a live target.
          c.strokeStyle = ROPE_RED;
          c.lineWidth = 3;
          c.strokeRect(p.x - 12, p.y - 12, p.w + 24, p.h + 24);
          c.fillStyle = GOLD;
          for (const [gx, gy] of [
            [p.x - 12, p.y - 12], [p.x + p.w + 12, p.y - 12],
            [p.x - 12, p.y + p.h + 12], [p.x + p.w + 12, p.y + p.h + 12]]) {
            c.beginPath();
            c.arc(gx, gy, 3, 0, Math.PI * 2);
            c.fill();
          }
          c.fillStyle = loot.glow;
          c.font = '700 11px Georgia, serif';
          c.textAlign = 'center';
          c.fillText('★ ' + loot.name.toUpperCase(), p.x + p.w / 2, p.y - 20);
        } else {
          c.fillStyle = 'rgba(0,0,0,0.35)';
          c.fillRect(p.x + 7, p.y + 7, p.w - 14, p.h - 14);
          c.fillStyle = '#8f887a';
          c.font = '700 10px Georgia, serif';
          c.textAlign = 'center';
          c.fillText('EMPTY', p.x + p.w / 2, p.y - 18);
        }
      } else {
        // Lesser piece: a small vase silhouette.
        c.fillStyle = '#5a4a6b';
        c.beginPath();
        c.arc(p.x + p.w / 2, p.y + p.h / 2, 9, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.textAlign = 'left';
  }

  drawLasers(lasers, time) {
    const c = this.ctx;
    for (const g of lasers) {
      const lit = g.litAt(time);
      // Emitter boxes on the doorway edges.
      c.fillStyle = '#333';
      c.fillRect(g.x - 8, g.y0 - 6, 16, 10);
      c.fillRect(g.x - 8, g.y1 - 4, 16, 10);
      if (lit) {
        c.strokeStyle = 'rgba(255, 40, 40, 0.9)';
        c.lineWidth = 2;
        c.shadowColor = '#ff2020';
        c.shadowBlur = 10;
        for (let y = g.y0; y <= g.y1; y += 12) {
          c.beginPath();
          c.moveTo(g.x - 5, y);
          c.lineTo(g.x + 5, y);
          c.stroke();
        }
        c.shadowBlur = 0;
        c.fillStyle = '#ff5050';
        c.font = '700 10px Georgia, serif';
        c.textAlign = 'left';
        c.fillText('LASER', g.x + 12, g.y1 + 18);
        c.textAlign = 'left';
      } else {
        c.strokeStyle = 'rgba(255, 40, 40, 0.18)';
        c.setLineDash([4, 6]);
        c.beginPath();
        c.moveTo(g.x, g.y0);
        c.lineTo(g.x, g.y1);
        c.stroke();
        c.setLineDash([]);
      }
      c.textAlign = 'left';
    }
  }

  drawCameras(cameras, time) {
    const c = this.ctx;
    for (const cam of cameras) {
      const cone = cam.cone(time);
      if (!cone.disabled) {
        this.drawCone(cone.x, cone.y, cone.dir, cone.range, cone.halfAngle,
          cam.spotted ? 'rgba(255, 70, 70, 0.32)' : CONE_CAMERA,
          cam.spotted ? 'rgba(255, 70, 70, 0.85)' : CONE_CAMERA_EDGE);
      }
      // Wall-mounted camera body.
      c.save();
      c.translate(cam.x, cam.y);
      c.rotate(cone.dir);
      c.fillStyle = cone.disabled ? '#555' : '#222';
      c.fillRect(-4, -6, 18, 12);
      c.fillStyle = cone.disabled ? '#777' : '#ff4040';
      c.beginPath();
      c.arc(14, 0, 4, 0, Math.PI * 2);
      c.fill();
      c.restore();
      if (cone.disabled) {
        c.fillStyle = '#9fb3c8';
        c.font = '700 10px Georgia, serif';
        c.textAlign = 'center';
        c.fillText('OFFLINE', cam.x, cam.y - 14);
        c.textAlign = 'left';
      }
    }
  }

  drawGuards(guards, time) {
    const c = this.ctx;
    for (const g of guards) {
      const cone = g.cone(time);
      const fill = g.spotted
        ? 'rgba(255, 90, 40, 0.38)'
        : `rgba(255, 190, 60, ${0.14 + g.alert / 100 * 0.14})`;
      this.drawCone(cone.x, cone.y, cone.dir, cone.range, cone.halfAngle, fill,
        g.spotted ? 'rgba(255, 90, 40, 0.9)' : CONE_GUARD_EDGE);
      // Guard: navy uniform, cap, flashlight beam tick.
      c.fillStyle = '#2b3a5a';
      c.beginPath();
      c.arc(g.x, g.y, 13, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#e8c9a0';
      c.beginPath();
      c.arc(g.x, g.y, 6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#1a2438';
      c.beginPath();
      c.arc(g.x, g.y, 7, cone.dir - 1.1, cone.dir + 1.1);
      c.fill();
      c.fillStyle = '#d8c08a';
      c.beginPath();
      c.arc(g.x + Math.cos(cone.dir) * 15, g.y + Math.sin(cone.dir) * 15, 2.5, 0, Math.PI * 2);
      c.fill();
      if (g.spotted || g.alert > 55) {
        c.fillStyle = g.spotted ? '#ff5030' : '#ffb03a';
        c.font = '900 22px Georgia, serif';
        c.textAlign = 'center';
        c.fillText('!', g.x, g.y - 20);
        c.textAlign = 'left';
      }
      // Name tag under the patrol.
      c.fillStyle = 'rgba(232, 201, 160, 0.75)';
      c.font = '10px Georgia, serif';
      c.textAlign = 'center';
      c.fillText(g.name.toUpperCase(), g.x, g.y + 26);
      c.textAlign = 'left';
    }
  }

  drawVan(level, player, time) {
    const c = this.ctx;
    const v = level.van;
    // Getaway van, parked in the dock.
    c.fillStyle = '#20242e';
    c.fillRect(v.x, v.y, v.w, v.h);
    c.fillStyle = '#3a4256';
    c.fillRect(v.x + 62, v.y + 6, 34, 22); // cab window
    c.fillStyle = GOLD;
    c.font = '700 11px Georgia, serif';
    c.textAlign = 'center';
    c.fillText('GETAWAY', v.x + v.w / 2, v.y + 22);
    c.fillText('VAN', v.x + v.w / 2, v.y + 36);
    c.fillStyle = '#111';
    c.beginPath();
    c.arc(v.x + 22, v.y + v.h - 2, 9, 0, Math.PI * 2);
    c.arc(v.x + v.w - 22, v.y + v.h - 2, 9, 0, Math.PI * 2);
    c.fill();
    c.textAlign = 'left';
    // Headlight glow when the thief is close with the loot.
    if (player.lootCount() === 3) {
      const pulse = 0.35 + 0.15 * Math.sin(time * 4);
      c.fillStyle = `rgba(255, 220, 120, ${pulse})`;
      c.beginPath();
      c.moveTo(v.x + v.w / 2, v.y);
      c.lineTo(v.x + v.w / 2 - 30, v.y - 26);
      c.lineTo(v.x + v.w / 2 + 30, v.y - 26);
      c.closePath();
      c.fill();
    }
  }

  drawThief(player, time) {
    const c = this.ctx;
    // Smoke clouds first (they hide the thief).
    for (const s of player.smokes) {
      const left = Math.max(0, (s.until - time) / 6);
      const grad = c.createRadialGradient(s.x, s.y, 10, s.x, s.y, SMOKE_RADIUS);
      grad.addColorStop(0, `rgba(150, 150, 165, ${0.38 * left})`);
      grad.addColorStop(1, 'rgba(150, 150, 165, 0)');
      c.fillStyle = grad;
      c.beginPath();
      c.arc(s.x, s.y, SMOKE_RADIUS, 0, Math.PI * 2);
      c.fill();
    }
    // A warm pool of light under the thief, so the hero reads at a glance.
    const pool = c.createRadialGradient(player.x, player.y, 4, player.x, player.y, 36);
    pool.addColorStop(0, 'rgba(255, 220, 150, 0.22)');
    pool.addColorStop(1, 'rgba(255, 220, 150, 0)');
    c.fillStyle = pool;
    c.beginPath();
    c.arc(player.x, player.y, 36, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(201, 162, 39, 0.65)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2);
    c.stroke();
    const bob = player.moving ? Math.sin(player.stepPhase) * 1.5 : 0;
    const x = player.x;
    const y = player.y + bob;
    // Shadow.
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.beginPath();
    c.ellipse(x, player.y + 12, 12, 5, 0, 0, Math.PI * 2);
    c.fill();
    // Body: dark coat.
    c.fillStyle = '#1c1c26';
    c.beginPath();
    c.arc(x, y, player.radius, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#3d3d52';
    c.lineWidth = 2;
    c.stroke();
    // Loot bag slung on the back, heavier with each painting.
    if (player.lootCount() > 0) {
      c.fillStyle = '#6b5320';
      c.beginPath();
      c.arc(x - 10, y + 6, 4 + player.lootCount() * 2, 0, Math.PI * 2);
      c.fill();
    }
    // Face: pale mask band, cap with brim toward the facing.
    c.fillStyle = '#e8d8b8';
    c.beginPath();
    c.arc(x, y - 2, 5.5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#111';
    c.fillRect(x - 5.5, y - 4, 11, 3.5); // mask band
    c.fillStyle = '#222';
    c.beginPath();
    c.arc(x, y - 3, 6, Math.PI, 0);
    c.fill();
    c.fillRect(x - 6, y - 4, 12, 2.5);
    c.beginPath();
    c.moveTo(x, y - 3);
    c.lineTo(x + Math.cos(player.facing) * 12, y - 3 + Math.sin(player.facing) * 12);
    c.lineWidth = 3;
    c.strokeStyle = '#222';
    c.stroke();
    // Sneak indicator.
    if (player.sneaking) {
      c.fillStyle = 'rgba(160, 220, 255, 0.9)';
      c.font = '700 10px Georgia, serif';
      c.textAlign = 'center';
      c.fillText('SNEAKING', x, y - 20);
      c.textAlign = 'left';
    }
    // Lockpick progress ring around the thief.
    if (player.pickTarget >= 0 && player.pickProgress > 0) {
      c.strokeStyle = GOLD;
      c.lineWidth = 4;
      c.beginPath();
      c.arc(x, y, 20, -Math.PI / 2, -Math.PI / 2 + player.pickProgress * Math.PI * 2);
      c.stroke();
      c.fillStyle = GOLD;
      c.font = '700 11px Georgia, serif';
      c.textAlign = 'center';
      c.fillText('CRACKING THE CASE…', x, y - 26);
      c.textAlign = 'left';
    }
  }

  drawHud(game) {
    const c = this.ctx;
    const player = game.player;
    const level = game.level;
    // Top bar.
    c.fillStyle = '#0d0a14';
    c.fillRect(0, 0, VIEW_W, HUD_H);
    c.fillStyle = GOLD;
    c.fillRect(0, HUD_H - 2, VIEW_W, 2);
    // Title block.
    c.fillStyle = GOLD;
    c.font = '900 22px Georgia, serif';
    c.textAlign = 'left';
    c.fillText('VELVET ROPE', 16, 28);
    c.fillStyle = '#9a8fc0';
    c.font = '11px Georgia, serif';
    c.fillText('THE MERIDIAN GALLERY — NIGHT', 16, 48);
    // Alarm meter: the big one, centre top.
    const ax = 400, ay = 18, aw = 380, ah = 22;
    c.fillStyle = game.alarm > 70 && Math.sin(game.time * 8) > 0 ? '#ff4030' : '#e8dcc0';
    c.font = '900 15px Georgia, serif';
    c.fillText('ALARM', ax, ay + 16);
    c.fillStyle = '#222';
    c.fillRect(ax + 70, ay, aw, ah);
    const frac = game.alarm / 100;
    const grad = c.createLinearGradient(ax + 70, 0, ax + 70 + aw, 0);
    grad.addColorStop(0, '#3fae5a');
    grad.addColorStop(0.5, '#e8b64c');
    grad.addColorStop(1, '#e8382a');
    c.fillStyle = grad;
    c.fillRect(ax + 70, ay, aw * frac, ah);
    c.strokeStyle = '#e8dcc0';
    c.lineWidth = 1.5;
    c.strokeRect(ax + 70, ay, aw, ah);
    c.fillStyle = '#fff';
    c.font = '900 15px Georgia, serif';
    c.fillText(Math.round(game.alarm) + '%', ax + 70 + aw + 10, ay + 16);
    // Loot frames, right side, top row.
    let lx = 900;
    c.fillStyle = '#e8dcc0';
    c.font = '900 13px Georgia, serif';
    c.fillText('LOOT', lx, ay + 15);
    lx += 48;
    for (let i = 0; i < 3; i++) {
      const loot = level.loot[i];
      c.fillStyle = '#6b5320';
      c.fillRect(lx, ay - 2, 34, 26);
      if (player.hasLoot(i)) {
        c.fillStyle = loot.hue;
        c.fillRect(lx + 3, ay + 1, 28, 20);
        c.fillStyle = '#fff';
        c.font = '900 14px Georgia, serif';
        c.fillText('✓', lx + 12, ay + 17);
      } else {
        c.fillStyle = 'rgba(255,255,255,0.25)';
        c.font = '11px Georgia, serif';
        c.fillText('?', lx + 13, ay + 16);
      }
      lx += 40;
    }
    // Timer, far right, top row.
    const t = Math.floor(game.elapsed);
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(t % 60).padStart(2, '0');
    c.fillStyle = '#e8dcc0';
    c.font = '900 15px Georgia, serif';
    c.fillText(`TIME ${mm}:${ss}`, 1150, ay + 16);
    // Tools, right side, bottom row.
    c.fillStyle = '#9a8fc0';
    c.font = '13px Georgia, serif';
    const toolText = `EMP ×${player.tools.emp} [1]    SMOKE ×${player.tools.smoke} [2]    PICK ×${player.tools.lockpick} [3]`;
    c.fillText(toolText, 900, ay + 42);
    // EMP active banner.
    if (game.time < player.empUntil) {
      c.fillStyle = 'rgba(120, 200, 255, 0.9)';
      c.font = '900 14px Georgia, serif';
      c.textAlign = 'center';
      c.fillText('◉ EMP ACTIVE — CAMERAS & LASERS OFFLINE', VIEW_W / 2, HUD_H + 22);
      c.textAlign = 'left';
    }
    // Bottom hint bar.
    c.fillStyle = '#0d0a14';
    c.fillRect(0, VIEW_H - 28, VIEW_W, 28);
    c.fillStyle = '#9a8fc0';
    c.font = '12px Georgia, serif';
    c.textAlign = 'center';
    c.fillText('WASD / ARROWS move   ·   SHIFT sneak   ·   E hold to crack a case   ·   1 EMP   ·   2 smoke   ·   3 lockpick   ·   M mute   ·   R restart',
      VIEW_W / 2, VIEW_H - 9);
    c.textAlign = 'left';
  }

  drawCentrePanel(title, lines, accent) {
    const c = this.ctx;
    c.fillStyle = 'rgba(8, 6, 14, 0.82)';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.fillStyle = accent;
    c.font = '900 54px Georgia, serif';
    c.textAlign = 'center';
    c.fillText(title, VIEW_W / 2, 250);
    c.fillStyle = '#e8dcc0';
    c.font = '18px Georgia, serif';
    lines.forEach((line, i) => c.fillText(line, VIEW_W / 2, 300 + i * 30));
    c.textAlign = 'left';
  }

  drawTitle(game) {
    this.drawCentrePanel('VELVET ROPE', [
      'A night at the Meridian Gallery. Three masterpieces. Four guards.',
      'Cameras, lasers and one very nervous alarm meter.',
      'Steal all three paintings, then reach the getaway van.',
      '',
      'WASD move · SHIFT sneak · E crack a case · 1 EMP · 2 smoke · 3 lockpick',
      '',
      'CLICK OR PRESS ENTER TO BEGIN THE HEIST',
    ], GOLD);
  }

  drawCaught(game) {
    this.drawCentrePanel('CAUGHT!', [
      game.caughtBy || 'The night watch found you.',
      `Loot taken: ${game.player.lootCount()} of 3 paintings.`,
      'The alarm hit 100% — the gallery doors slammed shut.',
      '',
      'PRESS R TO TRY AGAIN',
    ], '#ff4030');
  }

  drawEscaped(game) {
    const haul = game.player.loot.reduce((s, id) => s + game.level.loot[id].value, 0);
    const t = Math.floor(game.elapsed);
    const rating = game.alarmTrips === 0 ? 'GHOST — never seen once'
      : game.alarmTrips <= 2 ? 'SMOOTH — barely a whisper'
      : 'LOUD — but the paintings are gone';
    this.drawCentrePanel('CLEAN GETAWAY', [
      `Haul: $${haul.toLocaleString('en-US')} across ${game.player.lootCount()} masterpieces.`,
      `Time in the gallery: ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}  ·  Alarms tripped: ${game.alarmTrips}.`,
      `Rating: ${rating}.`,
      '',
      'The van is already three streets away. The Meridian will notice in the morning.',
      '',
      'PRESS R TO RUN IT AGAIN',
    ], GOLD);
  }

  draw(game) {
    const c = this.ctx;
    const level = game.level;
    const time = game.time;
    c.clearRect(0, 0, VIEW_W, VIEW_H);
    c.fillStyle = '#0d0a14';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    this.drawFloor(level, time);
    this.drawLasers(game.lasers, time);
    this.drawCameras(game.cameras, time);
    this.drawGuards(game.guards, time);
    this.drawWalls(level);
    this.drawWallArt(level);
    this.drawPedestals(level, game.player, time);
    this.drawVan(level, game.player, time);
    this.drawThief(game.player, time);
    // Night vignette.
    const vg = c.createRadialGradient(
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    c.fillStyle = vg;
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    this.drawHud(game);
    if (game.state === 'title') this.drawTitle(game);
    if (game.state === 'caught') this.drawCaught(game);
    if (game.state === 'escaped') this.drawEscaped(game);
    if (game.state === 'playing' && game.banner) {
      c.font = '900 20px Georgia, serif';
      const w = c.measureText(game.banner).width;
      c.fillStyle = 'rgba(8, 6, 14, 0.78)';
      c.fillRect(VIEW_W / 2 - w / 2 - 14, 84, w + 28, 32);
      c.strokeStyle = GOLD;
      c.lineWidth = 1;
      c.strokeRect(VIEW_W / 2 - w / 2 - 14, 84, w + 28, 32);
      c.fillStyle = 'rgba(201, 162, 39, 0.95)';
      c.textAlign = 'center';
      c.fillText(game.banner, VIEW_W / 2, 108);
      c.textAlign = 'left';
    }
  }
}
