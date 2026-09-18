import { Grid, OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { Canvas, useThree } from '@react-three/fiber';
import { Component, Suspense, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ErrorInfo, type ForwardedRef, type MutableRefObject, type ReactNode, type RefObject } from 'react';
import { Object3D } from 'three';
import { ModelLoadingOverlay, type ModelLoadState } from '../../components/ModelLoadingOverlay/ModelLoadingOverlay';
import { useCameraFit, type IOrbitControlsApi } from '../../hooks/useCameraFit';
import { useContainerResize } from '../../hooks/useContainerResize';
import { useModelGrid } from '../../hooks/useModelGrid';
import { useEnvironmentBase } from '../../hooks/useEnvironmentBase';
import { useModelLoader } from '../../hooks/useModelLoader';
import { useNodeHighlight } from '../../hooks/useNodeHighlight';
import { useNodeVisibility } from '../../hooks/useNodeVisibility';
import { useShadowCatcher } from '../../hooks/useShadowCatcher';
import { useStageTree } from '../../hooks/useStageTree';
import { useSunLighting } from '../../hooks/useSunLighting';
import { useVisualMode } from '../../hooks/useVisualMode';
import type { CameraMode } from '../../types/cameraMode';
import type { EnvironmentPreset } from '../../types/environmentPreset';
import type { GridStyle } from '../../types/gridStyle';
import type { LightingPreset } from '../../types/lightingPreset';
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
  gridExtentScale?: number;
  environmentPreset?: EnvironmentPreset;
  lightingPreset?: LightingPreset;
  sunAzimuth?: number;
  sunElevation?: number;
  shadowsEnabled?: boolean;
  /**
   * Saved viewport state used only for camera pose restore (`camera.position/target/zoom`).
   *
   * For all other fields (`visualMode`, `cameraMode`, `cameraFov`, `orthoView`, `gridStyle`,
   * `gridExtentScale`, `lightingPreset`, `sunAzimuth`, `sunElevation`, `shadowsEnabled`), read values from the saved state in
   * consumer code and pass them via this component's normal controlled props.
   */
  initialViewportState?: IViewportState;
  /** Keep the loading transition visible while an asynchronous saved view is being resolved. */
  initialViewportStateLoading?: boolean;
  selectedNodeIds?: string[];
  hiddenNodeIds?: string[];
  onStageTreeChange?: (root: IStageTreeNode | null) => void;
  onNodeSelect?: (id: string | null) => void;
  onLoadStateChange?: (state: ModelLoadState) => void;
}

interface ILoadedModelProps extends Pick<IThreeJsRenderProps, 'modelUrl' | 'visualMode' | 'cameraMode' | 'orthoView' | 'gridStyle' | 'gridExtentScale' | 'environmentPreset' | 'lightingPreset' | 'sunAzimuth' | 'sunElevation' | 'shadowsEnabled' | 'selectedNodeIds' | 'hiddenNodeIds' | 'onStageTreeChange' | 'onNodeSelect'> {
  initialCameraState?: IViewportState['camera'];
  orbitControlsRef: RefObject<IOrbitControlsApi | null>;
  pointerSelectionGestureRef: MutableRefObject<IPointerSelectionGestureState>;
  onReady: () => void;
}

function LoadedModel({ modelUrl, visualMode = 'original', cameraMode = 'persp', orthoView = 'front', gridStyle = 'none', gridExtentScale = 1, environmentPreset = 'studio', lightingPreset = 'natural', sunAzimuth, sunElevation, shadowsEnabled = false, selectedNodeIds, hiddenNodeIds, onStageTreeChange, onNodeSelect, initialCameraState, orbitControlsRef, pointerSelectionGestureRef, onReady }: ILoadedModelProps) {
  const gltf = useModelLoader(modelUrl);
  const { camera, size, scene: rootScene } = useThree();
  const sunTarget = useMemo(() => new Object3D(), []);
  const effectiveOrthoView = cameraMode === 'ortho' ? orthoView : 'front';
  const stageTree = useStageTree({ scene: gltf.scene });
  const directionalLightingEnabled = lightingPreset === 'natural' || lightingPreset === 'directional';
  const effectiveShadowsEnabled = shadowsEnabled && directionalLightingEnabled;
  const effectiveGridStyle = environmentPreset === 'grid' ? 'lines' : environmentPreset === 'points' ? 'dots' : gridStyle;
  const modelGrid = useModelGrid({ scene: gltf.scene, gridStyle: effectiveGridStyle, gridExtentScale });
  const environmentBase = useEnvironmentBase({ scene: gltf.scene, preset: environmentPreset, extentScale: gridExtentScale });
  const sunLighting = useSunLighting({
    scene: gltf.scene,
    sunAzimuth,
    sunElevation,
    shadowsEnabled: effectiveShadowsEnabled,
  });
  const shadowCatcher = useShadowCatcher({
    maxDimension: sunLighting.maxDimension,
    shadowGroundPosition: sunLighting.shadowGroundPosition,
    shadowsEnabled: effectiveShadowsEnabled && !environmentBase,
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
    onReady,
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

    modelGrid.points.receiveShadow = effectiveShadowsEnabled;
  }, [effectiveShadowsEnabled, modelGrid]);

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
      {lightingPreset === 'ambient' || lightingPreset === 'directional' ? (
        // eslint-disable-next-line react/no-unknown-property -- R3F JSX light props are not DOM props.
        <ambientLight intensity={lightingPreset === 'ambient' ? 1.15 : 0.28} />
      ) : null}

      {lightingPreset === 'natural' || lightingPreset === 'hemisphere' ? (
        // eslint-disable-next-line react/no-unknown-property -- R3F JSX light props are not DOM props.
        <hemisphereLight color={0xbfdcff} groundColor={0x76624a} intensity={lightingPreset === 'natural' ? 0.8 : 1.25} />
      ) : null}

      {directionalLightingEnabled ? (
        <>
          {/* eslint-disable react/no-unknown-property -- R3F JSX light props are not DOM props. */}
          <directionalLight
            position={sunLighting.sunPosition}
            intensity={lightingPreset === 'natural' ? 1.05 : 1.2}
            target={sunTarget}
            castShadow={effectiveShadowsEnabled}
            shadow-camera-left={sunLighting.shadowCamera.left}
            shadow-camera-right={sunLighting.shadowCamera.right}
            shadow-camera-top={sunLighting.shadowCamera.top}
            shadow-camera-bottom={sunLighting.shadowCamera.bottom}
            shadow-camera-near={sunLighting.shadowCamera.near}
            shadow-camera-far={sunLighting.shadowCamera.far}
          />
          {/* eslint-enable react/no-unknown-property */}
        </>
      ) : null}

      {modelGrid?.style === 'lines' ? (
        <Grid
          position={modelGrid.config.position}
          args={[modelGrid.config.extent, modelGrid.config.extent]}
          cellSize={modelGrid.config.cellSize}
          sectionSize={modelGrid.sectionSize}
          fadeDistance={modelGrid.fadeDistance}
          infiniteGrid={false}
          receiveShadow={effectiveShadowsEnabled}
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

      {environmentBase ? (
        // eslint-disable-next-line react/no-unknown-property -- R3F primitive accepts object prop.
        <primitive object={environmentBase.mesh} position={environmentBase.position} />
      ) : null}

      {/* eslint-disable-next-line react/no-unknown-property -- R3F JSX primitive accepts object prop. */}
      <primitive object={gltf.scene} onPointerUp={handleModelPointerUp} />
    </>
  );
}

interface IModelErrorBoundaryProps {
  children: ReactNode;
  onError: () => void;
}

interface IModelErrorBoundaryState {
  hasError: boolean;
}

class ModelErrorBoundary extends Component<IModelErrorBoundaryProps, IModelErrorBoundaryState> {
  state: IModelErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): IModelErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError();
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function ThreeJsRenderComponent({
  modelUrl,
  className,
  visualMode = 'original',
  cameraMode = 'persp',
  cameraFov = 50,
  orthoView = 'front',
  gridStyle = 'none',
  gridExtentScale = 1,
  environmentPreset = 'studio',
  lightingPreset = 'natural',
  sunAzimuth,
  sunElevation,
  shadowsEnabled = false,
  initialViewportState,
  initialViewportStateLoading = false,
  selectedNodeIds,
  hiddenNodeIds,
  onStageTreeChange,
  onNodeSelect,
  onLoadStateChange,
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
  const [readyModelUrl, setReadyModelUrl] = useState<string | null>(null);
  const [failedModelUrl, setFailedModelUrl] = useState<string | null>(null);
  const loadState: ModelLoadState = failedModelUrl === modelUrl
    ? 'error'
    : readyModelUrl === modelUrl && !initialViewportStateLoading
      ? 'ready'
      : 'loading';

  const handleModelReady = useCallback(() => {
    setReadyModelUrl(modelUrl);
    setFailedModelUrl((currentUrl) => currentUrl === modelUrl ? null : currentUrl);
  }, [modelUrl]);

  const handleModelError = useCallback(() => {
    setFailedModelUrl(modelUrl);
  }, [modelUrl]);

  useEffect(() => {
    onLoadStateChange?.(loadState);
  }, [loadState, onLoadStateChange]);

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
        gridExtentScale,
        environmentPreset,
        lightingPreset,
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
  }), [cameraFov, cameraMode, environmentPreset, gridExtentScale, gridStyle, lightingPreset, orthoView, shadowsEnabled, sunAzimuth, sunElevation, visualMode]);

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
      aria-busy={loadState === 'loading'}
      className={['relative h-full w-full overflow-hidden bg-[rgb(var(--color-container))] dark:bg-[rgb(var(--color-container-dark))]', className]
        .filter(Boolean)
        .join(' ')}
      >
      {canRenderCanvas ? (
        <ModelErrorBoundary key={modelUrl} onError={handleModelError}>
          <Canvas
            className={[
              'digital-twin-model-canvas',
              loadState === 'ready' ? 'digital-twin-model-canvas--ready' : '',
            ].filter(Boolean).join(' ')}
            shadows={shadowsEnabled && (lightingPreset === 'natural' || lightingPreset === 'directional')}
            onPointerDown={handleCanvasPointerDown}
            onPointerUp={handleCanvasPointerUp}
            onPointerMissed={handlePointerMissed}
          >
            {cameraMode === 'ortho' ? <OrthographicCamera makeDefault position={INITIAL_CAMERA_POSITION} /> : <PerspectiveCamera makeDefault fov={cameraFov} position={INITIAL_CAMERA_POSITION} />}
            <Suspense fallback={null}>
              <LoadedModel
                modelUrl={modelUrl}
                visualMode={visualMode}
                cameraMode={cameraMode}
                orthoView={orthoView}
                gridStyle={gridStyle}
              gridExtentScale={gridExtentScale}
              environmentPreset={environmentPreset}
                lightingPreset={lightingPreset}
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
                onReady={handleModelReady}
              />
            </Suspense>
            <OrbitControls
              ref={setOrbitControlsRef}
              makeDefault
            />
          </Canvas>
        </ModelErrorBoundary>
      ) : null}
      <ModelLoadingOverlay state={loadState} />
    </section>
  );
}

export const ThreeJsRender = forwardRef(ThreeJsRenderComponent);
ThreeJsRender.displayName = 'ThreeJsRender';
