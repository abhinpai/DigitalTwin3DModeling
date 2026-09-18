import { Grid, OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Suspense, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, type ForwardedRef, type MutableRefObject, type RefObject } from 'react';
import { Object3D } from 'three';
import { useCameraFit, type IOrbitControlsApi } from '../../hooks/useCameraFit';
import { useContainerResize } from '../../hooks/useContainerResize';
import { useNodeHighlight } from '../../hooks/useNodeHighlight';
import { useNodeVisibility } from '../../hooks/useNodeVisibility';
import { useModelGrid } from '../../hooks/useModelGrid';
import { useModelLoader } from '../../hooks/useModelLoader';
import { useShadowCatcher } from '../../hooks/useShadowCatcher';
import { useStageTree } from '../../hooks/useStageTree';
import { useSunLighting } from '../../hooks/useSunLighting';
import { useVisualMode } from '../../hooks/useVisualMode';
import type { CameraMode } from '../../types/cameraMode';
import type { GridStyle } from '../../types/gridStyle';
import type { OrthoView } from '../../types/orthoView';
import type { IStageTreeNode } from '../../types/stageTreeNode';
import type { IViewportState } from '../../types/viewportState';
import type { VisualMode } from '../../types/visualMode';
import type { IThreejsCanvasHandle } from '../ThreejsCanvas/ThreejsCanvas';

const INITIAL_CAMERA_POSITION: [number, number, number] = [0, 0, 1];
// Native click fires on the same canvas element even after pointer movement during orbit drags.
// Treat only tiny pointer movement as intentional click-selection.
const POINTER_CLICK_MAX_MOVEMENT_PX = 5;

interface IPointerPosition {
  x: number;
  y: number;
}

interface IPointerSelectionGestureState {
  pointerDown: IPointerPosition | null;
  selectionHandledByModelPointerUp: boolean;
  clearedByCanvasPointerUp: boolean;
  lastGestureWasClickLike: boolean;
}

function getPointerPositionFromNativeEvent(nativeEvent: unknown): IPointerPosition | null {
  if (!nativeEvent || typeof nativeEvent !== 'object') {
    return null;
  }

  const maybeEvent = nativeEvent as { clientX?: unknown; clientY?: unknown };

  if (typeof maybeEvent.clientX !== 'number' || typeof maybeEvent.clientY !== 'number') {
    return null;
  }

  return {
    x: maybeEvent.clientX,
    y: maybeEvent.clientY,
  };
}

function isClickLikePointerGesture(
  pointerDown: IPointerPosition | null,
  pointerUp: IPointerPosition | null,
) {
  if (!pointerDown || !pointerUp) {
    return false;
  }

  const deltaX = pointerUp.x - pointerDown.x;
  const deltaY = pointerUp.y - pointerDown.y;

  return Math.hypot(deltaX, deltaY) <= POINTER_CLICK_MAX_MOVEMENT_PX;
}

export interface IThreeJsRenderProps {
  modelUrl: string;
  className?: string;
  visualMode?: VisualMode;
  cameraMode?: CameraMode;
  cameraFov?: number;
  orthoView?: OrthoView;
  gridStyle?: GridStyle;
  sunAzimuth?: number;
  sunElevation?: number;
  shadowsEnabled?: boolean;
  /**
   * Saved viewport state used only for camera pose restore (`camera.position/target/zoom`).
   *
   * For all other fields (`visualMode`, `cameraMode`, `cameraFov`, `orthoView`, `gridStyle`,
   * `sunAzimuth`, `sunElevation`, `shadowsEnabled`), read values from the saved state in
   * consumer code and pass them via this component's normal controlled props.
   */
  initialViewportState?: IViewportState;
  selectedNodeIds?: string[];
  hiddenNodeIds?: string[];
  onStageTreeChange?: (root: IStageTreeNode | null) => void;
  onNodeSelect?: (id: string | null) => void;
}

interface ILoadedModelProps extends Pick<IThreeJsRenderProps, 'modelUrl' | 'visualMode' | 'cameraMode' | 'orthoView' | 'gridStyle' | 'sunAzimuth' | 'sunElevation' | 'shadowsEnabled' | 'selectedNodeIds' | 'hiddenNodeIds' | 'onStageTreeChange' | 'onNodeSelect'> {
  initialCameraState?: IViewportState['camera'];
  orbitControlsRef: RefObject<IOrbitControlsApi | null>;
  pointerSelectionGestureRef: MutableRefObject<IPointerSelectionGestureState>;
}

function LoadedModel({ modelUrl, visualMode = 'original', cameraMode = 'persp', orthoView = 'front', gridStyle = 'none', sunAzimuth, sunElevation, shadowsEnabled = false, selectedNodeIds, hiddenNodeIds, onStageTreeChange, onNodeSelect, initialCameraState, orbitControlsRef, pointerSelectionGestureRef }: ILoadedModelProps) {
  const gltf = useModelLoader(modelUrl);
  const { camera, size, scene: rootScene } = useThree();
  const sunTarget = useMemo(() => new Object3D(), []);
  const effectiveOrthoView = cameraMode === 'ortho' ? orthoView : 'front';
  const stageTree = useStageTree({ scene: gltf.scene });
  const modelGrid = useModelGrid({ scene: gltf.scene, gridStyle });
  const sunLighting = useSunLighting({
    scene: gltf.scene,
    sunAzimuth,
    sunElevation,
    shadowsEnabled,
  });
  const shadowCatcher = useShadowCatcher({
    maxDimension: sunLighting.maxDimension,
    shadowGroundPosition: sunLighting.shadowGroundPosition,
    shadowsEnabled,
  });

  useVisualMode({ scene: gltf.scene, visualMode });
  useNodeVisibility({ scene: gltf.scene, hiddenNodeIds });
  useNodeHighlight({ scene: gltf.scene, selectedNodeIds });

  useCameraFit({
    camera,
    viewportSize: size,
    scene: gltf.scene,
    modelUrl,
    cameraMode,
    orthoView: effectiveOrthoView,
    initialCameraState,
    orbitControlsRef,
  });

  useEffect(() => {
    if (!rootScene || typeof rootScene.add !== 'function' || typeof rootScene.remove !== 'function') {
      return;
    }

    sunTarget.position.set(
      sunLighting.targetPosition[0],
      sunLighting.targetPosition[1],
      sunLighting.targetPosition[2],
    );
    rootScene.add(sunTarget);
    sunTarget.updateMatrixWorld();

    return () => {
      rootScene.remove(sunTarget);
    };
  }, [rootScene, sunLighting.targetPosition, sunTarget]);

  useEffect(() => {
    if (modelGrid?.style !== 'dots') {
      return;
    }

    modelGrid.points.receiveShadow = shadowsEnabled;
  }, [modelGrid, shadowsEnabled]);

  useEffect(() => {
    onStageTreeChange?.(stageTree);
  }, [onStageTreeChange, stageTree]);

  const handleModelPointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    const gestureState = pointerSelectionGestureRef.current;
    const pointerUp = getPointerPositionFromNativeEvent(event.nativeEvent);
    const clickLike = isClickLikePointerGesture(gestureState.pointerDown, pointerUp);

    gestureState.lastGestureWasClickLike = clickLike;

    if (!clickLike) {
      return;
    }

    event.stopPropagation();
    gestureState.selectionHandledByModelPointerUp = true;
    onNodeSelect?.(event.object.uuid);
  }, [onNodeSelect, pointerSelectionGestureRef]);

  return (
    <>
      {/* eslint-disable react/no-unknown-property -- R3F JSX light props are not DOM props. */}
      <directionalLight
        position={sunLighting.sunPosition}
        intensity={1}
        target={sunTarget}
        castShadow={shadowsEnabled}
        shadow-camera-left={sunLighting.shadowCamera.left}
        shadow-camera-right={sunLighting.shadowCamera.right}
        shadow-camera-top={sunLighting.shadowCamera.top}
        shadow-camera-bottom={sunLighting.shadowCamera.bottom}
        shadow-camera-near={sunLighting.shadowCamera.near}
        shadow-camera-far={sunLighting.shadowCamera.far}
      />
      {/* eslint-enable react/no-unknown-property */}

      {modelGrid?.style === 'lines' ? (
        <Grid
          position={modelGrid.config.position}
          args={[modelGrid.config.extent, modelGrid.config.extent]}
          cellSize={modelGrid.config.cellSize}
          sectionSize={modelGrid.sectionSize}
          fadeDistance={modelGrid.fadeDistance}
          infiniteGrid={false}
          receiveShadow={shadowsEnabled}
        />
      ) : null}

      {modelGrid?.style === 'dots' ? (
        // eslint-disable-next-line react/no-unknown-property -- R3F JSX primitive accepts object prop.
        <primitive object={modelGrid.points} position={modelGrid.config.position} />
      ) : null}

      {shadowCatcher ? (
        // eslint-disable-next-line react/no-unknown-property -- R3F JSX primitive accepts object prop.
        <primitive object={shadowCatcher.mesh} position={shadowCatcher.position} />
      ) : null}

      {/* eslint-disable-next-line react/no-unknown-property -- R3F JSX primitive accepts object prop. */}
      <primitive object={gltf.scene} onPointerUp={handleModelPointerUp} />
    </>
  );
}

function ThreeJsRenderComponent({
  modelUrl,
  className,
  visualMode = 'original',
  cameraMode = 'persp',
  cameraFov = 50,
  orthoView = 'front',
  gridStyle = 'none',
  sunAzimuth,
  sunElevation,
  shadowsEnabled = false,
  initialViewportState,
  selectedNodeIds,
  hiddenNodeIds,
  onStageTreeChange,
  onNodeSelect,
}: IThreeJsRenderProps, ref: ForwardedRef<IThreejsCanvasHandle>) {
  const orbitControlsRef = useRef<IOrbitControlsApi | null>(null);
  const pointerSelectionGestureRef = useRef<IPointerSelectionGestureState>({
    pointerDown: null,
    selectionHandledByModelPointerUp: false,
    clearedByCanvasPointerUp: false,
    lastGestureWasClickLike: false,
  });
  const setOrbitControlsRef = useCallback((controls: unknown) => {
    orbitControlsRef.current = controls as IOrbitControlsApi | null;
  }, []);
  const { containerRef, canRenderCanvas } = useContainerResize();

  useImperativeHandle(ref, () => ({
    captureViewportState: () => {
      const controls = orbitControlsRef.current;

      if (!controls) {
        return null;
      }

      const cameraObject = controls.object;

      if (!cameraObject || typeof cameraObject !== 'object') {
        return null;
      }

      const isPerspective = 'isPerspectiveCamera' in cameraObject && Boolean(cameraObject.isPerspectiveCamera) && 'position' in cameraObject && 'zoom' in cameraObject;
      const isOrthographic = 'isOrthographicCamera' in cameraObject && Boolean(cameraObject.isOrthographicCamera) && 'position' in cameraObject && 'zoom' in cameraObject;

      if (!isPerspective && !isOrthographic) {
        return null;
      }

      const controlledCamera = cameraObject as { position: { x: number; y: number; z: number }; zoom: number };

      return {
        schemaVersion: 1,
        visualMode,
        cameraMode,
        cameraFov,
        orthoView,
        gridStyle,
        sunAzimuth: sunAzimuth ?? 45,
        sunElevation: sunElevation ?? 47,
        shadowsEnabled,
        camera: {
          position: [controlledCamera.position.x, controlledCamera.position.y, controlledCamera.position.z],
          target: [controls.target.x, controls.target.y, controls.target.z],
          zoom: controlledCamera.zoom,
        },
      } satisfies IViewportState;
    },
  }), [cameraFov, cameraMode, gridStyle, orthoView, shadowsEnabled, sunAzimuth, sunElevation, visualMode]);

  const handleCanvasPointerDown = useCallback((event: { nativeEvent?: unknown; clientX?: number; clientY?: number }) => {
    const nativePosition = getPointerPositionFromNativeEvent(event.nativeEvent);

    pointerSelectionGestureRef.current.pointerDown = nativePosition ?? (
      typeof event.clientX === 'number' && typeof event.clientY === 'number'
        ? { x: event.clientX, y: event.clientY }
        : null
    );
    pointerSelectionGestureRef.current.selectionHandledByModelPointerUp = false;
    pointerSelectionGestureRef.current.clearedByCanvasPointerUp = false;
    pointerSelectionGestureRef.current.lastGestureWasClickLike = false;
  }, []);

  const handleCanvasPointerUp = useCallback((event: { nativeEvent?: unknown; clientX?: number; clientY?: number }) => {
    const gestureState = pointerSelectionGestureRef.current;
    const nativePosition = getPointerPositionFromNativeEvent(event.nativeEvent);
    const pointerUp = nativePosition ?? (
      typeof event.clientX === 'number' && typeof event.clientY === 'number'
        ? { x: event.clientX, y: event.clientY }
        : null
    );
    const clickLike = isClickLikePointerGesture(gestureState.pointerDown, pointerUp);

    gestureState.lastGestureWasClickLike = clickLike;

    if (!clickLike || gestureState.selectionHandledByModelPointerUp) {
      return;
    }

    gestureState.clearedByCanvasPointerUp = true;
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const handlePointerMissed = useCallback(() => {
    const gestureState = pointerSelectionGestureRef.current;

    if (!gestureState.lastGestureWasClickLike || gestureState.selectionHandledByModelPointerUp || gestureState.clearedByCanvasPointerUp) {
      return;
    }

    onNodeSelect?.(null);
  }, [onNodeSelect]);

  return (
    <section
      ref={containerRef}
      aria-label="Three.js viewport"
      className={['h-full w-full overflow-hidden bg-[rgb(var(--color-container))] dark:bg-[rgb(var(--color-container-dark))]', className]
        .filter(Boolean)
        .join(' ')}
      >
      {canRenderCanvas ? (
        <Canvas
          shadows={shadowsEnabled}
          onPointerDown={handleCanvasPointerDown}
          onPointerUp={handleCanvasPointerUp}
          onPointerMissed={handlePointerMissed}
        >
          {cameraMode === 'ortho' ? <OrthographicCamera makeDefault position={INITIAL_CAMERA_POSITION} /> : <PerspectiveCamera makeDefault fov={cameraFov} position={INITIAL_CAMERA_POSITION} />}
          {/* eslint-disable-next-line react/no-unknown-property -- R3F JSX light props are not DOM props. */}
          <ambientLight intensity={0.5} />
          <Suspense fallback={null}>
            <LoadedModel
              modelUrl={modelUrl}
              visualMode={visualMode}
              cameraMode={cameraMode}
              orthoView={orthoView}
              gridStyle={gridStyle}
              sunAzimuth={sunAzimuth}
              sunElevation={sunElevation}
              shadowsEnabled={shadowsEnabled}
              initialCameraState={initialViewportState?.camera}
              selectedNodeIds={selectedNodeIds}
              hiddenNodeIds={hiddenNodeIds}
              onStageTreeChange={onStageTreeChange}
              onNodeSelect={onNodeSelect}
              orbitControlsRef={orbitControlsRef}
              pointerSelectionGestureRef={pointerSelectionGestureRef}
            />
          </Suspense>
          <OrbitControls
            ref={setOrbitControlsRef}
            makeDefault
          />
        </Canvas>
      ) : null}
    </section>
  );
}

export const ThreeJsRender = forwardRef(ThreeJsRenderComponent);
ThreeJsRender.displayName = 'ThreeJsRender';
