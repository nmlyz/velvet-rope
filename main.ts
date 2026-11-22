// Velvet Rope — hand-in program (Node 22, standard library only).
//
// The repository holds the game as plain static files under game/ (an
// index.html that opens in desktop Chrome and plays offline, with its ES
// modules under game/src/) and 4 screenshots under screenshots/. This
// program copies both folders into the output directory and writes
// dossier.json there, using the vendored make.fun library's buildDossier.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program is deterministic: it writes the same bytes on every run, so
// the grader's two runs match byte for byte.

import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps, from the competition kit: at most 4 screenshots,
// each at most 256 KiB; game/ at most 993 files and directories and 48 MiB
// in all, every path at most 1000 bytes. Refuse early rather than hand in
// an entry the gate would refuse.
const SCREENSHOT_LIMIT = 4;
const SCREENSHOT_MAX_BYTES = 262144;
const GAME_MAX_ENTRIES = 993;
const GAME_MAX_BYTES = 50331648;
const GAME_PATH_MAX_BYTES = 1000;

function countGameEntries(dir, prefix) {
  let entries = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const st = statSync(full);
    entries += 1;
    if (Buffer.byteLength(rel, 'utf8') > GAME_PATH_MAX_BYTES) {
      throw new Error(`game path too long: ${rel}`);
    }
    if (st.isDirectory()) {
      const sub = countGameEntries(full, rel);
      entries += sub.entries;
      bytes += sub.bytes;
    } else {
      bytes += st.size;
    }
  }
  return { entries, bytes };
}

const gameDir = join(repoRoot, 'game');
const gameTotals = countGameEntries(gameDir, '');
if (gameTotals.entries > GAME_MAX_ENTRIES) {
  throw new Error(`game/ has ${gameTotals.entries} entries, over the ${GAME_MAX_ENTRIES} cap`);
}
if (gameTotals.bytes > GAME_MAX_BYTES) {
  throw new Error(`game/ is ${gameTotals.bytes} bytes, over the ${GAME_MAX_BYTES} cap`);
}

const shotsDir = join(repoRoot, 'screenshots');
const shotNames = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter(n => !n.startsWith('.')).sort()
  : [];
if (shotNames.length > SCREENSHOT_LIMIT) {
  throw new Error(`${shotNames.length} screenshots, over the ${SCREENSHOT_LIMIT} cap`);
}
for (const name of shotNames) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > SCREENSHOT_MAX_BYTES) {
    throw new Error(`screenshot ${name} is ${size} bytes, over the ${SCREENSHOT_MAX_BYTES} cap`);
  }
}

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (shotNames.length > 0) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: SCREENSHOT_LIMIT, max_bytes: SCREENSHOT_MAX_BYTES },
    game_max_files: GAME_MAX_ENTRIES,
    game_max_bytes: GAME_MAX_BYTES,
    game_path_max_bytes: GAME_PATH_MAX_BYTES,
  }),
);

// Fixed modes, so both runs write identical bytes and identical metadata:
// every output file 0644, every directory 0755.
function fixModes(dir) {
  chmodSync(dir, 0o755);
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) fixModes(full);
    else chmodSync(full, 0o644);
  }
}
fixModes(outDir);
