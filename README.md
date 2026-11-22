[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/nmlyz/velvet-rope/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/nmlyz/velvet-rope/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

# Velvet Rope

A night at the Meridian Gallery. Three masterpieces, four guards, sweeping
cameras, laser grids across the doorways, one nervous alarm meter — and a
getaway van waiting in the loading dock.

## How to play

Open `game/index.html` in a desktop browser. No build step, no network: the
game is static files that play offline.

- **WASD / arrow keys** — move the thief
- **Shift** — sneak (slower, much harder for guards and cameras to spot)
- **E (hold)** — crack a display case; stand by a roped-off painting and
  hold E for two seconds
- **1** — EMP burst: kills every camera and laser grid for 8 seconds (2 charges)
- **2** — smoke bomb: a cloud that hides you from every cone for 6 seconds (2 charges)
- **3** — lockpick: crack the case beside you instantly (1 charge)
- **M** — mute, **R** — restart after being caught or escaping

## The heist

Steal all three paintings — *The Gilded Koi* in the West Gallery,
*Portrait of the Brass Duchess* in the Central Atrium, *The Midnight
Cartographer* in the East Vault — then reach the van. Guards patrol their
own routes and sweep their vision cones at every corner; cameras sweep the
rooms; the laser grids across the two doorways pulse on a fixed cycle, so
time your crossing. Every sighting feeds the alarm meter. At 100% the doors
slam shut and the night is over. Finish with the meter low for a Ghost
rating.

## Layout

- `game/index.html` — the page; a 1280×720 canvas, keyboard and mouse
- `game/src/main.js` — boot, game loop, alarm meter, win/lose states, input
- `game/src/levels.js` — the Meridian Gallery floor plan: walls, rooms, loot, patrols, cameras, lasers, the van
- `game/src/geometry.js` — angles, vision cones, segment tests, movement collision
- `game/src/guards.js` — guard patrols, corner scans, vision and detection
- `game/src/cameras.js` — sweeping wall cameras and pulsing laser grids
- `game/src/player.js` — the thief: movement, sneaking, tools, case-cracking
- `game/src/render.js` — everything on screen: the gallery, cones, HUD, screens
- `game/src/audio.js` — synthesised WebAudio sounds: footsteps, alarm siren, chimes
- `game/src/shots.js` — staged screenshot scenes for the cover and moments
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with the vendored make.fun library

All art is drawn shapes and all sounds are synthesised in code; the game
loads nothing from the network.

## License

MIT — see `LICENSE`.
