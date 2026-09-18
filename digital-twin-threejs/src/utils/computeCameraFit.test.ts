import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { computeCameraFit, computeOrthographicCameraFit } from './computeCameraFit';

function createBox(width: number, height: number, depth: number) {
  const halfX = width / 2;
  const halfY = height / 2;
  const halfZ = depth / 2;

  return new Box3(
    new Vector3(-halfX, -halfY, -halfZ),
    new Vector3(halfX, halfY, halfZ),
  );
}

describe('computeCameraFit', () => {
  it('keeps a sane isometric fit for cube-ish Bangalore-like models', () => {
    const box = createBox(10, 14.7, 10.3);
    const result = computeCameraFit(box, 50);

    expect(result.position.y).toBeGreaterThan(0);
    expect(result.position.y).toBeLessThan(30);
    expect(result.position.distanceTo(result.target)).toBeGreaterThan(15);
    expect(result.near).toBeGreaterThan(0);
    expect(result.far).toBeGreaterThan(result.near);
  });

  it('keeps Richardson-like flat model elevation bounded while fitting footprint', () => {
    const box = createBox(147.1, 4.6, 75);
    const result = computeCameraFit(box, 50);
    const cameraDistance = result.position.distanceTo(result.target);
    const horizontalDistance = Math.hypot(result.position.x - result.target.x, result.position.z - result.target.z);

    expect(cameraDistance).toBeGreaterThan(170);
    expect(horizontalDistance).toBeGreaterThan(160);
    expect(result.position.y).toBeLessThanOrEqual(9.2);
    expect(result.position.y / 147.1).toBeLessThan(0.1);
  });

  it('keeps Voyager-like very wide model elevation bounded while fitting footprint', () => {
    const box = createBox(245.2, 38.1, 232.8);
    const result = computeCameraFit(box, 50);
    const cameraDistance = result.position.distanceTo(result.target);

    expect(cameraDistance).toBeGreaterThan(280);
    expect(result.position.y).toBeLessThanOrEqual(76.2);
    expect(result.position.y / 245.2).toBeLessThan(0.32);
  });

  it('handles a zero-size box without NaN or Infinity', () => {
    const point = new Vector3(3, 4, 5);
    const box = new Box3(point.clone(), point.clone());
    const result = computeCameraFit(box, 50);

    expect(Number.isFinite(result.position.x)).toBe(true);
    expect(Number.isFinite(result.position.y)).toBe(true);
    expect(Number.isFinite(result.position.z)).toBe(true);
    expect(Number.isFinite(result.near)).toBe(true);
    expect(Number.isFinite(result.far)).toBe(true);
    expect(result.near).toBeGreaterThan(0);
    expect(result.far).toBeGreaterThan(result.near);
  });

  it('uses symmetric distances for a perfect cube baseline', () => {
    const box = createBox(20, 20, 20);
    const result = computeCameraFit(box, 50);
    const dx = result.position.x - result.target.x;
    const dz = result.position.z - result.target.z;

    expect(Math.abs(dx - dz)).toBeLessThan(0.000001);
    expect(result.position.y).toBeLessThanOrEqual(40);
    expect(result.position.distanceTo(result.target)).toBeGreaterThan(25);
  });

  it('increases distance for narrow FOV and decreases for wide FOV', () => {
    const box = createBox(245.2, 38.1, 232.8);
    const narrow = computeCameraFit(box, 20);
    const medium = computeCameraFit(box, 50);
    const wide = computeCameraFit(box, 120);

    const narrowDistance = narrow.position.distanceTo(narrow.target);
    const mediumDistance = medium.position.distanceTo(medium.target);
    const wideDistance = wide.position.distanceTo(wide.target);

    expect(narrowDistance).toBeGreaterThan(mediumDistance);
    expect(mediumDistance).toBeGreaterThan(wideDistance);
  });

  it('keeps camera outside model depth across supported FOV range', () => {
    const width = 245.2;
    const depth = 232.8;
    const box = createBox(width, 38.1, depth);
    const minOutsideDistance = ((width + depth) / (2 * Math.sqrt(2))) * 1.25;

    for (let fov = 20; fov <= 120; fov += 10) {
      const fit = computeCameraFit(box, fov);
      const diagonalDepthDistance = Math.hypot(
        fit.position.x - fit.target.x,
        fit.position.z - fit.target.z,
      );

      expect(diagonalDepthDistance).toBeGreaterThanOrEqual(minOutsideDistance);
      expect(Number.isFinite(diagonalDepthDistance)).toBe(true);
    }
  });
});

describe('computeOrthographicCameraFit', () => {
  it('keeps a sane fit for cube-ish Bangalore-like models', () => {
    const box = createBox(10, 14.7, 10.3);
    const result = computeOrthographicCameraFit(box, 1280, 720);

    expect(result.zoom).toBeGreaterThan(30);
    expect(result.zoom).toBeLessThan(45);
    expect(result.near).toBeGreaterThan(0);
    expect(result.far).toBeGreaterThan(result.near);
  });

  it('fits Richardson-like wide/flat models by footprint not height', () => {
    const box = createBox(147.1, 4.6, 75);
    const result = computeOrthographicCameraFit(box, 1280, 720);

    expect(result.zoom).toBeGreaterThan(6);
    expect(result.zoom).toBeLessThan(8);
    expect(result.near).toBeGreaterThan(0);
    expect(result.far).toBeGreaterThan(result.near);
  });

  it('fits Voyager-like very-wide models with lower zoom than smaller models', () => {
    const box = createBox(245.2, 38.1, 232.8);
    const voyager = computeOrthographicCameraFit(box, 1280, 720);
    const bgl = computeOrthographicCameraFit(createBox(10, 14.7, 10.3), 1280, 720);

    expect(voyager.zoom).toBeLessThan(4.5);
    expect(voyager.zoom).toBeLessThan(bgl.zoom);
    expect(voyager.near).toBeGreaterThan(0);
    expect(voyager.far).toBeGreaterThan(voyager.near);
  });

  it('handles a zero-size box without NaN or Infinity', () => {
    const point = new Vector3(3, 4, 5);
    const box = new Box3(point.clone(), point.clone());
    const result = computeOrthographicCameraFit(box, 800, 600);

    expect(Number.isFinite(result.position.x)).toBe(true);
    expect(Number.isFinite(result.position.y)).toBe(true);
    expect(Number.isFinite(result.position.z)).toBe(true);
    expect(Number.isFinite(result.zoom)).toBe(true);
    expect(Number.isFinite(result.near)).toBe(true);
    expect(Number.isFinite(result.far)).toBe(true);
    expect(result.zoom).toBeGreaterThan(0);
    expect(result.near).toBeGreaterThan(0);
    expect(result.far).toBeGreaterThan(result.near);
  });

  it('scales zoom with viewport size for a perfect cube baseline', () => {
    const box = createBox(20, 20, 20);
    const smallViewport = computeOrthographicCameraFit(box, 800, 600);
    const largeViewport = computeOrthographicCameraFit(box, 1600, 1200);

    expect(largeViewport.zoom).toBeGreaterThan(smallViewport.zoom);
    expect(largeViewport.zoom / smallViewport.zoom).toBeCloseTo(2, 1);
    expect(smallViewport.near).toBeGreaterThan(0);
    expect(smallViewport.far).toBeGreaterThan(smallViewport.near);
    expect(largeViewport.far).toBeGreaterThan(largeViewport.near);
  });

  it('uses X/Y extents for front and back ortho views', () => {
    const box = createBox(147.1, 4.6, 75);
    const front = computeOrthographicCameraFit(box, 1280, 720, 'front');
    const back = computeOrthographicCameraFit(box, 1280, 720, 'back');
    const expectedZoom = Math.min(1280 / (147.1 * 1.25), 720 / (4.6 * 1.25));

    expect(front.zoom).toBeCloseTo(expectedZoom, 6);
    expect(back.zoom).toBeCloseTo(expectedZoom, 6);
    expect(front.position.z).toBeGreaterThan(front.target.z);
    expect(back.position.z).toBeLessThan(back.target.z);
    expect(front.up).toEqual(new Vector3(0, 1, 0));
    expect(back.up).toEqual(new Vector3(0, 1, 0));
  });

  it('uses Z/Y extents for left and right ortho views', () => {
    const box = createBox(245.2, 38.1, 232.8);
    const left = computeOrthographicCameraFit(box, 1280, 720, 'left');
    const right = computeOrthographicCameraFit(box, 1280, 720, 'right');
    const expectedZoom = Math.min(1280 / (232.8 * 1.25), 720 / (38.1 * 1.25));

    expect(left.zoom).toBeCloseTo(expectedZoom, 6);
    expect(right.zoom).toBeCloseTo(expectedZoom, 6);
    expect(left.position.x).toBeLessThan(left.target.x);
    expect(right.position.x).toBeGreaterThan(right.target.x);
    expect(left.up).toEqual(new Vector3(0, 1, 0));
    expect(right.up).toEqual(new Vector3(0, 1, 0));
  });

  it('uses X/Z extents for top and bottom ortho views with non-degenerate up vectors', () => {
    const box = createBox(10, 14.7, 10.3);
    const top = computeOrthographicCameraFit(box, 1280, 720, 'top');
    const bottom = computeOrthographicCameraFit(box, 1280, 720, 'bottom');
    const expectedZoom = Math.min(1280 / (10 * 1.25), 720 / (10.3 * 1.25));
    const topForward = top.target.clone().sub(top.position).normalize();
    const bottomForward = bottom.target.clone().sub(bottom.position).normalize();

    expect(top.zoom).toBeCloseTo(expectedZoom, 6);
    expect(bottom.zoom).toBeCloseTo(expectedZoom, 6);
    expect(top.position.y).toBeGreaterThan(top.target.y);
    expect(bottom.position.y).toBeLessThan(bottom.target.y);
    expect(top.up).toEqual(new Vector3(0, 0, -1));
    expect(bottom.up).toEqual(new Vector3(0, 0, 1));
    expect(Math.abs(topForward.dot(top.up))).toBeLessThan(0.000001);
    expect(Math.abs(bottomForward.dot(bottom.up))).toBeLessThan(0.000001);
  });
});
