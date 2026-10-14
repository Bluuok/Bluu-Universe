import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const temporary = path.resolve('tests', `.star-river-geometry-${process.pid}.mjs`);
await build({
  stdin: {
    contents: "export * as THREE from 'three';export {sweptBody} from './src/scenes/sky/VortexField.js';export {StarRiverField} from './src/scenes/sky/StarRiverField.js';export {StarRiverManifest} from './src/config/StarRiverManifest.js';export {AssetManifest} from './src/config/AssetManifest.js';",
    resolveDir: path.resolve('.'),
    sourcefile: 'star-river-production-geometry.mjs',
  },
  bundle: true,
  platform: 'browser',
  format: 'esm',
  mainFields: ['browser', 'module', 'main'],
  outfile: temporary,
  logLevel: 'silent',
});

const { THREE, sweptBody, StarRiverField, StarRiverManifest, AssetManifest } = await import(pathToFileURL(temporary).href);
const sourcePaths = [
  'src/scenes/sky/VortexField.js',
  'src/scenes/sky/StarRiverField.js',
  'src/scenes/sky/PaintedCloudVolume.js',
  'src/config/StarRiverManifest.js',
  'src/scenes/sky/VortexPaintMaterial.js',
];
const report = {
  at: new Date().toISOString(),
  kind: 'production authoring-field topology plus rendered density-volume CPU regression; no browser, GPU or visual assessment',
  sourceHashes: Object.fromEntries(await Promise.all(sourcePaths.map(async file =>
    [file, createHash('sha256').update(await readFile(file)).digest('hex')]))),
  geometry: { curveSegments: 144, crossSegments: 24 },
  checks: [],
  rivers: [],
};
const check = (name, fn) => {
  fn();
  report.checks.push({ name, passed: true });
};

try {
  for (const config of StarRiverManifest) {
    const curveSegments = report.geometry.curveSegments;
    const crossSegments = report.geometry.crossSegments;
    const { geometry, curve } = sweptBody(config.points.map(point => new THREE.Vector3(...point)),
      config.paint, { curveSegments, crossSegments }, config.paint);
    const position = geometry.getAttribute('position');
    const normalAttribute = geometry.getAttribute('normal');
    const index = geometry.index;
    const sideIndexCount = curveSegments * crossSegments * 6;
    const expectedVertices = (curveSegments + 1) * (crossSegments + 1) + 2;
    const expectedTriangles = curveSegments * crossSegments * 2 + crossSegments * 2;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const edge1 = new THREE.Vector3(), edge2 = new THREE.Vector3(), face = new THREE.Vector3();
    const midpoint = new THREE.Vector3(), centre = new THREE.Vector3(), outward = new THREE.Vector3();
    let minimumDoubleArea = Infinity;
    let minimumSideOutwardCosine = Infinity;
    let minimumCapOutwardCosine = Infinity;
    let inwardSideTriangles = 0;
    let reversedCapTriangles = 0;
    let maximumSectionToBendRadius = 0;
    let tightestBend = null;

    for (let offset = 0; offset < index.count; offset += 3) {
      const ia = index.getX(offset), ib = index.getX(offset + 1), ic = index.getX(offset + 2);
      a.fromBufferAttribute(position, ia); b.fromBufferAttribute(position, ib); c.fromBufferAttribute(position, ic);
      edge1.subVectors(b, a); edge2.subVectors(c, a); face.crossVectors(edge1, edge2);
      const doubleArea = face.length();
      minimumDoubleArea = Math.min(minimumDoubleArea, doubleArea);
      if (doubleArea <= 1e-10) continue;
      face.divideScalar(doubleArea);
      midpoint.copy(a).add(b).add(c).multiplyScalar(1 / 3);
      if (offset < sideIndexCount) {
        const meanRing = (Math.floor(ia / (crossSegments + 1)) + Math.floor(ib / (crossSegments + 1)) + Math.floor(ic / (crossSegments + 1))) / 3;
        curve.getPointAt(THREE.MathUtils.clamp(meanRing / curveSegments, 0, 1), centre);
        outward.copy(midpoint).sub(centre);
        const cosine = face.dot(outward.normalize());
        minimumSideOutwardCosine = Math.min(minimumSideOutwardCosine, cosine);
        if (cosine <= 0) inwardSideTriangles++;
      } else {
        const startCap = offset < sideIndexCount + crossSegments * 3;
        curve.getTangentAt(startCap ? 0 : 1, outward).multiplyScalar(startCap ? -1 : 1);
        const cosine = face.dot(outward.normalize());
        minimumCapOutwardCosine = Math.min(minimumCapOutwardCosine, cosine);
        if (cosine <= 0) reversedCapTriangles++;
      }
    }

    for (let ring = 0; ring <= curveSegments; ring++) {
      const t = ring / curveSegments;
      curve.getPointAt(t, centre);
      let sectionRadius = 0;
      for (let cross = 0; cross < crossSegments; cross++) {
        a.fromBufferAttribute(position, ring * (crossSegments + 1) + cross);
        sectionRadius = Math.max(sectionRadius, a.distanceTo(centre));
      }
      const lo = Math.max(0, ring - 1) / curveSegments;
      const hi = Math.min(curveSegments, ring + 1) / curveSegments;
      const tangentLo = curve.getTangentAt(lo, new THREE.Vector3());
      const tangentHi = curve.getTangentAt(hi, new THREE.Vector3());
      const turn = tangentLo.angleTo(tangentHi);
      if (turn > 1e-7) {
        const pointLo = curve.getPointAt(lo, new THREE.Vector3());
        const pointHi = curve.getPointAt(hi, new THREE.Vector3());
        const bendRadius = pointLo.distanceTo(pointHi) / turn;
        const ratio = sectionRadius / bendRadius;
        if (ratio > maximumSectionToBendRadius) {
          maximumSectionToBendRadius = ratio;
          tightestBend = { ring, t, sectionRadius, bendRadius, turnRadians: turn };
        }
      }
    }

    let maximumSeamPositionError = 0;
    let maximumSeamNormalError = 0;
    for (let ring = 0; ring <= curveSegments; ring++) {
      const first = ring * (crossSegments + 1), last = first + crossSegments;
      a.fromBufferAttribute(position, first); b.fromBufferAttribute(position, last);
      maximumSeamPositionError = Math.max(maximumSeamPositionError, a.distanceTo(b));
      a.fromBufferAttribute(normalAttribute, first); b.fromBufferAttribute(normalAttribute, last);
      maximumSeamNormalError = Math.max(maximumSeamNormalError, a.distanceTo(b));
    }

    const evidence = {
      id: config.id,
      vertices: position.count,
      triangles: index.count / 3,
      minimumDoubleArea,
      minimumSideOutwardCosine,
      minimumCapOutwardCosine,
      inwardSideTriangles,
      reversedCapTriangles,
      maximumSeamPositionError,
      maximumSeamNormalError,
      maximumSectionToBendRadius,
      tightestBend,
      curvatureRisk: maximumSectionToBendRadius >= 1
        ? 'section reaches/exceeds estimated local bend radius; foldover risk'
        : maximumSectionToBendRadius >= .8
          ? 'section is close to estimated local bend radius; visually inspect tight bend'
          : 'section stays below 80% of estimated local bend radius',
    };
    report.rivers.push(evidence);

    check(`${config.id}: topology and every attribute/index value are finite`, () => {
      assert.equal(position.count, expectedVertices);
      assert.equal(index.count / 3, expectedTriangles);
      for (const attribute of Object.values(geometry.attributes)) {
        for (let component = 0; component < attribute.array.length; component++) {
          assert.ok(Number.isFinite(attribute.array[component]), `${attribute.name || 'attribute'}[${component}]`);
        }
      }
      for (let component = 0; component < index.count; component++) {
        const vertex = index.getX(component);
        assert.ok(Number.isInteger(vertex) && vertex >= 0 && vertex < position.count);
      }
    });
    check(`${config.id}: no side or end-cap triangle is degenerate`, () => {
      assert.ok(minimumDoubleArea > 1e-10, `minimum doubled area ${minimumDoubleArea}`);
    });
    check(`${config.id}: all side triangles face away from their sampled centreline`, () => {
      assert.equal(inwardSideTriangles, 0, `minimum cosine ${minimumSideOutwardCosine}`);
      assert.ok(minimumSideOutwardCosine > 0);
    });
    check(`${config.id}: both end caps face out of the closed volume`, () => {
      assert.equal(reversedCapTriangles, 0, `minimum cosine ${minimumCapOutwardCosine}`);
      assert.ok(minimumCapOutwardCosine > 0);
    });
    check(`${config.id}: closed cross-section seam has identical positions and normals`, () => {
      assert.ok(maximumSeamPositionError < 1e-5, `position seam ${maximumSeamPositionError}`);
      assert.ok(maximumSeamNormalError < 1e-6, `normal seam ${maximumSeamNormalError}`);
    });
    check(`${config.id}: surface section stays inside the estimated local bend radius`, () => {
      assert.ok(maximumSectionToBendRadius < 1, `section/bend-radius ratio ${maximumSectionToBendRadius}`);
    });
    geometry.dispose();
  }

  const scene = new THREE.Scene();
  const borrowedAtlas = new THREE.Texture();
  const borrowedPigment = new THREE.Texture();
  let atlasDisposals = 0, pigmentDisposals = 0;
  borrowedAtlas.addEventListener('dispose', () => atlasDisposals++);
  borrowedPigment.addEventListener('dispose', () => pigmentDisposals++);
  const field = new StarRiverField({ scene, brushAtlas: borrowedAtlas });
  const telemetry = field.getTelemetry();
  report.field = { telemetry };

  check('StarRiverField owns exactly two world-fixed permeable closed volumes inside exploration bounds', () => {
    assert.equal(field.rivers.length, 2);
    assert.equal(telemetry.length, 2);
    const worldMin = new THREE.Vector3(...AssetManifest.space.bounds.min);
    const worldMax = new THREE.Vector3(...AssetManifest.space.bounds.max);
    for (const river of telemetry) {
      assert.equal(river.worldFixed, true);
      assert.equal(river.closedVolume, true);
      assert.equal(river.permeable, true);
      assert.equal(river.triangles, 12, `${river.id} rendered bound must be a 12-triangle box`);
      assert.equal(river.volume.method, '64-step interior density ray integration from authored sweep');
      assert.ok(river.volume.bytes > 0);
      const minimum = new THREE.Vector3(...river.worldBounds.min);
      const maximum = new THREE.Vector3(...river.worldBounds.max);
      for (const axis of ['x', 'y', 'z']) {
        assert.ok(minimum[axis] > worldMin[axis], `${river.id} below ${axis} bound`);
        assert.ok(maximum[axis] < worldMax[axis], `${river.id} above ${axis} bound`);
      }
    }
  });

  const densityEvidence = field.rivers.map(({ config, mesh }) => {
    const density = mesh.material.userData.paintUniforms.cloudDensity.value;
    const { data, width, height, depth } = density.image;
    let nonzero = 0, interiorNonzero = 0, boundaryNonzero = 0, maximum = 0;
    for (let z = 0; z < depth; z++) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const value = data[x + width * (y + height * z)];
      if (value) {
        nonzero++;
        maximum = Math.max(maximum, value);
        if (x === 0 || y === 0 || z === 0 || x === width - 1 || y === height - 1 || z === depth - 1) boundaryNonzero++;
        else interiorNonzero++;
      }
    }
    return { id: config.id, density, data, resolution: [width, height, depth], bytes: data.length,
      nonzero, interiorNonzero, boundaryNonzero, maximum, fillRatio: nonzero / data.length };
  });
  report.field.density = densityEvidence.map(({ density, data, ...evidence }) => evidence);
  check('render meshes are box-entry bounds with finite, non-empty interior density', () => {
    for (const [index, { mesh }] of field.rivers.entries()) {
      const evidence = densityEvidence[index];
      assert.equal(mesh.geometry.index.count / 3, 12);
      assert.equal(evidence.bytes, evidence.resolution.reduce((product, value) => product * value, 1));
      assert.ok(evidence.data instanceof Uint8Array);
      assert.ok(evidence.data.every(Number.isFinite));
      assert.ok(evidence.interiorNonzero > 0, `${evidence.id} has no interior density`);
      assert.ok(evidence.maximum > 0, `${evidence.id} maximum density is empty`);
      assert.ok(evidence.fillRatio > 0 && evidence.fillRatio < 1);
    }
  });
  check('expanded density bounds leave every boundary voxel empty', () => {
    for (const evidence of densityEvidence) assert.equal(evidence.boundaryNonzero, 0, `${evidence.id} leaks to volume boundary`);
  });

  field.setPigmentTexture(borrowedPigment);
  field.setPlayerFocus(new THREE.Vector3(4, 5, 6));
  field.setPigmentTexture(null);
  field.setPlayerFocus(null);
  check('shared pigment failure/null and player-focus clearing leave owned materials usable', () => {
    for (const { mesh } of field.rivers) {
      const uniforms = mesh.material.userData.paintUniforms;
      assert.equal(uniforms.oilPaintMap.value, null);
      assert.equal(uniforms.oilPaintLoaded.value, 0);
      assert.equal(uniforms.oilFocusActive.value, 0);
      assert.equal(mesh.material.userData.permeable, true);
      assert.equal(mesh.material.disposed, undefined);
    }
  });

  let ownedGeometryDisposals = 0, ownedMaterialDisposals = 0;
  const densityDisposals = [];
  for (const [index, { mesh }] of field.rivers.entries()) {
    mesh.geometry.addEventListener('dispose', () => ownedGeometryDisposals++);
    mesh.material.addEventListener('dispose', () => ownedMaterialDisposals++);
    densityDisposals[index] = 0;
    mesh.material.userData.paintUniforms.cloudDensity.value.addEventListener('dispose', () => densityDisposals[index]++);
  }
  field.dispose();
  field.dispose();
  check('dispose is idempotent and releases each owned geometry/material exactly once', () => {
    assert.equal(ownedGeometryDisposals, 2);
    assert.equal(ownedMaterialDisposals, 2);
    assert.deepEqual(densityDisposals, [1, 1]);
    assert.equal(field.group.parent, null);
  });
  check('dispose never releases the borrowed brush atlas or pigment texture', () => {
    assert.equal(atlasDisposals, 0);
    assert.equal(pigmentDisposals, 0);
  });
  report.field.ownership = { ownedGeometryDisposals, ownedMaterialDisposals, densityDisposals, atlasDisposals, pigmentDisposals };
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = { message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  await unlink(temporary);
  report.finishedAt = new Date().toISOString();
  await writeFile(process.env.RIVER_REPORT || 'tests/v10-river-geometry-candidate.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ status: report.status, checks: report.checks.length, error: report.error?.message,
    rivers: report.rivers.map(({ id, minimumDoubleArea, minimumSideOutwardCosine, maximumSectionToBendRadius, curvatureRisk }) =>
      ({ id, minimumDoubleArea, minimumSideOutwardCosine, maximumSectionToBendRadius, curvatureRisk })) }));
}
