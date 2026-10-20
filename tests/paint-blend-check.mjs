import * as THREE from 'three';
import {build} from 'esbuild';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {VortexField} from '../src/scenes/sky/VortexField.js';
import {PaintFlowField} from '../src/scenes/sky/PaintFlowField.js';
const report={at:new Date().toISOString(),method:'Actual near/far fused surface topology and shared-vertex motion; optional RC78 comparison verifies both curls and shared material unchanged. CPU only.',checks:[],topologies:[]};
const checkpoint=await readFile(process.env.PAINT_BLEND_CHECKPOINT||'.baseline/v34-s-before.json','utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
const temporary=path.resolve(`tests/.paint-blend-before-${process.pid}.mjs`);let Before;
if(checkpoint){
 for(const file of Object.values(checkpoint.files))assert.equal(createHash('sha256').update(file.text).digest('hex'),file.sha256);
 const result=await build({stdin:{contents:checkpoint.files['src/scenes/sky/PaintFlowField.js'].text,resolveDir:path.resolve('src/scenes/sky'),sourcefile:'prior-field.js'},bundle:true,format:'esm',platform:'node',packages:'external',write:false,
  plugins:[{name:'saved-RC78-inputs',setup(build){build.onLoad({filter:/[\\/](PaintFlowBlend|PaintFlowManifest|VortexField)\.js$/},args=>{
   const entry=Object.entries(checkpoint.files).find(([name])=>args.path.replace(/\\/g,'/').endsWith('/'+name));assert.ok(entry,args.path);return {contents:entry[1].text,loader:'js',resolveDir:path.dirname(args.path)};
  });}}]});
 await writeFile(temporary,result.outputFiles[0].text);({PaintFlowField:Before}=await import(pathToFileURL(temporary)));
}
const scene=new THREE.Scene(),vortex=new VortexField({scene}),before=Before?new Before({scene,vortex}):null,after=new PaintFlowField({scene,vortex});
const check=(name,fn)=>{const evidence=fn();report.checks.push({name,passed:true,evidence});};
const bytes=(a,offset=0)=>Buffer.from(a.array.buffer,a.array.byteOffset+offset*a.itemSize*a.array.BYTES_PER_ELEMENT,(a.array.length-offset*a.itemSize)*a.array.BYTES_PER_ELEMENT);
try{
 const blend=after.telemetry.blended[0],old=before?.meshes.find(m=>m.name.endsWith(':1')).geometry,g=after.meshes.find(m=>m.name.endsWith(':1')).geometry;
 if(before)check('Both curls preserve every geometry/animation byte; shared material unchanged',()=>{
  assert.deepEqual(g.index.array.slice(0,blend.triangles*3),old.index.array.slice(0,blend.triangles*3));
  for(const key of Object.keys(g.attributes)){const end=blend.renderedVertices*g.attributes[key].itemSize;assert.deepEqual(g.attributes[key].array.slice(0,end),old.attributes[key].array.slice(0,end),key);}
  const far=after.meshes.find(m=>m.name.endsWith(':2')).geometry,oldFar=before.meshes.find(m=>m.name.endsWith(':2')).geometry;assert.deepEqual(far.index.array,oldFar.index.array);for(const key of Object.keys(far.attributes))assert(bytes(far.attributes[key]).equals(bytes(oldFar.attributes[key])),key);
  assert.deepEqual(after.config.paths.find(p=>p.id==='broad-s-current').points,before.config.paths.find(p=>p.id==='broad-s-current').points,'S authoring path changed');
  for(const key of ['roughness','metalness','envMapIntensity'])assert.equal(before.material[key],after.material[key]);assert.equal(before.material.userData.paintUniforms.oilBrushAtlas.value,after.material.userData.paintUniforms.oilBrushAtlas.value);
  return {sourceVertices:blend.sourceVertices,renderedVertices:blend.renderedVertices,sourceTriangles:blend.sourceTriangles,renderedTriangles:blend.triangles};
 });
 else report.checks.push({name:'RC78 exact isolation comparison',skipped:true,reason:'Optional local source checkpoint is absent; both current fused surfaces are still checked.'});
 for(const blend of after.telemetry.blended){
 const g=after.meshes.find(m=>m.name.endsWith(':'+blend.group)).geometry;
 check(blend.id+': rendered surface is closed, consistently wound, and welded motion/colour remains continuous',()=>{
  const map=new Map(),ids=[],parent=[],edges=new Map();let duplicateVertices=0,minNormalDot=1;
  const root=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
  for(let i=0;i<blend.renderedVertices;i++){
   const p=new THREE.Vector3().fromBufferAttribute(g.attributes.position,i),key=p.toArray().join(',');let record=map.get(key);
   if(!record){record={id:parent.length,vertex:i};map.set(key,record);parent.push(record.id);}else{
    duplicateVertices++;for(const name of ['flowAxis','flowMotion','color']){const a=g.attributes[name];for(let k=0;k<a.itemSize;k++)assert.equal(a.array[i*a.itemSize+k],a.array[record.vertex*a.itemSize+k],name);}
   }
   ids.push(record.id);
  }
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),average=new THREE.Vector3();let degenerate=0,tinyTriangles=0,signedVolume=0;
  for(let i=0;i<blend.triangles*3;i+=3){const indices=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)],v=indices.map(x=>ids[x]);
   a.fromBufferAttribute(g.attributes.position,indices[0]);b.fromBufferAttribute(g.attributes.position,indices[1]);c.fromBufferAttribute(g.attributes.position,indices[2]);signedVolume+=a.dot(new THREE.Vector3().crossVectors(b,c))/6;normal.crossVectors(b.sub(a),c.sub(a));if(normal.lengthSq()<1e-12)tinyTriangles++;if(normal.lengthSq()===0)degenerate++;else{average.set(0,0,0);for(const j of indices)average.add(new THREE.Vector3().fromBufferAttribute(g.attributes.normal,j));minNormalDot=Math.min(minNormalDot,normal.normalize().dot(average.normalize()));}
   for(let j=0;j<3;j++){const x=v[j],y=v[(j+1)%3],key=x<y?`${x}:${y}`:`${y}:${x}`,edge=edges.get(key)||{count:0,balance:0};edge.count++;edge.balance+=x<y?1:-1;edges.set(key,edge);parent[root(x)]=root(y);}
  }
  const badEdges=[...edges.entries()].filter(([,e])=>e.count!==2||e.balance!==0),components=new Set(parent.map((_,i)=>root(i))).size;
  const componentVertices=new Map();for(let i=0;i<parent.length;i++){const id=root(i);componentVertices.set(id,(componentVertices.get(id)||0)+1);}
  const topology={id:blend.id,vertices:parent.length,duplicateVertices,triangles:blend.triangles,badEdges:badEdges.slice(0,12),badEdgeCount:badEdges.length,components,componentVertices:[...componentVertices.values()].sort((a,b)=>b-a),degenerate,tinyTriangles,signedVolume,minNormalDot};report.topologies.push(topology);if(blend.id==='upper-return')report.topology=topology;
  assert.equal(badEdges.length,0);assert.equal(degenerate,0);assert(signedVolume>0);assert.equal(components,1);
  // Smooth averaged normals do not certify polygon winding at concave creases.
  // Positional edge balance plus positive enclosed signed volume does. Tiny
  // nonzero faces are reported separately from actual collapsed faces.
  return topology;
 });
 check(blend.id+': flow projection has no angular UV cut on actual triangle edges',()=>{let maxVGradient=0;for(let i=0;i<blend.triangles*3;i+=3)for(let edge=0;edge<3;edge++){const a=g.index.getX(i+edge),b=g.index.getX(i+(edge+1)%3),p=new THREE.Vector3().fromBufferAttribute(g.attributes.position,a),q=new THREE.Vector3().fromBufferAttribute(g.attributes.position,b),distance=p.distanceTo(q);maxVGradient=Math.max(maxVGradient,Math.abs(g.attributes.uv.getY(a)-g.attributes.uv.getY(b))/distance);}assert(maxVGradient<1);return {maxVGradient};});
 if(blend.pigment?.smoothing)check(blend.id+': surface pigment stays bounded and conserves vertex sum while softening edge jumps',()=>{const {before,after}=blend.pigment;assert(after.min>=0&&after.max<=1);assert(Math.abs(after.mass-before.mass)<1e-5);assert(after.edgeContrast<before.edgeContrast);return {before,after,scope:'Vertex sum, not physical surface-area mass'};});
 }
 report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{before?.dispose();after.dispose();vortex.dispose();if(checkpoint)await unlink(temporary);await writeFile(process.env.PAINT_STRUCTURE_REPORT||'tests/paint-blend-structure.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
