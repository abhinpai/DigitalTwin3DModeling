import { useEffect } from 'react';
import type { Object3D } from 'three';

export interface IUseNodeVisibilityParams {
  scene: Object3D | null;
  hiddenNodeIds?: string[];
}

export function useNodeVisibility({ scene, hiddenNodeIds }: IUseNodeVisibilityParams) {
  useEffect(() => {
    if (!scene) {
      return;
    }

    const hidden = new Set(hiddenNodeIds ?? []);

    const isCascadeHidden = (object: Object3D) => {
      let current: Object3D | null = object;

      while (current) {
        if (hidden.has(current.uuid)) {
          return true;
        }

        current = current.parent;
      }

      return false;
    };

    scene.traverse((object) => {
      object.visible = !isCascadeHidden(object);
    });
  }, [scene, hiddenNodeIds]);
}
