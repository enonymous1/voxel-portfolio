import * as THREE from 'three';

/**
 * DataArrayTexture (Texture2DArray) atlas
 * ------------------------------------------------------------------
 * Why not a classic 2D atlas? Mipmaps bleed neighbouring tiles into
 * each other at distance. A texture *array* gives every tile its own
 * layer — mipmaps are generated per-layer, so no bleeding, and the
 * shader indexes by (u, v, layerIndex) exactly as the worker emits
 * in its `uvLayer` attribute.
 *
 * Tiles are generated procedurally here (16×16 canvas per layer) so
 * the scaffold ships with ZERO image assets / network weight. Replace
 * `paintTile()` with ImageBitmap loads to use real textures later —
 * keep the layer order in sync with TILE_LAYER in types.ts.
 */
export const TILE_SIZE = 16;
export const TILE_COUNT = 16;

const PALETTE = [
  '#6abe30', '#8a5a32', '#8a5a32', '#7d7d7d', '#b08d57', '#6b4a2b',
  '#a67c44', '#cfe8ef', '#7a4a21', '#9c6b30', '#5a5a5a', '#8b5a2b',
  '#2dd4bf', '#d6c48a', '#9ca3af', '#38bdf8'
];

function paintTile(ctx: CanvasRenderingContext2D, layer: number) {
  ctx.fillStyle = PALETTE[layer] ?? '#888';
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  // Cheap deterministic speckle for texture without any asset file
  let seed = layer * 7919 + 13;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const px = (x: number, y: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
  const rect = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const DK = 'rgba(0,0,0,0.14)', LT = 'rgba(255,255,255,0.10)';
  ctx.fillStyle = DK;
  for (let i = 0; i < 28; i++) ctx.fillRect(Math.floor(rand() * 16), Math.floor(rand() * 16), 1, 1);
  ctx.fillStyle = LT;
  for (let i = 0; i < 14; i++) ctx.fillRect(Math.floor(rand() * 16), Math.floor(rand() * 16), 1, 1);

  // Per-type detail (v2, 2026-10-23): v1 was palette + speckle only, which
  // read as flat colour at any distance. Still zero assets — all painted.
  switch (layer) {
    case 0: // grass top — denser two-tone speckle reads as turf
      for (let i = 0; i < 40; i++) px(Math.floor(rand() * 16), Math.floor(rand() * 16), rand() > 0.5 ? 'rgba(0,60,0,0.25)' : 'rgba(190,255,140,0.20)');
      break;
    case 1: // grass side — green lip dripping into dirt
      rect(0, 0, 16, 3, '#6abe30');
      for (let x = 0; x < 16; x++) { const d = 3 + Math.floor(rand() * 3); rect(x, 0, 1, d, '#6abe30'); px(x, d, 'rgba(0,60,0,0.3)'); }
      break;
    case 2: // dirt — clumps + pebbles
      for (let i = 0; i < 8; i++) rect(Math.floor(rand() * 14), Math.floor(rand() * 15), 2, 1, 'rgba(0,0,0,0.22)');
      for (let i = 0; i < 5; i++) px(Math.floor(rand() * 16), Math.floor(rand() * 16), 'rgba(255,235,200,0.28)');
      break;
    case 3: // stone — soft blotches + hairline cracks
      for (let i = 0; i < 5; i++) rect(Math.floor(rand() * 13), Math.floor(rand() * 13), 3, 3, 'rgba(0,0,0,0.07)');
      rect(3, 5, 1, 4, 'rgba(0,0,0,0.25)'); px(4, 8, 'rgba(0,0,0,0.25)'); px(4, 9, 'rgba(0,0,0,0.25)');
      rect(11, 2, 1, 3, 'rgba(0,0,0,0.2)'); px(10, 5, 'rgba(0,0,0,0.2)');
      break;
    case 4: // oak planks — board lines, per-board shade, joints + nails
      for (let b = 0; b < 4; b++) {
        const y = b * 4;
        rect(0, y + 3, 16, 1, 'rgba(0,0,0,0.35)');
        if (b % 2) rect(0, y, 16, 3, 'rgba(255,255,255,0.05)');
        const jx = (b * 7 + 3) % 13;
        rect(jx, y, 1, 3, 'rgba(0,0,0,0.3)');
        px(1, y + 1, 'rgba(0,0,0,0.4)'); px(14, y + 1, 'rgba(0,0,0,0.4)');
      }
      break;
    case 5: // log side — vertical bark stripes
      for (let x = 0; x < 16; x += 2) rect(x, 0, 1, 16, rand() > 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.06)');
      break;
    case 6: { // log top — growth rings
      const rings = ['#a67c44', '#8a5a32', '#b08d57', '#8a5a32', '#c19a63'];
      for (let r = 0; r < 5; r++) rect(r, r, 16 - 2 * r, 16 - 2 * r, rings[r]);
      px(7, 7, '#5a3a1a'); px(8, 8, '#5a3a1a');
      break;
    }
    case 7: // glass — pale pane + diagonal glint
      rect(0, 0, 16, 16, 'rgba(207,232,239,0.9)');
      for (let i = 0; i < 5; i++) px(3 + i, 10 - i, 'rgba(255,255,255,0.85)');
      for (let i = 0; i < 3; i++) px(8 + i, 12 - i, 'rgba(255,255,255,0.6)');
      break;
    case 8: { // bookshelf — two shelves of book spines
      rect(0, 0, 16, 16, '#5f3d1e');
      const spine = ['#a33b32', '#33549e', '#3e7d44', '#c2a24d', '#7a4a8c', '#b0622f', '#46828a'];
      for (const shelfY of [1, 9]) {
        let x = 1;
        while (x < 14) { const w = 1 + Math.floor(rand() * 2); const h = 5 + Math.floor(rand() * 2); rect(x, shelfY + (7 - h), w, h, spine[Math.floor(rand() * spine.length)]); x += w + (rand() > 0.75 ? 1 : 0); }
        rect(0, shelfY + 7, 16, 1, '#8a5a32');
      }
      break;
    }
    case 9: // crafting table — plank base + grid
      rect(0, 0, 16, 16, '#b08d57'); rect(4, 4, 8, 8, 'rgba(0,0,0,0.15)');
      rect(7, 4, 1, 8, 'rgba(0,0,0,0.35)'); rect(4, 7, 8, 1, 'rgba(0,0,0,0.35)');
      break;
    case 10: // furnace — stone + dark mouth + embers
      rect(3, 6, 10, 8, '#2b2b2b'); rect(5, 11, 6, 2, '#3a3a3a');
      px(6, 12, '#f97316'); px(9, 12, '#fbbf24'); px(7, 9, '#57534e');
      break;
    case 11: // chest — lid seam, iron bands + latch
      rect(0, 5, 16, 1, 'rgba(0,0,0,0.4)');
      rect(1, 0, 2, 16, 'rgba(30,30,30,0.55)'); rect(13, 0, 2, 16, 'rgba(30,30,30,0.55)');
      rect(7, 5, 2, 3, '#d4d4d8'); px(7, 6, '#52525b');
      break;
    case 12: // podium / terminal — dark body, green screen text, amber light
      rect(0, 0, 16, 16, '#233044');
      rect(2, 3, 12, 9, '#0f172a'); rect(2, 3, 12, 1, '#22c55e');
      rect(4, 5, 6, 1, '#22c55e'); rect(4, 7, 8, 1, '#22c55e'); rect(4, 9, 4, 1, '#22c55e');
      px(13, 13, '#f59e0b'); px(3, 13, '#38bdf8');
      break;
    case 13: // sign — parchment, frame, text lines
      rect(1, 2, 14, 12, '#e6d194'); rect(1, 2, 14, 1, 'rgba(0,0,0,0.25)'); rect(1, 13, 14, 1, 'rgba(0,0,0,0.25)');
      rect(3, 5, 10, 1, 'rgba(60,40,15,0.75)'); rect(3, 8, 8, 1, 'rgba(60,40,15,0.75)'); rect(3, 11, 5, 1, 'rgba(60,40,15,0.75)');
      break;
    case 14: // display pedestal — framed stone + teal inlay
      rect(1, 1, 14, 14, 'rgba(0,0,0,0.12)'); rect(2, 2, 12, 12, 'rgba(255,255,255,0.10)');
      px(7, 7, '#2dd4bf'); px(8, 8, '#2dd4bf'); px(8, 7, '#99f6e4'); px(7, 8, '#99f6e4');
      break;
    case 15: // workstation — dark unit, cyan code screen, keyboard strip
      rect(0, 0, 16, 16, '#1f2937');
      rect(2, 2, 12, 8, '#0b2536'); rect(3, 4, 7, 1, '#38bdf8'); rect(3, 6, 9, 1, '#38bdf8'); rect(3, 8, 5, 1, '#7dd3fc');
      rect(3, 12, 10, 2, '#374151'); px(4, 12, '#9ca3af'); px(7, 12, '#9ca3af'); px(10, 12, '#9ca3af'); px(12, 13, '#22c55e');
      break;
  }

  // Subtle per-block edge — greedy meshing merges flat runs into single
  // quads; this 1px shade (repeated per block via the UVs) is what keeps
  // individual blocks legible on floors and walls.
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 15, 16, 1); ctx.fillRect(0, 0, 1, 16); ctx.fillRect(15, 0, 1, 16);
}

export function createAtlasTexture(): THREE.DataArrayTexture {
  const data = new Uint8Array(TILE_SIZE * TILE_SIZE * 4 * TILE_COUNT);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILE_SIZE;
  const ctx = canvas.getContext('2d')!;
  for (let layer = 0; layer < TILE_COUNT; layer++) {
    paintTile(ctx, layer);
    const img = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
    data.set(img.data, layer * TILE_SIZE * TILE_SIZE * 4);
  }
  const tex = new THREE.DataArrayTexture(data, TILE_SIZE, TILE_SIZE, TILE_COUNT);
  tex.format = THREE.RGBAFormat;
  tex.minFilter = THREE.NearestMipmapLinearFilter; // crisp voxels, per-layer mips
  tex.magFilter = THREE.NearestFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; // worker scales UV by quad w/h
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Custom shader material sampling (u, v, layer) — Lambert-ish + fog-friendly.
 *
 * Written in THREE's ShaderMaterial dialect (GLSL1-style on purpose):
 * WebGLProgram PREPENDS its own `#version 300 es`, precision headers,
 * attribute/varying defines, `texture2D`→`texture`, and a declared
 * `pc_fragColor` out. A hand-written `#version` or your own fragment
 * `out` therefore lands mid-shader and the program FAILS TO COMPILE —
 * the mesh then silently draws nothing (only the sky clear-colour
 * shows). That bug shipped in v1 and was only caught by a real render
 * on 2026-10-23; do not "modernise" these shaders to raw GLSL3.
 */
export function createVoxelMaterial(atlas: THREE.DataArrayTexture) {
  return new THREE.ShaderMaterial({
    uniforms: { atlas: { value: atlas }, sunDir: { value: new THREE.Vector3(0.5, 1, 0.35).normalize() } },
    vertexShader: /* glsl */ `
      attribute vec3 uvLayer;
      varying vec3 vUvL; varying vec3 vNormal; varying vec3 vWorld;
      void main() {
        vUvL = uvLayer; vNormal = normal;
        vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2DArray atlas; uniform vec3 sunDir;
      varying vec3 vUvL; varying vec3 vNormal; varying vec3 vWorld;
      void main() {
        vec4 tex = texture2D(atlas, vUvL);
        float ndl = max(dot(normalize(vNormal), sunDir), 0.0);
        float shade = 0.55 + 0.45 * ndl;
        // Cheap distance fog — matches Scene background
        float fogF = smoothstep(28.0, 60.0, length(vWorld.xz));
        vec3 col = mix(tex.rgb * shade, vec3(0.53, 0.81, 0.92), fogF * 0.55);
        gl_FragColor = vec4(col, tex.a);
      }`
  });
}
