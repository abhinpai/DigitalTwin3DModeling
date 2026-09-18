import { render, screen } from '@testing-library/react';
import { createRef, forwardRef, type ForwardedRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ThreejsCanvas } from './ThreejsCanvas';
import type { IViewportState } from '../../types/viewportState';

const { captureViewportStateMock } = vi.hoisted(() => ({
  captureViewportStateMock: vi.fn(),
}));

const threeJsRenderMock = vi.fn(({ modelUrl, className }: { modelUrl: string; className?: string; visualMode?: string; cameraMode?: string }) => (
  <div data-testid="threejs-render" data-model-url={modelUrl} className={className} />
));

vi.mock('../ThreeJsRender/ThreeJsRender', () => {
  const MockThreeJsRender = forwardRef((props: {
    modelUrl: string;
    className?: string;
    visualMode?: string;
    cameraMode?: string;
    cameraFov?: number;
    orthoView?: string;
    gridStyle?: string;
    sunAzimuth?: number;
    sunElevation?: number;
    shadowsEnabled?: boolean;
    selectedNodeIds?: string[];
    hiddenNodeIds?: string[];
    onStageTreeChange?: (root: unknown) => void;
    onNodeSelect?: (id: string | null) => void;
    initialViewportState?: IViewportState;
  }, ref: ForwardedRef<{ captureViewportState: () => IViewportState | null }>) => {
    if (typeof ref === 'function') {
      ref({ captureViewportState: captureViewportStateMock });
    } else if (ref && 'current' in ref) {
      ref.current = { captureViewportState: captureViewportStateMock };
    }

    const { initialViewportState, ...rest } = props;

    return threeJsRenderMock(initialViewportState === undefined ? rest : { ...rest, initialViewportState });
  });

  MockThreeJsRender.displayName = 'MockThreeJsRender';

  return {
    ThreeJsRender: MockThreeJsRender,
  };
});

describe('ThreejsCanvas', () => {
  it('renders default placeholder text when modelUrl is not provided', () => {
    render(<ThreejsCanvas />);

    expect(screen.getByLabelText('Three.js viewport placeholder')).toBeInTheDocument();
    expect(screen.getByText('Waiting for a 3D model to render.')).toBeInTheDocument();
  });

  it('renders children instead of default placeholder text', () => {
    render(<ThreejsCanvas>Ready for custom content</ThreejsCanvas>);

    expect(screen.getByText('Ready for custom content')).toBeInTheDocument();
    expect(screen.queryByText('Waiting for a 3D model to render.')).not.toBeInTheDocument();
  });

  it('renders ThreeJsRender when modelUrl is provided', () => {
    render(<ThreejsCanvas modelUrl="/building-a.glb" className="my-canvas" />);

    expect(screen.getByTestId('threejs-render')).toHaveAttribute('data-model-url', '/building-a.glb');
    expect(threeJsRenderMock).toHaveBeenCalledWith({
      modelUrl: '/building-a.glb',
      className: 'my-canvas',
      visualMode: 'original',
      cameraMode: 'persp',
      cameraFov: 50,
      orthoView: 'front',
      gridStyle: 'none',
      sunAzimuth: undefined,
      sunElevation: undefined,
      shadowsEnabled: false,
      selectedNodeIds: undefined,
      hiddenNodeIds: undefined,
      onStageTreeChange: undefined,
      onNodeSelect: undefined,
    });
    expect(screen.queryByLabelText('Three.js viewport placeholder')).not.toBeInTheDocument();
  });

  it('forwards visualMode to ThreeJsRender', () => {
    render(<ThreejsCanvas modelUrl="/building-a.glb" visualMode="wire" />);

    expect(threeJsRenderMock).toHaveBeenCalledWith({
      modelUrl: '/building-a.glb',
      className: undefined,
      visualMode: 'wire',
      cameraMode: 'persp',
      cameraFov: 50,
      orthoView: 'front',
      gridStyle: 'none',
      sunAzimuth: undefined,
      sunElevation: undefined,
      shadowsEnabled: false,
      selectedNodeIds: undefined,
      hiddenNodeIds: undefined,
      onStageTreeChange: undefined,
      onNodeSelect: undefined,
    });
  });

  it('forwards cameraMode to ThreeJsRender', () => {
    render(<ThreejsCanvas modelUrl="/building-a.glb" cameraMode="ortho" />);

    expect(threeJsRenderMock).toHaveBeenCalledWith({
      modelUrl: '/building-a.glb',
      className: undefined,
      visualMode: 'original',
      cameraMode: 'ortho',
      cameraFov: 50,
      orthoView: 'front',
      gridStyle: 'none',
      sunAzimuth: undefined,
      sunElevation: undefined,
      shadowsEnabled: false,
      selectedNodeIds: undefined,
      hiddenNodeIds: undefined,
      onStageTreeChange: undefined,
      onNodeSelect: undefined,
    });
  });

  it('forwards orthoView to ThreeJsRender', () => {
    render(<ThreejsCanvas modelUrl="/building-a.glb" cameraMode="ortho" orthoView="top" />);

    expect(threeJsRenderMock).toHaveBeenCalledWith({
      modelUrl: '/building-a.glb',
      className: undefined,
      visualMode: 'original',
      cameraMode: 'ortho',
      cameraFov: 50,
      orthoView: 'top',
      gridStyle: 'none',
      sunAzimuth: undefined,
      sunElevation: undefined,
      shadowsEnabled: false,
      selectedNodeIds: undefined,
      hiddenNodeIds: undefined,
      onStageTreeChange: undefined,
      onNodeSelect: undefined,
    });
  });

  it('forwards gridStyle to ThreeJsRender', () => {
    render(<ThreejsCanvas modelUrl="/building-a.glb" gridStyle="dots" />);

    expect(threeJsRenderMock).toHaveBeenCalledWith({
      modelUrl: '/building-a.glb',
      className: undefined,
      visualMode: 'original',
      cameraMode: 'persp',
      cameraFov: 50,
      orthoView: 'front',
      gridStyle: 'dots',
      sunAzimuth: undefined,
      sunElevation: undefined,
      shadowsEnabled: false,
      selectedNodeIds: undefined,
      hiddenNodeIds: undefined,
      onStageTreeChange: undefined,
      onNodeSelect: undefined,
    });
  });

  it('forwards sun and shadow controls to ThreeJsRender', () => {
    render(<ThreejsCanvas modelUrl="/building-a.glb" sunAzimuth={120} sunElevation={35} shadowsEnabled />);

    expect(threeJsRenderMock).toHaveBeenCalledWith({
      modelUrl: '/building-a.glb',
      className: undefined,
      visualMode: 'original',
      cameraMode: 'persp',
      cameraFov: 50,
      orthoView: 'front',
      gridStyle: 'none',
      sunAzimuth: 120,
      sunElevation: 35,
      shadowsEnabled: true,
      selectedNodeIds: undefined,
      hiddenNodeIds: undefined,
      onStageTreeChange: undefined,
      onNodeSelect: undefined,
    });
  });

  it('forwards cameraFov to ThreeJsRender', () => {
    render(<ThreejsCanvas modelUrl="/building-a.glb" cameraFov={80} />);

    expect(threeJsRenderMock).toHaveBeenCalledWith({
      modelUrl: '/building-a.glb',
      className: undefined,
      visualMode: 'original',
      cameraMode: 'persp',
      cameraFov: 80,
      orthoView: 'front',
      gridStyle: 'none',
      sunAzimuth: undefined,
      sunElevation: undefined,
      shadowsEnabled: false,
      selectedNodeIds: undefined,
      hiddenNodeIds: undefined,
      onStageTreeChange: undefined,
      onNodeSelect: undefined,
    });
  });

  it('forwards stage tree props to ThreeJsRender', () => {
    const onStageTreeChange = vi.fn();

    render(
      <ThreejsCanvas
        modelUrl="/building-a.glb"
        selectedNodeIds={['selected-id']}
        hiddenNodeIds={['hidden-id']}
        onStageTreeChange={onStageTreeChange}
      />,
    );

    expect(threeJsRenderMock).toHaveBeenCalledWith({
      modelUrl: '/building-a.glb',
      className: undefined,
      visualMode: 'original',
      cameraMode: 'persp',
      cameraFov: 50,
      orthoView: 'front',
      gridStyle: 'none',
      sunAzimuth: undefined,
      sunElevation: undefined,
      shadowsEnabled: false,
      selectedNodeIds: ['selected-id'],
      hiddenNodeIds: ['hidden-id'],
      onStageTreeChange,
      onNodeSelect: undefined,
    });
  });

  it('forwards onNodeSelect to ThreeJsRender', () => {
    const onNodeSelect = vi.fn();

    render(<ThreejsCanvas modelUrl="/building-a.glb" onNodeSelect={onNodeSelect} />);

    expect(threeJsRenderMock).toHaveBeenCalledWith({
      modelUrl: '/building-a.glb',
      className: undefined,
      visualMode: 'original',
      cameraMode: 'persp',
      cameraFov: 50,
      orthoView: 'front',
      gridStyle: 'none',
      sunAzimuth: undefined,
      sunElevation: undefined,
      shadowsEnabled: false,
      selectedNodeIds: undefined,
      hiddenNodeIds: undefined,
      onStageTreeChange: undefined,
      onNodeSelect,
    });
  });

  it('applies an optional custom className', () => {
    render(<ThreejsCanvas className="my-canvas" />);

    expect(screen.getByLabelText('Three.js viewport placeholder')).toHaveClass('my-canvas');
  });

  it('uses full-size, overflow-hidden placeholder viewport styles', () => {
    render(<ThreejsCanvas />);

    const canvas = screen.getByLabelText('Three.js viewport placeholder');
    expect(canvas).toHaveClass('h-full', 'w-full', 'overflow-hidden');
    expect(canvas).not.toHaveClass('min-h-64', 'rounded-md');
  });

  it('does not include falsey className values in the class list', () => {
    render(<ThreejsCanvas className="" />);

    const canvas = screen.getByLabelText('Three.js viewport placeholder');
    expect(canvas.className).not.toContain('undefined');
    expect(canvas.className).not.toContain('null');
  });

  it('forwards initialViewportState to ThreeJsRender', () => {
    const initialViewportState: IViewportState = {
      schemaVersion: 1,
      visualMode: 'wire',
      cameraMode: 'ortho',
      cameraFov: 77,
      orthoView: 'left',
      gridStyle: 'dots',
      sunAzimuth: 200,
      sunElevation: 10,
      shadowsEnabled: true,
      camera: {
        position: [1, 2, 3],
        target: [4, 5, 6],
        zoom: 7,
      },
    };

    render(<ThreejsCanvas modelUrl="/building-a.glb" initialViewportState={initialViewportState} />);

    expect(threeJsRenderMock).toHaveBeenCalledWith({
      modelUrl: '/building-a.glb',
      className: undefined,
      visualMode: 'original',
      cameraMode: 'persp',
      cameraFov: 50,
      orthoView: 'front',
      gridStyle: 'none',
      sunAzimuth: undefined,
      sunElevation: undefined,
      shadowsEnabled: false,
      selectedNodeIds: undefined,
      hiddenNodeIds: undefined,
      onStageTreeChange: undefined,
      onNodeSelect: undefined,
      initialViewportState,
    });
  });

  it('returns null from captureViewportState in idle placeholder state', () => {
    const ref = createRef<{ captureViewportState: () => IViewportState | null }>();

    render(<ThreejsCanvas ref={ref} />);

    expect(ref.current?.captureViewportState()).toBeNull();
  });

  it('delegates captureViewportState to ThreeJsRender handle when model is loaded', () => {
    const capturedState: IViewportState = {
      schemaVersion: 1,
      visualMode: 'original',
      cameraMode: 'persp',
      cameraFov: 50,
      orthoView: 'front',
      gridStyle: 'none',
      sunAzimuth: 45,
      sunElevation: 47,
      shadowsEnabled: false,
      camera: {
        position: [10, 20, 30],
        target: [0, 0, 0],
        zoom: 1,
      },
    };
    captureViewportStateMock.mockReturnValue(capturedState);
    const ref = createRef<{ captureViewportState: () => IViewportState | null }>();

    render(<ThreejsCanvas ref={ref} modelUrl="/building-a.glb" />);

    expect(ref.current?.captureViewportState()).toEqual(capturedState);
    expect(captureViewportStateMock).toHaveBeenCalledTimes(1);
  });
});
