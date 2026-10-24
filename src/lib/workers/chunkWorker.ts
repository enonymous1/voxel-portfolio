/**
 * chunkWorker.ts — Greedy meshing in a Web Worker
 * ------------------------------------------------------------------
 * Why here: meshing is CPU-bound and must never jank the render loop
 * or Pointer Lock. Main thread sends a flat voxel array; this worker
 * returns flat typed arrays whose ArrayBuffers are *transferred*
 * (zero-copy) — ownership moves, no structured-clone copy.
 *
 * Algorithm: classic greedy meshing (Mikola Lysenko), per-axis sweep:
 *   for each axis (x/y/z) and direction (+/-):
 *     build a 2D mask of visible faces (tile layer + 1, or 0 = none)
 *     greedily expand each mask cell into the largest w×h rectangle
 *     emit one quad (2 tris) per rectangle instead of per-face
 * A solid 16×16 wall goes from 256 quads -> 1 quad.
 *
 * Geometry layout (consumed in VoxelWorld.svelte):
 *   position: Float32  xyz per vertex
 *   normal:   Float32  xyz per vertex
 *   uvLayer:  Float32  [u, v, layerIndex] per vertex -> DataArrayTexture
 *   index:    Uint32   6 per quad
 *
 * Protocol:
 *   in:  { type:'build', chunkId, size:[sx,sy,sz], origin:[x,y,z], voxels:ArrayBuffer }
 *        voxels index = x + sx * (z + sz * y), transferred in
 *   out: { type:'mesh', chunkId, position, normal, uvLayer, index, quadCount } (all transferred)
 *   out: { type:'error', chunkId, message }
 */
import { tileFor, BLOCK } from '../types';

export interface BuildRequest {
  type: 'build';
  chunkId: string;
  size: [number, number, number];
  origin: [number, number, number];
  voxels: ArrayBuffer;
}

// Per-face data: normal dir, and the 4 corners as [axis, uAxis, vAxis] offsets
// in {0,1} — expanded by w/h at emit time so greedy rects stay correct.
const FACES: { dir: [number, number, number]; tileFace: 0|1|2|3|4|5 }[] = [
  { dir: [-1, 0, 0], tileFace: 0 }, // -x
  { dir: [ 1, 0, 0], tileFace: 1 }, // +x
  { dir: [ 0,-1, 0], tileFace: 3 }, // -y (bottom)
  { dir: [ 0, 1, 0], tileFace: 2 }, // +y (top)
  { dir: [ 0, 0,-1], tileFace: 4 }, // -z
  { dir: [ 0, 0, 1], tileFace: 5 }  // +z
];

const isOpaque = (b: number) => b !== 0 && b !== BLOCK.Glass;

function meshChunk(req: BuildRequest) {
  const [sx, sy, sz] = req.size;
  const dims = [sx, sy, sz];
  const voxels = new Uint8Array(req.voxels);
  const at = (x: number, y: number, z: number) =>
    x < 0 || y < 0 || z < 0 || x >= sx || y >= sy || z >= sz
      ? 0
      : voxels[x + sx * (z + sz * y)];

  const positions: number[] = [];
  const normals: number[] = [];
  const uvLayers: number[] = [];
  const indices: number[] = [];
  let quadCount = 0;

  for (const { dir, tileFace } of FACES) {
    const axis = dir[0] !== 0 ? 0 : dir[1] !== 0 ? 1 : 2;
    const uAxis = (axis + 1) % 3;
    const vAxis = (axis + 2) % 3;
    const du = dims[uAxis], dv = dims[vAxis], da = dims[axis];
    const mask = new Int32Array(du * dv);

    for (let a = 0; a < da; a++) {
      // 1) Mask: face visible if neighbour is air or non-opaque-and-different (glass)
      for (let v = 0; v < dv; v++) {
        for (let u = 0; u < du; u++) {
          const p = [0, 0, 0]; p[axis] = a; p[uAxis] = u; p[vAxis] = v;
          const n = [...p]; n[axis] += dir[axis];
          const here = at(p[0], p[1], p[2]);
          const next = at(n[0], n[1], n[2]);
          mask[u + du * v] =
            here !== 0 && (next === 0 || (!isOpaque(next) && next !== here))
              ? tileFor(here as never, tileFace) + 1
              : 0;
        }
      }

      // 2) Greedy expansion + quad emission
      for (let v = 0; v < dv; v++) {
        for (let u = 0; u < du; u++) {
          const tile = mask[u + du * v];
          if (!tile) continue;

          let w = 1;
          while (u + w < du && mask[u + w + du * v] === tile) w++;
          let h = 1;
          outer: while (v + h < dv) {
            for (let k = 0; k < w; k++) if (mask[u + k + du * (v + h)] !== tile) break outer;
            h++;
          }
          for (let vv = 0; vv < h; vv++)
            for (let uu = 0; uu < w; uu++) mask[u + uu + du * (v + vv)] = 0;

          // Quad origin on the face plane
          const origin: [number, number, number] = [0, 0, 0];
          origin[axis] = a + (dir[axis] > 0 ? 1 : 0);
          origin[uAxis] = u;
          origin[vAxis] = v;

          // Two edge vectors along u and v (length w / h)
          const duVec = [0, 0, 0]; duVec[uAxis] = w;
          const dvVec = [0, 0, 0]; dvVec[vAxis] = h;

          // Winding flips with direction so faces point outward
          const flip = dir[axis] < 0;
          const corners: [number, number, number][] = flip
            ? [origin,
               [origin[0]+dvVec[0], origin[1]+dvVec[1], origin[2]+dvVec[2]],
               [origin[0]+duVec[0]+dvVec[0], origin[1]+duVec[1]+dvVec[1], origin[2]+duVec[2]+dvVec[2]],
               [origin[0]+duVec[0], origin[1]+duVec[1], origin[2]+duVec[2]]]
            : [origin,
               [origin[0]+duVec[0], origin[1]+duVec[1], origin[2]+duVec[2]],
               [origin[0]+duVec[0]+dvVec[0], origin[1]+duVec[1]+dvVec[1], origin[2]+duVec[2]+dvVec[2]],
               [origin[0]+dvVec[0], origin[1]+dvVec[1], origin[2]+dvVec[2]]];

          // UVs scaled by w/h so the tile *repeats* instead of stretching.
          // DataArrayTexture + RepeatWrapping handles the tiling; layer = tile-1.
          const uvs: [number, number][] = flip
            ? [[0, 0], [0, h], [w, h], [w, 0]]
            : [[0, 0], [w, 0], [w, h], [0, h]];

          const ndx = positions.length / 3;
          corners.forEach((c, i) => {
            positions.push(c[0] + req.origin[0], c[1] + req.origin[1], c[2] + req.origin[2]);
            normals.push(dir[0], dir[1], dir[2]);
            uvLayers.push(uvs[i][0], uvs[i][1], tile - 1);
          });
          indices.push(ndx, ndx + 1, ndx + 2, ndx, ndx + 2, ndx + 3);
          quadCount++;
        }
      }
    }
  }

  const position = new Float32Array(positions);
  const normal = new Float32Array(normals);
  const uvLayer = new Float32Array(uvLayers);
  const index = new Uint32Array(indices);

  // Zero-copy transfer — after this call the worker can no longer touch these buffers.
  (self as unknown as Worker).postMessage(
    { type: 'mesh', chunkId: req.chunkId, position, normal, uvLayer, index, quadCount },
    [position.buffer, normal.buffer, uvLayer.buffer, index.buffer] as unknown as Transferable[]
  );
}

self.onmessage = (e: MessageEvent<BuildRequest>) => {
  if (e.data?.type !== 'build') return;
  try { meshChunk(e.data); }
  catch (err) {
    (self as unknown as Worker).postMessage({
      type: 'error', chunkId: (e.data as BuildRequest).chunkId,
      message: err instanceof Error ? err.message : String(err)
    });
  }
};
