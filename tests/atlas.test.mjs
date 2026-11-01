/**
 * atlas.test.mjs — tile/atlas sync guards for src/lib/types.ts +
 * src/lib/three/textureAtlas.ts.
 * The atlas's sharpest edge is the TILE_LAYER <-> PALETTE sync: a tile
 * added to one list without the other silently renders the wrong
 * colour (the `?? '#888'` fallback hides it). And the face table
 * (VOXEL_FACES) is the mesher's contract with tileFor()'s face order
 * [+x,-x,+y,-y,+z,-z] — it shipped with ±x and ±z swapped, invisible
 * only because every current block is symmetric on opposite faces.
 * Both invariants are pinned here so they can't regress silently.
 */
import { BLOCK, TILE_LAYER, tileFor, VOXEL_FACES } from '../.test-build/types.mjs';
import { TILE_COUNT, PALETTE } from '../.test-build/atlas.mjs';

let pass = 0, fail = 0;
const check = (name, cond, detail) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); cond ? pass++ : fail++; };

check('TILE_COUNT is 16', TILE_COUNT === 16, `TILE_COUNT=${TILE_COUNT}`);
check('PALETTE length equals TILE_COUNT', PALETTE.length === TILE_COUNT, `PALETTE=${PALETTE.length}`);
check('every TILE_LAYER value is a valid layer index', Object.values(TILE_LAYER).every((l) => Number.isInteger(l) && l >= 0 && l < TILE_COUNT), JSON.stringify(TILE_LAYER));
check('TILE_LAYER covers exactly layers 0..15 once each', (() => { const s = [...Object.values(TILE_LAYER)].sort((a, b) => a - b); return s.every((l, i) => l === i); })(), '');

const blockIds = Object.values(BLOCK);
check('tileFor returns a valid layer for every block x every face',
  blockIds.every((b) => [0, 1, 2, 3, 4, 5].every((f) => { const l = tileFor(b, f); return Number.isInteger(l) && l >= 0 && l < TILE_COUNT; })),
  `${blockIds.length} blocks`);
check('grass faces: top=grass_top, sides=grass_side, bottom=dirt',
  tileFor(BLOCK.Grass, 2) === TILE_LAYER.grass_top &&
  [0, 1, 4, 5].every((f) => tileFor(BLOCK.Grass, f) === TILE_LAYER.grass_side) &&
  tileFor(BLOCK.Grass, 3) === TILE_LAYER.dirt, '');
check('log faces: ends=log_top, sides=log_side',
  tileFor(BLOCK.OakLog, 2) === TILE_LAYER.log_top && tileFor(BLOCK.OakLog, 3) === TILE_LAYER.log_top &&
  [0, 1, 4, 5].every((f) => tileFor(BLOCK.OakLog, f) === TILE_LAYER.log_side), '');
// Deliberate tripwire: every current block is symmetric on opposite
// faces, which is the ONLY reason the old ±x/±z face swap was invisible.
// If a future directional tile breaks this symmetry, this check fails
// on purpose — update the face contract (and this comment) then.
check('opposite-face symmetry holds for all blocks (face-swap fix is render-identical)',
  blockIds.every((b) => tileFor(b, 0) === tileFor(b, 1) && tileFor(b, 4) === tileFor(b, 5)), '');

// Face table contract: dir -> tileFace must match tileFor's [+x,-x,+y,-y,+z,-z] order.
const expectedFace = { '1,0,0': 0, '-1,0,0': 1, '0,1,0': 2, '0,-1,0': 3, '0,0,1': 4, '0,0,-1': 5 };
check('VOXEL_FACES has exactly the 6 axis directions',
  VOXEL_FACES.length === 6 && VOXEL_FACES.every((f) => expectedFace[f.dir.join(',')] !== undefined), '');
check('VOXEL_FACES tileFace matches tileFor face order (regression: ±x/±z swap)',
  VOXEL_FACES.every((f) => f.tileFace === expectedFace[f.dir.join(',')]),
  VOXEL_FACES.map((f) => `${f.dir.join(',')}->${f.tileFace}`).join(' '));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
