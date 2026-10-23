import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3,Box3} from 'three';
import {CameraDirector} from '../src/core/CameraDirector.js';
import {CameraAvoidance} from '../src/core/CameraAvoidance.js';
import {SpaceCollision} from '../src/core/SpaceCollision.js';
import {CollisionManifest} from '../src/config/CollisionManifest.js';
import {ViewFraming} from '../src/config/ViewFraming.js';

// Projection and static studio avoidance only. No dynamic props, renderer,
// browser input or art acceptance; live routes must still validate the result.
const world=new SpaceCollision({...CollisionManifest,dynamic:[]}),rows=[];
const make=(width,height,baseline=false)=>{
  const camera=new PerspectiveCamera(43,width/height,.1,3000);
  const director=new CameraDirector(camera,{framing:{flight:{...ViewFraming.flight,...(baseline?{studioDistance:8.5}:{})}}});
  director.setViewport(width,height);return director;
};
const settle=(director,player,yaw)=>{
  director.resumeFlightView(player,yaw,0);
  for(let i=0;i<480;i++){director.followHeading(yaw,0,true);director.update(1/60,player);}
};
const studio=new Box3(new Vector3(...ViewFraming.spaceBounds.min),new Vector3(...ViewFraming.spaceBounds.max));
try{
  for(const viewport of [[1440,960],[1280,720],[1000,900]])for(const[name,values,yaw]of [
    ['left wall',[-6.356590200653077,3.0678836875190685,.10783948811625912],-Math.PI/2],
    ['back wall',[-.21200160485509614,1.9175564036342758,-5.946390081634522],Math.PI],
    ['front glazing',[-2,3.5,5.6979],0],['right glazing',[5.2883,3,-.74205],Math.PI/2],
  ]){
    const player=new Vector3(...values),before=make(...viewport,true),after=make(...viewport);
    after.avoidance=new CameraAvoidance(()=>world.cameraMeshes());
    settle(before,player,yaw);settle(after,player,yaw);
    const previous=before._projectBounds(studio),next=after._projectBounds(studio),telemetry=after.getTelemetry(),rect=telemetry.safeRect,body=telemetry.playerBounds;
    assert.deepEqual(player.toArray(),values,'Camera moved the body');
    assert.equal(world.solveCount,0,'Camera queries must not solve body contacts');
    assert(telemetry.avoidance.lineOfSightClear,'Static studio blocks the body sightlines');
    assert(body.left>=rect.left-.5&&body.right<=rect.right+.5&&body.top>=rect.top-.5&&body.bottom<=rect.bottom+.5);
    assert(body.bottom-body.top>120,'Avatar becomes too small');
    assert(next.bottom-next.top<previous.bottom-previous.top,'Studio projection did not shrink');
    assert(next.right-next.left<viewport[0]*.92,'Studio still spans almost the whole desktop width');
    assert(next.bottom-next.top<viewport[1]*.85,'Studio still spans almost the whole desktop height');
    rows.push({name,viewport,oldDistance:before.distance,newDistance:after.distance,studioWidthRatio:(next.right-next.left)/viewport[0],studioHeightRatio:(next.bottom-next.top)/viewport[1],avatarBoundsHeight:body.bottom-body.top,staticSightlinesClear:true});
  }
  const player=new Vector3(30,5,30),director=make(1440,960),baseline=make(1440,960,true);
  settle(director,player,0);settle(baseline,player,0);
  assert(director.camera.position.distanceTo(baseline.camera.position)<1e-9,'Distant follow changed');
  for(let i=0;i<=36;i++){
    const yaw=i*Math.PI/18;director.followHeading(yaw,0,true);director.update(1/60,player);
    const expected=new Vector3(Math.sin(yaw),0,Math.cos(yaw)),actual=director.camera.position.clone().sub(director.target).normalize();
    assert(actual.dot(expected)>.999,'Distance framing added heading lag');
  }
  const near=new Vector3(-.212,1.918,-5.9464),old=director._flightDistance;
  director.followHeading(Math.PI,0,true);director.update(1/60,near);
  assert(director._flightDistance>old&&director._flightDistance-old<.5,'Context distance jumps rather than settling');
  const away=make(1440,960);settle(away,near,0);
  assert(Math.abs(away.distance-ViewFraming.flight.distance)<1e-6,'Looking away still pulls back');
  const overview=make(1440,960),oldOverview=make(1440,960,true),spawn=new Vector3(-5.5,2,8.5);
  overview.snapToSpace(spawn);oldOverview.snapToSpace(spawn);
  for(let i=0;i<120;i++){overview.update(1/60,spawn);oldOverview.update(1/60,spawn);}
  assert(overview.camera.position.distanceTo(oldOverview.camera.position)<1e-9,'Overview changed');
  const returned=overview.getFlightReturnView(spawn,Math.PI,0),oldReturned=oldOverview.getFlightReturnView(spawn,Math.PI,0);
  assert(returned.position.distanceTo(oldReturned.position)<1e-9,'Authored doorway return changed');
  overview.setMode('ROOM');assert.equal(overview.getTelemetry().flightFollow,null);
  console.log(JSON.stringify({status:'passed',browserStarted:false,method:'Actual director/static BVH; no dynamic-prop, GPU or real-input acceptance',cases:rows.length,bodySolveCount:world.solveCount,rows,farAndOverviewUnchanged:true,fullTurnImmediate:true,distanceSettles:true,doorwayReturnUnchanged:true}));
}finally{world.dispose();}
