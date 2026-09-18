import { useEffect, useMemo } from 'react';
import {
  Box3,
  CanvasTexture,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type Object3D,
} from 'three';
import type { EnvironmentPreset } from '../types/environmentPreset';

const BASE_EXTENT_PADDING = 2.2;
const BASE_COLORS: Record<Exclude<EnvironmentPreset, 'studio' | 'grid' | 'points'>, number> = {
  ground: 0x4f604f,
  concrete: 0x8b9297,
  asphalt: 0x252b33,
};

const SURFACE_TEXTURE_SIZE = 256;

function seededValue(x: number, y: number, seed: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function createSurfaceTexture(preset: Exclude<EnvironmentPreset, 'studio' | 'grid' | 'points'>): CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = SURFACE_TEXTURE_SIZE;
  canvas.height = SURFACE_TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const size = SURFACE_TEXTURE_SIZE;
  const baseColor = preset === 'ground' ? '#4f604f' : preset === 'concrete' ? '#8b9297' : '#252b33';
  context.fillStyle = baseColor;
  context.fillRect(0, 0, size, size);

  if (preset === 'concrete') {
    context.strokeStyle = 'rgba(45, 52, 57, 0.2)';
    context.lineWidth = 1;
    for (let offset = 64; offset < size; offset += 64) {
      context.beginPath();
      context.moveTo(offset + 0.5, 0);
      context.lineTo(offset + 0.5, size);
      context.moveTo(0, offset + 0.5);
      context.lineTo(size, offset + 0.5);
      context.stroke();
    }
  }

  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      const variation = seededValue(x, y, preset === 'ground' ? 3 : preset === 'concrete' ? 7 : 11);
      const alpha = preset === 'asphalt' ? 0.12 + variation * 0.2 : 0.07 + variation * 0.12;
      const tone = variation > 0.5 ? 255 : 0;
      context.fillStyle = `rgba(${tone}, ${tone}, ${tone}, ${alpha.toFixed(3)})`;
      context.fillRect(x, y, preset === 'asphalt' ? 1 + Math.round(variation) : 2, preset === 'asphalt' ? 1 + Math.round(variation) : 2);
    }
  }

  if (preset === 'ground') {
    context.strokeStyle = 'rgba(173, 190, 135, 0.14)';
    context.lineWidth = 1;
    for (let index = 0; index < 90; index += 1) {
      const x = seededValue(index, 1, 19) * size;
      const y = seededValue(index, 2, 23) * size;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (seededValue(index, 3, 29) - 0.5) * 7, y - 2 - seededValue(index, 4, 31) * 5);
      context.stroke();
    }
  }

  if (preset === 'asphalt') {
    context.strokeStyle = 'rgba(160, 174, 185, 0.1)';
    context.lineWidth = 1;
    for (let index = 0; index < 8; index += 1) {
      const y = seededValue(index, 5, 41) * size;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y + (seededValue(index, 6, 43) - 0.5) * 4);
      context.stroke();
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

export interface IEnvironmentBase {
  mesh: Mesh<PlaneGeometry, MeshStandardMaterial>;
  position: [number, number, number];
}

export interface IUseEnvironmentBaseParams {
  scene: Object3D;
  preset: EnvironmentPreset;
  extentScale?: number;
}

function createEnvironmentBase(scene: Object3D, preset: Exclude<EnvironmentPreset, 'studio' | 'grid' | 'points'>, extentScale: number): IEnvironmentBase {
  const box = new Box3();
  const size = new Vector3();
  const center = new Vector3();

  scene.updateMatrixWorld(true);
  box.setFromObject(scene);
  box.getSize(size);
  box.getCenter(center);

  const maxDimension = Math.max(size.x, size.y, size.z, 1);
  const extent = maxDimension * BASE_EXTENT_PADDING * Math.min(Math.max(extentScale, 0.5), 5);
  const geometry = new PlaneGeometry(extent, extent);
  const texture = createSurfaceTexture(preset);
  if (texture) {
    const tiles = Math.max(2, extent / 18);
    texture.repeat.set(tiles, tiles);
  }
  const material = new MeshStandardMaterial({
    color: texture ? 0xffffff : BASE_COLORS[preset],
    map: texture,
    roughness: preset === 'asphalt' ? 0.96 : 0.88,
    metalness: 0,
  });
  const mesh = new Mesh(geometry, material);

  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;

  return { mesh, position: [center.x, box.min.y - 0.015, center.z] };
}

export function useEnvironmentBase({ scene, preset, extentScale = 1 }: IUseEnvironmentBaseParams): IEnvironmentBase | null {
  const base = useMemo(() => {
    if (preset === 'studio' || preset === 'grid' || preset === 'points') return null;
    return createEnvironmentBase(scene, preset, extentScale);
  }, [extentScale, preset, scene]);

  useEffect(() => {
    if (!base) return;
    return () => {
      base.mesh.geometry.dispose();
      base.mesh.material.map?.dispose();
      base.mesh.material.dispose();
    };
  }, [base]);

  return base;
}
