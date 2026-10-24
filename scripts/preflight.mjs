/**
 * preflight.mjs — verify the build OUTPUT, not the source.
 * Run after `npm run build`:  npm run preflight
 * Fails (exit 1) on anything that would silently break the deployed
 * site; warns on content gaps that are the owner's call.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const build = new URL('../build/', import.meta.url).pathname;
const statik = new URL('../static/', import.meta.url).pathname;
let fails = 0, warns = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? '✓' : '✗ FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
  if (!cond) fails++;
};
const warn = (cond, label, detail = '') => {
  if (!cond) { console.log(`⚠ WARN  ${label}${detail ? '  ' + detail : ''}`); warns++; }
};

if (!existsSync(join(build, 'index.html'))) {
  console.log('✗ FAIL  build/index.html missing — run `npm run build` first');
  process.exit(1);
}
const html = readFileSync(join(build, 'index.html'), 'utf8');

// 1. Every asset index.html references must exist on disk
const refs = [...new Set([...html.matchAll(/_app\/immutable\/[^"'\s]+/g)].map((m) => m[0]))];
const missing = refs.filter((r) => !existsSync(join(build, r)));
ok(missing.length === 0, `index.html asset refs all present (${refs.length})`, missing.join(', '));

// 2. Payload ceiling on those preloaded refs (275 KB gz, decided 2026-10-22)
const gzTotal = refs
  .filter((r) => r.endsWith('.js') || r.endsWith('.css'))
  .reduce((s, r) => s + gzipSync(readFileSync(join(build, r))).length, 0);
ok(gzTotal <= 275 * 1024, `preloaded JS/CSS ${(gzTotal / 1024).toFixed(1)} KB gz <= 275 KB ceiling`);

// 3. Models: present, same size as static/, real GLB magic bytes
for (const name of ['printer.glb', 'rack.glb', 'dice.glb']) {
  const out = join(build, 'models', name);
  const srcSize = statSync(join(statik, 'models', name)).size;
  if (!existsSync(out)) { ok(false, `build/models/${name} present`); continue; }
  const buf = readFileSync(out);
  ok(buf.length === srcSize && buf.subarray(0, 4).toString() === 'glTF',
    `build/models/${name} intact`, `${buf.length}B (source ${srcSize}B)`);
}

// 4. Regression guard: uncompressed sources must NOT be in the output
ok(!existsSync(join(build, 'models-src')), 'no models-src/ leaked into build/');

// 5. Host configs copied from static/
ok(existsSync(join(build, '_redirects')), 'build/_redirects present (Netlify / CF Pages fallback)');
ok(existsSync(join(build, '_headers')), 'build/_headers present (cache + security headers)');

// 6. Workers were emitted
const workers = existsSync(join(build, '_app/immutable/workers'))
  ? readdirSync(join(build, '_app/immutable/workers')) : [];
ok(workers.some((f) => f.startsWith('chunkWorker')), 'chunkWorker emitted', workers.join(', '));
ok(workers.some((f) => f.startsWith('galleryWorker')), 'galleryWorker emitted');

// (Résumé links to LinkedIn now — no static/resume.pdf to check for.)

console.log(`\npreflight: ${fails} failure(s), ${warns} warning(s)`);
process.exit(fails ? 1 : 0);
