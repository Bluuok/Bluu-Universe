import * as THREE from 'three';
import {PaintFlowField} from '../src/scenes/sky/PaintFlowField.js';
import {VortexField} from '../src/scenes/sky/VortexField.js';
import {build} from 'esbuild';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const checkpointPath=process.env.PAINT_NORMAL_CHECKPOINT;
const checkpoint=checkpointPath?await readFile(checkpointPath,'utf8').then(JSON.parse):null;
const report={method:'Actual generated paint geometry, normals, borrowed material and camera proxy. Optional saved RC76 source comparison is CPU isolation, not GPU art acceptance.',checks:[]};
const temporary=path.resolve(`tests/.paint-normal-before-${process.pid}.mjs`),scene=new THREE.Scene(),vortex=new VortexField({scene});
let before,after;
const bytes=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength),hash=s=>createHash('sha256').update(s).digest('hex');
try{
  report.sourceSHA256=hash(await readFile('src/scenes/sky/PaintFlowBlend.js'));
  if(checkpoint){
    for(const f of Object.values(checkpoint.files))assert.equal(hash(f.text),f.sha256);
    const oldBlend=checkpoint.files['src/scenes/sky/PaintFlowBlend.js'].text;
    await build({stdin:{contents:checkpoint.files['src/scenes/sky/PaintFlowField.js'].text,resolveDir:path.resolve('src/scenes/sky')},
      bundle:true,platform:'node',format:'esm',packages:'external',outfile:temporary,logLevel:'silent',
      plugins:[{name:'saved-blend-only',setup(build){build.onLoad({filter:/[\\/]PaintFlowBlend\.js$/},()=>({contents:oldBlend,loader:'js'}));}}]});
    const {PaintFlowField:Baseline}=await import(pathToFileURL(temporary).href);before=new Baseline({scene,vortex});
  }
  after=new PaintFlowField({scene,vortex});
  let changed=0,minimumAlignment=1,checked=0,negativeFaces=0,oldNegativeFaces=0,oldMinimumAlignment=1,newNegativeFaces=0,referenceFaces=0;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),average=new THREE.Vector3();
  for(const mesh of after.meshes){
    const g=mesh.geometry,n=g.attributes.normal,old=before?.meshes.find(m=>m.name===mesh.name)?.geometry;
    let referenceNormals=old?.attributes.normal,referenceIndexCount=g.index.count;
    if(!old){
      const blend=after.telemetry.blended.find(b=>mesh.name.endsWith(':'+b.group));
      if(blend){
        const reference=new THREE.BufferGeometry();reference.setAttribute('position',new THREE.BufferAttribute(g.attributes.position.array.slice(0,blend.renderedVertices*3),3));
        reference.setIndex(new THREE.BufferAttribute(g.index.array.slice(0,blend.triangles*3),1));reference.computeVertexNormals();
        referenceNormals=reference.attributes.normal;referenceIndexCount=blend.triangles*3;reference.dispose();
      }
    }
    if(old){
      assert.ok(bytes(g.index.array).equals(bytes(old.index.array)),'Triangle topology changed');
      for(const name of Object.keys(g.attributes))if(name!=='normal')assert.ok(bytes(g.attributes[name].array).equals(bytes(old.attributes[name].array)),`${mesh.name} ${name} changed`);
      assert.equal(n.count,old.attributes.normal.count);
    }
    for(let i=0;i<n.count;i++){
      normal.fromBufferAttribute(n,i);assert.ok(normal.toArray().every(Number.isFinite));assert.ok(Math.abs(normal.length()-1)<1e-5);checked++;
      if(old&&normal.distanceToSquared(a.fromBufferAttribute(old.attributes.normal,i))>1e-12)changed++;
    }
    for(let i=0;i<g.index.count;i+=3){
      const ids=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];
      a.fromBufferAttribute(g.attributes.position,ids[0]);b.fromBufferAttribute(g.attributes.position,ids[1]);c.fromBufferAttribute(g.attributes.position,ids[2]);
      normal.crossVectors(b.sub(a),c.sub(a));if(normal.lengthSq()<1e-12)continue;
      average.set(0,0,0);for(const id of ids)average.add(a.fromBufferAttribute(n,id));
      const alignment=normal.normalize().dot(average.normalize());minimumAlignment=Math.min(minimumAlignment,alignment);if(alignment<=0)negativeFaces++;
      if(referenceNormals&&i<referenceIndexCount){average.set(0,0,0);for(const id of ids)average.add(a.fromBufferAttribute(referenceNormals,id));const oldAlignment=normal.dot(average.normalize());oldMinimumAlignment=Math.min(oldMinimumAlignment,oldAlignment);if(oldAlignment<=0)oldNegativeFaces++;if(alignment<=0&&oldAlignment>0)newNegativeFaces++;referenceFaces++;}
    }
  }
  report.normalEvidence={minimumAlignment,negativeFaces,oldMinimumAlignment,oldNegativeFaces,newNegativeFaces,changedNormals:changed};
  report.checks.push({name:'Finite unit normals on actual rendered geometry',passed:true,vertices:checked,minimumAlignment,scope:'Existing concave folds can disagree with averaged normals; triangle winding is verified separately'});
  assert.ok(referenceFaces>0);assert.equal(newNegativeFaces,0,'No previously outward-shaded face may become inward');
  report.checks.push({name:'No new inward shading against original or reconstructed geometric normals',passed:true,newNegativeFaces,referenceFaces});
  if(before){
    assert.ok(changed>0);assert.deepEqual(after.telemetry,before.telemetry);
    for(const name of ['position'])assert.ok(bytes(after.getCameraMeshes()[0].geometry.attributes[name].array).equals(bytes(before.getCameraMeshes()[0].geometry.attributes[name].array)));
    assert.ok(bytes(after.getCameraMeshes()[0].geometry.index.array).equals(bytes(before.getCameraMeshes()[0].geometry.index.array)));
    const compile=m=>{const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};m.onBeforeCompile(shader);return shader;};
    const sa=compile(before.material),sb=compile(after.material);assert.equal(sb.vertexShader,sa.vertexShader);assert.equal(sb.fragmentShader,sa.fragmentShader);assert.deepEqual(sb.uniforms,sa.uniforms);
    report.checks.push({name:'Only rendered normals change; positions, indices, UV, pigment, animation, shader and camera proxy positions/indices preserved',passed:true,changedNormals:changed});
  }else report.checks.push({name:'RC76 source byte comparison',skipped:true,reason:'Historical isolation comparison not requested; current meshes use reconstructed geometric normals'});
  report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{before?.dispose();after?.dispose();vortex.dispose();await unlink(temporary).catch(e=>{if(e.code!=='ENOENT')throw e;});await writeFile(process.env.PAINT_NORMAL_REPORT||'tests/v30-paint-normal-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
