import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {createHash} from 'node:crypto';

// Test ownership only. No renderer/source changes; no browser starts without
// an explicit candidate hash and mode. Existing responsive/Library images are preserved.
const mode=process.env.COLLISION_MODE||'prepare';
const expectedBuild=process.env.COLLISION_BUILD;
const timeout=180000,url=process.env.COLLISION_URL||'http://127.0.0.1:4175';
const reportFile=process.env.COLLISION_REPORT||'tests/collision-review.json',outDir=path.resolve(process.env.COLLISION_SHOTS||'screenshots/collision-review');
const plan={node:['Three r161 + MeshBVH 0.7.8 transformed-solid smoke','Shared production solver fixtures; no copied resolver'],isolatedFixtures:['left/right/back/front solid walls','closed doorway blocks; open doorway allows passage','terrace top and underside','rail sides and front','bench','both planters','robot and near asteroid','50ms diagonal wall contact retains tangential travel'],live:['bounded artificial spawn + trusted side/back/front/deck/roof contact','trusted robot contact if reachable without another obstacle','Space/Shift, coast, soft bounds','synthetic blur; DOCKING/TRANSITION input rejection','three actual enter/project/back/exit cycles'],views:[[1440,960],[390,844],[320,700]],limitations:['Detached geometric contact trials are isolatedfixture; new finite world permits separately marked trusted keyboard contact at side/back/above/below','Use root-confirmed finite manifest bounds [-14,-6,-15]..[14,12,19]; no independent bounds edits','Camera avoidance is not integrated and is not a passing check','Synthetic blur, emulated touch, SwiftShader are not OS focus loss/physical phone/hardware GPU validation']};
if(mode==='prepare'){console.log(JSON.stringify({status:'prepared',browserLaunched:false,plan},null,2));process.exit(0);}
if(!['smoke','node','full'].includes(mode))throw Error('COLLISION_MODE must be prepare, smoke, node, or full');
if(mode==='full'&&!/^index-[\w-]+\.js$/.test(expectedBuild||''))throw Error('A root-confirmed COLLISION_BUILD=index-<hash>.js is mandatory before launch');
const report={mode,expectedBuild,url,startedAt:new Date().toISOString(),status:'running',plan,node:[],fixtures:[],checks:[],captures:[],consoleErrors:[],pageErrors:[],requestFailures:[]};
const currentBundle=(await readFile('dist/index.html','utf8')).match(/assets\/(index-[^" ]+\.js)/)[1];
report.buildIdentity={bundle:currentBundle,sha256:createHash('sha256').update(await readFile('dist/assets/'+currentBundle)).digest('hex')};
plan.limitations=['Detached Node fixtures exercise real production solver mathematics; they are not default-spawn keyboard/mouse routes','Finite world bounds come from current AssetManifest; full capsule limits are tested by navigation-geometry.mjs','Independent camera avoidance and GPU/player rendering are reviewed separately; this Node run is body collision only','Legacy full mode uses artificial initial positions and is not final delivery evidence'];
let browser,page,cdp,production,bundleFile;
async function save(){const tmp=reportFile+'.tmp';await writeFile(tmp,JSON.stringify(report,null,2)+'\n','utf8');await rename(tmp,reportFile);}
async function loadProductionBundle(){
 bundleFile=path.resolve('E:/temp',`starhaven-collision-test-${process.pid}.mjs`);
 await build({absWorkingDir:path.resolve('.'),stdin:{contents:"import * as THREE from 'three';import {MeshBVH} from 'three-mesh-bvh';import {SpaceCollision} from './src/core/SpaceCollision.js';import {CollisionManifest} from './src/config/CollisionManifest.js';import {AssetManifest} from './src/config/AssetManifest.js';import {VortexField} from './src/scenes/sky/VortexField.js';export {THREE,MeshBVH,SpaceCollision,CollisionManifest,AssetManifest,VortexField};",resolveDir:path.resolve('.'),sourcefile:'collision-production-node.mjs'},bundle:true,platform:'browser',format:'esm',mainFields:['browser','module','main'],conditions:['browser','import','module'],outfile:bundleFile,logLevel:'silent'});
 production=await import(pathToFileURL(bundleFile).href);
 plan.bounds=production.AssetManifest.space.bounds;
}
async function smoke(){
 const [threePackage,bvhPackage]=await Promise.all([readFile('node_modules/three/package.json','utf8'),readFile('node_modules/three-mesh-bvh/package.json','utf8')]);assert.equal(JSON.parse(threePackage).version,'0.161.0');assert.equal(JSON.parse(bvhPackage).version,'0.7.8');
 await loadProductionBundle();const {THREE,MeshBVH}=production;assert.equal(THREE.REVISION,'161');
 const geometry=new THREE.BoxGeometry(2,2,2);geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(10,4,-7));const bvh=new MeshBVH(geometry);const ray=new THREE.Ray(new THREE.Vector3(10,4,-3),new THREE.Vector3(0,0,-1));const hit=bvh.raycastFirst(ray,THREE.DoubleSide);assert.ok(hit);assert.ok(Math.abs(hit.distance-3)<1e-6);assert.ok(Math.abs(hit.point.z+6)<1e-6);assert.equal(bvh.raycastFirst(new THREE.Ray(new THREE.Vector3(0,4,-3),new THREE.Vector3(0,0,-1)),THREE.DoubleSide),null);geometry.dispose();report.node.push({name:'pinned versions and translated solid ray contact',status:'passed',three:THREE.REVISION,bvh:JSON.parse(bvhPackage).version,hit:{distance:hit.distance,point:hit.point.toArray()},miss:true});await save();
}
function observe(){
 const a=window.starhaven,rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 return {atUtc:new Date().toISOString(),state:a.state,player:a.player,velocity:a.velocity,keys:a.keys,camera:a.camera,cameraProgress:a.cameraProgress,framing:a.framing,exhibitProjection:a.exhibitProjection,characterBounds:a.inspect?.characterBounds(),collision:a.inspect?.collision(),rendering:a.rendering,viewport:[innerWidth,innerHeight],documentWidth:document.documentElement.scrollWidth,overlayOpacity:Number(getComputedStyle(document.getElementById('transition')).opacity),hotspots:[...document.querySelectorAll('#hotspots button')].map(e=>{const r=rect(e);return {id:e.dataset.exhibit,text:e.textContent.trim(),hidden:e.hidden,rect:r,fullyInViewport:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&r.width>0&&r.height>0,centerHit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e};})};
}
const snapshot=()=>page.evaluate(observe);
async function settle(state){await page.waitForFunction(s=>window.starhaven.state===s&&window.starhaven.cameraProgress.transition===null&&Number(getComputedStyle(document.getElementById('transition')).opacity)<.02,state,{timeout});await page.evaluate(async()=>{let last=window.starhaven.camera,stable=0,start=performance.now();while(stable<4){await new Promise(requestAnimationFrame);const p=window.starhaven.camera;stable=Math.hypot(...p.map((v,i)=>v-last[i]))<.003?stable+1:0;last=p;if(performance.now()-start>175000)throw Error('Camera did not settle');}});}
function assertView(s){assert.ok(s.documentWidth<=s.viewport[0]);const f=s.framing;assert.ok(f?.projectedBounds);const fits=r=>r.left>=-.5&&r.right<=s.viewport[0]+.5&&r.top>=-.5&&r.bottom<=s.viewport[1]+.5;assert.ok(fits(f.projectedBounds));if(s.state==='SPACE')assert.ok(f.playerBounds&&fits(f.playerBounds));if(s.state==='ROOM'){assert.equal(s.hotspots.length,4);assert.ok(s.hotspots.every(h=>h.fullyInViewport&&h.centerHit));assert.equal(s.exhibitProjection.length,4);assert.ok(s.exhibitProjection.every(p=>p.ndc.every(n=>n>=-1&&n<=1)));}}
async function capture(name,state){const before=await snapshot();assert.equal(before.state,state);assert.ok(before.overlayOpacity<.02);assertView(before);const file=path.join(outDir,name+'.png');const data=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});await writeFile(file,Buffer.from(data.data,'base64'));const after=await snapshot();assert.equal(after.state,state);assert.ok(after.overlayOpacity<.02);report.captures.push({name,file,defaultCamera:true,before,after});await save();console.log(JSON.stringify({capture:file,state,build:report.build}));}
const add=(name,data={})=>report.checks.push({name,status:'passed',...data});
function fixtureSteps(result){assert.equal(result.label,'isolatedfixture');assert.ok(Array.isArray(result.trajectory)&&result.trajectory.length);for(const step of result.trajectory){assert.ok(Array.isArray(step.start)&&Array.isArray(step.end));assert.ok(Array.isArray(step.contacts));assert.ok(step.substeps>=1);}return result.trajectory;}
function capsuleBoxClearance(position,capsule,bounds){
 // Independent closed axis-aligned solid witness. This does not reproduce BVH
 // triangle tests, integration, depenetration or the production sweep algorithm.
 const lo=position[1]+capsule.footOffsetY+capsule.radius,hi=lo+capsule.segmentLength;
 const gap=(a,b,c,d)=>Math.max(c-b,a-d,0);const dx=gap(position[0],position[0],bounds.min[0],bounds.max[0]);const dy=gap(lo,hi,bounds.min[1],bounds.max[1]);const dz=gap(position[2],position[2],bounds.min[2],bounds.max[2]);return Math.hypot(dx,dy,dz)-capsule.radius;
}
function buildFixtureCases(manifest){
 const c=manifest.capsule,mid=c.footOffsetY+c.radius+c.segmentLength/2,r=c.radius;
 const byId=id=>{const p=manifest.static.find(p=>p.id===id);assert.ok(p&&p.type==='box',id);return p;};
 const make=(id,axis,sign,{feetY,tangent=false}={})=>{const p=byId(id),position=[...p.position];position[1]=feetY??p.position[1]-mid;const minOffset=[-r,c.footOffsetY,-r],maxOffset=[r,c.footOffsetY+2*r+c.segmentLength,r];position[axis]=p.position[axis]+sign*(p.size[axis]/2+.40)-(sign>0?minOffset[axis]:maxOffset[axis]);let d=[0,0,0];d[axis]=-sign;const tangentAxis=axis===0?2:0;if(tangent)d[tangentAxis]=.45;const length=Math.hypot(...d);d=d.map(v=>v/length*3.3*.05);return {name:id+(sign>0?'-positive-face':'-negative-face')+(tangent?'-diagonal50ms':''),id,position,steps:Array.from({length:20},()=>({displacement:[...d],dt:.05})),doorOpen:false,isolatedfixture:true,witness:{kind:'axis-aligned solid',bounds:{min:p.position.map((v,i)=>v-p.size[i]/2),max:p.position.map((v,i)=>v+p.size[i]/2)},capsule:c},tangentAxis:tangent?tangentAxis:null};};
 return [make('studio-wall-left',0,-1),make('studio-wall-right',0,1),make('studio-wall-back',2,-1),make('studio-wall-front-left',2,1,{feetY:1.15}),make('studio-wall-right',0,1,{tangent:true}),make('terrace-deck',1,1),make('terrace-foundation',1,-1),make('terrace-rail-left-top',0,-1,{feetY:.5}),make('terrace-rail-right-top',0,1,{feetY:.5}),make('terrace-rail-front-left-top',2,1,{feetY:.5}),{...make('terrace-bench-seat',0,1,{feetY:.5}),position:[-.975,.5,6.45]},make('terrace-planter-left-leaves',0,1,{feetY:.5}),make('terrace-planter-right-leaves',0,-1,{feetY:.5})];
}
async function runFixtures(run,manifest,environment){
 for(const f of buildFixtureCases(manifest)){assert.ok(capsuleBoxClearance(f.position,manifest.capsule,f.witness.bounds)>=.35,'Fixture starts inside target '+f.name);const result=await run({position:f.position,steps:f.steps,doorOpen:f.doorOpen});const steps=fixtureSteps(result);const attempted=steps.filter(s=>capsuleBoxClearance(s.start.map((v,i)=>v+s.requested[i]),manifest.capsule,f.witness.bounds)<-.002);assert.ok(attempted.length,'Target contact path never reached solid '+f.name);assert.ok(attempted.some(s=>s.contacts.some(c=>c.collider==='studio-static')&&Math.hypot(...s.resolved.map((v,i)=>v-s.requested[i]))>.005),'No production correction at target '+f.name);for(const s of steps)assert.ok(capsuleBoxClearance(s.end,manifest.capsule,f.witness.bounds)>=-.035,'Solid penetration '+f.name);if(f.tangentAxis!==null)assert.ok(steps.at(-1).end[f.tangentAxis]-f.position[f.tangentAxis]>.05,'Wall erased tangential travel');report.fixtures.push({environment,label:'isolatedfixture',name:f.name,position:f.position,witness:f.witness,result});await save();}
 const door=manifest.door.find(p=>p.id==='studio-closed-door');assert.ok(door);const position=[door.position[0],1.15,door.position[2]+door.size[2]/2+manifest.capsule.radius+.5];const steps=Array.from({length:20},()=>({displacement:[0,0,-3.3*.05],dt:.05}));const closed=await run({position,steps,doorOpen:false});const open=await run({position,steps,doorOpen:true});const a=fixtureSteps(closed),b=fixtureSteps(open);assert.ok(a.some(s=>s.contacts.some(c=>c.collider==='studio-door')));assert.ok(a.at(-1).end[2]>=door.position[2]+door.size[2]/2+manifest.capsule.radius-.035);assert.ok(b.at(-1).end[2]<door.position[2]-.5);report.fixtures.push({environment,label:'isolatedfixture',name:'door closed protects / open confirms actual aperture passage',position,closed,open});await save();
}
async function extraFixtures(run,manifest,environment){
 const roof=manifest.static.find(p=>p.id==='studio-roof'),peak=roof.baseY+roof.rise;
 const position=[roof.centerXZ[0],peak-manifest.capsule.footOffsetY+.5,roof.centerXZ[1]];
 const payload={position,steps:Array.from({length:20},()=>({displacement:[0,-.165,0],dt:.05})),doorOpen:false};
 const roofResult=await run(payload),roofSteps=fixtureSteps(roofResult);
 assert.ok(roofSteps.some(s=>s.contacts.some(c=>c.collider==='studio-static')),'Roof contact absent');
 assert.ok(roofSteps.at(-1).end[1]+manifest.capsule.footOffsetY>=peak-.035,'Roof peak penetrated');
 report.fixtures.push({environment,label:'isolatedfixture',name:'vault roof peak blocks downward approach',position,peak,result:roofResult});await save();
 const origin=await run({position:[0,10,10],steps:[],doorOpen:false});
 const choices=[['robot','robot-head',0,-1],['nearAsteroid','near-asteroid',0,-1],['sideAsteroid','side-asteroid',0,1],['rearAsteroid','rear-asteroid',2,-1],['satelliteThreadcove','satellite-threadcove-core',2,1],['satelliteClawtide','satellite-clawtide-core',2,1]];
 for(const [group,id,axis,sign] of choices){
  const target=origin.collision.colliders.find(c=>c.id===id);assert.ok(target,id);
  const solids=origin.collision.colliders.filter(c=>c.group===group);
  const min=[0,1,2].map(i=>Math.min(...solids.map(c=>c.worldBounds.min[i]))),max=[0,1,2].map(i=>Math.max(...solids.map(c=>c.worldBounds.max[i])));
  const center=target.worldBounds.min.map((v,i)=>(v+target.worldBounds.max[i])/2);
  const pos=[...center];pos[1]-=manifest.capsule.footOffsetY+manifest.capsule.radius;
  pos[axis]=(sign>0?max[axis]:min[axis])+sign*(manifest.capsule.radius+.75);
  const distance=Math.abs(pos[axis]-center[axis])+manifest.capsule.radius+.5;
  const d=[0,0,0];d[axis]=-sign*.165;const count=Math.ceil(distance/.165);
  const result=await run({position:pos,steps:Array.from({length:count},()=>({displacement:[...d],dt:.05})),doorOpen:false});const steps=fixtureSteps(result);
  const contacts=steps.flatMap(s=>s.contacts).filter(c=>c.collider===group);
  assert.ok(contacts.length,'No dynamic solid group contact '+group);
  const requestedEnd=pos.map((v,i)=>v+d[i]*count),actual=steps.at(-1).end;
  assert.ok((actual[axis]-requestedEnd[axis])*sign>.2,'Dynamic solid did not block attempted core traversal '+group);
  report.fixtures.push({environment,label:'isolatedfixture',name:'dynamic solid blocks core traversal: '+group,target:id,position:pos,requestedEnd,actual,groupBounds:{min,max},witness:'Known solid core center lies on requested path; actual group contact and blocked traversal. World AABB is not asserted as exact rotated/ellipsoid surface.',result});await save();
 }
}
function createNodeFixture(manifest){
 const {THREE,SpaceCollision,AssetManifest,VortexField}=production;
 const specs={robot:{p:[-5.6,2.15,4.8],r:[0,.38,0]},nearAsteroid:{p:[-8.8,-.10,2.8]},sideAsteroid:{p:[8.3,.22,-3.3]},rearAsteroid:{p:[-4.8,-1.6,-7.4]},satelliteThreadcove:{p:[-7.4,5.3,-5.6],r:[.07,-.26,-.11]},satelliteClawtide:{p:[7.6,4.2,-6.1],r:[.07,.34,-.11]}};
 const anchors=Object.fromEntries(Object.entries(specs).map(([name,s])=>{const a=new THREE.Object3D();a.position.fromArray(s.p);a.rotation.fromArray(s.r||[0,0,0]);a.updateMatrixWorld(true);return [name,a];}));
 const vortex=new VortexField({scene:new THREE.Scene(),manifest:AssetManifest.vortex});
 anchors[AssetManifest.vortex.core.anchor]=vortex.coreAnchor;
 return {collision:new SpaceCollision(manifest,{anchors,doorOpen:()=>false}),vortex};
}
async function nodeProductionFixtures(manifest){
 const {collision:fixture,vortex}=createNodeFixture(manifest);report.nodeAnchorFixture={label:'isolatedfixture',source:'Explicit initial SpaceScene anchor transforms plus actual VortexField core anchor; animation is not simulated',dynamicGroups:Object.keys(fixture.anchors)};
 try{const run=payload=>fixture.runFixture(payload);await runFixtures(run,manifest,'Node esbuild browser/module production solver');await extraFixtures(run,manifest,'Node esbuild browser/module production solver');}finally{fixture.dispose();vortex.dispose();}
}
async function locked(state){await page.waitForFunction(s=>window.starhaven.state===s,state,{timeout});const before=await snapshot();await page.keyboard.down('w');await page.keyboard.up('w');const e=await page.evaluate(()=>window.__collisionKeys.at(-1));assert.ok(e.trusted);assert.equal(e.state,state);assert.deepEqual(e.keys,[]);const after=await snapshot();assert.equal(before.collision.solveCount,after.collision.solveCount);assert.equal(after.collision.skippedReason,state);add('trusted input rejected and collision bypassed in '+state,{observed:e,before,after});}
async function repeatFlow(mobile,cycles){const initial=(await snapshot()).rendering;for(let cycle=1;cycle<=cycles;cycle++){await page.locator('#enter')[mobile?'tap':'click']();if(!mobile&&cycle===1){await locked('DOCKING');await locked('TRANSITION');}await settle('ROOM');const h=page.locator('#hotspots button[data-exhibit="threadcove"]');await h[mobile?'tap':'click']();await settle('PROJECT');assert.equal(await page.locator('#project-title').innerText(),'ThreadCove');await page.locator('#project-back')[mobile?'tap':'click']();await settle('ROOM');await page.locator('#exit')[mobile?'tap':'click']();await settle('SPACE');const returned=await snapshot();assert.equal(returned.collision.gateActive,true);assert.equal(returned.collision.doorOpen,false);add('actual room project return and exit',{cycle,mobile,returned});await save();}const final=(await snapshot()).rendering;assert.equal(final.geometries,initial.geometries);assert.equal(final.textures,initial.textures);add('repeated navigation renderer memory stays bounded',{mobile,cycles,initial,final});await save();}
async function trustedSolidChecks(manifest){
 const cases=buildFixtureCases(manifest).filter(f=>['studio-wall-left-negative-face','studio-wall-right-positive-face','studio-wall-back-negative-face','studio-wall-front-left-positive-face','terrace-deck-positive-face','terrace-foundation-negative-face'].includes(f.name));
 for(const f of cases){
  assert.equal(await page.evaluate(position=>window.starhaven.inspect.placeFlightFixture({position,velocity:[0,0,0],yaw:0}),f.position),true);
  const axis=f.steps[0].displacement.findIndex(v=>v!==0),sign=Math.sign(f.steps[0].displacement[axis]);const key=axis===0?(sign>0?'d':'a'):axis===1?(sign>0?'Space':'Shift'):(sign>0?'s':'w');
  const start=await snapshot(),solveCount=start.collision.solveCount;await page.keyboard.down(key);
  await page.waitForFunction(n=>{const c=window.starhaven.inspect.collision();return c.solveCount>n+1&&c.lastSolve.contacts.some(c=>c.collider==='studio-static');},solveCount,{timeout});
  const contact=await snapshot();await page.keyboard.up(key);await page.waitForFunction(()=>Math.hypot(...window.starhaven.velocity)<.01,null,{timeout});
  const clearance=capsuleBoxClearance(contact.player,manifest.capsule,f.witness.bounds);assert.ok(clearance>=-.035&&clearance<.06,'Trusted motion did not stop at intended surface '+f.name+' clearance '+clearance);
  const event=await page.evaluate(()=>window.__collisionKeys.at(-1));assert.ok(event.trusted&&event.state==='SPACE');
  add('trusted contact '+f.name,{label:'bounded artificial starting fixture',key,start,contact,clearance});await save();console.log('Trusted contact '+f.name);
 }
 const roof=manifest.static.find(p=>p.id==='studio-roof'),peak=roof.baseY+roof.rise,position=[roof.centerXZ[0],peak-manifest.capsule.footOffsetY+.5,roof.centerXZ[1]];
 assert.equal(await page.evaluate(position=>window.starhaven.inspect.placeFlightFixture({position,velocity:[0,0,0],yaw:0}),position),true);
 const start=await snapshot(),n=start.collision.solveCount;await page.keyboard.down('Shift');await page.waitForFunction(n=>{const c=window.starhaven.inspect.collision();return c.solveCount>n+1&&c.lastSolve.contacts.some(c=>c.collider==='studio-static');},n,{timeout});const contact=await snapshot();await page.keyboard.up('Shift');await page.waitForFunction(()=>Math.hypot(...window.starhaven.velocity)<.01,null,{timeout});assert.ok(contact.player[1]+manifest.capsule.footOffsetY>=peak-.035);add('trusted downward roof peak contact',{label:'bounded artificial starting fixture',key:'Shift',start,contact,peak});await save();
}
async function softBounds(){
 const bounds=(await snapshot()).collision.bounds;
 for(const [axis,sign,key] of [[0,1,'d'],[0,-1,'a'],[1,1,'Space'],[1,-1,'Shift'],[2,1,'s'],[2,-1,'w']]){
  const pos=[10,8,12],velocity=[0,0,0],limit=sign>0?bounds.max[axis]:bounds.min[axis];pos[axis]=limit-sign*.05;velocity[axis]=sign*3.3;
  assert.equal(await page.evaluate(p=>window.starhaven.inspect.placeFlightFixture(p),{position:pos,velocity,yaw:0}),true);await page.keyboard.down(key);
  await page.waitForFunction(({axis,sign,limit})=>(limit-window.starhaven.player[axis])*sign<.005,{axis,sign,limit},{timeout});const held=await snapshot();assert.ok(held.player.every((v,i)=>v>=bounds.min[i]-1e-7&&v<=bounds.max[i]+1e-7));assert.ok(held.velocity[axis]*sign<3.3,'Soft edge did not attenuate incoming speed');
  await page.keyboard.up(key);await page.waitForFunction(()=>Math.hypot(...window.starhaven.velocity)<.01,null,{timeout});const released=await snapshot();assert.ok(released.player.every((v,i)=>v>=bounds.min[i]-1e-7&&v<=bounds.max[i]+1e-7));add('trusted finite soft bound',{label:'bounded artificial starting fixture with explicit initial velocity',axis,sign,key,bounds,held,released});await save();
 }
}
async function trustedRobotAndCoast(manifest){
 const fixture=report.fixtures.find(f=>f.environment==='browser detached production solver'&&f.target==='robot-head');assert.ok(fixture);
 assert.equal(await page.evaluate(position=>window.starhaven.inspect.placeFlightFixture({position,velocity:[0,0,0],yaw:0}),fixture.position),true);
 const start=await snapshot(),n=start.collision.solveCount;await page.keyboard.down('d');await page.waitForFunction(n=>{const c=window.starhaven.inspect.collision();return c.solveCount>n+1&&c.lastSolve.contacts.some(c=>c.collider==='robot');},n,{timeout});const contact=await snapshot();await page.keyboard.up('d');await page.waitForFunction(()=>Math.hypot(...window.starhaven.velocity)<.01,null,{timeout});assert.equal(contact.state,'SPACE');add('trusted reachable robot solid contact',{label:'bounded artificial starting fixture',start,contact});await save();
 assert.equal(await page.evaluate(()=>window.starhaven.inspect.placeFlightFixture({position:[10,8,12],velocity:[0,0,0],yaw:0})),true);
 await page.evaluate(()=>{window.__collisionRelease=null;window.addEventListener('keyup',e=>{if(e.code==='KeyD')window.__collisionRelease={trusted:e.isTrusted,player:window.starhaven.player,velocity:window.starhaven.velocity,keys:window.starhaven.keys};},{once:true});});
 await page.keyboard.down('d');await page.waitForFunction(()=>window.starhaven.velocity[0]>.9,null,{timeout});await page.keyboard.up('d');await page.waitForFunction(()=>window.__collisionRelease&&Math.hypot(...window.starhaven.velocity)<.01,null,{timeout});const release=await page.evaluate(()=>window.__collisionRelease),stopped=await snapshot();assert.ok(release.trusted&&Math.hypot(...release.velocity)>.5);assert.ok(stopped.player[0]-release.player[0]>.025);assert.deepEqual(release.keys,[]);add('trusted release retains inertia then stops',{release,stopped});await save();
}
async function liveChecks(manifest){
 await trustedSolidChecks(manifest);await softBounds();await trustedRobotAndCoast(manifest);
 const door=manifest.door.find(p=>p.id==='studio-closed-door');const spawn=[door.position[0],1.15,door.position[2]+door.size[2]/2+manifest.capsule.radius+.6];await page.evaluate(position=>window.starhaven.inspect.placeFlightFixture({position,velocity:[0,0,0],yaw:0}),spawn);const before=await snapshot();assert.equal(before.state,'SPACE');assert.equal(before.collision.doorOpen,false);await page.keyboard.down('w');await page.waitForFunction(()=>window.starhaven.inspect.collision().lastSolve?.contacts?.some(c=>c.collider==='studio-door'),null,{timeout});const contact=await snapshot();await page.keyboard.up('w');await page.waitForFunction(()=>Math.hypot(...window.starhaven.velocity)<.01,null,{timeout});assert.equal(contact.state,'SPACE');assert.ok(contact.player[2]>=door.position[2]+door.size[2]/2+manifest.capsule.radius-.035);add('closed doorway rejects trusted free flight',{label:'bounded artificial starting fixture',before,contact});
 for(const [key,axis,sign] of [['Space',1,1],['Shift',1,-1]]){await page.keyboard.down(key);await page.waitForFunction(({axis,sign})=>window.starhaven.velocity[axis]*sign>.28,{axis,sign},{timeout});const moving=await snapshot();await page.keyboard.up(key);await page.waitForFunction(()=>Math.hypot(...window.starhaven.velocity)<.01,null,{timeout});add('vertical trusted movement and release',{key,moving,stopped:await snapshot()});}
 await page.keyboard.down('d');await page.waitForFunction(()=>Math.hypot(...window.starhaven.velocity)>.28,null,{timeout});await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const blur=await snapshot();assert.deepEqual(blur.keys,[]);assert.ok(Math.hypot(...blur.velocity)<.001);await page.keyboard.up('d');add('synthetic blur clears input',{synthetic:true,observed:blur});await page.locator('#reset-view').click();await settle('SPACE');await save();
}
try{
 await mkdir(outDir,{recursive:true});if(mode==='full'&&process.env.COLLISION_REUSE_NODE==='1'){const previous=JSON.parse(await readFile(reportFile,'utf8'));assert.equal(previous.status,'node-passed');report.node=previous.node;report.fixtures=previous.fixtures.map(f=>({...f,evidencePhase:'preceding Node fixture run; source unchanged as confirmed by parent'}));report.nodeEvidence={executedAt:previous.startedAt,notRerun:true,buildMeasured:false,parentConfirmedCollisionSourceUnchanged:true};await loadProductionBundle();}else await smoke();
 if(mode==='smoke'){report.status='smoke-passed';}
 else if(mode==='node'){await nodeProductionFixtures(production.CollisionManifest);report.status='node-passed';}
 else{
  const {CollisionManifest}=production;if(!report.nodeEvidence)await nodeProductionFixtures(CollisionManifest);
  browser=await chromium.launch({headless:true,executablePath:'C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--enable-unsafe-swiftshader']});
  for(const [width,height] of plan.views){const mobile=width<800,name=`${width}x${height}`,context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile});page=await context.newPage();page.setDefaultTimeout(timeout);cdp=await context.newCDPSession(page);page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push({viewport:name,text:m.text()});});page.on('pageerror',e=>report.pageErrors.push({viewport:name,text:e.message}));page.on('requestfailed',r=>report.requestFailures.push({viewport:name,url:r.url(),error:r.failure()?.errorText}));await page.goto(url,{waitUntil:'networkidle',timeout});await page.waitForFunction(()=>window.starhaven?.ready,null,{timeout});await page.locator('#loading').waitFor({state:'hidden'});const build=await page.locator('script[src]').evaluateAll(es=>es.map(e=>e.getAttribute('src')).find(s=>s.includes('/assets/index-'))?.split('/').pop());assert.equal(build,expectedBuild);report.build=build;assert.ok(await page.evaluate(()=>['collision','runCollisionFixture','placeFlightFixture','characterBounds'].every(k=>typeof window.starhaven.inspect?.[k]==='function')));await page.evaluate(()=>{window.__collisionKeys=[];window.addEventListener('keydown',e=>window.__collisionKeys.push({code:e.code,trusted:e.isTrusted,state:window.starhaven.state,keys:window.starhaven.keys}));});await settle('SPACE');await capture(name+'-space','SPACE');if(!mobile){report.initialDiagnostics=await snapshot();const c=report.initialDiagnostics.collision.capsule,b=report.initialDiagnostics.characterBounds;assert.equal(b.height,1.7);assert.ok(b.min[1]>=c.start[1]-c.radius-.035&&b.max[1]<=c.end[1]+c.radius+.035);add('actual character height and vertical capsule enclosure',{characterBounds:b,capsule:c,cameraAvoidance:report.initialDiagnostics.collision.cameraAvoidance});assert.equal(report.initialDiagnostics.collision.cameraAvoidance,'not-integrated');await runFixtures(p=>page.evaluate(payload=>window.starhaven.inspect.runCollisionFixture(payload),p),CollisionManifest,'browser detached production solver');await extraFixtures(p=>page.evaluate(payload=>window.starhaven.inspect.runCollisionFixture(payload),p),CollisionManifest,'browser detached production solver');await liveChecks(CollisionManifest);}await page.locator('#enter')[mobile?'tap':'click']();await settle('ROOM');await capture(name+'-room','ROOM');await page.locator('#exit')[mobile?'tap':'click']();await settle('SPACE');await repeatFlow(mobile,mobile?1:3);await context.close();page=null;console.log('Closed '+name);}
  assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.requestFailures,[]);report.status='passed';
 }
}catch(error){report.status='failed';report.error={message:error.message,stack:error.stack};if(page)report.failureSnapshot=await snapshot().catch(()=>null);console.log('FAIL '+error.message);}
finally{await browser?.close();if(bundleFile)await unlink(bundleFile).catch(()=>{});report.finishedAt=new Date().toISOString();await save();console.log(JSON.stringify({status:report.status,build:report.build,node:report.node.length,fixtures:report.fixtures.length,checks:report.checks.length,captures:report.captures.length}));process.exitCode=report.status==='failed'?1:0;}
