import { useLayoutEffect, useRef, type RefObject } from 'react';
import { Box3, Vector3 } from 'three';
import type { Object3D, OrthographicCamera, PerspectiveCamera } from 'three';
import type { CameraMode } from '../types/cameraMode';
import type { OrthoView } from '../types/orthoView';
import type { IViewportState } from '../types/viewportState';
import { computeCameraFit, computeOrthographicCameraFit } from '../utils/computeCameraFit';

export interface IOrbitControlsApi {
  target: Vector3;
  update: () => void;
  object: unknown;
  addEventListener?: (type: 'start', listener: () => void) => void;
  removeEventListener?: (type: 'start', listener: () => void) => void;
}

export interface IUseCameraFitParams {
  camera: unknown;
  viewportSize: { width: number; height: number };
  scene: Object3D;
  modelUrl: string;
  cameraMode: CameraMode;
  orthoView: OrthoView;
  initialCameraState?: IViewportState['camera'];
  orbitControlsRef: RefObject<IOrbitControlsApi | null>;
}

export function useCameraFit({ camera, viewportSize, scene, modelUrl, cameraMode, orthoView, initialCameraState, orbitControlsRef }: IUseCameraFitParams) {
  const effectiveOrthoView = cameraMode === 'ortho' ? orthoView : 'front';
  const viewportSizeRef = useRef(viewportSize);
  const hasUserInteractedSinceModelLoadRef = useRef(false);
  const lastAppliedInitialCameraStateRef = useRef<IViewportState['camera']>();

  useLayoutEffect(() => {
    viewportSizeRef.current = viewportSize;
  }, [viewportSize]);

  useLayoutEffect(() => {
    hasUserInteractedSinceModelLoadRef.current = false;
    lastAppliedInitialCameraStateRef.current = undefined;
  }, [modelUrl]);

  useLayoutEffect(() => {
    const controls = orbitControlsRef.current;

    if (!controls || typeof controls.addEventListener !== 'function' || typeof controls.removeEventListener !== 'function') {
      return;
    }

    const handleControlsStart = () => {
      hasUserInteractedSinceModelLoadRef.current = true;
    };

    controls.addEventListener('start', handleControlsStart);

    return () => {
      controls.removeEventListener?.('start', handleControlsStart);
    };
  });

  useLayoutEffect(() => {
    if (!camera || typeof camera !== 'object') {
      return;
    }

    const isPerspective = 'isPerspectiveCamera' in camera && Boolean(camera.isPerspectiveCamera) && 'fov' in camera;
    const isOrthographic = 'isOrthographicCamera' in camera && Boolean(camera.isOrthographicCamera);

    if (!isPerspective && !isOrthographic) {
      return;
    }

    const restoredCameraState = initialCameraState;

    if (restoredCameraState) {
      const hasPendingRestore = restoredCameraState !== lastAppliedInitialCameraStateRef.current;

      if (!hasPendingRestore) {
        return;
      }

      const controlledCamera = camera as PerspectiveCamera | OrthographicCamera;

      controlledCamera.position.set(
        restoredCameraState.position[0],
        restoredCameraState.position[1],
        restoredCameraState.position[2],
      );
      controlledCamera.zoom = restoredCameraState.zoom;
      controlledCamera.lookAt(
        restoredCameraState.target[0],
        restoredCameraState.target[1],
        restoredCameraState.target[2],
      );
      controlledCamera.updateProjectionMatrix();

      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.set(
          restoredCameraState.target[0],
          restoredCameraState.target[1],
          restoredCameraState.target[2],
        );
        orbitControlsRef.current.update();
      }

      lastAppliedInitialCameraStateRef.current = restoredCameraState;
      hasUserInteractedSinceModelLoadRef.current = false;

      return;
    }

    const box = new Box3();
    scene.updateMatrixWorld(true);
    box.setFromObject(scene);

    if (isPerspective) {
      const perspectiveCamera = camera as PerspectiveCamera;
      const { position, target, near, far } = computeCameraFit(box, perspectiveCamera.fov);

      perspectiveCamera.position.set(position.x, position.y, position.z);
      perspectiveCamera.lookAt(target);
      perspectiveCamera.near = near;
      perspectiveCamera.far = far;
      perspectiveCamera.updateProjectionMatrix();

      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(target);
        orbitControlsRef.current.update();
      }

      return;
    }

    if (isOrthographic) {
      const orthographicCamera = camera as OrthographicCamera;
      const { width, height } = viewportSizeRef.current;
      const { position, target, near, far, zoom, up } = computeOrthographicCameraFit(box, width, height, effectiveOrthoView);

      orthographicCamera.position.set(position.x, position.y, position.z);
      orthographicCamera.up.copy(up);
      orthographicCamera.lookAt(target);
      orthographicCamera.near = near;
      orthographicCamera.far = far;
      orthographicCamera.zoom = zoom;
      orthographicCamera.updateProjectionMatrix();

      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(target);
        orbitControlsRef.current.update();
      }
    }
  }, [camera, scene, modelUrl, cameraMode, effectiveOrthoView, initialCameraState, orbitControlsRef]);
}
