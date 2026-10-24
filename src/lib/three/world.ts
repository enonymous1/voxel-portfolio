import { BLOCK } from '../types';
import type { HoveredBlock } from '../types';

/**
 * World definition — one 32×24×32 chunk is plenty for a landing page.
 * Kept as pure data + a builder so the SAME layout can be (a) sent to
 * the mesher worker and (b) used for the interactive-block registry.
 */
export const WORLD_SIZE: [number, number, number] = [32, 24, 32];

export function buildVoxels(): Uint8Array {
  const [sx, sy, sz] = WORLD_SIZE;
  const v = new Uint8Array(sx * sy * sz);
  const set = (x: number, y: number, z: number, b: number) => {
    if (x >= 0 && y >= 0 && z >= 0 && x < sx && y < sy && z < sz) v[x + sx * (z + sz * y)] = b;
  };
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, b: number) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, b);
  };

  box(0, 0, 0, 31, 0, 31, BLOCK.Grass);                 // ground
  box(14, 1, 14, 17, 1, 17, BLOCK.Stone);               // atrium dais
  set(15, 2, 15, BLOCK.Podium); set(16, 2, 16, BLOCK.Podium); // resume terminals (interactive, see registry)

  // Workshop — north row of workstations
  for (let i = 0; i < 5; i++) { set(4 + i * 5, 1, 4, BLOCK.OakPlanks); set(4 + i * 5, 2, 4, BLOCK.Workstation); }
  // Library — west wall bookshelves + chests
  for (let z = 8; z <= 24; z += 2) { set(2, 1, z, BLOCK.Bookshelf); set(2, 2, z, BLOCK.Bookshelf); set(3, 1, z + 1, BLOCK.Chest); }
  // Gallery — east pedestals
  for (let z = 8; z <= 20; z += 6) { set(28, 1, z, BLOCK.DisplayPedestal); }
  // Signposts — south gate
  set(15, 1, 29, BLOCK.OakLog); set(15, 2, 29, BLOCK.Signpost);
  set(17, 1, 29, BLOCK.OakLog); set(17, 2, 29, BLOCK.Signpost);
  // Low perimeter so players don't fall off the world
  box(0, 1, 0, 31, 1, 0, BLOCK.Stone); box(0, 1, 31, 31, 1, 31, BLOCK.Stone);
  box(0, 1, 0, 0, 1, 31, BLOCK.Stone); box(31, 1, 0, 31, 1, 31, BLOCK.Stone);
  return v;
}

/** Blocks that do something. Key = "x,y,z". Raycast hit -> registry lookup -> state. */
export const INTERACTIVES = new Map<string, HoveredBlock>([
  ['15,2,15', { id: 'atrium:resume', zoneId: 'atrium', label: 'Resume Terminal — click to open', position: [15, 2, 15], panel: 'resume' }],
  ['16,2,16', { id: 'atrium:resume-2', zoneId: 'atrium', label: 'About Me — click to open', position: [16, 2, 16], panel: 'resume' }],
  ['4,2,4',   { id: 'workshop:ss-cryptogem', zoneId: 'workshop', label: 'ss-cryptoGem', position: [4, 2, 4], panel: 'project', payloadId: 'ss-cryptogem' }],
  ['9,2,4',   { id: 'workshop:ss-gapps', zoneId: 'workshop', label: 'ss-gapps Auditor', position: [9, 2, 4], panel: 'project', payloadId: 'ss-gapps' }],
  ['14,2,4',  { id: 'workshop:ss-sms-br', zoneId: 'workshop', label: 'ss-sms-br Viewer', position: [14, 2, 4], panel: 'project', payloadId: 'ss-sms-br' }],
  ['19,2,4',  { id: 'workshop:ss-prediction', zoneId: 'workshop', label: 'Prediction-Market Engine', position: [19, 2, 4], panel: 'project', payloadId: 'ss-prediction' }],
  ['24,2,4',  { id: 'workshop:whenwhere', zoneId: 'workshop', label: 'WhenWhere.biz', position: [24, 2, 4], panel: 'project', payloadId: 'whenwhere' }],
  ['2,1,9',   { id: 'library:archive', zoneId: 'library', label: 'Archived Projects — click for list', position: [2, 1, 9], panel: 'archive' }],
  ['3,1,10',  { id: 'library:chest', zoneId: 'library', label: 'Archive Chest', position: [3, 1, 10], panel: 'archive' }],
  ['28,1,8',  { id: 'gallery:3d-printing', zoneId: 'gallery', label: '3D Printing', position: [28, 1, 8], panel: 'gallery', payloadId: '3d-printing' }],
  ['28,1,14', { id: 'gallery:homelab', zoneId: 'gallery', label: 'Homelab', position: [28, 1, 14], panel: 'gallery', payloadId: 'homelab' }],
  ['28,1,20', { id: 'gallery:dice', zoneId: 'gallery', label: 'Tabletop Dice', position: [28, 1, 20], panel: 'gallery', payloadId: 'dice' }]
]);

export const keyOf = (x: number, y: number, z: number) => `${x},${y},${z}`;

/** Zone by position — cheap AABB checks, drives HUD label + ambient tweaks */
export function zoneAt(x: number, z: number): HoveredBlock['zoneId'] {
  if (z <= 7) return 'workshop';
  if (x <= 6) return 'library';
  if (x >= 26) return 'gallery';
  if (z >= 27) return 'signposts';
  return 'atrium';
}
