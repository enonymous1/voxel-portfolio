/**
 * config.ts — single source of truth for game + presentation constants.
 * ------------------------------------------------------------------
 * Before this file, the same numbers lived in several places: the spawn
 * point in PlayerController (twice: initial + respawn fallback) and in
 * Scene's default camera, movement tuning inline in PlayerController,
 * and the sky colour in both +page CSS and the voxel shader. Drift
 * between copies is silent (a moved spawn that the camera doesn't
 * follow, a fog colour that no longer matches the page background),
 * so every copy now reads from here. CSS cannot import this module —
 * the +page background keeps its literal value with a comment pointing
 * here; if SKY.css ever changes, update both.
 */

/** Player spawn: feet position on the atrium ground slab (top y=1). */
export const SPAWN_POSITION = { x: 16, y: 1, z: 24 } as const;
/** Initial look direction: yaw 0 faces -Z (north) — dais centre-frame. */
export const SPAWN_YAW = 0;
export const SPAWN_PITCH = -0.08;

/** Movement tuning, previously magic numbers in PlayerController. */
export const MOVEMENT = {
  /** Horizontal speed, metres per second */
  speed: 5.2,
  /** Gravity acceleration, m/s^2 */
  gravity: 22,
  /** Initial upward velocity on jump, m/s */
  jumpVelocity: 7.4,
  /** Centre-screen picking reach, metres */
  reach: 6
} as const;

/**
 * Sky colour. css paints the page background behind the canvas;
 * rgb is the fog colour in the voxel shader (0..1 per channel).
 * They must stay identical or distant terrain fogs toward a colour
 * that doesn't match the sky behind it.
 */
export const SKY = {
  css: '#87ceeb',
  rgb: [0.53, 0.81, 0.92] as const
} as const;
