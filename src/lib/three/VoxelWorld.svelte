<script lang="ts">
  import { T } from '@threlte/core';
  import * as THREE from 'three';
  // Subpath imports, NOT the barrel: 'three-mesh-bvh' index re-exports
  // ~63 KB gz of unrelated utils/workers. Core-only keeps BVH at a few KB.
  import { MeshBVH } from 'three-mesh-bvh/src/core/MeshBVH.js';
  import { acceleratedRaycast } from 'three-mesh-bvh/src/utils/ExtensionUtilities.js';
  import { onMount, onDestroy } from 'svelte';
  import { portfolioState } from '../state.svelte';
  import { buildVoxels, WORLD_SIZE } from './world';
  import { createAtlasTexture, createVoxelMaterial } from './textureAtlas';

  /**
   * VoxelWorld — owns the worker lifecycle + BufferGeometry.
   * Exposes the mesh via `bind:mesh` so Scene can raycast against it.
   * On webglcontextrestored, +page tells us to rebuild: geometry's GPU
   * buffers were lost with the context, CPU-side arrays are re-meshed.
   */
  let { mesh = $bindable<THREE.Mesh | undefined>(undefined) }: {
    mesh?: THREE.Mesh | undefined;
  } = $props();

  let worker: Worker | null = null;
  let geometry = $state<THREE.BufferGeometry | null>(null);
  let material = $state<THREE.ShaderMaterial | null>(null);
  let lastNonce = 0;

  /**
   * Create the worker (lazily, so a failed start is retryable: the
   * +page Retry button bumps worldRebuildNonce, which re-enters
   * requestBuild, which recreates the worker instead of no-op'ing
   * on a null handle). Two failure channels, both surfaced in state:
   * a 'error' message from inside the worker, and worker.onerror for
   * a worker that never started (bad URL, CSP, module 404).
   */
  function createWorker() {
    worker = new Worker(new URL('../workers/chunkWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'error') {
        portfolioState.worldError = `World build failed: ${e.data.message}`;
        return;
      }
      if (e.data.type !== 'mesh') return;
      const { position, normal, uvLayer, index } = e.data as {
        position: Float32Array; normal: Float32Array; uvLayer: Float32Array; index: Uint32Array;
      };
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
      geo.setAttribute('uvLayer', new THREE.BufferAttribute(uvLayer, 3)); // custom: (u, v, layer)
      geo.setIndex(new THREE.BufferAttribute(index, 1));
      geo.computeBoundingSphere();
      // BVH: O(log n) raycast instead of testing every triangle — essential as quad count grows
      (geo as unknown as { boundsTree: MeshBVH }).boundsTree = new MeshBVH(geo);
      geometry?.dispose();
      geometry = geo;
      portfolioState.worldReady = true;
      portfolioState.worldError = null;
    };
    worker.onerror = () => {
      portfolioState.worldError = 'The world builder failed to start. Check the console, then retry.';
    };
  }

  function requestBuild() {
    if (!worker) {
      try { createWorker(); }
      catch (err) {
        portfolioState.worldError = `The world builder failed to start: ${err instanceof Error ? err.message : String(err)}`;
        return;
      }
    }
    // TS can't narrow `worker` through the createWorker() call above,
    // so bind it locally (and bail if creation somehow left it null).
    const w = worker;
    if (!w) return;
    portfolioState.worldReady = false;
    portfolioState.worldError = null;
    const voxels = buildVoxels();
    // Transfer a copy of the buffer — buildVoxels() result is ours to give away.
    w.postMessage(
      { type: 'build', chunkId: 'main', size: WORLD_SIZE, origin: [0, 0, 0], voxels: voxels.buffer },
      [voxels.buffer]
    );
  }

  onMount(() => {
    material = createVoxelMaterial(createAtlasTexture());
    requestBuild();
  });

  // Context-restored rebuild: ContextGuard increments worldRebuildNonce in state
  $effect(() => {
    const n = portfolioState.worldRebuildNonce;
    if (n !== lastNonce) { lastNonce = n; requestBuild(); }
  });

  onDestroy(() => { worker?.terminate(); geometry?.dispose(); material?.dispose(); });
</script>

{#if geometry && material}
  <T.Mesh bind:ref={mesh} {geometry} {material} raycast={acceleratedRaycast} frustumCulled={false} />
{/if}
