import type { Meta, StoryObj } from '@storybook/react';
import { Button, Input, Label, Select, SelectOption, Toggle } from '@forge/common';
import { useRef, useState } from 'react';
import type { CameraMode, GridStyle, IThreejsCanvasHandle, IViewportState, OrthoView, VisualMode } from '../../index';
import { ThreejsCanvas } from './ThreejsCanvas';

const meta: Meta<typeof ThreejsCanvas> = {
  title: 'Threejs/ThreejsCanvas',
  component: ThreejsCanvas,
  parameters: {
    fullBleed: true,
  },
};

export default meta;

type Story = StoryObj<typeof ThreejsCanvas>;

const storyWrapperStyle = {
  width: '100%',
  height: '100vh',
};

const BUILDING_OPTIONS = [
  { value: '', label: 'None' },
  { value: '/models/richardson.glb', label: 'Richardson' },
  { value: '/models/bangalore.glb', label: 'Bangalore' },
  { value: '/models/voyager.glb', label: 'Voyager' },
];

const VISUAL_MODE_OPTIONS: Array<{ value: VisualMode; label: string }> = [
  { value: 'original', label: 'Original' },
  { value: 'wire', label: 'Wire' },
];

const CAMERA_MODE_OPTIONS: Array<{ value: CameraMode; label: string }> = [
  { value: 'persp', label: 'Persp' },
  { value: 'ortho', label: 'Ortho' },
];

const ORTHO_VIEW_OPTIONS: Array<{ value: OrthoView; label: string }> = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'front', label: 'Front' },
  { value: 'back', label: 'Back' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

const GRID_STYLE_OPTIONS: Array<{ value: GridStyle; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'lines', label: 'Lines' },
  { value: 'dots', label: 'Dots' },
];

const CAMERA_FOV_MIN = 20;
const CAMERA_FOV_MAX = 120;

function BuildingSwitcherStory() {
  const [modelUrl, setModelUrl] = useState<string | undefined>('/models/richardson.glb');
  const [visualMode, setVisualMode] = useState<VisualMode>('original');
  const [cameraMode, setCameraMode] = useState<CameraMode>('persp');
  const [cameraFov, setCameraFov] = useState(50);
  const [orthoView, setOrthoView] = useState<OrthoView>('front');
  const [gridStyle, setGridStyle] = useState<GridStyle>('none');
  const [sunAzimuth, setSunAzimuth] = useState(45);
  const [sunElevation, setSunElevation] = useState(47);
  const [shadowsEnabled, setShadowsEnabled] = useState(false);
  const [savedViewportState, setSavedViewportState] = useState<IViewportState | null>(null);
  const [loadedViewportState, setLoadedViewportState] = useState<IViewportState | undefined>();
  const [restoreVersion, setRestoreVersion] = useState(0);
  const canvasRef = useRef<IThreejsCanvasHandle>(null);

  return (
    <div style={{ ...storyWrapperStyle, position: 'relative' }}>
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1,
        }}
      >
        <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Select
            id="threejs-canvas-building-switcher"
            size="small"
            value={modelUrl ?? ''}
            onChange={(event) => {
              const nextValue = event.target.value;
              setModelUrl(nextValue ? nextValue : undefined);
            }}
          >
            {BUILDING_OPTIONS.map((option) => (
              <SelectOption key={option.value || 'none'} value={option.value} label={option.label} />
            ))}
          </Select>

          <Select
            id="threejs-canvas-visual-mode-switcher"
            size="small"
            value={visualMode}
            onChange={(event) => {
              setVisualMode(event.target.value as VisualMode);
            }}
          >
            {VISUAL_MODE_OPTIONS.map((option) => (
              <SelectOption key={option.value} value={option.value} label={option.label} />
            ))}
          </Select>

          <Select
            id="threejs-canvas-camera-mode-switcher"
            size="small"
            value={cameraMode}
            onChange={(event) => {
              setCameraMode(event.target.value as CameraMode);
            }}
          >
            {CAMERA_MODE_OPTIONS.map((option) => (
              <SelectOption key={option.value} value={option.value} label={option.label} />
            ))}
          </Select>

          <Select
            id="threejs-canvas-grid-style-switcher"
            size="small"
            value={gridStyle}
            onChange={(event) => {
              setGridStyle(event.target.value as GridStyle);
            }}
          >
            {GRID_STYLE_OPTIONS.map((option) => (
              <SelectOption key={option.value} value={option.value} label={option.label} />
            ))}
          </Select>

          {cameraMode === 'ortho' ? (
            <Select
              id="threejs-canvas-ortho-view-switcher"
              size="small"
              value={orthoView}
              onChange={(event) => {
                setOrthoView(event.target.value as OrthoView);
              }}
            >
              {ORTHO_VIEW_OPTIONS.map((option) => (
                <SelectOption key={option.value} value={option.value} label={option.label} />
              ))}
            </Select>
          ) : null}

          {cameraMode === 'persp' ? (
            <div style={{ display: 'grid', gap: 4 }}>
              <Label htmlFor="threejs-canvas-camera-fov">Camera FOV: {cameraFov}°</Label>
              <Input
                id="threejs-canvas-camera-fov"
                type="range"
                min={CAMERA_FOV_MIN}
                max={CAMERA_FOV_MAX}
                value={cameraFov}
                onChange={(event) => {
                  setCameraFov(Number(event.target.value));
                }}
              />
            </div>
          ) : null}

          <div style={{ display: 'grid', gap: 4 }}>
            <Label htmlFor="threejs-canvas-sun-azimuth">Sun azimuth: {sunAzimuth}°</Label>
            <Input
              id="threejs-canvas-sun-azimuth"
              type="range"
              min={0}
              max={360}
              value={sunAzimuth}
              onChange={(event) => {
                setSunAzimuth(Number(event.target.value));
              }}
            />
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <Label htmlFor="threejs-canvas-sun-elevation">Sun elevation: {sunElevation}°</Label>
            <Input
              id="threejs-canvas-sun-elevation"
              type="range"
              min={0}
              max={90}
              value={sunElevation}
              onChange={(event) => {
                setSunElevation(Number(event.target.value));
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Toggle
              id="threejs-canvas-shadows-toggle"
              checked={shadowsEnabled}
              onChange={(event) => {
                setShadowsEnabled(event.target.checked);
              }}
            />
            <Label htmlFor="threejs-canvas-shadows-toggle">Shadows</Label>
          </div>

          <Button
            size="small"
            variant="primary"
            onClick={() => {
              setSavedViewportState(canvasRef.current?.captureViewportState() ?? null);
            }}
          >
            Save View
          </Button>

          <Button
            size="small"
            variant="secondary"
            disabled={!savedViewportState}
            onClick={() => {
              if (!savedViewportState) {
                return;
              }

              setLoadedViewportState(savedViewportState);
              setRestoreVersion((current) => current + 1);
            }}
          >
            Load Saved View
          </Button>

          <pre
            style={{
              margin: 0,
              maxWidth: 360,
              maxHeight: 220,
              overflow: 'auto',
              backgroundColor: 'rgb(var(--color-canvas))',
              padding: 8,
              fontSize: 12,
              borderRadius: 4,
            }}
          >
            {JSON.stringify(savedViewportState, null, 2) ?? 'null'}
          </pre>
        </div>
      </div>

      <ThreejsCanvas
        key={restoreVersion}
        ref={canvasRef}
        modelUrl={modelUrl}
        visualMode={visualMode}
        cameraMode={cameraMode}
        cameraFov={cameraFov}
        orthoView={orthoView}
        gridStyle={gridStyle}
        sunAzimuth={sunAzimuth}
        sunElevation={sunElevation}
        shadowsEnabled={shadowsEnabled}
        initialViewportState={loadedViewportState}
      />
    </div>
  );
}

export const Default: Story = {
  render: (args) => (
    <div style={storyWrapperStyle}>
      <ThreejsCanvas {...args} />
    </div>
  ),
};

export const WithCustomContent: Story = {
  args: {
    children: 'Custom placeholder content',
  },
  render: (args) => (
    <div style={storyWrapperStyle}>
      <ThreejsCanvas {...args} />
    </div>
  ),
};

export const BuildingSwitcher: Story = {
  render: () => <BuildingSwitcherStory />,
};
