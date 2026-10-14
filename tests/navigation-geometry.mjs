import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const file=path.resolve('tests',`.starhaven-navigation-${process.pid}.mjs`);
await build({stdin:{contents:"export * as THREE from 'three';export {SpaceCollision} from './src/core/SpaceCollision.js';export {CollisionManifest} from './src/config/CollisionManifest.js';export {CameraAvoidance} from './src/core/CameraAvoidance.js';export {CameraDirector} from './src/core/CameraDirector.js';export {SpaceController} from './src/core/SpaceController.js';export {AssetManifest} from './src/config/AssetManifest.js';export {VortexField} from './src/scenes/sky/VortexField.js';",resolveDir:path.resolve('.'),sourcefile:'navigation-test.mjs'},bundle:true,platform:'browser',format:'esm',mainFields:['browser','module','main'],outfile:file,logLevel:'silent'});
const {THREE,SpaceCollision,CollisionManifest,CameraAvoidance,CameraDirector,SpaceController,AssetManifest,VortexField}=await import(pathToFileURL(file).href);
const report={startedAt:new Date().toISOString(),environment:'Node, production browser-resolved single Three bundle; geometric/input fixtures, not player routes or visual evidence',checks:[]};
report.sourceHashes=Object.fromEntries(await Promise.all(['src/scenes/sky/VortexField.js','src/scenes/sky/PaintedCloudVolume.js','src/scenes/sky/VortexPaintMaterial.js'].map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
const bundle=(await readFile('dist/index.html','utf8')).match(/assets\/(index-[^" ]+\.js)/)[1];
report.buildIdentity={bundle,sha256:createHash('sha256').update(await readFile('dist/assets/'+bundle)).digest('hex')};
const check=(name,fn)=>{fn();report.checks.push({name,status:'passed'});};
const anchors=Object.fromEntries([...new Set(CollisionManifest.dynamic.map(p=>p.anchor))].map(k=>{const a=new THREE.Object3D();a.position.set(500,500,500);return[k,a];}));
const vortex=new VortexField({scene:new THREE.Scene(),manifest:AssetManifest.vortex});anchors[AssetManifest.vortex.core.anchor]=vortex.coreAnchor;
const collision=new SpaceCollision(CollisionManifest,{anchors});
try {
 const bounds={min:new THREE.Vector3(...AssetManifest.space.bounds.min),max:new THREE.Vector3(...AssetManifest.space.bounds.max)},limits=collision.bodyBounds(bounds),c=CollisionManifest.capsule,r=c.radius+c.skin;
 const extents={min:new THREE.Vector3(-r,c.footOffsetY-c.skin,-r),max:new THREE.Vector3(r,c.footOffsetY+2*c.radius+c.segmentLength+c.skin,r)};
 for(const side of ['min','max'])for(const axis of ['x','y','z'])check(`full capsule ${axis} ${side} includes skin`,()=>assert.ok(Math.abs(limits[side][axis]+extents[side][axis]-bounds[side][axis])<1e-9));
 const core=vortex.coreAnchor.getWorldPosition(new THREE.Vector3()),vortexInfo=vortex.getTelemetry();
 report.vortex=vortexInfo;
 check('vortex front, middle and back are reachable by the full capsule',()=>{for(const point of Object.values(vortexInfo.passage))for(let axis=0;axis<3;axis++){const key=['x','y','z'][axis];assert.ok(point[axis]>limits.min[key]+1&&point[axis]<limits.max[key]-1);}});
 check('vortex rear and side have space beyond the entire visual volume',()=>{const box=vortexInfo.worldBounds;for(let i=0;i<3;i++){assert.ok(box.min[i]>bounds.min.toArray()[i]+4);assert.ok(box.max[i]<bounds.max.toArray()[i]-4);}});
 check('authored sweep fields have outward faces and a continuous cross-section seam before density baking',()=>{
   for(const {mesh,curve,authoringGeometry:g} of vortex.bands){const p=g.attributes.position,n=g.attributes.normal,index=g.index,{curveSegments:cs,crossSegments:ns}=AssetManifest.vortex.geometry;
     for(let i=0;i<=cs;i++){const a=i*(ns+1),b=a+ns;assert.ok(new THREE.Vector3().fromBufferAttribute(p,a).distanceTo(new THREE.Vector3().fromBufferAttribute(p,b))<1e-5);assert.ok(new THREE.Vector3().fromBufferAttribute(n,a).distanceTo(new THREE.Vector3().fromBufferAttribute(n,b))<1e-6);}
     for(let k=0;k<cs*ns*6;k+=3){const ids=[index.getX(k),index.getX(k+1),index.getX(k+2)],vertices=ids.map(id=>new THREE.Vector3().fromBufferAttribute(p,id)),normal=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).normalize(),mid=vertices[0].clone().add(vertices[1]).add(vertices[2]).divideScalar(3),t=ids.reduce((sum,id)=>sum+Math.floor(id/(ns+1)),0)/(3*cs);assert.ok(normal.dot(mid.sub(curve.getPointAt(t)).normalize())>0,mesh.name+' inward side triangle '+k);}
   }
 });
 check('rendered vortex bands are density-filled 12-triangle entry boxes, not swept skins',()=>{
   for(const {mesh} of vortex.bands){const density=mesh.material.userData.paintUniforms.cloudDensity.value,image=density.image;
     assert.equal(mesh.geometry.index.count/3,12);assert.ok(image.data instanceof Uint8Array);assert.equal(image.data.length,image.width*image.height*image.depth);assert.ok(image.data.some(value=>value>0));
     assert.equal(mesh.userData.cloudVolume.method,'64-step interior density ray integration from authored sweep');
   }
 });
 check('open cloud corridor passes production BVHs without decorative contacts',()=>{const front=new THREE.Vector3(...vortexInfo.passage.front),back=new THREE.Vector3(...vortexInfo.passage.back);assert.equal(collision.canTraverse(front,back),true);assert.deepEqual(collision.lastTraversal.contacts,[]);});
 check('real anchored star core stops a moving character capsule',()=>{const origin=core.clone().add(new THREE.Vector3(0,-.95,7)),velocity=new THREE.Vector3(0,0,-7.6);let contact=null;for(let i=0;i<24;i++){const result=collision.resolve(origin,new THREE.Vector3(0,0,-.3),velocity);if(result.contacts.some(c=>c.collider===AssetManifest.vortex.core.anchor)){contact=result;break;}}assert.ok(contact);assert.ok(origin.z>core.z+AssetManifest.vortex.core.radius+r-.09);assert.ok(velocity.z>-.5);report.vortexBodyContact=contact;});
 const starMeshes=collision.cameraMeshes().filter(mesh=>mesh.name===AssetManifest.vortex.core.anchor),starAvoidance=new CameraAvoidance(()=>starMeshes);
 check('faceted star proxy contains every real rippled visual vertex',()=>{const ray=new THREE.Raycaster(),p=vortex.core.geometry.attributes.position;for(let i=0;i<p.count;i++){const point=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(vortex.core.matrixWorld),delta=point.sub(core),length=delta.length();ray.set(core,delta.normalize());ray.far=4;const hit=ray.intersectObjects(starMeshes)[0];assert.ok(hit&&hit.distance>=length-.001,'visual core outside collision proxy at vertex '+i);}});
 check('camera star obstruction is tested independently from capsule contacts',()=>{const hit=starAvoidance.hit(core.clone().add(new THREE.Vector3(0,0,8)),core.clone().add(new THREE.Vector3(0,0,-8)),starMeshes);assert.equal(hit?.object.name,AssetManifest.vortex.core.anchor);});
 check('camera resolves the star obstruction with a clear independent ray path',()=>{const player=core.clone().add(new THREE.Vector3(0,-1,8)),target=player.clone().add(new THREE.Vector3(0,1,0));const view=starAvoidance.resolve({position:core.clone().add(new THREE.Vector3(0,0,-10)),target},player,d=>({position:target.clone().addScaledVector(d,18),target}),.05,null);assert.equal(starAvoidance.telemetry.obstruction.group,AssetManifest.vortex.core.anchor);assert.equal(starAvoidance.telemetry.lineOfSightClear,true);assert.ok(view.position.distanceTo(core)>AssetManifest.vortex.core.collisionRadius+.3);report.vortexCamera=starAvoidance.telemetry;});
 globalThis.window=new EventTarget();globalThis.document=new EventTarget();
 let canMove=true;const state={value:'SPACE',moving:true,onChange:()=>{}};
 const object=new THREE.Object3D();object.position.set(11,2,11);
 const controller=new SpaceController({object,state,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},collision,onEnter:()=>{},canMove:()=>canMove});
 for(const [key,axis,side] of [['KeyD','x','max'],['KeyA','x','min'],['Space','y','max'],['ShiftLeft','y','min'],['KeyS','z','max'],['KeyW','z','min']]){
   object.position.set(11,2,11);controller.clear();controller.setKey(key,true);
   for(let i=0;i<420;i++)controller.update(.05,i*.05);
   check(`trusted-controller math keeps ${key} full envelope in bounds`,()=>{assert.ok(object.position[axis]<=limits.max[axis]+1e-8&&object.position[axis]>=limits.min[axis]-1e-8);assert.ok(Math.abs(object.position[axis]-limits[side][axis])<.15);});
 }
 check('camera transition rejects movement keys and resets inertia',()=>{controller.clear();canMove=false;controller.setKey('KeyW',true);assert.equal(controller.keys.size,0);controller.velocity.set(2,1,2);const before=object.position.clone();controller.update(.05,0);assert.ok(object.position.equals(before));assert.equal(controller.velocity.length(),0);});
 const camera=new THREE.PerspectiveCamera(43,1.5,.1,650),director=new CameraDirector(camera,{focusOffset:[-1.4,0,0]});director.setViewport(1440,960);
 const avoidance=new CameraAvoidance(()=>collision.cameraMeshes());director.avoidance=avoidance;const player=new THREE.Vector3(-4,2,8.5);
 director.snapToSpace(player);
 check('default view remains unobstructed and unchanged composition',()=>{assert.equal(avoidance.telemetry.lineOfSightClear,true);assert.equal(avoidance.telemetry.adjusted,false);});
 check('upstream adapted camera ray detects front/back walls independently',()=>{assert.ok(avoidance.hit(new THREE.Vector3(-4,3,8.5),new THREE.Vector3(-5,12,-25),collision.cameraMeshes()));assert.equal(avoidance.hit(new THREE.Vector3(-8,3,8.5),new THREE.Vector3(-8,12,-25),collision.cameraMeshes()),null);});
 let corrections=0;
 for(let step=0;step<150;step++){
   director.orbit(-7,step>100?.4:0);director.update(.05,player);
   if(avoidance.telemetry.adjusted)corrections++;
   assert.equal(avoidance.telemetry.lineOfSightClear,true,`orbit step ${step}`);
 }
 check('continuous rear orbit corrects obstruction with clear character sightline',()=>assert.ok(corrections>5));
 check('camera remains outside solids independently of character capsule',()=>{assert.equal(avoidance.hit(camera.position.clone().add(new THREE.Vector3(.31,0,0)),camera.position.clone().add(new THREE.Vector3(-.31,0,0)),collision.cameraMeshes(),0),null);assert.equal(avoidance.hit(camera.position.clone().add(new THREE.Vector3(0,.31,0)),camera.position.clone().add(new THREE.Vector3(0,-.31,0)),collision.cameraMeshes(),0),null);});
 const activeClosed=collision.cameraMeshes().some(mesh=>mesh.name==='studio-door');
 collision.doorOpen=()=>true;
 check('camera colliders follow actual open door state',()=>{assert.equal(activeClosed,true);assert.equal(collision.cameraMeshes().some(mesh=>mesh.name==='studio-door'),false);});
 const beforeProbe=collision.solveCount;
 check('entry capsule probe rejects rear wall crossing without moving live actor',()=>{const from=new THREE.Vector3(1.35,1.15,-8),to=new THREE.Vector3(1.35,1.15,6.05);assert.equal(collision.canTraverse(from,to),false);assert.deepEqual(from.toArray(),[1.35,1.15,-8]);assert.equal(collision.solveCount,beforeProbe);});
 check('entry capsule probe rejects below-terrace traversal',()=>assert.equal(collision.canTraverse(new THREE.Vector3(1.35,-2,6.05),new THREE.Vector3(1.35,1.15,6.05)),false));
 check('entry capsule probe accepts clear front approach',()=>assert.equal(collision.canTraverse(new THREE.Vector3(1.35,1.15,7.25),new THREE.Vector3(1.35,1.15,6.05)),true));
 check('v0.2 fly speed and coast remain measurable with 125ms frames',()=>{canMove=true;object.position.set(9,2,11);controller.clear();controller.setKey('KeyW',true);for(let i=0;i<6;i++)controller.update(.125,i*.125);assert.ok(controller.velocity.length()>6);controller.setKey('KeyW',false);const released=object.position.clone(),v=controller.velocity.length();controller.update(.125,1);assert.ok(controller.velocity.length()>0&&controller.velocity.length()<v);assert.ok(object.position.distanceTo(released)>.4);controller.clear();});
 const sha=JSON.parse(await readFile('src/vendor/hh-hang/sha256.json','utf8'));check('new adapted camera leaf has explicit provenance hash',()=>assert.equal(sha['cameraRaycast.js'].length,64));
 report.status='passed';report.camera={correctedFrames:corrections,last:avoidance.telemetry};report.limits={min:limits.min.toArray(),max:limits.max.toArray()};
} catch(e){report.status='failed';report.error={message:e.message,stack:e.stack};process.exitCode=1;}
finally {collision.dispose();vortex.dispose();await unlink(file);report.finishedAt=new Date().toISOString();await writeFile(process.env.GEOMETRY_REPORT||'tests/v10-navigation-geometry-candidate.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,error:report.error?.message}));}
