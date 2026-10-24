<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { portfolioState } from '../state.svelte';

  /**
   * MobileControls — dual-zone touch, no Pointer Lock.
   * Left half: virtual joystick (nipplejs, dynamically imported so desktop
   * never pays for it). Right half: drag-to-look writing lookDelta.
   * Centre-crosshair raycast + HUD prompt button handle interaction.
   */
  let zoneEl = $state<HTMLDivElement | null>(null);
  let manager: { destroy: () => void } | null = null;
  let lastTouch: { x: number; y: number } | null = null;

  onMount(async () => {
    if (!portfolioState.isTouch || !zoneEl) return;
    const nipplejs = (await import('nipplejs')).default;
    manager = nipplejs.create({ zone: zoneEl, mode: 'static', position: { left: '72px', bottom: '72px' }, color: 'white' }) as never;
    (manager as unknown as { on: Function }).on('move', (_: unknown, d: { vector: { x: number; y: number } }) => {
      portfolioState.moveVector = { x: d.vector.x, z: -d.vector.y };
    });
    (manager as unknown as { on: Function }).on('end', () => (portfolioState.moveVector = { x: 0, z: 0 }));
  });
  onDestroy(() => manager?.destroy());

  function onTouchMove(e: TouchEvent) {
    const t = e.touches[0];
    if (!t || t.clientX < window.innerWidth / 2) return; // right half only = look
    if (lastTouch) portfolioState.lookDelta = { x: t.clientX - lastTouch.x, y: t.clientY - lastTouch.y };
    lastTouch = { x: t.clientX, y: t.clientY };
  }
</script>

{#if portfolioState.isTouch}
  <div bind:this={zoneEl} class="joystick-zone" aria-hidden="true"></div>
  <div class="look-zone" role="presentation" aria-hidden="true" ontouchmove={onTouchMove} ontouchend={() => (lastTouch = null)}></div>
  <button class="jump" onclick={() => (portfolioState.jumpQueued = true)}>Jump</button>
{/if}

<style>
  .joystick-zone { position: absolute; left: 0; bottom: 0; width: 45%; height: 45%; z-index: 12; }
  .look-zone { position: absolute; right: 0; top: 0; width: 55%; height: 100%; z-index: 11; touch-action: none; }
  .jump { position: absolute; right: 1.2rem; bottom: 5.5rem; z-index: 13; width: 64px; height: 64px; border-radius: 50%; border: 0; background: rgba(15,23,42,.8); color: #fff; font-weight: 700; }
</style>
