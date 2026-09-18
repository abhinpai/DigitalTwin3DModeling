import { render } from '@testing-library/react';
import { createRef, type RefObject } from 'react';
import { Scene, Vector3 } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCameraFit, type IOrbitControlsApi } from './useCameraFit';

const { computeCameraFitMock, computeOrthographicCameraFitMock } = vi.hoisted(() => ({
  computeCameraFitMock: vi.fn(),
  computeOrthographicCameraFitMock: vi.fn(),
}));

vi.mock('../utils/computeCameraFit', () => ({
  computeCameraFit: (...args: unknown[]) => computeCameraFitMock(...args),
  computeOrthographicCameraFit: (...args: unknown[]) => computeOrthographicCameraFitMock(...args),
}));

interface IHookHarnessProps {
  camera: unknown;
  scene: Scene;
  modelUrl?: string;
  cameraMode?: 'persp' | 'ortho';
  cameraFov?: number;
  orthoView?: 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';
  viewportSize?: { width: number; height: number };
  initialCameraState?: {
    position: [number, number, number];
    target: [number, number, number];
    zoom: number;
  };
  orbitControlsRef: RefObject<IOrbitControlsApi | null>;
}

function HookHarness({
  camera,
  scene,
  modelUrl = '/model.glb',
  cameraMode = 'persp',
  cameraFov,
  orthoView = 'front',
  viewportSize = { width: 1280, height: 720 },
  initialCameraState,
  orbitControlsRef,
}: IHookHarnessProps) {
  void cameraFov;

  useCameraFit({
    camera,
    viewportSize,
    scene,
    modelUrl,
    cameraMode,
    orthoView,
    initialCameraState,
    orbitControlsRef,
  });

  return null;
}

function createOrbitControlsRefWithCopy() {
  const orbitControlsRef = createRef<IOrbitControlsApi>();
  orbitControlsRef.current = {
    target: { copy: vi.fn() } as unknown as Vector3,
    update: vi.fn(),
    object: {},
  };

  return orbitControlsRef;
}

function createOrbitControlsRefWithStartEvents() {
  const orbitControlsRef = createRef<IOrbitControlsApi>();
  const startListeners = new Set<() => void>();
  const targetSet = vi.fn();

  orbitControlsRef.current = {
    target: { set: targetSet, copy: vi.fn() } as unknown as Vector3,
    update: vi.fn(),
    object: {},
    addEventListener: vi.fn((_type: 'start', listener: () => void) => {
      startListeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: 'start', listener: () => void) => {
      startListeners.delete(listener);
    }),
  };

  const dispatchStart = () => {
    startListeners.forEach((listener) => {
      listener();
    });
  };

  return { orbitControlsRef, dispatchStart, targetSet };
}

describe('useCameraFit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies computed fit to camera and controls', () => {
    const scene = new Scene();
    const updateMatrixWorldSpy = vi.spyOn(scene, 'updateMatrixWorld');
    const camera = {
      isPerspectiveCamera: true,
      fov: 50,
      near: 0.1,
      far: 1000,
      position: { set: vi.fn() },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
      zoom: 1,
    };
    const orbitControlsRef = createOrbitControlsRefWithCopy();

    const target = new Vector3(1, 2, 3);

    computeCameraFitMock.mockReturnValue({
      position: new Vector3(10, 20, 30),
      target,
      near: 0.25,
      far: 4000,
    });

    render(<HookHarness camera={camera} scene={scene} orbitControlsRef={orbitControlsRef} />);

    expect(updateMatrixWorldSpy).toHaveBeenCalledWith(true);
    expect(computeCameraFitMock).toHaveBeenCalledWith(expect.anything(), 50);
    expect(computeOrthographicCameraFitMock).not.toHaveBeenCalled();
    expect(camera.position.set).toHaveBeenCalledWith(10, 20, 30);
    expect(camera.up.copy).not.toHaveBeenCalled();
    expect(camera.lookAt).toHaveBeenCalledWith(target);
    expect(camera.fov).toBe(50);
    expect(camera.near).toBe(0.25);
    expect(camera.far).toBe(4000);
    expect(camera.updateProjectionMatrix).toHaveBeenCalledTimes(1);
    expect(orbitControlsRef.current?.target.copy).toHaveBeenCalledTimes(1);
    expect(orbitControlsRef.current?.update).toHaveBeenCalledTimes(1);
  });

  it('applies orthographic fit when active camera is orthographic', () => {
    const scene = new Scene();
    const updateMatrixWorldSpy = vi.spyOn(scene, 'updateMatrixWorld');
    const camera = {
      isOrthographicCamera: true,
      near: 0.1,
      far: 1000,
      zoom: 1,
      position: { set: vi.fn() },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };
    const orbitControlsRef = createOrbitControlsRefWithCopy();

    const target = new Vector3(4, 5, 6);
    computeOrthographicCameraFitMock.mockReturnValue({
      position: new Vector3(30, 40, 50),
      target,
      near: 1,
      far: 5000,
      zoom: 8,
      up: new Vector3(0, 1, 0),
    });

    render(<HookHarness camera={camera} scene={scene} cameraMode="ortho" orthoView="back" viewportSize={{ width: 1920, height: 1080 }} orbitControlsRef={orbitControlsRef} />);

    expect(updateMatrixWorldSpy).toHaveBeenCalledWith(true);
    expect(computeCameraFitMock).not.toHaveBeenCalled();
    expect(computeOrthographicCameraFitMock).toHaveBeenCalledWith(expect.anything(), 1920, 1080, 'back');
    expect(camera.position.set).toHaveBeenCalledWith(30, 40, 50);
    expect(camera.up.copy).toHaveBeenCalledWith(new Vector3(0, 1, 0));
    expect(camera.lookAt).toHaveBeenCalledWith(target);
    expect(camera.near).toBe(1);
    expect(camera.far).toBe(5000);
    expect(camera.zoom).toBe(8);
    expect(camera.updateProjectionMatrix).toHaveBeenCalledTimes(1);
    expect(orbitControlsRef.current?.target.copy).toHaveBeenCalledTimes(1);
    expect(orbitControlsRef.current?.update).toHaveBeenCalledTimes(1);
  });

  it('returns early when camera is neither perspective nor orthographic', () => {
    const scene = new Scene();
    const updateMatrixWorldSpy = vi.spyOn(scene, 'updateMatrixWorld');
    const orbitControlsRef = createOrbitControlsRefWithCopy();

    render(<HookHarness camera={{}} scene={scene} orbitControlsRef={orbitControlsRef} />);

    expect(updateMatrixWorldSpy).not.toHaveBeenCalled();
    expect(computeCameraFitMock).not.toHaveBeenCalled();
    expect(computeOrthographicCameraFitMock).not.toHaveBeenCalled();
    expect(orbitControlsRef.current?.target.copy).not.toHaveBeenCalled();
    expect(orbitControlsRef.current?.update).not.toHaveBeenCalled();
  });

  it('refits when cameraMode changes and camera instance changes', () => {
    const scene = new Scene();
    const orbitControlsRef = createOrbitControlsRefWithCopy();

    const perspectiveCamera = {
      isPerspectiveCamera: true,
      fov: 50,
      near: 0.1,
      far: 1000,
      position: { set: vi.fn() },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
      zoom: 1,
    };
    const orthographicCamera = {
      isOrthographicCamera: true,
      near: 0.1,
      far: 1000,
      zoom: 1,
      position: { set: vi.fn() },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };

    computeCameraFitMock.mockReturnValue({
      position: new Vector3(10, 20, 30),
      target: new Vector3(1, 2, 3),
      near: 0.25,
      far: 4000,
    });
    computeOrthographicCameraFitMock.mockReturnValue({
      position: new Vector3(30, 40, 50),
      target: new Vector3(4, 5, 6),
      near: 1,
      far: 5000,
      zoom: 8,
      up: new Vector3(0, 1, 0),
    });

    const { rerender } = render(
      <HookHarness camera={perspectiveCamera} scene={scene} cameraMode="persp" orbitControlsRef={orbitControlsRef} />,
    );

    expect(computeCameraFitMock).toHaveBeenCalledTimes(1);
    expect(computeOrthographicCameraFitMock).toHaveBeenCalledTimes(0);

    rerender(
      <HookHarness camera={orthographicCamera} scene={scene} cameraMode="ortho" orbitControlsRef={orbitControlsRef} />,
    );

    expect(computeCameraFitMock).toHaveBeenCalledTimes(1);
    expect(computeOrthographicCameraFitMock).toHaveBeenCalledTimes(1);
  });

  it('refits orthographic camera when orthoView changes', () => {
    const scene = new Scene();
    const camera = {
      isOrthographicCamera: true,
      near: 0.1,
      far: 1000,
      zoom: 1,
      position: { set: vi.fn() },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };
    const orbitControlsRef = createOrbitControlsRefWithCopy();

    computeOrthographicCameraFitMock.mockReturnValue({
      position: new Vector3(1, 2, 3),
      target: new Vector3(0, 0, 0),
      near: 0.5,
      far: 2000,
      zoom: 10,
      up: new Vector3(0, 0, -1),
    });

    const { rerender } = render(
      <HookHarness camera={camera} scene={scene} cameraMode="ortho" orthoView="front" orbitControlsRef={orbitControlsRef} />,
    );

    rerender(
      <HookHarness camera={camera} scene={scene} cameraMode="ortho" orthoView="top" orbitControlsRef={orbitControlsRef} />,
    );

    expect(computeOrthographicCameraFitMock).toHaveBeenNthCalledWith(1, expect.anything(), 1280, 720, 'front');
    expect(computeOrthographicCameraFitMock).toHaveBeenNthCalledWith(2, expect.anything(), 1280, 720, 'top');
  });

  it('ignores orthoView changes while in perspective mode', () => {
    const scene = new Scene();
    const camera = {
      isPerspectiveCamera: true,
      fov: 50,
      near: 0.1,
      far: 1000,
      position: { set: vi.fn() },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
      zoom: 1,
    };
    const orbitControlsRef = createOrbitControlsRefWithCopy();

    computeCameraFitMock.mockReturnValue({
      position: new Vector3(10, 20, 30),
      target: new Vector3(0, 0, 0),
      near: 0.25,
      far: 4000,
    });

    const { rerender } = render(
      <HookHarness camera={camera} scene={scene} cameraMode="persp" orthoView="front" orbitControlsRef={orbitControlsRef} />,
    );

    rerender(
      <HookHarness camera={camera} scene={scene} cameraMode="persp" orthoView="top" orbitControlsRef={orbitControlsRef} />,
    );

    expect(computeCameraFitMock).toHaveBeenCalledTimes(1);
    expect(computeOrthographicCameraFitMock).not.toHaveBeenCalled();
  });

  it('does not refit perspective camera when cameraFov changes in persp mode', () => {
    const scene = new Scene();
    const camera = {
      isPerspectiveCamera: true,
      fov: 50,
      near: 0.1,
      far: 1000,
      position: { set: vi.fn() },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
      zoom: 1,
    };
    const orbitControlsRef = createOrbitControlsRefWithCopy();

    computeCameraFitMock.mockReturnValue({
      position: new Vector3(10, 20, 30),
      target: new Vector3(0, 0, 0),
      near: 0.25,
      far: 4000,
    });

    const { rerender } = render(
      <HookHarness camera={camera} scene={scene} cameraMode="persp" cameraFov={50} orbitControlsRef={orbitControlsRef} />,
    );

    rerender(
      <HookHarness camera={camera} scene={scene} cameraMode="persp" cameraFov={75} orbitControlsRef={orbitControlsRef} />,
    );

    expect(computeCameraFitMock).toHaveBeenCalledTimes(1);
    expect(computeCameraFitMock).toHaveBeenCalledWith(expect.anything(), 50);
    expect(computeOrthographicCameraFitMock).not.toHaveBeenCalled();
    expect(camera.position.set).toHaveBeenCalledTimes(1);
    expect(camera.lookAt).toHaveBeenCalledTimes(1);
    expect(camera.updateProjectionMatrix).toHaveBeenCalledTimes(1);
    expect(orbitControlsRef.current?.target.copy).toHaveBeenCalledTimes(1);
    expect(orbitControlsRef.current?.update).toHaveBeenCalledTimes(1);
  });

  it('does not refit when viewport size changes only', () => {
    const scene = new Scene();
    const camera = {
      isPerspectiveCamera: true,
      fov: 50,
      near: 0.1,
      far: 1000,
      position: { set: vi.fn() },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
      zoom: 1,
    };
    const orbitControlsRef = createOrbitControlsRefWithCopy();

    computeCameraFitMock.mockReturnValue({
      position: new Vector3(10, 20, 30),
      target: new Vector3(0, 0, 0),
      near: 0.25,
      far: 4000,
    });

    const { rerender } = render(
      <HookHarness camera={camera} scene={scene} cameraMode="persp" viewportSize={{ width: 1280, height: 720 }} orbitControlsRef={orbitControlsRef} />,
    );

    rerender(
      <HookHarness camera={camera} scene={scene} cameraMode="persp" viewportSize={{ width: 800, height: 600 }} orbitControlsRef={orbitControlsRef} />,
    );

    expect(computeCameraFitMock).toHaveBeenCalledTimes(1);
    expect(computeOrthographicCameraFitMock).not.toHaveBeenCalled();
    expect(camera.position.set).toHaveBeenCalledTimes(1);
    expect(camera.lookAt).toHaveBeenCalledTimes(1);
    expect(orbitControlsRef.current?.target.copy).toHaveBeenCalledTimes(1);
    expect(orbitControlsRef.current?.update).toHaveBeenCalledTimes(1);
  });

  it('ignores cameraFov changes while in ortho mode', () => {
    const scene = new Scene();
    const camera = {
      isOrthographicCamera: true,
      near: 0.1,
      far: 1000,
      zoom: 1,
      position: { set: vi.fn() },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };
    const orbitControlsRef = createOrbitControlsRefWithCopy();

    computeOrthographicCameraFitMock.mockReturnValue({
      position: new Vector3(30, 40, 50),
      target: new Vector3(4, 5, 6),
      near: 1,
      far: 5000,
      zoom: 8,
      up: new Vector3(0, 1, 0),
    });

    const { rerender } = render(
      <HookHarness camera={camera} scene={scene} cameraMode="ortho" cameraFov={50} orbitControlsRef={orbitControlsRef} />,
    );

    rerender(
      <HookHarness camera={camera} scene={scene} cameraMode="ortho" cameraFov={90} orbitControlsRef={orbitControlsRef} />,
    );

    expect(computeOrthographicCameraFitMock).toHaveBeenCalledTimes(1);
    expect(computeCameraFitMock).not.toHaveBeenCalled();
    expect(camera.position.set).toHaveBeenCalledTimes(1);
  });

  it('uses non-degenerate up vectors for top and bottom ortho views', () => {
    const scene = new Scene();
    const camera = {
      isOrthographicCamera: true,
      near: 0.1,
      far: 1000,
      zoom: 1,
      position: { set: vi.fn() },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };
    const orbitControlsRef = createOrbitControlsRefWithCopy();

    computeOrthographicCameraFitMock
      .mockReturnValueOnce({
        position: new Vector3(0, 10, 0),
        target: new Vector3(0, 0, 0),
        near: 0.5,
        far: 2000,
        zoom: 10,
        up: new Vector3(0, 0, -1),
      })
      .mockReturnValueOnce({
        position: new Vector3(0, -10, 0),
        target: new Vector3(0, 0, 0),
        near: 0.5,
        far: 2000,
        zoom: 10,
        up: new Vector3(0, 0, 1),
      });

    const { rerender } = render(
      <HookHarness camera={camera} scene={scene} cameraMode="ortho" orthoView="top" orbitControlsRef={orbitControlsRef} />,
    );

    rerender(
      <HookHarness camera={camera} scene={scene} cameraMode="ortho" orthoView="bottom" orbitControlsRef={orbitControlsRef} />,
    );

    expect(camera.up.copy).toHaveBeenNthCalledWith(1, new Vector3(0, 0, -1));
    expect(camera.up.copy).toHaveBeenNthCalledWith(2, new Vector3(0, 0, 1));
  });

  it('applies initial camera state directly and skips camera fit math', () => {
    const scene = new Scene();
    const updateMatrixWorldSpy = vi.spyOn(scene, 'updateMatrixWorld');
    const camera = {
      isPerspectiveCamera: true,
      fov: 50,
      near: 0.1,
      far: 1000,
      zoom: 1,
      position: { set: vi.fn() },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };
    const targetSet = vi.fn();
    const orbitControlsRef = createRef<IOrbitControlsApi>();
    orbitControlsRef.current = {
      target: { set: targetSet } as unknown as Vector3,
      update: vi.fn(),
      object: {},
    };

    render(
      <HookHarness
        camera={camera}
        scene={scene}
        orbitControlsRef={orbitControlsRef}
        initialCameraState={{
          position: [9, 8, 7],
          target: [6, 5, 4],
          zoom: 3,
        }}
      />,
    );

    expect(updateMatrixWorldSpy).not.toHaveBeenCalled();
    expect(computeCameraFitMock).not.toHaveBeenCalled();
    expect(computeOrthographicCameraFitMock).not.toHaveBeenCalled();
    expect(camera.position.set).toHaveBeenCalledWith(9, 8, 7);
    expect(camera.zoom).toBe(3);
    expect(camera.lookAt).toHaveBeenCalledWith(6, 5, 4);
    expect(camera.updateProjectionMatrix).toHaveBeenCalledTimes(1);
    expect(targetSet).toHaveBeenCalledWith(6, 5, 4);
    expect(orbitControlsRef.current?.update).toHaveBeenCalledTimes(1);
  });

  it('keeps normal auto-fit behavior when initial camera state is absent', () => {
    const scene = new Scene();
    const camera = {
      isPerspectiveCamera: true,
      fov: 50,
      near: 0.1,
      far: 1000,
      zoom: 1,
      position: { set: vi.fn() },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };
    const orbitControlsRef = createOrbitControlsRefWithCopy();
    const target = new Vector3(1, 2, 3);

    computeCameraFitMock.mockReturnValue({
      position: new Vector3(10, 20, 30),
      target,
      near: 0.25,
      far: 4000,
    });

    render(<HookHarness camera={camera} scene={scene} orbitControlsRef={orbitControlsRef} />);

    expect(computeCameraFitMock).toHaveBeenCalledTimes(1);
    expect(computeOrthographicCameraFitMock).not.toHaveBeenCalled();
    expect(camera.position.set).toHaveBeenCalledWith(10, 20, 30);
    expect(camera.lookAt).toHaveBeenCalledWith(target);
  });

  it('applies late-arriving initial camera state when user has not interacted', () => {
    const scene = new Scene();
    const camera = {
      isPerspectiveCamera: true,
      fov: 50,
      near: 0.1,
      far: 1000,
      zoom: 1,
      position: { set: vi.fn() },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };
    const { orbitControlsRef, targetSet } = createOrbitControlsRefWithStartEvents();
    const target = new Vector3(1, 2, 3);

    computeCameraFitMock.mockReturnValue({
      position: new Vector3(10, 20, 30),
      target,
      near: 0.25,
      far: 4000,
    });

    const { rerender } = render(
      <HookHarness camera={camera} scene={scene} orbitControlsRef={orbitControlsRef} initialCameraState={undefined} />,
    );

    expect(computeCameraFitMock).toHaveBeenCalledTimes(1);
    expect(camera.position.set).toHaveBeenNthCalledWith(1, 10, 20, 30);

    rerender(
      <HookHarness
        camera={camera}
        scene={scene}
        orbitControlsRef={orbitControlsRef}
        initialCameraState={{
          position: [9, 8, 7],
          target: [6, 5, 4],
          zoom: 3,
        }}
      />,
    );

    expect(camera.position.set).toHaveBeenNthCalledWith(2, 9, 8, 7);
    expect(camera.lookAt).toHaveBeenLastCalledWith(6, 5, 4);
    expect(camera.zoom).toBe(3);
    expect(computeCameraFitMock).toHaveBeenCalledTimes(1);
    expect(targetSet).toHaveBeenLastCalledWith(6, 5, 4);
  });

  it('does not apply late-arriving initial camera state after orbit interaction start event', () => {
    const scene = new Scene();
    const camera = {
      isPerspectiveCamera: true,
      fov: 50,
      near: 0.1,
      far: 1000,
      zoom: 1,
      position: { set: vi.fn() },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };
    const { orbitControlsRef, dispatchStart, targetSet } = createOrbitControlsRefWithStartEvents();
    const target = new Vector3(1, 2, 3);

    computeCameraFitMock.mockReturnValue({
      position: new Vector3(10, 20, 30),
      target,
      near: 0.25,
      far: 4000,
    });

    const { rerender } = render(
      <HookHarness camera={camera} scene={scene} orbitControlsRef={orbitControlsRef} initialCameraState={undefined} />,
    );

    dispatchStart();

    rerender(
      <HookHarness
        camera={camera}
        scene={scene}
        orbitControlsRef={orbitControlsRef}
        initialCameraState={{
          position: [9, 8, 7],
          target: [6, 5, 4],
          zoom: 3,
        }}
      />,
    );

    expect(camera.position.set).toHaveBeenCalledTimes(1);
    expect(camera.position.set).toHaveBeenCalledWith(10, 20, 30);
    expect(camera.lookAt).toHaveBeenCalledTimes(1);
    expect(camera.lookAt).toHaveBeenCalledWith(target);
    expect(computeCameraFitMock).toHaveBeenCalledTimes(1);
    expect(targetSet).not.toHaveBeenCalled();
  });

  it('resets interaction tracking on model change so new model restore can apply', () => {
    const scene = new Scene();
    const camera = {
      isPerspectiveCamera: true,
      fov: 50,
      near: 0.1,
      far: 1000,
      zoom: 1,
      position: { set: vi.fn() },
      up: { copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };
    const { orbitControlsRef, dispatchStart } = createOrbitControlsRefWithStartEvents();
    const target = new Vector3(1, 2, 3);

    computeCameraFitMock.mockReturnValue({
      position: new Vector3(10, 20, 30),
      target,
      near: 0.25,
      far: 4000,
    });

    const { rerender } = render(
      <HookHarness camera={camera} scene={scene} modelUrl="/a.glb" orbitControlsRef={orbitControlsRef} initialCameraState={undefined} />,
    );

    dispatchStart();

    rerender(
      <HookHarness
        camera={camera}
        scene={scene}
        modelUrl="/a.glb"
        orbitControlsRef={orbitControlsRef}
        initialCameraState={{
          position: [9, 8, 7],
          target: [6, 5, 4],
          zoom: 3,
        }}
      />,
    );

    expect(camera.position.set).toHaveBeenCalledTimes(1);

    rerender(
      <HookHarness
        camera={camera}
        scene={scene}
        modelUrl="/b.glb"
        orbitControlsRef={orbitControlsRef}
        initialCameraState={{
          position: [3, 2, 1],
          target: [4, 5, 6],
          zoom: 2,
        }}
      />,
    );

    expect(camera.position.set).toHaveBeenCalledTimes(2);
    expect(camera.position.set).toHaveBeenLastCalledWith(3, 2, 1);
    expect(camera.lookAt).toHaveBeenLastCalledWith(4, 5, 6);
    expect(camera.zoom).toBe(2);
    expect(computeCameraFitMock).toHaveBeenCalledTimes(1);
  });
});
