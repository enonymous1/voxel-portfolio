<script lang="ts">
  import { Canvas } from '@threlte/core';
  import Scene from '$lib/three/Scene.svelte';
  /**
   * ThreeStage — the ONLY module that statically imports Threlte/Three.
   * +page.svelte dynamic-imports this component on mount, so Three.js
   * (~242 KB gz) is a lazy chunk, NOT part of the initial payload.
   * Initial load = HTML + CSS + HUD + state (~25 KB gz), well under
   * the 250 KB budget; the world fades in when the chunk + mesh land.
   */
</script>

<Canvas dpr={[1, 1.75]} renderMode="always" colorManagementEnabled={false}>
  <Scene />
</Canvas>
