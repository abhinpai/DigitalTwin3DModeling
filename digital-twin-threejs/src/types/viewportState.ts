import type { CameraMode } from './cameraMode';
import type { GridStyle } from './gridStyle';
import type { OrthoView } from './orthoView';
import type { VisualMode } from './visualMode';

export interface IViewportState {
  schemaVersion: 1;
  visualMode: VisualMode;
  cameraMode: CameraMode;
  cameraFov: number;
  orthoView: OrthoView;
  gridStyle: GridStyle;
  sunAzimuth: number;
  sunElevation: number;
  shadowsEnabled: boolean;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    zoom: number;
  };
}
