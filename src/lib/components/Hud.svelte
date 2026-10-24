<script lang="ts">
  import { portfolioState } from '../state.svelte';
  const zoneNames = { atrium: 'Spawn Atrium', workshop: 'Projects Workshop', library: 'Archived Library', gallery: 'Interests Gallery', signposts: 'Links Gate' } as const;
</script>

<!-- HUD: always-on DOM layer. Also the no-3D fallback nav — every zone reachable without WebGL. -->
<div class="hud">
  <nav id="portfolio-menu" aria-label="Portfolio sections" class="menu">
    <strong>Justin — Voxel Portfolio</strong>
    <button data-focus-fallback onclick={() => portfolioState.openResume()}>About / Resume</button>
    <button onclick={() => portfolioState.openArchive()}>Archive</button>
    <button onclick={() => portfolioState.openHelp()}>Help (?)</button>
    <a href="https://github.com/" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
    <a href="https://whenwhere.biz" target="_blank" rel="noopener noreferrer">WhenWhere ↗</a>
  </nav>
  <div class="zone" aria-live="polite">{zoneNames[portfolioState.currentZone]}</div>
</div>

{#if !portfolioState.hasInteracted && !portfolioState.isAnyPanelOpen}
  <div class="splash">
    <p><strong>Click to explore</strong></p>
    <p>{portfolioState.isTouch ? 'Joystick to move, drag to look.' : 'WASD + mouse. Click a glowing block, or use the menu above.'}</p>
  </div>
{/if}

{#if portfolioState.isPointerLocked || portfolioState.isTouch}
  <div class="crosshair" aria-hidden="true">+</div>
{/if}

{#if portfolioState.hovered}
  <button class="prompt" onclick={() => portfolioState.activateHovered()}>
    {portfolioState.hovered.label}{portfolioState.isTouch ? ' — tap to open' : ' — click / E'}
  </button>
{/if}

{#if portfolioState.contextLost}
  <div class="lost" role="alert">Graphics context lost — restoring the world…</div>
{/if}

<style>
  .hud { position: absolute; inset: 0 0 auto 0; display: flex; justify-content: space-between; padding: .75rem; pointer-events: none; z-index: 20; }
  .menu { pointer-events: auto; display: flex; gap: .5rem; align-items: center; background: rgba(15,23,42,.82); color: #fff; padding: .45rem .7rem; border-radius: 10px; }
  .menu button, .menu a { background: #1e293b; color: #e2e8f0; border: 0; padding: .35rem .6rem; border-radius: 7px; cursor: pointer; min-height: 40px; display: inline-flex; align-items: center; text-decoration: none; font-size: .9rem; box-sizing: border-box; }
  .zone { background: rgba(15,23,42,.7); color: #e2e8f0; padding: .45rem .7rem; border-radius: 10px; font-size: .85rem; }
  .splash { position: absolute; left: 50%; bottom: 18%; transform: translateX(-50%); text-align: center; background: rgba(15,23,42,.85); color: #fff; padding: 1rem 1.4rem; border-radius: 12px; z-index: 15; pointer-events: none; }
  .crosshair { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); color: #fff; font-size: 22px; text-shadow: 0 1px 4px #000; z-index: 10; pointer-events: none; }
  .prompt { position: absolute; left: 50%; bottom: 12%; transform: translateX(-50%); z-index: 15; background: #f59e0b; color: #111827; border: 0; font-weight: 700; padding: .55rem 1rem; border-radius: 999px; cursor: pointer; }
  .lost { position: absolute; inset: auto 1rem 1rem 1rem; background: #7f1d1d; color: #fff; padding: .7rem 1rem; border-radius: 10px; z-index: 40; text-align: center; }
</style>
