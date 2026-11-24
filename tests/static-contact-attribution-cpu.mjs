import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {SpaceCollision} from '../src/core/SpaceCollision.js';
import {CollisionManifest} from '../src/config/CollisionManifest.js';
import {attributeStaticContact,attributeStaticContactRebuilt} from './static-contact-attribution.mjs';

const world=new SpaceCollision({...CollisionManifest,door:[],dynamic:[]});
try{
  const ids=CollisionManifest.static.filter(p=>p.id.startsWith('terrace-rail-front-left-')).map(p=>p.id);
  const roof={start:[.6579440305205796,7.438673551588369,.28989560169467127],delta:[.05478252233704083,-.1451126634844673,.03264414883770425]};
  const cases=[
    // Start and requested displacement measured from the real rail approach.
    {name:'rounded-rail',start:[-3.7192049104255824,.8639866842033415,8.223827648358998],delta:[0,0,-.54],matched:true},
    {name:'wall-is-not-rail',start:[-7,3,0],delta:[2,0,0],matched:false},
    {name:'free-space-is-not-rail',start:[-10,10,10],delta:[0,0,-.54],matched:false},
    {name:'curved-roof-preserves-original-order',...roof,ids:['studio-roof'],matched:true,rebuiltMismatch:true},
    {name:'roof-is-not-left-wall',...roof,ids:['studio-wall-left'],matched:false},
  ];
  for(const fixture of cases){
    const position=new Vector3(...fixture.start);
    world.resolve(position,new Vector3(...fixture.delta),null,{dt:.05});
    const selected=fixture.ids||ids,result=attributeStaticContact(world.lastSolve,selected);
    assert.equal(result.matched,fixture.matched,fixture.name);
    if(fixture.rebuiltMismatch){
      const rebuilt=attributeStaticContactRebuilt(world.lastSolve,selected);
      assert.equal(rebuilt.matched,false,'The observed curved-roof counterexample must remain distinct');
      assert(rebuilt.probes[1].endpointDifference>CollisionManifest.capsule.skin);
      assert.equal(result.probes[1].endpointDifference,0,'Same-tree filtering must reproduce the exact endpoint');
    }
    if(fixture.name==='rounded-rail')assert.equal(result.targetTriangles,60,'Coincident side-post triangles must retain separate ownership');
    console.log(JSON.stringify({status:'passed',browserStarted:false,scenario:fixture.name,attribution:result}));
  }
}finally{world.dispose();}
