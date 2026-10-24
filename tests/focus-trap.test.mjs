/**
 * focus-trap.test.mjs — jsdom tests for src/lib/a11y/focusTrap.ts
 * Run: npm run test:a11y   (compiles the TS core with esbuild first)
 */
import { JSDOM } from 'jsdom';
import { createFocusTrap } from '../.test-build/focusTrap.mjs';

const dom = new JSDOM(`<!doctype html><body>
  <button id="opener">Open resume</button>
  <button id="fallback" data-focus-fallback>About / Resume</button>
  <button id="outside">Outside</button>
  <div id="root">
    <div role="dialog">
      <button id="close" data-dialog-close>✕</button>
      <a id="link" href="/resume.pdf">Résumé</a>
      <button id="action">Action</button>
    </div>
    <button id="backdrop">Close panel</button>
  </div>
</body>`);
const { document } = dom.window;
const $ = (id) => document.getElementById(id);
const tab = (shift = false) =>
  document.activeElement.dispatchEvent(
    new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true })
  );

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); cond ? pass++ : fail++; };

// --- Trap lifecycle with a real opener --------------------------------
$('opener').focus();
let closes = 0;
const trap = createFocusTrap($('root'), { onClose: () => closes++, initialFocusSelector: '[data-dialog-close]' });
check('initial focus goes to close button', document.activeElement === $('close'), `active=${document.activeElement.id}`);

$('backdrop').focus(); tab();
check('Tab wraps last -> first', document.activeElement === $('close'), `active=${document.activeElement.id}`);

tab(true);
check('Shift+Tab wraps first -> last', document.activeElement === $('backdrop'), `active=${document.activeElement.id}`);

$('link').focus(); tab();
check('Tab mid-list is not hijacked', document.activeElement === $('link'), `active=${document.activeElement.id}`);

let windowEsc = 0;
dom.window.addEventListener('keydown', (e) => { if (e.key === 'Escape') windowEsc++; });
document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
check('Esc calls onClose exactly once', closes === 1, `closes=${closes}`);
check('Esc stopPropagation: window handler never fires', windowEsc === 0, `windowEsc=${windowEsc}`);

trap.destroy();
check('destroy restores focus to opener', document.activeElement === $('opener'), `active=${document.activeElement.id}`);

// --- Fallback when the opener was <body> (dialog opened from 3D) -------
$('opener').blur(); // jsdom: activeElement returns to <body>, as after pointer-lock exit
if (document.activeElement !== document.body) throw new Error('test setup: expected body to be active after blur');
const trap2 = createFocusTrap($('root'), { onClose: () => {} });
trap2.destroy();
check('body opener falls back to [data-focus-fallback]', document.activeElement === $('fallback'), `active=${document.activeElement.id}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
