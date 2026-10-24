import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh/src/core/MeshBVH.js';
import { acceleratedRaycast } from 'three-mesh-bvh/src/utils/ExtensionUtilities.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { movePlayer, PLAYER } from '../.test-build/collision.mjs';

const box = (w,h,d,x,y,z) => { const g = new THREE.BoxGeometry(w,h,d); g.translate(x,y,z); return g; };
const geo = mergeGeometries([
  box(32,1,32, 16,0.5,16),      // ground, top y=1
  box(1,3,6,   10.5,2.5,8),     // wall x10..11, y1..4, z5..11
  box(2,1,4,   21,1.5,8),       // step x20..22, top y=2, z6..10
  box(6,1,6,   27,3.7,27),      // ceiling bottom y=3.2, x24..30, z24..30
]);
const tree = new MeshBVH(geo);
geo.boundsTree = tree;
const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
mesh.raycast = acceleratedRaycast;
const downRay = new THREE.Raycaster(); downRay.firstHitOnly = true;
const world = {
  tree,
  raycastDown: (origin, maxDist) => {
    downRay.set(origin, new THREE.Vector3(0,-1,0)); downRay.far = maxDist;
    const hit = downRay.intersectObject(mesh, false)[0];
    return hit ? hit.point.y : null;
  }
};
let pass = 0, fail = 0;
const check = (name, cond, detail) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); cond ? pass++ : fail++; };

// 1. Drop & land
let feet = new THREE.Vector3(5,4,5), grounded = false;
for (let i=0;i<30;i++){ const r = movePlayer(world, feet, new THREE.Vector3(0,-0.3,0), {groundedBefore: grounded}); feet = r.position; grounded = r.grounded; }
check('drop lands on ground', Math.abs(feet.y-1) < 0.02 && grounded, `feet.y=${feet.y.toFixed(3)} grounded=${grounded}`);

// 2. Wall stop (3-high wall, no step possible)
let r = movePlayer(world, new THREE.Vector3(9.0,1,8), new THREE.Vector3(1.5,0,0), {groundedBefore:true});
check('wall stops at face-radius', r.position.x <= 9.67 && r.position.x > 9.4 && r.blockedHorizontally, `x=${r.position.x.toFixed(3)} blocked=${r.blockedHorizontally}`);

// 3. Step-up onto 1-high block (grounded)
r = movePlayer(world, new THREE.Vector3(19.2,1,8), new THREE.Vector3(1.2,0,0), {groundedBefore:true});
check('grounded step-up onto ledge', Math.abs(r.position.y-2) < 0.03 && r.position.x > 20.2 && r.grounded, `pos=${r.position.toArray().map(v=>v.toFixed(2))} grounded=${r.grounded}`);

// 4. No air-step: mid-jump beside the step (feet above ground, falling) —
//    rubbing the step face mid-air must not climb it
r = movePlayer(world, new THREE.Vector3(19.2,1.6,8), new THREE.Vector3(1.2,-0.2,0), {groundedBefore:false});
check('airborne does NOT step up', r.position.y > 1.3 && r.position.y < 1.5 && r.position.x <= 19.67 && !r.grounded, `pos=${r.position.toArray().map(v=>v.toFixed(2))} grounded=${r.grounded}`);

// 5. Ceiling hit while rising
r = movePlayer(world, new THREE.Vector3(27,1.5,27), new THREE.Vector3(0,1.0,0), {groundedBefore:false});
check('ceiling caps capsule', r.hitCeiling && r.position.y <= 1.42, `feet.y=${r.position.y.toFixed(3)} hitCeiling=${r.hitCeiling} (max allowed ${(3.2-PLAYER.height).toFixed(2)})`);

// 6. Free horizontal move on open ground is unimpeded
r = movePlayer(world, new THREE.Vector3(5,1,20), new THREE.Vector3(0.8,0,-0.6), {groundedBefore:true});
check('open ground move unimpeded', Math.abs(r.position.x-5.8)<0.02 && Math.abs(r.position.z-19.4)<0.02 && r.grounded, `pos=${r.position.toArray().map(v=>v.toFixed(2))}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
