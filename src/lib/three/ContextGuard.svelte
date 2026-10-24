<script lang="ts">
  import { useThrelte } from '@threlte/core';
  import { onMount, onDestroy } from 'svelte';
  import { portfolioState } from '../state.svelte';

  /**
   * ContextGuard — lives INSIDE <Canvas> (Threlte v8+ has no oncreated
   * callback on Canvas; context is only reachable via useThrelte here).
   * webglcontextlost: preventDefault() is required for restore to fire;
   * portfolioState.contextLost pauses PlayerController's task.
   * webglcontextrestored: bump worldRebuildNonce -> VoxelWorld re-meshes
   * via the worker and re-uploads BufferGeometry (GPU buffers were lost).
   */
  const { renderer } = useThrelte();
  let canvas: HTMLCanvasElement | null = null;

  const onLost = (e: Event) => { e.preventDefault(); portfolioState.setContextLost(true); };
  const onRestored = () => { portfolioState.setContextLost(false); portfolioState.worldRebuildNonce++; };

  onMount(() => {
    canvas = (renderer as unknown as { domElement: HTMLCanvasElement }).domElement;
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
  });
  onDestroy(() => {
    canvas?.removeEventListener('webglcontextlost', onLost);
    canvas?.removeEventListener('webglcontextrestored', onRestored);
  });
</script>
