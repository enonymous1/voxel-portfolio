<script lang="ts">
  import { useTask, useThrelte } from '@threlte/core';
  import * as THREE from 'three';
  import { onMount, onDestroy } from 'svelte';
  import { portfolioState } from '../state.svelte';
  import { INTERACTIVES, keyOf, zoneAt } from './world';
  import { movePlayer, PLAYER, type CollisionWorld } from './collision';
  import type { MeshBVH } from 'three-mesh-bvh/src/core/MeshBVH.js';

  /**
   * PlayerController — Pointer Lock + WASD on desktop, state moveVector on touch.
   * Position is FEET-based since Phase 2; the camera sits at feet + PLAYER.eye.
   * Collision is BVH shapecast capsule resolution (collision.ts) with
   * grounded-only 1-block step-up. Before the world mesh exists, a
   * simple ground-plane fallback keeps the spawn area usable.
   */
  let { worldMesh }: { worldMesh: THREE.Mesh | undefined } = $props();
  const { camera, renderer } = useThrelte();

  const SPEED = 5.2, REACH = 6, GRAVITY = 22, JUMP_VEL = 7.4;
  let feet = new THREE.Vector3(16, 1, 24); // spawn in Atrium, on the ground slab (top y=1)
  let velY = 0;
  let grounded = true;
  // yaw 0 = facing -Z (north): dais + resume terminals centre-frame at spawn,
  // workshop row beyond. (Was Math.PI — facing the south gate, i.e. away from
  // all content; reported 2026-10-23 as landing in an empty-looking world.)
  let yaw = 0, pitch = -0.08;
  const keys = new Set<string>();

  // Centre-screen picking ray (BVH-accelerated via the mesh's raycast override)
  const pickRay = new THREE.Raycaster(); pickRay.far = REACH;
  (pickRay as unknown as { firstHitOnly: boolean }).firstHitOnly = true;
  const centre = new THREE.Vector2(0, 0);

  // Downward ground ray for collision snap / step-up ledge detection
  const downRay = new THREE.Raycaster();
  (downRay as unknown as { firstHitOnly: boolean }).firstHitOnly = true;
  const DOWN = new THREE.Vector3(0, -1, 0);

  function collisionWorld(): CollisionWorld | null {
    const geo = worldMesh?.geometry as (THREE.BufferGeometry & { boundsTree?: MeshBVH }) | undefined;
    if (!worldMesh || !geo?.boundsTree) return null;
    const mesh = worldMesh;
    return {
      tree: geo.boundsTree,
      raycastDown: (origin, maxDist) => {
        downRay.set(origin, DOWN);
        downRay.far = maxDist;
        const hit = downRay.intersectObject(mesh, false)[0];
        return hit ? hit.point.y : null;
      }
    };
  }

  function onMouseMove(e: MouseEvent) {
    if (!portfolioState.isPointerLocked) return;
    yaw -= e.movementX * 0.0022;
    pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.0022, -1.45, 1.45);
  }
  function onKey(down: boolean) {
    return (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && down) portfolioState.activateHovered();
      if (e.code === 'Escape' && down) portfolioState.closePanel();
      if (['KeyW','KeyA','KeyS','KeyD','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        down ? keys.add(e.code) : keys.delete(e.code);
        if (e.code === 'Space' && down) portfolioState.jumpQueued = true;
      }
    };
  }
  const kd = onKey(true), ku = onKey(false);

  function onCanvasClick() {
    const el = renderer.domElement;
    if (portfolioState.hovered) { portfolioState.activateHovered(); return; }
    if (!portfolioState.isTouch && portfolioState.shouldPointerLock) el.requestPointerLock();
  }
  function onLockChange() {
    portfolioState.isPointerLocked = document.pointerLockElement === renderer.domElement;
    portfolioState.hasInteracted = true;
  }

  onMount(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    document.addEventListener('pointerlockchange', onLockChange);
    renderer.domElement.addEventListener('click', onCanvasClick);
  });
  onDestroy(() => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
    document.removeEventListener('pointerlockchange', onLockChange);
    renderer.domElement.removeEventListener('click', onCanvasClick);
  });

  useTask((delta) => {
    if (portfolioState.contextLost) return;
    const d = Math.min(delta, 0.05);
    const cam = camera.current as THREE.PerspectiveCamera;

    if (portfolioState.lookDelta.x || portfolioState.lookDelta.y) {
      yaw -= portfolioState.lookDelta.x * 0.005;
      pitch = THREE.MathUtils.clamp(pitch - portfolioState.lookDelta.y * 0.005, -1.45, 1.45);
      portfolioState.lookDelta = { x: 0, y: 0 };
    }

    const fwd = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - portfolioState.moveVector.z;
    const str = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + portfolioState.moveVector.x;
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    const wishX = (str * cos - fwd * sin) * SPEED * d;
    const wishZ = (-fwd * cos - str * sin) * SPEED * d;

    if (portfolioState.jumpQueued && grounded) velY = JUMP_VEL;
    portfolioState.jumpQueued = false;
    velY -= GRAVITY * d;

    const world = collisionWorld();
    if (world) {
      const wasGrounded = grounded;
      const res = movePlayer(world, feet, new THREE.Vector3(wishX, velY * d, wishZ), { groundedBefore: wasGrounded });
      feet.copy(res.position);
      grounded = res.grounded;
      if (grounded && velY < 0) velY = 0;
      if (res.hitCeiling && velY > 0) velY = 0;
      // Fell out of the world somehow (mesh rebuilt mid-step, etc.) — respawn in the Atrium
      if (feet.y < -10) { feet.set(16, 1, 24); velY = 0; }
    } else {
      // Pre-world fallback: flat ground at y=1, fenced to the island
      feet.x = THREE.MathUtils.clamp(feet.x + wishX, 1.2, 30.8);
      feet.z = THREE.MathUtils.clamp(feet.z + wishZ, 1.2, 30.8);
      feet.y += velY * d;
      if (feet.y <= 1) { feet.y = 1; velY = 0; grounded = true; } else grounded = false;
    }

    cam.position.set(feet.x, feet.y + PLAYER.eye, feet.z);
    cam.rotation.set(0, 0, 0); cam.rotateY(yaw); cam.rotateX(pitch);
    portfolioState.setZone(zoneAt(feet.x, feet.z));

    if (worldMesh) {
      pickRay.setFromCamera(centre, cam);
      const hit = pickRay.intersectObject(worldMesh, false)[0];
      if (hit?.face) {
        const p = hit.point.clone().addScaledVector(hit.face.normal, -0.5);
        portfolioState.setHovered(INTERACTIVES.get(keyOf(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))) ?? null);
      } else portfolioState.setHovered(null);
    }
  });
</script>
