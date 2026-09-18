import { Box3, Vector3 } from 'three';
import type { OrthoView } from '../types/orthoView';

export interface ICameraFitResult {
  position: Vector3;
  target: Vector3;
  near: number;
  far: number;
}

export interface IOrthographicCameraFitResult extends ICameraFitResult {
  zoom: number;
  up: Vector3;
}

const DEFAULT_FOV = 50;
const ELEVATION_ANGLE_DEGREES = 32;
const FIT_PADDING = 1.25;
const MIN_DIMENSION = 0.1;
const MIN_DISTANCE = 0.1;
const MIN_VIEWPORT_SIZE = 1;
const MIN_ZOOM = 0.01;

function getBoxMetrics(box: Box3) {
  const center = new Vector3();
  const size = new Vector3();

  box.getCenter(center);
  box.getSize(size);

  const footprint = Math.max(size.x, size.z, MIN_DIMENSION);
  const height = Math.max(size.y, MIN_DIMENSION);
  const viewDepthHalfExtent = Math.max((size.x + size.z) / (2 * Math.sqrt(2)), MIN_DIMENSION);

  return {
    center,
    size,
    footprint,
    height,
    viewDepthHalfExtent,
  };
}

function computeCameraPosition(center: Vector3, footprint: number, height: number, viewDepthHalfExtent: number, fov = DEFAULT_FOV) {
  const clampedFov = Number.isFinite(fov) ? Math.min(Math.max(fov, 1), 179) : DEFAULT_FOV;
  const halfFovRadians = ((clampedFov * Math.PI) / 180) / 2;
  const minimumDepthDistance = viewDepthHalfExtent * FIT_PADDING;

  const footprintDistance = ((footprint / 2) / Math.tan(halfFovRadians)) * FIT_PADDING;
  const heightDistance = ((height / 2) / Math.tan(halfFovRadians)) * FIT_PADDING;
  const horizontalDistance = Math.max(footprintDistance, heightDistance, minimumDepthDistance, MIN_DISTANCE);

  const preferredElevationOffset = Math.tan((ELEVATION_ANGLE_DEGREES * Math.PI) / 180) * horizontalDistance;
  const elevationOffset = Math.min(preferredElevationOffset, Math.max(height * 2, 1));
  const planarDistance = Math.sqrt(Math.max((horizontalDistance ** 2) - (elevationOffset ** 2), 0));
  const safePlanarDistance = Math.max(planarDistance, minimumDepthDistance);

  const diagonalDirection = new Vector3(1, 0, 1).normalize();

  return new Vector3(
    center.x + (diagonalDirection.x * safePlanarDistance),
    center.y + elevationOffset,
    center.z + (diagonalDirection.z * safePlanarDistance),
  );
}

function computeClipPlanes(cameraDistance: number, size: Vector3) {
  const span = Math.max(size.x, size.y, size.z, MIN_DIMENSION);
  const near = Math.max(Math.min(cameraDistance / 100, span / 2), 0.01);
  const far = Math.min(Math.max(cameraDistance + (span * 100), 10), 1_000_000);

  return {
    near: Math.min(near, far / 2),
    far,
  };
}

type Axis = 'x' | 'y' | 'z';

interface IOrthoViewAxes {
  horizontalAxis: Axis;
  verticalAxis: Axis;
  depthAxis: Axis;
  depthSign: 1 | -1;
  up: Vector3;
}

const ORTHO_VIEW_AXES: Record<OrthoView, IOrthoViewAxes> = {
  front: {
    horizontalAxis: 'x',
    verticalAxis: 'y',
    depthAxis: 'z',
    depthSign: 1,
    up: new Vector3(0, 1, 0),
  },
  back: {
    horizontalAxis: 'x',
    verticalAxis: 'y',
    depthAxis: 'z',
    depthSign: -1,
    up: new Vector3(0, 1, 0),
  },
  right: {
    horizontalAxis: 'z',
    verticalAxis: 'y',
    depthAxis: 'x',
    depthSign: 1,
    up: new Vector3(0, 1, 0),
  },
  left: {
    horizontalAxis: 'z',
    verticalAxis: 'y',
    depthAxis: 'x',
    depthSign: -1,
    up: new Vector3(0, 1, 0),
  },
  top: {
    horizontalAxis: 'x',
    verticalAxis: 'z',
    depthAxis: 'y',
    depthSign: 1,
    up: new Vector3(0, 0, -1),
  },
  bottom: {
    horizontalAxis: 'x',
    verticalAxis: 'z',
    depthAxis: 'y',
    depthSign: -1,
    up: new Vector3(0, 0, 1),
  },
};

function getAxisSize(size: Vector3, axis: Axis) {
  return Math.max(size[axis], MIN_DIMENSION);
}

function getOrthoPosition(center: Vector3, axis: Axis, sign: 1 | -1, distance: number) {
  const position = center.clone();
  position[axis] += sign * distance;
  return position;
}

export function computeCameraFit(box: Box3, fov = DEFAULT_FOV): ICameraFitResult {
  const { center, size, footprint, height, viewDepthHalfExtent } = getBoxMetrics(box);
  const position = computeCameraPosition(center, footprint, height, viewDepthHalfExtent, fov);
  const cameraDistance = position.distanceTo(center);
  const { near, far } = computeClipPlanes(cameraDistance, size);

  return {
    position,
    target: center.clone(),
    near,
    far,
  };
}

export function computeOrthographicCameraFit(
  box: Box3,
  viewportWidth: number,
  viewportHeight: number,
  orthoView: OrthoView = 'front',
): IOrthographicCameraFitResult {
  const { center, size } = getBoxMetrics(box);
  const viewAxes = ORTHO_VIEW_AXES[orthoView];
  const horizontalSize = getAxisSize(size, viewAxes.horizontalAxis);
  const verticalSize = getAxisSize(size, viewAxes.verticalAxis);
  const depthSize = getAxisSize(size, viewAxes.depthAxis);

  const distance = Math.max(Math.max(horizontalSize, verticalSize, depthSize) * FIT_PADDING, MIN_DISTANCE);
  const position = getOrthoPosition(center, viewAxes.depthAxis, viewAxes.depthSign, distance);
  const cameraDistance = position.distanceTo(center);
  const { near, far } = computeClipPlanes(cameraDistance, size);

  const safeViewportWidth = Math.max(viewportWidth, MIN_VIEWPORT_SIZE);
  const safeViewportHeight = Math.max(viewportHeight, MIN_VIEWPORT_SIZE);
  const fittedWidth = horizontalSize * FIT_PADDING;
  const fittedHeight = verticalSize * FIT_PADDING;
  const widthZoom = safeViewportWidth / fittedWidth;
  const heightZoom = safeViewportHeight / fittedHeight;
  const zoom = Math.max(Math.min(widthZoom, heightZoom), MIN_ZOOM);

  return {
    position,
    target: center.clone(),
    near,
    far,
    zoom,
    up: viewAxes.up.clone(),
  };
}
