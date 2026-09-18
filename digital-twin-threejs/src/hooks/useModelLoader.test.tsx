import { render } from '@testing-library/react';
import { BoxGeometry, Mesh, MeshBasicMaterial, Scene, Texture } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useModelLoader } from './useModelLoader';

const { gltfLoaderMock, clearMock } = vi.hoisted(() => ({
  gltfLoaderMock: vi.fn(),
  clearMock: vi.fn(),
}));

vi.mock('@react-three/drei', () => {
  const mockedUseGLTF = (url: string, draco: boolean) => gltfLoaderMock(url, draco);
  (mockedUseGLTF as typeof mockedUseGLTF & { clear: typeof clearMock }).clear = clearMock;

  return {
    useGLTF: mockedUseGLTF,
  };
});

interface IHookHarnessProps {
  modelUrl: string;
}

function HookHarness({ modelUrl }: IHookHarnessProps) {
  useModelLoader(modelUrl);
  return null;
}

interface IMockScene {
  scene: Scene;
  geometryDispose: ReturnType<typeof vi.fn>;
  materialDispose: ReturnType<typeof vi.fn>;
  textureDispose: ReturnType<typeof vi.fn>;
}

function createMockScene(): IMockScene {
  const scene = new Scene();
  const geometryDispose = vi.fn();
  const materialDispose = vi.fn();
  const textureDispose = vi.fn();
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshBasicMaterial();
  const texture = new Texture();
  const mesh = new Mesh(geometry, material);

  geometry.dispose = geometryDispose;
  material.dispose = materialDispose;
  texture.dispose = textureDispose;
  material.map = texture;
  scene.add(mesh);

  return {
    scene,
    geometryDispose,
    materialDispose,
    textureDispose,
  };
}

describe('useModelLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads with draco enabled and disposes previous scene on model swap', () => {
    const first = createMockScene();
    const second = createMockScene();

    gltfLoaderMock.mockImplementation((url: string) => {
      if (url === '/a.glb') {
        return first;
      }

      return second;
    });

    const { rerender } = render(<HookHarness modelUrl="/a.glb" />);

    rerender(<HookHarness modelUrl="/b.glb" />);

    expect(gltfLoaderMock).toHaveBeenCalledWith('/a.glb', true);
    expect(gltfLoaderMock).toHaveBeenCalledWith('/b.glb', true);
    expect(first.geometryDispose).toHaveBeenCalledTimes(1);
    expect(first.materialDispose).toHaveBeenCalledTimes(1);
    expect(first.textureDispose).toHaveBeenCalledTimes(1);
    expect(clearMock).toHaveBeenCalledWith('/a.glb');
  });

  it('disposes current scene and clears model cache on unmount', () => {
    const first = createMockScene();
    gltfLoaderMock.mockReturnValue(first);

    const { unmount } = render(<HookHarness modelUrl="/a.glb" />);

    unmount();

    expect(first.geometryDispose).toHaveBeenCalledTimes(1);
    expect(first.materialDispose).toHaveBeenCalledTimes(1);
    expect(first.textureDispose).toHaveBeenCalledTimes(1);
    expect(clearMock).toHaveBeenCalledWith('/a.glb');
  });
});
