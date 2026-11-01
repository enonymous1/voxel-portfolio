<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import * as THREE from 'three';
  import { onMount, onDestroy } from 'svelte';
  import { galleryItems } from '../content/portfolio';
  import { galleryPedestal } from './world';
  import type { MeshPayload } from '../workers/galleryWorker';

  /**
   * GalleryModels — pedestals in the Interests Gallery (x=28 row).
   * GLBs are fetched + parsed in galleryWorker (Meshopt decode off the
   * main thread); this component assembles the transferred buffers
   * into meshes, swaps out the placeholder box per item as its model
   * lands, and slowly rotates the displays. If the worker fails for
   * an item, it falls back to a main-thread GLTFLoader load.
   * Picking stays on the voxel pedestals (PlayerController) — these
   * meshes are display-only, so they need no BVH of their own.
   */
  // Positions come from the world registry (galleryPedestal) — the old
  // table duplicated the pedestal coordinates a second time, so moving
  // a pedestal in world.ts silently left its model floating elsewhere.
  // Only the placeholder colours are presentation-owned here.
  const PLACEHOLDERS: Record<string, string> = {
    '3d-printing': '#f59e0b', homelab: '#38bdf8', dice: '#a78bfa'
  };
  const PEDESTALS: Record<string, { pos: [number, number, number]; placeholder: string }> = Object.fromEntries(
    galleryItems.map((item) => {
      const pos = galleryPedestal(item.id);
      return [item.id, pos ? { pos, placeholder: PLACEHOLDERS[item.id] ?? '#fff' } : undefined];
    }).filter(([, v]) => v !== undefined)
  ) as Record<string, { pos: [number, number, number]; placeholder: string }>;

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.08 });
  let groups = $state<Record<string, THREE.Group | undefined>>({});
  const liveGroups = new Map<string, THREE.Group>();
  let worker: Worker | null = null;

  function install(id: string, group: THREE.Group) {
    const p = PEDESTALS[id];
    if (!p) return;
    group.position.set(p.pos[0], p.pos[1], p.pos[2]);
    liveGroups.set(id, group);
    groups = { ...groups, [id]: group };
  }

  function buildFromPayloads(id: string, payloads: MeshPayload[]) {
    const group = new THREE.Group();
    const m = new THREE.Matrix4();
    for (const p of payloads) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(p.position, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(p.normal, 3));
      if (p.color) geo.setAttribute('color', new THREE.BufferAttribute(p.color, 3));
      if (p.index) geo.setIndex(new THREE.BufferAttribute(p.index, 1));
      const mesh = new THREE.Mesh(geo, material);
      mesh.applyMatrix4(m.fromArray(p.matrix));
      group.add(mesh);
    }
    install(id, group);
  }

  async function fallbackLoad(id: string, url: string) {
    try {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/libs/meshopt_decoder.module.js')
      ]);
      await MeshoptDecoder.ready;
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.loadAsync(url);
      install(id, gltf.scene as THREE.Group);
    } catch (err) {
      console.error(`[gallery] ${id} failed via worker and fallback — placeholder stays`, err);
    }
  }

  onMount(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    worker = new Worker(new URL('../workers/galleryWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'model') buildFromPayloads(e.data.id, e.data.meshes as MeshPayload[]);
      else if (e.data.type === 'error') {
        console.warn(`[galleryWorker] ${e.data.id}: ${e.data.message} — falling back`);
        const item = galleryItems.find((g) => g.id === e.data.id);
        if (item) void fallbackLoad(item.id, item.model);
      }
    };
    worker.onerror = () => {
      for (const item of galleryItems) if (!liveGroups.has(item.id)) void fallbackLoad(item.id, item.model);
    };
    for (const item of galleryItems) {
      worker.postMessage({ type: 'load', id: item.id, url: new URL(item.model, window.location.origin).href });
    }
  });
  onDestroy(() => worker?.terminate());

  // Respect prefers-reduced-motion: no idle rotation for those users
  let reducedMotion = false;

  useTask((delta) => {
    if (reducedMotion) return;
    for (const g of liveGroups.values()) g.rotation.y += delta * 0.5;
  });
</script>

{#each galleryItems as item}
  {@const p = PEDESTALS[item.id]}
  {#if p}
    {#if groups[item.id]}
      <T is={groups[item.id]} />
    {:else}
      <!-- Placeholder until the worker delivers this model -->
      <T.Mesh position={[p.pos[0], 2.35, p.pos[2]]}>
        <T.BoxGeometry args={[0.7, 0.7, 0.7]} />
        <T.MeshStandardMaterial color={p.placeholder} />
      </T.Mesh>
    {/if}
  {/if}
{/each}
