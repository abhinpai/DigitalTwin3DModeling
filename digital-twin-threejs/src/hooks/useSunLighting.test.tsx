import { render } from '@testing-library/react';
import { Mesh, Scene, BoxGeometry, MeshStandardMaterial, type Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { useSunLighting, type IUseSunLightingResult } from './useSunLighting';

interface IHookHarnessProps {
  scene: Object3D;
  sunAzimuth?: number;
  sunElevation?: number;
  shadowsEnabled?: boolean;
  onLighting: (lighting: IUseSunLightingResult) => void;
}

function HookHarness({ scene, sunAzimuth, sunElevation, shadowsEnabled, onLighting }: IHookHarnessProps) {
  const lighting = useSunLighting({
    scene,
    sunAzimuth,
    sunElevation,
    shadowsEnabled,
  });

  onLighting(lighting);
  return null;
}

function createBoxScene(size: [number, number, number], position: [number, number, number] = [0, 0, 0]) {
  const scene = new Scene();
  const mesh = new Mesh(new BoxGeometry(size[0], size[1], size[2]), new MeshStandardMaterial({ color: 0x888888 }));

  mesh.position.set(position[0], position[1], position[2]);
  scene.add(mesh);

  return { scene, mesh };
}

function getDistance(a: [number, number, number], b: [number, number, number]) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt((dx ** 2) + (dy ** 2) + (dz ** 2));
}

describe('useSunLighting', () => {
  it('scales sun distance with model max dimension across realistic model scales', () => {
    const bangalore = createBoxScene([10, 14.7, 10], [0, 7.35, 0]);
    const richardson = createBoxScene([147, 4.6, 75], [0, 2.3, 0]);
    const voyager = createBoxScene([245, 38, 233], [0, 19, 0]);
    const capture = vi.fn();

    const { rerender } = render(<HookHarness scene={bangalore.scene} onLighting={capture} />);
    rerender(<HookHarness scene={richardson.scene} onLighting={capture} />);
    rerender(<HookHarness scene={voyager.scene} onLighting={capture} />);

    const [bangaloreLighting, richardsonLighting, voyagerLighting] = capture.mock.calls.map(([value]) => value as IUseSunLightingResult);

    const bangaloreDistance = getDistance(bangaloreLighting.sunPosition, bangaloreLighting.targetPosition);
    const richardsonDistance = getDistance(richardsonLighting.sunPosition, richardsonLighting.targetPosition);
    const voyagerDistance = getDistance(voyagerLighting.sunPosition, voyagerLighting.targetPosition);

    expect(bangaloreDistance).toBeCloseTo(29.4, 5);
    expect(richardsonDistance).toBeCloseTo(294, 5);
    expect(voyagerDistance).toBeCloseTo(490, 5);
    expect(bangaloreDistance).toBeLessThan(richardsonDistance);
    expect(richardsonDistance).toBeLessThan(voyagerDistance);
  });

  it('moves sun in expected directions when azimuth/elevation change', () => {
    const { scene } = createBoxScene([10, 14.7, 10], [0, 7.35, 0]);
    const capture = vi.fn();

    const { rerender } = render(<HookHarness scene={scene} sunAzimuth={0} sunElevation={0} onLighting={capture} />);
    rerender(<HookHarness scene={scene} sunAzimuth={90} sunElevation={0} onLighting={capture} />);
    rerender(<HookHarness scene={scene} sunAzimuth={0} sunElevation={60} onLighting={capture} />);

    const [azimuthZero, azimuthNinety, elevated] = capture.mock.calls.map(([value]) => value as IUseSunLightingResult);

    expect(azimuthZero.sunPosition[0]).toBeGreaterThan(azimuthZero.targetPosition[0]);
    expect(azimuthZero.sunPosition[2]).toBeCloseTo(azimuthZero.targetPosition[2], 5);

    expect(azimuthNinety.sunPosition[2]).toBeGreaterThan(azimuthNinety.targetPosition[2]);
    expect(azimuthNinety.sunPosition[0]).toBeCloseTo(azimuthNinety.targetPosition[0], 5);

    expect(elevated.sunPosition[1]).toBeGreaterThan(azimuthZero.sunPosition[1]);
  });

  it('scales shadow frustum bounds with model size so large models do not clip', () => {
    const { scene: smallScene } = createBoxScene([10, 14.7, 10], [0, 7.35, 0]);
    const { scene: largeScene } = createBoxScene([245, 38, 233], [0, 19, 0]);
    const capture = vi.fn();

    const { rerender } = render(<HookHarness scene={smallScene} onLighting={capture} />);
    rerender(<HookHarness scene={largeScene} onLighting={capture} />);

    const [smallLighting, largeLighting] = capture.mock.calls.map(([value]) => value as IUseSunLightingResult);

    expect(smallLighting.shadowCamera.left).toBeCloseTo(-13.23, 5);
    expect(smallLighting.shadowCamera.right).toBeCloseTo(13.23, 5);
    expect(smallLighting.shadowCamera.top).toBeCloseTo(13.23, 5);
    expect(smallLighting.shadowCamera.bottom).toBeCloseTo(-13.23, 5);
    expect(smallLighting.shadowCamera.near).toBeCloseTo(0.735, 5);
    expect(smallLighting.shadowCamera.far).toBeCloseTo(58.8, 5);

    expect(largeLighting.shadowCamera.left).toBeCloseTo(-220.5, 5);
    expect(largeLighting.shadowCamera.right).toBeCloseTo(220.5, 5);
    expect(largeLighting.shadowCamera.top).toBeCloseTo(220.5, 5);
    expect(largeLighting.shadowCamera.bottom).toBeCloseTo(-220.5, 5);
    expect(largeLighting.shadowCamera.near).toBeCloseTo(12.25, 5);
    expect(largeLighting.shadowCamera.far).toBeCloseTo(980, 5);

    expect(Math.abs(largeLighting.shadowCamera.left)).toBeGreaterThan(Math.abs(smallLighting.shadowCamera.left));
    expect(largeLighting.shadowCamera.far).toBeGreaterThan(smallLighting.shadowCamera.far);
  });

  it('applies and removes castShadow/receiveShadow on meshes when toggled', () => {
    const { scene, mesh } = createBoxScene([147, 4.6, 75], [0, 2.3, 0]);
    const capture = vi.fn();

    const { rerender } = render(<HookHarness scene={scene} shadowsEnabled={false} onLighting={capture} />);

    expect(mesh.castShadow).toBe(false);
    expect(mesh.receiveShadow).toBe(false);

    rerender(<HookHarness scene={scene} shadowsEnabled onLighting={capture} />);

    expect(mesh.castShadow).toBe(true);
    expect(mesh.receiveShadow).toBe(true);
  });
});
