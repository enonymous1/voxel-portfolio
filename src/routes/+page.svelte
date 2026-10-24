<script lang="ts">
  import { onMount, type Component } from 'svelte';
  import Hud from '$lib/components/Hud.svelte';
  import Overlays from '$lib/components/Overlays.svelte';
  import MobileControls from '$lib/components/MobileControls.svelte';
  import { portfolioState } from '$lib/state.svelte';

  /**
   * +page.svelte — Hybrid layer root
   * ----------------------------------------------------------------
   * Layer stack (bottom -> top):
   *   1. <Canvas>  absolute, z-0   — WebGL only, no readable content
   *   2. HUD       absolute, z-10-20, pointer-events selectively on
   *   3. Overlays  absolute, z-30  — semantic DOM dialogs (the content)
   * Context-loss handling lives in three/ContextGuard.svelte INSIDE
   * the Canvas — Threlte v8+ exposes the renderer only via useThrelte()
   * in a child component, there is no oncreated prop on <Canvas>.
   */
  // Lazy 3D stage: dynamic import keeps Three.js out of the initial chunk.
  let ThreeStage = $state<Component | null>(null);
  onMount(async () => {
    portfolioState.isTouch =
      window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    ThreeStage = (await import('$lib/components/ThreeStage.svelte')).default;
  });
</script>

<svelte:head>
  <title>Justin — Voxel Portfolio</title>
  <meta name="description" content="Interactive voxel portfolio: quant pipelines, API tooling, and event production — explore in 3D or use the plain HTML menu." />
</svelte:head>

<main class="stage" style:cursor={portfolioState.cursor}>
  <a class="skip-link" href="#portfolio-menu">Skip to portfolio menu</a>
  <h1 class="sr-only">Justin — Voxel Portfolio</h1>

  <!-- 1. WebGL background. NOT aria-hidden: the projected signpost
       links inside are real content (also duplicated in the HUD menu). -->
  <div class="canvas-wrap">
    {#if ThreeStage}<ThreeStage />{/if}
  </div>

  {#if !portfolioState.worldReady}
    <div class="loading" role="status">{ThreeStage ? 'Building the world…' : 'Loading 3D…'}</div>
  {/if}

  <!-- 2 + 3. DOM overlay container — the accessible, real content -->
  <Hud />
  <MobileControls />
  <Overlays />

  <noscript>
    <section style="position:absolute;inset:auto 1rem 1rem 1rem;background:#fff;padding:1rem;">
      <h1>Justin — Portfolio</h1>
      <p>Quant pipelines (ss-cryptoGem), Google Apps Script auditor (ss-gapps), SMS viewer (ss-sms-br), prediction-market research, and WhenWhere.biz event production. Enable JavaScript for the interactive 3D version, or use the menu above.</p>
    </section>
  </noscript>
</main>

<style>
  .stage { position: fixed; inset: 0; overflow: hidden; background: #87ceeb; font-family: system-ui, sans-serif; }
  .canvas-wrap { position: absolute; inset: 0; z-index: 0; }
  .canvas-wrap :global(canvas) { display: block; width: 100%; height: 100%; touch-action: none; }
  .loading { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); background: rgba(15,23,42,.85); color: #fff; padding: .8rem 1.2rem; border-radius: 10px; z-index: 5; }
</style>
