import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const temporary=path.resolve('tests',`.planet-runtime-${process.pid}.mjs`);
await build({stdin:{contents:"export * as THREE from 'three';export {SapphirePlanet} from './src/scenes/sky/SapphirePlanet.js';export {SpaceCollision} from './src/core/SpaceCollision.js';export {CollisionManifest} from './src/config/CollisionManifest.js';export {CameraAvoidance} from './src/core/CameraAvoidance.js';export {AssetManifest} from './src/config/AssetManifest.js';",resolveDir:path.resolve('.')},bundle:true,platform:'browser',format:'esm',mainFields:['browser','module','main'],outfile:temporary,logLevel:'silent'});
const {THREE,SapphirePlanet,SpaceCollision,CollisionManifest,CameraAvoidance,AssetManifest}=await import(pathToFileURL(temporary).href);
const sourcePaths=['src/config/PlanetManifest.js','src/config/CollisionManifest.js','src/scenes/sky/SapphirePlanet.js','src/scenes/sky/SapphirePlanetShaders.js'];
const sourceHashes=Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
const report={at:new Date().toISOString(),kind:'production CPU geometry/lifecycle tests; NOT real browser play or visual approval',sourceHashes,checks:[]};
const scene=new THREE.Scene(),planet=new SapphirePlanet({scene}),position=planet.group.position.clone();
const anchors=Object.fromEntries([...new Set(CollisionManifest.dynamic.map(p=>p.anchor))].map(k=>{const a=new THREE.Object3D();a.position.set(500,500,500);return[k,a];}));anchors[planet.config.anchor]=planet.group;
const collision=new SpaceCollision(CollisionManifest,{anchors}),meshes=collision.cameraMeshes().filter(m=>m.name===planet.config.anchor);
const check=(name,fn)=>{fn();report.checks.push({name,passed:true});};
try{
  check('one explicit solid sphere; visual atmosphere/ring are absent from collision meshes',()=>{assert.equal(meshes.length,1);assert.equal(CollisionManifest.dynamic.filter(p=>p.anchor===planet.config.anchor).length,1);});
  check('inscribed BVH proxy encloses every high-resolution surface vertex',()=>{
    // Exact edge rays can miss adjacent triangles numerically. This convex
    // sphere proxy encloses the full visual sphere iff every face plane does.
    const g=meshes[0].geometry,a=g.attributes.position,index=g.index;
    const p=new THREE.Vector3(),q=new THREE.Vector3(),r=new THREE.Vector3(),normal=new THREE.Vector3();let nearest=Infinity;
    for(let i=0;i<(index?.count??a.count);i+=3){
      p.fromBufferAttribute(a,index?index.getX(i):i);q.fromBufferAttribute(a,index?index.getX(i+1):i+1);r.fromBufferAttribute(a,index?index.getX(i+2):i+2);
      normal.crossVectors(q.sub(p),r.sub(p));if(normal.lengthSq()<1e-12)continue;
      nearest=Math.min(nearest,Math.abs(normal.normalize().dot(p)));
    }
    assert.ok(nearest>=planet.config.radius,'proxy face cuts the physical planet');report.proxyMinimumFaceRadius=nearest;
  });
  check('entire ring plus body envelope is within the existing world bounds',()=>{
    const bounds=planet.getTelemetry().worldBounds;
    for(let axis=0;axis<3;axis++){assert.ok(bounds.min[axis]>AssetManifest.space.bounds.min[axis]+2.1);assert.ok(bounds.max[axis]<AssetManifest.space.bounds.max[axis]-2.1);}
  });
  check('all six approaches stop the body outside the physical planet',()=>{
    for(const d of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
      const direction=new THREE.Vector3(...d),origin=position.clone().addScaledVector(direction,9).add(new THREE.Vector3(0,-.95,0));
      const velocity=direction.clone().multiplyScalar(-7.6);let hit=false;
      for(let step=0;step<28;step++){const result=collision.resolve(origin,direction.clone().multiplyScalar(-.25),velocity);if(result.contacts.some(c=>c.collider===planet.config.anchor)){hit=true;break;}}
      assert.ok(hit,'no body contact from '+d);assert.ok(velocity.dot(direction)>-1);
    }
  });
  check('camera obstruction independently resolves with clear head/feet/centre and eye clearance',()=>{
    const evidence=[];
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,direction=new THREE.Vector3(Math.cos(a),.15,Math.sin(a)).normalize();
      const player=position.clone().addScaledVector(direction,8).add(new THREE.Vector3(0,-1,0)),target=player.clone().add(new THREE.Vector3(0,1,0));
      const avoid=new CameraAvoidance(()=>meshes);
      const view=avoid.resolve({position:position.clone().addScaledVector(direction,-10),target},player,d=>({position:target.clone().addScaledVector(d,16),target}),.05,null);
      assert.equal(avoid.telemetry.obstruction?.group,planet.config.anchor);assert.equal(avoid.telemetry.lineOfSightClear,true);
      assert.ok(view.position.distanceTo(position)>planet.config.radius+.30);evidence.push(avoid.telemetry);
    }
    report.cameraSamples=evidence;
  });
  check('shared dt time is invariant to frame rate and planet translation reaches ring shadow centre',()=>{
    const other=new SapphirePlanet({scene:new THREE.Scene()});
    for(let i=0;i<60;i++)planet.update(1/60);for(let i=0;i<144;i++)other.update(1/144);
    assert.ok(Math.abs(planet.surface.rotation.y-other.surface.rotation.y)<1e-10);
    assert.ok(Math.abs(planet.ring.rotation.y-other.ring.rotation.y)<1e-10);
    planet.group.position.x+=2;planet.update(0);assert.deepEqual(planet.ring.material.uniforms.uPlanetCenter.value.toArray(),planet.group.position.toArray());
    other.dispose();planet.group.position.copy(position);planet.update(0);
  });
  check('dispose releases each owned geometry/material exactly once, without disposing the scene',()=>{
    let released=0;for(const mesh of [planet.surface,planet.atmosphere,planet.ring]){mesh.geometry.addEventListener('dispose',()=>released++);mesh.material.addEventListener('dispose',()=>released++);}
    planet.dispose();planet.dispose();assert.equal(released,6);assert.equal(planet.group.parent,null);
  });
  report.status='passed';
}catch(error){report.status='failed';report.error=error.stack;process.exitCode=1;}
finally{collision.dispose();planet.dispose();await unlink(temporary);await writeFile(process.env.PLANET_REPORT||'tests/v08-planet-geometry.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,error:report.error}));}
