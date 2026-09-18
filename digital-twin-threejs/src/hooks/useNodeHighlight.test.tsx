import { render } from '@testing-library/react';
import {
  BoxGeometry,
  EdgesGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Scene,
} from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { describe, expect, it, vi } from 'vitest';
import { useNodeHighlight } from './useNodeHighlight';

interface IHookHarnessProps {
  scene: Scene | null;
  selectedNodeIds?: string[];
}

function HookHarness({ scene, selectedNodeIds }: IHookHarnessProps) {
  useNodeHighlight({ scene, selectedNodeIds });
  return null;
}

function createScene() {
  const scene = new Scene();
  const group = new Group();
  const meshA = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  const meshB = new Mesh(new BoxGeometry(2, 1, 1), new MeshBasicMaterial());

  group.add(meshA, meshB);
  scene.add(group);

  return { scene, group, meshA, meshB };
}

describe('useNodeHighlight', () => {
  it('does nothing when scene is null', () => {
    expect(() => render(<HookHarness scene={null} selectedNodeIds={['x']} />)).not.toThrow();
  });

  it('adds highlight overlays for selected meshes', () => {
    const { scene, group, meshA, meshB } = createScene();

    render(<HookHarness scene={scene} selectedNodeIds={[meshA.uuid]} />);

    const overlays = meshA.children.filter((child): child is LineSegments2 => child instanceof LineSegments2);
    const overlay = overlays[0];

    expect(overlays).toHaveLength(1);
    expect(overlay.geometry).toBeInstanceOf(LineSegmentsGeometry);
    expect(overlay.material).toBeInstanceOf(LineMaterial);
    expect((overlay.material as LineMaterial).color.getHex()).toBe(0x2f6fed);
    expect((overlay.material as LineMaterial).linewidth).toBe(0.2);
    expect((overlay.material as LineMaterial).worldUnits).toBe(true);
    expect((overlay.material as LineMaterial).depthTest).toBe(true);
    expect((overlay.material as LineMaterial).depthWrite).toBe(false);
    expect(overlay.userData.__digitalTwinOutline).toBe(true);
    expect(overlay.frustumCulled).toBe(false);
    expect(overlay.renderOrder).toBe(999);
    expect(() => overlay.raycast({} as never, [] as never)).not.toThrow();
    expect(group.children.includes(meshB)).toBe(true);
  });

  it('builds edge geometry from selected mesh geometry', () => {
    const { scene, meshA } = createScene();
    const sourceGeometry = meshA.geometry;
    const setPositionsSpy = vi.spyOn(LineSegmentsGeometry.prototype, 'setPositions');

    render(<HookHarness scene={scene} selectedNodeIds={[meshA.uuid]} />);

    const overlay = meshA.children.find((child): child is LineSegments2 => child instanceof LineSegments2);
    expect(overlay).toBeDefined();

    const lineGeometry = overlay!.geometry as LineSegmentsGeometry;
    const sourcePosition = meshA.geometry.getAttribute('position');
    const instanceStart = lineGeometry.getAttribute('instanceStart');

    expect(setPositionsSpy).toHaveBeenCalledTimes(1);
    const edges = new EdgesGeometry(sourceGeometry, 1);
    const edgePositions = edges.getAttribute('position');
    const passedPositions = setPositionsSpy.mock.calls[0][0] as number[];

    expect(passedPositions).toEqual(Array.from(edgePositions.array as Iterable<number>));
    expect(instanceStart.count).toBeGreaterThan(0);
    expect(sourcePosition.count).toBeGreaterThan(0);

    edges.dispose();
  });

  it('updates overlays when selected nodes change', () => {
    const { scene, meshA, meshB } = createScene();

    const { rerender } = render(<HookHarness scene={scene} selectedNodeIds={[meshA.uuid]} />);
    rerender(<HookHarness scene={scene} selectedNodeIds={[meshB.uuid]} />);

    const overlaysA = meshA.children.filter((child): child is LineSegments2 => child instanceof LineSegments2);
    const overlaysB = meshB.children.filter((child): child is LineSegments2 => child instanceof LineSegments2);

    expect(overlaysA).toHaveLength(0);
    expect(overlaysB).toHaveLength(1);
  });

  it('disposes overlay geometry and material when selection is cleared', () => {
    const { scene, meshA } = createScene();

    const { rerender } = render(<HookHarness scene={scene} selectedNodeIds={[meshA.uuid]} />);

    const edgesDisposeSpy = vi.spyOn(EdgesGeometry.prototype, 'dispose');

    const overlay = meshA.children.find((child): child is LineSegments2 => child instanceof LineSegments2);
    expect(overlay).toBeDefined();

    const geometryDisposeSpy = vi.spyOn(overlay!.geometry, 'dispose');
    const materialDisposeSpy = vi.spyOn(overlay!.material as LineMaterial, 'dispose');

    rerender(<HookHarness scene={scene} selectedNodeIds={[]} />);

    expect(meshA.children.some((child) => child instanceof LineSegments2)).toBe(false);
    expect(geometryDisposeSpy).toHaveBeenCalledTimes(1);
    expect(materialDisposeSpy).toHaveBeenCalledTimes(1);
    expect(edgesDisposeSpy).toHaveBeenCalledTimes(1);
  });

  it('disposes overlays on unmount', () => {
    const { scene, meshA } = createScene();

    const { unmount } = render(<HookHarness scene={scene} selectedNodeIds={[meshA.uuid]} />);

    const edgesDisposeSpy = vi.spyOn(EdgesGeometry.prototype, 'dispose');

    const overlay = meshA.children.find((child): child is LineSegments2 => child instanceof LineSegments2);
    expect(overlay).toBeDefined();

    const geometryDisposeSpy = vi.spyOn(overlay!.geometry, 'dispose');
    const materialDisposeSpy = vi.spyOn(overlay!.material as LineMaterial, 'dispose');

    unmount();

    expect(meshA.children.some((child) => child instanceof LineSegments2)).toBe(false);
    expect(geometryDisposeSpy).toHaveBeenCalledTimes(1);
    expect(materialDisposeSpy).toHaveBeenCalledTimes(1);
    expect(edgesDisposeSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores selected ids that are not meshes', () => {
    const scene = new Scene();
    const group = new Group();
    scene.add(group);

    render(<HookHarness scene={scene} selectedNodeIds={[group.uuid]} />);

    expect(group.children.some((child) => child instanceof LineSegments2 || child instanceof Mesh)).toBe(false);
  });

  it('skips overlay creation when edge geometry has no position attribute', () => {
    const { scene, meshA } = createScene();
    const originalGetAttribute = EdgesGeometry.prototype.getAttribute;
    const getAttributeSpy = vi
      .spyOn(EdgesGeometry.prototype, 'getAttribute')
      .mockImplementation(function mockGetAttribute(name: string) {
        if (name === 'position') {
          return undefined as never;
        }

        return Reflect.apply(originalGetAttribute, this, [name]);
      });
    const disposeSpy = vi.spyOn(EdgesGeometry.prototype, 'dispose');

    render(<HookHarness scene={scene} selectedNodeIds={[meshA.uuid]} />);

    expect(meshA.children.some((child) => child instanceof LineSegments2)).toBe(false);
    expect(disposeSpy).toHaveBeenCalledTimes(1);
    getAttributeSpy.mockRestore();
  });
});
