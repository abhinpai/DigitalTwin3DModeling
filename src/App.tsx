import { ThreejsCanvas, type IThreejsCanvasHandle } from '@digital-twin-threejs';
import {
  Bookmark,
  Box,
  Camera,
  Check,
  Menu,
  Moon,
  RotateCcw,
  Rotate3D,
  Sun,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CameraMode } from '../digital-twin-threejs/src/types/cameraMode';
import type { EnvironmentPreset } from '../digital-twin-threejs/src/types/environmentPreset';
import type { GridStyle } from '../digital-twin-threejs/src/types/gridStyle';
import type { LightingPreset } from '../digital-twin-threejs/src/types/lightingPreset';
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
const THEME_STORAGE_KEY = 'digital-twin-workbench:theme';

const modes: Array<{ value: VisualMode; label: string }> = [
  { value: 'original', label: 'Surface' },
  { value: 'wire', label: 'Wireframe' },
];

const grids: Array<{ value: GridStyle; label: string }> = [
  { value: 'none', label: 'Off' },
  { value: 'lines', label: 'Lines' },
  { value: 'dots', label: 'Points' },
];

const environmentPresets: Array<{ value: EnvironmentPreset; label: string }> = [
  { value: 'studio', label: 'Studio' },
  { value: 'ground', label: 'Ground' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'asphalt', label: 'Asphalt' },
  { value: 'grid', label: 'Grid' },
  { value: 'points', label: 'Points' },
];

const lightingPresets: Array<{ value: LightingPreset; label: string }> = [
  { value: 'natural', label: 'Natural daylight' },
  { value: 'directional', label: 'Directional sun' },
  { value: 'ambient', label: 'Ambient fill' },
  { value: 'hemisphere', label: 'Sky hemisphere' },
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
type Theme = 'light' | 'dark';

function readTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

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

const selectClassName = 'h-9 min-w-40 cursor-pointer rounded-[7px] border border-forge-line-strong bg-forge-input px-3 pr-8 text-sm text-forge-text outline-none hover:border-forge-icon focus-visible:border-forge-accent focus-visible:ring-2 focus-visible:ring-forge-accent/20';
const segmentGroupClassName = 'grid w-full overflow-hidden rounded-md border border-forge-line bg-forge-segment';
const segmentButtonBaseClassName = 'h-[33px] min-w-0 border-r border-forge-line px-1 text-[0.69rem] font-medium text-forge-muted transition-colors last:border-r-0 hover:bg-forge-hover hover:text-forge-text';

function segmentButtonClassName(active: boolean) {
  return `${segmentButtonBaseClassName} ${active ? 'bg-forge-accent text-white hover:bg-forge-accent-hover hover:text-white' : 'bg-transparent'}`;
}

export function App() {
  const canvasRef = useRef<IThreejsCanvasHandle>(null);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [savedViews, setSavedViews] = useState<SavedViews>(readSavedViews);
  const initialSavedView = savedViews[DEFAULT_MODEL_URL];
  const [modelUrl, setModelUrl] = useState<string>(DEFAULT_MODEL_URL);
  const [visualMode, setVisualMode] = useState<VisualMode>(initialSavedView?.visualMode ?? 'original');
  const [cameraMode, setCameraMode] = useState<CameraMode>(initialSavedView?.cameraMode ?? 'persp');
  const [cameraFov, setCameraFov] = useState(initialSavedView?.cameraFov ?? 50);
  const [orthoView, setOrthoView] = useState<OrthoView>(initialSavedView?.orthoView ?? 'front');
  const [gridStyle, setGridStyle] = useState<GridStyle>(initialSavedView?.gridStyle ?? 'lines');
  const [gridExtentScale, setGridExtentScale] = useState(initialSavedView?.gridExtentScale ?? 1);
  const [environmentPreset, setEnvironmentPreset] = useState<EnvironmentPreset>(initialSavedView?.environmentPreset ?? 'grid');
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>(initialSavedView?.lightingPreset ?? 'natural');
  const [sunAzimuth, setSunAzimuth] = useState(initialSavedView?.sunAzimuth ?? 132);
  const [sunElevation, setSunElevation] = useState(initialSavedView?.sunElevation ?? 42);
  const [shadowsEnabled, setShadowsEnabled] = useState(initialSavedView?.shadowsEnabled ?? true);
  const [initialViewportState, setInitialViewportState] = useState<IViewportState | undefined>(
    initialSavedView ? cloneViewportState(initialSavedView) : undefined,
  );
  const [viewStatus, setViewStatus] = useState<'idle' | 'saved' | 'restored'>(initialSavedView ? 'restored' : 'idle');
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const activeModel = MODEL_OPTIONS.find((model) => model.url === modelUrl) ?? MODEL_OPTIONS[0];
  const hasSavedView = Boolean(savedViews[modelUrl]);

  useEffect(() => {
    const root = document.documentElement;
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

    root.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);

    if (themeColor) {
      themeColor.content = theme === 'dark' ? '#080c11' : '#ebeff4';
    }
  }, [theme]);

  const applyViewportState = (state: IViewportState) => {
    setVisualMode(state.visualMode);
    setCameraMode(state.cameraMode);
    setCameraFov(state.cameraFov);
    setOrthoView(state.orthoView);
    setGridStyle(state.gridStyle);
    setGridExtentScale(state.gridExtentScale ?? 1);
    setEnvironmentPreset(state.environmentPreset ?? 'grid');
    setLightingPreset(state.lightingPreset ?? 'natural');
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

  const legendClassName = 'mb-3 flex w-full items-center gap-2 p-0 text-[0.64rem] font-semibold uppercase text-forge-muted-strong [&_svg]:text-forge-icon [&_svg]:[stroke-width:1.7]';
  const sectionClassName = 'm-0 border-0 border-b border-forge-line-soft px-3.5 py-4';
  const controlLabelClassName = 'mb-2 block font-mono text-[0.58rem] font-medium uppercase text-forge-muted';
  const rangeLabelClassName = 'mt-3.5 grid gap-2 text-[0.69rem] text-forge-muted';

  return (
    <main className="grid h-full min-h-[560px] w-full grid-rows-[54px_minmax(0,1fr)] overflow-hidden bg-forge-canvas text-forge-text max-[480px]:min-h-[480px] max-[480px]:grid-rows-[52px_minmax(0,1fr)]">
      <header className="relative z-20 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 border border-forge-line bg-forge-header pr-3.5 transition-colors duration-200 max-[760px]:gap-2 max-[760px]:pr-2.5">
        <div className="flex h-full min-w-[260px] items-center max-[760px]:min-w-0">
          <button
            className="grid h-full w-[54px] flex-none place-items-center border-0 border-r border-forge-line-soft bg-transparent p-0 text-forge-text hover:bg-forge-hover max-[480px]:w-12"
            type="button"
            aria-label="Toggle viewport controls"
            title="Toggle viewport controls"
            onClick={() => {
              if (window.matchMedia('(max-width: 760px)').matches) {
                setPanelOpen(true);
              } else {
                setPanelCollapsed((current) => !current);
              }
            }}
          >
            <Menu size={21} />
          </button>
          <div className="flex items-center gap-2 whitespace-nowrap px-3.5 max-[480px]:px-2">
            <span className="text-sm font-semibold text-forge-brand max-[480px]:text-[0.8rem]">FORGE</span>
            <span className="text-sm font-medium text-forge-text max-[760px]:hidden">DIGITAL TWIN</span>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2.5">
          <label className="flex min-w-0 items-center gap-2">
            <span className="font-mono text-[0.62rem] font-medium uppercase text-forge-muted max-[760px]:hidden">Model</span>
            <select
              className={`${selectClassName} max-[760px]:min-w-[124px] max-[760px]:max-w-[36vw] max-[480px]:h-8 max-[480px]:text-[0.71rem]`}
              value={modelUrl}
              onChange={(event) => handleModelChange(event.target.value)}
            >
              {MODEL_OPTIONS.map((model) => <option key={model.url} value={model.url}>{model.label}</option>)}
            </select>
          </label>
          <button
            className="grid h-[34px] w-[34px] place-items-center rounded-md border border-forge-line bg-forge-input p-0 text-forge-muted-strong hover:border-forge-icon hover:text-forge-text max-[480px]:h-8 max-[480px]:w-8"
            type="button"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      <div className={`relative grid min-h-0 transition-[grid-template-columns] duration-200 max-[760px]:grid-cols-1 ${panelCollapsed ? 'grid-cols-[0_minmax(0,1fr)]' : 'grid-cols-[272px_minmax(0,1fr)]'}`}>
        <aside
          className={`relative z-10 grid min-h-0 min-w-[272px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-r border-forge-line bg-forge-surface shadow-panel transition-transform duration-200 ease-out max-[760px]:absolute max-[760px]:inset-y-0 max-[760px]:left-0 max-[760px]:z-20 max-[760px]:w-[min(272px,calc(100vw-44px))] ${panelCollapsed ? 'min-[761px]:invisible min-[761px]:-translate-x-full' : ''} ${panelOpen ? 'max-[760px]:translate-x-0' : 'max-[760px]:-translate-x-[102%]'}`}
          aria-label="Viewport controls"
        >
          <div className="flex min-h-[64px] items-center justify-between border-b border-forge-line bg-forge-soft/35 px-3.5">
            <div>
              <p className="mb-1 mt-0 font-mono text-[0.57rem] font-medium uppercase text-forge-muted">Viewport inspector</p>
              <h2 className="m-0 text-[0.86rem] font-semibold">{activeModel.label}</h2>
            </div>
            <button
              className="hidden h-[34px] w-[34px] place-items-center rounded-md border border-forge-line bg-forge-input p-0 text-forge-muted-strong hover:border-forge-icon hover:text-forge-text max-[760px]:grid"
              type="button"
              aria-label="Close viewport controls"
              onClick={() => setPanelOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="forge-scrollbar overflow-y-auto">
            <fieldset className={sectionClassName}>
              <legend className={legendClassName}><Rotate3D size={15} /> Display</legend>
              <span className={controlLabelClassName}>Rendering</span>
              <div className={`${segmentGroupClassName} grid-cols-2`}>
                {modes.map((mode) => (
                  <button key={mode.value} type="button" className={segmentButtonClassName(visualMode === mode.value)} onClick={() => setVisualMode(mode.value)} aria-pressed={visualMode === mode.value}>
                    {mode.label}
                  </button>
                ))}
              </div>
              <span className={`${controlLabelClassName} mb-2 mt-3.5`}>Grid overlay</span>
              <div className={`${segmentGroupClassName} grid-cols-3`}>
                {grids.map((grid) => (
                  <button key={grid.value} type="button" className={segmentButtonClassName(gridStyle === grid.value)} onClick={() => setGridStyle(grid.value)} aria-pressed={gridStyle === grid.value}>
                    {grid.label}
                  </button>
                ))}
              </div>
              {gridStyle !== 'none' ? (
                <label className={rangeLabelClassName}>
                  <span className="flex justify-between"><span>Grid extent</span><output className="font-mono text-[0.66rem] font-medium text-forge-text">{gridExtentScale.toFixed(2)}x</output></span>
                  <input className="forge-range" type="range" min="0.5" max="5" step="0.25" value={gridExtentScale} onChange={(event) => setGridExtentScale(Number(event.target.value))} />
                </label>
              ) : null}
              <label className="mt-3.5 grid gap-2 text-[0.69rem] text-forge-muted">
                <span className={controlLabelClassName}>Environment base</span>
                <select
                  className={`${selectClassName} w-full`}
                  value={environmentPreset}
                  onChange={(event) => {
                    const nextPreset = event.target.value as EnvironmentPreset;
                    setEnvironmentPreset(nextPreset);
                    setGridStyle(nextPreset === 'grid' ? 'lines' : nextPreset === 'points' ? 'dots' : 'none');
                  }}
                >
                  {environmentPresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
                </select>
              </label>
            </fieldset>

            <fieldset className={sectionClassName}>
              <legend className={legendClassName}><Camera size={15} /> Camera</legend>
              <span className={controlLabelClassName}>Projection</span>
              <div className={`${segmentGroupClassName} grid-cols-2`}>
                {cameraModes.map((mode) => (
                  <button key={mode.value} type="button" className={segmentButtonClassName(cameraMode === mode.value)} onClick={() => setCameraMode(mode.value)} aria-pressed={cameraMode === mode.value}>
                    {mode.label}
                  </button>
                ))}
              </div>

              {cameraMode === 'persp' ? (
                <label className={rangeLabelClassName}>
                  <span className="flex justify-between"><span>Field of view</span><output className="font-mono text-[0.66rem] font-medium text-forge-text">{cameraFov}°</output></span>
                  <input className="forge-range" type="range" min="20" max="120" value={cameraFov} onChange={(event) => setCameraFov(Number(event.target.value))} />
                </label>
              ) : (
                <label className="mt-[13px] grid gap-[7px] text-[0.69rem] text-forge-muted">
                  <span>Orientation</span>
                  <select className={`${selectClassName} w-full`} value={orthoView} onChange={(event) => setOrthoView(event.target.value as OrthoView)}>
                    {orthoViews.map((view) => <option key={view.value} value={view.value}>{view.label}</option>)}
                  </select>
                </label>
              )}
            </fieldset>

            <fieldset className={sectionClassName}>
              <legend className={legendClassName}><Sun size={15} /> Lighting</legend>
              <label className="grid gap-2 text-[0.69rem] text-forge-muted">
                <span className={controlLabelClassName}>Light rig</span>
                <select className={`${selectClassName} w-full`} value={lightingPreset} onChange={(event) => setLightingPreset(event.target.value as LightingPreset)}>
                  {lightingPresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
                </select>
              </label>
              {lightingPreset === 'natural' || lightingPreset === 'directional' ? (
                <>
                  <label className={rangeLabelClassName}>
                    <span className="flex justify-between"><span>Sun azimuth</span><output className="font-mono text-[0.66rem] font-medium text-forge-text">{sunAzimuth}°</output></span>
                    <input className="forge-range" type="range" min="0" max="360" value={sunAzimuth} onChange={(event) => setSunAzimuth(Number(event.target.value))} />
                  </label>
                  <label className={rangeLabelClassName}>
                    <span className="flex justify-between"><span>Sun elevation</span><output className="font-mono text-[0.66rem] font-medium text-forge-text">{sunElevation}°</output></span>
                    <input className="forge-range" type="range" min="0" max="90" value={sunElevation} onChange={(event) => setSunElevation(Number(event.target.value))} />
                  </label>
                  <label className="mt-3.5 flex min-h-10 cursor-pointer items-center justify-between gap-2.5 border-t border-forge-line-soft pt-3.5">
                    <span className="grid gap-0.5">
                      <strong className="text-[0.7rem] font-medium">Cast shadows</strong>
                      <small className="text-[0.62rem] text-forge-muted">Ground and object shadows</small>
                    </span>
                    <span className={`relative h-5 w-9 flex-none rounded-full border transition-colors ${shadowsEnabled ? 'border-forge-accent bg-forge-accent' : 'border-forge-line-strong bg-forge-segment'}`}>
                      <input className="peer sr-only" type="checkbox" checked={shadowsEnabled} onChange={(event) => setShadowsEnabled(event.target.checked)} />
                      <span className={`absolute top-[3px] h-3 w-3 rounded-full bg-white shadow transition-transform ${shadowsEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                    </span>
                  </label>
                </>
              ) : null}
            </fieldset>
          </div>

          <div className="border-t border-forge-line bg-forge-footer px-3.5 pb-3.5 pt-3">
            <div className="mb-2 flex h-[18px] items-center gap-1 font-mono text-[0.57rem] font-medium uppercase text-forge-muted [&_svg]:text-forge-signal">
              {viewStatus === 'saved' ? <><Check size={13} /> View saved</> : null}
              {viewStatus === 'restored' ? <><Check size={13} /> Saved view active</> : null}
              {viewStatus === 'idle' ? 'No saved view for this model' : null}
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-[7px]">
              <button type="button" className="flex h-9 items-center justify-center gap-[7px] rounded-md border border-forge-accent bg-forge-accent text-[0.68rem] font-medium text-white hover:bg-forge-accent-hover" onClick={handleSaveView}>
                <Bookmark size={16} /> Save view
              </button>
              <button
                type="button"
                className="flex h-9 items-center justify-center gap-[7px] rounded-md border border-forge-line bg-forge-soft px-[11px] text-[0.68rem] font-medium text-forge-text hover:border-forge-icon hover:bg-forge-hover disabled:cursor-not-allowed disabled:text-forge-disabled"
                disabled={!hasSavedView}
                onClick={handleRestoreView}
                title="Restore saved view"
              >
                <RotateCcw size={16} /><span>Restore</span>
              </button>
            </div>
          </div>
        </aside>

        {panelOpen ? (
          <button className="absolute inset-0 z-10 hidden border-0 bg-forge-scrim/70 backdrop-blur-[2px] max-[760px]:block" type="button" aria-label="Close viewport controls" onClick={() => setPanelOpen(false)} />
        ) : null}

        <section className="relative min-h-0 min-w-0 overflow-hidden bg-forge-canvas" aria-label="Digital twin viewport">
          <ThreejsCanvas
            ref={canvasRef}
            modelUrl={modelUrl}
            visualMode={visualMode}
            cameraMode={cameraMode}
            cameraFov={cameraFov}
            orthoView={orthoView}
            gridStyle={gridStyle}
            gridExtentScale={gridExtentScale}
            environmentPreset={environmentPreset}
            lightingPreset={lightingPreset}
            sunAzimuth={sunAzimuth}
            sunElevation={sunElevation}
            shadowsEnabled={shadowsEnabled}
            initialViewportState={initialViewportState}
            className="block h-full w-full [&_canvas]:block"
          />

          <div className="absolute right-3 top-3 flex h-[30px] items-center gap-[7px] rounded-md border border-forge-line bg-forge-overlay/90 px-2.5 font-mono text-[0.62rem] font-medium uppercase text-forge-muted-strong backdrop-blur-lg [&_svg]:text-forge-accent-hover" aria-hidden="true">
            <Box size={13} /><span>{cameraMode === 'persp' ? 'Perspective' : orthoView}</span>
          </div>
        </section>
      </div>
    </main>
  );
}
