/**
 * build-world-map.mjs — top-down SVG map of the voxel world, rendered
 * from the REAL layout (buildVoxels), not hand-drawn. Run:
 *   node scripts/build-world-map.mjs
 * Output: docs/screenshots/world-map.svg (referenced by README).
 * For each (x,z) column the topmost non-air block decides the colour,
 * so the map shows what a player actually sees from above.
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

execSync("npx esbuild src/lib/three/world.ts --bundle --format=esm --outfile=.test-build/world.mjs", { stdio: 'ignore' });
execSync("npx esbuild src/lib/types.ts --bundle --format=esm --outfile=.test-build/types.mjs", { stdio: 'ignore' });
const { buildVoxels, WORLD_SIZE } = await import('../.test-build/world.mjs');
const { BLOCK } = await import('../.test-build/types.mjs');

const [sx, , sz] = WORLD_SIZE;
const v = buildVoxels();
const at = (x, y, z) => v[x + sx * (z + sz * y)];
const COLORS = {
  [BLOCK.Grass]: '#6abe30', [BLOCK.Stone]: '#7d7d7d', [BLOCK.OakPlanks]: '#b08d57',
  [BLOCK.OakLog]: '#6b4a2b', [BLOCK.Bookshelf]: '#7a4a21', [BLOCK.Chest]: '#9c6b30',
  [BLOCK.Podium]: '#2dd4bf', [BLOCK.Workstation]: '#38bdf8', [BLOCK.Signpost]: '#d6c48a',
  [BLOCK.DisplayPedestal]: '#9ca3af'
};
const CELL = 14, PAD = 46, FOOTER = 28; // footer row holds the south label + legend below the grid
const W = sz * CELL + PAD * 2, H = sx * CELL + PAD * 2 + FOOTER; // x -> horizontal, z -> vertical (north up = -z at top)
let rects = '';
for (let x = 0; x < sx; x++) for (let z = 0; z < sz; z++) {
  let top = BLOCK.Air;
  for (let y = 23; y >= 0; y--) { if (at(x, y, z) !== BLOCK.Air) { top = at(x, y, z); break; } }
  const c = COLORS[top] ?? '#eee';
  rects += `<rect x="${PAD + x * CELL}" y="${PAD + z * CELL}" width="${CELL}" height="${CELL}" fill="${c}"/>`;
}
// Zone labels. North sits in the top padding; west/east are rotated into
// the side padding (they used to overlap the edge cells); south sits in
// the footer row (it used to sit on the bottom row of cells). The Spawn
// Atrium label is the one annotation inside the grid, with a white halo.
const FONT = 'font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="#111827"';
const midY = PAD + (sz * CELL) / 2;
const labels = [
  `<text x="${PAD + (sx * CELL) / 2}" y="${PAD - 18}" ${FONT} text-anchor="middle">Projects Workshop — north</text>`,
  `<text x="18" y="${midY}" ${FONT} text-anchor="middle" transform="rotate(-90 18 ${midY})">Library — west</text>`,
  `<text x="${W - 18}" y="${midY}" ${FONT} text-anchor="middle" transform="rotate(90 ${W - 18} ${midY})">Gallery — east</text>`,
  `<text x="${PAD + (sx * CELL) / 2}" y="${PAD + sz * CELL + 22}" ${FONT} text-anchor="middle">Links Gate — south</text>`,
  `<text x="${PAD + 16 * CELL}" y="${PAD + 12.6 * CELL}" ${FONT} stroke="#fff" stroke-width="3" paint-order="stroke" text-anchor="middle">Spawn Atrium</text>`
];
const legend = Object.entries({ Grass: '#6abe30', Stone: '#7d7d7d', Planks: '#b08d57', Bookshelf: '#7a4a21', Workstation: '#38bdf8', Podium: '#2dd4bf' })
  .map(([name, c], i) => `<rect x="${PAD + i * 82}" y="${H - 14}" width="12" height="12" fill="${c}"/><text x="${PAD + i * 82 + 16}" y="${H - 4}" font-family="system-ui,sans-serif" font-size="11" fill="#374151">${name}</text>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#f8fafc"/>${rects}${labels.join('')}${legend}</svg>`;
writeFileSync('docs/screenshots/world-map.svg', svg);
console.log(`wrote docs/screenshots/world-map.svg (${W}x${H}, ${sx * sz} cells)`);
