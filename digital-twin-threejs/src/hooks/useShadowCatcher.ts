import { useEffect, useMemo } from 'react';
import { Mesh, PlaneGeometry, ShadowMaterial } from 'three';

const SHADOW_CATCHER_EXTENT_FACTOR = 8;
const SHADOW_CATCHER_OPACITY = 0.3;

export interface IShadowCatcher {
  mesh: Mesh<PlaneGeometry, ShadowMaterial>;
  position: [number, number, number];
  extent: number;
}

export interface IUseShadowCatcherParams {
  maxDimension: number;
  shadowGroundPosition: [number, number, number];
  shadowsEnabled?: boolean;
}

function createShadowCatcher(maxDimension: number, shadowGroundPosition: [number, number, number]): IShadowCatcher {
  const extent = maxDimension * SHADOW_CATCHER_EXTENT_FACTOR;
  const geometry = new PlaneGeometry(extent, extent);
  const material = new ShadowMaterial({ opacity: SHADOW_CATCHER_OPACITY });
  const mesh = new Mesh(geometry, material);

  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;

  return {
    mesh,
    position: shadowGroundPosition,
    extent,
  };
}

export function useShadowCatcher({ maxDimension, shadowGroundPosition, shadowsEnabled = false }: IUseShadowCatcherParams): IShadowCatcher | null {
  const shadowCatcher = useMemo(() => {
    if (!shadowsEnabled) {
      return null;
    }

    return createShadowCatcher(maxDimension, shadowGroundPosition);
  }, [maxDimension, shadowGroundPosition, shadowsEnabled]);

  useEffect(() => {
    if (!shadowCatcher) {
      return;
    }

    return () => {
      shadowCatcher.mesh.geometry.dispose();
      shadowCatcher.mesh.material.dispose();
    };
  }, [shadowCatcher]);

  return shadowCatcher;
}
