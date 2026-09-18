import { render } from '@testing-library/react';
import { Group, Mesh, MeshBasicMaterial, Scene, SphereGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { useNodeVisibility } from './useNodeVisibility';

interface IHookHarnessProps {
  scene: Scene | null;
  hiddenNodeIds?: string[];
}

function HookHarness({ scene, hiddenNodeIds }: IHookHarnessProps) {
  useNodeVisibility({ scene, hiddenNodeIds });
  return null;
}

function createScene() {
  const scene = new Scene();
  const group = new Group();
  const nestedGroup = new Group();
  const mesh = new Mesh(new SphereGeometry(1, 4, 4), new MeshBasicMaterial());
  const siblingMesh = new Mesh(new SphereGeometry(1, 4, 4), new MeshBasicMaterial());

  nestedGroup.add(mesh);
  group.add(nestedGroup);
  scene.add(siblingMesh);
  scene.add(group);

  return { scene, group, nestedGroup, mesh, siblingMesh };
}

describe('useNodeVisibility', () => {
  it('does nothing when scene is null', () => {
    expect(() => render(<HookHarness scene={null} hiddenNodeIds={['x']} />)).not.toThrow();
  });

  it('leaves all nodes visible when hiddenNodeIds is undefined or empty', () => {
    const { scene, group, nestedGroup, mesh, siblingMesh } = createScene();
    const { rerender } = render(<HookHarness scene={scene} />);

    expect(scene.visible).toBe(true);
    expect(group.visible).toBe(true);
    expect(nestedGroup.visible).toBe(true);
    expect(mesh.visible).toBe(true);
    expect(siblingMesh.visible).toBe(true);

    rerender(<HookHarness scene={scene} hiddenNodeIds={[]} />);

    expect(scene.visible).toBe(true);
    expect(group.visible).toBe(true);
    expect(nestedGroup.visible).toBe(true);
    expect(mesh.visible).toBe(true);
    expect(siblingMesh.visible).toBe(true);
  });

  it('hides matching node ids and restores on update', () => {
    const { scene, group, nestedGroup, mesh, siblingMesh } = createScene();
    const { rerender } = render(<HookHarness scene={scene} hiddenNodeIds={[mesh.uuid]} />);

    expect(scene.visible).toBe(true);
    expect(group.visible).toBe(true);
    expect(nestedGroup.visible).toBe(true);
    expect(mesh.visible).toBe(false);
    expect(siblingMesh.visible).toBe(true);

    rerender(<HookHarness scene={scene} hiddenNodeIds={[group.uuid]} />);

    expect(scene.visible).toBe(true);
    expect(group.visible).toBe(false);
    expect(nestedGroup.visible).toBe(false);
    expect(mesh.visible).toBe(false);
    expect(siblingMesh.visible).toBe(true);

    rerender(<HookHarness scene={scene} hiddenNodeIds={[]} />);

    expect(group.visible).toBe(true);
    expect(nestedGroup.visible).toBe(true);
    expect(mesh.visible).toBe(true);
    expect(siblingMesh.visible).toBe(true);
  });

  it('applies cascading hide from a hidden group to descendants', () => {
    const { scene, group, nestedGroup, mesh, siblingMesh } = createScene();

    render(<HookHarness scene={scene} hiddenNodeIds={[nestedGroup.uuid]} />);

    expect(group.visible).toBe(true);
    expect(nestedGroup.visible).toBe(false);
    expect(mesh.visible).toBe(false);
    expect(siblingMesh.visible).toBe(true);
  });
});
