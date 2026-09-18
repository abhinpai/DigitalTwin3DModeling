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
  lightingPreset="natural"
  sunAzimuth={132}
  sunElevation={42}
  shadowsEnabled
/>
```

- `gridExtentScale` expands or contracts the model-relative grid from `0.5` to `5` without changing cell spacing.
- `lightingPreset` accepts `natural`, `directional`, `ambient`, or `hemisphere`.
- `natural` combines `HemisphereLight` sky/ground fill with a shadow-capable `DirectionalLight` sun.
- `ambient` and `hemisphere` are indirect-only modes, so shadow rendering is disabled for those presets.
