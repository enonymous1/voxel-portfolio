import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

let pass = 0, fail = 0;
const check = (name, cond, detail) => { console.log(`${cond?'PASS':'FAIL'}  ${name}  ${detail}`); cond ? pass++ : fail++; };

await MeshoptDecoder.ready;
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

for (const name of ['printer', 'rack', 'dice']) {
  const buf = readFileSync(new URL(`../static/models/${name}.glb`, import.meta.url));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  // JSON chunk: header 12, chunk header 8
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  check(`${name}: EXT_meshopt_compression declared`,
    (json.extensionsUsed ?? []).includes('EXT_meshopt_compression'),
    `extensionsUsed=${JSON.stringify(json.extensionsUsed)}`);
  const gltf = await new Promise((res, rej) => loader.parse(ab, '', res, rej));
  let meshes = 0, verts = 0, hasColor = false, bbox = new THREE.Box3();
  gltf.scene.traverse((o) => {
    if (o.isMesh) { meshes++; verts += o.geometry.attributes.position.count; hasColor = hasColor || !!o.geometry.attributes.color; bbox.expandByObject(o); }
  });
  const size = bbox.getSize(new THREE.Vector3());
  check(`${name}: parses + meshes + vertex colours`, meshes >= 1 && verts > 100 && hasColor, `meshes=${meshes} verts=${verts} color=${hasColor}`);
  check(`${name}: pedestal-sized bounds`, size.x <= 1.0 && size.y <= 0.95 && size.z <= 1.0 && bbox.min.y >= -0.01,
    `size=${size.toArray().map(v=>v.toFixed(2))} minY=${bbox.min.y.toFixed(2)}`);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
