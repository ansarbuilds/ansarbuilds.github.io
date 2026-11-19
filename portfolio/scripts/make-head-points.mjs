// Builds public/film/head-points.bin: the digital double's head and hair as
// a cloud of points, for the film's saywhen scene ("a face made of points").
// The scene only needs a few thousand points, not the 3 MB model, so this
// samples it once. Run again if the model changes:
//   node scripts/make-head-points.mjs
//
// File format: a little-endian Uint32 point count, the bounding box as six
// Float32 (min xyz, max xyz), then per point three Int16 positions quantized
// to that box and one Uint8 kind (0 skin, 1 hair, 2 eye).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { writeFile } from 'node:fs/promises';

const SKIN = 5200, HAIR = 2600, EYE = 200;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const document = await io.read('public/models/digital_double.glb');

// Triangles of every primitive in a mesh, in world space, with their areas.
function triangles(meshName) {
  const node = document.getRoot().listNodes().find((n) => n.getMesh()?.getName() === meshName);
  if (!node) throw new Error(`no mesh ${meshName}`);
  const matrix = node.getWorldMatrix();
  const out = [];
  for (const primitive of node.getMesh().listPrimitives()) {
    const position = primitive.getAttribute('POSITION');
    const index = primitive.getIndices();
    const point = (i) => {
      const [x, y, z] = position.getElement(i, []);
      return [
        matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
        matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
        matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
      ];
    };
    const count = index ? index.getCount() : position.getCount();
    for (let i = 0; i + 2 < count; i += 3) {
      const [a, b, c] = [0, 1, 2].map((k) => point(index ? index.getScalar(i + k) : i + k));
      const ab = a.map((v, k) => b[k] - v), ac = a.map((v, k) => c[k] - v);
      const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      out.push({ a, b, c, area: Math.hypot(...cross) / 2 });
    }
  }
  return out;
}

// Points spread over the surface by area, so density is even.
function sample(tris, count, kind) {
  const total = tris.reduce((sum, t) => sum + t.area, 0);
  const points = [];
  for (let i = 0; i < count; i++) {
    let pick = Math.random() * total, t = tris[0];
    for (const tri of tris) { pick -= tri.area; if (pick <= 0) { t = tri; break; } }
    let u = Math.random(), v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    points.push([0, 1, 2].map((k) => t.a[k] + (t.b[k] - t.a[k]) * u + (t.c[k] - t.a[k]) * v).concat(kind));
  }
  return points;
}

const meshNames = document.getRoot().listMeshes().map((mesh) => mesh.getName());
const points = [
  ...sample(triangles(meshNames.find((n) => n.startsWith('Final_Head'))), SKIN, 0),
  ...sample(triangles('Web_Hair'), HAIR, 1),
  ...sample([...triangles('Eye_L.002'), ...triangles('Eye_R.002')], EYE, 2),
];
const min = [0, 1, 2].map((k) => Math.min(...points.map((p) => p[k])));
const max = [0, 1, 2].map((k) => Math.max(...points.map((p) => p[k])));
const buffer = Buffer.alloc(4 + 24 + points.length * 7);
buffer.writeUInt32LE(points.length, 0);
[...min, ...max].forEach((v, i) => buffer.writeFloatLE(v, 4 + i * 4));
points.forEach((p, i) => {
  const at = 28 + i * 7;
  for (let k = 0; k < 3; k++) buffer.writeInt16LE(Math.round(((p[k] - min[k]) / (max[k] - min[k])) * 65534 - 32767), at + k * 2);
  buffer.writeUInt8(p[3], at + 6);
});
await writeFile('public/film/head-points.bin', buffer);
console.log(`wrote ${points.length} points, ${buffer.length} bytes, box`, min.map((v) => v.toFixed(3)), max.map((v) => v.toFixed(3)));
