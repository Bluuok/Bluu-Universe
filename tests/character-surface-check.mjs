import * as THREE from 'three';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {CharacterScene} from '../src/scenes/CharacterScene.js';
import {AssetManifest} from '../src/config/AssetManifest.js';
import {AnimationMap} from '../src/config/AnimationMap.js';
import {CollisionManifest} from '../src/config/CollisionManifest.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const nativeFetch=globalThis.fetch,NativeRequest=globalThis.Request,base=(process.env.CHARACTER_URL||'http://127.0.0.1:4259').replace(/\/$/,'');
const manifestBytes=Buffer.from(await(await nativeFetch(base+'/assets/character/manifest.json')).arrayBuffer()),manifest=JSON.parse(manifestBytes);
const awaitedGLB=await readFile('public/assets/character/astronaut.glb');
const report={method:'Detached actual GLTFLoader/CharacterScene CPU rigs; embedded image decode uses dimensions-only stub. No GPU/art/input acceptance inferred.',manifestSHA256:hash(manifestBytes),checks:[],poses:[]};let baseline=false;
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:2048,height:2048,close(){}});
globalThis.ProgressEvent=class extends Event{constructor(type,props){super(type);Object.assign(this,props);}};
globalThis.Request=class extends NativeRequest{constructor(url,opts){super(typeof url==='string'&&url.startsWith('/')?base+url:url,opts);}};
globalThis.fetch=(url,opts)=>{if(baseline&&String(url).endsWith('/assets/character/manifest.json'))return Promise.resolve(new Response(JSON.stringify({...manifest,surface:null})));return nativeFetch(typeof url==='string'&&url.startsWith('/')?base+url:url,opts);};
const scene=new THREE.Scene(),current=new CharacterScene({scene,manifest:structuredClone(AssetManifest.character),animationMap:AnimationMap}),prior=new CharacterScene({scene,manifest:structuredClone(AssetManifest.character),animationMap:AnimationMap});
const check=(name,fn)=>{const evidence=fn();report.checks.push({name,passed:true,evidence});};
function envelope(capsule){scene.updateMatrixWorld(true);const p=new THREE.Vector3(),origin=current.group.position,start=origin.y+capsule.footOffsetY+capsule.radius;let maximum=0,worst=null;for(const m of current.getSolidMeshes()){m.skeleton?.update();for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,p).applyMatrix4(m.matrixWorld);const distance=Math.hypot(p.x-origin.x,p.z-origin.z,p.y-THREE.MathUtils.clamp(p.y,start,start+capsule.segmentLength));if(distance>maximum){maximum=distance;worst={mesh:m.name||m.type,vertex:i,local:p.clone().sub(origin).toArray()};}}}return {maximum,worst,radius:capsule.radius+capsule.skin,enclosed:maximum<=capsule.radius+capsule.skin};}
try{
 await current.load();baseline=true;await prior.load();baseline=false;
 report.surface=current.surfaceTelemetry;
 check('Original haefu GLB bytes remain locked',()=>{assert.equal(manifest.sha256,hash(awaitedGLB));assert.equal(hash(awaitedGLB),'0fc948127a889f64ed4659f74d084d998eb68acb92d7a892965a03edbea2905d');return {glbSHA256:hash(awaitedGLB)};});
 check('Only bounded backpack positions change; topology, UV and all skin bindings stay exact',()=>{
  let changed=0,newCollapsed=0,oldCollapsed=0,reversed=0;current.model.traverse(m=>{if(!m.isMesh)return;const old=prior.model.getObjectByName(m.name).geometry,g=m.geometry;assert.deepEqual(g.index?.array,old.index?.array);for(const key of ['uv','skinIndex','skinWeight'])assert.deepEqual(g.attributes[key].array,old.attributes[key].array);for(let i=0;i<g.attributes.position.count;i++){let different=false;for(let k=0;k<3;k++)different ||= Math.abs(g.attributes.position.array[i*3+k]-old.attributes.position.array[i*3+k])>1e-7;if(different)changed++;assert(Math.abs(new THREE.Vector3().fromBufferAttribute(g.attributes.normal,i).length()-1)<1e-4);}assert([...g.attributes.position.array,...g.attributes.normal.array].every(Number.isFinite));
    const face=(geo,i)=>{const a=new THREE.Vector3().fromBufferAttribute(geo.attributes.position,geo.index.getX(i)),b=new THREE.Vector3().fromBufferAttribute(geo.attributes.position,geo.index.getX(i+1)),c=new THREE.Vector3().fromBufferAttribute(geo.attributes.position,geo.index.getX(i+2));return b.sub(a).cross(c.sub(a));};
    for(let i=0;i<g.index.count;i+=3){const a=face(g,i),b=face(old,i);if(a.lengthSq()===0)newCollapsed++;if(b.lengthSq()===0)oldCollapsed++;if(a.dot(b)<0)reversed++;}
  });assert(newCollapsed<=oldCollapsed);assert.equal(reversed,0);
  const bevel=current.surfaceTelemetry.bevel,modified=bevel.reduce((s,m)=>s+m.modifiedVertices,0);assert(modified>0);assert(changed>0);assert(bevel.every(m=>m.maxDisplacement<.10));return {changed,newCollapsed,oldCollapsed,reversed,bevel,normals:current.surfaceTelemetry.normals};
 });
 let time=0;
 for(const [name,thrust,braking,pitch,turn]of [['float',0,false,0,0],['thrust',1,false,0,0],['rise-look',1,false,1.3,.035],['fall-look',1,false,-1.3,-.035],['brake',0,true,0,0],['coast',0,false,0,0]]){
  const speed=name==='float'?0:thrust||.3;
  let worst=0;for(let i=0;i<90;i++){time+=1/60;current.update(1/60,time,speed,new THREE.Vector3(0,0,-12*speed),{thrust,braking,pitch,yaw:i*turn});const e=envelope(CollisionManifest.capsule);worst=Math.max(worst,e.maximum);assert(e.enclosed,name+' body exceeds unchanged capsule');}
  assert(Math.abs(current.modelRoot.rotation.x)<.29);report.poses.push({name,worst,lean:current.modelRoot.rotation.x,wake:current.wake.telemetry});
 }
 for(let i=0;i<180;i++){time+=1/60;current.update(1/60,time,0,new THREE.Vector3(),{thrust:0,pitch:0,yaw:0});}
 check('Resting body and opaque nozzles fit the existing narrow docking capsule',()=>{const e=envelope(CollisionManifest.dockingCapsule);report.docking=e;assert(e.enclosed);return e;});
 check('All opaque fittings and flame fade with the character',()=>{current.setPresence(0);for(const m of current.getSolidMeshes())for(const mat of [m.material].flat()){assert.equal(mat.opacity,0);assert.equal(mat.depthWrite,false);}for(const jet of current.exhaust.jets)assert.equal(jet.flame.material.uniforms.presence.value,0);current.setPresence(1);return {opaqueMeshes:current.getSolidMeshes().length};});
 report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;}
finally{current.dispose();prior.dispose();await writeFile('tests/v19-character-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
