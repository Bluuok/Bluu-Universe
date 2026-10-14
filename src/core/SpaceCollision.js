import * as THREE from 'three';
import {createRockGeometry} from '../scenes/sky/RockSurface.js';
import {createCollisionTemps, applyCapsuleCollision} from '../vendor/hh-hang/capsuleCollision.js';
import {buildStaticMergedMesh, attachBoundsTree} from '../vendor/hh-hang/colliderBuild.js';
import {acceleratedRaycast} from 'three-mesh-bvh';

// Plain collision data builds separate invisible proxies; no visual mesh names,
// room visibility, camera writes or scene-wide baking participate in movement.
function roofGeometry(p) {
  const w=p.width/2,d=p.depth/2,r=Math.min(p.cornerRadius,w,d),shape=new THREE.Shape();
  shape.moveTo(-w+r,-d);shape.lineTo(w-r,-d);shape.quadraticCurveTo(w,-d,w,-d+r);
  shape.lineTo(w,d-r);shape.quadraticCurveTo(w,d,w-r,d);shape.lineTo(-w+r,d);
  shape.quadraticCurveTo(-w,d,-w,d-r);shape.lineTo(-w,-d+r);shape.quadraticCurveTo(-w,-d,-w+r,-d);
  const n=p.radialSegments,rings=p.radialRings,outline=shape.getSpacedPoints(n).slice(0,n),positions=[],indices=[];
  const top=(x,z)=>p.baseY+p.rise*Math.pow(Math.max(0,Math.cos(Math.min(1,Math.abs(x)/w)*Math.PI/2)),p.archPower)*(p.hipBase+p.hipFactor*Math.cos(Math.min(1,Math.abs(z)/d)*Math.PI/2));
  const add=(x,y,z)=>{const i=positions.length/3;positions.push(x+p.centerXZ[0],y,z+p.centerXZ[1]);return i;};
  const center=add(0,top(0,0),0);let prev=null;
  for(let j=1;j<=rings;j++){
    const ring=outline.map(v=>add(v.x*j/rings,top(v.x*j/rings,v.y*j/rings),v.y*j/rings));
    for(let i=0;i<n;i++){const k=(i+1)%n;if(!prev)indices.push(center,ring[k],ring[i]);else indices.push(prev[i],ring[k],ring[i],prev[i],prev[k],ring[k]);}
    prev=ring;
  }
  const bottom=outline.map(v=>add(v.x,p.bottomY,v.y)),bottomCenter=add(0,p.bottomY,0);
  for(let i=0;i<n;i++){const k=(i+1)%n;indices.push(prev[i],bottom[i],bottom[k],prev[i],bottom[k],prev[k],bottomCenter,bottom[i],bottom[k]);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function primitiveMesh(p){
  let g=p.type==='roof'?roofGeometry(p):p.type==='rock'?createRockGeometry(p.seed,p.surface):p.type==='sphere'?new THREE.SphereGeometry(p.radius,24,16):new THREE.BoxGeometry(...p.size);
  if(p.scale)g.scale(...p.scale);
  const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial());mesh.position.fromArray(p.position||[0,0,0]);mesh.rotation.fromArray(p.rotation||[0,0,0]);mesh.updateMatrixWorld(true);return mesh;
}
function buildGroup(id,primitives,anchor=null){
  if(!primitives.length)return null;
  const proxies=primitives.map(primitiveMesh),details=proxies.map((mesh,i)=>({id:primitives[i].id,kind:primitives[i].type,box:new THREE.Box3().setFromObject(mesh)}));
  const built=buildStaticMergedMesh(proxies);
  for(const p of proxies){p.geometry.dispose();p.material.dispose();}
  if(!built)throw new Error('Collision proxy merge failed: '+id);
  attachBoundsTree(built.geometry,{onReady:()=>{}});
  built.mesh.matrixAutoUpdate=false;built.mesh.matrix.identity();built.mesh.updateMatrixWorld(true);
  built.mesh.name=id;built.mesh.raycast=acceleratedRaycast;built.mesh.material.side=THREE.DoubleSide;
  return {id,mesh:built.mesh,geometry:built.geometry,details,anchor};
}

export class SpaceCollision {
  constructor(manifest,{anchors={},doorOpen=()=>false}={}){
    this.manifest=manifest;this.anchors=anchors;this.doorOpen=doorOpen;this.temps=createCollisionTemps();
    this.proxy=new THREE.Object3D();this.proxy.matrixAutoUpdate=true;
    this.capsuleInfo={segment:new THREE.Line3(new THREE.Vector3(),new THREE.Vector3(0,manifest.capsule.segmentLength,0)),radius:manifest.capsule.radius+manifest.capsule.skin};
    this.groups=[buildGroup('studio-static',manifest.static),buildGroup('studio-door',manifest.door)].filter(Boolean);
    for(const name of new Set(manifest.dynamic.map(p=>p.anchor))){
      if(!anchors[name])throw new Error('Explicit collision anchor missing: '+name);
      this.groups.push(buildGroup(name,manifest.dynamic.filter(p=>p.anchor===name),name));
    }
    this.lastSolve=null;this.solveCount=0;this.disposed=false;
  }
  sync(){
    for(const group of this.groups){if(!group.anchor)continue;const anchor=this.anchors[group.anchor];anchor.updateWorldMatrix(true,false);group.mesh.matrix.copy(anchor.matrixWorld);group.mesh.updateMatrixWorld(true);}
  }
  active(group,open=this.doorOpen()){return group.id!=='studio-door'||!open;}
  cameraMeshes(){this.sync();return this.groups.filter(group=>this.active(group)).map(group=>group.mesh);}
  bodyBounds(bounds){
    const radius=this.capsuleInfo.radius,c=this.manifest.capsule;
    const lower=c.footOffsetY+c.radius-radius,upper=c.footOffsetY+c.radius+c.segmentLength+radius;
    return {min:bounds.min.clone().add(new THREE.Vector3(radius,-lower,radius)),max:bounds.max.clone().sub(new THREE.Vector3(radius,upper,radius))};
  }
  resolve(position,displacement,velocity=null,{doorOpen=this.doorOpen(),dt=0,record=true}={}){
    if(this.disposed)throw new Error('Collision adapter disposed');
    this.sync();const start=position.clone(),contacts=[];
    // Fixed upstream CharacterMovement.ts:259-268 uses radius*.8 substeps.
    // Keep the current XYZ velocity calculation; only displacement is split.
    const steps=Math.max(1,Math.ceil(displacement.length()/(this.capsuleInfo.radius*.8)));
    if(steps>128)throw new Error('Collision fixture displacement exceeds supported substeps');
    const step=displacement.clone().multiplyScalar(1/steps),offset=this.manifest.capsule.footOffsetY+this.manifest.capsule.radius;
    for(let i=0;i<steps;i++){
      position.add(step);this.proxy.position.copy(position);this.proxy.position.y+=offset;
      for(let pass=0;pass<3;pass++){
        let adjusted=false;
        for(const group of this.groups){
          if(!this.active(group,doorOpen))continue;
          this.proxy.updateMatrixWorld(true);const before=this.proxy.position.clone();
          applyCapsuleCollision(this.proxy,this.capsuleInfo,group.mesh,this.temps);
          const correction=this.proxy.position.clone().sub(before);
          if(correction.lengthSq()>1e-10){
            adjusted=true;const normal=correction.clone().normalize();
            if(velocity){const into=velocity.dot(normal);if(into<0)velocity.addScaledVector(normal,-into);}
            contacts.push({collider:group.id,substep:i,correction:correction.toArray(),normal:normal.toArray()});
          }
        }
        if(!adjusted)break;
      }
      position.copy(this.proxy.position);position.y-=offset;
    }
    const result={label:record?'production-capsule':'path-probe',start:start.toArray(),requested:displacement.toArray(),end:position.toArray(),resolved:position.clone().sub(start).toArray(),dt,substeps:steps,contacts,doorOpen};
    if(record){this.solveCount++;this.lastSolve=result;}
    return result;
  }
  canTraverse(start,target,{doorOpen=true,docking=false}={}){
    if(docking&&this.manifest.dockingCapsule){
      this.dockingProbe ||=new SpaceCollision({...this.manifest,capsule:this.manifest.dockingCapsule,dockingCapsule:null},{anchors:this.anchors,doorOpen:()=>true});
      const clear=this.dockingProbe.canTraverse(start,target,{doorOpen});
      this.lastTraversal={...this.dockingProbe.lastTraversal,pose:'upright-confirmed-docking'};
      return clear;
    }
    // Probe a cloned capsule origin through the same production BVHs. No live
    // character, velocity, door state or production contact record is changed.
    const position=start.clone(),result=this.resolve(position,target.clone().sub(start),null,{doorOpen,record:false});
    const clear=position.distanceTo(target)<.025&&!result.contacts.some(c=>new THREE.Vector3(...c.correction).length()>.025);
    this.lastTraversal={...result,clear};return clear;
  }
  telemetry(position){
    this.sync();const offset=this.manifest.capsule.footOffsetY+this.manifest.capsule.radius;
    const start=position.clone().add(new THREE.Vector3(0,offset,0)),end=start.clone().add(new THREE.Vector3(0,this.manifest.capsule.segmentLength,0));
    const colliders=this.groups.flatMap(group=>group.details.map(detail=>{const bounds=detail.box.clone();if(group.anchor)bounds.applyMatrix4(group.mesh.matrixWorld);return {id:detail.id,kind:detail.kind,group:group.id,enabled:this.active(group),worldBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};}));
    return {capsule:{start:start.toArray(),end:end.toArray(),radius:this.capsuleInfo.radius,baseRadius:this.manifest.capsule.radius,skin:this.manifest.capsule.skin},position:position.toArray(),doorOpen:this.doorOpen(),gateActive:!this.doorOpen(),colliders,lastSolve:this.lastSolve,lastTraversal:this.lastTraversal||null,solveCount:this.solveCount,cameraAvoidance:'separate-CameraAvoidance-SPACE',source:'hh-hang/three-player-controller@ca82bbc76a3b9b0afa80c73b60167adf6123b9b6',bvhVersion:'0.7.8'};
  }
  runFixture(payload){
    const open=Boolean(payload.doorOpen),detached=new SpaceCollision(this.manifest,{anchors:this.anchors,doorOpen:()=>open}),position=new THREE.Vector3(...payload.position),trajectory=[];
    try{for(const s of payload.steps||[]){const velocity=s.velocity?new THREE.Vector3(...s.velocity):null;trajectory.push(detached.resolve(position,new THREE.Vector3(...s.displacement),velocity,{doorOpen:open,dt:s.dt||0}));}return {label:'isolatedfixture',position:position.toArray(),trajectory,collision:detached.telemetry(position)};}finally{detached.dispose();}
  }
  dispose(){if(this.disposed)return;this.dockingProbe?.dispose();for(const g of this.groups){g.geometry.boundsTree=null;g.geometry.dispose();g.mesh.material.dispose();}this.groups.length=0;this.disposed=true;}
}
