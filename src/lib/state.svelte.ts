/**
 * state.svelte.ts — Universal reactive state (Svelte 5 runes)
 * ------------------------------------------------------------------
 * THE bridge between WebGL and DOM. This is the architectural rule:
 *
 *   Three.js / raycasting  --mutates-->  portfolioState  --$effect/DOM-->  HTML overlays
 *
 * - No portfolio text is ever rendered inside the canvas.
 * - Scene.svelte only *writes* hover / zone / activation here.
 * - +page.svelte / overlay components only *read* here and render
 *   semantic, accessible HTML (focus-trapped dialogs, real <a> tags).
 * - This file has NO Three.js imports, so it stays tiny and testable.
 *
 * Usage:
 *   import { portfolioState } from '$lib/state.svelte';
 *   portfolioState.openProject('ss-gapps');
 *   {#if portfolioState.activePanel === 'resume'} <ResumeDrawer /> {/if}
 */
import type { HoveredBlock, PanelKind, ZoneId } from './types';

class PortfolioState {
  // --- Overlay / navigation (DOM side) -------------------------------
  activePanel = $state<PanelKind>('none');
  selectedProjectId = $state<string | null>(null);
  selectedGalleryId = $state<string | null>(null);
  /** Panel that was open before Help, so Esc from Help returns sensibly */
  #panelBeforeHelp: PanelKind = 'none';

  // --- 3D interaction (WebGL side writes, DOM reads for HUD/cursor) --
  hovered = $state<HoveredBlock | null>(null);
  currentZone = $state<ZoneId>('atrium');
  /** True while a chunk mesh rebuild is in flight in the worker */
  worldReady = $state(false);
  worldProgress = $state(0); // 0..1, worker-reported
  /** Incremented on webglcontextrestored — VoxelWorld watches it and re-meshes */
  worldRebuildNonce = $state(0);

  // --- Session / input mode -----------------------------------------
  isPointerLocked = $state(false);
  isTouch = $state(false);          // set once on first touchstart / coarse pointer
  hasInteracted = $state(false);    // hides the "Click to enter" splash
  contextLost = $state(false);      // webglcontextlost — pauses loop, shows fallback

  // --- Movement input (written by PlayerController / MobileControls) -
  /** Normalized wish-direction in local space: x = strafe, z = forward(-1..1) */
  moveVector = $state({ x: 0, z: 0 });
  lookDelta = $state({ x: 0, y: 0 }); // consumed per-frame by controller, then zeroed
  jumpQueued = $state(false);

  // --- Derived --------------------------------------------------------
  isAnyPanelOpen = $derived(this.activePanel !== 'none');
  /** Canvas should capture the pointer only when no DOM panel needs it */
  shouldPointerLock = $derived(
    !this.isAnyPanelOpen && !this.isTouch && !this.contextLost
  );
  cursor = $derived(this.hovered ? 'pointer' : this.isPointerLocked ? 'none' : 'default');
  hoverLabel = $derived(this.hovered?.label ?? null);

  // --- Actions: panels --------------------------------------------------
  openResume() {
    this.activePanel = 'resume';
    this.#exitLockIfNeeded();
  }

  openProject(projectId: string) {
    this.selectedProjectId = projectId;
    this.activePanel = 'project';
    this.#exitLockIfNeeded();
  }

  openArchive() {
    this.activePanel = 'archive';
    this.#exitLockIfNeeded();
  }

  openGallery(galleryId: string) {
    this.selectedGalleryId = galleryId;
    this.activePanel = 'gallery';
    this.#exitLockIfNeeded();
  }

  openHelp() {
    if (this.activePanel !== 'help') this.#panelBeforeHelp = this.activePanel;
    this.activePanel = 'help';
    this.#exitLockIfNeeded();
  }

  closePanel() {
    if (this.activePanel === 'help' && this.#panelBeforeHelp !== 'none') {
      this.activePanel = this.#panelBeforeHelp;
      this.#panelBeforeHelp = 'none';
    } else {
      this.activePanel = 'none';
    }
  }

  /** Single entry point for block activation — called by raycast click / E / tap */
  activateHovered() {
    const h = this.hovered;
    if (!h) return;
    this.hasInteracted = true;
    switch (h.panel) {
      case 'resume':  this.openResume(); break;
      case 'project': if (h.payloadId) this.openProject(h.payloadId); break;
      case 'archive': this.openArchive(); break;
      case 'gallery': if (h.payloadId) this.openGallery(h.payloadId); break;
    }
  }

  // --- Actions: 3D side -------------------------------------------------
  setHovered(block: HoveredBlock | null) {
    // Avoid churn: raycast runs every frame, only assign on change
    if (block?.id !== this.hovered?.id) this.hovered = block;
  }

  setZone(zone: ZoneId) {
    if (zone !== this.currentZone) this.currentZone = zone;
  }

  setContextLost(lost: boolean) {
    this.contextLost = lost;
    if (lost) this.isPointerLocked = false;
  }

  #exitLockIfNeeded() {
    // DOM panels need mouse/keyboard + focus. Exiting lock fires
    // pointerlockchange in PlayerController, which syncs isPointerLocked.
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }
}

/** Singleton — import this everywhere, never `new PortfolioState()` elsewhere */
export const portfolioState = new PortfolioState();
