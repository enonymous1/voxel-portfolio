import * as THREE from 'three';
import type { MeshBVH } from 'three-mesh-bvh/src/core/MeshBVH.js';

/**
 * collision.ts — BVH shapecast character collision (Phase 2)
 * ------------------------------------------------------------------
 * This is BVH earning its payload: the same boundsTree used for
 * picking now resolves a player capsule against the voxel mesh.
 *
 * Method (the canonical three-mesh-bvh character-movement approach):
 *   capsule = Line3 segment + radius. For each nearby triangle found
 *   by shapecast, compute the closest points between triangle and
 *   segment (ExtendedTriangle.closestPointToSegment — plain
 *   THREE.Triangle does NOT have this method); if the distance is
 *   less than the radius, push the whole segment out along the
 *   triangle->capsule direction by the penetration depth. Repeat
 *   2-3 passes until stable.
 *
 * Voxel-specific addition — STEP-UP: a 1-high block is furniture in
 * this world (dais, planks, pedestals), not a wall. If a grounded
 * player's horizontal move is blocked, retry the move raised by
 * stepHeight and accept it only if a downward ray finds a ledge top
 * within step range and the capsule resolves cleanly on it.
 * Airborne players never step (no climbing by rubbing on walls).
 *
 * Pure Three.js, no Svelte imports — headless-testable in Node
 * against a real MeshBVH (see README "Verified" section).
 */

export const PLAYER = {
  radius: 0.35,
  height: 1.8, // total capsule height, feet -> crown
  eye: 1.62,   // camera height above feet
  stepHeight: 1.05,
  snapDistance: 0.14 // ground snap when walking down small drops
} as const;

export interface CollisionWorld {
  tree: MeshBVH;
  /** Ground-top Y of the first surface below `origin` within maxDist, else null */
  raycastDown: (origin: THREE.Vector3, maxDist: number) => number | null;
}

export interface MoveResult {
  position: THREE.Vector3; // resolved feet position
  grounded: boolean;
  hitCeiling: boolean;
  blockedHorizontally: boolean;
}

// Scratch objects — module-level, never allocated per frame
const _seg = new THREE.Line3();
const _box = new THREE.Box3();
const _triPoint = new THREE.Vector3();
const _capPoint = new THREE.Vector3();
const _dir = new THREE.Vector3();

function segmentFor(feet: THREE.Vector3, height: number, radius: number, out: THREE.Line3) {
  out.start.set(feet.x, feet.y + radius, feet.z);
  out.end.set(feet.x, feet.y + height - radius, feet.z);
  return out;
}

interface ResolveResult { feet: THREE.Vector3; grounded: boolean; hitCeiling: boolean }

/** Push a capsule at `feet` out of all penetrating triangles. */
export function resolveCapsule(
  tree: MeshBVH,
  feet: THREE.Vector3,
  radius: number = PLAYER.radius,
  height: number = PLAYER.height
): ResolveResult {
  const pos = feet.clone();
  let grounded = false;
  let hitCeiling = false;

  for (let pass = 0; pass < 3; pass++) {
    segmentFor(pos, height, radius, _seg);
    _box.makeEmpty();
    _box.expandByPoint(_seg.start);
    _box.expandByPoint(_seg.end);
    _box.expandByScalar(radius + 0.02);

    let maxPush = 0;
    tree.shapecast({
      intersectsBounds: (box) => box.intersectsBox(_box),
      intersectsTriangle: (tri) => {
        const dist = tri.closestPointToSegment(_seg, _triPoint, _capPoint);
        if (dist >= radius) return;
        _dir.subVectors(_capPoint, _triPoint);
        if (_dir.lengthSq() < 1e-12) {
          // Capsule centre exactly on the triangle — fall back to its normal
          tri.getNormal(_dir);
        }
        _dir.normalize();
        const depth = radius - dist;
        _seg.start.addScaledVector(_dir, depth);
        _seg.end.addScaledVector(_dir, depth);
        if (_dir.y > 0.55) grounded = true;
        if (_dir.y < -0.55) hitCeiling = true;
        if (depth > maxPush) maxPush = depth;
      }
    });

    pos.set(_seg.start.x, _seg.start.y - radius, _seg.start.z);
    if (maxPush < 1e-5) break;
  }
  return { feet: pos, grounded, hitCeiling };
}

/** Max distance per substep — well under the capsule radius, so a fast
 *  fall or lag spike can never tunnel through a 1-block floor/wall. */
const MAX_SUBSTEP = 0.15;

/**
 * Move the player by `delta` with collision. Caller owns gravity /
 * jump velocity — this resolves position, grounding and step-up only.
 * Large deltas are substepped (see MAX_SUBSTEP) and resolved per step.
 */
export function movePlayer(
  world: CollisionWorld,
  feet: THREE.Vector3,
  delta: THREE.Vector3,
  opts: { groundedBefore: boolean }
): MoveResult {
  const steps = Math.max(1, Math.ceil(delta.length() / MAX_SUBSTEP));
  if (steps === 1) return moveOnce(world, feet, delta, opts);
  const stepDelta = delta.clone().divideScalar(steps);
  let pos = feet.clone();
  let groundedBefore = opts.groundedBefore;
  let last: MoveResult = {
    position: pos, grounded: groundedBefore, hitCeiling: false, blockedHorizontally: false
  };
  let hitCeiling = false;
  for (let i = 0; i < steps; i++) {
    last = moveOnce(world, pos, stepDelta, { groundedBefore });
    pos = last.position;
    groundedBefore = last.grounded;
    hitCeiling = hitCeiling || last.hitCeiling;
  }
  return { ...last, position: pos, hitCeiling };
}

function moveOnce(
  world: CollisionWorld,
  feet: THREE.Vector3,
  delta: THREE.Vector3,
  opts: { groundedBefore: boolean }
): MoveResult {
  const target = feet.clone().add(delta);
  const r = resolveCapsule(world.tree, target);
  const pos = r.feet;
  let grounded = r.grounded;
  let hitCeiling = r.hitCeiling;

  // Ground snap: small drops (walking off a 1-block edge starts a fall
  // of one frame's gravity step) shouldn't read as airborne.
  if (!grounded && delta.y <= 0.001) {
    const origin = new THREE.Vector3(pos.x, pos.y + 0.55, pos.z);
    const groundY = world.raycastDown(origin, 0.55 + PLAYER.snapDistance);
    if (groundY !== null && pos.y - groundY <= PLAYER.snapDistance && pos.y >= groundY - 1e-4) {
      pos.y = groundY;
      grounded = true;
    }
  }

  const desiredH = Math.hypot(delta.x, delta.z);
  const achievedH = Math.hypot(pos.x - feet.x, pos.z - feet.z);
  let blockedHorizontally = desiredH > 1e-4 && achievedH < desiredH * 0.6;

  // Step-up: grounded + blocked -> lift, move at lifted height, settle.
  // (Lifting at the blocked spot alone fails: the capsule centre is still
  // a radius short of the ledge, so a settle-ray there finds plain ground.)
  if (blockedHorizontally && opts.groundedBefore) {
    const lifted = resolveCapsule(
      world.tree, new THREE.Vector3(feet.x, feet.y + PLAYER.stepHeight, feet.z)
    );
    // Headroom check: the lift itself must actually reach step height
    if (lifted.feet.y >= feet.y + PLAYER.stepHeight - 0.05) {
      const moved = resolveCapsule(
        world.tree,
        new THREE.Vector3(lifted.feet.x + delta.x, lifted.feet.y, lifted.feet.z + delta.z)
      );
      const progress = Math.hypot(moved.feet.x - feet.x, moved.feet.z - feet.z);
      // A tall wall blocks the lifted move too -> no progress -> no step.
      if (progress > achievedH + 1e-3) {
        const inRange = (y: number | null): y is number =>
          y !== null && y > feet.y + 0.05 && y <= feet.y + PLAYER.stepHeight + 0.06;
        const rayFrom = (p: THREE.Vector3) =>
          world.raycastDown(new THREE.Vector3(p.x, p.y + 0.55, p.z), 0.55 + PLAYER.stepHeight + 0.08);
        const ledgeHere = rayFrom(moved.feet);
        if (inRange(ledgeHere)) {
          // Centre is over the ledge: settle straight onto it
          const r3 = resolveCapsule(world.tree, new THREE.Vector3(moved.feet.x, ledgeHere, moved.feet.z));
          if (Math.abs(r3.feet.y - ledgeHere) < 0.06) {
            pos.copy(r3.feet);
            grounded = true;
            hitCeiling = hitCeiling || r3.hitCeiling;
          }
        } else {
          // Ledge may be a radius ahead (centre hasn't crossed the face yet).
          // Accept the lifted position only then — subsequent steps/frames
          // continue at this height and the ground snap lands the player
          // once the centre crosses. Gravity keeps this honest elsewhere.
          const dirX = delta.x / desiredH, dirZ = delta.z / desiredH;
          const ahead = new THREE.Vector3(
            moved.feet.x + dirX * PLAYER.radius, moved.feet.y, moved.feet.z + dirZ * PLAYER.radius
          );
          if (inRange(rayFrom(ahead))) {
            pos.copy(moved.feet);
            grounded = false;
            hitCeiling = hitCeiling || moved.hitCeiling;
          }
        }
        blockedHorizontally =
          desiredH > 1e-4 && Math.hypot(pos.x - feet.x, pos.z - feet.z) < desiredH * 0.6;
      }
    }
  }

  return { position: pos, grounded, hitCeiling, blockedHorizontally };
}
