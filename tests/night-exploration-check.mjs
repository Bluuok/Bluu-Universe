import * as THREE from 'three';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {ExplorationField} from '../src/scenes/sky/ExplorationField.js';
import {ExplorationClouds} from '../src/config/ExplorationManifest.js';
const scene=new THREE.Scene(),atlas=new THREE.DataTexture(new Uint8Array(4),1,1),pigment=new THREE.Texture();
let atlasDisposals=0,pigmentDisposals=0;atlas.addEventListener('dispose',()=>atlasDisposals++);pigment.addEventListener('dispose',()=>pigmentDisposals++);
const field=new ExplorationField({scene,brushAtlas:atlas});field.setPigmentTexture(pigment);
const passages=field.clouds.map((mesh,index)=>{
 const curve=new THREE.CatmullRomCurve3(ExplorationClouds[index].points.map(p=>new THREE.Vector3(...p)),false,'centripetal');
 const u=mesh.material.userData.paintUniforms,image=u.cloudDensity.value.image,dimensions=[image.width,image.height,image.depth],channels=mesh.userData.cloudVolume.channels;
 let maximum=0;
 for(const t of [.15,.35,.5,.7,.9]){
  const voxel=curve.getPointAt(t).sub(u.cloudMin.value).divide(u.cloudSize.value).toArray().map((p,i)=>p*dimensions[i]-.5);
  for(let dz=0;dz<2;dz++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
   const [x,y,z]=voxel.map((p,i)=>THREE.MathUtils.clamp(Math.floor(p)+[dx,dy,dz][i],0,dimensions[i]-1));
   maximum=Math.max(maximum,image.data[(x+image.width*(y+image.height*z))*channels]);
  }
 }
 assert.ok(maximum<=16,`${mesh.name} must preserve a clear central passage`);
 return {cloud:mesh.name,centreSamples:5,maximumNeighbourDensity:maximum};
});
const winding=[];const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),edge=new THREE.Vector3();
for(const mesh of field.brushes){const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,ix=g.index;let outward=0,inward=0,degenerate=0;
 for(let i=0;i<ix.count;i+=3){const ia=ix.getX(i),ib=ix.getX(i+1),ic=ix.getX(i+2);a.fromBufferAttribute(p,ia);b.fromBufferAttribute(p,ib);c.fromBufferAttribute(p,ic);edge.subVectors(b,a).cross(c.sub(a));if(edge.lengthSq()<1e-12){degenerate++;continue;}normal.fromBufferAttribute(n,ia).add(new THREE.Vector3().fromBufferAttribute(n,ib)).add(new THREE.Vector3().fromBufferAttribute(n,ic));if(edge.dot(normal)>0)outward++;else inward++;}
 winding.push({mesh:mesh.name,outward,inward,degenerate});assert.ok(outward/(outward+inward)>.99,'Paint lobes must face outward under FrontSide');
}
const counts=[];
const seen=new Set();field.group.traverse(object=>{for(const resource of [object.geometry,...(Array.isArray(object.material)?object.material:[object.material])])if(resource&&!seen.has(resource)){seen.add(resource);const count={kind:resource.type,count:0};counts.push(count);resource.addEventListener('dispose',()=>count.count++);}});
const densityCounts=field.clouds.map(mesh=>{let count=0;mesh.material.userData.paintUniforms.cloudDensity.value.addEventListener('dispose',()=>count++);return()=>count;});
let rockBumpDisposals=0;field.rockBump?.addEventListener('dispose',()=>rockBumpDisposals++);
field.dispose();field.dispose();
assert.equal(scene.children.length,0);assert.ok(counts.every(x=>x.count===1));assert.deepEqual(densityCounts.map(f=>f()),field.clouds.map(()=>1));assert.equal(atlasDisposals,0);assert.equal(pigmentDisposals,0);
assert.equal(rockBumpDisposals,field.rockBump?1:0);
const report={status:'passed',method:'CPU central-passage and resource lifecycle checks; winding checked only for present accent meshes',checks:3+(winding.length?1:0),passages,winding,ownedResources:counts.length,densityDisposals:densityCounts.map(f=>f()),rockBumpDisposals,atlasDisposals,pigmentDisposals,idempotent:true,detached:true};
await writeFile(process.env.EXPLORATION_REPORT||'tests/v11-rc6-exploration.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
