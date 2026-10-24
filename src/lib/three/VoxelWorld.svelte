<script lang="ts">
  import { T, useThrelte } from '@threlte/core';
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

  const { renderer } = useThrelte();

  function requestBuild() {
    if (!worker) return;
    portfolioState.worldReady = false;
    const voxels = buildVoxels();
    // Transfer a copy of the buffer — buildVoxels() result is ours to give away.
    worker.postMessage(
      { type: 'build', chunkId: 'main', size: WORLD_SIZE, origin: [0, 0, 0], voxels: voxels.buffer },
      [voxels.buffer]
    );
  }

  onMount(() => {
    material = createVoxelMaterial(createAtlasTexture());
    worker = new Worker(new URL('../workers/chunkWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'error') { console.error('[chunkWorker]', e.data.message); return; }
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
      portfolioState.worldProgress = 1;
    };
    requestBuild();
  });

  // Context-restored rebuild: ContextGuard increments worldRebuildNonce in state
  $effect(() => {
    const n = portfolioState.worldRebuildNonce;
    if (n !== lastNonce) { lastNonce = n; requestBuild(); }
  });

  onDestroy(() => { worker?.terminate(); geometry?.dispose(); material?.dispose(); });
  void renderer;
</script>

{#if geometry && material}
  <T.Mesh bind:ref={mesh} {geometry} {material} raycast={acceleratedRaycast} frustumCulled={false} />
{/if}
