import { useEffect, useRef } from 'react';
import {
  EdgesGeometry,
  Mesh,
  type Object3D,
} from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

export interface IUseNodeHighlightParams {
  scene: Object3D | null;
  selectedNodeIds?: string[];
}

interface IHighlightOverlay {
  edgesGeometry: EdgesGeometry;
  lineGeometry: LineSegmentsGeometry;
  lineSegments: LineSegments2;
  material: LineMaterial;
  parent: Mesh;
}

const HIGHLIGHT_COLOR = 0x2f6fed;
const OUTLINE_THICKNESS = 0.2;
const OUTLINE_EDGE_THRESHOLD_ANGLE = 1;
const OUTLINE_MARKER = '__digitalTwinOutline';

function isMesh(node: Object3D): node is Mesh {
  return Boolean((node as unknown as { isMesh?: boolean }).isMesh);
}

export function useNodeHighlight({ scene, selectedNodeIds }: IUseNodeHighlightParams) {
  const overlaysRef = useRef(new Map<string, IHighlightOverlay>());

  useEffect(() => {
    const overlays = overlaysRef.current;
    const selected = new Set(selectedNodeIds ?? []);

    const cleanupAll = () => {
      for (const overlay of overlays.values()) {
        overlay.parent.remove(overlay.lineSegments);
        overlay.edgesGeometry.dispose();
        overlay.lineGeometry.dispose();
        overlay.material.dispose();
      }

      overlays.clear();
    };

    cleanupAll();

    if (!scene || selected.size === 0) {
      return;
    }

    scene.traverse((object) => {
      if (!selected.has(object.uuid) || !isMesh(object)) {
        return;
      }

      const edgesGeometry = new EdgesGeometry(object.geometry, OUTLINE_EDGE_THRESHOLD_ANGLE);
      const positionAttribute = edgesGeometry.getAttribute('position');
      if (!positionAttribute) {
        edgesGeometry.dispose();
        return;
      }

      const lineGeometry = new LineSegmentsGeometry();
      lineGeometry.setPositions(Array.from(positionAttribute.array as Iterable<number>));

      const material = new LineMaterial({
        color: HIGHLIGHT_COLOR,
        linewidth: OUTLINE_THICKNESS,
        worldUnits: true,
        depthTest: true,
        depthWrite: false,
        transparent: true,
        opacity: 0.95,
      });
      const lineSegments = new LineSegments2(lineGeometry, material);

      lineSegments.renderOrder = 999;
      lineSegments.frustumCulled = false;
      lineSegments.raycast = () => {
        // ponytail: selection raycast should hit real mesh, never highlight overlay.
      };
      lineSegments.userData[OUTLINE_MARKER] = true;

      object.add(lineSegments);
      overlays.set(object.uuid, {
        edgesGeometry,
        lineGeometry,
        lineSegments,
        material,
        parent: object,
      });
    });

    return () => {
      cleanupAll();
    };
  }, [scene, selectedNodeIds]);
}
