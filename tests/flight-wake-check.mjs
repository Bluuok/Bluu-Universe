import * as THREE from 'three';
import assert from 'node:assert/strict';
import {FlightWake} from '../src/scenes/FlightWake.js';
import {writeFile} from 'node:fs/promises';
const results=[];
function run(hz){
 const scene=new THREE.Scene(),nozzles=[new THREE.Group(),new THREE.Group()];nozzles.forEach(n=>{n.rotation.y=Math.PI;scene.add(n);});const wake=new FlightWake(scene),velocity=new THREE.Vector3(0,0,-12),position=new THREE.Vector3();
 let seed=7;const originalRandom=Math.random;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 function step(time,options={}){position.set(0,0,-12*time);nozzles.forEach((n,i)=>{n.position.copy(position);n.position.x=i*.36-.18;n.updateMatrixWorld(true);});wake.update(1/hz,{position,velocity,speed:12,thrust:1,nozzles,...options});}
 try{
  for(let i=1;i<=2*hz;i++)step(i/hz);
  assert.ok(wake.telemetry.alive>=20&&wake.telemetry.alive<=40);assert.ok(wake.telemetry.maxSize<.035);assert.equal(scene.children.filter(o=>o.isPoints).length,1);
  assert.ok([...wake.alphas].every(a=>Number.isFinite(a)&&a>=0&&a<=.72));
  const particles=wake.particles.filter(p=>p.age<p.life),distances=particles.map(p=>p.position.distanceTo(position));assert.ok(Math.max(...distances)<8);
  const active=particles.length;
  for(let i=1;i<=hz;i++)step(2+i/hz,{thrust:0,braking:true});assert.equal(wake.telemetry.alive,0);
  for(let i=1;i<=hz;i++)step(3+i/hz);assert.ok(wake.telemetry.alive>0);
  wake.setPresence(0);assert.ok([...wake.alphas].every(a=>a===0));assert.equal(wake.telemetry.alive,0);assert.equal(wake.outlets.length,0);
  wake.setPresence(1);position.set(100,100,100);nozzles.forEach(n=>{n.position.copy(position);n.updateMatrixWorld(true);});wake.update(.06,{position,velocity,thrust:1,nozzles});
  assert.ok(wake.particles.filter(p=>p.age<p.life).every(p=>p.position.distanceTo(position)<2),'No trail bridge after disappearance and teleport');
  wake.update(.01,{visible:false});assert.equal(wake.points.visible,false);assert.equal(wake.telemetry.alive,0);
  wake.dispose();wake.dispose();assert.equal(scene.children.filter(o=>o.isPoints).length,0);
  return {hz,active,maxDistance:Math.max(...distances),status:'passed'};
 }finally{Math.random=originalRandom;wake.dispose();}
}
for(const hz of [30,60,120])results.push(run(hz));
assert.ok(Math.max(...results.map(r=>r.active))-Math.min(...results.map(r=>r.active))<=3);
const report={method:'Detached Three CPU simulation, deterministic randomness; checks bounded world trail, 30/60/120Hz behavior, brake, presence, reset and disposal. Not GPU visual evidence.',status:'passed',results};
await writeFile(process.env.WAKE_CPU_REPORT||'tests/v20-wake-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
