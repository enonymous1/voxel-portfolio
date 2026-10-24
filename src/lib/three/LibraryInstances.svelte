<script lang="ts">
  import { T } from '@threlte/core';
  import * as THREE from 'three';
  import { onMount } from 'svelte';

  /**
   * LibraryInstances — archive chests as ONE InstancedMesh draw call.
   * Per spec: archived items must not each be a Mesh. Count = chests in
   * world.ts library row. Interaction is still via the voxel chest blocks;
   * this is purely the decorative instanced layer.
   */
  let mesh = $state<THREE.InstancedMesh | undefined>(undefined);
  const positions: [number, number, number][] = [
    [3.5, 1.35, 10.5], [3.5, 1.35, 14.5], [3.5, 1.35, 18.5], [3.5, 1.35, 22.5], [3.5, 1.35, 25.5]
  ];
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
