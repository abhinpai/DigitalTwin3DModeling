import { render } from '@testing-library/react';
import { Mesh, Scene, BoxGeometry, MeshStandardMaterial, Points, type Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { GridStyle } from '../types/gridStyle';
import { useModelGrid, type ModelGrid } from './useModelGrid';

interface IHookHarnessProps {
  scene: Object3D;
  gridStyle: GridStyle;
  onGrid: (grid: ModelGrid | null) => void;
}

function HookHarness({ scene, gridStyle, onGrid }: IHookHarnessProps) {
  const grid = useModelGrid({ scene, gridStyle });
  onGrid(grid);
  return null;
}

function createBoxScene(size: [number, number, number], position: [number, number, number] = [0, 0, 0]) {
  const scene = new Scene();
  const mesh = new Mesh(new BoxGeometry(size[0], size[1], size[2]), new MeshStandardMaterial({ color: 0x888888 }));

  mesh.position.set(position[0], position[1], position[2]);
  scene.add(mesh);

  return scene;
}

describe('useModelGrid', () => {
  it('returns null when gridStyle is none', () => {
    const scene = createBoxScene([10, 6, 10]);
    const onGrid = vi.fn();

    render(<HookHarness scene={scene} gridStyle="none" onGrid={onGrid} />);

    expect(onGrid).toHaveBeenCalledWith(null);
  });

  it('returns lines grid config that scales with model max dimension and sits on model base', () => {
    const bangalore = createBoxScene([10, 14.7, 10.3], [5, 9, -3]);
    const richardson = createBoxScene([147, 32, 120], [2, 25, 1]);
    const voyager = createBoxScene([245, 45, 230], [-10, 50, 15]);

    const capture = vi.fn();

    const { rerender } = render(<HookHarness scene={bangalore} gridStyle="lines" onGrid={capture} />);
    rerender(<HookHarness scene={richardson} gridStyle="lines" onGrid={capture} />);
    rerender(<HookHarness scene={voyager} gridStyle="lines" onGrid={capture} />);

    const [bangaloreGrid, richardsonGrid, voyagerGrid] = capture.mock.calls
      .map(([value]) => value as ModelGrid)
      .filter((value): value is Extract<ModelGrid, { style: 'lines' }> => value?.style === 'lines');

    expect(bangaloreGrid.config.extent).toBeCloseTo(22.05, 5);
    expect(richardsonGrid.config.extent).toBeCloseTo(220.5, 5);
    expect(voyagerGrid.config.extent).toBeCloseTo(367.5, 5);

    expect(bangaloreGrid.config.cellSize).toBeCloseTo(14.7 / 18, 5);
    expect(richardsonGrid.config.cellSize).toBeCloseTo(147 / 18, 5);
    expect(voyagerGrid.config.cellSize).toBeCloseTo(245 / 18, 5);

    expect(bangaloreGrid.config.extent).toBeLessThan(richardsonGrid.config.extent);
    expect(richardsonGrid.config.extent).toBeLessThan(voyagerGrid.config.extent);
    expect(bangaloreGrid.config.cellSize).toBeLessThan(richardsonGrid.config.cellSize);
    expect(richardsonGrid.config.cellSize).toBeLessThan(voyagerGrid.config.cellSize);

    expect(bangaloreGrid.config.position[0]).toBeCloseTo(5, 5);
    expect(bangaloreGrid.config.position[1]).toBeCloseTo(1.65, 5);
    expect(bangaloreGrid.config.position[2]).toBeCloseTo(-3, 5);
    expect(richardsonGrid.config.position).toEqual([2, 9, 1]);
    expect(voyagerGrid.config.position).toEqual([-10, 27.5, 15]);
  });

  it('returns dots grid config with Points data that scales with model max dimension', () => {
    const bangalore = createBoxScene([10, 14.7, 10.3], [0, 10, 0]);
    const voyager = createBoxScene([245, 45, 230], [0, 50, 0]);
    const capture = vi.fn();

    const { rerender } = render(<HookHarness scene={bangalore} gridStyle="dots" onGrid={capture} />);
    rerender(<HookHarness scene={voyager} gridStyle="dots" onGrid={capture} />);

    const [bangaloreGrid, voyagerGrid] = capture.mock.calls
      .map(([value]) => value as ModelGrid)
      .filter((value): value is Extract<ModelGrid, { style: 'dots' }> => value?.style === 'dots');

    expect(bangaloreGrid.points).toBeInstanceOf(Points);
    expect(voyagerGrid.points).toBeInstanceOf(Points);
    expect(bangaloreGrid.config.extent).toBeCloseTo(22.05, 5);
    expect(voyagerGrid.config.extent).toBeCloseTo(367.5, 5);
    expect(bangaloreGrid.config.cellSize).toBeCloseTo(14.7 / 18, 5);
    expect(voyagerGrid.config.cellSize).toBeCloseTo(245 / 18, 5);

    expect(voyagerGrid.config.extent).toBeGreaterThan(bangaloreGrid.config.extent);
    expect(voyagerGrid.config.cellSize).toBeGreaterThan(bangaloreGrid.config.cellSize);
    expect((bangaloreGrid.points.geometry.attributes.position.array as Float32Array).length).toBeGreaterThan(0);
    expect((voyagerGrid.points.geometry.attributes.position.array as Float32Array).length).toBeGreaterThan(0);
  });

  it('uses overall max dimension for tall/narrow models and still follows footprint for flat/wide models', () => {
    const tallNarrow = createBoxScene([10, 14.7, 10.3], [0, 7.35, 0]);
    const flatWide = createBoxScene([60, 8, 40], [0, 4, 0]);
    const capture = vi.fn();

    const { rerender } = render(<HookHarness scene={tallNarrow} gridStyle="lines" onGrid={capture} />);
    rerender(<HookHarness scene={flatWide} gridStyle="lines" onGrid={capture} />);

    const [tallNarrowGrid, flatWideGrid] = capture.mock.calls
      .map(([value]) => value as ModelGrid)
      .filter((value): value is Extract<ModelGrid, { style: 'lines' }> => value?.style === 'lines');

    const tallNarrowFootprint = Math.max(10, 10.3);

    expect(tallNarrowGrid.config.extent).toBeCloseTo(14.7 * 1.5, 5);
    expect(tallNarrowGrid.config.cellSize).toBeCloseTo(14.7 / 18, 5);
    expect(tallNarrowGrid.config.extent).toBeGreaterThan(tallNarrowFootprint * 1.5);
    expect(tallNarrowGrid.config.cellSize).toBeGreaterThan(tallNarrowFootprint / 18);

    expect(flatWideGrid.config.extent).toBeCloseTo(60 * 1.5, 5);
    expect(flatWideGrid.config.cellSize).toBeCloseTo(60 / 18, 5);
  });

  it('disposes dots geometry and material on style change, model swap, and unmount', () => {
    const firstScene = createBoxScene([147, 32, 120], [0, 25, 0]);
    const secondScene = createBoxScene([245, 45, 230], [0, 50, 0]);
    const capture = vi.fn();

    const { rerender, unmount } = render(<HookHarness scene={firstScene} gridStyle="dots" onGrid={capture} />);

    const firstDotsGrid = capture.mock.calls
      .map(([value]) => value as ModelGrid)
      .find((value): value is Extract<ModelGrid, { style: 'dots' }> => value?.style === 'dots');

    expect(firstDotsGrid).toBeDefined();

    const firstGeometryDisposeSpy = vi.spyOn(firstDotsGrid!.points.geometry, 'dispose');
    const firstMaterialDisposeSpy = vi.spyOn(firstDotsGrid!.points.material, 'dispose');

    rerender(<HookHarness scene={firstScene} gridStyle="lines" onGrid={capture} />);

    expect(firstGeometryDisposeSpy).toHaveBeenCalledTimes(1);
    expect(firstMaterialDisposeSpy).toHaveBeenCalledTimes(1);

    rerender(<HookHarness scene={secondScene} gridStyle="dots" onGrid={capture} />);

    const secondDotsGrid = capture.mock.calls
      .map(([value]) => value as ModelGrid)
      .filter((value): value is Extract<ModelGrid, { style: 'dots' }> => value?.style === 'dots')
      .at(-1);

    expect(secondDotsGrid).toBeDefined();

    const secondGeometryDisposeSpy = vi.spyOn(secondDotsGrid!.points.geometry, 'dispose');
    const secondMaterialDisposeSpy = vi.spyOn(secondDotsGrid!.points.material, 'dispose');

    rerender(<HookHarness scene={firstScene} gridStyle="dots" onGrid={capture} />);

    expect(secondGeometryDisposeSpy).toHaveBeenCalledTimes(1);
    expect(secondMaterialDisposeSpy).toHaveBeenCalledTimes(1);

    const currentDotsGrid = capture.mock.calls
      .map(([value]) => value as ModelGrid)
      .filter((value): value is Extract<ModelGrid, { style: 'dots' }> => value?.style === 'dots')
      .at(-1);

    const currentGeometryDisposeSpy = vi.spyOn(currentDotsGrid!.points.geometry, 'dispose');
    const currentMaterialDisposeSpy = vi.spyOn(currentDotsGrid!.points.material, 'dispose');

    unmount();

    expect(currentGeometryDisposeSpy).toHaveBeenCalledTimes(1);
    expect(currentMaterialDisposeSpy).toHaveBeenCalledTimes(1);
  });
});
