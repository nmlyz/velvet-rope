// levels.js — the Meridian Gallery floor plan: walls, rooms, loot, patrols,
// cameras, laser doorways and the getaway van. One level, three rooms, three
// masterpieces; every route through it is drawn from this data alone.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 64;
export const FLOOR = { x: 40, y: 64, w: 1200, h: 536 }; // museum interior
export const DOCK = { x: 40, y: 600, w: 1200, h: 92 };  // street strip, van parks here
export const PLAY_BOUNDS = { x: 40, y: 64, w: 1200, h: 628 };

export const LEVEL = {
  name: 'The Meridian Gallery',
  // Solid wall rectangles. Doorways are gaps between segments.
  walls: [
    { x: 40, y: 64, w: 1200, h: 14 },    // north wall
    { x: 40, y: 64, w: 14, h: 536 },     // west wall
    { x: 1226, y: 64, w: 14, h: 536 },   // east wall
    { x: 40, y: 586, w: 560, h: 14 },    // south wall, west of the exit door
    { x: 680, y: 586, w: 560, h: 14 },   // south wall, east of the exit door
    { x: 460, y: 64, w: 12, h: 250 },    // west/central divider, north part
    { x: 460, y: 394, w: 12, h: 192 },   // west/central divider, south part
    { x: 820, y: 64, w: 12, h: 250 },    // central/east divider, north part
    { x: 820, y: 394, w: 12, h: 192 },   // central/east divider, south part
    { x: 140, y: 360, w: 180, h: 12 },   // west gallery cover wall
    { x: 920, y: 300, w: 220, h: 12 },   // east vault cover wall
    { x: 1080, y: 300, w: 12, h: 130 },  // east vault cover wall, leg
    { x: 600, y: 300, w: 80, h: 60 },    // atrium sculpture block
  ],
  // Velvet-rope pedestals. Loot pedestals hold a masterpiece; the rest hold
  // lesser pieces and serve as cover that breaks lines of sight.
  pedestals: [
    { x: 150, y: 170, w: 44, h: 44, loot: 0 },
    { x: 618, y: 140, w: 44, h: 44, loot: 1 },
    { x: 1028, y: 430, w: 44, h: 44, loot: 2 },
    { x: 300, y: 470, w: 40, h: 40, loot: -1 },
    { x: 760, y: 430, w: 40, h: 40, loot: -1 },
    { x: 980, y: 170, w: 40, h: 40, loot: -1 },
    { x: 520, y: 470, w: 40, h: 40, loot: -1 },
    { x: 250, y: 130, w: 40, h: 40, loot: -1 },
  ],
  // Wall paintings: pure decoration, drawn as framed art on the north wall.
  wallArt: [
    { x: 120, y: 80, w: 70, h: 46, hue: '#7a4a2b' },
    { x: 300, y: 80, w: 56, h: 40, hue: '#2b5a7a' },
    { x: 700, y: 80, w: 70, h: 46, hue: '#5a2b5a' },
    { x: 880, y: 80, w: 56, h: 40, hue: '#4a6b2b' },
    { x: 1120, y: 80, w: 70, h: 46, hue: '#7a2b2b' },
  ],
  loot: [
    { id: 0, name: 'The Gilded Koi', value: 1200000, hue: '#e8b64c', glow: '#ffd97a' },
    { id: 1, name: 'Portrait of the Brass Duchess', value: 2400000, hue: '#b06ab0', glow: '#d89ad8' },
    { id: 2, name: 'The Midnight Cartographer', value: 3100000, hue: '#4c8fd8', glow: '#8fc4ff' },
  ],
  guards: [
    {
      name: 'Marlow', room: 'West Gallery', speed: 56, pause: 1.1,
      waypoints: [[120, 140], [380, 140], [380, 520], [120, 520]],
    },
    {
      name: 'Okafor', room: 'Central Atrium', speed: 62, pause: 0.8,
      waypoints: [[520, 140], [780, 140], [780, 520], [520, 520]],
    },
    {
      name: 'Voss', room: 'East Vault', speed: 58, pause: 1.4,
      waypoints: [[880, 140], [1170, 140], [1170, 520], [880, 520]],
    },
    {
      name: 'Reyes', room: 'Rover', speed: 72, pause: 0.5,
      waypoints: [[250, 354], [640, 354], [1030, 354], [640, 354]],
      pingPong: true,
    },
  ],
  cameras: [
    { x: 640, y: 80, base: Math.PI / 2, sweep: 0.62, speed: 0.55, range: 215, phase: 0 },
    { x: 1224, y: 300, base: Math.PI, sweep: 0.55, speed: 0.7, range: 210, phase: 1.3 },
    { x: 250, y: 584, base: -Math.PI / 2, sweep: 0.6, speed: 0.45, range: 200, phase: 2.1 },
  ],
  // Laser grids guard the two room doorways. Beams pulse on a fixed cycle;
  // crossing while they are lit trips the alarm.
  lasers: [
    { x: 466, y0: 316, y1: 392, period: 2.4, onTime: 1.5, offset: 0 },
    { x: 826, y0: 316, y1: 392, period: 2.4, onTime: 1.5, offset: 1.2 },
  ],
  exitDoor: { x: 600, y: 586, w: 80, h: 14 },
  van: { x: 588, y: 620, w: 104, h: 58 },
  vanZone: { x: 596, y: 612, w: 88, h: 66 },
  playerSpawn: { x: 640, y: 540 },
  rooms: [
    { label: 'WEST GALLERY', x: 54, y: 568 },
    { label: 'CENTRAL ATRIUM', x: 486, y: 568 },
    { label: 'EAST VAULT', x: 846, y: 568 },
    { label: 'LOADING DOCK — GETAWAY VAN', x: 54, y: 612 },
  ],
};
