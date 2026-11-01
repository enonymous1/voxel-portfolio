import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
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
    // NOTE on units: this limit is per-chunk UNCOMPRESSED kilobytes, not
    // gz — the old value of 275 made Vite warn on every healthy build
    // (the 3D chunk is ~784 KB raw, ~262 KB gz total with everything
    // else). The gz ceiling lives where it can be measured: preflight
    // enforces 275 KB gz on the real build output. This limit only
    // guards against the 3D chunk roughly doubling.
    chunkSizeWarningLimit: 900
    // Note: SvelteKit controls chunking; the 3D code is split by the
    // dynamic import of ThreeStage in +page.svelte, not manualChunks.
  },
  // three-mesh-bvh ships ESM workers/internals that Vite should not pre-bundle oddly
  optimizeDeps: { exclude: ['three-mesh-bvh'] } // barrel excluded; we import core subpaths only
});
