import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {SpaceCollision} from '../src/core/SpaceCollision.js';
import {CollisionManifest} from '../src/config/CollisionManifest.js';
import {attributeStaticContact} from './static-contact-attribution.mjs';

const world=new SpaceCollision({...CollisionManifest,door:[],dynamic:[]});
try{
  const ids=CollisionManifest.static.filter(p=>p.id.startsWith('terrace-rail-front-left-')).map(p=>p.id);
  const cases=[
    // Start and requested displacement measured from the real rail approach.
    {name:'rounded-rail',start:[-3.7192049104255824,.8639866842033415,8.223827648358998],delta:[0,0,-.54],matched:true},
    {name:'wall-is-not-rail',start:[-7,3,0],delta:[2,0,0],matched:false},
    {name:'free-space-is-not-rail',start:[-10,10,10],delta:[0,0,-.54],matched:false},
  ];
  for(const fixture of cases){
    const position=new Vector3(...fixture.start);
    world.resolve(position,new Vector3(...fixture.delta),null,{dt:.05});
    const result=attributeStaticContact(world.lastSolve,ids);
    assert.equal(result.matched,fixture.matched,fixture.name);
    console.log(JSON.stringify({status:'passed',browserStarted:false,scenario:fixture.name,attribution:result}));
  }
}finally{world.dispose();}
