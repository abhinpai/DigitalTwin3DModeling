import { ThreejsCanvas, type IThreejsCanvasHandle } from '@digital-twin-threejs';
import {
  Bookmark,
  Box,
  Camera,
  Check,
  Grid3X3,
  PanelLeft,
  RotateCcw,
  Rotate3D,
  Sun,
  Warehouse,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type { CameraMode } from '../digital-twin-threejs/src/types/cameraMode';
import type { GridStyle } from '../digital-twin-threejs/src/types/gridStyle';
import type { OrthoView } from '../digital-twin-threejs/src/types/orthoView';
import type { IViewportState } from '../digital-twin-threejs/src/types/viewportState';
import type { VisualMode } from '../digital-twin-threejs/src/types/visualMode';

const MODEL_OPTIONS = [
  { label: 'Bangalore', url: '/models/bangalore.glb' },
  { label: 'Richardson', url: '/models/richardson.glb' },
  { label: 'Voyager', url: '/models/voyager.glb' },
  { label: 'Factory demo', url: '/models/factory.gltf' },
] as const;

const DEFAULT_MODEL_URL = MODEL_OPTIONS[0].url;
const SAVED_VIEWS_KEY = 'digital-twin-workbench:saved-views:v1';

const modes: Array<{ value: VisualMode; label: string }> = [
  { value: 'original', label: 'Surface' },
  { value: 'wire', label: 'Wireframe' },
];

const grids: Array<{ value: GridStyle; label: string }> = [
  { value: 'none', label: 'Off' },
  { value: 'lines', label: 'Lines' },
  { value: 'dots', label: 'Points' },
];

const cameraModes: Array<{ value: CameraMode; label: string }> = [
  { value: 'persp', label: 'Perspective' },
  { value: 'ortho', label: 'Orthographic' },
];

const orthoViews: Array<{ value: OrthoView; label: string }> = [
  { value: 'front', label: 'Front' },
  { value: 'back', label: 'Back' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
];

type SavedViews = Record<string, IViewportState>;

function readSavedViews(): SavedViews {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const value = JSON.parse(window.localStorage.getItem(SAVED_VIEWS_KEY) ?? '{}') as SavedViews;
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function cloneViewportState(state: IViewportState): IViewportState {
  return {
    ...state,
    camera: {
      ...state.camera,
      position: [...state.camera.position],
      target: [...state.camera.target],
    },
  };
}

export function App() {
  const canvasRef = useRef<IThreejsCanvasHandle>(null);
  const [savedViews, setSavedViews] = useState<SavedViews>(readSavedViews);
  const initialSavedView = savedViews[DEFAULT_MODEL_URL];
  const [modelUrl, setModelUrl] = useState<string>(DEFAULT_MODEL_URL);
  const [visualMode, setVisualMode] = useState<VisualMode>(initialSavedView?.visualMode ?? 'original');
  const [cameraMode, setCameraMode] = useState<CameraMode>(initialSavedView?.cameraMode ?? 'persp');
  const [cameraFov, setCameraFov] = useState(initialSavedView?.cameraFov ?? 50);
  const [orthoView, setOrthoView] = useState<OrthoView>(initialSavedView?.orthoView ?? 'front');
  const [gridStyle, setGridStyle] = useState<GridStyle>(initialSavedView?.gridStyle ?? 'lines');
  const [sunAzimuth, setSunAzimuth] = useState(initialSavedView?.sunAzimuth ?? 132);
  const [sunElevation, setSunElevation] = useState(initialSavedView?.sunElevation ?? 42);
  const [shadowsEnabled, setShadowsEnabled] = useState(initialSavedView?.shadowsEnabled ?? true);
  const [initialViewportState, setInitialViewportState] = useState<IViewportState | undefined>(
    initialSavedView ? cloneViewportState(initialSavedView) : undefined,
  );
  const [viewStatus, setViewStatus] = useState<'idle' | 'saved' | 'restored'>(initialSavedView ? 'restored' : 'idle');
  const [panelOpen, setPanelOpen] = useState(false);

  const activeModel = MODEL_OPTIONS.find((model) => model.url === modelUrl) ?? MODEL_OPTIONS[0];
  const hasSavedView = Boolean(savedViews[modelUrl]);

  const applyViewportState = (state: IViewportState) => {
    setVisualMode(state.visualMode);
    setCameraMode(state.cameraMode);
    setCameraFov(state.cameraFov);
    setOrthoView(state.orthoView);
    setGridStyle(state.gridStyle);
    setSunAzimuth(state.sunAzimuth);
    setSunElevation(state.sunElevation);
    setShadowsEnabled(state.shadowsEnabled);
    setInitialViewportState(cloneViewportState(state));
  };

  const handleModelChange = (nextModelUrl: string) => {
    const savedView = savedViews[nextModelUrl];

    if (savedView) {
      applyViewportState(savedView);
      setViewStatus('restored');
    } else {
      setInitialViewportState(undefined);
      setViewStatus('idle');
    }

    setModelUrl(nextModelUrl);
  };

  const handleSaveView = () => {
    const state = canvasRef.current?.captureViewportState();

    if (!state) {
      return;
    }

    const nextSavedViews = { ...savedViews, [modelUrl]: state };
    setSavedViews(nextSavedViews);
    window.localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(nextSavedViews));
    setViewStatus('saved');
  };

  const handleRestoreView = () => {
    const savedView = savedViews[modelUrl];

    if (!savedView) {
      return;
    }

    applyViewportState(savedView);
    setViewStatus('restored');
  };

  return (
    <main className="workbench">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><Warehouse size={18} /></span>
          <div>
            <p className="eyebrow">Digital twin / Live workspace</p>
            <h1>{activeModel.label}</h1>
          </div>
        </div>

        <label className="model-picker">
          <span>Active model</span>
          <select value={modelUrl} onChange={(event) => handleModelChange(event.target.value)}>
            {MODEL_OPTIONS.map((model) => (
              <option key={model.url} value={model.url}>{model.label}</option>
            ))}
          </select>
        </label>

        <div className="header-actions">
          <div className="system-state" role="status">
            <span className="status-dot" />
            <span>Live model</span>
          </div>
          <button
            className="panel-toggle"
            type="button"
            aria-label="Open viewport controls"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen(true)}
          >
            <PanelLeft size={18} />
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className={panelOpen ? 'control-panel open' : 'control-panel'} aria-label="Viewport controls">
          <div className="control-panel-heading">
            <div>
              <p>Viewport</p>
              <h2>Scene controls</h2>
            </div>
            <button type="button" aria-label="Close viewport controls" onClick={() => setPanelOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="control-panel-body">
            <fieldset className="control-section">
              <legend><Rotate3D size={15} /> Appearance</legend>
              <div className="segmented-control two-up">
                {modes.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    className={visualMode === mode.value ? 'active' : ''}
                    onClick={() => setVisualMode(mode.value)}
                    aria-pressed={visualMode === mode.value}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="control-section">
              <legend><Grid3X3 size={15} /> Model grid</legend>
              <div className="segmented-control three-up">
                {grids.map((grid) => (
                  <button
                    key={grid.value}
                    type="button"
                    className={gridStyle === grid.value ? 'active' : ''}
                    onClick={() => setGridStyle(grid.value)}
                    aria-pressed={gridStyle === grid.value}
                  >
                    {grid.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="control-section">
              <legend><Camera size={15} /> Camera</legend>
              <div className="segmented-control two-up">
                {cameraModes.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    className={cameraMode === mode.value ? 'active' : ''}
                    onClick={() => setCameraMode(mode.value)}
                    aria-pressed={cameraMode === mode.value}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {cameraMode === 'persp' ? (
                <label className="range-control">
                  <span><span>Field of view</span><output>{cameraFov}°</output></span>
                  <input type="range" min="20" max="120" value={cameraFov} onChange={(event) => setCameraFov(Number(event.target.value))} />
                </label>
              ) : (
                <label className="select-control">
                  <span>Orientation</span>
                  <select value={orthoView} onChange={(event) => setOrthoView(event.target.value as OrthoView)}>
                    {orthoViews.map((view) => <option key={view.value} value={view.value}>{view.label}</option>)}
                  </select>
                </label>
              )}
            </fieldset>

            <fieldset className="control-section">
              <legend><Sun size={15} /> Environment</legend>
              <label className="range-control">
                <span><span>Sun azimuth</span><output>{sunAzimuth}°</output></span>
                <input type="range" min="0" max="360" value={sunAzimuth} onChange={(event) => setSunAzimuth(Number(event.target.value))} />
              </label>
              <label className="range-control">
                <span><span>Sun elevation</span><output>{sunElevation}°</output></span>
                <input type="range" min="0" max="90" value={sunElevation} onChange={(event) => setSunElevation(Number(event.target.value))} />
              </label>
              <label className="toggle-control">
                <span>
                  <strong>Cast shadows</strong>
                  <small>Ground and object shadows</small>
                </span>
                <input type="checkbox" checked={shadowsEnabled} onChange={(event) => setShadowsEnabled(event.target.checked)} />
              </label>
            </fieldset>
          </div>

          <div className="saved-view-actions">
            <div className="saved-view-status">
              {viewStatus === 'saved' ? <><Check size={13} /> View saved</> : null}
              {viewStatus === 'restored' ? <><Check size={13} /> Saved view active</> : null}
              {viewStatus === 'idle' ? 'No saved view for this model' : null}
            </div>
            <div className="action-row">
              <button type="button" className="primary-action" onClick={handleSaveView}>
                <Bookmark size={16} /> Save view
              </button>
              <button
                type="button"
                className="secondary-action"
                disabled={!hasSavedView}
                onClick={handleRestoreView}
                title="Restore saved view"
              >
                <RotateCcw size={16} />
                <span>Restore</span>
              </button>
            </div>
          </div>
        </aside>

        {panelOpen ? <button className="panel-scrim" type="button" aria-label="Close viewport controls" onClick={() => setPanelOpen(false)} /> : null}

        <section className="viewport-shell" aria-label="Digital twin viewport">
          <ThreejsCanvas
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
            initialViewportState={initialViewportState}
            className="twin-canvas"
          />

          <div className="view-label" aria-hidden="true">
            <Box size={13} />
            <span>{cameraMode === 'persp' ? 'Perspective' : orthoView}</span>
          </div>
        </section>
      </div>
    </main>
  );
}
