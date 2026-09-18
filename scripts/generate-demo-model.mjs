import { mkdir, writeFile } from 'node:fs/promises';

const positions = new Float32Array([
  -0.5,-0.5, 0.5, 0.5,-0.5, 0.5, 0.5, 0.5, 0.5,-0.5, 0.5, 0.5,
   0.5,-0.5,-0.5,-0.5,-0.5,-0.5,-0.5, 0.5,-0.5, 0.5, 0.5,-0.5,
  -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,-0.5,-0.5, 0.5,-0.5,
  -0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,-0.5, 0.5,-0.5,-0.5, 0.5,
   0.5,-0.5, 0.5, 0.5,-0.5,-0.5, 0.5, 0.5,-0.5, 0.5, 0.5, 0.5,
  -0.5,-0.5,-0.5,-0.5,-0.5, 0.5,-0.5, 0.5, 0.5,-0.5, 0.5,-0.5,
]);
const normals = new Float32Array([
  0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
  0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
  1,0,0, 1,0,0, 1,0,0, 1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0,
]);
const indices = new Uint16Array([
  0,1,2,0,2,3, 4,5,6,4,6,7, 8,9,10,8,10,11,
  12,13,14,12,14,15, 16,17,18,16,18,19, 20,21,22,20,22,23,
]);

const chunks = [Buffer.from(positions.buffer), Buffer.from(normals.buffer), Buffer.from(indices.buffer)];
const offsets = [0, chunks[0].length, chunks[0].length + chunks[1].length];
const buffer = Buffer.concat(chunks);

const materials = [
  [0.22, 0.27, 0.25, 1],
  [0.75, 0.8, 0.77, 1],
  [0.55, 0.62, 0.58, 1],
  [0.83, 1, 0.31, 1],
];

const blocks = [
  ['Main hall', [0,1.5,0], [8,3,5], 0],
  ['Roof monitor', [0,3.35,0], [4.5,0.7,2], 1],
  ['West annex', [-5,0.9,0.8], [2,1.8,3.4], 2],
  ['East annex', [5,1.1,-0.5], [2,2.2,4], 2],
  ['Loading bay A', [-2.8,0.5,3.4], [2,1,1.7], 1],
  ['Loading bay B', [0,0.5,3.4], [2,1,1.7], 1],
  ['Loading bay C', [2.8,0.5,3.4], [2,1,1.7], 1],
  ['Utility block', [4.7,0.65,3.1], [2.4,1.3,1.8], 0],
  ['Stack A', [4.2,3.3,2.6], [0.45,4.2,0.45], 3],
  ['Stack B', [5.2,2.7,2.6], [0.45,3,0.45], 3],
  ['Office', [-4.6,1.1,-3.1], [3.5,2.2,2.2], 1],
  ['Connector', [-2.2,0.65,-2.2], [1.6,1.3,1.4], 2],
];

const gltf = {
  asset: { version: '2.0', generator: 'Digital Twin Workbench' },
  scene: 0,
  scenes: [{ name: 'Factory Campus', nodes: blocks.map((_, index) => index) }],
  nodes: blocks.map(([name, translation, scale, material], index) => ({ name, translation, scale, mesh: material })),
  meshes: materials.map((_, material) => ({ name: `Structure ${material + 1}`, primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material }] })),
  materials: materials.map((color, index) => ({ name: `Material ${index + 1}`, pbrMetallicRoughness: { baseColorFactor: color, metallicFactor: 0.05, roughnessFactor: 0.72 } })),
  accessors: [
    { bufferView: 0, componentType: 5126, count: 24, type: 'VEC3', min: [-0.5,-0.5,-0.5], max: [0.5,0.5,0.5] },
    { bufferView: 1, componentType: 5126, count: 24, type: 'VEC3' },
    { bufferView: 2, componentType: 5123, count: 36, type: 'SCALAR' },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: offsets[0], byteLength: chunks[0].length, target: 34962 },
    { buffer: 0, byteOffset: offsets[1], byteLength: chunks[1].length, target: 34962 },
    { buffer: 0, byteOffset: offsets[2], byteLength: chunks[2].length, target: 34963 },
  ],
  buffers: [{ byteLength: buffer.length, uri: `data:application/octet-stream;base64,${buffer.toString('base64')}` }],
};

await mkdir(new URL('../public/models/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/models/factory.gltf', import.meta.url), JSON.stringify(gltf));
