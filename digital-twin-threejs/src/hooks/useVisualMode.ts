import { useEffect, useRef } from 'react';
import {
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  type Material,
  type Object3D,
} from 'three';
import type { VisualMode } from '../types/visualMode';

type MeshWithMaterial = Object3D & {
  isMesh?: boolean;
  material?: Material | Material[];
};

function forEachMesh(scene: Object3D, visitor: (mesh: MeshWithMaterial & { material: Material | Material[] }) => void) {
  scene.traverse((node) => {
    const mesh = node as MeshWithMaterial;

    if (!mesh.isMesh || !mesh.material) {
      return;
    }

    visitor(mesh as MeshWithMaterial & { material: Material | Material[] });
  });
}

export interface IUseVisualModeParams {
  scene: Object3D;
  visualMode: VisualMode;
}

interface IWireOverlay {
  lineSegments: LineSegments;
  edgesGeometry: EdgesGeometry;
  parent: Object3D;
}

const WIRE_EDGE_THRESHOLD_ANGLE = 5;
const WIRE_LINE_COLOR = 0x1a1a1a;

export function useVisualMode({ scene, visualMode }: IUseVisualModeParams) {
  const originalMaterialsRef = useRef(new WeakMap<Object3D, Material | Material[]>());
  const wireOverlaysRef = useRef(new Map<Object3D, IWireOverlay>());
  const wireMaterialRef = useRef<LineBasicMaterial | null>(null);

  useEffect(() => {
    const originalMaterials = originalMaterialsRef.current;
    const wireOverlays = wireOverlaysRef.current;

    const cleanupWireOverlays = () => {
      for (const [mesh, overlay] of wireOverlays) {
        mesh.visible = true;
        overlay.parent.remove(overlay.lineSegments);
        overlay.edgesGeometry.dispose();
      }

      wireOverlays.clear();

      if (wireMaterialRef.current) {
        wireMaterialRef.current.dispose();
        wireMaterialRef.current = null;
      }
    };

    if (visualMode === 'wire') {
      if (!wireMaterialRef.current) {
        wireMaterialRef.current = new LineBasicMaterial({ color: WIRE_LINE_COLOR });
      }

      forEachMesh(scene, (mesh) => {
        if (!originalMaterials.has(mesh)) {
          originalMaterials.set(mesh, mesh.material);
        }

        mesh.visible = false;

        if (wireOverlays.has(mesh) || !mesh.parent) {
          return;
        }

        const meshWithGeometry = mesh as Mesh;
        const edgesGeometry = new EdgesGeometry(meshWithGeometry.geometry, WIRE_EDGE_THRESHOLD_ANGLE);
        const lineSegments = new LineSegments(edgesGeometry, wireMaterialRef.current ?? undefined);

        lineSegments.matrixAutoUpdate = false;
        lineSegments.matrix.copy(mesh.matrix);

        mesh.parent.add(lineSegments);
        wireOverlays.set(mesh, {
          lineSegments,
          edgesGeometry,
          parent: mesh.parent,
        });
      });
    } else {
      cleanupWireOverlays();

      forEachMesh(scene, (mesh) => {
        const originalMaterial = originalMaterials.get(mesh);

        if (originalMaterial) {
          mesh.material = originalMaterial;
        }

        mesh.visible = true;
      });
    }

    return () => {
      cleanupWireOverlays();

      forEachMesh(scene, (mesh) => {
        const originalMaterial = originalMaterials.get(mesh);

        if (originalMaterial) {
          mesh.material = originalMaterial;
        }

        mesh.visible = true;
      });
    };
  }, [scene, visualMode]);
}
