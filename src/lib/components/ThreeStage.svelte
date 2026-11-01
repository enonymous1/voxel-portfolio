<script lang="ts">
  import { Canvas } from '@threlte/core';
  import Scene from '$lib/three/Scene.svelte';
  /**
   * ThreeStage — the ONLY module that statically imports Threlte/Three.
   * +page.svelte dynamic-imports this component on mount, so Three.js
   * is a lazy chunk, NOT part of the initial payload. Initial load =
   * HTML + CSS + HUD + state (~34 KB gz); the full JS+CSS total is
   * ~262 KB gz against the 275 KB ceiling (re-baselined 2026-10-22
   * when BVH was kept). The world fades in when the chunk + mesh land.
   */
</script>

<Canvas dpr={[1, 1.75]} renderMode="always" colorManagementEnabled={false}>
  <Scene />
</Canvas>
