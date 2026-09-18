import type { CameraMode } from './cameraMode';
import type { GridStyle } from './gridStyle';
import type { LightingPreset } from './lightingPreset';
import type { OrthoView } from './orthoView';
import type { VisualMode } from './visualMode';

export interface IViewportState {
  schemaVersion: 1;
  visualMode: VisualMode;
  cameraMode: CameraMode;
  cameraFov: number;
  orthoView: OrthoView;
  gridStyle: GridStyle;
  gridExtentScale?: number;
  lightingPreset?: LightingPreset;
  sunAzimuth: number;
  sunElevation: number;
  shadowsEnabled: boolean;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    zoom: number;
  };
}
