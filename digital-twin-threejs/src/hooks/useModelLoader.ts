import { useGLTF } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import type { Material, Object3D, Texture } from 'three';

function disposeMaterial(material: Material) {
  Object.values(material as unknown as Record<string, unknown>).forEach((value) => {
    if (value && typeof value === 'object' && 'isTexture' in value) {
      (value as Texture).dispose();
    }
  });

  material.dispose();
}

function disposeObject3D(object: Object3D) {
  object.traverse((node) => {
    const meshNode = node as unknown as {
      geometry?: { dispose: () => void };
      material?: Material | Material[];
    };

    meshNode.geometry?.dispose();

    if (Array.isArray(meshNode.material)) {
      meshNode.material.forEach(disposeMaterial);
      return;
    }

    if (meshNode.material) {
      disposeMaterial(meshNode.material);
    }
  });
}

export function useModelLoader(modelUrl: string) {
  const gltf = useGLTF(modelUrl, true);
  const activeSceneRef = useRef<Object3D | null>(null);

  useEffect(() => {
    const previousScene = activeSceneRef.current;

    if (previousScene && previousScene !== gltf.scene) {
      disposeObject3D(previousScene);
    }

    activeSceneRef.current = gltf.scene;

    return () => {
      disposeObject3D(gltf.scene);
      useGLTF.clear(modelUrl);

      if (activeSceneRef.current === gltf.scene) {
        activeSceneRef.current = null;
      }
    };
  }, [gltf.scene, modelUrl]);

  return gltf;
}
