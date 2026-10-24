/**
 * vite.config.ts aliases '@threlte/extras' to just the HTML component
 * (see the payload-budget note there), so its public named-export types
 * no longer describe the runtime import. Declare the aliased shape:
 */
declare module '@threlte/extras' {
  import type { Component } from 'svelte';
  const HTML: Component<{
    position?: [number, number, number];
    center?: boolean;
    occlude?: boolean;
    zIndexRange?: [number, number];
    children?: import('svelte').Snippet;
  }>;
  export default HTML;
}
