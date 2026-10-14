import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const report={at:new Date().toISOString(),method:'Rebuild current and frozen RC55 production cloud data; compare all 13 density arrays and render geometries byte-for-byte. CPU only, no visual/GPU inference.',checks:[]},temporary=[];
const digest=data=>createHash('sha256').update(Buffer.from(data.buffer,data.byteOffset,data.byteLength)).digest('hex');
try{
 const versions=[];
 for(const [id,root]of [['rc55','E:/temp/starhaven-rc55-source'],['current',process.cwd().replaceAll('\\','/')]]){
  const file=path.resolve('tests',`.paint-regression-${id}-${process.pid}.mjs`);temporary.push(file);
  const contents=`export * as THREE from 'three';export {VortexField} from '${root}/src/scenes/sky/VortexField.js';export {StarRiverField} from '${root}/src/scenes/sky/StarRiverField.js';export {ExplorationField} from '${root}/src/scenes/sky/ExplorationField.js';`;
  await build({stdin:{contents,resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',outfile:file,alias:{three:path.resolve('node_modules/three')},logLevel:'silent'});
  const {THREE,VortexField,StarRiverField,ExplorationField}=await import(pathToFileURL(file).href),scene=new THREE.Scene(),vortex=new VortexField({scene}),rivers=new StarRiverField({scene,brushAtlas:vortex.brushAtlas}),exploration=new ExplorationField({scene,brushAtlas:vortex.brushAtlas});
  const volumes=[];scene.traverse(mesh=>{if(!mesh.userData.cloudVolume)return;const u=mesh.material.userData.paintUniforms,image=u.cloudDensity.value.image;volumes.push({name:mesh.name,dimensions:[image.width,image.height,image.depth],densityBytes:image.data.byteLength,densityHash:digest(image.data),positions:digest(mesh.geometry.attributes.position.array),indices:digest(mesh.geometry.index.array),cloudMin:u.cloudMin.value.toArray(),cloudSize:u.cloudSize.value.toArray()});});
  const shaders=[];scene.traverse(mesh=>{if(!mesh.isMesh)return;const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const material of mats){const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>\n#include <normal_fragment_maps>\n#include <emissivemap_fragment>'};material.onBeforeCompile(shader,{});shaders.push({name:mesh.name,key:material.customProgramCacheKey(),vertex:shader.vertexShader,fragment:shader.fragmentShader,explicitVertex:material.vertexShader,explicitFragment:material.fragmentShader});}});
  const authored=vortex.bands.map(b=>({id:b.id,positions:digest(b.authoringGeometry.attributes.position.array),normals:digest(b.authoringGeometry.attributes.normal.array)}));
  versions.push({id,volumes,authored,shaders});exploration.dispose();rivers.dispose();vortex.dispose();
 }
 assert.equal(versions[0].volumes.length,13);assert.deepEqual(versions[1].volumes,versions[0].volumes);report.checks.push({name:'All 13 existing cloud density bytes, render geometry and bounds match frozen RC55',passed:true});
 assert.deepEqual(versions[1].authored,versions[0].authored);report.checks.push({name:'Existing main/wing authored positions and normals match frozen RC55',passed:true});
 assert.deepEqual(versions[1].shaders,versions[0].shaders);report.checks.push({name:'Existing material shader text and program keys match RC55 with the flow-only branch inactive',passed:true});report.versions=versions.map(({shaders,...v})=>({...v,existingShaderCount:shaders.length}));report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}finally{for(const file of temporary)await unlink(file).catch(()=>{});await writeFile(process.env.PAINT_REGRESSION_REPORT||'tests/v12-rc57-existing-cloud-regression.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks,failure:report.failure}));}
