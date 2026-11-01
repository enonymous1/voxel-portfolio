<script lang="ts">
  import { T } from '@threlte/core';
  import * as THREE from 'three';
  import { onMount } from 'svelte';
  import { LIBRARY_CRATE_POSITIONS } from './world';

  /**
   * LibraryInstances — aisle crates as ONE InstancedMesh draw call.
   * Per spec: archived items must not each be a Mesh. Positions live in
   * world.ts (LIBRARY_CRATE_POSITIONS) — an earlier version of this
   * comment claimed these were the voxel chest blocks, which was wrong
   * on count (5 crates vs 9 chests) and position (aisle gaps, not
   * chest blocks). Interaction stays on the voxel blocks; this layer
   * is purely decorative.
   */
  let mesh = $state<THREE.InstancedMesh | undefined>(undefined);
  const positions = LIBRARY_CRATE_POSITIONS;
  onMount(() => {
    if (!mesh) return;
    const m = new THREE.Matrix4();
    positions.forEach((p, i) => { m.setPosition(p[0], p[1], p[2]); mesh!.setMatrixAt(i, m); });
    mesh.instanceMatrix.needsUpdate = true;
  });
</script>

<T.InstancedMesh bind:ref={mesh} args={[undefined, undefined, positions.length]} frustumCulled={false}>
  <T.BoxGeometry args={[0.9, 0.6, 0.9]} />
  <T.MeshStandardMaterial color="#92400e" roughness={0.8} />
</T.InstancedMesh>
