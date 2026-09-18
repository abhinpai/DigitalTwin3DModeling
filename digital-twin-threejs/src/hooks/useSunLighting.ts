import { useEffect, useMemo } from 'react';
import { Box3, Vector3, type Object3D } from 'three';

const DEFAULT_SUN_AZIMUTH = 45;
const DEFAULT_SUN_ELEVATION = 47;
const MIN_SUN_AZIMUTH = 0;
const MAX_SUN_AZIMUTH = 360;
const MIN_SUN_ELEVATION = 0;
const MAX_SUN_ELEVATION = 90;
const SUN_DISTANCE_FACTOR = 2;
const MIN_MODEL_DIMENSION = 1;
const SHADOW_FRUSTUM_HALF_FACTOR = 0.9;
const SHADOW_NEAR_FACTOR = 0.05;
const SHADOW_FAR_FACTOR = 4;
const MIN_SHADOW_NEAR = 0.1;
const MIN_SHADOW_FAR = 10;

type IMeshWithShadow = Object3D & {
  isMesh?: boolean;
};

interface ISunLightingMetrics {
  center: Vector3;
  minY: number;
  maxDimension: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function getLightingMetrics(scene: Object3D): ISunLightingMetrics {
  const box = new Box3();
  const center = new Vector3();
  const size = new Vector3();

  scene.updateMatrixWorld(true);
  box.setFromObject(scene);
  box.getCenter(center);
  box.getSize(size);

  return {
    center,
    minY: box.min.y,
    maxDimension: Math.max(size.x, size.y, size.z, MIN_MODEL_DIMENSION),
  };
}

function forEachMesh(scene: Object3D, visitor: (mesh: IMeshWithShadow) => void) {
  scene.traverse((node) => {
    const mesh = node as IMeshWithShadow;

    if (!mesh.isMesh) {
      return;
    }

    visitor(mesh);
  });
}

export interface IUseSunLightingParams {
  scene: Object3D;
  sunAzimuth?: number;
  sunElevation?: number;
  shadowsEnabled?: boolean;
}

export interface IUseSunLightingResult {
  sunPosition: [number, number, number];
  skyPosition: [number, number, number];
  targetPosition: [number, number, number];
  shadowGroundPosition: [number, number, number];
  maxDimension: number;
  shadowCamera: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    near: number;
    far: number;
  };
}

export function useSunLighting({ scene, sunAzimuth = DEFAULT_SUN_AZIMUTH, sunElevation = DEFAULT_SUN_ELEVATION, shadowsEnabled = false }: IUseSunLightingParams): IUseSunLightingResult {
  const metrics = useMemo(() => getLightingMetrics(scene), [scene]);

  const shadowGroundPosition = useMemo(
    () => [metrics.center.x, metrics.minY, metrics.center.z] as [number, number, number],
    [metrics],
  );

  const lighting = useMemo(() => {
    const { center, maxDimension } = metrics;
    const azimuth = clamp(sunAzimuth, MIN_SUN_AZIMUTH, MAX_SUN_AZIMUTH);
    const elevation = clamp(sunElevation, MIN_SUN_ELEVATION, MAX_SUN_ELEVATION);
    const skyElevation = clamp(sunElevation, -90, MAX_SUN_ELEVATION);
    const distance = maxDimension * SUN_DISTANCE_FACTOR;
    const azimuthRadians = toRadians(azimuth);
    const elevationRadians = toRadians(elevation);
    const planarDistance = Math.cos(elevationRadians) * distance;
    const sunOffset = new Vector3(
      Math.cos(azimuthRadians) * planarDistance,
      Math.sin(elevationRadians) * distance,
      Math.sin(azimuthRadians) * planarDistance,
    );
    const sunPosition = center.clone().add(sunOffset);
    const skyPlanarDistance = Math.cos(toRadians(skyElevation)) * distance;
    const skyOffset = new Vector3(
      Math.cos(azimuthRadians) * skyPlanarDistance,
      Math.sin(toRadians(skyElevation)) * distance,
      Math.sin(azimuthRadians) * skyPlanarDistance,
    );
    const skyPosition = center.clone().add(skyOffset);
    const shadowHalfExtent = maxDimension * SHADOW_FRUSTUM_HALF_FACTOR;

    return {
      sunPosition: [sunPosition.x, sunPosition.y, sunPosition.z] as [number, number, number],
      skyPosition: [skyPosition.x, skyPosition.y, skyPosition.z] as [number, number, number],
      targetPosition: [center.x, center.y, center.z] as [number, number, number],
      maxDimension,
      shadowCamera: {
        left: -shadowHalfExtent,
        right: shadowHalfExtent,
        top: shadowHalfExtent,
        bottom: -shadowHalfExtent,
        near: Math.max(maxDimension * SHADOW_NEAR_FACTOR, MIN_SHADOW_NEAR),
        far: Math.max(maxDimension * SHADOW_FAR_FACTOR, MIN_SHADOW_FAR),
      },
    };
  }, [metrics, sunAzimuth, sunElevation]);

  useEffect(() => {
    forEachMesh(scene, (mesh) => {
      mesh.castShadow = shadowsEnabled;
      mesh.receiveShadow = shadowsEnabled;
    });
  }, [scene, shadowsEnabled]);

  return {
    ...lighting,
    shadowGroundPosition,
  };
}
