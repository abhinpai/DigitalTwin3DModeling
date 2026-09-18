import { render } from '@testing-library/react';
import { Group, Mesh, Object3D, PerspectiveCamera, PointLight, Scene, SphereGeometry, MeshBasicMaterial } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { useStageTree } from './useStageTree';

interface IHookHarnessProps {
  scene: Object3D | null;
  onTree: (tree: ReturnType<typeof useStageTree>) => void;
}

function HookHarness({ scene, onTree }: IHookHarnessProps) {
  const tree = useStageTree({ scene });
  onTree(tree);
  return null;
}

describe('useStageTree', () => {
  it('returns null when scene is null', () => {
    const onTree = vi.fn();

    render(<HookHarness scene={null} onTree={onTree} />);

    expect(onTree).toHaveBeenLastCalledWith(null);
  });

  it('builds a mesh/group tree and filters camera/light/helper nodes', () => {
    const scene = new Scene();
    scene.name = '';

    const unnamedGroup = new Group();
    unnamedGroup.name = '  ';
    const namedGroup = new Group();
    namedGroup.name = 'Floor 1';
    const unnamedMesh = new Mesh(new SphereGeometry(1, 4, 4), new MeshBasicMaterial());
    unnamedMesh.name = '';
    const namedMesh = new Mesh(new SphereGeometry(1, 4, 4), new MeshBasicMaterial());
    namedMesh.name = 'AHU-01';
    const light = new PointLight(0xffffff, 1);
    const camera = new PerspectiveCamera();
    const helperLike = new Group() as Group & { isHelper: boolean };
    helperLike.isHelper = true;
    const helperChildMesh = new Mesh(new SphereGeometry(1, 4, 4), new MeshBasicMaterial());
    helperChildMesh.name = 'Helper Child Mesh';

    helperLike.add(helperChildMesh);
    unnamedGroup.add(unnamedMesh, light);
    namedGroup.add(namedMesh, camera, helperLike);
    scene.add(unnamedGroup, namedGroup);

    const onTree = vi.fn();

    render(<HookHarness scene={scene} onTree={onTree} />);

    expect(onTree).toHaveBeenCalled();
    const tree = onTree.mock.calls.at(-1)?.[0];

    expect(tree).toEqual({
      id: scene.uuid,
      name: 'Unnamed group',
      type: 'group',
      children: [
        {
          id: unnamedGroup.uuid,
          name: 'Unnamed group',
          type: 'group',
          children: [
            {
              id: unnamedMesh.uuid,
              name: 'Unnamed mesh',
              type: 'mesh',
              children: [],
            },
          ],
        },
        {
          id: namedGroup.uuid,
          name: 'Floor 1',
          type: 'group',
          children: [
            {
              id: namedMesh.uuid,
              name: 'AHU-01',
              type: 'mesh',
              children: [],
            },
            {
              id: helperChildMesh.uuid,
              name: 'Helper Child Mesh',
              type: 'mesh',
              children: [],
            },
          ],
        },
      ],
    });
  });

  it('includes plain Object3D pivot nodes as group rows and preserves nested mesh children', () => {
    const scene = new Scene();
    scene.name = 'Scene';

    const pivot = new Object3D();
    pivot.name = 'Floor Pivot';

    const mesh = new Mesh(new SphereGeometry(1, 4, 4), new MeshBasicMaterial());
    mesh.name = 'Room Mesh';

    pivot.add(mesh);
    scene.add(pivot);

    const onTree = vi.fn();

    render(<HookHarness scene={scene} onTree={onTree} />);

    expect(onTree).toHaveBeenCalled();
    const tree = onTree.mock.calls.at(-1)?.[0];

    expect(tree).toEqual({
      id: scene.uuid,
      name: 'Scene',
      type: 'group',
      children: [
        {
          id: pivot.uuid,
          name: 'Floor Pivot',
          type: 'group',
          children: [
            {
              id: mesh.uuid,
              name: 'Room Mesh',
              type: 'mesh',
              children: [],
            },
          ],
        },
      ],
    });
  });
});
