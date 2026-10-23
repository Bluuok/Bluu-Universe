// Actual controller + doorway state machine. No renderer, browser or camera proof.
import assert from 'node:assert/strict';
import {Object3D,Vector3} from 'three';
import {SpaceController} from '../src/core/SpaceController.js';
import {ExperienceState} from '../src/core/ExperienceState.js';
import {RoomPassage} from '../src/core/RoomPassage.js';
import {AssetManifest} from '../src/config/AssetManifest.js';
import {flyTo,flyIntoRoom} from './room-flight-route.mjs';

const saved={window:globalThis.window,document:globalThis.document,starhaven:globalThis.starhaven},realNow=Date.now;
globalThis.window=new EventTarget();globalThis.document=new EventTarget();
try{
  for(const scenario of ['requested-entry','ordinary-flight','wrong-entry-count','existing-room']){
    const body=new Object3D(),state=new ExperienceState();
    body.position.set(1.35,1.8,8.2);
    const controller=new SpaceController({object:body,state,bounds:{min:[-100,-100,-100],max:[100,100,100]}});
    controller.resetHeading(0,0);controller.velocity.set(0,0,-5);
    const director={transition:null,setMode(){},moveTo(){}};
    const passage=new RoomPassage({state,director,controller,character:{group:body,setPresence(){},setVisible(){}},
      space:{docking:new Vector3(1.35,1.15,6.05),building:{setDoorOpen(){}},setInteriorProgress(){}},
      room:{},layout:AssetManifest.building,canEnter:()=>true,canTraverse:()=>true,
      getRoomView:()=>({position:new Vector3(),target:new Vector3()})});
    let wall=0,next=1000/60,right=false,pointer=[720,480],frames=0;
    const advance=ms=>{const end=wall+ms;while(next<=end){wall=next;next+=1000/60;frames++;
      controller.update(1/60,wall/1000);passage.update(1/60);
    }wall=end;};
    globalThis.starhaven={get state(){return state.value;},get player(){return body.position.toArray();},
      get velocity(){return controller.velocity.toArray();},get cameraProgress(){return {transition:null};},
      get passage(){const p=passage.telemetry;return scenario==='wrong-entry-count'?{...p,entries:0}:p;},
      get flight(){return {inputMode:'relative-mouse',yaw:controller.yaw,pitch:controller.pitch,lookSensitivity:controller.flight.lookSensitivity};}};
    const code=k=>k==='Space'?'Space':'Key'+k.toUpperCase();
    const page={viewportSize:()=>({width:1440,height:960}),evaluate:async(fn,arg)=>fn(arg),
      waitForTimeout:async ms=>advance(ms),
      waitForFunction:async(fn,arg,{timeout})=>{const limit=wall+timeout;while(!fn(arg)){assert(next<=limit,'Doorway CPU timeout');advance(next-wall);}},
      keyboard:{down:async k=>controller.keydown({code:code(k),target:{},preventDefault(){}}),up:async k=>controller.keyup({code:code(k)})},
      mouse:{move:async(x,y)=>{if(right)controller.lookDelta(x-pointer[0],y-pointer[1]);pointer=[x,y];},down:async()=>{right=true;},up:async()=>{right=false;}}};
    Date.now=()=>wall;
    try{
      if(scenario==='existing-room'){
        state.set('DOCKING');state.set('TRANSITION');state.set('ROOM');
        await assert.rejects(flyIntoRoom(page),/Entry route must start outside/);
      }else if(scenario==='ordinary-flight'||scenario==='wrong-entry-count'){
        const action=scenario==='ordinary-flight'?flyTo(page,[1.35,1.8,11]):flyIntoRoom(page);
        await assert.rejects(action,e=>e.code==='FLIGHT_LEFT_SPACE'&&e.flightState==='DOCKING');
        assert.equal(passage.entries,1,'The real doorway must have been crossed');
      }else{
        const result=await flyIntoRoom(page);
        assert.equal(result.entryDuringApproach,true);assert.equal(result.approachAnchorReached,false);
        assert.equal(state.value,'ROOM');assert.equal(passage.entries,1);assert.equal(passage.exits,0);
      }
      assert.equal(controller.keys.size,0);
      console.log(JSON.stringify({status:'passed',scenario,browserStarted:false,frames,state:state.value,entries:passage.entries}));
    }finally{controller.dispose();passage.dispose();}
  }
}finally{
  Date.now=realNow;
  for(const [key,value]of Object.entries(saved))if(value===undefined)delete globalThis[key];else globalThis[key]=value;
}
