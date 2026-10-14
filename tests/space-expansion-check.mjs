import assert from 'node:assert/strict';
import * as THREE from 'three';
import {writeFile} from 'node:fs/promises';
import {AssetManifest} from '../src/config/AssetManifest.js';
import {ExplorationRoute,ExplorationRocks,ExplorationClouds,ExplorationTuning} from '../src/config/ExplorationManifest.js';
import {CollisionManifest} from '../src/config/CollisionManifest.js';
import {warpRockGeometry,makeRockBumpTexture,seatRockCrystal} from '../src/scenes/sky/RockSurface.js';
const report={at:new Date().toISOString(),method:'CPU layout, collision envelope and procedural surface checks; no visual or flight claim',checks:[],rocks:[]};
const check=(name,condition,evidence)=>{assert.ok(condition,name);report.checks.push({name,passed:true,evidence});};
const bounds=AssetManifest.space.bounds,center=new THREE.Vector3(...AssetManifest.sky.center);
let farthest=0;for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]])farthest=Math.max(farthest,new THREE.Vector3(x,y,z).distanceTo(center));
check('Expanded boundary plus camera margin stays inside retained sky',farthest+32<AssetManifest.sky.radius,{farthest,cameraMargin:32,skyRadius:AssetManifest.sky.radius});
check('Far plane still contains opposite sky from expanded edge',farthest+32+AssetManifest.sky.radius<1800);
check('World-fixed flybys remain inside retained sky at expanded edge',farthest+32+360<AssetManifest.sky.radius);
for(const [i,rock] of ExplorationRocks.entries()){
 const g=warpRockGeometry(new THREE.IcosahedronGeometry(1,2),i+1),p=g.attributes.position,n=g.attributes.normal,point=new THREE.Vector3();let maximum=0,minimum=Infinity;
 for(let j=0;j<p.count;j++){point.fromBufferAttribute(p,j);const radius=point.length();maximum=Math.max(maximum,radius);minimum=Math.min(minimum,radius);assert.ok(point.toArray().every(Number.isFinite));assert.ok([n.getX(j),n.getY(j),n.getZ(j)].every(Number.isFinite));}
 const proxy=CollisionManifest.static.find(p=>p.id==='circuit-'+rock.id);assert.deepEqual(proxy.position,rock.p);assert.deepEqual(proxy.scale,rock.s);assert.ok(maximum<=1.000001&&maximum<proxy.radius);report.rocks.push({id:rock.id,minimum,maximum,proxyRadius:proxy.radius,triangles:p.count/3});
 if(i%2===0){
  const material=new THREE.MeshBasicMaterial(),mesh=new THREE.Mesh(g,material);mesh.position.fromArray(rock.p);mesh.scale.fromArray(rock.s);
  for(let j=0;j<3;j++){
   const crystal=new THREE.Mesh(new THREE.ConeGeometry(.45+j*.15,2+j,5),material);crystal.position.set(rock.p[0]+(j-1)*1.5,rock.p[1]+rock.s[1]+.6,rock.p[2]);crystal.rotation.z=(j-1)*.17;
   const originalY=crystal.position.y;seatRockCrystal(mesh,crystal);crystal.updateMatrixWorld(true);assert.ok(crystal.position.y<=originalY);
   const vertices=crystal.geometry.attributes.position,base=crystal.geometry.boundingBox.min.y;let checked=0;
   for(let k=0;k<vertices.count;k++)if(Math.abs(vertices.getY(k)-base)<.00001){
    const vertex=new THREE.Vector3().fromBufferAttribute(vertices,k).applyMatrix4(crystal.matrixWorld);
    const ray=new THREE.Raycaster(new THREE.Vector3(vertex.x,rock.p[1]+rock.s[1]+10,vertex.z),new THREE.Vector3(0,-1,0));
    const hit=ray.intersectObject(mesh,false)[0];assert.ok(hit&&vertex.y<=hit.point.y-.079);checked++;
   }
   assert.ok(checked>=5);crystal.geometry.dispose();
  }
  material.dispose();
 }
 g.dispose();
}
check('All 11 revised rocks stay inside unchanged normalized proxies',report.rocks.length===11,report.rocks);
check('All 18 crystal bases remain embedded in their actual revised rock surfaces',true);
const studio=ExplorationRoute.at(-1);check('Studio return waypoint and threshold unchanged',JSON.stringify(studio.position)==='[-4,2,8.5]'&&studio.radius===8);
for(const point of ExplorationRoute)for(let axis=0;axis<3;axis++)assert.ok(point.position[axis]-point.radius>bounds.min[axis]&&point.position[axis]+point.radius<bounds.max[axis]);
check('All six arrival regions remain in flyable space',true);
for(const cloud of ExplorationClouds)for(const point of cloud.points)for(let axis=0;axis<3;axis++)assert.ok(cloud.p[axis]+point[axis]>bounds.min[axis]+8&&cloud.p[axis]+point[axis]<bounds.max[axis]-8);
check('Nine expanded cloud paths remain inside world clearance',ExplorationClouds.length===9);
const texture=makeRockBumpTexture();let disposals=0;texture.addEventListener('dispose',()=>disposals++);const data=texture.image.data;check('One finite linear bump map uses 64 KiB',data.length===65536&&texture.colorSpace===THREE.NoColorSpace);texture.dispose();check('Standalone bump owner releases texture',disposals===1);
report.dimensions=bounds.max.map((v,i)=>v-bounds.min[i]);report.expansion=ExplorationTuning.expansion;
report.routeDistance=ExplorationRoute.reduce((sum,p,i)=>sum+new THREE.Vector3(...p.position).distanceTo(new THREE.Vector3(...(i?ExplorationRoute[i-1].position:AssetManifest.character.position))),0);
report.status='passed';await writeFile(process.env.EXPANSION_REPORT||'tests/v12-rc44-expansion.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,dimensions:report.dimensions,routeDistance:report.routeDistance}));
