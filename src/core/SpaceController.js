// Flight heading belongs to the pilot, independently of camera avoidance.
import {Vector2,Vector3,MathUtils} from 'three';
import {FlightTuning} from '../config/FlightTuning.js';
const movementKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','Space','ShiftLeft','ShiftRight','KeyX']);
const UP=new Vector3(0,1,0);
const wrap=angle=>MathUtils.euclideanModulo(angle+Math.PI,Math.PI*2)-Math.PI;
export class SpaceController {
  constructor({object,state,bounds,collision=null,canMove=()=>true,flight={}}){
    this.canMove=canMove;this.flight={...FlightTuning.movement,...flight};
    this.object=object;this.state=state;this.bounds={min:new Vector3(...bounds.min),max:new Vector3(...bounds.max)};this.collision=collision;
    this.keys=new Set();this.velocity=new Vector3();this.direction=new Vector3();this.forward=new Vector3();this.steer=new Vector2();
    this.speed=0;this.yaw=.47;this.pitch=0;this.targetYaw=.47;this.targetPitch=0;this.thrust=0;this.braking=false;this.active=false;
    this.keydown=e=>{if(e.target.closest?.('input,textarea,select,[contenteditable]')&&e.code!=='Escape')return;if(movementKeys.has(e.code)){e.preventDefault();if(!e.repeat&&state.moving&&this.canMove())this.keys.add(e.code);}};
    this.keyup=e=>this.keys.delete(e.code);
    window.addEventListener('keydown',this.keydown);window.addEventListener('keyup',this.keyup);
    this.blur=()=>this.clear();this.visibility=()=>{if(document.hidden)this.clear();};
    window.addEventListener('blur',this.blur);document.addEventListener('visibilitychange',this.visibility);
    this.unsubscribe=state.onChange(()=>this.clear());
  }
  clear(){this.targetYaw=this.yaw;this.targetPitch=this.pitch;this.active=false;this.keys.clear();this.steer.set(0,0);this.velocity.set(0,0,0);this.speed=0;this.thrust=0;this.braking=false;}
  resetHeading(yaw=.47,pitch=0){this.yaw=wrap(yaw);this.pitch=MathUtils.clamp(pitch,-1.30,1.30);this.targetYaw=this.yaw;this.targetPitch=this.pitch;this.steer.set(0,0);this.active=false;this.object.rotation.y=this.yaw+Math.PI;}
  lookDelta(x,y){
    if(!this.state.moving||!this.canMove()||(!x&&!y))return;
    // Relative mouse motion owns the heading. No screen-centre target, turn
    // speed cap or delayed rotation after the mouse has stopped.
    this.yaw=wrap(this.yaw-x*this.flight.lookSensitivity);
    this.pitch=MathUtils.clamp(this.pitch-y*this.flight.lookSensitivity,-1.30,1.30);
    this.targetYaw=this.yaw;this.targetPitch=this.pitch;this.active=true;
  }
  setKey(key,pressed){if(pressed&&this.state.moving&&this.canMove())this.keys.add(key);else this.keys.delete(key);}
  dispose(){this.clear();window.removeEventListener('keydown',this.keydown);window.removeEventListener('keyup',this.keyup);window.removeEventListener('blur',this.blur);document.removeEventListener('visibilitychange',this.visibility);this.unsubscribe?.();}
  update(dt,time){
    if(!this.state.moving)return false;
    if(!this.canMove()){this.clear();return false;}
    this.forward.set(-Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch));
    const k=this.keys,forward=(k.has('KeyW')||k.has('ArrowUp')?1:0)-(k.has('KeyS')||k.has('ArrowDown')?1:0),brake=k.has('KeyX');
    const lateral=(k.has('KeyD')||k.has('ArrowRight')?1:0)-(k.has('KeyA')||k.has('ArrowLeft')?1:0);
    const vertical=(k.has('Space')?1:0)-(k.has('ShiftLeft')||k.has('ShiftRight')?1:0);
    this.braking=brake;this.direction.copy(this.forward).multiplyScalar(forward);
    this.direction.add(new Vector3(Math.cos(this.yaw),0,-Math.sin(this.yaw)).multiplyScalar(lateral)).addScaledVector(UP,vertical*this.flight.verticalSpeed/this.flight.speed);
    this.thrust=brake?0:Math.min(1,this.direction.length());
    if(this.thrust>0){this.active=true;const goal=this.direction.normalize().clone().multiplyScalar(this.flight.speed*this.thrust);
      const alignment=this.velocity.lengthSq()>4?this.velocity.clone().normalize().dot(this.direction):1;
      const delta=goal.sub(this.velocity),step=(alignment<.96?this.flight.steeringAcceleration:this.flight.acceleration)*dt;if(delta.length()>step)delta.setLength(step);this.velocity.add(delta);
    }else{
      const speed=this.velocity.length(),drag=brake?this.flight.brake:this.flight.glideDrag,damping=brake?this.flight.brakeDamping:this.flight.glideDamping;
      // Exact decay over dt: a short initial coast settles continuously to rest.
      // The constant term removes an endless low-speed tail; S stays stronger.
      const next=damping>0?Math.max(0,(speed+drag/damping)*Math.exp(-damping*dt)-drag/damping):Math.max(0,speed-drag*dt);
      if(speed>0)this.velocity.multiplyScalar(next/speed);
    }
    const p=this.object.position,limits=this.collision?this.collision.bodyBounds(this.bounds):this.bounds;
    // A wide, velocity-aware approach corridor slows outward motion smoothly.
    // The final clamp is a numeric guard, never the primary boundary brake.
    this.boundaryDistance=Math.min(...['x','y','z'].flatMap(a=>[p[a]-limits.min[a],limits.max[a]-p[a]]));
    for(const axis of ['x','y','z']){
      const v=this.velocity[axis],distance=v<0?p[axis]-limits.min[axis]:limits.max[axis]-p[axis];
      if(distance<this.flight.boundarySlowDistance)this.velocity[axis]=Math.sign(v)*Math.min(Math.abs(v),Math.max(0,distance*.48));
    }
    const displacement=this.velocity.clone().multiplyScalar(dt);
    if(this.collision)this.collision.resolve(p,displacement,this.velocity,{dt});else p.add(displacement);
    p.clamp(limits.min,limits.max);
    this.speed=this.velocity.length()/this.flight.speed;
    this.object.rotation.y=this.yaw+Math.PI;this.object.rotation.x=0;this.object.rotation.z=0;return false;
  }
}
