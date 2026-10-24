/**
 * gallery-worker.test.mjs — runs the BUILT galleryWorker bundle in Node
 * (shimmed self/fetch) and checks the transferred payload matches a
 * reference GLTFLoader parse. Run AFTER `npm run build`:
 *   npm run build && npm run test:gallery-worker
 * Guards the interleaved-attribute extraction in galleryWorker.ts:
 * position must be exactly count*3 floats, colour RGB, index present.
 */
import { readFileSync, readdirSync } from 'node:fs';

const workersDir = new URL('../build/_app/immutable/workers/', import.meta.url);
const file = readdirSync(workersDir).find((f) => f.startsWith('galleryWorker'));
if (!file) { console.error('FAIL: no built galleryWorker bundle — run npm run build first'); process.exit(1); }

let resolveMsg;
const got = new Promise((r) => (resolveMsg = r));
globalThis.self = { postMessage: (msg) => resolveMsg(msg), onmessage: null };
globalThis.fetch = async (url) => {
  const name = String(url).split('/').pop();
  const buf = readFileSync(new URL(`../static/models/${name}`, import.meta.url));
  return { ok: true, status: 200, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
};

await import(new URL(file, workersDir).href);
self.onmessage({ data: { type: 'load', id: 'dice', url: 'http://test/models/dice.glb' } });
const msg = await got;

let pass = 0, fail = 0;
const check = (name, cond, detail) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); cond ? pass++ : fail++; };
check('worker returns model', msg.type === 'model', `type=${msg.type}${msg.message ? ' ' + msg.message : ''}`);
if (msg.type === 'model') {
  const m = msg.meshes[0];
  check('one mesh, 216 verts (matches reference parse)', msg.meshes.length === 1 && m.position.length === 216 * 3,
    `meshes=${msg.meshes.length} positionFloats=${m.position.length}`);
  check('colour present as RGB', !!m.color && m.color.length === 216 * 3, `colorFloats=${m.color?.length}`);
  check('index present, 492 indices', !!m.index && m.index.length === 492, `indices=${m.index?.length}`);
  check('matrix is 16 floats', m.matrix.length === 16, '');
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
