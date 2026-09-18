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
