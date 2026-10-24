/** Ambient types for three-mesh-bvh core subpaths (barrel has types, subpaths ship none). */
declare module 'three-mesh-bvh/src/core/MeshBVH.js' {
  import type { Box3, BufferGeometry, Line3, Triangle, Vector3 } from 'three';

  /** The triangle type shapecast actually passes — has closestPointToSegment, unlike THREE.Triangle. */
  export interface ExtendedTriangle extends Triangle {
    closestPointToSegment(segment: Line3, targetOnTriangle: Vector3, targetOnSegment: Vector3): number;
  }

  export interface ShapecastCallbacks {
    intersectsBounds: (
      box: Box3, isLeaf: boolean, score: number | undefined, depth: number, nodeIndex: number
    ) => boolean;
    intersectsTriangle?: (
      triangle: ExtendedTriangle, triangleIndex: number, contained: boolean, depth: number
    ) => boolean | void;
  }

  export class MeshBVH {
    constructor(geometry: BufferGeometry, options?: Record<string, unknown>);
    shapecast(callbacks: ShapecastCallbacks): boolean;
  }
}
declare module 'three-mesh-bvh/src/utils/ExtensionUtilities.js' {
  import type { Raycaster, Intersection, Object3D } from 'three';
  export function acceleratedRaycast(this: Object3D, raycaster: Raycaster, intersects: Intersection[]): void;
}
