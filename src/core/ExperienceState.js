export const STATES=Object.freeze({SPACE:'SPACE',DOCKING:'DOCKING',TRANSITION:'TRANSITION',ROOM:'ROOM',PROJECT:'PROJECT'});
const allowed={SPACE:['DOCKING','PROJECT'],DOCKING:['TRANSITION'],TRANSITION:['ROOM','SPACE'],ROOM:['PROJECT','TRANSITION'],PROJECT:['ROOM','SPACE']};
export class ExperienceState {
  value=STATES.SPACE; previous=STATES.SPACE; listeners=[];
  set(next){ if(next===this.value)return; if(!allowed[this.value]?.includes(next))return false; this.previous=this.value; this.value=next; this.listeners.forEach(fn=>fn(next)); return true; }
  onChange(fn){this.listeners.push(fn);return ()=>{const i=this.listeners.indexOf(fn);if(i>=0)this.listeners.splice(i,1);};}
  get moving(){return this.value===STATES.SPACE;}
  get locked(){return ['DOCKING','TRANSITION'].includes(this.value);}
}
