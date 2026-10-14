import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ExtendedTriangle} from 'three-mesh-bvh';
import {writeFile} from 'node:fs/promises';
import {VortexField} from '../src/scenes/sky/VortexField.js';
import {PaintFlowField} from '../src/scenes/sky/PaintFlowField.js';
import {PaintFlowManifest} from '../src/config/PaintFlowManifest.js';
import {ExplorationBounds} from '../src/config/ExplorationManifest.js';
const report={at:new Date().toISOString(),method:'Production geometry, corridor, bounded animation and ownership CPU checks; no visual/GPU pass inferred.',checks:[]};
const check=(name,fn)=>{fn();report.checks.push({name,passed:true});};
const scene=new THREE.Scene(),vortex=new VortexField({scene}),field=new PaintFlowField({scene,vortex}),pigment=new THREE.Texture();
const disposed={geometry:0,material:0,atlas:0,pigment:0};
for(const mesh of field.meshes)mesh.geometry.addEventListener('dispose',()=>disposed.geometry++);
field.material.addEventListener('dispose',()=>disposed.material++);vortex.brushAtlas.addEventListener('dispose',()=>disposed.atlas++);pigment.addEventListener('dispose',()=>disposed.pigment++);
try{
 field.setPigmentTexture(pigment);report.telemetry=field.telemetry;
 check('Organized stroke paths stay inside explicit draw/triangle/gold budgets',()=>{const t=field.telemetry,b=PaintFlowManifest.budget;assert.equal(t.paths.length,PaintFlowManifest.paths.filter(p=>p.enabled!==false).length);assert.ok(t.strokes>0&&t.strokes<=b.strokes);assert.ok(t.triangles<=b.triangles);assert.ok(t.drawCalls<=b.drawCalls);assert.ok(t.gold/t.strokes<=.12);assert.equal(t.newTextures,0);});
 const nearest=field.passages.map(p=>({id:p.id,distance:Infinity}));let minNormal=Infinity,maxNormal=0;const p=new THREE.Vector3(),n=new THREE.Vector3();
 for(const mesh of field.meshes){const g=mesh.geometry;for(const name of ['position','normal','uv','color','flowAxis','flowMotion'])assert.ok([...g.attributes[name].array].every(Number.isFinite),`Finite ${name}`);for(let i=0;i<g.attributes.position.count;i++){p.fromBufferAttribute(g.attributes.position,i);n.fromBufferAttribute(g.attributes.normal,i);minNormal=Math.min(minNormal,n.length());maxNormal=Math.max(maxNormal,n.length());for(let axis=0;axis<3;axis++){assert.ok(p.getComponent(axis)>=ExplorationBounds.min[axis]);assert.ok(p.getComponent(axis)<=ExplorationBounds.max[axis]);}for(const [index,passage]of field.passages.entries()){const [a,b]=passage.ends,delta=b.clone().sub(a),t=THREE.MathUtils.clamp(p.clone().sub(a).dot(delta)/delta.lengthSq(),0,1);nearest[index].distance=Math.min(nearest[index].distance,p.distanceTo(a.clone().addScaledVector(delta,t)));}}}
 report.geometry={passages:nearest,minNormal,maxNormal};
 check('Finite unit normals, world bounds and passage clearance include maximum motion',()=>{assert.ok(minNormal>.99&&maxNormal<1.01);assert.equal(nearest.length,3);assert.ok(nearest.every(p=>p.distance>=PaintFlowManifest.clearance+PaintFlowManifest.motion.amplitude));});
 const triangle=new ExtendedTriangle(),intersection=new THREE.Vector3();
 const exact=field.passages.map(p=>({id:p.id,distance:Infinity,line:new THREE.Line3(...p.ends)}));
 for(const mesh of field.meshes){const g=mesh.geometry,position=g.attributes.position;for(let i=0;i<g.index.count;i+=3){triangle.a.fromBufferAttribute(position,g.index.getX(i));triangle.b.fromBufferAttribute(position,g.index.getX(i+1));triangle.c.fromBufferAttribute(position,g.index.getX(i+2));triangle.needsUpdate=true;
  for(const passage of exact){const line=passage.line,ray=new THREE.Ray(line.start.clone(),line.delta(new THREE.Vector3()).normalize());const hit=ray.intersectTriangle(triangle.a,triangle.b,triangle.c,false,intersection);const crosses=hit&&hit.distanceTo(line.start)<=line.distance();passage.distance=Math.min(passage.distance,crosses?0:triangle.closestPointToSegment(line));}
 }}
 report.geometry.trianglePassages=exact.map(({id,distance})=>({id,distance}));
 check('Full triangles and capped faces preserve passage radius including maximum motion',()=>{assert.ok(exact.every(p=>p.distance>=PaintFlowManifest.clearance+PaintFlowManifest.motion.amplitude));});
 check('Connected S path meets curl endpoints with aligned tangents and routes its full width around passage axes',()=>{
   const recipe=PaintFlowManifest.paths.find(p=>p.kind==='path'&&p.connections);if(!recipe)return;
   const curve=field.makeCurve(recipe,vortex).curve,byId=id=>field.makeCurve(PaintFlowManifest.paths.find(p=>p.id===id),vortex).curve;
   const from=byId(recipe.connections.from),to=byId(recipe.connections.to);
   assert.ok(curve.getPointAt(0).distanceTo(from.getPointAt(0))<1e-8);
   assert.ok(curve.getPointAt(1).distanceTo(to.getPointAt(0))<1e-8);
   assert.ok(curve.getTangentAt(0).dot(from.getTangentAt(0).negate())>.999);
   assert.ok(curve.getTangentAt(1).dot(to.getTangentAt(0))>.999);
   const halfWidth=recipe.laneSpacing*(recipe.lanes-1)*.5*PaintFlowManifest.joins.laneSpread[1]+Math.max(...recipe.width)*PaintFlowManifest.joins.widthPressure[1]+PaintFlowManifest.joins.lateralWave;
   const required=PaintFlowManifest.clearance+PaintFlowManifest.motion.amplitude+Math.max(halfWidth,PaintFlowManifest.underpaint.width);
   const distances=field.passages.map(p=>{const line=new THREE.Line3(...p.ends),nearest=new THREE.Vector3();let minimum=Infinity;for(let i=0;i<=1200;i++){const point=curve.getPointAt(i/1200);minimum=Math.min(minimum,line.closestPointToPoint(point,true,nearest).distanceTo(point));}assert.ok(minimum>required,p.id);return{id:p.id,minimum,required};});report.connectorClearance=distances;
 });
 check('Motion advances locally and freezes for pause, hidden/state suppression and reduced motion',()=>{field.update(.02);const before=field.time;assert.ok(before>0);for(const options of [{paused:true},{enabled:false},{reducedMotion:true}]){field.update(.05,options);assert.equal(field.time,before);}field.update(.5);assert.ok(Math.abs(field.time-before-.05)<1e-9);});
 check('No renderer/RAF/camera ownership or mutable global material resources',()=>{assert.equal(field.renderer,undefined);assert.equal(field.camera,undefined);assert.equal(field.material.userData.paintUniforms.oilBrushAtlas.value,vortex.brushAtlas);assert.equal(field.material.userData.paintUniforms.oilPaintMap.value,pigment);});
 field.dispose();field.dispose();
 check('Owned geometry/material disposed once; borrowed atlas/pigment retained',()=>{assert.equal(disposed.geometry,field.meshes.length);assert.equal(disposed.material,1);assert.equal(disposed.atlas,0);assert.equal(disposed.pigment,0);assert.equal(field.group.parent,null);});
 const disabled=new PaintFlowField({scene,vortex,config:{...PaintFlowManifest,enabled:false}});check('Central off switch constructs no stroke resources',()=>{assert.equal(disabled.telemetry.strokes,0);assert.equal(disabled.meshes.length,0);assert.equal(disabled.group.visible,false);});disabled.dispose();report.status='passed';report.disposals={...disposed};
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}finally{field.dispose();vortex.dispose();pigment.dispose();await writeFile(process.env.PAINT_FLOW_REPORT||'tests/v12-rc54-paint-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
