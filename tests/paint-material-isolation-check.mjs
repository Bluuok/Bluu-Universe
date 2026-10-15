import * as THREE from 'three';
import {build} from 'esbuild';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {makeVortexPaintMaterial} from '../src/scenes/sky/VortexPaintMaterial.js';
import {VortexManifest} from '../src/config/VortexManifest.js';
import {VortexField} from '../src/scenes/sky/VortexField.js';
import {PaintFlowField} from '../src/scenes/sky/PaintFlowField.js';
import {PaintFlowManifest} from '../src/config/PaintFlowManifest.js';
const report={at:new Date().toISOString(),method:'CPU comparison of actual generated core/cloud/halo shaders and complete paint geometry/atlas/camera proxy bytes against retained RC72 source. Not GPU art acceptance.',checks:[]};
const hash=b=>createHash('sha256').update(b).digest('hex'),temp=path.resolve(`tests/.paint-material-before-${process.pid}.mjs`),materials=[];let vortex,before,after;
try{
 const checkpoint=await readFile('.baseline/v24-paint-material-before.json','utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(!checkpoint){report.status='skipped';report.reason='Private RC72 comparison checkpoint unavailable; no historical isolation claim.';}
 else{
  for(const f of Object.values(checkpoint.files))assert.equal(hash(f.text),f.sha256);
  const oldText=checkpoint.files['src/scenes/sky/VortexPaintMaterial.js'].text,result=await build({stdin:{contents:oldText,resolveDir:path.resolve('src/scenes/sky')},bundle:true,platform:'node',format:'esm',packages:'external',write:false,logLevel:'silent'});
  await writeFile(temp,result.outputFiles[0].text);const {makeVortexPaintMaterial:oldFactory}=await import(pathToFileURL(temp).href);
  const scene=new THREE.Scene();vortex=new VortexField({scene});
  const compile=material=>{const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};material.onBeforeCompile(shader);return shader;};
  for(const [name,profile,cloud]of [['core',VortexManifest.core,false],['cloud',VortexManifest.cloud,true],['wing',VortexManifest.wing,true],['halo',VortexManifest.halo,true]]){
   const a=oldFactory(profile,{cloud,brushAtlas:vortex.brushAtlas}),b=makeVortexPaintMaterial(profile,{cloud,brushAtlas:vortex.brushAtlas});materials.push(a,b);const sa=compile(a),sb=compile(b);assert.equal(sb.vertexShader,sa.vertexShader);assert.equal(sb.fragmentShader,sa.fragmentShader);assert.deepEqual(sb.uniforms,sa.uniforms);assert.equal(b.customProgramCacheKey(),a.customProgramCacheKey());
   for(const key of ['roughness','metalness','opacity','transparent','depthWrite','depthTest','side','blending','emissiveIntensity'])assert.equal(b[key],a[key]);assert.equal(b.color.getHex(),a.color.getHex());
   report.checks.push({name:'Non-target '+name+' shader/uniforms/material unchanged',vertexSHA256:hash(sb.vertexShader),fragmentSHA256:hash(sb.fragmentShader),passed:true});
  }
  const manifestText=checkpoint.files['src/config/PaintFlowManifest.js'].text,{PaintFlowManifest:oldConfig}=await import('data:text/javascript;base64,'+Buffer.from(manifestText).toString('base64'));
  const fieldText=await readFile('src/scenes/sky/PaintFlowField.js','utf8');assert.equal(fieldText.replace('directional-thick-paint-v3','directional-thick-paint-v2'),checkpoint.files['src/scenes/sky/PaintFlowField.js'].text);
  before=new PaintFlowField({scene,vortex,config:oldConfig});after=new PaintFlowField({scene,vortex,config:PaintFlowManifest});const bytes=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength),fingerprint=field=>field.meshes.map(m=>({index:hash(bytes(m.geometry.index.array)),attributes:Object.fromEntries(Object.entries(m.geometry.attributes).map(([k,v])=>[k,hash(bytes(v.array))]))}));assert.deepEqual(fingerprint(after),fingerprint(before));
  assert.equal(after.telemetry.triangles,58356);assert.equal(after.telemetry.drawCalls,2);assert.equal(after.material.userData.paintUniforms.oilBrushAtlas.value,vortex.brushAtlas);assert.equal(after.material.userData.paintUniforms.oilRelief.value,.0018);assert.equal(before.material.userData.paintUniforms.oilRelief.value,.007);
  const cameraBefore=before.getCameraMeshes()[0],cameraAfter=after.getCameraMeshes()[0];assert.deepEqual(bytes(cameraAfter.geometry.attributes.position.array),bytes(cameraBefore.geometry.attributes.position.array));assert.deepEqual(bytes(cameraAfter.geometry.index.array),bytes(cameraBefore.geometry.index.array));assert.equal(cameraAfter.parent,null);
  report.checks.push({name:'Every rendered geometry attribute/index and camera proxy unchanged, existing atlas reused',triangles:58356,drawCalls:2,geometry:fingerprint(after),passed:true});
  const oldFlow=oldFactory({flowStroke:true,color:'#fff'},{brushAtlas:vortex.brushAtlas}),newFlow=makeVortexPaintMaterial({flowStroke:true,color:'#fff'},{brushAtlas:vortex.brushAtlas});materials.push(oldFlow,newFlow);assert.notEqual(compile(newFlow).fragmentShader,compile(oldFlow).fragmentShader);assert.equal(compile(newFlow).vertexShader,compile(oldFlow).vertexShader);report.checks.push({name:'Only flow fragment response changes; flow vertex shader remains identical',passed:true});report.status='passed';
 }
}catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;}
finally{for(const m of materials)m.dispose();before?.dispose();after?.dispose();vortex?.dispose();await unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});await writeFile('tests/v24-material-isolation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,reason:report.reason,failure:report.failure}));}
