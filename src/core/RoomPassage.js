import {Vector3,MathUtils} from 'three';
import {STATES} from './ExperienceState.js';
import {BuildingLayout} from '../config/BuildingLayout.js';

const smooth=p=>{p=MathUtils.clamp(p,0,1);return p*p*(3-2*p);};

// Owns only the doorway crossing and its reversible reveal. The caller supplies
// the shared scene objects; CameraDirector remains the only camera writer.
// No timers, DOM listeners, render loop, model loads or owned GPU resources.
export class RoomPassage {
  constructor({state,director,controller,character,space,room,layout,canEnter,canTraverse,getRoomView,onEnter=()=>{},onInside=()=>{},onOutside=()=>{}}){
    Object.assign(this,{state,director,controller,character,space,room,layout,canEnter,canTraverse,getRoomView,onEnter,onInside,onOutside});
    this.config={...BuildingLayout.passage,...layout.passage};this.previous=character.group.position.clone();this.phase=null;this.armed=true;this.entries=0;this.exits=0;this.velocity=new Vector3();this.disposed=false;
  }
  insideGate(p,margin=0){const c=this.config,d=this.layout.door;return Math.abs(p.x-d.center[0])<c.halfWidth+margin&&p.y>c.minY-margin&&p.y<c.maxY+margin&&p.z<d.outerPlane+c.captureAhead+margin&&p.z>this.space.docking.z-.3-margin;}
  reset(){this.phase=null;this.armed=true;this.velocity.set(0,0,0);this.previous.copy(this.character.group.position);this.space.setInteriorProgress(0);this.character.setPresence(1);}
  tryEnter(){
    if(this.disposed||!this.armed||this.phase||!this.state.moving||!this.canEnter())return false;
    const p=this.character.group.position;
    if(!this.insideGate(p)||this.controller.forward.z>-.55||this.controller.velocity.z>-.25||!this.canTraverse(p,this.space.docking))return false;
    const incoming=this.controller.velocity.clone();this.velocity.copy(incoming);this.armed=false;this.entries++;this.onEnter();
    this.state.set(STATES.DOCKING);this.director.setMode(STATES.DOCKING);this.space.building.setDoorOpen(true);
    this.startMotion('approach',p,this.space.docking,this.config.approachDuration,incoming);
    const a=this.layout.anchors;
    this.director.moveTo(new Vector3(...a.doorCamera),new Vector3(...this.layout.door.center),this.config.approachDuration);
    return true;
  }
  startMotion(kind,from,to,duration,incoming=new Vector3()){
    const distance=from.distanceTo(to),tangent=incoming.clone().multiplyScalar(duration);
    if(tangent.length()>distance*1.8)tangent.setLength(distance*1.8);
    this.phase={kind,elapsed:0,duration,from:from.clone(),to:to.clone(),tangent};
  }
  leave(){
    if(this.disposed||this.phase||this.state.value!==STATES.ROOM||this.director.transition)return false;
    this.exits++;this.armed=false;this.state.set(STATES.TRANSITION);this.director.setMode(STATES.TRANSITION);this.controller.resetHeading(this.config.exitYaw);
    this.space.building.setDoorOpen(true);this.character.setVisible(true);this.character.setPresence(0);
    const inside=new Vector3(...this.layout.anchors.entryTarget);inside.y=this.space.docking.y;
    this.character.group.position.copy(inside);
    const exit=this.space.docking.clone().add(new Vector3(...this.config.exitOffset));
    const view=this.director.getFlightReturnView(exit,this.controller.yaw,this.controller.pitch);
    // Face outward and carry the pilot far enough through the entrance that
    // the trailing camera also clears the terrace, including narrow screens.
    const clearance=Math.max(0,this.layout.terrace.max[2]+this.config.exitCameraClearance-view.position.z);
    exit.z+=clearance;view.position.z+=clearance;view.target.z+=clearance;
    const duration=Math.max(this.config.exitDuration,inside.distanceTo(exit)*1.5/this.config.exitSpeed);
    this.startMotion('exit',inside,exit,duration);
    this.director.moveTo(view.position,view.target,duration);
    return true;
  }
  update(dt){
    if(this.disposed)return;
    const position=this.character.group.position;
    if(!this.phase){
      if(this.state.moving){
        if(!this.armed&&!this.insideGate(position,this.config.rearmMargin))this.armed=true;
        // A pilot can first enter at an angle, then align with the door. Keep
        // checking actual inward travel inside the gate instead of losing the
        // one boundary-crossing frame. The separate exit guard still applies.
        if(this.insideGate(position)&&this.previous.z-position.z>.00001&&this.tryEnter()){
          // The pilot already consumed this frame's dt to cross the gate.
          // Start docking here; advance its motion on the next update only.
          this.previous.copy(position);return;
        }
      }
      this.previous.copy(position);
      if(!this.phase)return;
    }
    const phase=this.phase;phase.elapsed+=dt;
    const p=Math.min(1,phase.elapsed/phase.duration),before=position.clone();
    if(phase.kind==='approach'){
      // Hermite preserves incoming travel while settling at the landing marker.
      position.copy(phase.from).multiplyScalar(2*p*p*p-3*p*p+1).addScaledVector(phase.tangent,p*p*p-2*p*p+p).addScaledVector(phase.to,-2*p*p*p+3*p*p);
    }else if(phase.kind==='reveal'){
      position.lerpVectors(phase.from,phase.to,smooth(p/.6));
      const reveal=smooth((p-.08)/.72);this.space.setInteriorProgress(reveal);this.character.setPresence(1-smooth((p-.1)/.55));
    }else{
      position.lerpVectors(phase.from,phase.to,smooth(p));
      this.space.setInteriorProgress(1-smooth((p-.18)/.76));this.character.setPresence(smooth((p-.2)/.55));
    }
    this.velocity.copy(position).sub(before).divideScalar(Math.max(dt,.001));
    const yaw=phase.kind==='exit'?this.controller.yaw:0,target=yaw+Math.PI;
    const angle=MathUtils.euclideanModulo(target-this.character.group.rotation.y+Math.PI,Math.PI*2)-Math.PI;
    this.character.group.rotation.y+=angle*(1-Math.exp(-7*dt));
    this.previous.copy(position);
    if(p<1)return;
    if(phase.kind==='approach'){
      this.state.set(STATES.TRANSITION);this.director.setMode(STATES.TRANSITION);
      const inside=new Vector3(...this.layout.anchors.entryTarget);inside.y=this.space.docking.y;
      this.startMotion('reveal',position,inside,this.config.revealDuration);
      const view=this.getRoomView();this.director.moveTo(view.position,view.target,this.config.revealDuration);
    }else if(!this.director.transition){
      this.phase=null;this.velocity.set(0,0,0);this.controller.clear();
      if(phase.kind==='reveal'){
        this.space.setInteriorProgress(1);this.character.setVisible(false);this.director.setMode(STATES.ROOM);this.state.set(STATES.ROOM);this.onInside();
      }else{
        this.character.setPresence(1);this.space.setInteriorProgress(0);this.space.building.setDoorOpen(false);
        this.director.resumeFlightView(position,this.controller.yaw,this.controller.pitch);this.state.set(STATES.SPACE);this.onOutside();
      }
    }
  }
  get flight(){return this.phase?{speed:this.velocity.length()/this.controller.flight.speed,velocity:this.velocity,thrust:0,braking:false,pitch:0,yaw:this.phase.kind==='exit'?this.controller.yaw:0}:null;}
  get telemetry(){return {phase:this.phase?.kind||null,progress:this.phase?Math.min(1,this.phase.elapsed/this.phase.duration):1,armed:this.armed,entries:this.entries,exits:this.exits};}
  dispose(){this.disposed=true;this.phase=null;}
}
