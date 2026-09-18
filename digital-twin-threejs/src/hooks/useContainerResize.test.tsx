import { act, render, screen } from '@testing-library/react';
import { useContainerResize } from './useContainerResize';
import { beforeEach, describe, expect, it, vi } from 'vitest';

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];

  callback: ResizeObserverCallback;

  observe = vi.fn();

  disconnect = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  emitSize(width: number, height: number) {
    this.callback(
      [{ contentRect: { width, height } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }

  emitEmpty() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

function HookHarness() {
  const { containerRef, containerSize, canRenderCanvas } = useContainerResize();

  return (
    <section ref={containerRef}>
      <output data-testid="width">{containerSize.width}</output>
      <output data-testid="height">{containerSize.height}</output>
      <output data-testid="can-render">{String(canRenderCanvas)}</output>
    </section>
  );
}

describe('useContainerResize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockResizeObserver.instances = [];
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  it('observes container and updates size gate', () => {
    render(<HookHarness />);

    expect(MockResizeObserver.instances[0]?.observe).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('can-render')).toHaveTextContent('false');

    act(() => {
      MockResizeObserver.instances[0]?.emitSize(900, 700);
    });

    expect(screen.getByTestId('width')).toHaveTextContent('900');
    expect(screen.getByTestId('height')).toHaveTextContent('700');
    expect(screen.getByTestId('can-render')).toHaveTextContent('true');
  });

  it('ignores empty resize entries', () => {
    render(<HookHarness />);

    act(() => {
      MockResizeObserver.instances[0]?.emitEmpty();
    });

    expect(screen.getByTestId('width')).toHaveTextContent('0');
    expect(screen.getByTestId('height')).toHaveTextContent('0');
    expect(screen.getByTestId('can-render')).toHaveTextContent('false');
  });

  it('disconnects observer on unmount', () => {
    const { unmount } = render(<HookHarness />);

    unmount();

    expect(MockResizeObserver.instances[0]?.disconnect).toHaveBeenCalledTimes(1);
  });
});
