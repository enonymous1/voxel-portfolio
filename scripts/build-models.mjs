/**
 * build-models.mjs — procedural gallery models -> GLB
 * ------------------------------------------------------------------
 * No artist-made assets exist for this portfolio, so the three gallery
 * models are built from three.js primitives in Node, merged into a
 * single vertex-coloured geometry per model, and written as binary
 * glTF with a minimal hand-rolled GLB writer (header + JSON + BIN).
 * Then `npm run build:models` Meshopt-compresses them via gltfpack
 * into static/models/ — those are the files the site actually loads.
 *
 * Models sit on y=0 (base) and fit roughly a 0.9 x 0.8 x 0.9 box so
 * they drop straight onto the gallery pedestals (top at y=2).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

mkdirSync(new URL('../models-src/', import.meta.url), { recursive: true });

/** One coloured, transformed primitive, ready to merge */
function part(geo, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz));
  m.setPosition(x, y, z);
  g.applyMatrix4(m);
  return g;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 20) => new THREE.CylinderGeometry(rt, rb, h, s);

// --- 3D printer (gantry + bed + spool + a little printed cube) ----------
const printer = mergeGeometries([
  part(box(0.8, 0.08, 0.7), 0x334155, 0, 0.04, 0),                       // base
  part(box(0.6, 0.03, 0.55), 0x14b8a6, 0, 0.1, 0.02),                    // bed
  part(box(0.18, 0.16, 0.18), 0xf97316, -0.08, 0.2, 0.02),               // printed part
  part(box(0.06, 0.56, 0.06), 0x64748b, -0.34, 0.36, -0.28),             // posts
  part(box(0.06, 0.56, 0.06), 0x64748b, 0.34, 0.36, -0.28),
  part(box(0.74, 0.06, 0.06), 0x64748b, 0, 0.66, -0.28),                 // top bar
  part(box(0.68, 0.05, 0.05), 0x94a3b8, 0, 0.5, -0.28),                  // X gantry
  part(box(0.13, 0.13, 0.13), 0x1e293b, 0.1, 0.43, -0.28),               // extruder
  part(new THREE.ConeGeometry(0.035, 0.07, 12), 0xfacc15, 0.1, 0.33, -0.28, Math.PI), // nozzle
  part(cyl(0.11, 0.11, 0.07), 0x3b82f6, 0, 0.76, -0.28, Math.PI / 2)    // filament spool
]);

// --- Homelab server rack (cabinet + 5 units + LED dots) ------------------
const rackParts = [
  part(box(0.62, 0.78, 0.55), 0x111827, 0, 0.39, 0),                     // cabinet
  part(box(0.54, 0.7, 0.02), 0x1f2937, 0, 0.39, 0.28)                   // front face
];
for (let i = 0; i < 5; i++) {
  const y = 0.13 + i * 0.13;
  rackParts.push(part(box(0.5, 0.09, 0.02), i % 2 ? 0x374151 : 0x4b5563, 0, y, 0.295)); // unit
  rackParts.push(part(box(0.035, 0.035, 0.012), 0x22c55e, 0.18, y, 0.3));               // power LED
  rackParts.push(part(box(0.035, 0.035, 0.012), i % 2 ? 0x38bdf8 : 0xf59e0b, 0.11, y, 0.3)); // activity LED
}
const rack = mergeGeometries(rackParts);

// --- Tabletop d20 on a display stand --------------------------------------
const dice = mergeGeometries([
  part(cyl(0.3, 0.34, 0.06, 24), 0x1e293b, 0, 0.03, 0),                  // stand disc
  part(cyl(0.07, 0.1, 0.08, 12), 0x475569, 0, 0.09, 0),                  // stand neck
  part(new THREE.IcosahedronGeometry(0.33, 0), 0x7c3aed, 0, 0.46, 0, 0.4, 0.7, 0) // the d20
]);

// --- Minimal GLB writer ---------------------------------------------------
function writeGLB(geometry, name) {
  const pos = geometry.attributes.position.array;
  const nor = geometry.attributes.normal.array;
  const col = geometry.attributes.color.array;
  const count = geometry.attributes.position.count;

  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let a = 0; a < 3; a++) {
    min[a] = Math.min(min[a], pos[i + a]); max[a] = Math.max(max[a], pos[i + a]);
  }
  const chunks = [pos, nor, col];
  let binLen = 0;
  const views = chunks.map((arr) => {
    const v = { buffer: 0, byteOffset: binLen, byteLength: arr.byteLength };
    binLen += arr.byteLength;
    return v;
  });
  const json = {
    asset: { version: '2.0', generator: 'voxel-portfolio build-models.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name }],
    meshes: [{ name, primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, material: 0, mode: 4 }] }],
    materials: [{ name: 'vertexColors', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0.05, roughnessFactor: 0.65 } }],
    accessors: [
      { bufferView: 0, componentType: 5126, count, type: 'VEC3', min, max },
      { bufferView: 1, componentType: 5126, count, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count, type: 'VEC3' }
    ],
    bufferViews: views,
    buffers: [{ byteLength: binLen }]
  };
  const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  const binPad = (4 - (binLen % 4)) % 4;
  const total = 12 + 8 + jsonBuf.length + jsonPad + 8 + binLen + binPad;
  const out = Buffer.alloc(total);
  let o = 0;
  out.writeUInt32LE(0x46546c67, o); o += 4; // 'glTF'
  out.writeUInt32LE(2, o); o += 4;
  out.writeUInt32LE(total, o); o += 4;
  out.writeUInt32LE(jsonBuf.length + jsonPad, o); o += 4;
  out.writeUInt32LE(0x4e4f534a, o); o += 4; // 'JSON'
  jsonBuf.copy(out, o); o += jsonBuf.length;
  for (let i = 0; i < jsonPad; i++) out.writeUInt8(0x20, o++);
  out.writeUInt32LE(binLen + binPad, o); o += 4;
  out.writeUInt32LE(0x004e4942, o); o += 4; // 'BIN\0'
  for (const arr of chunks) { Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).copy(out, o); o += arr.byteLength; }
  return out;
}

import { execFileSync } from 'node:child_process';
mkdirSync(new URL('../static/models/', import.meta.url), { recursive: true });
const gltfpackCli = new URL('../node_modules/gltfpack/cli.js', import.meta.url).pathname;

for (const [geo, name] of [[printer, 'printer'], [rack, 'rack'], [dice, 'dice']]) {
  const buf = writeGLB(geo, name);
  const src = new URL(`../models-src/${name}.glb`, import.meta.url).pathname;
  const dst = new URL(`../static/models/${name}.glb`, import.meta.url).pathname;
  writeFileSync(src, buf);
  // -c = EXT_meshopt_compression (+ KHR_mesh_quantization); decoded at
  // runtime by MeshoptDecoder — chosen over Draco because its decoder is
  // a single self-contained module, no external WASM CDN fetch.
  execFileSync(process.execPath, [gltfpackCli, '-i', src, '-o', dst, '-c'], { stdio: 'pipe' });
  console.log(`${name}.glb  source ${buf.length}B -> meshopt ${readFileSync(dst).length}B  verts=${geo.attributes.position.count}`);
}
