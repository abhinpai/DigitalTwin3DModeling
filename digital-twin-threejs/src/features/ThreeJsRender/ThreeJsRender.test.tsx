import { act, render, screen } from '@testing-library/react';
import { createRef, forwardRef, type ReactNode } from 'react';
import { BoxGeometry, Mesh, MeshBasicMaterial, Points, PointsMaterial, Scene, Texture, Vector3 } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeJsRender } from './ThreeJsRender';
import type { IThreejsCanvasHandle } from '../ThreejsCanvas/ThreejsCanvas';
import type { IViewportState } from '../../types/viewportState';

const {
  canvasMock,
  orbitControlsMock,
  perspectiveCameraMock,
  orthographicCameraMock,
  gridMock,
  clearMock,
  gltfLoaderMock,
  useThreeMock,
  computeCameraFitMock,
  computeOrthographicCameraFitMock,
  useVisualModeMock,
  useModelGridMock,
  useShadowCatcherMock,
  useNodeVisibilityMock,
  useNodeHighlightMock,
  useStageTreeMock,
  attachOrbitControlsRefState,
} = vi.hoisted(() => ({
  canvasMock: vi.fn(({ children }: { children: ReactNode }) => <div data-testid="mock-canvas">{children}</div>),
  orbitControlsMock: vi.fn(() => <div data-testid="mock-orbit-controls" />),
  perspectiveCameraMock: vi.fn(() => <div data-testid="mock-perspective-camera" />),
  orthographicCameraMock: vi.fn(() => <div data-testid="mock-orthographic-camera" />),
  gridMock: vi.fn(() => <div data-testid="mock-grid" />),
  clearMock: vi.fn(),
  gltfLoaderMock: vi.fn(),
  useThreeMock: vi.fn(),
  computeCameraFitMock: vi.fn(),
  computeOrthographicCameraFitMock: vi.fn(),
  useVisualModeMock: vi.fn(),
  useModelGridMock: vi.fn(),
  useShadowCatcherMock: vi.fn(),
  useNodeVisibilityMock: vi.fn(),
  useNodeHighlightMock: vi.fn(),
  useStageTreeMock: vi.fn(),
  attachOrbitControlsRefState: { current: true },
}));

const mockControlsApi = {
  target: {
    x: 0,
    y: 0,
    z: 0,
    copy: vi.fn(),
    set: vi.fn((x: number, y: number, z: number) => {
      mockControlsApi.target.x = x;
      mockControlsApi.target.y = y;
      mockControlsApi.target.z = z;
    }),
  },
  update: vi.fn(),
  object: null as unknown,
};

const mockCamera = {
  isPerspectiveCamera: true,
  fov: 50,
  near: 0.1,
  far: 2000,
  zoom: 1,
  position: {
    x: 0,
    y: 0,
    z: 1,
    set: vi.fn(),
  },
  lookAt: vi.fn(),
  updateProjectionMatrix: vi.fn(),
};

// ponytail: jsdom has no WebGL, so we mock R3F at the component boundary and assert our integration behavior.
vi.mock('@react-three/fiber', () => ({
  Canvas: (props: {
    children: ReactNode;
    onPointerMissed?: () => void;
    onPointerDown?: (event: { nativeEvent?: { clientX: number; clientY: number }; clientX?: number; clientY?: number }) => void;
    onPointerUp?: (event: { nativeEvent?: { clientX: number; clientY: number }; clientX?: number; clientY?: number }) => void;
    shadows?: boolean;
  }) => canvasMock(props),
  useThree: () => useThreeMock(),
}));

vi.mock('@react-three/drei', () => {
  const mockedUseGLTF = (url: string, draco: boolean) => gltfLoaderMock(url, draco);
  (mockedUseGLTF as typeof mockedUseGLTF & { clear: typeof clearMock }).clear = clearMock;

  const MockOrbitControls = forwardRef((_props: unknown, ref) => {
    if (attachOrbitControlsRefState.current) {
      if (typeof ref === 'function') {
        ref(mockControlsApi);
      } else if (ref && 'current' in ref) {
        ref.current = mockControlsApi;
      }
    }

    return orbitControlsMock();
  });
  MockOrbitControls.displayName = 'MockOrbitControls';

  return {
    OrbitControls: MockOrbitControls,
    PerspectiveCamera: (props: unknown) => perspectiveCameraMock(props),
    OrthographicCamera: (props: unknown) => orthographicCameraMock(props),
    Grid: (props: unknown) => gridMock(props),
    useGLTF: mockedUseGLTF,
  };
});

vi.mock('../../utils/computeCameraFit', () => ({
  computeCameraFit: (box: unknown, fov: number) => computeCameraFitMock(box, fov),
  computeOrthographicCameraFit: (box: unknown, width: number, height: number, orthoView?: string) => computeOrthographicCameraFitMock(box, width, height, orthoView),
}));

vi.mock('../../hooks/useVisualMode', () => ({
  useVisualMode: (params: unknown) => useVisualModeMock(params),
}));

vi.mock('../../hooks/useModelGrid', () => ({
  useModelGrid: (params: unknown) => useModelGridMock(params),
}));

vi.mock('../../hooks/useShadowCatcher', () => ({
  useShadowCatcher: (params: unknown) => useShadowCatcherMock(params),
}));

vi.mock('../../hooks/useNodeVisibility', () => ({
  useNodeVisibility: (params: unknown) => useNodeVisibilityMock(params),
}));

vi.mock('../../hooks/useNodeHighlight', () => ({
  useNodeHighlight: (params: unknown) => useNodeHighlightMock(params),
}));

vi.mock('../../hooks/useStageTree', () => ({
  useStageTree: (params: unknown) => useStageTreeMock(params),
}));

interface IMockScene {
  scene: Scene;
  spies: {
    updateMatrixWorld: ReturnType<typeof vi.spyOn>;
    positionSet: ReturnType<typeof vi.fn>;
    lookAt: ReturnType<typeof vi.fn>;
    targetCopy: ReturnType<typeof vi.fn>;
    controlsUpdate: ReturnType<typeof vi.fn>;
    cameraProjectionUpdate: ReturnType<typeof vi.fn>;
    geometryDispose: ReturnType<typeof vi.fn>;
    materialDispose: ReturnType<typeof vi.fn>;
    textureDispose: ReturnType<typeof vi.fn>;
  };
}

function createMockScene(): IMockScene {
  const scene = new Scene();

  const geometryDispose = vi.fn();
  const materialDispose = vi.fn();
  const textureDispose = vi.fn();
  const geometry = new BoxGeometry(10, 20, 30);
  const material = new MeshBasicMaterial();
  const texture = new Texture();
  const mesh = new Mesh(geometry, material);

  texture.dispose = textureDispose;
  material.map = texture;
  material.dispose = materialDispose;
  geometry.dispose = geometryDispose;

  mesh.position.set(100, 50, -25);
  scene.add(mesh);

  const updateMatrixWorld = vi.spyOn(scene, 'updateMatrixWorld');

  return {
    scene,
    spies: {
      updateMatrixWorld,
      positionSet: mockCamera.position.set,
      lookAt: mockCamera.lookAt,
      targetCopy: mockControlsApi.target.copy,
      controlsUpdate: mockControlsApi.update,
      cameraProjectionUpdate: mockCamera.updateProjectionMatrix,
      geometryDispose,
      materialDispose,
      textureDispose,
    },
  };
}

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];

  callback: ResizeObserverCallback;

  observe = vi.fn();

  disconnect = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  emitSize(width: number, height: number) {
    this.callback(
      [{ contentRect: { width, height } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
}

function emitObservedSize(width: number, height: number) {
  const observer = MockResizeObserver.instances[0];

  expect(observer).toBeDefined();

  act(() => {
    observer?.emitSize(width, height);
  });
}

function getModelPrimitiveProps() {
  const modelPrimitiveElement = document.querySelector('primitive');
  const reactPropsKey = Object.keys(modelPrimitiveElement ?? {}).find((key) => key.startsWith('__reactProps$'));
  const modelPrimitiveProps = reactPropsKey ? (modelPrimitiveElement as Record<string, unknown>)[reactPropsKey] as Record<string, unknown> : null;

  expect(modelPrimitiveElement).not.toBeNull();
  expect(modelPrimitiveProps).not.toBeNull();

  return modelPrimitiveProps as Record<string, unknown>;
}

function getLastCanvasProps() {
  return canvasMock.mock.calls.at(-1)?.[0] as {
    onPointerMissed?: () => void;
    onPointerDown?: (event: { nativeEvent?: { clientX: number; clientY: number }; clientX?: number; clientY?: number }) => void;
    onPointerUp?: (event: { nativeEvent?: { clientX: number; clientY: number }; clientX?: number; clientY?: number }) => void;
  };
}

describe('ThreeJsRender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    attachOrbitControlsRefState.current = true;
    MockResizeObserver.instances = [];
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    mockCamera.position.set = vi.fn((x: number, y: number, z: number) => {
      mockCamera.position.x = x;
      mockCamera.position.y = y;
      mockCamera.position.z = z;
    });
    mockCamera.position.x = 0;
    mockCamera.position.y = 0;
    mockCamera.position.z = 1;
    mockCamera.zoom = 1;
    mockControlsApi.target.x = 0;
    mockControlsApi.target.y = 0;
    mockControlsApi.target.z = 0;
    mockControlsApi.object = mockCamera;
    useThreeMock.mockReturnValue({ camera: mockCamera, size: { width: 1280, height: 720 } });
    computeCameraFitMock.mockReturnValue({
      position: new Vector3(120, 70, -10),
      target: new Vector3(100, 50, -25),
      near: 0.5,
      far: 5000,
    });
    computeOrthographicCameraFitMock.mockReturnValue({
      position: new Vector3(120, 70, -10),
      target: new Vector3(100, 50, -25),
      near: 0.5,
      far: 5000,
      zoom: 5,
      up: new Vector3(0, 1, 0),
    });
    useModelGridMock.mockReturnValue(null);
    useShadowCatcherMock.mockReturnValue(null);
    useStageTreeMock.mockReturnValue(null);
  });

  it('waits for container resize before mounting Canvas', () => {
    const firstModel = createMockScene();
    gltfLoaderMock.mockReturnValue(firstModel);

    render(<ThreeJsRender modelUrl="/building-a.glb" />);

    expect(screen.queryByTestId('mock-canvas')).not.toBeInTheDocument();

    emitObservedSize(800, 600);

    expect(screen.getByTestId('mock-canvas')).toBeInTheDocument();
  });

  it('fits camera once per loaded model and syncs controls target', () => {
    const firstModel = createMockScene();
    gltfLoaderMock.mockReturnValue(firstModel);

    render(<ThreeJsRender modelUrl="/building-a.glb" className="viewport-class" />);

    emitObservedSize(1280, 720);

    expect(gltfLoaderMock).toHaveBeenCalledWith('/building-a.glb', true);
    expect(useVisualModeMock).toHaveBeenCalledWith({
      scene: firstModel.scene,
      visualMode: 'original',
    });
    expect(screen.getByLabelText('Three.js viewport')).toHaveClass('viewport-class');
    expect(screen.getByTestId('mock-orbit-controls')).toBeInTheDocument();
    expect(firstModel.spies.updateMatrixWorld).toHaveBeenCalledWith(true);
    expect(computeCameraFitMock).toHaveBeenCalledTimes(1);
    expect(computeCameraFitMock).toHaveBeenCalledWith(expect.anything(), 50);
    expect(firstModel.spies.positionSet).toHaveBeenCalledTimes(1);
    expect(firstModel.spies.lookAt).toHaveBeenCalledTimes(1);
    expect(mockCamera.near).toBe(0.5);
    expect(mockCamera.far).toBe(5000);
    expect(firstModel.spies.cameraProjectionUpdate).toHaveBeenCalledTimes(1);
    expect(firstModel.spies.targetCopy).toHaveBeenCalledTimes(1);
    expect(firstModel.spies.controlsUpdate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('mock-perspective-camera')).toBeInTheDocument();
    expect(perspectiveCameraMock).toHaveBeenCalledWith(expect.objectContaining({ makeDefault: true, fov: 50, position: [0, 0, 1] }));
    expect(orthographicCameraMock).not.toHaveBeenCalled();
  });

  it('forwards cameraFov to PerspectiveCamera', () => {
    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);

    render(<ThreeJsRender modelUrl="/building-a.glb" cameraMode="persp" cameraFov={75} />);
    emitObservedSize(1280, 720);

    expect(perspectiveCameraMock).toHaveBeenCalledWith(expect.objectContaining({ fov: 75 }));
    expect(orthographicCameraMock).not.toHaveBeenCalled();
  });

  it('passes visualMode through to model rendering hook', () => {
    const firstModel = createMockScene();
    gltfLoaderMock.mockReturnValue(firstModel);

    render(<ThreeJsRender modelUrl="/building-a.glb" visualMode="wire" />);
    emitObservedSize(1280, 720);

    expect(useVisualModeMock).toHaveBeenCalledWith({
      scene: firstModel.scene,
      visualMode: 'wire',
    });
  });

  it('passes gridStyle through to model grid hook', () => {
    const firstModel = createMockScene();
    gltfLoaderMock.mockReturnValue(firstModel);

    render(<ThreeJsRender modelUrl="/building-a.glb" gridStyle="dots" />);
    emitObservedSize(1280, 720);

    expect(useModelGridMock).toHaveBeenCalledWith({
      scene: firstModel.scene,
      gridStyle: 'dots',
    });
  });

  it('passes hidden and selected node ids through stage hooks', () => {
    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);

    render(<ThreeJsRender modelUrl="/building-a.glb" hiddenNodeIds={['hidden-1']} selectedNodeIds={['selected-1']} />);
    emitObservedSize(1280, 720);

    expect(useNodeVisibilityMock).toHaveBeenCalledWith({
      scene: model.scene,
      hiddenNodeIds: ['hidden-1'],
    });
    expect(useNodeHighlightMock).toHaveBeenCalledWith({
      scene: model.scene,
      selectedNodeIds: ['selected-1'],
    });
  });

  it('notifies consumer when stage tree changes', () => {
    const model = createMockScene();
    const stageTree = {
      id: 'root-id',
      name: 'Root',
      type: 'group' as const,
      children: [],
    };
    const onStageTreeChange = vi.fn();

    gltfLoaderMock.mockReturnValue(model);
    useStageTreeMock.mockReturnValue(stageTree);

    render(<ThreeJsRender modelUrl="/building-a.glb" onStageTreeChange={onStageTreeChange} />);
    emitObservedSize(1280, 720);

    expect(useStageTreeMock).toHaveBeenCalledWith({ scene: model.scene });
    expect(onStageTreeChange).toHaveBeenCalledWith(stageTree);
  });

  it('passes shadowsEnabled to shadow catcher hook even when gridStyle is none', () => {
    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);

    const { rerender } = render(<ThreeJsRender modelUrl="/building-a.glb" gridStyle="none" shadowsEnabled={false} />);
    emitObservedSize(1280, 720);

    expect(useShadowCatcherMock).toHaveBeenLastCalledWith({
      maxDimension: 30,
      shadowGroundPosition: [100, 40, -25],
      shadowsEnabled: false,
    });

    rerender(<ThreeJsRender modelUrl="/building-a.glb" gridStyle="none" shadowsEnabled />);

    expect(useShadowCatcherMock).toHaveBeenLastCalledWith({
      maxDimension: 30,
      shadowGroundPosition: [100, 40, -25],
      shadowsEnabled: true,
    });
  });

  it('renders line grid when grid hook returns line config', () => {
    const firstModel = createMockScene();
    gltfLoaderMock.mockReturnValue(firstModel);
    useModelGridMock.mockReturnValue({
      style: 'lines',
      config: { position: [1, 2, 3], extent: 40, cellSize: 2 },
      sectionSize: 10,
      fadeDistance: 48,
    });

    render(<ThreeJsRender modelUrl="/building-a.glb" gridStyle="lines" />);
    emitObservedSize(1280, 720);

    expect(screen.getByTestId('mock-grid')).toBeInTheDocument();
    expect(gridMock).toHaveBeenCalledWith(
      expect.objectContaining({
        position: [1, 2, 3],
        args: [40, 40],
        cellSize: 2,
        sectionSize: 10,
        fadeDistance: 48,
        infiniteGrid: false,
      }),
    );
  });

  it('renders dots grid as primitive when grid hook returns points', () => {
    const firstModel = createMockScene();
    gltfLoaderMock.mockReturnValue(firstModel);
    const points = new Points(new BoxGeometry(1, 1, 1), new PointsMaterial({ size: 1 }));

    useModelGridMock.mockReturnValue({
      style: 'dots',
      config: { position: [4, 5, 6], extent: 30, cellSize: 1 },
      points,
    });

    render(<ThreeJsRender modelUrl="/building-a.glb" gridStyle="dots" />);
    emitObservedSize(1280, 720);

    expect(gridMock).not.toHaveBeenCalled();
    expect(canvasMock.mock.calls.at(-1)?.[0]?.children).toEqual(expect.anything());
  });

  it('switches to orthographic camera when cameraMode is ortho', () => {
    const orthographicCamera = {
      isOrthographicCamera: true,
      near: 0.1,
      far: 2000,
      zoom: 1,
      position: {
        set: vi.fn(),
      },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };
    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);
    useThreeMock.mockReturnValue({ camera: orthographicCamera, size: { width: 1024, height: 768 } });

    render(<ThreeJsRender modelUrl="/building-a.glb" cameraMode="ortho" />);
    emitObservedSize(1024, 768);

    expect(screen.getByTestId('mock-orthographic-camera')).toBeInTheDocument();
    expect(perspectiveCameraMock).not.toHaveBeenCalled();
    expect(computeOrthographicCameraFitMock).toHaveBeenCalledWith(expect.anything(), 1024, 768, 'front');
    expect(computeCameraFitMock).not.toHaveBeenCalled();
  });

  it('refits when cameraMode changes', () => {
    const perspectiveCamera = {
      isPerspectiveCamera: true,
      fov: 50,
      near: 0.1,
      far: 2000,
      position: {
        set: vi.fn(),
      },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };
    const orthographicCamera = {
      isOrthographicCamera: true,
      near: 0.1,
      far: 2000,
      zoom: 1,
      position: {
        set: vi.fn(),
      },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };
    useThreeMock.mockReturnValueOnce({ camera: perspectiveCamera, size: { width: 1280, height: 720 } });
    useThreeMock.mockReturnValueOnce({ camera: orthographicCamera, size: { width: 1280, height: 720 } });

    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);

    const { rerender } = render(<ThreeJsRender modelUrl="/building-a.glb" cameraMode="persp" />);
    emitObservedSize(1280, 720);

    expect(computeCameraFitMock).toHaveBeenCalledTimes(1);

    rerender(<ThreeJsRender modelUrl="/building-a.glb" cameraMode="ortho" />);

    expect(computeOrthographicCameraFitMock).toHaveBeenCalledTimes(1);
  });

  it('does not refit perspective camera when cameraFov changes', () => {
    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);

    const { rerender } = render(<ThreeJsRender modelUrl="/building-a.glb" cameraMode="persp" cameraFov={50} />);
    emitObservedSize(1280, 720);

    expect(computeCameraFitMock).toHaveBeenCalledTimes(1);

    rerender(<ThreeJsRender modelUrl="/building-a.glb" cameraMode="persp" cameraFov={80} />);

    expect(computeCameraFitMock).toHaveBeenCalledTimes(1);
    expect(computeOrthographicCameraFitMock).not.toHaveBeenCalled();
    expect(model.spies.positionSet).toHaveBeenCalledTimes(1);
    expect(model.spies.lookAt).toHaveBeenCalledTimes(1);
    expect(model.spies.targetCopy).toHaveBeenCalledTimes(1);
    expect(model.spies.controlsUpdate).toHaveBeenCalledTimes(1);
    expect(perspectiveCameraMock).toHaveBeenLastCalledWith(expect.objectContaining({ fov: 80 }));
  });

  it('ignores cameraFov changes while camera mode is orthographic', () => {
    const orthographicCamera = {
      isOrthographicCamera: true,
      near: 0.1,
      far: 2000,
      zoom: 1,
      position: {
        set: vi.fn(),
      },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };
    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);
    useThreeMock.mockReturnValue({ camera: orthographicCamera, size: { width: 1280, height: 720 } });

    const { rerender } = render(<ThreeJsRender modelUrl="/building-a.glb" cameraMode="ortho" cameraFov={40} />);
    emitObservedSize(1280, 720);

    expect(computeOrthographicCameraFitMock).toHaveBeenCalledTimes(1);

    rerender(<ThreeJsRender modelUrl="/building-a.glb" cameraMode="ortho" cameraFov={100} />);

    expect(computeOrthographicCameraFitMock).toHaveBeenCalledTimes(1);
    expect(computeCameraFitMock).not.toHaveBeenCalled();
  });

  it('refits orthographic camera when orthoView changes', () => {
    const orthographicCamera = {
      isOrthographicCamera: true,
      near: 0.1,
      far: 2000,
      zoom: 1,
      position: {
        set: vi.fn(),
      },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };
    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);
    useThreeMock.mockReturnValue({ camera: orthographicCamera, size: { width: 1280, height: 720 } });

    const { rerender } = render(<ThreeJsRender modelUrl="/building-a.glb" cameraMode="ortho" orthoView="front" />);
    emitObservedSize(1280, 720);

    rerender(<ThreeJsRender modelUrl="/building-a.glb" cameraMode="ortho" orthoView="top" />);

    expect(computeOrthographicCameraFitMock).toHaveBeenNthCalledWith(1, expect.anything(), 1280, 720, 'front');
    expect(computeOrthographicCameraFitMock).toHaveBeenNthCalledWith(2, expect.anything(), 1280, 720, 'top');
  });

  it('ignores orthoView changes while camera mode is perspective', () => {
    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);

    const { rerender } = render(<ThreeJsRender modelUrl="/building-a.glb" cameraMode="persp" orthoView="front" />);
    emitObservedSize(1280, 720);

    rerender(<ThreeJsRender modelUrl="/building-a.glb" cameraMode="persp" orthoView="top" />);

    expect(computeCameraFitMock).toHaveBeenCalledTimes(1);
    expect(computeOrthographicCameraFitMock).not.toHaveBeenCalled();
  });

  it('does not continuously refit camera on parent rerenders without model change', () => {
    const firstModel = createMockScene();
    gltfLoaderMock.mockReturnValue(firstModel);

    const { rerender } = render(<ThreeJsRender modelUrl="/building-a.glb" className="first" />);
    emitObservedSize(1280, 720);

    expect(firstModel.spies.positionSet).toHaveBeenCalledTimes(1);
    expect(firstModel.spies.targetCopy).toHaveBeenCalledTimes(1);

    rerender(<ThreeJsRender modelUrl="/building-a.glb" className="second" />);

    expect(firstModel.spies.positionSet).toHaveBeenCalledTimes(1);
    expect(firstModel.spies.targetCopy).toHaveBeenCalledTimes(1);
    expect(firstModel.spies.controlsUpdate).toHaveBeenCalledTimes(1);
  });

  it('disposes model resources and clears loader cache when modelUrl changes', () => {
    const firstModel = createMockScene();
    const secondModel = createMockScene();

    gltfLoaderMock.mockImplementation((url: string) => {
      if (url === '/building-a.glb') {
        return firstModel;
      }

      return secondModel;
    });

    const { rerender } = render(<ThreeJsRender modelUrl="/building-a.glb" />);
    emitObservedSize(1024, 768);

    rerender(<ThreeJsRender modelUrl="/building-b.glb" />);

    expect(mockCamera.position.set).toHaveBeenCalledTimes(2);
    expect(firstModel.spies.updateMatrixWorld).toHaveBeenCalled();
    expect(secondModel.spies.updateMatrixWorld).toHaveBeenCalled();
    expect(mockControlsApi.target.copy).toHaveBeenCalledTimes(2);
    expect(mockControlsApi.update).toHaveBeenCalledTimes(2);
    expect(firstModel.spies.geometryDispose).toHaveBeenCalledTimes(1);
    expect(firstModel.spies.materialDispose).toHaveBeenCalledTimes(1);
    expect(firstModel.spies.textureDispose).toHaveBeenCalledTimes(1);
    expect(clearMock).toHaveBeenCalledWith('/building-a.glb');
  });

  it('disconnects ResizeObserver and disposes current scene on unmount', () => {
    const firstModel = createMockScene();
    gltfLoaderMock.mockReturnValue(firstModel);

    const { unmount } = render(<ThreeJsRender modelUrl="/building-a.glb" />);
    emitObservedSize(1000, 700);

    unmount();

    expect(MockResizeObserver.instances[0]?.disconnect).toHaveBeenCalledTimes(1);
    expect(firstModel.spies.geometryDispose).toHaveBeenCalledTimes(1);
    expect(firstModel.spies.materialDispose).toHaveBeenCalledTimes(1);
    expect(firstModel.spies.textureDispose).toHaveBeenCalledTimes(1);
    expect(clearMock).toHaveBeenCalledWith('/building-a.glb');
  });

  it('enables canvas shadow map only when shadowsEnabled is true', () => {
    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);

    const { rerender } = render(<ThreeJsRender modelUrl="/building-a.glb" shadowsEnabled={false} />);
    emitObservedSize(1000, 700);

    expect(canvasMock.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ shadows: false }));

    rerender(<ThreeJsRender modelUrl="/building-a.glb" shadowsEnabled />);

    expect(canvasMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ shadows: true }));
  });

  it('applies mesh castShadow/receiveShadow when shadowsEnabled changes', () => {
    const model = createMockScene();
    const mesh = model.scene.children[0] as Mesh;
    gltfLoaderMock.mockReturnValue(model);

    const { rerender } = render(<ThreeJsRender modelUrl="/building-a.glb" shadowsEnabled={false} />);
    emitObservedSize(1000, 700);

    expect(mesh.castShadow).toBe(false);
    expect(mesh.receiveShadow).toBe(false);

    rerender(<ThreeJsRender modelUrl="/building-a.glb" shadowsEnabled />);

    expect(mesh.castShadow).toBe(true);
    expect(mesh.receiveShadow).toBe(true);
  });

  it('sets line grid receiveShadow only when shadows are enabled', () => {
    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);
    useModelGridMock.mockReturnValue({
      style: 'lines',
      config: { position: [1, 2, 3], extent: 40, cellSize: 2 },
      sectionSize: 10,
      fadeDistance: 48,
    });

    const { rerender } = render(<ThreeJsRender modelUrl="/building-a.glb" gridStyle="lines" shadowsEnabled={false} />);
    emitObservedSize(1280, 720);

    expect(gridMock).toHaveBeenLastCalledWith(expect.objectContaining({ receiveShadow: false }));

    rerender(<ThreeJsRender modelUrl="/building-a.glb" gridStyle="lines" shadowsEnabled />);

    expect(gridMock).toHaveBeenLastCalledWith(expect.objectContaining({ receiveShadow: true }));
  });

  it('sets dots grid receiveShadow when shadows are enabled', () => {
    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);
    const points = new Points(new BoxGeometry(1, 1, 1), new PointsMaterial({ size: 1 }));

    useModelGridMock.mockReturnValue({
      style: 'dots',
      config: { position: [0, 0, 0], extent: 20, cellSize: 1 },
      points,
    });

    const { rerender } = render(<ThreeJsRender modelUrl="/building-a.glb" gridStyle="dots" shadowsEnabled={false} />);
    emitObservedSize(1280, 720);

    expect(points.receiveShadow).toBe(false);

    rerender(<ThreeJsRender modelUrl="/building-a.glb" gridStyle="dots" shadowsEnabled />);

    expect(points.receiveShadow).toBe(true);
  });

  it('calls onNodeSelect with clicked object uuid on click-like pointer gesture', () => {
    const model = createMockScene();
    const onNodeSelect = vi.fn();
    gltfLoaderMock.mockReturnValue(model);

    render(<ThreeJsRender modelUrl="/building-a.glb" onNodeSelect={onNodeSelect} />);
    emitObservedSize(1280, 720);

    const canvasProps = getLastCanvasProps();
    const modelPrimitiveProps = getModelPrimitiveProps();
    const stopPropagation = vi.fn();
    const clickedObject = model.scene.children[0] as Mesh;
    expect(canvasProps.onPointerDown).toEqual(expect.any(Function));
    expect(modelPrimitiveProps.onPointerUp).toEqual(expect.any(Function));

    act(() => {
      canvasProps.onPointerDown?.({ nativeEvent: { clientX: 100, clientY: 100 } });
    });

    act(() => {
      (modelPrimitiveProps.onPointerUp as (event: { object: Mesh; stopPropagation: () => void; nativeEvent: { clientX: number; clientY: number } }) => void)({
        object: clickedObject,
        stopPropagation,
        nativeEvent: { clientX: 102, clientY: 103 },
      });
    });

    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(onNodeSelect).toHaveBeenCalledWith(clickedObject.uuid);
  });

  it('clears selection on click-like empty-space pointer gesture', () => {
    const model = createMockScene();
    const onNodeSelect = vi.fn();
    gltfLoaderMock.mockReturnValue(model);

    render(<ThreeJsRender modelUrl="/building-a.glb" onNodeSelect={onNodeSelect} />);
    emitObservedSize(1280, 720);

    const canvasProps = getLastCanvasProps();

    expect(canvasProps.onPointerDown).toEqual(expect.any(Function));
    expect(canvasProps.onPointerUp).toEqual(expect.any(Function));

    act(() => {
      canvasProps.onPointerDown?.({ nativeEvent: { clientX: 200, clientY: 200 } });
      canvasProps.onPointerUp?.({ nativeEvent: { clientX: 203, clientY: 202 } });
    });

    expect(onNodeSelect).toHaveBeenCalledWith(null);
  });

  it('does not select mesh on drag-like pointer gesture', () => {
    const model = createMockScene();
    const onNodeSelect = vi.fn();
    gltfLoaderMock.mockReturnValue(model);

    render(<ThreeJsRender modelUrl="/building-a.glb" onNodeSelect={onNodeSelect} />);
    emitObservedSize(1280, 720);

    const canvasProps = getLastCanvasProps();
    const modelPrimitiveProps = getModelPrimitiveProps();
    const clickedObject = model.scene.children[0] as Mesh;

    act(() => {
      canvasProps.onPointerDown?.({ nativeEvent: { clientX: 100, clientY: 100 } });
      (modelPrimitiveProps.onPointerUp as (event: { object: Mesh; stopPropagation: () => void; nativeEvent: { clientX: number; clientY: number } }) => void)({
        object: clickedObject,
        stopPropagation: vi.fn(),
        nativeEvent: { clientX: 120, clientY: 130 },
      });
    });

    expect(onNodeSelect).not.toHaveBeenCalled();
  });

  it('does not clear selection on drag-like empty-space gesture', () => {
    const model = createMockScene();
    const onNodeSelect = vi.fn();
    gltfLoaderMock.mockReturnValue(model);

    render(<ThreeJsRender modelUrl="/building-a.glb" onNodeSelect={onNodeSelect} />);
    emitObservedSize(1280, 720);

    const canvasProps = getLastCanvasProps();

    act(() => {
      canvasProps.onPointerDown?.({ nativeEvent: { clientX: 300, clientY: 300 } });
      canvasProps.onPointerUp?.({ nativeEvent: { clientX: 320, clientY: 312 } });
      canvasProps.onPointerMissed?.();
    });

    expect(onNodeSelect).not.toHaveBeenCalled();
  });

  it('keeps selected mesh selected when clicking same mesh again', () => {
    const model = createMockScene();
    const onNodeSelect = vi.fn();
    gltfLoaderMock.mockReturnValue(model);

    render(<ThreeJsRender modelUrl="/building-a.glb" onNodeSelect={onNodeSelect} />);
    emitObservedSize(1280, 720);

    const canvasProps = getLastCanvasProps();
    const modelPrimitiveProps = getModelPrimitiveProps();
    const clickedObject = model.scene.children[0] as Mesh;

    const clickMesh = () => {
      canvasProps.onPointerDown?.({ nativeEvent: { clientX: 140, clientY: 140 } });
      (modelPrimitiveProps.onPointerUp as (event: { object: Mesh; stopPropagation: () => void; nativeEvent: { clientX: number; clientY: number } }) => void)({
        object: clickedObject,
        stopPropagation: vi.fn(),
        nativeEvent: { clientX: 142, clientY: 143 },
      });
      canvasProps.onPointerMissed?.();
    };

    act(() => {
      clickMesh();
      clickMesh();
    });

    expect(onNodeSelect).toHaveBeenNthCalledWith(1, clickedObject.uuid);
    expect(onNodeSelect).toHaveBeenNthCalledWith(2, clickedObject.uuid);
    expect(onNodeSelect).not.toHaveBeenCalledWith(null);
  });

  it('captures viewport state from controls camera and controlled props', () => {
    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);

    const ref = createRef<IThreejsCanvasHandle>();
    const initialViewportState: IViewportState = {
      schemaVersion: 1,
      visualMode: 'wire',
      cameraMode: 'ortho',
      cameraFov: 30,
      orthoView: 'top',
      gridStyle: 'lines',
      sunAzimuth: 120,
      sunElevation: 35,
      shadowsEnabled: true,
      camera: {
        position: [999, 888, 777],
        target: [6, 5, 4],
        zoom: 2,
      },
    };

    render(
      <ThreeJsRender
        ref={ref}
        modelUrl="/building-a.glb"
        visualMode="original"
        cameraMode="persp"
        cameraFov={90}
        orthoView="front"
        gridStyle="none"
        sunAzimuth={45}
        sunElevation={47}
        shadowsEnabled={false}
        initialViewportState={initialViewportState}
      />,
    );

    emitObservedSize(1280, 720);

    act(() => {
      mockCamera.position.set(10, 20, 30);
      mockCamera.zoom = 3;
      mockControlsApi.target.set(1, 2, 3);
    });

    const captured = ref.current?.captureViewportState();

    expect(captured).toEqual({
      schemaVersion: 1,
      visualMode: 'original',
      cameraMode: 'persp',
      cameraFov: 90,
      orthoView: 'front',
      gridStyle: 'none',
      sunAzimuth: 45,
      sunElevation: 47,
      shadowsEnabled: false,
      camera: {
        position: [10, 20, 30],
        target: [1, 2, 3],
        zoom: 3,
      },
    });
  });

  it('captures defaults for optional sun props when not provided', () => {
    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);

    const ref = createRef<IThreejsCanvasHandle>();

    render(<ThreeJsRender ref={ref} modelUrl="/building-a.glb" />);
    emitObservedSize(1280, 720);

    const captured = ref.current?.captureViewportState();

    expect(captured?.sunAzimuth).toBe(45);
    expect(captured?.sunElevation).toBe(47);
  });

  it('returns null from capture when controls ref is unavailable', () => {
    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);
    attachOrbitControlsRefState.current = false;

    const ref = createRef<IThreejsCanvasHandle>();

    render(<ThreeJsRender ref={ref} modelUrl="/building-a.glb" />);
    emitObservedSize(1280, 720);

    expect(ref.current?.captureViewportState()).toBeNull();
  });

  it('returns null from capture when controls object is not camera-like', () => {
    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);
    mockControlsApi.object = { something: true };

    const ref = createRef<IThreejsCanvasHandle>();

    render(<ThreeJsRender ref={ref} modelUrl="/building-a.glb" />);
    emitObservedSize(1280, 720);

    expect(ref.current?.captureViewportState()).toBeNull();
  });

  it('keeps controlled viewport props live while initialViewportState remains provided', () => {
    const model = createMockScene();
    gltfLoaderMock.mockReturnValue(model);

    const initialViewportState: IViewportState = {
      schemaVersion: 1,
      visualMode: 'wire',
      cameraMode: 'ortho',
      cameraFov: 33,
      orthoView: 'left',
      gridStyle: 'dots',
      sunAzimuth: 200,
      sunElevation: 60,
      shadowsEnabled: true,
      camera: {
        position: [1, 2, 3],
        target: [4, 5, 6],
        zoom: 7,
      },
    };

    const { rerender } = render(
      <ThreeJsRender
        modelUrl="/building-a.glb"
        visualMode="wire"
        cameraMode="persp"
        cameraFov={33}
        orthoView="front"
        gridStyle="dots"
        sunAzimuth={10}
        sunElevation={20}
        shadowsEnabled
        initialViewportState={initialViewportState}
      />,
    );
    emitObservedSize(1280, 720);

    expect(useVisualModeMock).toHaveBeenCalledWith({ scene: model.scene, visualMode: 'wire' });
    expect(useModelGridMock).toHaveBeenCalledWith({ scene: model.scene, gridStyle: 'dots' });
    expect(useShadowCatcherMock).toHaveBeenLastCalledWith(expect.objectContaining({ shadowsEnabled: true }));

    rerender(
      <ThreeJsRender
        modelUrl="/building-a.glb"
        visualMode="ghost"
        cameraMode="persp"
        cameraFov={80}
        orthoView="front"
        gridStyle="lines"
        sunAzimuth={10}
        sunElevation={20}
        shadowsEnabled={false}
        initialViewportState={initialViewportState}
      />,
    );

    expect(useVisualModeMock).toHaveBeenLastCalledWith({ scene: model.scene, visualMode: 'ghost' });
    expect(useModelGridMock).toHaveBeenLastCalledWith({ scene: model.scene, gridStyle: 'lines' });
    expect(useShadowCatcherMock).toHaveBeenLastCalledWith(expect.objectContaining({ shadowsEnabled: false }));
    expect(perspectiveCameraMock).toHaveBeenLastCalledWith(expect.objectContaining({ fov: 80 }));
    expect(orthographicCameraMock).not.toHaveBeenCalled();
  });
});
