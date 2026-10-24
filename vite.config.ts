import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  resolve: {
    alias: [
      // Rollup otherwise bundles the *unminified* three.module.js (~876 KB chunk).
      // Exact-match alias to the official min build cuts the 3D chunk by ~40%.
      // Regex (not string) so 'three/examples/...' subpaths are untouched.
      {
        find: /^three$/,
        // Absolute path: three's package "exports" map blocks the build/ subpath
        replacement: fileURLToPath(new URL('./node_modules/three/build/three.module.min.js', import.meta.url))
      },
      {
        find: /^@threlte\/extras$/,
        // Only <HTML> is used. Barrel = all components + three-stdlib (~35 KB gz extra).
        replacement: fileURLToPath(new URL('./node_modules/@threlte/extras/dist/components/HTML/HTML.svelte', import.meta.url))
      }
    ]
  },
  worker: {
    // Workers must be ES modules so `chunkWorker.ts` can use typed
    // postMessage + Transferable ArrayBuffers cleanly.
    format: 'es'
  },
  build: {
    target: 'es2022',
    // Payload budget guardrail: warn early if a chunk creeps up.
    // Ceiling re-baselined 2026-10-22 when BVH was kept by decision:
    // measured total is ~267 KB gz for all JS+CSS — 275 KB is the
    // regression ceiling, not a target. Content lives in DOM, not textures.
    chunkSizeWarningLimit: 275
    // Note: SvelteKit controls chunking; the 3D code is split by the
    // dynamic import of ThreeStage in +page.svelte, not manualChunks.
  },
  // three-mesh-bvh ships ESM workers/internals that Vite should not pre-bundle oddly
  optimizeDeps: { exclude: ['three-mesh-bvh'] } // barrel excluded; we import core subpaths only
});
