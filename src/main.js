import './style.css';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {ProjectRegistry,loadProjectContent} from './config/ProjectRegistry.js';
import {AssetManifest} from './config/AssetManifest.js';
import {AnimationMap} from './config/AnimationMap.js';
import {ExperienceState,STATES} from './core/ExperienceState.js';
import {SpaceController} from './core/SpaceController.js';
import {SpaceCollision} from './core/SpaceCollision.js';
import {CollisionManifest} from './config/CollisionManifest.js';
import {CameraDirector} from './core/CameraDirector.js';
import {CameraAvoidance} from './core/CameraAvoidance.js';
import {Interaction} from './core/Interaction.js';
import {SpaceScene} from './scenes/SpaceScene.js';
import {RoomScene} from './scenes/RoomScene.js';
import {CharacterScene} from './scenes/CharacterScene.js';
import {ProjectBook} from './core/ProjectBook.js';
import {buildPortfolioCatalog,getProjectNeighbours} from './core/PortfolioNavigation.js';
import {RoomPassage} from './core/RoomPassage.js';

const $=id=>document.getElementById(id);
const scene=new THREE.Scene();scene.background=new THREE.Color('#091c36');
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,AssetManifest.sky.cameraFar);
const renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(new RoomEnvironment(),.035);scene.environment=env.texture;pmrem.dispose();
scene.add(new THREE.HemisphereLight('#91b6dc','#573b2a',.8));const sun=new THREE.DirectionalLight('#fff0cc',2);sun.position.set(-8,12,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-15;sun.shadow.camera.right=15;sun.shadow.camera.top=15;sun.shadow.camera.bottom=-15;sun.shadow.bias=-.0003;scene.add(sun);const rim=new THREE.DirectionalLight('#4aa7db',1);rim.position.set(9,7,-6);scene.add(rim);
// Match the upstream painting's direct SRGB route. Per-material ACES remains
// for lit models; toneMapped:false painted layers retain the original colors.
const state=new ExperienceState();const director=new CameraDirector(camera,{focusOffset:AssetManifest.space.cameraFocusOffset});const space=new SpaceScene({scene,registry:ProjectRegistry,manifest:AssetManifest});const room=new RoomScene({scene,renderer,manifest:AssetManifest,registry:ProjectRegistry});room.setVisible(true);const character=new CharacterScene({scene,manifest:AssetManifest.character,animationMap:AnimationMap,multisampled:renderer.getContext().getParameter(renderer.getContext().SAMPLES)>0});
let projectFlightReturn=null;
let gpuWarmup=null;
const book=new ProjectBook($('project-panel'));
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const uiDuration=seconds=>reducedMotion.matches ? .001 : seconds;
function setCatalog(visible){
  const wasInside=!visible&&$('catalog').contains(document.activeElement);
  $('catalog').hidden=!visible;
  $('project-toggle').setAttribute('aria-expanded',String(visible));
  if(wasInside)$('project-toggle').focus({preventScroll:true});
}
let projectRevision=0,projectOpener=null;
let ready=false,projectOrigin=STATES.ROOM,selectedProject=null,soundEnabled=false,audioContext,transitionTimer=null;const timers=new Set();
function later(fn,ms){const t=setTimeout(()=>{timers.delete(t);fn();},ms);timers.add(t);return t;}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(transitionTimer);transitionTimer=later(()=>$('toast').classList.remove('show'),2500);}
function sound(freq=500){if(!soundEnabled)return;audioContext ||=new AudioContext();if(audioContext.state==='suspended')audioContext.resume();const oscillator=audioContext.createOscillator();const gain=audioContext.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(freq,audioContext.currentTime);oscillator.frequency.exponentialRampToValueAtTime(freq*.65,audioContext.currentTime+.12);gain.gain.setValueAtTime(.045,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.16);oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start();oscillator.stop(audioContext.currentTime+.18);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};}
let collision=null,flightPaused=false;
function pauseFlight(value=true){flightPaused=value;controller.clear();if(value&&document.pointerLockElement)document.exitPointerLock();$('pause-flight').textContent=value?'继续飞行':'暂停';$('pause-flight').setAttribute('aria-pressed',String(value));}
let projectContentStatus=null;
const controller=new SpaceController({object:character.group,state,bounds:AssetManifest.space.bounds,flight:AssetManifest.space.flight,canMove:()=>ready&&director.transition===null&&!flightPaused&&$('catalog').hidden&&document.visibilityState!=='hidden'});
function releaseFlightPointer(){controller.clear();}
async function requestFlightControl(){
 if(!ready||!state.moving||director.transition||!$('catalog').hidden)return;
 pauseFlight(false);$('world').focus({preventScroll:true});
 try{if(!$('world').requestPointerLock)throw new Error('unsupported');await $('world').requestPointerLock();}
 catch{toast('鼠标捕获不可用：按住右键拖动转向，WASD 移动。');}
}
$('world').tabIndex=0;
$('flight-reticle').style.width='12px';$('flight-reticle').style.height='12px';
const roomOverview=()=>director.getFramedView(new THREE.Vector3(...AssetManifest.room.overview.position),new THREE.Vector3(...AssetManifest.room.overview.target),{kind:'ROOM'});
const spaceOverview=()=>{const view=AssetManifest.building.views.externalFront;return director.getFramedView(new THREE.Vector3(...view.position),new THREE.Vector3(...view.target),{kind:'SPACE',player:character.group.position});};
const passage=new RoomPassage({state,director,controller,character,space,room,layout:AssetManifest.building,
 canEnter:()=>ready&&!flightPaused&&!director.transition&&$('catalog').hidden&&document.visibilityState!=='hidden',
 canTraverse:(from,to)=>collision?.canTraverse(from,to,{doorOpen:true,docking:true}),getRoomView:roomOverview,
 onEnter:()=>{sound(640);setCatalog(false);},
 onInside:()=>{$('exit').focus({preventScroll:true});},onOutside:()=>{}});
function enterRoom(){return passage.tryEnter();}
let pendingRoomExit=false;
function leaveRoom(){
 if(state.locked)return;
 if(state.value===STATES.PROJECT){closeProject().then(closed=>{if(closed&&state.value===STATES.ROOM)leaveRoom();});return;}
 // A visible exit clicked while the book's return camera is settling must
 // retain that intent. The existing render loop consumes it exactly once.
 if(state.value===STATES.ROOM&&director.transition){pendingRoomExit=true;return;}
 if(director.transition)return;
 pendingRoomExit=false;
 if(passage.leave())sound(450);
}
state.onChange(()=>{if(state.value!==STATES.ROOM)pendingRoomExit=false;});
function settlePendingRoomExit(){if(pendingRoomExit&&state.value===STATES.ROOM&&!state.locked&&!director.transition)leaveRoom();}
function updateProjectNeighbourControls(id){
 const neighbours=getProjectNeighbours(ProjectRegistry,id);
 if(!neighbours)return;
 const title=id=>ProjectRegistry[id]?.name||ProjectRegistry[id]?.title||id;
 $('project-position').textContent=`${String(neighbours.index+1).padStart(2,'0')} / ${String(neighbours.total).padStart(2,'0')}`;
 $('project-previous').setAttribute('aria-label',`上一个作品：${title(neighbours.previous)}`);
 $('project-next').setAttribute('aria-label',`下一个作品：${title(neighbours.next)}`);
 for(const id of ['project-previous','project-next'])$(id).disabled=neighbours.total<2;
}
function openProject(id,{keepBookFocus=false}={}){
  if(!ready||state.locked||!ProjectRegistry[id])return;
  if(state.value===STATES.PROJECT&&selectedProject===id&&book.status!=='closing')return;
  projectRevision++;
  if(state.value!==STATES.PROJECT){projectOpener=document.activeElement?.closest('#catalog')?$('project-toggle'):document.activeElement;projectFlightReturn=state.value===STATES.SPACE?{yaw:controller.yaw,pitch:controller.pitch,exploring:director.exploring}:null;projectOrigin=state.value;state.set(STATES.PROJECT);director.setMode(STATES.PROJECT);}
  selectedProject=id;setCatalog(false);updateProjectNeighbourControls(id);book.open(ProjectRegistry[id],{keepFocus:keepBookFocus});
  const hotspot=(projectOrigin===STATES.ROOM?room.hotspots:space.hotspots).find(h=>h.id===id);
  if(hotspot?.camera){const c=projectCamera(hotspot,id);director.moveTo(c.position,c.target,uiDuration(.72));}
  sound(580);
}
function projectCamera(hotspot,id){
  if(projectOrigin===STATES.ROOM){
    const overview=roomOverview();
    const bounds=director.getFramingBounds('ROOM');
    return director.getFramedProjectView(overview.position,overview.target,bounds,$('project-panel').getBoundingClientRect());
  }
  const satellite=projectOrigin===STATES.SPACE?space.satellites?.[id]:null;
  if(!satellite)return hotspot.camera;
  const bounds=new THREE.Box3().setFromObject(satellite);
  return director.getFramedProjectView(hotspot.camera.position,hotspot.camera.target,bounds,$('project-panel').getBoundingClientRect());
}
async function closeProject(){
 if(state.value!==STATES.PROJECT||book.status==='closing')return false;
 const revision=++projectRevision;
 if(!await book.close()||revision!==projectRevision)return false;
 selectedProject=null;state.set(projectOrigin);director.setMode(projectOrigin);
 const restoreFocus=()=>queueMicrotask(()=>{if(revision!==projectRevision||state.value!==projectOrigin)return;const target=projectOpener?.getClientRects().length?projectOpener:$(projectOrigin===STATES.ROOM?'exit':'project-toggle');target?.focus({preventScroll:true});});
 if(projectOrigin===STATES.ROOM){const c=roomOverview();director.moveTo(c.position,c.target,uiDuration(.60),restoreFocus);}else {
 const saved=projectFlightReturn;projectFlightReturn=null;
 if(saved?.exploring){
  controller.resetHeading(saved.yaw,saved.pitch);
  const c=director.getFlightReturnView(character.group.position,saved.yaw,saved.pitch);
  director.moveTo(c.position,c.target,uiDuration(.60),()=>{director.resumeFlightView(character.group.position,saved.yaw,saved.pitch);restoreFocus();});
 }else{
  controller.resetHeading();const c=spaceOverview();director.moveTo(c.position,c.target,uiDuration(.60),restoreFocus);
 }
}sound(400);return true;}
function select(hit){if(hit.id==='robot')toast('星港小助手：作品都在暖光的工作室里，欢迎靠港。');else openProject(hit.id);}
new Interaction({canvas:$('world'),camera,state,getObjects:()=>state.value===STATES.ROOM?room.hotspots:state.value===STATES.SPACE?(space.hotspots||[]):[],onSelect:select,onOrbit:(x,y)=>controller.lookDelta(x,y),onFlightStart:requestFlightControl,onLookStart:()=>{if(ready&&state.moving&&!director.transition&&$('catalog').hidden){if(flightPaused)pauseFlight(false);$('world').focus({preventScroll:true});}},onHover:(hit,e)=>{highlightExhibit(state.value===STATES.ROOM?hit?.id:null);if(state.moving&&controller.speed>.04)hit=null;const label=$('hotspot-label');label.hidden=!hit;if(hit){label.textContent=hit.id==='entrance'?'进入工作室':hit.id==='robot'?'和星港助手打个招呼':ProjectRegistry[hit.id]?.name||'查看作品';label.style.left=e.clientX+15+'px';label.style.top=e.clientY+12+'px';}}});
window.addEventListener('blur',releaseFlightPointer);
document.addEventListener('pointerover',e=>{if(e.target.closest?.('button,a,aside,#project-panel')){releaseFlightPointer();$('hotspot-label').hidden=true;if(!e.target.closest('[data-exhibit]'))highlightExhibit(null);}});
document.addEventListener('pointerdown',e=>{if(!$('catalog').hidden&&!e.target.closest?.('#catalog,#project-toggle'))setCatalog(false);});
document.addEventListener('pointerdown',e=>{if(e.target.closest?.('button,a,aside,#project-panel'))releaseFlightPointer();},true);
window.addEventListener('blur',()=>pauseFlight(true));
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseFlight(true);});
$('pause-flight').onclick=()=>pauseFlight(!flightPaused);
window.addEventListener('keydown',e=>{if(e.target.closest?.('input,textarea,select,[contenteditable]'))return;if(e.code==='KeyP'&&!e.repeat)pauseFlight(!flightPaused);if(e.code==='KeyH'&&!e.repeat)$('reset-view').click();});
const labels=[];
function highlightExhibit(id){room.setExhibitFocus(id,reducedMotion.matches);for(const {btn,h}of labels)btn.classList.toggle('is-active',h.id===id);}
$('hotspots').setAttribute('aria-label','房间展品');function buildLabels(){for(const h of room.hotspots){const btn=document.createElement('button');btn.className='hotspot';btn.dataset.exhibit=h.id;btn.textContent=ProjectRegistry[h.id]?.name||h.id;btn.addEventListener('pointerenter',()=>highlightExhibit(h.id));btn.addEventListener('pointerleave',()=>highlightExhibit(btn.matches(':focus-visible')?h.id:null));btn.addEventListener('focus',()=>highlightExhibit(h.id));btn.addEventListener('blur',()=>highlightExhibit(null));btn.addEventListener('click',()=>openProject(h.id));$('hotspots').append(btn);labels.push({btn,h});}}
function updateLabels(){
  const margin=24,top=105,bottom=innerHeight-148;
  const positioned=[];
  const projected=labels.map(label=>({...label,v:label.h.anchor.clone().project(camera)}));
  projected.sort((a,b)=>b.v.y-a.v.y);
  for(const {btn,h,v} of projected){
    // Keep the whole native exhibit Tab sequence while ROOM is reframed.
    // Hiding its next target makes Tab leave the page and triggers blur pause.
    btn.hidden=state.value!==STATES.ROOM||v.z>1||v.z<-1;
    if(btn.hidden)continue;
    const offset=AssetManifest.room.labelOffsets?.[h.id]||[0,0];
    const width=btn.offsetWidth,height=btn.offsetHeight;
    const x=THREE.MathUtils.clamp((v.x*.5+.5)*innerWidth+offset[0],margin+width/2,innerWidth-margin-width/2);
    const nominalY=THREE.MathUtils.clamp((-v.y*.5+.5)*innerHeight+offset[1],top+height/2,bottom-height/2);
    const step=height+9;
    let y=nominalY;
    // Keep the existing exhibit labels next to their projected objects; avoid
    // clipping and overlapping labels when the browser window is resized.
    for(const shift of [0,-1,1,-2,2,-3,3,-4,4]){
      const candidate=THREE.MathUtils.clamp(nominalY+shift*step,top+height/2,bottom-height/2);
      const overlaps=positioned.some(p=>Math.abs(x-p.x)<(width+p.width)/2+7&&Math.abs(candidate-p.y)<(height+p.height)/2+7);
      if(!overlaps){y=candidate;break;}
    }
    btn.style.left=x+'px';btn.style.top=y+'px';positioned.push({x,y,width,height});
  }
}
function updateFlightGuide(){
 const guide=$('flight-guide'),active=state.moving&&director.exploring;guide.hidden=!active;$('flight-reticle').hidden=!active;
 if(!active)return;const route=space.exploration,point=route.target,delta=new THREE.Vector3(...point.position).sub(character.group.position);
 const heading=Math.atan2(-delta.x,-delta.z),diff=THREE.MathUtils.euclideanModulo(heading-controller.yaw+Math.PI,Math.PI*2)-Math.PI;
 const arrow=Math.abs(diff)<.14?'↑':diff>0?'↖':'↗',vertical=delta.y>12?' · 向上':delta.y<-12?' · 向下':'';
 $('guide-target').textContent=route.complete?'一圈星海，欢迎归航':arrow+' '+point.name+' · '+Math.round(delta.length())+' m'+vertical;
 $('guide-progress').textContent=flightPaused?'飞行已暂停 · P 继续':(route.checkpoint+1)+' / 6 · 循云环游';
 $('flight-reticle').classList.toggle('needs-center',false);
 $('flight-reticle').classList.toggle('steering',document.pointerLockElement===$('world'));
}
function refreshUI(){
  const viewingProject=state.value===STATES.PROJECT;
  const inside=state.value===STATES.ROOM||viewingProject&&projectOrigin===STATES.ROOM;
  document.body.classList.toggle('room',inside);
  document.body.classList.toggle('project-reading',viewingProject);
  // Satellite projects also use PROJECT. Exploration copy and controls would
  // otherwise cover the satellite and the panel's return action.
  $('space-copy').hidden=inside||viewingProject||state.locked;
  $('entry').hidden=!state.moving;
  $('controls').hidden=!state.moving;
  $('project-toggle').disabled=state.locked||viewingProject;
  $('location').hidden=viewingProject;
  $('room-toolbar').hidden=!inside||viewingProject;
  $('location-text').textContent=inside?'工作室 · 作品展览':state.value===STATES.DOCKING?'正在靠港':state.value===STATES.TRANSITION?'正在穿过门廊':'星海 · 自由漫游';
  $('hotspot-label').hidden=true;
  highlightExhibit(null);
  document.querySelector('footer span:last-child').textContent=viewingProject?'03 / 项目详情':inside?'02 / 工作室':'01 / 星港漫游';
}
$('project-previous').onclick=()=>{
  const neighbours=getProjectNeighbours(ProjectRegistry,selectedProject);
  if(neighbours?.total>1)openProject(neighbours.previous,{keepBookFocus:true});
};
$('project-next').onclick=()=>{
  const neighbours=getProjectNeighbours(ProjectRegistry,selectedProject);
  if(neighbours?.total>1)openProject(neighbours.next,{keepBookFocus:true});
};
state.onChange(refreshUI);$('exit').onclick=leaveRoom;$('project-close').onclick=closeProject;$('project-back').onclick=closeProject;$('project-toggle').onclick=()=>{if(!state.locked){setCatalog($('catalog').hidden);if(!$('catalog').hidden)$('catalog-close').focus({preventScroll:true});}};$('catalog-close').onclick=()=>{setCatalog(false);$('project-toggle').focus({preventScroll:true});};$('sound').onclick=()=>{soundEnabled=!soundEnabled;$('sound').setAttribute('aria-pressed',String(soundEnabled));$('sound').textContent=soundEnabled?'音效开启':'音效关闭';sound(660);};$('reset-view').onclick=()=>{for(const t of timers)clearTimeout(t);timers.clear();director.transition=null;$('transition').classList.remove('cover');setCatalog(false);$('project-panel').hidden=true;selectedProject=null;
if(state.value==='DOCKING')state.set(STATES.TRANSITION);if(state.value==='ROOM')state.set(STATES.TRANSITION);state.set(STATES.SPACE);
space.setVisible(true);room.setVisible(true);space.building.setDoorOpen?.(false);character.setVisible(true);character.group.position.fromArray(AssetManifest.character.position);passage.reset();pauseFlight(false);controller.resetHeading();space.exploration.resetRoute();director.yaw=0;director.pitch=.38;director.snapToSpace(character.group.position);refreshUI();toast('已回到入口附近。');};document.querySelector('.brand').onclick=e=>{e.preventDefault();if(state.value===STATES.PROJECT)closeProject();};window.addEventListener('keydown',e=>{if(e.code==='Escape'){if(document.pointerLockElement)document.exitPointerLock();if(!$('catalog').hidden){setCatalog(false);$(state.value===STATES.PROJECT?'project-close':'project-toggle').focus({preventScroll:true});}else if(state.value===STATES.PROJECT)closeProject();else pauseFlight(true);}});
$('reset-view').addEventListener('click',()=>{projectRevision++;book.reset();projectFlightReturn=null;character.wake.clear();},true);
$('look-mode').onclick=()=>{if(document.pointerLockElement===$('world'))document.exitPointerLock();else requestFlightControl();};
let wasMouseCaptured=false;
document.addEventListener('pointerlockchange',()=>{
 const locked=document.pointerLockElement===$('world');
 $('look-mode').textContent=locked?'Esc 释放鼠标':'开始操控';$('look-mode').setAttribute('aria-pressed',String(locked));controller.clear();
 if(locked){if(state.moving)pauseFlight(false);else document.exitPointerLock();}
 else if(wasMouseCaptured&&state.moving)pauseFlight(true);
 wasMouseCaptured=locked;
});
document.addEventListener('pointerlockerror',()=>toast('鼠标捕获不可用：按住右键拖动转向，WASD 移动。'));
window.addEventListener('keydown',e=>{if(e.code==='Tab'&&document.pointerLockElement)document.exitPointerLock();});
state.onChange(()=>{if(!state.moving&&document.pointerLockElement)document.exitPointerLock();});
function buildCatalog(){buildPortfolioCatalog($('catalog-items'),ProjectRegistry,id=>openProject(id));}
window.addEventListener('resize',()=>{director.setViewport(innerWidth,innerHeight);renderer.setSize(innerWidth,innerHeight);if(state.value===STATES.PROJECT){const h=(projectOrigin===STATES.ROOM?room.hotspots:space.hotspots).find(h=>h.id===selectedProject);if(h?.camera){const c=projectCamera(h,selectedProject);director.moveTo(c.position,c.target,uiDuration(.35));}}else if(state.value===STATES.ROOM&&director.mode!=='INSPECT'){const c=roomOverview();director.moveTo(c.position,c.target,uiDuration(.35));}});
// Read-only observability and concrete navigation actions for local runtime verification.
window.starhaven={get passage(){return passage.telemetry;},get book(){return book.telemetry;},get state(){return state.value;},get player(){return character.group.position.toArray();},get velocity(){return controller.velocity.toArray();},get ready(){return ready;},get loading(){return {room:room.status,character:Boolean(character.model),error:room.error?.message};},get provisionalCharacter(){return character.provisional;},get currentProject(){return selectedProject;},get projectContent(){return projectContentStatus;},get keys(){return [...controller.keys];},get flight(){return {...controller.flight,inputMode:'relative-mouse',mouseCaptured:document.pointerLockElement===$('world'),normalizedSpeed:controller.speed,particles:character.particles.filter(p=>p.age<p.life).length,lean:character.modelRoot.rotation.x,yaw:controller.yaw,pitch:controller.pitch,forward:controller.forward.toArray(),thrust:controller.thrust,braking:controller.braking,paused:flightPaused,steering:controller.steer.toArray(),targetYaw:controller.targetYaw,targetPitch:controller.targetPitch,boundaryDistance:controller.boundaryDistance,pose:character.flightPose,wake:character.wake.telemetry,turnLean:character.turnLean,exhaust:character.exhaust?.telemetry};},get camera(){return camera.position.toArray();},get cameraProgress(){const t=director.transition;return {mode:director.mode,target:director.target.toArray(),transition:t?{elapsed:t.elapsed,duration:t.duration,progress:t.elapsed/t.duration}:null};},get anchors(){return AssetManifest.building.anchors;},get architecture(){return {cutaway:space.building.cutaway,roomVisible:room.group.visible,terraceVisible:space.building.persistentGroup.visible,rightWindow:AssetManifest.building.rightWindow,door:AssetManifest.building.door};},frameView:(name)=>{const view=AssetManifest.building.views[name];if(!view||state.locked)return false;controller.clear();director.setMode('INSPECT');const c=name==='externalFront'||name==='roomTerrace'?director.getFramedView(new THREE.Vector3(...view.position),new THREE.Vector3(...view.target),{kind:name==='externalFront'?'SPACE':'ROOM',player:character.group.position}):{position:new THREE.Vector3(...view.position),target:new THREE.Vector3(...view.target)};director.moveTo(c.position,c.target,.6);return true;},get manifest(){return AssetManifest;},get registry(){return ProjectRegistry;},frameCharacter:()=>{director.setMode('INSPECT');director.moveTo(character.group.position.clone().add(new THREE.Vector3(2.2,1.6,3.2)),character.group.position.clone().add(new THREE.Vector3(0,.9,0)),.6);},get framing(){return director.getTelemetry?.()||null;},get exhibitProjection(){return room.hotspots.map(h=>{const v=h.anchor.clone().project(camera);return {id:h.id,ndc:v.toArray(),screen:[(v.x*.5+.5)*innerWidth,(-v.y*.5+.5)*innerHeight]};});},get route(){return space.exploration.getTelemetry();},get vortex(){return space.vortex.getTelemetry();},get ambient(){return {paintFlow:space.paintFlow?.telemetry||null,flybys:space.flybys?.getState()||null,words:space.wordField?.telemetry||null};},get sky(){return space.backdrop.getTelemetry?.()||{loaded:space.backdrop.loaded};},get rendering(){return {pipeline:'direct',gpuWarmup,programs:renderer.info.programs.length,outputColorSpace:renderer.outputColorSpace,toneMapping:renderer.toneMapping,toneMappingExposure:renderer.toneMappingExposure,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries};},enterRoom,leaveRoom,openProject,closeProject,reset:()=>$('reset-view').click()};

// Inspection remains an explicit development surface, separate from the UI.
window.starhaven.inspect={
  wordParticles:()=>space.wordField?{...space.wordField.telemetry,positions:Array.from(space.wordField.positions),offsets:Array.from(space.wordField.offsets)}:null,
  planet:()=>space.planet.getTelemetry(),
  rivers:()=>space.rivers.getTelemetry(),
  collision:()=>collision?{...collision.telemetry(character.group.position),bounds:AssetManifest.space.bounds,state:state.value,skippedReason:state.moving?null:state.value}:null,
  runCollisionFixture:payload=>collision?.runFixture(payload),
  placeFlightFixture:({position,velocity=[0,0,0],yaw=0})=>{if(!ready||state.value!==STATES.SPACE||!Array.isArray(position)||position.length!==3||position.some((v,i)=>!Number.isFinite(v)||v<AssetManifest.space.bounds.min[i]||v>AssetManifest.space.bounds.max[i]))return false;controller.clear();character.group.position.fromArray(position);controller.velocity.fromArray(velocity);controller.resetHeading(yaw,0);return true;},
  characterBounds:()=>{const b=character.getBodyBounds();return {min:b.min.toArray(),max:b.max.toArray(),height:character.manifest.height,scope:'skinned source plus opaque backpack fittings; flame and wake excluded'};},
  characterSurface:()=>character.surfaceTelemetry||[],
  characterEnvelope:()=>{
    if(!character.model||!collision)return null;
    scene.updateMatrixWorld(true);
    const c=CollisionManifest.capsule,origin=character.group.position,startY=origin.y+c.footOffsetY+c.radius;
    const point=new THREE.Vector3();let maximum=0,vertices=0;
    for(const mesh of character.getSolidMeshes()){mesh.skeleton?.update();const count=mesh.geometry.attributes.position.count;for(let i=0;i<count;i++){mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);const closestY=THREE.MathUtils.clamp(point.y,startY,startY+c.segmentLength);maximum=Math.max(maximum,Math.hypot(point.x-origin.x,point.y-closestY,point.z-origin.z));vertices++;}}
    return {vertices,maximumDistanceToSegment:maximum,radius:c.radius,skin:c.skin,enclosed:maximum<=c.radius+c.skin,lean:character.modelRoot.rotation.x,forward:'+Z',scope:'skinned source and opaque fittings; flame/wake are not body collision geometry'};
  },
  roomEntities:()=>room.getTelemetry?.(),
  framePosition:({position,target,duration=.45})=>{if(!ready||state.locked)return false;controller.clear();director.setMode('INSPECT');director.moveTo(new THREE.Vector3(...position),new THREE.Vector3(...target),duration);return true;},
  setSpaceOrbit:({yaw=0,pitch=.38})=>{if(!ready||state.value!==STATES.SPACE)return false;controller.clear();director.yaw=yaw;director.pitch=pitch;controller.resetHeading(yaw);director.snapToSpace(character.group.position);return true;}
};
window.addEventListener('pagehide',event=>{if(!event.persisted){passage.dispose();controller.dispose();book.dispose();collision?.dispose();character.dispose();space.planet.dispose();space.rivers.dispose();space.exploration.dispose();space.disposeAmbient();}});

async function init(){projectContentStatus=await loadProjectContent();await Promise.all([room.load(),character.load(),space.load?.()]);collision=new SpaceCollision(CollisionManifest,{anchors:{sapphirePlanet:space.planet.group,vortexCore:space.vortex.coreAnchor,robot:space.robot,nearAsteroid:space.nearAsteroid,sideAsteroid:space.asteroids[1],rearAsteroid:space.asteroids[2],satelliteThreadcove:space.satellites.threadcove,satelliteClawtide:space.satellites.clawtide},doorOpen:()=>Boolean(space.building.doorTargetAngle)});controller.collision=collision;director.avoidance=new CameraAvoidance(()=>[...collision.cameraMeshes(),...space.paintFlow.getCameraMeshes()]);buildCatalog();buildLabels();character.setPresence(1);room.setVisible(true);director.snapToSpace(character.group.position);
  // Interior cutaway removes the exterior door light, giving Standard
  // materials a second light-count variant. Prepare both before any input;
  // restore the exterior even if compilation fails. Camera/state stay intact.
  const warmStart=performance.now(),warmPhases=[];
  try{
    space.setVisible(false);
    const began=performance.now();await renderer.compileAsync(scene,camera);
    // compileAsync prepares visible materials, but not the shadow render pass.
    // Prime that pass under the initial loading layer, using this renderer and
    // camera once; the first unobscured doorway reveal then reuses its programs.
    renderer.render(scene,camera);
    warmPhases.push({view:'ROOM',milliseconds:performance.now()-began,programs:renderer.info.programs.length,rendered:true});
  }finally{space.setVisible(true);}
  const outsideStart=performance.now();await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
  warmPhases.push({view:'SPACE',milliseconds:performance.now()-outsideStart,programs:renderer.info.programs.length,rendered:true});
  gpuWarmup={method:'compileAsync and initial shadow draws',milliseconds:performance.now()-warmStart,programs:renderer.info.programs.length,phases:warmPhases};
  controller.clear();ready=true;refreshUI();$('loading').style.opacity='0';later(()=>$('loading').hidden=true,650);}
init().catch(error=>{console.error(error);$('loading').querySelector('p').textContent='星港暂时未能加载';$('loading').querySelector('small').textContent=error.message;});
const clock=new THREE.Clock();let elapsed=0;function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.35);elapsed+=dt;if(ready){const steps=Math.max(1,Math.ceil(dt/.05));for(let i=0;i<steps;i++){controller.update(dt/steps,elapsed);passage.update(dt/steps);}if(state.moving&&controller.speed>.04)$('hotspot-label').hidden=true;const motion=passage.flight||{speed:controller.speed,velocity:controller.velocity,thrust:controller.thrust,braking:controller.braking,pitch:controller.pitch,yaw:controller.yaw};character.update(dt,elapsed,motion.speed,motion.velocity,motion);space.update(dt,elapsed,state.value===STATES.SPACE?character.group.position:null);space.exploration.update(dt,elapsed,state.moving?character.group.position:null,state.moving&&!flightPaused&&controller.speed>.015);updateFlightGuide();room.update(dt,elapsed);director.followHeading(character.group.rotation.y-Math.PI,controller.pitch,controller.active,controller.thrust>0||controller.speed>.015);director.update(dt,character.group.position);settlePendingRoomExit();space.building.updateView(camera);space.updateAmbient(dt,camera,{enabled:state.value===STATES.SPACE&&!director.transition&&!document.hidden,paused:flightPaused||!$('catalog').hidden,player:character.group.position,velocity:controller.velocity,viewportHeight:innerHeight,pixelRatio:renderer.getPixelRatio()});document.body.classList.toggle('exploring',state.moving&&director.exploring);updateLabels();if(state.value===STATES.SPACE){$('entry-hint').textContent=passage.armed?'对准暖光门廊，向前飞入':'向外飞离门廊，再重新靠近';}renderer.render(scene,camera);}}animate();



