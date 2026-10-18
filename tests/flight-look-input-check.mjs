import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {FlightLookInput} from '../src/core/FlightLookInput.js';
import {SpaceController} from '../src/core/SpaceController.js';

class InputWindow extends EventTarget {}
class InputDocument extends EventTarget {
  pointerLockElement=null;
  hidden=false;
  exitPointerLock(){
    this.pointerLockElement=null;
    this.dispatchEvent(new Event('pointerlockchange'));
  }
}
class InputCanvas extends EventTarget {
  constructor(doc){super();this.doc=doc;this.captures=new Set();this.focusCount=0;}
  setPointerCapture(id){this.captures.add(id);}
  hasPointerCapture(id){return this.captures.has(id);}
  releasePointerCapture(id){this.captures.delete(id);}
  focus(){this.focusCount++;}
  requestPointerLock(){
    this.doc.pointerLockElement=this;
    this.doc.dispatchEvent(new Event('pointerlockchange'));
    return Promise.resolve();
  }
}
const emit=(target,type,props={})=>{
  const event=new Event(type,{cancelable:true});
  Object.assign(event,props);
  target.dispatchEvent(event);
  return event;
};
const approx=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-9,msg||`${a} != ${b}`);
const originalWindow=globalThis.window,originalDocument=globalThis.document;
const win=new InputWindow(),doc=new InputDocument(),canvas=new InputCanvas(doc);
globalThis.window=win;globalThis.document=doc;
let control,look;
try {
  const state={moving:true,onChange:()=>()=>{}};
  const object={position:new Vector3(),rotation:{x:0,y:0,z:0}};
  control=new SpaceController({
    object,state,bounds:{min:[-100,-100,-100],max:[100,100,100]},
    canMove:()=>true,
  });
  let started=0,errors=0;
  const locks=[],moves=[];
  look=new FlightLookInput({
    canvas,doc,win,canLook:()=>state.moving,
    onStart:()=>started++,
    onLook:(dx,dy)=>{moves.push([dx,dy]);control.lookDelta(dx,dy);},
    onCaptured:locked=>locks.push(locked),
    onError:()=>errors++,
  });

  // Relative movements are consumed only when the canvas is truly locked.
  const initial=control.yaw;
  emit(doc,'mousemove',{movementX:200,movementY:0});
  approx(control.yaw,initial);

  // Left drag is selection only, not a steering control.
  emit(canvas,'pointerdown',{pointerId:1,button:0,clientX:50,clientY:50});
  emit(canvas,'pointermove',{pointerId:1,buttons:1,clientX:90,clientY:70});
  emit(canvas,'pointerup',{pointerId:1,button:0});
  approx(control.yaw,initial);

  // Right-drag fallback works without pointer lock and without a pointer
  // capture changing the flight velocity/keyboard state.
  control.keys.add('KeyW');
  control.velocity.set(4,1,3);
  const right=emit(canvas,'pointerdown',{pointerId:2,button:2,clientX:100,clientY:100});
  assert.equal(right.defaultPrevented,true);
  assert.equal(canvas.hasPointerCapture(2),true);
  emit(canvas,'pointermove',{pointerId:2,clientX:130,clientY:85,movementX:30,movementY:-15});
  approx(control.yaw,initial-30*control.flight.lookSensitivity);
  approx(control.pitch,15*control.flight.lookSensitivity);
  assert.equal(control.keys.has('KeyW'),true);
  assert.deepEqual(control.velocity.toArray(),[4,1,3]);
  emit(canvas,'pointerup',{pointerId:2,button:2});
  assert.equal(canvas.hasPointerCapture(2),false);
  emit(canvas,'pointermove',{pointerId:2,clientX:150,clientY:70});
  assert.equal(moves.length,1);

  // Pointer Lock acquires in the same user gesture, never clears movement,
  // and receives document mousemove exactly once (not also pointermove).
  await look.request();
  assert.equal(look.locked,true);
  assert.deepEqual(locks,[true]);
  assert.equal(canvas.focusCount,1);
  assert.equal(control.keys.has('KeyW'),true);
  assert.deepEqual(control.velocity.toArray(),[4,1,3]);
  const before=control.yaw;
  emit(canvas,'pointermove',{pointerId:3,movementX:90,movementY:0});
  approx(control.yaw,before);
  emit(doc,'mousemove',{movementX:90,movementY:0});
  approx(control.yaw,before-90*control.flight.lookSensitivity);

  // No smoothing tail: stopping the mouse cannot continue steering.
  const still=control.yaw;
  control.update(1/60,0);
  control.update(1/60,0);
  approx(control.yaw,still);

  // The source controller retains the documented pitch clamps and wrap.
  emit(doc,'mousemove',{movementX:0,movementY:-6000});
  assert.equal(control.pitch,1.3);
  emit(doc,'mousemove',{movementX:0,movementY:6000});
  assert.equal(control.pitch,-1.3);
  for(let i=0;i<6;i++)emit(doc,'mousemove',{movementX:500,movementY:0});
  assert.ok(control.yaw>=-Math.PI && control.yaw<=Math.PI);

  // Release is a transition, never a stale relative movement source.
  look.release();
  assert.deepEqual(locks,[true,false]);
  assert.equal(look.locked,false);
  const released=control.yaw;
  emit(doc,'mousemove',{movementX:200,movementY:100});
  approx(control.yaw,released);

  // RMB drag is cleared on blur and when leaving the flight state.
  emit(canvas,'pointerdown',{pointerId:4,button:2,clientX:40,clientY:40});
  emit(win,'blur');
  emit(canvas,'pointermove',{pointerId:4,clientX:100,clientY:100});
  approx(control.yaw,released);
  state.moving=false;
  await assert.rejects(()=>look.request(),/Pointer Lock unavailable/);
  emit(canvas,'pointerdown',{pointerId:5,button:2,clientX:40,clientY:40});
  assert.equal(look.drag,null);

  // Reset listeners cleanly; a later event cannot modify headings.
  look.dispose();
  emit(doc,'mousemove',{movementX:500,movementY:0});
  approx(control.yaw,released);
  assert.equal(errors,0);
  assert.equal(started,3); // RMB twice + explicit lock request.
  console.log('Game mouse look: lock, right drag, steering, key continuity, clamps, blur and cleanup OK');
} finally {
  look?.dispose();control?.dispose();
  globalThis.window=originalWindow;
  globalThis.document=originalDocument;
}
