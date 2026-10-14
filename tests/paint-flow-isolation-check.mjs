import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import * as THREE from 'three';
import {VortexField} from '../src/scenes/sky/VortexField.js';
import {PaintFlowField} from '../src/scenes/sky/PaintFlowField.js';
import {PaintFlowManifest} from '../src/config/PaintFlowManifest.js';

const report={at:new Date().toISOString(),method:'Current production owner versus exact RC61 source from the single recovery record. Move upper-return to a separate collection only in CPU fixtures to compare untouched distant/S geometry byte-for-byte; no browser fixture or art pass.',checks:[]};
const temporary=path.resolve('tests',`.rc61-paint-field-${process.pid}.mjs`);
try{
 const checkpoint=JSON.parse(await readFile('.baseline/v13-paint-flow-start.json','utf8')).rc61Checkpoint;
 const original=checkpoint.files['src/scenes/sky/PaintFlowField.js'];assert.equal(createHash('sha256').update(original.text).digest('hex'),original.sha256);
 await build({stdin:{contents:original.text,resolveDir:path.resolve('src/scenes/sky')},bundle:true,platform:'browser',format:'esm',outfile:temporary,logLevel:'silent'});
 const {PaintFlowField:Baseline}=await import(pathToFileURL(temporary).href),{PaintFlowManifest:oldConfig}=await import('data:text/javascript;base64,'+Buffer.from(checkpoint.files['src/config/PaintFlowManifest.js'].text).toString('base64'));
 for(const noGold of [false,true]){
  const scene=new THREE.Scene(),vortex=new VortexField({scene});
  const fixture=config=>({...config,palette:{...config.palette,...(noGold?{goldFraction:0}:{})},paths:config.paths.map(p=>p.id==='upper-return'?{...p,group:0}:p)});
  const before=new Baseline({scene,vortex,config:fixture(oldConfig)}),after=new PaintFlowField({scene,vortex,config:fixture(PaintFlowManifest)});
  try{
   for(const layer of [1,2]){
    const a=before.meshes.find(m=>m.name==='ThickPaintLayer:'+layer).geometry,b=after.meshes.find(m=>m.name==='ThickPaintLayer:'+layer).geometry;
    assert.deepEqual(b.index.array,a.index.array);
    for(const name of Object.keys(a.attributes)){if(name==='color'&&!noGold)continue;assert.deepEqual(b.attributes[name].array,a.attributes[name].array,`Layer ${layer} ${name} changed outside upper-return`);}
    report.checks.push({layer,name:layer===1?'broad-s-current':'distant-eddy',noGold,passed:true,attributes:Object.keys(a.attributes).filter(n=>noGold||n!=='color')});
   }
  }finally{before.dispose();after.dispose();vortex.dispose();}
 }
 report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{await unlink(temporary).catch(()=>{});await writeFile(process.env.PAINT_ISOLATION_REPORT||'tests/v14-rc62-isolation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
