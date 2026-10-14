import * as THREE from 'three';
import {SpaceCollision} from '../src/core/SpaceCollision.js';
import {CollisionManifest as manifest} from '../src/config/CollisionManifest.js';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const report={at:new Date().toISOString(),method:'Current production capsule solver; each static box isolated from neighbouring proxies so a neighbour cannot mask the target. CPU fixtures, not browser play or camera tests.',cases:[]};
const c=manifest.capsule,r=c.radius+c.skin,lo=c.footOffsetY+c.radius-r,hi=c.footOffsetY+c.radius+c.segmentLength+r;
function clearance(p,box){const gap=(a,b,m,n)=>Math.max(m-b,a-n,0),min=box.position.map((v,i)=>v-box.size[i]/2),max=box.position.map((v,i)=>v+box.size[i]/2);return Math.hypot(gap(p[0],p[0],min[0],max[0]),gap(p[1]+c.footOffsetY+c.radius,p[1]+c.footOffsetY+c.radius+c.segmentLength,min[1],max[1]),gap(p[2],p[2],min[2],max[2]))-r;}
try{
 for(const box of manifest.static.filter(p=>p.type==='box'))for(const diagonal of [false,true]){
  const collision=new SpaceCollision({...manifest,static:[box],door:[],dynamic:[]});
  try{
   const axis=box.id.includes('deck')||box.id.includes('foundation')?1:0,p=[...box.position];p[1]-=(lo+hi)/2;p[axis]=box.position[axis]+box.size[axis]/2+.4-(axis===1?lo:-r);
   const displacement=new THREE.Vector3();displacement.setComponent(axis,-.165);if(diagonal)displacement.setComponent(axis===0?2:0,.075);
   const result=collision.runFixture({position:p,steps:Array.from({length:20},()=>({displacement:displacement.toArray(),dt:.05})),doorOpen:false});
   assert.ok(result.trajectory.some(s=>s.contacts.some(h=>h.collider==='studio-static')),box.id+' contact absent');
   const worst=Math.min(...result.trajectory.map(s=>clearance(s.end,box)));assert.ok(worst>-.002,box.id+' penetration '+worst);
   if(diagonal){const tangent=axis===0?2:0;assert.ok(result.trajectory.at(-1).end[tangent]-p[tangent]>1,box.id+' tangential motion lost');}
   report.cases.push({id:box.id,diagonal,dt:.05,minimumClearance:worst,passed:true});
  }finally{collision.dispose();}
 }
 report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{await writeFile(process.env.STATIC_COLLISION_REPORT||'tests/v13-rc61-static-collision.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:report.cases.length,failure:report.failure}));}
