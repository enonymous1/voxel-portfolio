/**
 * world.test.mjs — layout invariants for src/lib/three/world.ts.
 * Why this file exists: the layout is pure data, so a typo in a
 * coordinate is silent at runtime — and one shipped. The library
 * interactives pointed at (2,1,9) and (3,1,10), both AIR cells
 * (bookshelves sit at even z, chests at odd z), so clicking in the
 * library could never open the archive; only the HUD menu masked it.
 * Every interactive must sit on a real block of the expected type.
 */
import { buildVoxels, WORLD_SIZE, INTERACTIVES, keyOf, zoneAt, galleryPedestal, LIBRARY_CRATE_POSITIONS } from '../.test-build/world.mjs';
import { BLOCK } from '../.test-build/types.mjs'; // types bundled separately (world bundle does not re-export it)

let pass = 0, fail = 0;
const check = (name, cond, detail) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); cond ? pass++ : fail++; };

const [sx, sy, sz] = WORLD_SIZE;
const v = buildVoxels();
const at = (x, y, z) => v[x + sx * (z + sz * y)];
const inBounds = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < sx && y < sy && z < sz;

check('world size is 32x24x32', sx === 32 && sy === 24 && sz === 32 && v.length === sx * sy * sz, `${sx}x${sy}x${sz}`);
check('ground slab y=0 is all grass', (() => { for (let x = 0; x < sx; x++) for (let z = 0; z < sz; z++) if (at(x, 0, z) !== BLOCK.Grass) return false; return true; })(), '');
check('atrium dais 14..17,1,14..17 is all stone', (() => { for (let x = 14; x <= 17; x++) for (let z = 14; z <= 17; z++) if (at(x, 1, z) !== BLOCK.Stone) return false; return true; })(), '');
check('resume podiums sit on the dais', at(15, 2, 15) === BLOCK.Podium && at(16, 2, 16) === BLOCK.Podium, '');
check('workshop: 5 workstations on planks', (() => { for (let i = 0; i < 5; i++) { const x = 4 + i * 5; if (at(x, 1, 4) !== BLOCK.OakPlanks || at(x, 2, 4) !== BLOCK.Workstation) return false; } return true; })(), '');
check('library: 18 bookshelf blocks (2 cols x 9 rows)', (() => { let n = 0; for (let z = 8; z <= 24; z += 2) { if (at(2, 1, z) === BLOCK.Bookshelf) n++; if (at(2, 2, z) === BLOCK.Bookshelf) n++; } return n === 18; })(), '');
check('library: 9 chest blocks at odd z', (() => { let n = 0; for (let z = 9; z <= 25; z += 2) if (at(3, 1, z) === BLOCK.Chest) n++; return n === 9; })(), '');
check('gallery: 3 pedestals', at(28, 1, 8) === BLOCK.DisplayPedestal && at(28, 1, 14) === BLOCK.DisplayPedestal && at(28, 1, 20) === BLOCK.DisplayPedestal, '');
check('signposts: log + signpost pairs', at(15, 1, 29) === BLOCK.OakLog && at(15, 2, 29) === BLOCK.Signpost && at(17, 1, 29) === BLOCK.OakLog && at(17, 2, 29) === BLOCK.Signpost, '');
check('perimeter ring y=1 is stone', (() => { for (let x = 0; x < sx; x++) if (at(x, 1, 0) !== BLOCK.Stone || at(x, 1, 31) !== BLOCK.Stone) return false; for (let z = 0; z < sz; z++) if (at(0, 1, z) !== BLOCK.Stone || at(31, 1, z) !== BLOCK.Stone) return false; return true; })(), '');

// Registry integrity — the check that would have caught the library bug.
const expectedType = { resume: [BLOCK.Podium], project: [BLOCK.Workstation], archive: [BLOCK.Bookshelf, BLOCK.Chest], gallery: [BLOCK.DisplayPedestal] };
let registryOk = true, registryDetail = '';
for (const [key, entry] of INTERACTIVES) {
  const [x, y, z] = entry.position;
  if (key !== keyOf(x, y, z)) { registryOk = false; registryDetail += `key mismatch ${key}; `; }
  if (!inBounds(x, y, z)) { registryOk = false; registryDetail += `${entry.id} out of bounds; `; }
  const want = expectedType[entry.panel];
  if (!want || !want.includes(at(x, y, z))) { registryOk = false; registryDetail += `${entry.id} at (${x},${y},${z}) is block ${at(x, y, z)}, want one of ${want}; `; }
}
check('every interactive sits on a real block of its panel type', registryOk, registryDetail || `${INTERACTIVES.size} entries`);
check('galleryPedestal derives model anchors from the registry',
  JSON.stringify(galleryPedestal('3d-printing')) === JSON.stringify([28.5, 2, 8.5]) &&
  JSON.stringify(galleryPedestal('homelab')) === JSON.stringify([28.5, 2, 14.5]) &&
  JSON.stringify(galleryPedestal('dice')) === JSON.stringify([28.5, 2, 20.5]) &&
  galleryPedestal('nope') === undefined, '');
check('library crates sit in aisle air cells (not inside blocks)',
  LIBRARY_CRATE_POSITIONS.length === 5 && LIBRARY_CRATE_POSITIONS.every(([x, y, z]) => at(Math.floor(x), Math.floor(y), Math.floor(z)) === BLOCK.Air), `${LIBRARY_CRATE_POSITIONS.length} crates`);
check('zoneAt boundaries + precedence (workshop beats library, gallery beats signposts)',
  zoneAt(16, 24) === 'atrium' && zoneAt(16, 4) === 'workshop' && zoneAt(3, 16) === 'library' &&
  zoneAt(28, 16) === 'gallery' && zoneAt(16, 29) === 'signposts' &&
  zoneAt(3, 4) === 'workshop' && zoneAt(28, 29) === 'gallery', '');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
