import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const temporary = path.resolve('tests', `.camera-composition-${process.pid}.mjs`);
await build({
  stdin: {
    contents: "export * as THREE from 'three';export {SpaceCollision} from './src/core/SpaceCollision.js';export {CollisionManifest} from './src/config/CollisionManifest.js';export {CameraAvoidance} from './src/core/CameraAvoidance.js';",
    resolveDir: path.resolve('.'),
    sourcefile: 'camera-composition-production.mjs',
  },
  bundle: true,
  platform: 'browser',
  format: 'esm',
  mainFields: ['browser', 'module', 'main'],
  outfile: temporary,
  logLevel: 'silent',
});

const { THREE, SpaceCollision, CollisionManifest, CameraAvoidance } = await import(pathToFileURL(temporary).href);
const anchors = Object.fromEntries([...new Set(CollisionManifest.dynamic.map(item => item.anchor))].map((name, index) => {
  const anchor = new THREE.Object3D();
  anchor.position.set(180 + index * 22, 170, 190);
  return [name, anchor];
}));
const collision = new SpaceCollision(CollisionManifest, { anchors, doorOpen: () => false });
const report = {
  at: new Date().toISOString(),
  kind: 'production SpaceCollision + CameraAvoidance CPU composition regression; no browser or visual approval',
  sourceHashes: Object.fromEntries(await Promise.all([
    'src/core/CameraAvoidance.js',
    'src/core/CameraDirector.js',
    'src/core/SpaceCollision.js',
    'src/config/CollisionManifest.js',
  ].map(async file => [file, createHash('sha256').update(await readFile(file)).digest('hex')]))),
  checks: [],
  cases: [],
};

const pitchOf = direction => Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
const angleBetween = (a, b) => Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1));
const runCase = ({ name, player, desiredPosition, previousPosition = null, previousDirection = null }) => {
  const feet = new THREE.Vector3(...player);
  const target = feet.clone().add(new THREE.Vector3(0, .96, 0));
  const desired = { position: new THREE.Vector3(...desiredPosition), target };
  const preferred = desired.position.clone().sub(target).normalize();
  const avoidance = new CameraAvoidance(() => collision.cameraMeshes());
  if (previousDirection) avoidance.direction = new THREE.Vector3(...previousDirection).normalize();
  const distance = desired.position.distanceTo(target);
  const viewForDirection = direction => ({ position: target.clone().addScaledVector(direction, distance), target });
  const view = avoidance.resolve(desired, feet, viewForDirection, .05,
    previousPosition ? new THREE.Vector3(...previousPosition) : null);
  const resolved = view.position.clone().sub(target).normalize();
  const evidence = {
    name,
    player,
    desiredPosition,
    resolvedPosition: view.position.toArray(),
    requestedPitch: pitchOf(preferred),
    resolvedPitch: pitchOf(resolved),
    angularDeviation: angleBetween(preferred, resolved),
    telemetry: avoidance.telemetry,
  };
  report.cases.push(evidence);
  return evidence;
};
const check = (name, fn) => {
  fn();
  report.checks.push({ name, passed: true });
};

try {
  const agy = runCase({
    name: 'alpha9 AGY rear-wall evidence',
    player: [-1.5179064008343441, 1.146795298682549, -5.646390081634522],
    desiredPosition: [13.715272272969278, 4.2146670677008435, -1.2117499010497603],
  });
  check('AGY rear-wall repro stays clear without choosing a near-vertical underside view', () => {
    assert.equal(agy.telemetry.obstruction?.group, 'studio-static');
    assert.equal(agy.telemetry.lineOfSightClear, true);
    assert.ok(Math.abs(agy.resolvedPitch) < .75, `resolved pitch ${agy.resolvedPitch}`);
    assert.ok(agy.angularDeviation < 1.1, `angular deviation ${agy.angularDeviation}`);
  });

  const local = runCase({
    name: 'alpha9 local trusted-input rear-wall evidence',
    player: [-1.9581, .37599, -5.95799],
    desiredPosition: [13.05296, 4.70724, -1.54646],
  });
  check('local rear-wall repro stays clear without exposing the studio underside', () => {
    assert.equal(local.telemetry.obstruction?.group, 'studio-static');
    assert.equal(local.telemetry.lineOfSightClear, true);
    assert.ok(Math.abs(local.resolvedPitch) < .75, `resolved pitch ${local.resolvedPitch}`);
  });

  const target = new THREE.Vector3(-1.5179064008343441, 2.106795298682549, -5.646390081634522);
  const mirrorDirection = new THREE.Vector3(-15.23317867380362, 2.1078717690182945, 4.434640180584762).normalize();
  const mirrored = runCase({
    name: 'rear-wall opposite azimuth',
    player: [-1.5179064008343441, 1.146795298682549, -5.646390081634522],
    desiredPosition: target.clone().addScaledVector(mirrorDirection, 16).toArray(),
  });
  check('opposite rear-wall approach uses the same moderate-pitch policy', () => {
    assert.equal(mirrored.telemetry.obstruction?.group, 'studio-static');
    assert.equal(mirrored.telemetry.lineOfSightClear, true);
    assert.ok(Math.abs(mirrored.resolvedPitch) < .75, `resolved pitch ${mirrored.resolvedPitch}`);
  });

  for (const requestedPitch of [1.25, -1.25]) {
    const feet = requestedPitch > 0 ? [0, 8.8, -6.2] : [0, -2.3, -6.2];
    const focus = new THREE.Vector3(...feet).add(new THREE.Vector3(0, .96, 0));
    const direction = new THREE.Vector3(Math.cos(requestedPitch), Math.sin(requestedPitch), 0).normalize();
    const active = runCase({
      name: `active user pitch ${requestedPitch}`,
      player: feet,
      desiredPosition: focus.clone().addScaledVector(direction, 16).toArray(),
    });
    check(`active user pitch ${requestedPitch} remains requested when clear`, () => {
      assert.equal(active.telemetry.obstruction, null);
      assert.equal(active.telemetry.lineOfSightClear, true);
      assert.ok(Math.abs(active.resolvedPitch - requestedPitch) < 1e-9);
      assert.ok(active.angularDeviation < 1e-9);
    });
  }

  const staleFeet = new THREE.Vector3(-1.5179064008343441, 1.146795298682549, -5.646390081634522);
  const staleTarget = staleFeet.clone().add(new THREE.Vector3(0, .96, 0));
  const staleDesired = { position: new THREE.Vector3(13.715272272969278, 4.2146670677008435, -1.2117499010497603), target: staleTarget };
  const staleAvoidance = new CameraAvoidance(() => collision.cameraMeshes());
  staleAvoidance.direction = new THREE.Vector3(.087295, -.994924, .046469).normalize();
  let stalePosition = new THREE.Vector3(-.12118210013984632, -13.819762613375767, -4.9028823576606735);
  const stalePitches = [];
  const staleDistance = staleDesired.position.distanceTo(staleTarget);
  for (let frame = 0; frame < 40; frame++) {
    const view = staleAvoidance.resolve(staleDesired, staleFeet,
      direction => ({ position: staleTarget.clone().addScaledVector(direction, staleDistance), target: staleTarget }),
      .05, stalePosition);
    stalePosition = view.position.clone();
    stalePitches.push(pitchOf(view.position.clone().sub(staleTarget).normalize()));
    assert.equal(staleAvoidance.telemetry.lineOfSightClear, true, `stale frame ${frame}`);
  }
  report.cases.push({
    name: 'stale underside direction recovery',
    requestedPitch: pitchOf(staleDesired.position.clone().sub(staleTarget).normalize()),
    resolvedPitch: stalePitches.at(-1),
    pitchTrace: stalePitches,
    resolvedPosition: stalePosition.toArray(),
    telemetry: staleAvoidance.telemetry,
  });
  check('a previous clear underside view converges instead of pinning lastView', () => {
    assert.ok(stalePitches[0] > -1.47, `first pitch ${stalePitches[0]}`);
    assert.ok(Math.abs(stalePitches.at(-1)) < .75, `last pitch ${stalePitches.at(-1)}`);
    assert.ok(stalePitches.at(-1) > stalePitches[0] + .5);
  });

  check('an old avoidance offset decays while pilot keeps turning',()=>{
    const free=new CameraAvoidance(()=>[]),feet=new THREE.Vector3(0,0,0),target=new THREE.Vector3(0,1,0);
    const direction=y=>new THREE.Vector3(Math.sin(y),0,Math.cos(y));
    free.direction=direction(-.5);free.preferred=direction(0);free.recovering=true;
    let previous=target.clone().addScaledVector(free.direction,9),view;
    for(let frame=1;frame<=120;frame++){
      const desiredDirection=direction(frame/60);
      const make=d=>({position:target.clone().addScaledVector(d,9),target});
      view=free.resolve(make(desiredDirection),feet,make,1/60,previous);previous=view.position.clone();
    }
    const error=view.position.clone().sub(target).normalize().angleTo(direction(2));
    assert.ok(error<.005, 'persistent orbit lag '+error);assert.equal(free.recovering,false);
  });

  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = { message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  collision.dispose();
  await unlink(temporary);
  report.finishedAt = new Date().toISOString();
  await writeFile(process.env.CAMERA_REPORT||'tests/v10-camera-composition.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ status: report.status, checks: report.checks.length, error: report.error?.message }));
}
