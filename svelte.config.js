import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Static: the whole portfolio is a landing page — no server needed,
    // keeps hosting + payload minimal and makes the build CDN-cacheable.
    adapter: adapter({ fallback: 'index.html' }),
    prerender: { entries: ['*'] }
  }
};
export default config;
