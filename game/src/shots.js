// shots.js — deterministic staged scenes for the screenshots. Each shot
// freezes the simulation at one hand-picked moment and renders a single
// frame, so the cover shows the whole heist at a glance: the thief crossing
// the gallery, guards with vision cones, cameras, a loot target and the
// alarm meter, all in one frame.
export const SHOT_NAMES = ['cover', 'laser', 'camera', 'getaway'];

// Position guards and cameras for a readable composition: cones fanning
// across the room, nobody overlapping the thief or the loot.
function poseGuards(game, poses) {
  game.guards.forEach((g, i) => {
    const p = poses[i];
    if (!p) return;
    g.x = p[0]; g.y = p[1];
    g.facing = p[2];
    g.pausing = 999; // frozen mid-scan
    g.alert = p[3] || 0;
    g.spotted = !!p[4];
  });
}

export function stageShot(game, name) {
  const level = game.level;
  const player = game.player;
  game.state = 'playing';
  game.shotMode = name;
  // A fixed clock keeps every cone, laser and pulse identical each run.
  game.time = 1.6;
  game.elapsed = 0;
  game.banner = null;

  if (name === 'cover') {
    // The hero frame: thief mid-gallery on the carpet, one painting already
    // in the bag, alarm a third up, cones sweeping all three rooms.
    player.x = 640; player.y = 430;
    player.facing = Math.PI / 2;
    player.loot = [1];
    player.tools = { emp: 1, smoke: 2, lockpick: 1 };
    game.alarm = 38;
    game.elapsed = 96;
    game.time = 1.6;
    poseGuards(game, [
      [300, 200, Math.PI / 2, 20, false],
      [760, 180, Math.PI, 45, false],
      [1000, 340, -Math.PI / 2, 10, false],
      [470, 354, 0, 70, true],
    ]);
    // Cameras mid-sweep, lasers lit.
    game.cameras[0].phase = 0.9;
    game.cameras[1].phase = 0.4;
    game.cameras[2].phase = 2.6;
    game.cameras[0].spotted = false;
    game.cameras[1].spotted = true;
    game.cameras[2].spotted = false;
    game.banner = 'ONE DOWN, TWO TO GO — STAY OUT OF THE CONES';
  } else if (name === 'laser') {
    // Near-miss at the east doorway: thief darting through the lit grid,
    // alarm spiking, a guard turning toward the doorway.
    player.x = 826; player.y = 354;
    player.facing = 0;
    player.loot = [0, 1];
    player.tools = { emp: 0, smoke: 1, lockpick: 0 };
    game.alarm = 71;
    game.elapsed = 187;
    game.time = 1.3; // both doorway grids lit in this part of the cycle
    poseGuards(game, [
      [300, 200, Math.PI / 2, 0, false],
      [700, 260, 0, 80, true],
      [1100, 420, Math.PI, 30, false],
      [900, 354, Math.PI, 55, false],
    ]);
    game.cameras[0].spotted = false;
    game.cameras[1].spotted = false;
    game.cameras[2].spotted = false;
    game.banner = 'LASER GRID LIT — RUN THE GAP';
  } else if (name === 'camera') {
    // Cone dodge: thief crouched in smoke behind the vault pedestal while
    // the east camera sweeps past, a guard's cone just missing them.
    player.x = 980; player.y = 470;
    player.facing = -Math.PI / 2;
    player.sneaking = true;
    player.loot = [0, 1];
    player.tools = { emp: 2, smoke: 1, lockpick: 1 };
    player.smokes = [{ x: 980, y: 470, until: 99 }];
    game.alarm = 24;
    game.elapsed = 243;
    game.time = 2.2;
    poseGuards(game, [
      [300, 200, Math.PI / 2, 0, false],
      [700, 300, Math.PI / 2, 15, false],
      [1150, 200, Math.PI, 40, false],
      [1080, 354, -Math.PI / 2, 5, false],
    ]);
    game.cameras[1].phase = 1.9; // cone sweeping right past the thief
    game.cameras[1].spotted = false;
    game.banner = 'HOLD STILL — THE CAMERA IS SWEEPING PAST';
  } else if (name === 'getaway') {
    // The payoff: all three paintings in the bag, thief at the van, guards
    // far behind, alarm fading.
    player.x = 640; player.y = 604;
    player.facing = Math.PI / 2;
    player.loot = [0, 1, 2];
    player.tools = { emp: 0, smoke: 0, lockpick: 0 };
    game.alarm = 12;
    game.elapsed = 301;
    game.alarmTrips = 1;
    game.time = 1.6;
    poseGuards(game, [
      [200, 140, Math.PI, 90, true],
      [520, 200, Math.PI / 2, 90, true],
      [900, 200, -Math.PI / 2, 60, false],
      [760, 500, Math.PI, 70, true],
    ]);
    game.cameras[0].spotted = false;
    game.cameras[1].spotted = false;
    game.cameras[2].spotted = false;
    game.banner = 'ALL THREE PAINTINGS — GO, GO, GO!';
  }
  // Refresh every cone from the staged poses, then render one frozen frame.
  game.refreshVision();
  game.renderer.draw(game);
}
