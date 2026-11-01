<script lang="ts">
  import { T } from '@threlte/core';
  import { SPAWN_POSITION } from '../config';
  import { PLAYER } from './collision';
  // Default import from '@threlte/extras' — vite.config.ts aliases that exact
  // specifier to ONLY the HTML component file. The extras barrel re-exports
  // every component (three-stdlib, instanced-sprite-mesh, ~35 KB gz) and its
  // package exports map blocks deep imports, hence the alias. See vite.config.ts.
  import HTML from '@threlte/extras';
  import * as THREE from 'three';
  import VoxelWorld from './VoxelWorld.svelte';
  import PlayerController from './PlayerController.svelte';
  import LibraryInstances from './LibraryInstances.svelte';
  import ContextGuard from './ContextGuard.svelte';
  import GalleryModels from './GalleryModels.svelte';
  import { externalLinks } from '../content/portfolio';

  /**
   * Scene.svelte — everything INSIDE the WebGL canvas.
   * No portfolio body copy lives here. The only DOM projected in is
   * the signposts: real <a target="_blank"> via Threlte <HTML>, so
   * links stay keyboard-focusable, screen-reader visible, and
   * middle-clickable — unlike a texture baked onto a sign.
   */
  let worldMesh = $state<THREE.Mesh | undefined>(undefined);
</script>

<T.PerspectiveCamera makeDefault fov={72} near={0.1} far={120} position={[SPAWN_POSITION.x, SPAWN_POSITION.y + PLAYER.eye, SPAWN_POSITION.z]} />
<T.AmbientLight intensity={0.9} />
<T.DirectionalLight position={[18, 30, 12]} intensity={1.6} />

<ContextGuard />
<VoxelWorld bind:mesh={worldMesh} />
<PlayerController {worldMesh} />
<LibraryInstances />

<!-- Gallery: Meshopt-compressed GLBs, fetched + parsed in galleryWorker,
     placeholder boxes swap out per item as its model lands. -->
<GalleryModels />

<!-- External Links / Bookmarks — floating signposts with real HTML anchors -->
{#each externalLinks as link, i}
  <HTML position={[15.5 + i * 2, 3.6, 29.5]} center occlude={false} zIndexRange={[10, 0]}>
    <a class="signpost-link" href={link.href} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>
  </HTML>
{/each}

<style>
  .signpost-link {
    display: inline-block; padding: 0.3rem 0.6rem; border-radius: 0.375rem;
    background: rgba(15, 23, 42, 0.88); color: #fff; font: 600 13px/1 system-ui, sans-serif;
    text-decoration: none; white-space: nowrap; pointer-events: auto;
  }
  .signpost-link:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }
</style>
