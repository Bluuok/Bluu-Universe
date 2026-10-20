import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Detached production geometry only. This never imports or starts a browser,
// moves the live actor, or counts fixtures as keyboard/mouse playthroughs.
const temporary = path.resolve('tests', `.studio-contact-${process.pid}.mjs`);
await build({ stdin: { contents: `export * as THREE from 'three';
  export {SpaceCollision} from './src/core/SpaceCollision.js';
  export {CameraAvoidance} from './src/core/CameraAvoidance.js';
  export {CollisionManifest} from './src/config/CollisionManifest.js';
  export {BuildingLayout} from './src/config/BuildingLayout.js';`,
  resolveDir: path.resolve('.'), sourcefile: 'studio-contact-test.mjs' },
  bundle: true, platform: 'browser', format: 'esm', mainFields: ['browser', 'module', 'main'],
  outfile: temporary, logLevel: 'silent' });
const { THREE, SpaceCollision, CameraAvoidance, CollisionManifest: manifest, BuildingLayout: layout } = await import(pathToFileURL(temporary).href);
const report = { started: new Date().toISOString(), method: 'Node detached production BVH fixtures; no browser, real input, rendering or visual acceptance', checks: [], contacts: [], cameras: [] };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const html = await readFile('dist/index.html', 'utf8');
report.build = {};
for (const [kind, extension] of [['js', 'js'], ['css', 'css']]) {
  const asset = html.match(new RegExp(`assets/(index-[^" ]+\\.${extension})`))[1];
  report.build[kind] = { asset, sha256: hash(await readFile(`dist/assets/${asset}`)) };
}
report.sourceHashes = Object.fromEntries(await Promise.all(['src/core/SpaceCollision.js', 'src/core/CameraAvoidance.js', 'src/config/CollisionManifest.js', 'src/config/BuildingLayout.js', 'src/scenes/StudioBuilding.js'].map(async file => [file, hash(await readFile(file))])));
const anchors = Object.fromEntries([...new Set(manifest.dynamic.map(p => p.anchor))].map(name => {
  const object = new THREE.Object3D(); object.position.set(500, 500, 500); return [name, object];
}));
const world = new SpaceCollision(manifest, { anchors });
const check = (name, fn) => { fn(); report.checks.push({ name, status: 'passed' }); };
const vector = values => new THREE.Vector3(...values);
const body = (name, start, step, ids, normal) => {
  const wanted = new Set(ids);
  const isolated = new SpaceCollision({ ...manifest, static: manifest.static.filter(p => wanted.has(p.id)), door: [], dynamic: [] });
  const excluded = new SpaceCollision({ ...manifest, static: manifest.static.filter(p => !wanted.has(p.id)), dynamic: [] });
  const position = vector(start), displacement = vector(step), velocity = displacement.clone().multiplyScalar(60);
  try {
    let contact;
    for (let frame = 0; frame < 160; frame++) {
      const before = position.clone();
      const solve = world.resolve(position, displacement, velocity);
      if (!solve.contacts.length) continue;
      contact = { frame, before: before.toArray(), position: position.toArray(), solve, capsule: world.telemetry(position).capsule };
      check(`${name}: body contact has expected outward normal and removes velocity into its actual surface`, () => {
        const surface = solve.contacts.find(c => c.collider === 'studio-static' && vector(c.normal).dot(vector(normal)) > .7);
        assert(surface);
        assert(velocity.dot(vector(surface.normal)) > -1e-7);
      });
      const selectedPosition = before.clone(), removedPosition = before.clone();
      const selected = isolated.resolve(selectedPosition, displacement);
      const removed = excluded.resolve(removedPosition, displacement);
      report.attributionProbe = { name, full: contact, selected, removed,
        endpointDifference: selectedPosition.distanceTo(position) };
      check(`${name}: named proxy alone reproduces contact; other studio proxies do not`, () => {
        assert(selected.contacts.length > 0);
        // A merged BVH visits coplanar deck triangles in a different order;
        // allow <1 mm endpoint drift, still twelve times below capsule skin.
        assert(selectedPosition.distanceTo(position) < .001);
        assert.equal(removed.contacts.length, 0);
      });
      report.contacts.push({ name, expectedProxies: ids, attribution: 'isolated proxy reproduces contact within 1 mm; complement is clear at first contact',
        endpointDifference: selectedPosition.distanceTo(position), ...contact });
      delete report.attributionProbe;
      return contact;
    }
    assert.fail(`${name}: no body contact in 160 steps`);
  } finally { isolated.dispose(); excluded.dispose(); }
};
const camera = (name, playerValues, directionValues) => {
  const player = vector(playerValues), target = player.clone().add(vector([0, 1, 0]));
  const avoidance = new CameraAvoidance(() => world.cameraMeshes());
  const viewForDirection = direction => ({ position: target.clone().addScaledVector(direction, 13), target });
  const desired = viewForDirection(vector(directionValues).normalize());
  const solveCount = world.solveCount;
  const view = avoidance.resolve(desired, player, viewForDirection, .05, null);
  check(`${name}: independent camera query detours with all three body sightlines clear`, () => {
    assert.equal(avoidance.telemetry.obstruction?.group, 'studio-static');
    assert.equal(avoidance.telemetry.adjusted, true);
    assert.equal(avoidance.telemetry.lineOfSightClear, true);
    assert(view.position.distanceTo(desired.position) > .1);
    assert.equal(world.solveCount, solveCount, 'camera must not solve or move the body');
  });
  report.cameras.push({ name, player: playerValues, ...avoidance.telemetry });
};
try {
  const front = body('front glass', [-2.35, 2.5, 9], [0, 0, -.06], ['studio-wall-front-left'], [0, 0, 1]);
  const right = body('right glass', [9, 2.5, -.74205], [-.06, 0, 0], ['studio-wall-right'], [1, 0, 0]);
  check('glass contacts isolate the pane interior rather than its frame or header', () => {
    const f = layout.frontWindow, r = layout.rightWindow;
    for (const [contact, axis, min, max] of [[front, 0, f.center[0] - f.width / 2, f.center[0] + f.width / 2],
      [front, 1, f.center[1] - f.height / 2, f.center[1] + f.height / 2],
      [right, 2, r.min[2], r.max[2]], [right, 1, r.min[1], r.max[1]]]) {
      assert(Math.min(contact.capsule.start[axis], contact.capsule.end[axis]) - contact.capsule.radius > min);
      assert(Math.max(contact.capsule.start[axis], contact.capsule.end[axis]) + contact.capsule.radius < max);
    }
    assert(Math.abs(front.position[2] - (layout.walls.front.outer + front.capsule.radius)) < .001);
    assert(Math.abs(right.position[0] - (layout.walls.right.outer + right.capsule.radius)) < .001);
  });
  camera('front glass orbit', front.position, [0, 0, -1]);
  camera('right glass orbit', right.position, [-1, 0, 0]);
  for (const fixture of [
    ['bench seat', [-2.70, 2.0, 5.90], ['terrace-bench-seat']],
    ['left planter foliage', [-4.50, 3, 5.95], ['terrace-planter-left-leaves']],
    ['right planter foliage', [3.52, 3, 6.32], ['terrace-planter-right-leaves']],
    ['terrace deck', [-1.0, 3, 5.84], ['terrace-deck']],
  ]) body(fixture[0], fixture[1], [0, -.025, 0], fixture[2], [0, 1, 0]);
  for (const [name, position, step, axis, limit] of [
    ['front diagonal scrape', front.position, [.012, 0, -.04], 2, layout.walls.front.outer],
    ['right diagonal scrape', right.position, [-.04, 0, .012], 0, layout.walls.right.outer],
  ]) {
    const point = vector(position), start = point.clone(); let contacts = 0;
    for (let i = 0; i < 35; i++) {
      const solve = world.resolve(point, vector(step)); contacts += solve.contacts.length;
      assert(point.toArray()[axis] >= limit + world.capsuleInfo.radius - .001);
    }
    check(`${name}: tangential movement continues while normal penetration is blocked`, () => {
      assert(contacts > 0); assert(point.distanceTo(start) > .35);
    });
  }
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.failure = error.stack; process.exitCode = 1; }
finally {
  world.dispose(); await unlink(temporary); report.finished = new Date().toISOString();
  await writeFile(process.env.STUDIO_CONTACT_REPORT || 'tests/v39-studio-contact-cpu.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, checks: report.checks.length, contacts: report.contacts.length, cameras: report.cameras.length, failure: report.failure }));
}
