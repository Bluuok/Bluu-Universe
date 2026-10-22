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
const scenario=process.env.ARRIVAL_CPU_SCENARIO||'overshoot';
const fixtures={overshoot:{player:[.5,0,0],velocity:[10,0,0],target:[0,0,0],radius:1},
  roof:{player:[-8.797659277064815,5.469263502601428,-10.045900599066428],velocity:[0,0,0],target:[-10,7,-10],radius:1},
  doorway:{player:[-2.76323195605741,2.7607716488279213,10.142060836500695],velocity:[0,0,0],target:[1.35,1.8,11],radius:.45}};
assert(Object.hasOwn(fixtures,scenario));const fixture=fixtures[scenario];
body.position.fromArray(fixture.player);controller.velocity.fromArray(fixture.velocity);
globalThis.starhaven={get state(){return state.value;},get player(){return body.position.toArray();},
  get velocity(){return controller.velocity.toArray();},get flight(){return {inputMode:'relative-mouse',
    yaw:controller.yaw,pitch:controller.pitch,lookSensitivity:controller.flight.lookSensitivity};}};
const frameInterval=Number(process.env.ARRIVAL_CPU_FRAME_MS||1000/60);
assert(Number.isFinite(frameInterval)&&frameInterval>0);
const ioDelay=Number(process.env.ARRIVAL_CPU_IO_MS||0);assert(Number.isFinite(ioDelay)&&ioDelay>=0);
const timeout=Number(process.env.ARRIVAL_CPU_TIMEOUT_MS||60000);assert(Number.isFinite(timeout)&&timeout>0);
let wall=0,lastFrame=0,nextFrame=5000,frames=0,right=false,pointer=[720,480],brakedFrames=0,liftFrames=0,overshot=false;
const advance=milliseconds=>{const end=wall+milliseconds;while(nextFrame<=end){
  wall=nextFrame;nextFrame+=frameInterval;frames++;assert(frames<Math.ceil(timeout/frameInterval)+20,'CPU scenario exceeded its frame budget');
  if(controller.keys.has('KeyX'))brakedFrames++;
  if(controller.keys.has('Space'))liftFrames++;
  const dt=Math.min((wall-lastFrame)/1000,.35),steps=Math.ceil(dt/.05);lastFrame=wall;
  for(let i=0;i<steps;i++)controller.update(dt/steps,wall/1000);
  if(body.position.distanceTo({x:fixture.target[0],y:fixture.target[1],z:fixture.target[2]})>fixture.radius)overshot=true;
}wall=end;};
const code=key=>key==='Space'?'Space':key==='Shift'?'ShiftLeft':'Key'+key.toUpperCase();
const page={viewportSize:()=>({width:1440,height:960}),evaluate:async(fn,arg)=>{advance(ioDelay);return fn(arg);},
  waitForTimeout:async milliseconds=>advance(milliseconds),
  waitForFunction:async(fn,arg,{timeout})=>{const limit=wall+timeout;
    while(!fn(arg)){assert(nextFrame<=limit,'CPU scenario timed out waiting for a simulation frame');advance(nextFrame-wall);}advance(ioDelay);},
  keyboard:{down:async key=>{advance(ioDelay);controller.keydown({code:code(key),target:{},preventDefault(){}});},
    up:async key=>{advance(ioDelay);controller.keyup({code:code(key)});}},
  mouse:{move:async(x,y)=>{advance(ioDelay);if(right)controller.lookDelta(x-pointer[0],y-pointer[1]);pointer=[x,y];},
    down:async()=>{advance(ioDelay);right=true;},up:async()=>{advance(ioDelay);right=false;}}};
const realNow=Date.now;Date.now=()=>wall;
try{
  const arrival=await flyTo(page,fixture.target,{radius:fixture.radius,timeout});
  assert(wall<=timeout,'CPU scenario exceeded its total virtual-time budget');
  const finalDistance=Math.hypot(...body.position.toArray().map((v,i)=>v-fixture.target[i]));
  assert(controller.velocity.length()<.15,'Arrival must actually stop');
  if(scenario==='overshoot')assert(overshot,'Scenario must include real inertial overshoot');
  assert(brakedFrames>0,'The brake must be consumed by the actual controller');
  assert(finalDistance<fixture.radius,'Arrival must be inside the requested radius after braking');
  assert.equal(controller.keys.size,0,'Helper must release its keys');
  console.log(JSON.stringify({status:'passed',browserStarted:false,scenario,ioDelay,elapsed:wall,timeout,simulation:`actual SpaceController; initial 5-second stall then ${frameInterval} ms per frame`,
    frames,brakedFrames,liftFrames,outsideBeforeArrival:overshot,finalDistance,finalSpeed:controller.velocity.length(),approach:arrival.detours}));
}catch(error){
  console.error(JSON.stringify({status:'failed',frames,brakedFrames,liftFrames,player:body.position.toArray(),speed:controller.velocity.length()}));
  throw error;
}finally{
  Date.now=realNow;
  controller.dispose();
  for(const [key,value] of Object.entries(saved))if(value===undefined)delete globalThis[key];else globalThis[key]=value;
}
