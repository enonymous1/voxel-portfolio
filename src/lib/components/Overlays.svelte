<script lang="ts">
  import { portfolioState } from '../state.svelte';
  import { activeProjects, archivedProjects, galleryItems } from '../content/portfolio';
  import { focusTrap } from '../a11y/focusTrap';

  /**
   * Overlays — ALL portfolio content, in ONE trapped dialog shell.
   * - Mounted by portfolioState.activePanel (mutated by 3D raycast / HUD)
   * - use:focusTrap cycles Tab inside, Esc closes, restores focus on close
   * - Backdrop is a real <button> (keyboard-operable close, in the tab order)
   * - While open, the background layers get `inert` so neither pointer
   *   nor keyboard can interact behind the modal
   */
  const project = $derived(activeProjects.find((p) => p.id === portfolioState.selectedProjectId));
  const gallery = $derived(galleryItems.find((g) => g.id === portfolioState.selectedGalleryId));

  const title = $derived(
    portfolioState.activePanel === 'resume' ? 'Justin — About & Resume'
    : portfolioState.activePanel === 'project' ? (project?.title ?? 'Project')
    : portfolioState.activePanel === 'archive' ? 'Archived Projects Library'
    : portfolioState.activePanel === 'gallery' ? (gallery?.title ?? 'Gallery')
    : portfolioState.activePanel === 'help' ? 'Controls'
    : ''
  );

  // Inert background while any dialog is open
  $effect(() => {
    const open = portfolioState.isAnyPanelOpen;
    if (typeof document === 'undefined') return;
    const targets = document.querySelectorAll<HTMLElement>(
      '.canvas-wrap, .hud, .splash, .prompt, .joystick-zone, .look-zone, .jump'
    );
    targets.forEach((el) => { (el as HTMLElement & { inert: boolean }).inert = open; });
    return () => targets.forEach((el) => { (el as HTMLElement & { inert: boolean }).inert = false; });
  });

  const close = () => portfolioState.closePanel();
</script>

{#if portfolioState.activePanel !== 'none'}
  {#key `${portfolioState.activePanel}:${portfolioState.selectedProjectId ?? ''}:${portfolioState.selectedGalleryId ?? ''}`}
    <div
      class="overlay-root"
      use:focusTrap={{ onClose: close, initialFocusSelector: '[data-dialog-close]' }}
    >
      <div class="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title">
        <header>
          <h2 id="panel-title">{title}</h2>
          <button type="button" data-dialog-close onclick={close} aria-label="Close panel">✕</button>
        </header>

        {#if portfolioState.activePanel === 'resume'}
          <p>CS graduate and builder of data-heavy Python systems: quant pipelines, API auditors, backup tooling, and market-making research — always pre-registered, gauntlet-tested, and honestly reported.</p>
          <h3>Focus</h3>
          <ul><li>High-frequency data pipelines &amp; validation (purged CV, DSR)</li><li>Google / GitHub / Kalshi API tooling</li><li>Flask dashboards, SQLite, Parquet</li></ul>
          <p><a href="/resume.pdf">Download résumé (PDF)</a> · <a href="https://whenwhere.biz" target="_blank" rel="noopener">WhenWhere.biz</a></p>
        {:else if portfolioState.activePanel === 'project'}
          {#if project}
            <p>{project.blurb}</p>
            <ul class="chips">{#each project.stack as s}<li>{s}</li>{/each}</ul>
            {#if project.href}<p><a href={project.href} target="_blank" rel="noopener noreferrer">Visit live site ↗</a></p>{/if}
            {#if project.repo}<p><a href={project.repo} target="_blank" rel="noopener noreferrer">Repository ↗</a></p>{/if}
          {:else}<p>Project not found.</p>{/if}
        {:else if portfolioState.activePanel === 'archive'}
          <ul class="archive-list">
            {#each archivedProjects as p}<li><strong>{p.title}</strong><span>{p.blurb}</span><small>{p.stack.join(' · ')}</small></li>{/each}
          </ul>
        {:else if portfolioState.activePanel === 'gallery'}
          {#if gallery}
            <p>{gallery.blurb}</p>
            <p><small>3D model: <code>{gallery.model}</code> — Meshopt-compressed GLB, loaded async in a worker off the main chunk.</small></p>
          {:else}<p>Gallery item not found.</p>{/if}
        {:else if portfolioState.activePanel === 'help'}
          <ul><li><kbd>W A S D</kbd> move · <kbd>Mouse</kbd> look · <kbd>Space</kbd> jump</li><li><kbd>Click</kbd> / <kbd>E</kbd> interact with a highlighted block</li><li><kbd>Esc</kbd> close panel / release mouse</li><li>Touch: left joystick to move, drag to look, tap centre prompt to interact</li></ul>
          <p>Prefer no 3D? Use the menu at top-left — every zone is reachable as plain HTML.</p>
        {/if}
      </div>
      <button type="button" class="backdrop" aria-label="Close panel" onclick={close}></button>
    </div>
  {/key}
{/if}

<style>
  .overlay-root { position: absolute; inset: 0; display: grid; z-index: 30; }
  .overlay-root > * { grid-area: 1 / 1; }
  .backdrop { background: rgba(2, 6, 23, 0.55); border: 0; padding: 0; cursor: pointer; z-index: 0; width: 100%; height: 100%; }
  .panel { place-self: center; z-index: 1; background: #0f172a; color: #e2e8f0; width: min(560px, calc(100vw - 2rem)); max-height: 82dvh; overflow: auto; border-radius: 14px; padding: 1.25rem 1.5rem; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5); }
  .panel header { display: flex; justify-content: space-between; align-items: start; gap: 1rem; }
  .panel h2 { margin: 0; font-size: 1.25rem; }
  .panel a { color: #38bdf8; }
  .panel header button { background: transparent; border: 0; color: inherit; font-size: 1.1rem; cursor: pointer; min-width: 40px; min-height: 40px; }
  .chips { display: flex; gap: 0.4rem; flex-wrap: wrap; list-style: none; padding: 0; }
  .chips li { background: #1e293b; padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 0.8rem; }
  .archive-list { list-style: none; padding: 0; display: grid; gap: 0.9rem; }
  .archive-list li { display: grid; gap: 0.15rem; }
  .archive-list small { color: #94a3b8; }
  kbd { background: #1e293b; padding: 0.1rem 0.35rem; border-radius: 4px; }
</style>
