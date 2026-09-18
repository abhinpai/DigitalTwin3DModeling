import { forwardRef, useImperativeHandle, useRef, type ForwardedRef, type ReactNode } from 'react';
import { ThreeJsRender } from '../ThreeJsRender/ThreeJsRender';
import type { CameraMode } from '../../types/cameraMode';
import type { GridStyle } from '../../types/gridStyle';
import type { LightingPreset } from '../../types/lightingPreset';
import type { OrthoView } from '../../types/orthoView';
import type { IStageTreeNode } from '../../types/stageTreeNode';
import type { IViewportState } from '../../types/viewportState';
import type { VisualMode } from '../../types/visualMode';

export interface IThreejsCanvasHandle {
  captureViewportState: () => IViewportState | null;
}

export interface IThreejsCanvasProps {
  modelUrl?: string;
  visualMode?: VisualMode;
  cameraMode?: CameraMode;
  cameraFov?: number;
  orthoView?: OrthoView;
  gridStyle?: GridStyle;
  /** Multiplies the model-relative grid coverage. Values are clamped from 0.5 to 5. */
  gridExtentScale?: number;
  /** Selects the active Three.js light rig. */
  lightingPreset?: LightingPreset;
  sunAzimuth?: number;
  sunElevation?: number;
  shadowsEnabled?: boolean;
  initialViewportState?: IViewportState;
  selectedNodeIds?: string[];
  hiddenNodeIds?: string[];
  onStageTreeChange?: (root: IStageTreeNode | null) => void;
  onNodeSelect?: (id: string | null) => void;
  className?: string;
  children?: ReactNode;
}

function ThreejsCanvasComponent({
  modelUrl,
  visualMode = 'original',
  cameraMode = 'persp',
  cameraFov = 50,
  orthoView = 'front',
  gridStyle = 'none',
  gridExtentScale = 1,
  lightingPreset = 'natural',
  sunAzimuth,
  sunElevation,
  shadowsEnabled = false,
  initialViewportState,
  selectedNodeIds,
  hiddenNodeIds,
  onStageTreeChange,
  onNodeSelect,
  className,
  children,
}: IThreejsCanvasProps, ref: ForwardedRef<IThreejsCanvasHandle>) {
  const renderHandleRef = useRef<IThreejsCanvasHandle | null>(null);

  useImperativeHandle(ref, () => ({
    captureViewportState: () => renderHandleRef.current?.captureViewportState() ?? null,
  }), []);

  if (modelUrl) {
    return (
      <ThreeJsRender
        ref={renderHandleRef}
        modelUrl={modelUrl}
        visualMode={visualMode}
        cameraMode={cameraMode}
        cameraFov={cameraFov}
        orthoView={orthoView}
        gridStyle={gridStyle}
        gridExtentScale={gridExtentScale}
        lightingPreset={lightingPreset}
        sunAzimuth={sunAzimuth}
        sunElevation={sunElevation}
        shadowsEnabled={shadowsEnabled}
        initialViewportState={initialViewportState}
        selectedNodeIds={selectedNodeIds}
        hiddenNodeIds={hiddenNodeIds}
        onStageTreeChange={onStageTreeChange}
        onNodeSelect={onNodeSelect}
        className={className}
      />
    );
  }

  return (
    <section
      aria-label="Three.js viewport placeholder"
      className={[
        'flex h-full w-full items-center justify-center overflow-hidden border border-dashed border-[rgb(var(--color-gray-300))] bg-[rgb(var(--color-container))] p-4 text-center text-sm text-[rgb(var(--color-typography-secondary))] dark:border-[rgb(var(--color-gray-800))] dark:bg-[rgb(var(--color-container-dark))] dark:text-[rgb(var(--color-typography-secondary-dark))]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children ?? 'Waiting for a 3D model to render.'}
    </section>
  );
}

export const ThreejsCanvas = forwardRef(ThreejsCanvasComponent);
ThreejsCanvas.displayName = 'ThreejsCanvas';
