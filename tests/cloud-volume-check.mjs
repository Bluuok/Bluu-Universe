import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const temporary = path.resolve('tests', `.cloud-volume-${process.pid}.mjs`);
await build({
  stdin: {
    contents: "export * as THREE from 'three';export {VortexField} from './src/scenes/sky/VortexField.js';export {StarRiverField} from './src/scenes/sky/StarRiverField.js';export {getPaintedCloudBounds} from './src/scenes/sky/PaintedCloudVolume.js';export {AssetManifest} from './src/config/AssetManifest.js';",
    resolveDir: path.resolve('.'),
    sourcefile: 'cloud-volume-production.mjs',
  },
  bundle: true,
  platform: 'browser',
  format: 'esm',
  mainFields: ['browser', 'module', 'main'],
  outfile: temporary,
  logLevel: 'silent',
});

const { THREE, VortexField, StarRiverField, getPaintedCloudBounds, AssetManifest } = await import(pathToFileURL(temporary).href);
const sourcePaths = [
  'src/scenes/sky/PaintedCloudVolume.js',
  'src/scenes/sky/VortexField.js',
  'src/scenes/sky/StarRiverField.js',
  'src/scenes/sky/VortexPaintMaterial.js',
  'src/config/VortexManifest.js',
  'src/config/StarRiverManifest.js',
];
const report = {
  at: new Date().toISOString(),
  kind: 'production four-volume CPU density/bounds/ownership regression; no shader execution, GPU, browser input or visual assessment',
  sourceHashes: Object.fromEntries(await Promise.all(sourcePaths.map(async file =>
    [file, createHash('sha256').update(await readFile(file)).digest('hex')]))),
  checks: [],
  volumes: [],
};
const check = (name, fn) => {
  fn();
  report.checks.push({ name, passed: true });
};

const scene = new THREE.Scene();
const vortex = new VortexField({ scene, manifest: AssetManifest.vortex });
const rivers = new StarRiverField({ scene, brushAtlas: vortex.brushAtlas });
const borrowedPigment = new THREE.Texture();
let pigmentDisposals = 0, atlasDisposals = 0;
borrowedPigment.addEventListener('dispose', () => pigmentDisposals++);
vortex.brushAtlas.addEventListener('dispose', () => atlasDisposals++);
vortex.setPigmentTexture(borrowedPigment);
rivers.setPigmentTexture(borrowedPigment);

const owners = [
  ...vortex.bands.map(({ id, mesh }) => ({ id: `vortex-${id}`, owner: 'VortexField', mesh })),
  ...rivers.rivers.map(({ config, mesh }) => ({ id: config.id, owner: 'StarRiverField', mesh })),
];
const densityDisposals = Object.fromEntries(owners.map(({ id, mesh }) => {
  const density = mesh.material.userData.paintUniforms.cloudDensity.value;
  let count = 0;
  density.addEventListener('dispose', () => { count++; densityDisposals[id] = count; });
  return [id, count];
}));

try {
  check('exactly four painted cloud render volumes are present', () => assert.equal(owners.length, 4));
  const worldMin = new THREE.Vector3(...AssetManifest.space.bounds.min);
  const worldMax = new THREE.Vector3(...AssetManifest.space.bounds.max);
  for (const { id, owner, mesh } of owners) {
    mesh.updateWorldMatrix(true, false);
    const bounds = getPaintedCloudBounds(mesh);
    const renderBox = new THREE.Box3().setFromObject(mesh, true);
    const density = mesh.material.userData.paintUniforms.cloudDensity.value;
    const { data, width, height, depth } = density.image;
    let nonzero = 0, interiorNonzero = 0, boundaryNonzero = 0, maximum = 0;
    for (let z = 0; z < depth; z++) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const value = data[x + width * (y + height * z)];
      assert.ok(Number.isFinite(value), `${id} non-finite density`);
      if (!value) continue;
      nonzero++;
      maximum = Math.max(maximum, value);
      if (x === 0 || y === 0 || z === 0 || x === width - 1 || y === height - 1 || z === depth - 1) boundaryNonzero++;
      else interiorNonzero++;
    }
    const evidence = {
      id, owner, renderTriangles: mesh.geometry.index.count / 3,
      resolution: [width, height, depth], bytes: data.length,
      nonzero, interiorNonzero, boundaryNonzero, maximum,
      fillRatio: nonzero / data.length,
      worldBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      renderBoxBounds: { min: renderBox.min.toArray(), max: renderBox.max.toArray() },
      method: mesh.userData.cloudVolume.method,
    };
    report.volumes.push(evidence);
    check(`${id}: render bound, finite density and 64-step integration metadata are coherent`, () => {
      assert.equal(evidence.renderTriangles, 12);
      assert.ok(data instanceof Uint8Array);
      assert.equal(data.length, width * height * depth);
      assert.ok(width >= 12 && height >= 12 && depth >= 12);
      assert.ok(evidence.interiorNonzero > 0);
      assert.ok(evidence.maximum > 0);
      assert.ok(evidence.fillRatio > 0 && evidence.fillRatio < 1);
      assert.equal(evidence.method, '64-step interior density ray integration from authored sweep');
    });
    check(`${id}: expanded density boundary is empty and occupied-support bound stays inside exploration space`, () => {
      assert.equal(evidence.boundaryNonzero, 0);
      for (const axis of ['x', 'y', 'z']) {
        assert.ok(bounds.min[axis] > worldMin[axis], `${id} below ${axis} world bound`);
        assert.ok(bounds.max[axis] < worldMax[axis], `${id} above ${axis} world bound`);
      }
    });
  }

  rivers.dispose();
  rivers.dispose();
  check('StarRiverField releases each owned density once and no borrowed texture', () => {
    assert.equal(densityDisposals['upper-rear-current'], 1);
    assert.equal(densityDisposals['lower-east-current'], 1);
    assert.equal(densityDisposals['vortex-main'], 0);
    assert.equal(densityDisposals['vortex-wing'], 0);
    assert.equal(atlasDisposals, 0);
    assert.equal(pigmentDisposals, 0);
  });

  vortex.dispose();
  vortex.dispose();
  check('VortexField disposal is idempotent for owned densities and atlas, while pigment remains borrowed', () => {
    assert.equal(densityDisposals['vortex-main'], 1);
    assert.equal(densityDisposals['vortex-wing'], 1);
    assert.equal(atlasDisposals, 1);
    assert.equal(pigmentDisposals, 0);
  });
  report.ownership = { densityDisposals, atlasDisposals, pigmentDisposals };
  report.status = 'passed';
} catch (error) {
  report.ownership = { densityDisposals, atlasDisposals, pigmentDisposals };
  report.status = 'failed';
  report.error = { message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  if (!rivers.disposed) rivers.dispose();
  if (vortex.group.parent) vortex.dispose();
  await unlink(temporary);
  report.finishedAt = new Date().toISOString();
  await writeFile(process.env.CLOUD_VOLUME_REPORT || 'tests/v10-cloud-volume-candidate.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ status: report.status, checks: report.checks.length, error: report.error?.message,
    ownership: report.ownership, volumes: report.volumes.map(({ id, resolution, boundaryNonzero, interiorNonzero, fillRatio }) =>
      ({ id, resolution, boundaryNonzero, interiorNonzero, fillRatio })) }));
}
