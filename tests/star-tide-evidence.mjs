// CPU-only. Run from each checkout using the same Node version and dependencies:
// node path/to/star-tide-evidence.mjs [checkout-root]
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';

const root = resolve(process.argv[2] || '.');
const source = file => import(pathToFileURL(resolve(root, 'src', file)));
const { AssetManifest: manifest } = await source('config/AssetManifest.js');
const { CameraDirector } = await source('core/CameraDirector.js');
const { PaintFlowManifest } = await source('config/PaintFlowManifest.js');
const { StarfieldBackdrop } = await source('scenes/StarfieldBackdrop.js');
const width = 1440, height = 960;
const camera = new THREE.PerspectiveCamera(43, width / height, .1, manifest.sky.cameraFar);
const director = new CameraDirector(camera, { focusOffset: manifest.space.cameraFocusOffset });
director.setViewport(width, height);
director.snapToSpace(new THREE.Vector3(...manifest.character.position));
camera.updateMatrixWorld();
const origin = camera.position.clone(), startRotation = camera.quaternion.clone();
const projection = p => new THREE.Vector3(...p).project(camera).toArray().map(x => +x.toFixed(4));
const startView = {
  eye: origin.toArray(), target: director.target.toArray(), playerNdc: projection(manifest.character.position),
  vortexNdc: projection(manifest.vortex.position),
  currentNdc: PaintFlowManifest.paths.find(p => p.id === 'broad-s-current').points.map(projection),
};
const sky = new StarfieldBackdrop({ scene: new THREE.Scene(), manifest: manifest.sky });
sky.group.updateMatrixWorld(true);
sky.prepareForCamera(camera);
const instanced = [];
sky.group.traverse(object => {
  if (object.geometry?.isInstancedBufferGeometry || object.isInstancedMesh) instanced.push(object);
});
const attributes = [...new Set(instanced.flatMap(mesh => [
  ...Object.values(mesh.geometry.attributes).filter(a => a.isInstancedBufferAttribute),
  mesh.instanceMatrix, mesh.instanceColor,
]).filter(Boolean))];
const versions = () => attributes.map(a => a.version);
const changedBytes = previous => attributes.reduce((sum, a, i) =>
  sum + (a.version === previous[i] ? 0 : a.array.byteLength), 0);
const percentiles = values => {
  const sorted = values.toSorted((a,b) => a-b);
  return Object.fromEntries([50,95].map(n => ['p'+n, +sorted[Math.floor((sorted.length-1)*n/100)].toFixed(3)]));
};
const times = [], uploaded = [];
const up = new THREE.Vector3(0,1,0), turn = new THREE.Quaternion();
for (let i = 0; i < 240; i++) {
  camera.quaternion.copy(startRotation).premultiply(turn.setFromAxisAngle(up, .38 * Math.sin(i / 45)));
  camera.updateMatrixWorld();
  const previous = versions(), begin = performance.now();
  sky.prepareForCamera(camera);
  const elapsed = performance.now() - begin;
  if (i >= 60) {
    times.push(elapsed);
    uploaded.push(changedBytes(previous));
  }
}
const previous = versions();
sky.prepareForCamera(camera);
assert.equal(changedBytes(previous), 0, 'Holding the camera still must not reupload instances');
const meshes = instanced.map(m => ({
  mesh: m.name, instances: m.isInstancedMesh ? m.count : m.geometry.instanceCount,
  transparent: m.material.transparent, depthWrite: m.material.depthWrite,
  triangles: (m.geometry.index?.count || m.geometry.attributes.position.count) / 3,
}));
// Orthographic pixel count would hide parallax. Sample projected triangles on
// a 4-pixel grid, with near-plane clipping. Count geometric overlap before
// depth rejection, without MSAA, glass, other scene geometry or illumination.
// Only the extra tide passes are counted; a baseline has zero extra samples.
const stride = 4, gridWidth = width / stride, gridHeight = height / stride;
const tide = instanced.filter(m => m.geometry.hasAttribute('tideCentre'));
for (const m of tide) {
  assert.equal(m.material.transparent,false);
  assert.equal(m.material.depthWrite,true);
  for (const attr of Object.values(m.geometry.attributes)) {
    assert.equal(attr.version,0,'Camera turns must not dirty static tide buffers');
  }
}
function addTriangle(points, coverage) {
  const vertices = [];
  for (let i = 0; i < 3; i++) {
    const a = points[i], b = points[(i+1)%3], near = -camera.near;
    if (a.z <= near) vertices.push(a);
    if ((a.z <= near) !== (b.z <= near)) vertices.push(a.clone().lerp(b,(near-a.z)/(b.z-a.z)));
  }
  if (vertices.length < 3) return;
  const p = vertices.map(v => {
    const ndc = v.clone().applyMatrix4(camera.projectionMatrix);
    return { x:(1+ndc.x)*gridWidth/2, y:(1-ndc.y)*gridHeight/2 };
  });
  for (let i = 1; i < p.length-1; i++) {
    const [a,b,c] = [p[0],p[i],p[i+1]];
    const edge = (u,v,x,y) => (v.x-u.x)*(y-u.y)-(v.y-u.y)*(x-u.x);
    const sign = Math.sign(edge(a,b,c.x,c.y));
    if (!sign) continue;
    const left = Math.max(0, Math.ceil(Math.min(a.x,b.x,c.x)-.5));
    const right = Math.min(gridWidth-1, Math.floor(Math.max(a.x,b.x,c.x)-.5));
    const top = Math.max(0, Math.ceil(Math.min(a.y,b.y,c.y)-.5));
    const bottom = Math.min(gridHeight-1, Math.floor(Math.max(a.y,b.y,c.y)-.5));
    for (let y=top; y<=bottom; y++) for (let x=left; x<=right; x++) {
      if (sign*edge(a,b,x+.5,y+.5)>=0 && sign*edge(b,c,x+.5,y+.5)>=0 &&
          sign*edge(c,a,x+.5,y+.5)>=0) coverage[y*gridWidth+x]++;
    }
  }
}
function projectedTide() {
  const grid = new Uint16Array(gridWidth*gridHeight);
  for (const m of tide) {
    const {attributes:a,index,instanceCount} = m.geometry;
    const view = new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse,m.matrixWorld);
    for (let i=0; i<instanceCount; i++) {
      const vec = attr => new THREE.Vector3().fromBufferAttribute(attr,i);
      const centre = vec(a.tideCentre), along = vec(a.tideAlong), across = vec(a.tideAcross);
      if (a.tideStyle.getZ(i)<0) centre.addScaledVector(along.clone().normalize(),
        Math.sin(a.tideStyle.getW(i)*6.28)*.55);
      const face = new THREE.Vector3().crossVectors(along,across).normalize();
      const points = Array.from({length:a.position.count}, (_,j) => {
        const x=a.position.getX(j), y=a.position.getY(j), belly=1-x*x;
        return centre.clone().addScaledVector(along,x)
          .addScaledVector(across, y*(.035+.965*belly)+belly*a.tideStyle.getX(i))
          .addScaledVector(face, across.length()*(1-Math.abs(y))*belly*.48).applyMatrix4(view);
      });
      for (let j=0; j<index.count; j+=3) addTriangle(
        [points[index.getX(j)],points[index.getX(j+1)],points[index.getX(j+2)]],grid);
    }
  }
  const sum = grid.reduce((a,b)=>a+b,0), hit = grid.filter(n=>n>0);
  return { extraFrameCoveragePct: +(100*hit.length/grid.length).toFixed(2),
    extraFragmentAreaPct: +(100*sum/grid.length).toFixed(2),
    meanLayersOnCoveredSamples: hit.length ? +(sum/hit.length).toFixed(2) : 0,
    maxLayersOnOneSample: grid.reduce((a,b)=>Math.max(a,b),0) };
}
camera.quaternion.copy(startRotation);
camera.position.copy(origin);
camera.updateMatrixWorld();
const extraCoverage = { opening:projectedTide() };
function brushWidths() {
  return tide.map(m => {
    const a=m.geometry.attributes, widths=[];
    for (let i=0;i<m.geometry.instanceCount;i++) {
      const position=new THREE.Vector3().fromBufferAttribute(a.tideCentre,i);
      const centre=position.clone().applyMatrix4(m.matrixWorld).project(camera);
      if (!insideScreen(centre)) continue;
      const edge=position.add(new THREE.Vector3().fromBufferAttribute(a.tideAcross,i))
        .applyMatrix4(m.matrixWorld).project(camera);
      widths.push(Math.hypot((centre.x-edge.x)*width,(centre.y-edge.y)*height));
    }
    return { mesh:m.name, visibleCentres:widths.length, belowOnePixel:widths.filter(w=>w<1).length,
      widthPixels:widths.length ? percentiles(widths) : null };
  });
}
function insideScreen(p) { return Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z)) < 1; }
const openingWidths=brushWidths();
function lookFrom(eye, direction) {
  camera.position.fromArray(eye);
  camera.lookAt(camera.position.clone().add(new THREE.Vector3(...direction)));
  camera.updateMatrixWorld();
}
function visibleCentres() {
  return tide.map(({geometry:g,matrixWorld}) => Array.from({length:g.instanceCount}, (_,i) =>
    new THREE.Vector3().fromBufferAttribute(g.attributes.tideCentre,i).applyMatrix4(matrixWorld).project(camera)));
}
const sideDirection = [-23,-2,-37];
lookFrom([-20,4,-9],sideDirection);
const sideStart = visibleCentres();
extraCoverage.strafeStart = projectedTide();
lookFrom([-5,4,-17],sideDirection);
const sideEnd = visibleCentres();
extraCoverage.strafeEnd = projectedTide();
const strafePixels = tide.map((m,batch) => {
  const travel = sideStart[batch].flatMap((p,i) => {
    const q = sideEnd[batch][i];
    return insideScreen(p) && insideScreen(q) ? [Math.hypot((p.x-q.x)*width/2,(p.y-q.y)*height/2)] : [];
  });
  return { mesh:m.name, centresInBothViews:travel.length, pixels:travel.length ? percentiles(travel) : null };
});
for (const [name,player,yaw] of [
  ['approach',[-28,5,-33],.46],['through',[-39,3,-55],.46],['lookBack',[-39,3,-55],.46+Math.PI],
]) {
  const s=Math.sin(yaw), c=Math.cos(yaw);
  lookFrom([player[0]+6*s,player[1]+2.1,player[2]+6*c],[-10*s,-1.1,-10*c]);
  extraCoverage[name] = projectedTide();
}
camera.position.set(-1.1,3.3,1.1);
camera.lookAt(new THREE.Vector3(...manifest.building.rightWindow.center));
camera.updateMatrixWorld();
extraCoverage.insideRightWindow = projectedTide();
console.log(JSON.stringify({
  viewport: [width,height], startView, meshes, turnSamples: times.length, extraCoverage, strafePixels, openingWidths,
  prepareForCameraMs: percentiles(times), dirtyAttributeBytesPerTurn: percentiles(uploaded),
}, null, 2));
sky.dispose();
