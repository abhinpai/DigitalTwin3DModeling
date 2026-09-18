import { useEffect, useMemo } from 'react';
import { Box3, BufferAttribute, BufferGeometry, Points, PointsMaterial, Vector3, type Object3D } from 'three';
import type { GridStyle } from '../types/gridStyle';

const GRID_EXTENT_PADDING_FACTOR = 1.5;
const MIN_GRID_EXTENT_SCALE = 0.5;
const MAX_GRID_EXTENT_SCALE = 5;
const GRID_CELL_DIVISOR = 18;
const MIN_GRID_EXTENT = 12;
const MIN_GRID_CELL_SIZE = 0.25;
const MAX_GRID_CELL_SIZE = 20;
const DOTS_POINT_SIZE_FACTOR = 0.08;
const MIN_DOTS_POINT_SIZE = 0.04;
const MAX_DOTS_POINT_SIZE = 1.5;
const DOTS_COLOR = 0x6f6f6f;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export interface IModelGridConfig {
  position: [number, number, number];
  extent: number;
  cellSize: number;
}

export type ModelGrid =
  | {
      style: 'lines';
      config: IModelGridConfig;
      sectionSize: number;
      fadeDistance: number;
    }
  | {
      style: 'dots';
      config: IModelGridConfig;
      points: Points;
    };

export interface IUseModelGridParams {
  scene: Object3D;
  gridStyle: GridStyle;
  gridExtentScale?: number;
}

function createGridConfig(scene: Object3D, gridExtentScale: number): IModelGridConfig {
  const box = new Box3();
  const size = new Vector3();
  const center = new Vector3();

  scene.updateMatrixWorld(true);
  box.setFromObject(scene);
  box.getSize(size);
  box.getCenter(center);

  const maxDimension = Math.max(size.x, size.y, size.z, 1);
  const baseExtent = Math.max(maxDimension * GRID_EXTENT_PADDING_FACTOR, MIN_GRID_EXTENT);
  const extent = baseExtent * clamp(gridExtentScale, MIN_GRID_EXTENT_SCALE, MAX_GRID_EXTENT_SCALE);
  const cellSize = clamp(maxDimension / GRID_CELL_DIVISOR, MIN_GRID_CELL_SIZE, MAX_GRID_CELL_SIZE);

  return {
    position: [center.x, box.min.y, center.z],
    extent,
    cellSize,
  };
}

function createDotsPoints({ extent, cellSize }: IModelGridConfig) {
  const halfExtent = extent / 2;
  const pointsPerAxis = Math.max(2, Math.floor(extent / cellSize) + 1);
  const lastPointIndex = pointsPerAxis - 1;
  const step = lastPointIndex > 0 ? extent / lastPointIndex : 0;
  const positions = new Float32Array(pointsPerAxis * pointsPerAxis * 3);

  let cursor = 0;

  for (let xIndex = 0; xIndex < pointsPerAxis; xIndex += 1) {
    const x = -halfExtent + xIndex * step;

    for (let zIndex = 0; zIndex < pointsPerAxis; zIndex += 1) {
      const z = -halfExtent + zIndex * step;

      positions[cursor] = x;
      positions[cursor + 1] = 0;
      positions[cursor + 2] = z;
      cursor += 3;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));

  const material = new PointsMaterial({
    color: DOTS_COLOR,
    size: clamp(cellSize * DOTS_POINT_SIZE_FACTOR, MIN_DOTS_POINT_SIZE, MAX_DOTS_POINT_SIZE),
    sizeAttenuation: true,
  });

  return new Points(geometry, material);
}

export function useModelGrid({ scene, gridStyle, gridExtentScale = 1 }: IUseModelGridParams): ModelGrid | null {
  const grid = useMemo(() => {
    if (gridStyle === 'none') {
      return null;
    }

    const config = createGridConfig(scene, gridExtentScale);

    if (gridStyle === 'lines') {
      return {
        style: 'lines' as const,
        config,
        sectionSize: config.cellSize * 5,
        fadeDistance: config.extent * 1.2,
      };
    }

    return {
      style: 'dots' as const,
      config,
      points: createDotsPoints(config),
    };
  }, [gridExtentScale, gridStyle, scene]);

  useEffect(() => {
    if (!grid || grid.style !== 'dots') {
      return;
    }

    return () => {
      grid.points.geometry.dispose();
      grid.points.material.dispose();
    };
  }, [grid]);

  return grid;
}
