import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPainterlyParallax} from '../src/scenes/sky/PainterlyParallax.js';
import {StarfieldBackdrop} from '../src/scenes/StarfieldBackdrop.js';

const config = {count:120, seed:4417, radii:[245,345,455], weights:[.20,.30,.50], opacity:.50};
const one = createPainterlyParallax(config,{intensity:.32,longitude:.16});
const two = createPainterlyParallax(config,{intensity:.32,longitude:.16});
try {
  assert.equal(one.geometry.instanceCount,120);
  assert.equal(one.userData.layerCounts.reduce((a,b)=>a+b),120);
  assert.deepEqual(one.userData.layerCounts,[24,36,60]);
  assert.deepEqual(one.userData.radii,[245,345,455]);
  assert.equal(one.geometry.getAttribute('strokeDirection').count,120);
  assert.equal(one.geometry.getAttribute('strokeSize').count,120);
  assert.equal(one.geometry.getAttribute('strokeSeed').count,120);
  assert.equal(one.material.depthTest,true);
  assert.equal(one.material.depthWrite,false);
  assert.equal(one.material.transparent,true);
  assert.equal(one.renderOrder,-38);
  assert.equal(one.frustumCulled,false);
  assert.equal(one.visible,false);
  assert.deepEqual(one.geometry.getAttribute('strokeDirection').array,
    two.geometry.getAttribute('strokeDirection').array);
  assert.deepEqual(one.geometry.getAttribute('strokeSize').array,
    two.geometry.getAttribute('strokeSize').array);
  assert.deepEqual(one.geometry.getAttribute('strokeSeed').array,
    two.geometry.getAttribute('strokeSeed').array);
  const d=one.geometry.getAttribute('strokeDirection');
  const r=one.geometry.getAttribute('strokeRadius');
  for(let i=0;i<120;i++){
    assert.ok(Math.abs(Math.hypot(d.getX(i),d.getY(i),d.getZ(i))-1)<1e-5);
    assert.equal(r.getX(i), i<24?245:i<60?345:455);
    assert.ok(Number.isFinite(one.geometry.getAttribute('strokeSize').getX(i)));
  }
  assert.throws(()=>createPainterlyParallax({...config,radii:[345,245,455]}),/Invalid/);
  assert.throws(()=>createPainterlyParallax({...config,weights:[.2,.3,.4]}),/Invalid/);
  assert.throws(()=>createPainterlyParallax({...config,count:0}),/Invalid/);
  const names=['strokeDirection','strokeSize','strokeSeed','strokeRadius','strokeOpacity'];
  const records=()=>Array.from({length:120},(_,i)=>names.flatMap(name=>{
    const a=one.geometry.getAttribute(name);
    return Array.from(a.array.slice(i*a.itemSize,(i+1)*a.itemSize));
  }).join(',')).sort();
  const original=records(),parent=new THREE.Group(),camera=new THREE.PerspectiveCamera();
  parent.position.set(9,-3,11);parent.rotation.set(.2,-.4,.15);parent.add(one);
  parent.updateMatrixWorld(true);
  for(const position of [[0,0,0],[160,20,-25],[245,0,0],[520,180,-70]]){
    camera.position.fromArray(position);camera.lookAt(0,12,-30);camera.updateWorldMatrix(true,false);
    const view=camera.matrixWorld.clone(),world=one.matrixWorld.clone();
    assert.equal(one.sortForCamera(camera),true);
    const modelView=new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse,one.matrixWorld);
    const direction=one.geometry.getAttribute('strokeDirection'),radius=one.geometry.getAttribute('strokeRadius');
    let previous=-Infinity;
    for(let i=0;i<120;i++){
      const z=new THREE.Vector3().fromBufferAttribute(direction,i).multiplyScalar(radius.getX(i)).applyMatrix4(modelView).z;
      assert.ok(z>=previous-1e-5,'Transparent stroke centres must draw back to front');previous=z;
    }
    assert.deepEqual(records(),original,'Sorting must preserve every complete world-fixed stroke record');
    assert.ok(camera.matrixWorld.equals(view));assert.ok(one.matrixWorld.equals(world));
    const version=direction.version;
    assert.equal(one.sortForCamera(camera),false);assert.equal(direction.version,version);
  }
  console.log('Painterly parallax: three shells, deterministic GPU instances, bounded non-colliding geometry OK');
} finally {
  for (const mesh of [one,two]) {mesh.geometry.dispose();mesh.material.dispose();}
}

// Integration: the new layer borrows exactly the SAME panorama texture;
// no third-party pixels, additional loader, camera-following root or new loop.
const scene=new THREE.Scene();
const sky=new StarfieldBackdrop({scene,manifest:{parallax:config}});
const panorama=new THREE.Texture();
let panoramaDisposes=0;
panorama.addEventListener('dispose',()=>panoramaDisposes++);
try{
  assert.equal(scene.children.includes(sky.group),true);
  assert.equal(sky.parallax.parent,sky.group);
  assert.deepEqual(sky.parallax.position.toArray(),sky.environment.position.toArray());
  assert.equal(sky.parallax.visible,false);
  assert.equal(sky.parallax.material.uniforms.panorama.value,null);
  sky.setTexture(panorama);
  assert.equal(sky.environment.material.uniforms.panorama.value,panorama);
  assert.equal(sky.brushwork.material.uniforms.panorama.value,panorama);
  assert.equal(sky.parallax.material.uniforms.panorama.value,panorama);
  assert.equal(sky.parallax.visible,true);
  assert.equal(sky.ownedTextures.size,0);
  const telemetry=sky.getTelemetry().parallaxBrushwork;
  assert.deepEqual(telemetry.shellRadii,config.radii);
  assert.deepEqual(telemetry.shellCounts,[24,36,60]);
  assert.equal(telemetry.collidable,false);
  assert.equal(telemetry.cameraAttached,false);
  assert.equal(telemetry.drawCalls,1);
} finally {sky.dispose();}
assert.equal(panoramaDisposes,0,'Shared texture must be disposed only by its asset owner');

const disabled=new StarfieldBackdrop({manifest:{parallax:{enabled:false}}});
try {assert.equal(disabled.parallax,null);assert.deepEqual(disabled.getTelemetry().parallaxBrushwork,{enabled:false});}
finally {disabled.dispose();}
console.log('Painterly parallax: texture sharing, load gating, disposal, disabling OK');
