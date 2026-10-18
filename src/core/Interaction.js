// Pure scene selection. FlightLookInput exclusively owns RMB steering and
// Pointer Lock; ordinary left dragging must never accidentally turn the pilot.
import {Raycaster,Vector2} from 'three';

export class Interaction {
  constructor({canvas,camera,getObjects,onSelect,onHover,onFlightStart,state}) {
    this.ray=new Raycaster();
    this.pointer=new Vector2();
    this.canvas=canvas;
    this.down=null;
    this.drag=false;
    this.events=new AbortController();
    const options={signal:this.events.signal};
    this.clearHover=()=>{
      onHover?.(null);
      canvas.style.cursor=state.moving?'crosshair':'default';
    };

    canvas.addEventListener('pointerdown',event=>{
      if(event.button!==0||document.pointerLockElement===canvas)return;
      this.down={id:event.pointerId,x:event.clientX,y:event.clientY};
      this.drag=false;
      try {canvas.setPointerCapture(event.pointerId);}
      catch {this.down=null;}
    },options);

    canvas.addEventListener('pointermove',event=>{
      if(document.pointerLockElement===canvas)return;
      if(this.down?.id===event.pointerId &&
        Math.hypot(event.clientX-this.down.x,event.clientY-this.down.y)>6)this.drag=true;
      if(this.down || state.locked)return;
      const hit=this.hit(event,camera,getObjects());
      onHover?.(hit,event);
      canvas.style.cursor=hit?'pointer':state.moving?'crosshair':'default';
    },options);

    canvas.addEventListener('pointerup',event=>{
      if(this.down?.id!==event.pointerId||event.button!==0)return;
      const isClick=!this.drag;
      this.down=null;this.drag=false;
      if(!isClick||state.locked||document.pointerLockElement===canvas)return;
      const hit=this.hit(event,camera,getObjects());
      if(hit)onSelect(hit);
      else if(state.moving)onFlightStart?.();
    },options);

    const reset=()=>{this.down=null;this.drag=false;};
    for(const name of ['pointercancel','lostpointercapture'])
      canvas.addEventListener(name,reset,options);
    canvas.addEventListener('pointerleave',this.clearHover,options);
    window.addEventListener('blur',()=>{
      reset();
      this.clearHover();
    },options);
    document.addEventListener('pointerlockchange',()=>{
      reset();
      if(document.pointerLockElement===canvas)this.clearHover();
    },options);
  }

  hit(event,camera,items) {
    const rect=this.canvas.getBoundingClientRect();
    this.pointer.set((event.clientX-rect.left)/rect.width*2-1,
      -(event.clientY-rect.top)/rect.height*2+1);
    this.ray.setFromCamera(this.pointer,camera);
    const intersections=this.ray.intersectObjects(items.map(h=>h.object),true);
    if(!intersections.length)return null;
    const object=intersections[0].object;
    return items.find(h=>{
      let node=object;
      while(node){if(node===h.object)return true;node=node.parent;}
      return false;
    })||null;
  }

  dispose(){this.events.abort();this.down=null;this.drag=false;}
}
