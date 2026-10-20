import * as THREE from 'three';
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {VortexField} from '../src/scenes/sky/VortexField.js';
import {PaintFlowField} from '../src/scenes/sky/PaintFlowField.js';
import {PaintFlowManifest} from '../src/config/PaintFlowManifest.js';

const report={at:new Date().toISOString(),method:'Actual S sweep: welded manifold, winding, smooth frame and seam motion, two-sided pigment. Optional RC78 vortex isolation. CPU checks, not GPU art acceptance.',checks:[]};
const scene=new THREE.Scene(),vortex=new VortexField({scene}),field=new PaintFlowField({scene,vortex});
const temporary=path.resolve(`tests/.sweep-before-${process.pid}.mjs`);let oldVortex;
const check=(name,fn)=>{const evidence=fn();report.checks.push({name,passed:true,evidence});};
try{
 const sweep=field.telemetry.sweeps.find(s=>s.id==='broad-s-current'),recipe=PaintFlowManifest.paths.find(p=>p.id===sweep.id),g=field.meshes.find(m=>m.name.endsWith(':'+sweep.group)).geometry;
 const {curve}=field.makeCurve(recipe,vortex),{curveSegments:rows,crossSegments:columns}=sweep.layout,point=i=>new THREE.Vector3().fromBufferAttribute(g.attributes.position,i+sweep.vertexOffset);
 const index=Array.from({length:sweep.triangles*3},(_,i)=>g.index.getX(sweep.indexOffset+i)-sweep.vertexOffset);
 check('One closed consistently wound S surface with only its two terminal caps',()=>{
  const ids=[],vertices=new Map(),parents=[],edges=new Map(),root=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
  for(let i=0;i<sweep.renderedVertices;i++){const key=point(i).toArray().join(',');if(!vertices.has(key)){vertices.set(key,parents.length);parents.push(parents.length);}ids.push(vertices.get(key));}
  let volume=0,minOutward=1,minShadingAlignment=1;
  for(let i=0;i<index.length;i+=3){
   const ids3=index.slice(i,i+3),p=ids3.map(point),face=new THREE.Vector3().crossVectors(p[1].clone().sub(p[0]),p[2].clone().sub(p[0]));assert(face.lengthSq()>0,'Degenerate triangle');
   volume+=p[0].dot(new THREE.Vector3().crossVectors(p[1],p[2]))/6;
   const shading=new THREE.Vector3();for(const id of ids3)shading.add(new THREE.Vector3().fromBufferAttribute(g.attributes.normal,id+sweep.vertexOffset));minShadingAlignment=Math.min(minShadingAlignment,face.clone().normalize().dot(shading.normalize()));
   const t=ids3.reduce((sum,id)=>sum+g.attributes.uv.getX(id+sweep.vertexOffset)/sweep.length,0)/3;
   const outward=i<rows*columns*6?p[0].clone().add(p[1]).add(p[2]).divideScalar(3).sub(curve.getPointAt(t)).normalize():curve.getTangentAt(t<.5?0:1).multiplyScalar(t<.5?-1:1);
   minOutward=Math.min(minOutward,face.normalize().dot(outward));
   for(let j=0;j<3;j++){const a=ids[ids3[j]],b=ids[ids3[(j+1)%3]],key=Math.min(a,b)+':'+Math.max(a,b),edge=edges.get(key)||{count:0,balance:0};edge.count++;edge.balance+=a<b?1:-1;edges.set(key,edge);parents[root(a)]=root(b);}
  }
  const components=new Set(parents.map((_,i)=>root(i))).size,badEdges=[...edges.values()].filter(e=>e.count!==2||e.balance!==0).length,euler=parents.length-edges.size+sweep.triangles;
  report.topology={components,badEdges,euler,signedVolume:volume,minOutward,minShadingAlignment,triangles:sweep.triangles};assert.equal(components,1);assert.equal(badEdges,0);assert.equal(euler,2);assert(volume>0);assert(minOutward>0);assert(minShadingAlignment>0);
  return report.topology;
 });
 check('No abrupt width reversal, UV seam lighting split or animation tear along the full 3D bend',()=>{
  let minFrameDot=1,previous;
  for(let row=0;row<=rows;row++){
   const first=row*(columns+1),last=first+columns,t=row/rows,wide=point(first).sub(curve.getPointAt(t)).normalize();if(previous)minFrameDot=Math.min(minFrameDot,wide.dot(previous));previous=wide;
   assert(point(first).distanceTo(point(last))<1e-5);
   for(const name of ['normal','color','flowAxis','flowMotion']){const a=g.attributes[name];for(let k=0;k<a.itemSize;k++)assert.equal(a.array[(first+sweep.vertexOffset)*a.itemSize+k],a.array[(last+sweep.vertexOffset)*a.itemSize+k],name);}
   for(let j=0;j<=columns;j++){const i=first+j+sweep.vertexOffset,n=new THREE.Vector3().fromBufferAttribute(g.attributes.normal,i);assert(Math.abs(n.length()-1)<1e-5);assert(new THREE.Vector3().fromBufferAttribute(g.attributes.flowAxis,i).dot(curve.getTangentAt(t))>.999);assert.equal(g.attributes.flowMotion.getX(i),g.attributes.flowMotion.getX(first+sweep.vertexOffset));}
  }
  assert(minFrameDot>.98);return {rows:rows+1,minFrameDot};
 });
 check('Three pigment footprints are visible vertex colour on both broad faces',()=>{
  const footprints=recipe.sweep.pigment.map(()=>({front:0,back:0}));
  for(let i=0;i<sweep.renderedVertices;i++){const id=i+sweep.vertexOffset,t=g.attributes.uv.getX(id)/sweep.length,face=Math.sin(g.attributes.uv.getY(id)*Math.PI*2),c=new THREE.Color().fromBufferAttribute(g.attributes.color,id);assert(c.toArray().every(v=>Number.isFinite(v)&&v>=0&&v<=1));if(c.r<=c.b)continue;for(const [j,p]of recipe.sweep.pigment.entries())if(t>p.start&&t<p.end){if(face>.5)footprints[j].front++;if(face<-.5)footprints[j].back++;}}
  assert(footprints.every(p=>p.front>0&&p.back>0));assert.equal(field.telemetry.goldCoats,0);assert.equal(field.material.userData.paintUniforms.oilBrushAtlas.value,vortex.brushAtlas);return {footprints,goldVertices:sweep.goldVertices};
 });
 const checkpoint=await readFile(process.env.PAINT_SWEEP_CHECKPOINT||'.baseline/v34-s-before.json','utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(checkpoint){
  const file=checkpoint.files['src/scenes/sky/VortexField.js'];assert.equal(createHash('sha256').update(file.text).digest('hex'),file.sha256);
  await build({stdin:{contents:file.text,resolveDir:path.resolve('src/scenes/sky')},bundle:true,platform:'node',format:'esm',packages:'external',outfile:temporary,logLevel:'silent'});
  const {VortexField:Before}=await import(pathToFileURL(temporary));oldVortex=new Before({scene});
  check('Opt-in frame leaves every existing vortex authoring mesh byte-identical to RC78',()=>{assert.equal(vortex.bands.length,oldVortex.bands.length);for(const [i,band]of vortex.bands.entries()){const g=band.authoringGeometry,old=oldVortex.bands[i].authoringGeometry;assert.deepEqual(g.index.array,old.index.array);for(const key of Object.keys(g.attributes))assert.deepEqual(g.attributes[key].array,old.attributes[key].array,key);}return {bands:vortex.bands.length};});
 }else report.checks.push({name:'Optional RC78 vortex byte comparison',skipped:true,reason:'Local recovery record absent; current sweep geometry is still tested'});
 report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;}
finally{oldVortex?.dispose();field.dispose();vortex.dispose();await unlink(temporary).catch(e=>{if(e.code!=='ENOENT')throw e;});await writeFile(process.env.PAINT_SWEEP_REPORT||'tests/paint-sweep-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
