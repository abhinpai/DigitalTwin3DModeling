import { ThreejsCanvas, type IThreejsCanvasHandle } from '@digital-twin-threejs';
import {
  Bookmark,
  Box,
  CalendarDays,
  Camera,
  Check,
  Clock3,
  MapPin,
  Menu,
  Moon,
  Rotate3D,
  RotateCcw,
  Sun,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CameraMode } from '../digital-twin-threejs/src/types/cameraMode';
import type { EnvironmentPreset } from '../digital-twin-threejs/src/types/environmentPreset';
import type { GridStyle } from '../digital-twin-threejs/src/types/gridStyle';
import type { LightingPreset } from '../digital-twin-threejs/src/types/lightingPreset';
import type { OrthoView } from '../digital-twin-threejs/src/types/orthoView';
import type { ITimeOfDaySettings } from '../digital-twin-threejs/src/types/timeOfDay';
import type { IViewportState } from '../digital-twin-threejs/src/types/viewportState';
import type { VisualMode } from '../digital-twin-threejs/src/types/visualMode';
import { getSolarState } from '../digital-twin-threejs/src/utils/solarPosition';

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
  { value: 'natural', label: 'Natural daylight (Recommended)' },
  { value: 'directional', label: 'Directional sun' },
  { value: 'ambient', label: 'Ambient fill' },
  { value: 'hemisphere', label: 'Sky hemisphere' },
];

const lightingDescriptions: Record<LightingPreset, string> = {
  natural: 'Sky atmosphere, sunlight, soft fill, and shadows for the most complete view.',
  directional: 'Sunlight and shadows only. Useful for studying shadow direction and intensity.',
  ambient: 'Even visibility with no directional shadow. Best for inspection and selection.',
  hemisphere: 'Soft sky and ground fill with low contrast. Useful for calm presentation views.',
};

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

const BANGALORE_TIMEZONE = 'Asia/Kolkata';

const LOCATION_OPTIONS: Array<ITimeOfDaySettings & { label: string }> = [
  { label: 'Bangalore, India', locationLabel: 'Bangalore, India', mode: 'automatic', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata', date: '', time: '', northOffset: 0, cloudsEnabled: true },
  { label: 'Richardson, Texas', locationLabel: 'Richardson, Texas', mode: 'automatic', latitude: 32.9483, longitude: -96.7299, timezone: 'America/Chicago', date: '', time: '', northOffset: 0, cloudsEnabled: true },
  { label: 'London, United Kingdom', locationLabel: 'London, United Kingdom', mode: 'automatic', latitude: 51.5072, longitude: -0.1276, timezone: 'Europe/London', date: '', time: '', northOffset: 0, cloudsEnabled: true },
  { label: 'Singapore', locationLabel: 'Singapore', mode: 'automatic', latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore', date: '', time: '', northOffset: 0, cloudsEnabled: true },
  { label: 'New York, United States', locationLabel: 'New York, United States', mode: 'automatic', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York', date: '', time: '', northOffset: 0, cloudsEnabled: true },
];

const TIME_PRESETS = [
  { label: 'Dawn', time: '06:00' },
  { label: 'Morning', time: '09:00' },
  { label: 'Noon', time: '12:00' },
  { label: 'Sunset', time: '18:30' },
  { label: 'Night', time: '22:00' },
];

function getDefaultTimeOfDay(): ITimeOfDaySettings {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BANGALORE_TIMEZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    mode: 'automatic',
    locationLabel: 'Bangalore, India',
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: BANGALORE_TIMEZONE,
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour === '24' ? '00' : values.hour}:${values.minute}`,
    northOffset: 0,
    cloudsEnabled: true,
  };
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const remainder = (minutes % 60).toString().padStart(2, '0');
  return `${hours}:${remainder}`;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hours, minutes));
}

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
  const [timeOfDay, setTimeOfDay] = useState<ITimeOfDaySettings>(initialSavedView?.timeOfDay ?? getDefaultTimeOfDay());
  const [locationQuery, setLocationQuery] = useState(initialSavedView?.timeOfDay?.locationLabel ?? 'Bangalore, India');
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);
  const [initialViewportState, setInitialViewportState] = useState<IViewportState | undefined>(
    initialSavedView ? cloneViewportState(initialSavedView) : undefined,
  );
  const [viewStatus, setViewStatus] = useState<'idle' | 'saved' | 'restored'>(initialSavedView ? 'restored' : 'idle');
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const activeModel = MODEL_OPTIONS.find((model) => model.url === modelUrl) ?? MODEL_OPTIONS[0];
  const hasSavedView = Boolean(savedViews[modelUrl]);
  const solarState = useMemo(() => getSolarState(timeOfDay), [timeOfDay]);

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
    setTimeOfDay(state.timeOfDay ?? getDefaultTimeOfDay());
    setLocationQuery(state.timeOfDay?.locationLabel ?? 'Bangalore, India');
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
      setTimeOfDay(getDefaultTimeOfDay());
      setLocationQuery('Bangalore, India');
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
  const sectionClassName = 'm-0 border-0 border-b border-forge-line-soft px-3.5 py-4 mt-4';
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
              <div className="mb-4 border-b border-forge-line-soft pb-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className={controlLabelClassName}>Time of day</span>
                  <span className="font-mono text-[0.59rem] uppercase text-forge-signal">{solarState.phase}</span>
                </div>
                <div className={`${segmentGroupClassName} grid-cols-2`}>
                  <button type="button" className={segmentButtonClassName(timeOfDay.mode === 'automatic')} onClick={() => setTimeOfDay((current) => ({ ...current, mode: 'automatic' }))} aria-pressed={timeOfDay.mode === 'automatic'}>Automatic</button>
                  <button type="button" className={segmentButtonClassName(timeOfDay.mode === 'manual')} onClick={() => setTimeOfDay((current) => ({ ...current, mode: 'manual' }))} aria-pressed={timeOfDay.mode === 'manual'}>Manual</button>
                </div>
                <div className="mt-3 grid gap-2 text-[0.69rem] text-forge-muted">
                  <div className="relative">
                    <label className="grid gap-1.5">
                      <span className="flex items-center gap-1.5"><MapPin size={13} /> Location</span>
                      <input
                        className={`${selectClassName} w-full pr-3`}
                        value={locationQuery}
                        placeholder="Search city or address"
                        onFocus={() => setLocationMenuOpen(true)}
                        onChange={(event) => {
                          setLocationQuery(event.target.value);
                          setLocationMenuOpen(true);
                        }}
                        onBlur={() => window.setTimeout(() => setLocationMenuOpen(false), 120)}
                        aria-label="Search location"
                      />
                    </label>
                    {locationMenuOpen && locationQuery.trim() ? (
                      <div className="absolute inset-x-0 top-[58px] z-20 overflow-hidden rounded-md border border-forge-line-strong bg-forge-overlay shadow-panel">
                        {LOCATION_OPTIONS.filter((location) => location.label.toLowerCase().includes(locationQuery.toLowerCase())).map((location) => (
                          <button
                            key={location.label}
                            className="flex w-full items-start gap-2 border-0 border-b border-forge-line-soft bg-transparent px-3 py-2 text-left text-[0.68rem] text-forge-text last:border-b-0 hover:bg-forge-hover"
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setTimeOfDay((current) => ({ ...current, ...location, date: current.date, time: current.time, mode: current.mode }));
                              setLocationQuery(location.label);
                              setLocationMenuOpen(false);
                            }}
                          >
                            <MapPin size={13} className="mt-0.5 flex-none text-forge-accent" />
                            <span>{location.label}</span>
                          </button>
                        ))}
                        {!LOCATION_OPTIONS.some((location) => location.label.toLowerCase().includes(locationQuery.toLowerCase())) ? <div className="px-3 py-2 text-[0.65rem] text-forge-muted">Choose a supported location to resolve coordinates.</div> : null}
                      </div>
                    ) : null}
                  </div>
                  {timeOfDay.mode === 'automatic' ? (
                    <>
                      <label className="grid gap-1.5">
                        <span className="flex items-center gap-1.5"><CalendarDays size={13} /> Date</span>
                        <input className={`${selectClassName} w-full`} type="date" value={timeOfDay.date} onChange={(event) => setTimeOfDay((current) => ({ ...current, date: event.target.value }))} />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="flex items-center justify-between"><span className="flex items-center gap-1.5"><Clock3 size={13} /> Local time</span><output className="font-mono text-[0.66rem] font-medium text-forge-text">{formatTime(timeOfDay.time)}</output></span>
                        <input className="forge-range" type="range" min="0" max="1439" step="5" value={timeToMinutes(timeOfDay.time)} onChange={(event) => setTimeOfDay((current) => ({ ...current, time: minutesToTime(Number(event.target.value)) }))} />
                      </label>
                      <div className="grid grid-cols-2 gap-2 font-mono text-[0.59rem] uppercase text-forge-muted">
                        <span>Sun {Math.round(solarState.elevation)}°</span>
                        <span className="text-right">Az {Math.round(solarState.azimuth)}°</span>
                      </div>
                      <div className="mt-1 grid grid-cols-5 gap-1">
                        {TIME_PRESETS.map((preset) => (
                          <button key={preset.label} type="button" className="h-7 rounded border border-forge-line bg-forge-input px-1 text-[0.56rem] font-medium text-forge-muted hover:border-forge-accent hover:text-forge-text" onClick={() => setTimeOfDay((current) => ({ ...current, time: preset.time }))}>{preset.label}</button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="border-l-2 border-forge-accent bg-forge-input px-2.5 py-2 text-[0.64rem] leading-relaxed text-forge-muted">Manual mode freezes the astronomical clock. Adjust the sun direction controls below.</div>
                  )}
                </div>
              </div>
              <label className="grid gap-2 text-[0.69rem] text-forge-muted">
                <span className={controlLabelClassName}>Light rig</span>
                <select className={`${selectClassName} w-full`} value={lightingPreset} onChange={(event) => setLightingPreset(event.target.value as LightingPreset)}>
                  {lightingPresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
                </select>
                <small className="text-[0.62rem] leading-relaxed text-forge-muted">{lightingDescriptions[lightingPreset]}</small>
              </label>
              {lightingPreset === 'natural' || lightingPreset === 'directional' ? (
                <>
                  {timeOfDay.mode === 'manual' ? (
                    <>
                      <label className={rangeLabelClassName}>
                        <span className="flex justify-between"><span>Sun azimuth</span><output className="font-mono text-[0.66rem] font-medium text-forge-text">{sunAzimuth}°</output></span>
                        <input className="forge-range" type="range" min="0" max="360" value={sunAzimuth} onChange={(event) => setSunAzimuth(Number(event.target.value))} />
                      </label>
                      <label className={rangeLabelClassName}>
                        <span className="flex justify-between"><span>Sun elevation</span><output className="font-mono text-[0.66rem] font-medium text-forge-text">{sunElevation}°</output></span>
                        <input className="forge-range" type="range" min="0" max="90" value={sunElevation} onChange={(event) => setSunElevation(Number(event.target.value))} />
                      </label>
                    </>
                  ) : null}
                  <label className="mt-3.5 flex min-h-10 cursor-pointer items-center justify-between gap-2.5 border-t border-forge-line-soft pt-3.5">
                    <span className="grid gap-0.5">
                      <strong className="text-[0.7rem] font-medium">Atmospheric clouds</strong>
                      <small className="text-[0.62rem] text-forge-muted">Subtle animated cloud layer</small>
                    </span>
                    <span className={`relative h-5 w-9 flex-none rounded-full border transition-colors ${(timeOfDay.cloudsEnabled ?? true) ? 'border-forge-accent bg-forge-accent' : 'border-forge-line-strong bg-forge-segment'}`}>
                      <input className="peer sr-only" type="checkbox" checked={timeOfDay.cloudsEnabled ?? true} onChange={(event) => setTimeOfDay((current) => ({ ...current, cloudsEnabled: event.target.checked }))} />
                      <span className={`absolute top-[3px] h-3 w-3 rounded-full bg-white shadow transition-transform ${(timeOfDay.cloudsEnabled ?? true) ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                    </span>
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
            timeOfDay={timeOfDay}
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
