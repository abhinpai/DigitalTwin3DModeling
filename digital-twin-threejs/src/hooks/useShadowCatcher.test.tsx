import { render } from '@testing-library/react';
import { ShadowMaterial } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { useShadowCatcher, type IShadowCatcher } from './useShadowCatcher';

interface IHookHarnessProps {
  maxDimension: number;
  shadowGroundPosition: [number, number, number];
  shadowsEnabled?: boolean;
  onShadowCatcher: (shadowCatcher: IShadowCatcher | null) => void;
}

function HookHarness({ maxDimension, shadowGroundPosition, shadowsEnabled, onShadowCatcher }: IHookHarnessProps) {
  const shadowCatcher = useShadowCatcher({
    maxDimension,
    shadowGroundPosition,
    shadowsEnabled,
  });
  onShadowCatcher(shadowCatcher);
  return null;
}

describe('useShadowCatcher', () => {
  it('creates shadow catcher only when shadows are enabled', () => {
    const capture = vi.fn();

    const { rerender } = render(
      <HookHarness
        maxDimension={14.7}
        shadowGroundPosition={[5, 1.65, -3]}
        shadowsEnabled={false}
        onShadowCatcher={capture}
      />,
    );

    expect(capture).toHaveBeenLastCalledWith(null);

    rerender(
      <HookHarness
        maxDimension={14.7}
        shadowGroundPosition={[5, 1.65, -3]}
        shadowsEnabled
        onShadowCatcher={capture}
      />,
    );

    const enabledShadowCatcher = capture.mock.calls.at(-1)?.[0] as IShadowCatcher;

    expect(enabledShadowCatcher).toBeDefined();
    expect(enabledShadowCatcher.mesh.material).toBeInstanceOf(ShadowMaterial);
    expect(enabledShadowCatcher.mesh.receiveShadow).toBe(true);
  });

  it('scales plane size with maxDimension across small and large models', () => {
    const capture = vi.fn();

    const { rerender } = render(
      <HookHarness
        maxDimension={14.7}
        shadowGroundPosition={[0, 0, 0]}
        shadowsEnabled
        onShadowCatcher={capture}
      />,
    );
    rerender(
      <HookHarness
        maxDimension={245}
        shadowGroundPosition={[0, 0, 0]}
        shadowsEnabled
        onShadowCatcher={capture}
      />,
    );

    const [bangaloreShadowCatcher, voyagerShadowCatcher] = capture.mock.calls
      .map(([value]) => value as IShadowCatcher)
      .filter((value): value is IShadowCatcher => value !== null);

    expect(bangaloreShadowCatcher.extent).toBeCloseTo(14.7 * 8, 5);
    expect(voyagerShadowCatcher.extent).toBeCloseTo(245 * 8, 5);
    expect(voyagerShadowCatcher.extent).toBeGreaterThan(bangaloreShadowCatcher.extent);
  });

  it('uses provided ground position and aligns plane to horizontal ground', () => {
    const capture = vi.fn();

    render(
      <HookHarness
        maxDimension={14.7}
        shadowGroundPosition={[5, 1.65, -3]}
        shadowsEnabled
        onShadowCatcher={capture}
      />,
    );

    const shadowCatcher = capture.mock.calls.at(-1)?.[0] as IShadowCatcher;

    expect(shadowCatcher.position).toEqual([5, 1.65, -3]);
    expect(shadowCatcher.mesh.rotation.x).toBeCloseTo(-Math.PI / 2, 5);
  });

  it('disposes geometry and material on shadows-disabled, model swap, and unmount', () => {
    const capture = vi.fn();

    const { rerender, unmount } = render(
      <HookHarness
        maxDimension={147}
        shadowGroundPosition={[0, 9, 0]}
        shadowsEnabled
        onShadowCatcher={capture}
      />,
    );

    const firstShadowCatcher = capture.mock.calls.at(-1)?.[0] as IShadowCatcher;
    const firstGeometryDisposeSpy = vi.spyOn(firstShadowCatcher.mesh.geometry, 'dispose');
    const firstMaterialDisposeSpy = vi.spyOn(firstShadowCatcher.mesh.material, 'dispose');

    rerender(
      <HookHarness
        maxDimension={147}
        shadowGroundPosition={[0, 9, 0]}
        shadowsEnabled={false}
        onShadowCatcher={capture}
      />,
    );

    expect(firstGeometryDisposeSpy).toHaveBeenCalledTimes(1);
    expect(firstMaterialDisposeSpy).toHaveBeenCalledTimes(1);

    rerender(
      <HookHarness
        maxDimension={245}
        shadowGroundPosition={[0, 27.5, 0]}
        shadowsEnabled
        onShadowCatcher={capture}
      />,
    );

    const secondShadowCatcher = capture.mock.calls.at(-1)?.[0] as IShadowCatcher;
    const secondGeometryDisposeSpy = vi.spyOn(secondShadowCatcher.mesh.geometry, 'dispose');
    const secondMaterialDisposeSpy = vi.spyOn(secondShadowCatcher.mesh.material, 'dispose');

    rerender(
      <HookHarness
        maxDimension={10}
        shadowGroundPosition={[0, 0, 0]}
        shadowsEnabled
        onShadowCatcher={capture}
      />,
    );

    expect(secondGeometryDisposeSpy).toHaveBeenCalledTimes(1);
    expect(secondMaterialDisposeSpy).toHaveBeenCalledTimes(1);

    const currentShadowCatcher = capture.mock.calls.at(-1)?.[0] as IShadowCatcher;
    const currentGeometryDisposeSpy = vi.spyOn(currentShadowCatcher.mesh.geometry, 'dispose');
    const currentMaterialDisposeSpy = vi.spyOn(currentShadowCatcher.mesh.material, 'dispose');

    unmount();

    expect(currentGeometryDisposeSpy).toHaveBeenCalledTimes(1);
    expect(currentMaterialDisposeSpy).toHaveBeenCalledTimes(1);
  });
});
