/** Shared types — kept out of state.svelte.ts so workers & non-reactive code can import them without pulling in runes. */

export type ZoneId = 'atrium' | 'workshop' | 'library' | 'gallery' | 'signposts';

export type PanelKind =
  | 'none'
  | 'resume'      // Spawn Atrium
  | 'project'     // Active Projects Workshop — needs selectedProjectId
  | 'archive'     // Archived Projects Library — list view
  | 'gallery'     // Interests Gallery — needs selectedGalleryId
  | 'help';

export interface HoveredBlock {
  /** Stable id from world definition, e.g. "workshop:ss-gapps" */
  id: string;
  zoneId: ZoneId;
  label: string;
  /** World-space block coords [x,y,z] */
  position: [number, number, number];
  /** What activating (click / tap / E) should open */
  panel: Exclude<PanelKind, 'none' | 'help'>;
  payloadId?: string; // projectId / galleryId
}

export interface Project {
  id: string;
  title: string;
  blurb: string;
  stack: string[];
  status: 'active' | 'archived' | 'live';
  href?: string;
  repo?: string;
  zoneId: ZoneId;
}

export interface GalleryItem {
  id: string;
  title: string;
  blurb: string;
  /** Draco/Meshopt-compressed .glb under static/models/ */
  model: string;
}

export const BLOCK = {
  Air: 0,
  Grass: 1,
  Dirt: 2,
  Stone: 3,
  OakPlanks: 4,
  OakLog: 5,
  Glass: 6,
  Bookshelf: 7,
  CraftingTable: 8,
  Furnace: 9,
  Chest: 10,
  Podium: 11,     // Atrium terminal
  Signpost: 12,
  DisplayPedestal: 13,
  Workstation: 14 // Workshop node — interactive, not just textured
} as const;
export type BlockId = (typeof BLOCK)[keyof typeof BLOCK];

/** Tile layer index into the DataArrayTexture — must match textureAtlas.ts */
export const TILE_LAYER: Record<string, number> = {
  grass_top: 0, grass_side: 1, dirt: 2, stone: 3, planks: 4, log_side: 5,
  log_top: 6, glass: 7, bookshelf: 8, crafting: 9, furnace: 10, chest: 11,
  podium: 12, sign: 13, pedestal: 14, workstation: 15
};

/**
 * Voxel face table — the mesher's single source of truth (used by
 * chunkWorker.ts; previously a private copy lived there).
 *
 * `tileFace` indexes tileFor()'s face order [+x, -x, +y, -y, +z, -z].
 * CORRECTION 2026-10-31: the old table had ±x and ±z swapped (-x→0,
 * +x→1, -z→4, +z→5). Invisible until now because every current block
 * uses symmetric tiles on opposite faces — but any future directional
 * tile (a sign face, a furnace front) would have rendered on the
 * wrong side. Guarded by tests/atlas.test.mjs.
 */
export const VOXEL_FACES: { dir: [number, number, number]; tileFace: 0|1|2|3|4|5 }[] = [
  { dir: [-1, 0, 0], tileFace: 1 }, // -x
  { dir: [ 1, 0, 0], tileFace: 0 }, // +x
  { dir: [ 0,-1, 0], tileFace: 3 }, // -y (bottom)
  { dir: [ 0, 1, 0], tileFace: 2 }, // +y (top)
  { dir: [ 0, 0,-1], tileFace: 5 }, // -z
  { dir: [ 0, 0, 1], tileFace: 4 }  // +z
];

/** Face -> tile lookup per block. Order: [+x,-x,+y,-y,+z,-z] */
export function tileFor(block: BlockId, face: 0|1|2|3|4|5): number {
  switch (block) {
    case BLOCK.Grass:       return face === 2 ? 0 : face === 3 ? 2 : 1;
    case BLOCK.Dirt:        return 2;
    case BLOCK.Stone:       return 3;
    case BLOCK.OakPlanks:   return 4;
    case BLOCK.OakLog:      return face === 2 || face === 3 ? 6 : 5;
    case BLOCK.Glass:       return 7;
    case BLOCK.Bookshelf:   return 8;
    case BLOCK.CraftingTable: return 9;
    case BLOCK.Furnace:     return 10;
    case BLOCK.Chest:       return 11;
    case BLOCK.Podium:      return 12;
    case BLOCK.Signpost:    return 13;
    case BLOCK.DisplayPedestal: return 14;
    case BLOCK.Workstation: return 15;
    default: return 3;
  }
}
