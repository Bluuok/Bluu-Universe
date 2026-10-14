import * as THREE from 'three';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {VortexField} from '../src/scenes/sky/VortexField.js';
import {PaintFlowField} from '../src/scenes/sky/PaintFlowField.js';
import {PaintFlowManifest} from '../src/config/PaintFlowManifest.js';
const report={at:new Date().toISOString(),method:'Production sweep centreline lengths after offsetting and clipping. Scale the near curl by .8/1/1.2 in isolated CPU fixtures; physical strokes should retain comparable aspect rather than shrinking with curve length.',cases:[]};
const scene=new THREE.Scene(),vortex=new VortexField({scene});
try{
 for(const scale of [.8,1,1.2]){
  const config={...PaintFlowManifest,paths:PaintFlowManifest.paths.map(p=>p.id==='upper-return'?{...p,radius:p.radius.map(n=>n*scale),depthWave:p.depthWave*scale,depthDrift:p.depthDrift*scale}:p)};
  const field=new PaintFlowField({scene,vortex,config});
  try{const data=field.telemetry.paths.find(p=>p.id==='upper-return');assert.ok(data.strokeLengths.median>=7&&data.strokeLengths.median<=10);report.cases.push({scale,...data});}finally{field.dispose();}
 }
 const medians=report.cases.map(c=>c.strokeLengths.median);assert.ok(Math.max(...medians)/Math.min(...medians)<1.1);report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{vortex.dispose();await writeFile(process.env.STROKE_LENGTH_REPORT||'tests/v14-rc63-stroke-length.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
