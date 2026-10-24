/**
 * focusTrap.ts — modal focus management (framework-free core + Svelte action)
 * ------------------------------------------------------------------
 * createFocusTrap(container, { onClose }):
 *   - remembers the element focused before the trap (the "opener")
 *   - focuses the first focusable element inside container
 *   - Tab / Shift+Tab cycle within container, never escaping to the page
 *   - Escape calls onClose (and stops propagation, so other global Esc
 *     handlers — e.g. PlayerController's — don't fire a second close)
 *   - destroy() removes listeners and RESTORES focus to the opener
 *     (or to [data-focus-fallback] if the opener is gone / was <body>)
 *
 * The core is plain DOM with no Svelte imports so it is unit-testable
 * in jsdom (tests/focus-trap.test.mjs). The Svelte action is a thin
 * wrapper: use:focusTrap={{ onClose }}.
 */

export interface FocusTrapOptions {
  onClose: () => void;
  /** Focus this selector inside the container first, else first focusable */
  initialFocusSelector?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function visibleFocusable(container: HTMLElement): HTMLElement[] {
  // offsetParent is null for position:fixed elements in some browsers and
  // always null in jsdom's layout-less world — use rects/visibility instead:
  // an element counts as focusable if it's not display:none / visibility:hidden.
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    const style = el.ownerDocument.defaultView?.getComputedStyle(el);
    return style?.display !== 'none' && style?.visibility !== 'hidden';
  });
}

export function createFocusTrap(container: HTMLElement, opts: FocusTrapOptions) {
  const doc = container.ownerDocument;
  const opener = (doc.activeElement as HTMLElement | null) ?? null;

  const initial =
    (opts.initialFocusSelector
      ? container.querySelector<HTMLElement>(opts.initialFocusSelector)
      : null) ?? visibleFocusable(container)[0];
  // Focus on the next tick so mount-time rendering settles first
  initial?.focus();

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // don't let a global Esc handler close twice
      opts.onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = visibleFocusable(container);
    if (items.length === 0) { e.preventDefault(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    const active = doc.activeElement as HTMLElement | null;
    if (e.shiftKey) {
      if (active === first || !container.contains(active)) { e.preventDefault(); last.focus(); }
    } else {
      if (active === last || !container.contains(active)) { e.preventDefault(); first.focus(); }
    }
  }

  container.addEventListener('keydown', onKeydown);

  return {
    destroy() {
      container.removeEventListener('keydown', onKeydown);
      // Restore focus to whoever opened the dialog; fall back to the
      // page's designated fallback (the HUD menu) if that's impossible
      // — e.g. the dialog was opened from 3D, where focus was <body>.
      if (opener && opener !== doc.body && doc.contains(opener) && typeof opener.focus === 'function') {
        opener.focus();
      } else {
        doc.querySelector<HTMLElement>('[data-focus-fallback]')?.focus();
      }
    }
  };
}

/** Svelte action wrapper — use:focusTrap={{ onClose: () => ... }} */
export function focusTrap(node: HTMLElement, opts: FocusTrapOptions) {
  const trap = createFocusTrap(node, opts);
  return {
    destroy() { trap.destroy(); }
  };
}
