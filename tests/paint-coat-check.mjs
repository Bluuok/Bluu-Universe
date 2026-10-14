import assert from 'node:assert/strict';
import * as THREE from 'three';
import {writeFile} from 'node:fs/promises';
import {sweptBody} from '../src/scenes/sky/VortexField.js';
import {makePaintCoat} from '../src/scenes/sky/PaintFlowField.js';
import {PaintFlowManifest as config} from '../src/config/PaintFlowManifest.js';

const report={at:new Date().toISOString(),method:'Production coat helper on a curved, strongly tapered blue sweep. Exact nearest blue triangles, closed edges and identical inherited animation; CPU only.',checks:[]};
const {geometry:body}=sweptBody([[0,0,0],[2,2,.3],[5,2.5,1],[8,1,2]].map(p=>new THREE.Vector3(...p)),{paintStroke:true,normal:[0,0,1],width:[.9,2],depth:[.5,1],endSize:.12,edgeBreakup:.045},config.geometry,{color:config.palette.blue[0],crest:config.palette.crest,shadow:config.palette.shadow});
const size=body.attributes.position.count;
body.setAttribute('flowAxis',new THREE.Float32BufferAttribute(Array.from({length:size},()=>[.8,.6,0]).flat(),3));
body.setAttribute('flowMotion',new THREE.Float32BufferAttribute(Array.from({length:size},()=>[1.3,.19]).flat(),2));
const coat=makePaintCoat(body,config.geometry,config.palette),triangle=new THREE.Triangle(),point=new THREE.Vector3(),nearest=new THREE.Vector3();
try{
  let maxGap=0;
  for(let v=0;v<coat.attributes.position.count;v++){
    point.fromBufferAttribute(coat.attributes.position,v);let distance=Infinity;
    for(let i=0;i<body.index.count;i+=3){triangle.a.fromBufferAttribute(body.attributes.position,body.index.getX(i));triangle.b.fromBufferAttribute(body.attributes.position,body.index.getX(i+1));triangle.c.fromBufferAttribute(body.attributes.position,body.index.getX(i+2));triangle.closestPointToPoint(point,nearest);distance=Math.min(distance,point.distanceTo(nearest));}
    maxGap=Math.max(maxGap,distance);
    assert.deepEqual([coat.attributes.flowAxis.getX(v),coat.attributes.flowAxis.getY(v),coat.attributes.flowAxis.getZ(v)],[body.attributes.flowAxis.getX(0),body.attributes.flowAxis.getY(0),0]);
    assert.equal(coat.attributes.flowMotion.getX(v),body.attributes.flowMotion.getX(0));assert.equal(coat.attributes.flowMotion.getY(v),body.attributes.flowMotion.getY(0));
  }
  assert.ok(maxGap<=.02501,`Pigment detached: ${maxGap}`);report.maximumSurfaceDistance=maxGap;report.checks.push('Every coat vertex within .02501 world units of blue triangles; matching animation prevents separation');
  const edges=new Map();
  for(let i=0;i<coat.index.count;i+=3)for(let e=0;e<3;e++){const a=coat.index.getX(i+e),b=coat.index.getX(i+(e+1)%3),key=[a,b].sort((x,y)=>x-y).join(':');edges.set(key,(edges.get(key)||0)+1);}
  assert.ok([...edges.values()].every(count=>count===2));report.checks.push('Closed pigment volume: exactly two incident triangles per edge');
  const left=Math.floor(config.geometry.crossSegments/4),columns=Math.ceil(config.geometry.crossSegments/4)-left+1,rows=config.geometry.curveSegments-1,count=rows*columns;
  for(let side=0;side<2;side++)for(const row of [0,rows-1])for(let column=0;column<columns;column++){
    const source=(row+1)*(config.geometry.crossSegments+1)+left+column,vertex=side*count+row*columns+column;
    for(let channel=0;channel<3;channel++)assert.ok(Math.abs(coat.attributes.color.array[vertex*3+channel]-body.attributes.color.array[source*3+channel])<1e-7,'Coat pigment has a hard terminal colour cut');
  }
  report.checks.push('Both physical end rings blend into the corresponding original blue pigment');
  for(const attribute of Object.values(coat.attributes))assert.ok([...attribute.array].every(Number.isFinite));
  report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{body.dispose();coat.dispose();await writeFile(process.env.PAINT_COAT_REPORT||'tests/v13-paint-coat.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
