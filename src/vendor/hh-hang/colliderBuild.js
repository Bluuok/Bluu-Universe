// Direct TypeScript-to-JavaScript conversion; original collision algorithm unchanged.
// Source: hh-hang/three-player-controller v0.6.2 @ ca82bbc76a3b9b0afa80c73b60167adf6123b9b6
// src/collision/colliderBuild.ts, full module.
// MIT; original license retained in LICENSE.three-player-controller.txt.
import * as THREE from "three";
import { MeshBVH, acceleratedRaycast } from "three-mesh-bvh";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
function isExcludedFromCollider(object) {
  let current = object;
  while (current) {
    if (current.userData.excludeFromCollider === true) return true;
    current = current.parent;
  }
  return false;
}
function ensureAttributesMinimal(geom) {
  if (!geom.attributes.position) return null;
  const position = geom.attributes.position.array;
  for (let i = 0; i < position.length; i++) {
    if (!Number.isFinite(position[i])) return null;
  }
  if (geom.attributes.position.count < 3) return null;
  if (!geom.attributes.normal) geom.computeVertexNormals();
  if (!geom.attributes.uv) {
    const count = geom.attributes.position.count;
    geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  return geom;
}
function unifiedAttribute(collected) {
  const attrMap = /* @__PURE__ */ new Map();
  const attrConflict = /* @__PURE__ */ new Set();
  const required = /* @__PURE__ */ new Set(["position", "normal", "uv"]);
  for (const g of collected)
    for (const name of Object.keys(g.attributes))
      if (!required.has(name)) g.deleteAttribute(name);
  for (const g of collected) {
    for (const name of Object.keys(g.attributes)) {
      const attr = g.attributes[name];
      const ctor = attr.array.constructor;
      if (!attrMap.has(name)) {
        attrMap.set(name, { itemSize: attr.itemSize, arrayCtor: ctor, examples: 1, normalized: attr.normalized });
      } else {
        const m = attrMap.get(name);
        if (m.itemSize !== attr.itemSize || m.arrayCtor !== ctor || m.normalized !== attr.normalized) attrConflict.add(name);
        else m.examples++;
      }
    }
  }
  for (const name of attrConflict) {
    for (const g of collected) if (g.attributes[name]) g.deleteAttribute(name);
    attrMap.delete(name);
  }
  for (const [name, meta] of attrMap) {
    for (const g of collected) {
      if (!g.attributes[name]) {
        const count = g.attributes.position.count;
        g.setAttribute(name, new THREE.BufferAttribute(new meta.arrayCtor(count * meta.itemSize), meta.itemSize, meta.normalized));
      }
    }
  }
  return collected;
}
function collectWorldSpaceGeometries(sources) {
  const collected = [];
  const collectMesh = (mesh) => {
    try {
      let geom = mesh.geometry.clone();
      geom.applyMatrix4(mesh.matrixWorld);
      if (geom.index) geom = geom.toNonIndexed();
      const safe = ensureAttributesMinimal(geom);
      if (safe) collected.push(safe);
    } catch (e) {
      console.warn("\u5904\u7406\u7F51\u683C\u65F6\u51FA\u9519\uFF1A", mesh, e);
    }
  };
  for (const obj of sources) {
    obj.updateMatrixWorld(true);
    obj.traverse((c) => {
      const a = c;
      if ((a.isMesh || a.isLineSegments) && a.geometry && c.name !== "capsule" && !isExcludedFromCollider(c)) collectMesh(a);
    });
  }
  return collected;
}
const _rtcTranslation = new THREE.Matrix4();
const _rtcCenter = new THREE.Vector3();
function recenterGeometry(geometry, target) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box || box.isEmpty()) {
    target.set(0, 0, 0);
    return target;
  }
  box.getCenter(target);
  if (target.lengthSq() === 0) return target;
  geometry.translate(-target.x, -target.y, -target.z);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return target;
}
function makeDebugMesh(geometry, localSpace) {
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      opacity: 0.5,
      transparent: true,
      wireframe: true,
      depthTest: true,
      side: THREE.DoubleSide
    })
  );
  mesh.raycast = acceleratedRaycast;
  if (localSpace) {
    mesh.matrixAutoUpdate = false;
  } else {
    mesh.layers.enable(1);
  }
  return mesh;
}
function buildStaticMergedMesh(sources) {
  const list = Array.isArray(sources) ? sources : [sources];
  let collected = collectWorldSpaceGeometries(list);
  if (!collected.length) return null;
  collected = unifiedAttribute(collected);
  const merged = BufferGeometryUtils.mergeGeometries(collected, false);
  if (!merged) {
    console.error("\u5408\u5E76\u51E0\u4F55\u5931\u8D25");
    return null;
  }
  return { mesh: makeDebugMesh(merged, false), geometry: merged };
}
function buildKinematicMergedMesh(source) {
  source.updateMatrixWorld(true);
  let collected = collectWorldSpaceGeometries([source]);
  if (!collected.length) return null;
  collected = unifiedAttribute(collected);
  const merged = BufferGeometryUtils.mergeGeometries(collected, false);
  if (!merged) {
    console.error("\u5408\u5E76\u8FD0\u52A8\u5B66\u51E0\u4F55\u5931\u8D25");
    return null;
  }
  const rtcCenter = recenterGeometry(merged, _rtcCenter);
  const bakeInverse = new THREE.Matrix4().copy(source.matrixWorld).invert();
  bakeInverse.multiply(_rtcTranslation.makeTranslation(rtcCenter.x, rtcCenter.y, rtcCenter.z));
  const mesh = makeDebugMesh(merged, true);
  mesh.matrix.copy(source.matrixWorld).multiply(bakeInverse);
  mesh.updateMatrixWorld(true);
  return { mesh, geometry: merged, bakeInverse };
}
function attachBoundsTree(geometry, options) {
  const maxDepth = options.maxDepth;
  const sync = () => {
    const bvh = maxDepth != null ? new MeshBVH(geometry, { maxDepth }) : new MeshBVH(geometry);
    geometry.boundsTree = bvh;
    options.onReady(bvh);
  };
  if (!options.useWorker || !options.workerPool) {
    sync();
    return;
  }
  void options.workerPool.generate(geometry).then((bvh) => {
    if (options.onStale?.()) return;
    geometry.boundsTree = bvh;
    options.onReady(bvh);
  }).catch((error) => {
    if (options.onStale?.()) return;
    console.warn("\u5F02\u6B65\u6784\u5EFA BVH \u5931\u8D25\uFF0C\u56DE\u9000\u5230\u4E3B\u7EBF\u7A0B\uFF1A", error);
    sync();
  });
}
export {
  attachBoundsTree,
  buildKinematicMergedMesh,
  buildStaticMergedMesh,
  ensureAttributesMinimal,
  unifiedAttribute
};
