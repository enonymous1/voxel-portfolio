import type { Project, GalleryItem } from '../types';

/** Real content — DOM-only. Edit here, never bake this into textures. */
export const activeProjects: Project[] = [
  {
    id: 'ss-cryptogem', title: 'ss-cryptoGem — Unified Trading Pipeline',
    blurb: 'Quant research + Gemini WebSocket streaming + REST execution. Dollar Bars, fractional differentiation, purged/embargoed CV, Fractional Kelly sizing and drawdown circuit breakers. Sandbox-first, dry-run by default.',
    stack: ['Python', 'Gemini WS/REST', 'Parquet', 'Purged CV'], status: 'active', zoneId: 'workshop'
  },
  {
    id: 'ss-gapps', title: 'ss-gapps — Google Apps Script Auditor',
    blurb: 'Drive + Apps Script API inventory: OAuth scopes, metrics, executions, cross-run tracking (first/last seen), Flask dashboard + Apps Script-native dashboard. Seed-and-remember discovery for container-bound scripts.',
    stack: ['Python', 'Flask', 'Google Drive API', 'Apps Script'], status: 'active', zoneId: 'workshop'
  },
  {
    id: 'ss-sms-br', title: 'ss-sms-br — SMS Backup Viewer',
    blurb: 'SMS Backup & Restore XML de-dup pipeline into SQLite with an iMessage-style Flask viewer: conversation bubbles, MMS lightbox, OCR extractors, 81k+ messages indexed.',
    stack: ['Python', 'SQLite', 'Flask', 'OCR'], status: 'active', zoneId: 'workshop'
  },
  {
    id: 'ss-prediction', title: 'Prediction-Market Market-Making Engine',
    blurb: 'Low-latency Kalshi binary market-making research: L2 book recorder, binary-adapted Avellaneda-Stoikov quoting, paper-trading gauntlet (DSR, fee-breakeven). Honest result so far: flow too toxic on tested markets.',
    stack: ['Python', 'Kalshi API', 'Avellaneda-Stoikov'], status: 'active', zoneId: 'workshop'
  },
  {
    id: 'whenwhere', title: 'WhenWhere.biz',
    blurb: 'Event production & premier DJ/MC company for Charlottesville / Central Virginia — weddings, vineyard celebrations, UVA alumni and private estate events.',
    stack: ['Web', 'Event Production'], status: 'live', href: 'https://whenwhere.biz', zoneId: 'workshop'
  }
];

export const archivedProjects: Project[] = [
  { id: 'ss-github-repos', title: 'ss-github-repos', blurb: 'GitHub REST sync, local scanner, remote-vs-local reconciliation, .py→Markdown exporter. Refactored to installable repo_sync package, 102 tests.', stack: ['Python'], status: 'archived', zoneId: 'library' },
  { id: 'ss-gsafcp', title: 'ss-gsaFCP', blurb: 'GSA Federal Supply Schedule pricing tools for Millennium Partners. Refactored fcp_toolkit, byte-identical .docx output.', stack: ['Python', 'docx'], status: 'archived', zoneId: 'library' },
  { id: '208-scan', title: '208-scan-system-export', blurb: 'UPC/PLU/EAN-13 cleaning + SQLite/parquet product-matching pipeline (9,182-row export).', stack: ['Python', 'SQLite', 'Parquet'], status: 'archived', zoneId: 'library' },
  { id: 'ss-fastfoto', title: 'ss-fastfoto-utils', blurb: 'FastFoto scan review / stitch wizard — best-front pick, directional back-stitching, pause/resume state.', stack: ['Python', 'PyQt6', 'Pillow'], status: 'archived', zoneId: 'library' },
  { id: 'video-optimizer', title: 'Video Optimizer', blurb: 'HEVC conversion scanner/encoder (x265 + NVENC) with per-file savings estimates and priority encoding.', stack: ['Python', 'ffmpeg', 'NVENC'], status: 'archived', zoneId: 'library' }
];

export const galleryItems: GalleryItem[] = [
  { id: '3d-printing', title: '3D Printing', blurb: 'Functional prints and prototypes. Model: a gantry printer with a finished part on the bed, generated procedurally and Meshopt-compressed to 4.1 KB (scripts/build-models.mjs).', model: '/models/printer.glb' },
  { id: 'homelab', title: 'Homelab', blurb: 'Mac mini M4 recorder host, external-volume services, LaunchAgents. Model: a 5-unit server rack with LED details, Meshopt-compressed to 4.6 KB.', model: '/models/rack.glb' },
  { id: 'dice', title: 'Tabletop Dice', blurb: 'Dice, tabletop gaming, SWORN achievement hunting. Model: a d20 on a display stand, Meshopt-compressed to 3.6 KB.', model: '/models/dice.glb' }
];

export const externalLinks = [
  { label: 'GitHub', href: 'https://github.com/enonymous1' },
  { label: 'WhenWhere.biz', href: 'https://whenwhere.biz' }
];
