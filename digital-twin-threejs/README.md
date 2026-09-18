# @autonomous/digital-twin-threejs

Part of the Digital Twin Framework component suite. See the [architecture doc](https://honeywell.atlassian.net/wiki/spaces/FP/pages/1517174061) for how this package fits into the overall system.

## Install

```shell
yarn add @autonomous/digital-twin-threejs
```

## Development

Phase 1 is implemented:

- `ThreejsCanvas`: wrapper that shows idle content until `modelUrl` is provided.
- `ThreeJsRender`: real GLB renderer using `@react-three/fiber` + `@react-three/drei` with Draco-enabled `useGLTF`, `OrbitControls`, and fit-to-bounds camera framing.

## Viewport controls

`ThreejsCanvas` exposes controlled grid and lighting options:

```tsx
<ThreejsCanvas
  modelUrl="/models/building.glb"
  gridStyle="lines"
  gridExtentScale={2}
  environmentPreset="concrete"
  lightingPreset="natural"
  sunAzimuth={132}
  sunElevation={42}
  shadowsEnabled
  timeOfDay={{
    mode: 'automatic',
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: 'Asia/Kolkata',
    date: '2026-09-18',
    time: '18:30',
    northOffset: 0,
  }}
/>
```

- `gridExtentScale` expands or contracts the model-relative grid from `0.5` to `5` without changing cell spacing.
- `environmentPreset` accepts `studio`, `ground`, `concrete`, `asphalt`, `grid`, or `points`.
- Material presets add a shadow-receiving base sized to the loaded model. `grid` and `points` select the existing grid overlay styles.
- `lightingPreset` accepts `natural`, `directional`, `ambient`, or `hemisphere`.
- `natural` combines `HemisphereLight` sky/ground fill with a shadow-capable `DirectionalLight` sun.
- `ambient` and `hemisphere` are indirect-only modes, so shadow rendering is disabled for those presets.
- `timeOfDay` uses SunCalc to derive the sun position, solar phase, sky scattering, daylight intensity, and night transition from the site coordinates and local date/time.
- `timeOfDay.mode` can be `automatic` for astronomical sun placement or `manual` to keep using `sunAzimuth` and `sunElevation` while retaining the sky presentation.
- `northOffset` rotates geographic north into the model's local coordinate system and should be set when the model is not authored north-up.

## Loading lifecycle

When a model URL is present, the canvas displays an animated point-cloud building until the GLB is loaded and its initial camera has either been restored or fitted to the model. The real scene then fades in behind the loader.

For an asynchronously fetched saved view, keep the transition active until the lookup completes:

```tsx
<ThreejsCanvas
  modelUrl="/models/building.glb"
  initialViewportState={savedView}
  initialViewportStateLoading={isSavedViewLoading}
  onLoadStateChange={(state) => {
    // state is "loading", "ready", or "error"
  }}
/>
```

Leave `initialViewportStateLoading` unset when the model has no saved view. Load failures replace the animation with an accessible error message instead of leaving the viewport indefinitely busy.
