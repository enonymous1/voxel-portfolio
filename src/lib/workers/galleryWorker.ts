/**
 * galleryWorker.ts — GLB loading off the main thread
 * ------------------------------------------------------------------
 * Fetches a Meshopt-compressed .glb, decodes/parses it with
 * GLTFLoader + MeshoptDecoder *in the worker*, then transfers raw
 * geometry buffers back (zero-copy) for the main thread to assemble
 * into THREE objects. Why bother, for 4 KB models? The pattern is
 * what matters: parsing never janks the render/pointer-lock loop,
 * and it scales to real artist models later. These GLBs are
 * geometry-only (vertex colours, no textures), which is what makes
 * worker-side parsing clean — no DOM/ImageBitmap paths involved.
 *
 * Protocol:
 *   in:  { type:'load', id, url }          (url resolved absolute by caller)
 *   out: { type:'model', id, meshes: MeshPayload[] }   (buffers transferred)
 *   out: { type:'error', id, message }     (caller falls back to main-thread load)
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export interface MeshPayload {
  position: Float32Array;
  normal: Float32Array;
  color: Float32Array | null;
  index: Uint32Array | null;
  /** Column-major world matrix (16 floats) from the GLB scene graph */
  matrix: Float32Array;
}

export interface LoadRequest { type: 'load'; id: string; url: string }

let loaderPromise: Promise<GLTFLoader> | null = null;
function getLoader(): Promise<GLTFLoader> {
  loaderPromise ??= (async () => {
    await MeshoptDecoder.ready;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    return loader;
  })();
  return loaderPromise;
}

async function load(req: LoadRequest) {
  const loader = await getLoader();
  const res = await fetch(req.url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${req.url}`);
  const data = await res.arrayBuffer();
  const gltf = await loader.parseAsync(data, '');
  gltf.scene.updateMatrixWorld(true);

  const meshes: MeshPayload[] = [];
  const transfers: ArrayBuffer[] = [];

  // De-interleaving extraction — do NOT copy attr.array wholesale:
  // gltfpack stores position/normal as InterleavedBufferAttributes over
  // a shared stride-padded buffer, and COLOR_0 as 4-component. Copying
  // .array directly yields wrong vertex counts, garbage bounding
  // spheres, and misaligned colours. getComponent() is correct for
  // both plain and interleaved attributes; models are tiny (<=612
  // verts), so the loop is free. Colour is normalised to RGB.
  type AnyAttr = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
  const extract = (attr: AnyAttr, comps: number): Float32Array => {
    const out = new Float32Array(attr.count * comps);
    for (let i = 0; i < attr.count; i++)
      for (let c = 0; c < comps; c++) out[i * comps + c] = attr.getComponent(i, c);
    transfers.push(out.buffer as ArrayBuffer);
    return out;
  };
  const extractIndex = (attr: AnyAttr): Uint32Array => {
    const out = new Uint32Array(attr.count);
    for (let i = 0; i < attr.count; i++) out[i] = attr.getComponent(i, 0);
    transfers.push(out.buffer as ArrayBuffer);
    return out;
  };

  gltf.scene.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    const geo = mesh.geometry as THREE.BufferGeometry;
    meshes.push({
      position: extract(geo.attributes.position, 3),
      normal: extract(geo.attributes.normal, 3),
      color: geo.attributes.color ? extract(geo.attributes.color, 3) : null,
      index: geo.index ? extractIndex(geo.index) : null,
      // Matrix is 16 floats — structured-cloned normally, not transferred
      matrix: new Float32Array(mesh.matrixWorld.elements)
    });
  });

  (self as unknown as Worker).postMessage(
    { type: 'model', id: req.id, meshes },
    transfers as unknown as Transferable[]
  );
}

self.onmessage = (e: MessageEvent<LoadRequest>) => {
  if (e.data?.type !== 'load') return;
  load(e.data).catch((err) => {
    (self as unknown as Worker).postMessage({
      type: 'error', id: e.data.id,
      message: err instanceof Error ? err.message : String(err)
    });
  });
};
