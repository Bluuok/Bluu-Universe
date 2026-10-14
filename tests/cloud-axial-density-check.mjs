import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// A constant-width straight authored sweep isolates unwanted periodic density
// variation introduced by the bake. It does not assert browser appearance.
const temporary = path.resolve(`tests/.axial-density-${process.pid}.mjs`);
await build({ stdin: { contents: "export * as THREE from 'three';export {makePaintedCloudVolume} from './src/scenes/sky/PaintedCloudVolume.js';",
  resolveDir: process.cwd(), sourcefile: 'axial-density-production.mjs' }, bundle: true,
  platform: 'browser', format: 'esm', mainFields: ['browser', 'module', 'main'], outfile: temporary, logLevel: 'silent' });
const report = { at: new Date().toISOString(), method: 'CPU constant-radius straight sweep, production bake, trilinear centre-axis samples at 0.05m; no GPU or visual assertion.', cases: [] };
try {
  const { THREE, makePaintedCloudVolume } = await import(pathToFileURL(temporary).href);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 15, 0), new THREE.Vector3(0, 30, 0)]);
  const curveSegments = 60, crossSegments = 16, positions = [];
  for (let ring = 0; ring <= curveSegments; ring++) for (let cross = 0; cross <= crossSegments; cross++) {
    const angle = cross / crossSegments * Math.PI * 2;
    positions.push(Math.cos(angle) * 3, ring / curveSegments * 30, Math.sin(angle) * 3);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.computeBoundingBox();
  const atlas = new THREE.Texture();
  for (const axialPower of [2, 4]) {
    const mesh = makePaintedCloudVolume({ geometry, curve, curveSegments, crossSegments, brushAtlas: atlas,
      profile: { axialPower, color: '#3375ac', crest: '#abc7cf', shadow: '#143969', paintLight: '#c9b582' } });
    const u = mesh.material.userData.paintUniforms, { data, width, height, depth } = u.cloudDensity.value.image;
    const dimensions = [width, height, depth], samples = [];
    for (let y = 5; y <= 25; y += .05) {
      const voxel = new THREE.Vector3(0, y, 0).sub(u.cloudMin.value).divide(u.cloudSize.value).toArray().map((n, i) => n * dimensions[i] - .5);
      let value = 0;
      for (let z = 0; z < 2; z++) for (let yy = 0; yy < 2; yy++) for (let x = 0; x < 2; x++) {
        const corner = [x, yy, z], indices = voxel.map((n, i) => Math.floor(n) + corner[i]);
        const weight = voxel.reduce((w, n, i) => w * (corner[i] ? n - Math.floor(n) : 1 - (n - Math.floor(n))), 1);
        value += data[indices[0] + width * (indices[1] + height * indices[2])] / 255 * weight;
      }
      samples.push({ y, density: value });
    }
    const values = samples.map(s => s.density), min = Math.min(...values), max = Math.max(...values);
    report.cases.push({ axialPower, resolution: dimensions, bytes: data.length, min, max, peakToPeak: max - min, samples });
    mesh.material.dispose(); mesh.geometry.dispose();
  }
  geometry.dispose(); atlas.dispose();
  assert.deepEqual(report.cases[0].resolution, report.cases[1].resolution);
  assert.equal(report.cases[0].bytes, report.cases[1].bytes);
  assert.ok(report.cases[1].peakToPeak < report.cases[0].peakToPeak * .45, 'Flatter axial support must reduce sample-spaced centreline ripple');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.stack; process.exitCode = 1;
} finally {
  fs.unlinkSync(temporary);
  fs.writeFileSync(process.env.AXIAL_REPORT || 'tests/v12-rc41-axial-density.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, cases: report.cases.map(({ axialPower, min, max, peakToPeak, bytes }) => ({ axialPower, min, max, peakToPeak, bytes })), error: report.error }));
}
