// Raycast selection and click-vs-drag flow adapted from Joan Ramos Refusta's Navigation.js (MIT).
import {Raycaster,Vector2} from 'three';
export class Interaction {
  constructor({canvas,camera,getObjects,onSelect,onOrbit,onHover,onFlightStart,onLookStart,state}){
    this.ray=new Raycaster();this.pointer=new Vector2();this.down=null;this.drag=false;this.canvas=canvas;
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('pointerdown',e=>{this.down={x:e.clientX,y:e.clientY};this.last={x:e.clientX,y:e.clientY};this.drag=e.button===2;if(state.moving&&e.button===2)onLookStart?.();canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(document.pointerLockElement===canvas){if(state.moving)onOrbit(e.movementX,e.movementY);return;}if(this.down){if(Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>6)this.drag=true;if(this.drag)onOrbit(e.clientX-this.last.x,e.clientY-this.last.y);this.last={x:e.clientX,y:e.clientY};}if(!state.locked){const hit=this.hit(e,camera,getObjects());onHover?.(hit,e);canvas.style.cursor=hit?'pointer':this.drag?'grabbing':'crosshair';}});
    canvas.addEventListener('pointerup',e=>{if(this.down&&!this.drag&&!state.locked&&e.button===0&&document.pointerLockElement!==canvas){const hit=this.hit(e,camera,getObjects());if(hit)onSelect(hit);else if(state.moving)onFlightStart?.();}this.down=null;});for(const name of ['pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>{this.down=null;this.drag=false;});window.addEventListener('blur',()=>{this.down=null;this.drag=false;});
  }
  hit(e,camera,items){const rect=this.canvas.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,camera);const intersections=this.ray.intersectObjects(items.map(h=>h.object),true);if(!intersections.length)return null;let obj=intersections[0].object;return items.find(h=>{let n=obj;while(n){if(n===h.object)return true;n=n.parent;}return false;});}
}
