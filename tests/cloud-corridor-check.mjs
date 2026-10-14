import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const temporary=path.resolve('tests',`.corridor-${process.pid}.mjs`);
await build({stdin:{contents:"export * as THREE from 'three';export {VortexField} from './src/scenes/sky/VortexField.js';export {VortexManifest} from './src/config/VortexManifest.js';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',outfile:temporary,logLevel:'silent'});
const {THREE,VortexField,VortexManifest}=await import(pathToFileURL(temporary).href);
const baselineSource=process.env.CORRIDOR_BASE_SOURCE||'E:/temp/starhaven-rc47-source/src/config/VortexManifest.js';
const {VortexManifest:baseline}=await import(pathToFileURL(baselineSource).href);
function densityAt(mesh,point){
 const uniforms=mesh.material.userData.paintUniforms,{data,width,height,depth}=uniforms.cloudDensity.value.image;
 const p=point.clone().sub(uniforms.cloudMin.value).divide(uniforms.cloudSize.value).multiply(new THREE.Vector3(width,height,depth)).addScalar(-.5);
 if(p.x<-.5||p.y<-.5||p.z<-.5||p.x>width-.5||p.y>height-.5||p.z>depth-.5)return 0;
 let value=0;
 for(let z=0;z<=1;z++)for(let y=0;y<=1;y++)for(let x=0;x<=1;x++){
  const ix=Math.floor(p.x)+x,iy=Math.floor(p.y)+y,iz=Math.floor(p.z)+z;
  const weight=(x?p.x-Math.floor(p.x):1-p.x+Math.floor(p.x))*(y?p.y-Math.floor(p.y):1-p.y+Math.floor(p.y))*(z?p.z-Math.floor(p.z):1-p.z+Math.floor(p.z));
  value+=weight*data[THREE.MathUtils.clamp(ix,0,width-1)+width*(THREE.MathUtils.clamp(iy,0,height-1)+height*THREE.MathUtils.clamp(iz,0,depth-1))]/255;
 }return value;
}
const report={at:new Date().toISOString(),baselineSource,method:'Production baked-density CPU comparison. 1.5m-radius corridor around authored passage plus local 1m head offset; trilinear samples before shader/player fade. Does not claim rendered coverage or GPU cost.',sessions:[],checks:[]};
try{
 for(const [id,manifest]of [['baseline',baseline],['candidate',VortexManifest]]){
  const field=new VortexField({scene:new THREE.Scene(),manifest}),start=new THREE.Vector3(...manifest.passage.front),end=new THREE.Vector3(...manifest.passage.back);
  let maximum=0,samples=0,occupied=0;
  for(let j=0;j<=64;j++)for(const radius of [0,.75,1.5])for(let k=0;k<32;k++){
   const point=start.clone().lerp(end,j/64).add(new THREE.Vector3(radius*Math.cos(k*Math.PI/16),1+radius*Math.sin(k*Math.PI/16),0));
   const value=Math.max(...field.bands.map(b=>densityAt(b.mesh,point)));maximum=Math.max(maximum,value);samples++;if(value>.025)occupied++;
  }
  report.sessions.push({id,maximum,samples,occupied,clearFraction:1-occupied/samples,bands:field.bands.map(b=>({id:b.id,...b.mesh.userData.cloudVolume,curveLength:b.curve.getLength()}))});field.dispose();
 }
 const [before,after]=report.sessions;
 const check=(name,value)=>{assert.ok(value,name);report.checks.push({name,passed:true});};
 check('Two existing vortex render volumes and 64-step integration retained',after.bands.length===2&&after.bands.every(b=>b.method.startsWith('64-step')));
 const thicknessPass=process.env.CORRIDOR_SCOPE==='thickness';
 // Shader segmentation does not participate in authored or baked density.
 const densityProfile=({shadingSegments,...profile})=>profile;
 if(JSON.stringify(densityProfile(baseline.cloud))===JSON.stringify(densityProfile(VortexManifest.cloud)))check('Main cloud density allocation remains unchanged',before.bands[0].bytes===after.bands[0].bytes);
 else check('Main-cloud shape change belongs to the declared thickness scope',thicknessPass);
 report.densityByteDelta=after.bands.reduce((s,b)=>s+b.bytes,0)-before.bands.reduce((s,b)=>s+b.bytes,0);
 report.budgetBytes=thicknessPass?640*1024:before.bands.reduce((s,b)=>s+b.bytes,0)*1.01;
 check('Total vortex density allocation stays within declared geometry budget',after.bands.reduce((s,b)=>s+b.bytes,0)<=report.budgetBytes);
 check('Sampled central flight clearance does not get denser',after.maximum<=before.maximum+.00001&&after.occupied<=before.occupied);
 report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{await unlink(temporary);await writeFile(process.env.CORRIDOR_REPORT||'tests/v12-rc48-corridor-cpu.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
