import { render } from '@testing-library/react';
import {
  BoxGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Scene,
  type Material,
} from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { VisualMode } from '../types/visualMode';
import { useVisualMode } from './useVisualMode';

interface IHookHarnessProps {
  scene: Scene;
  visualMode: VisualMode;
}

function HookHarness({ scene, visualMode }: IHookHarnessProps) {
  useVisualMode({ scene, visualMode });
  return null;
}

function createSceneWithMeshes() {
  const scene = new Scene();
  const materialA = new MeshStandardMaterial({ color: 0x224466 });
  const materialB = new MeshStandardMaterial({ color: 0x88aa44 });
  const materialArray: Material[] = [new MeshStandardMaterial({ color: 0xffcc88 }), new MeshStandardMaterial({ color: 0x5555aa })];
  const meshA = new Mesh(new BoxGeometry(1, 1, 1), materialA);
  const meshB = new Mesh(new BoxGeometry(2, 1, 1), materialB);
  const meshArray = new Mesh(new BoxGeometry(1, 2, 1), materialArray);

  scene.add(meshA);
  scene.add(meshB);
  scene.add(meshArray);

  return { scene, meshA, meshB, meshArray, materialA, materialB, materialArray };
}

describe('useVisualMode', () => {
  it('hides original meshes and adds sibling edges line segments in wire mode', () => {
    const { scene, meshA, meshB, meshArray } = createSceneWithMeshes();

    render(<HookHarness scene={scene} visualMode="wire" />);

    expect(meshA.visible).toBe(false);
    expect(meshB.visible).toBe(false);
    expect(meshArray.visible).toBe(false);

    const siblings = scene.children.filter((child) => child instanceof LineSegments);

    expect(siblings).toHaveLength(3);

    const lineForA = siblings.find((child) => child.matrix.equals(meshA.matrix));

    expect(lineForA).toBeDefined();
    expect((lineForA?.geometry as EdgesGeometry).parameters.geometry).toBe(meshA.geometry);
  });

  it('shares one line material across edge overlays', () => {
    const { scene } = createSceneWithMeshes();

    render(<HookHarness scene={scene} visualMode="wire" />);

    const lines = scene.children.filter((child): child is LineSegments => child instanceof LineSegments);

    expect(lines).toHaveLength(3);
    expect(lines[0].material).toBe(lines[1].material);
    expect(lines[1].material).toBe(lines[2].material);
    expect(lines[0].material).toBeInstanceOf(LineBasicMaterial);
  });

  it('restores original mode and disposes overlays and shared material', () => {
    const { scene, meshA, meshB, meshArray, materialA, materialB, materialArray } = createSceneWithMeshes();

    const { rerender } = render(<HookHarness scene={scene} visualMode="wire" />);

    const lines = scene.children.filter((child): child is LineSegments => child instanceof LineSegments);
    const edgeDisposeSpies = lines.map((line) => vi.spyOn(line.geometry, 'dispose'));
    const sharedMaterialDisposeSpy = vi.spyOn(lines[0].material as LineBasicMaterial, 'dispose');

    rerender(<HookHarness scene={scene} visualMode="original" />);

    expect(meshA.visible).toBe(true);
    expect(meshB.visible).toBe(true);
    expect(meshArray.visible).toBe(true);
    expect(meshA.material).toBe(materialA);
    expect(meshB.material).toBe(materialB);
    expect(meshArray.material).toBe(materialArray);
    expect(scene.children.some((child) => child instanceof LineSegments)).toBe(false);
    edgeDisposeSpies.forEach((disposeSpy) => {
      expect(disposeSpy).toHaveBeenCalledTimes(1);
    });
    expect(sharedMaterialDisposeSpy).toHaveBeenCalledTimes(1);
  });

  it('cleans previous scene overlays on model swap', () => {
    const first = createSceneWithMeshes();
    const second = createSceneWithMeshes();

    const { rerender } = render(<HookHarness scene={first.scene} visualMode="wire" />);

    const firstLines = first.scene.children.filter((child): child is LineSegments => child instanceof LineSegments);
    const firstEdgeDisposeSpies = firstLines.map((line) => vi.spyOn(line.geometry, 'dispose'));
    const firstSharedMaterialDisposeSpy = vi.spyOn(firstLines[0].material as LineBasicMaterial, 'dispose');

    rerender(<HookHarness scene={second.scene} visualMode="wire" />);

    expect(first.meshA.visible).toBe(true);
    expect(first.meshB.visible).toBe(true);
    expect(first.meshArray.visible).toBe(true);
    expect(first.scene.children.some((child) => child instanceof LineSegments)).toBe(false);
    firstEdgeDisposeSpies.forEach((disposeSpy) => {
      expect(disposeSpy).toHaveBeenCalledTimes(1);
    });
    expect(firstSharedMaterialDisposeSpy).toHaveBeenCalledTimes(1);

    expect(second.meshA.visible).toBe(false);
    expect(second.scene.children.some((child) => child instanceof LineSegments)).toBe(true);
  });

  it('cleans overlays on unmount', () => {
    const { scene, meshA, meshB, meshArray, materialA, materialB, materialArray } = createSceneWithMeshes();

    const { unmount } = render(<HookHarness scene={scene} visualMode="wire" />);

    const lines = scene.children.filter((child): child is LineSegments => child instanceof LineSegments);
    const edgeDisposeSpies = lines.map((line) => vi.spyOn(line.geometry, 'dispose'));
    const sharedMaterialDisposeSpy = vi.spyOn(lines[0].material as LineBasicMaterial, 'dispose');

    unmount();

    expect(meshA.visible).toBe(true);
    expect(meshB.visible).toBe(true);
    expect(meshArray.visible).toBe(true);
    expect(meshA.material).toBe(materialA);
    expect(meshB.material).toBe(materialB);
    expect(meshArray.material).toBe(materialArray);
    expect(scene.children.some((child) => child instanceof LineSegments)).toBe(false);
    edgeDisposeSpies.forEach((disposeSpy) => {
      expect(disposeSpy).toHaveBeenCalledTimes(1);
    });
    expect(sharedMaterialDisposeSpy).toHaveBeenCalledTimes(1);
  });

  it('does nothing for non-mesh nodes', () => {
    const scene = new Scene();
    const group = new Group();
    scene.add(group);

    expect(() => render(<HookHarness scene={scene} visualMode="wire" />)).not.toThrow();
  });
});
