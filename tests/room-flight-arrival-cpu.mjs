// CPU regression for the QA flight helper; this never imports a browser.
import assert from 'node:assert/strict';
import {Object3D} from 'three';
import {SpaceController} from '../src/core/SpaceController.js';
import {ExperienceState} from '../src/core/ExperienceState.js';
import {flyTo} from './room-flight-route.mjs';

const saved={window:globalThis.window,document:globalThis.document,starhaven:globalThis.starhaven};
globalThis.window=new EventTarget();globalThis.document=new EventTarget();
const body=new Object3D(),state=new ExperienceState();
const controller=new SpaceController({object:body,state,bounds:{min:[-100,-100,-100],max:[100,100,100]}});
body.position.set(.5,0,0);controller.velocity.set(10,0,0);
globalThis.starhaven={get state(){return state.value;},get player(){return body.position.toArray();},
  get velocity(){return controller.velocity.toArray();},get flight(){return {inputMode:'relative-mouse',
    yaw:controller.yaw,pitch:controller.pitch,lookSensitivity:controller.flight.lookSensitivity};}};
const frameInterval=Number(process.env.ARRIVAL_CPU_FRAME_MS||1000/60);
assert(Number.isFinite(frameInterval)&&frameInterval>0);
let wall=0,lastFrame=0,nextFrame=5000,frames=0,right=false,pointer=[720,480],brakedFrames=0,liftFrames=0,overshot=false;
const advance=milliseconds=>{const end=wall+milliseconds;while(nextFrame<=end){
  wall=nextFrame;nextFrame+=frameInterval;frames++;assert(frames<500,'CPU scenario exceeded its frame budget');
  if(controller.keys.has('KeyX'))brakedFrames++;
  if(controller.keys.has('Space'))liftFrames++;
  const dt=Math.min((wall-lastFrame)/1000,.35),steps=Math.ceil(dt/.05);lastFrame=wall;
  for(let i=0;i<steps;i++)controller.update(dt/steps,wall/1000);
  if(body.position.length()>1)overshot=true;
}wall=end;};
const code=key=>key==='Space'?'Space':key==='Shift'?'ShiftLeft':'Key'+key.toUpperCase();
const page={viewportSize:()=>({width:1440,height:960}),evaluate:async(fn,arg)=>fn(arg),
  waitForTimeout:async milliseconds=>advance(milliseconds),
  waitForFunction:async(fn,arg,{timeout})=>{const limit=wall+timeout;
    while(!fn(arg)){assert(nextFrame<=limit,'CPU scenario timed out waiting for a simulation frame');advance(nextFrame-wall);}},
  keyboard:{down:async key=>controller.keydown({code:code(key),target:{},preventDefault(){}}),
    up:async key=>controller.keyup({code:code(key)})},
  mouse:{move:async(x,y)=>{if(right)controller.lookDelta(x-pointer[0],y-pointer[1]);pointer=[x,y];},
    down:async()=>{right=true;},up:async()=>{right=false;}}};
try{
  await flyTo(page,[0,0,0],{radius:1,timeout:60000});
  assert(controller.velocity.length()<.15,'Arrival must actually stop');
  assert(overshot,'Scenario must include real inertial overshoot');
  assert(brakedFrames>0,'The brake must be consumed by the actual controller');
  assert(body.position.length()<1,'Arrival must be inside the requested radius after braking');
  assert.equal(controller.keys.size,0,'Helper must release its keys');
  console.log(JSON.stringify({status:'passed',browserStarted:false,simulation:`actual SpaceController; initial 5-second stall then ${frameInterval} ms per frame`,
    frames,brakedFrames,liftFrames,overshootCorrected:overshot,finalDistance:body.position.length(),finalSpeed:controller.velocity.length()}));
}catch(error){
  console.error(JSON.stringify({status:'failed',frames,brakedFrames,liftFrames,player:body.position.toArray(),speed:controller.velocity.length()}));
  throw error;
}finally{
  controller.dispose();
  for(const [key,value] of Object.entries(saved))if(value===undefined)delete globalThis[key];else globalThis[key]=value;
}
