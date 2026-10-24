# Deploy — Voxel Portfolio (static build)

The site is a fully static SvelteKit build (`@sveltejs/adapter-static`).
Deploy = put the `build/` directory on any static host. No server, no env vars.

## Pre-launch checklist

### Content (your side — code can't fix these)
- [ ] **Add `static/resume.pdf`.** The resume drawer links to `/resume.pdf` and the file does not exist yet — without it the link serves the SPA fallback page instead of a PDF. Rebuild after adding it.
- [x] GitHub URL in `src/lib/content/portfolio.ts` (`externalLinks`) now points at github.com/enonymous1 (fixed in the publish prep).
- [ ] Proof the panel copy in `src/lib/content/portfolio.ts` and the resume text in `Overlays.svelte`.

### Build & verify (automatable — all wired as npm scripts)
- [ ] **Node `^20.19` or `>=22.12`** (Vite 7 requirement — older 20.x crashes with `` `node:util` does not provide an export named 'styleText' ``). Node 22 LTS recommended.
- [ ] `npm install`
- [ ] `npm run check` — expect **0 errors, 0 warnings**
- [ ] `npm run test:collision` (6) · `npm run test:gallery` (9) · `npm run test:a11y` (8)
- [ ] `npm run build`
- [ ] `npm run test:gallery-worker` (5 — needs the build from the previous step)
- [ ] `npm run preflight` — asserts the build output itself (see below); resolve any ⚠ it prints
- [ ] `npm run preview` and click through once locally

### Hosting requirements (the easy-to-miss ones)
- [ ] **HTTPS.** Pointer Lock (desktop mouse-look) only works in a secure context — on plain HTTP it silently does nothing and the site feels broken. Every host below gives HTTPS by default; a self-hosted HTTP deploy is the trap.
- [ ] **SPA fallback:** unknown paths must serve `index.html`. Configs shipped for Netlify / Cloudflare Pages (`static/_redirects`, copied into `build/` automatically), Vercel (`deploy/vercel.json`), and nginx (`deploy/nginx-voxel-portfolio.conf`). GitHub Pages: run `cp build/index.html build/404.html` after each build.
- [ ] **Root of a domain, not a subpath** — unless you fix paths first. Model URLs (`/models/*.glb`) and `/resume.pdf` are absolute. For a subpath deploy (e.g. GitHub Pages project site at `user.github.io/repo/`), set `paths.base` in `svelte.config.js` AND prefix the model paths in `portfolio.ts` with the base, or the gallery silently keeps its placeholder boxes.
- [ ] **GLB files must serve as files, not fallback HTML.** After deploying: `curl -sI https://YOURSITE/models/dice.glb` — expect `200` and a size of **3648 bytes** (printer 4148, rack 4648). If you get an HTML document instead, your fallback rule is swallowing `/models/*` — the gallery worker will fail to parse it and the (working) placeholders stay forever, which looks fine and is wrong.
- [ ] Cache headers: shipped in `static/_headers` (Netlify / Cloudflare Pages read it from the output dir): `/_app/immutable/*` = 1 year immutable (they're content-hashed — this is safe and the big perf win), `/models/*` = 1 week, everything else gets basic security headers. On Vercel/nginx, mirror them from the shipped configs. Other hosts ignore the file harmlessly.
- [ ] Optional CSP: not shipped enabled, because an unverified CSP can break WebGL/workers. If you add one, start from:
  `default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'`
  and check the console on the live site before tightening further.

## Post-deploy smoke test (2 minutes, do all of it)
- [ ] Page loads, world builds (no stuck "Building the world…")
- [ ] Click to enter → pointer locks, WASD moves, you collide with the dais/walls and step up onto it
- [ ] Click the podium → resume drawer opens; **Tab cycles inside it**, Esc closes and focus returns to the menu
- [ ] Each workshop workstation opens the right project; archive list opens from the library
- [ ] Gallery pedestals show real models (printer / rack / d20 rotating), **not coloured boxes** — boxes after ~10s means the GLB check above failed
- [ ] On a phone (or DevTools touch emulation): joystick moves, drag looks, prompt button opens panels
- [ ] Browser console: no worker errors, no 404s

## Rollback
Keep the previous `build/` (or its zip). Hashed assets mean the release is effectively `index.html` + new chunks — redeploying the old output restores the old site atomically on every host above.

## What `npm run preflight` checks
`scripts/preflight.mjs` inspects `build/` and fails loudly if: index.html is missing, any `_app` chunk referenced by index.html is missing on disk, a model GLB is missing / wrong size vs `static/` / lacks the `glTF` magic bytes, `models-src/` leaked into the output (it did once — that's why this exists), `_redirects`/`_headers` weren't copied, or the preloaded JS/CSS exceeds the 275 KB gz regression ceiling. It warns (doesn't fail) on the missing `resume.pdf`.
