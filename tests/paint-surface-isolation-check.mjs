import * as THREE from 'three';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {VortexField} from '../src/scenes/sky/VortexField.js';
import {PaintFlowField} from '../src/scenes/sky/PaintFlowField.js';
import {PaintFlowManifest} from '../src/config/PaintFlowManifest.js';
const temporary=path.resolve('tests',`.rc63-surface-${process.pid}.mjs`),originalDispose=THREE.BufferGeometry.prototype.dispose;
const report={at:new Date().toISOString(),method:'Compare every actual production stroke/coat before merge disposal with retained RC63 source. Exact physical/colour/animation bytes; U translation and unchanged V; material uniforms isolated. CPU only.',checks:[]};
let vortex,before,after;
try{
 const checkpoint=JSON.parse(await readFile('.baseline/v13-paint-flow-start.json','utf8')).currentRetained;assert.equal(checkpoint.tag,'RC63');
 const field=checkpoint.files['src/scenes/sky/PaintFlowField.js'];assert.equal(createHash('sha256').update(field.text).digest('hex'),field.sha256);
 await build({stdin:{contents:field.text,resolveDir:path.resolve('src/scenes/sky')},bundle:true,packages:'external',platform:'node',format:'esm',outfile:temporary,logLevel:'silent'});
 const {PaintFlowField:Baseline}=await import(pathToFileURL(temporary).href),{PaintFlowManifest:oldConfig}=await import('data:text/javascript;base64,'+Buffer.from(checkpoint.files['src/config/PaintFlowManifest.js'].text).toString('base64'));
 const scene=new THREE.Scene();vortex=new VortexField({scene});
 const capture=(Ctor,config)=>{const records=[];THREE.BufferGeometry.prototype.dispose=function(){if(this.attributes.flowAxis)records.push({index:this.index.array.slice(),attributes:Object.fromEntries(Object.entries(this.attributes).map(([key,a])=>[key,a.array.slice()]))});return originalDispose.call(this);};try{return {instance:new Ctor({scene,vortex,config}),records};}finally{THREE.BufferGeometry.prototype.dispose=originalDispose;}};
 before=capture(Baseline,oldConfig);after=capture(PaintFlowField,PaintFlowManifest);assert.equal(after.records.length,before.records.length);
 let shifted=0,maxOffsetVariation=0;
 for(let i=0;i<after.records.length;i++){
  const a=before.records[i],b=after.records[i];assert.deepEqual(b.index,a.index);
  for(const key of ['position','normal','color','flowAxis','flowMotion'])assert.deepEqual(b.attributes[key],a.attributes[key],`Stroke ${i} ${key} changed`);
  const offset=b.attributes.uv[0]-a.attributes.uv[0];assert.ok(offset>0);shifted++;
  for(let v=0;v<a.attributes.uv.length;v+=2){assert.equal(b.attributes.uv[v+1],a.attributes.uv[v+1]);const variation=Math.abs(b.attributes.uv[v]-a.attributes.uv[v]-offset);maxOffsetVariation=Math.max(maxOffsetVariation,variation);assert.ok(variation<.00005,`Stroke ${i} UV stretched rather than translated`);}
 }
 report.checks.push({name:'All stroke positions/indices/normals/colours/animation identical; every U translated without changing V',strokes:shifted,maxOffsetVariation,passed:true});
 const a=before.instance.material.userData.paintUniforms,b=after.instance.material.userData.paintUniforms;
 assert.equal(a.oilStrokeStrength.value,.5);assert.equal(b.oilStrokeStrength.value,.24);assert.equal(b.oilRelief.value,a.oilRelief.value);assert.equal(b.oilBrushAtlas.value,vortex.brushAtlas);
 report.checks.push({name:'Only paint colour strength changes; atlas and relief retained',before:a.oilStrokeStrength.value,after:b.oilStrokeStrength.value,relief:b.oilRelief.value,passed:true});report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{THREE.BufferGeometry.prototype.dispose=originalDispose;before?.instance.dispose();after?.instance.dispose();vortex?.dispose();await unlink(temporary).catch(()=>{});await writeFile('tests/v15-surface-isolation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
