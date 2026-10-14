import * as THREE from 'three';
import {ExplorationRoute,ExplorationRocks,ExplorationClouds,expandExplorationPosition,ExplorationTuning} from '../../config/ExplorationManifest.js';
import {sweptBody} from './VortexField.js';
import {makePaintedCloudVolume} from './PaintedCloudVolume.js';
import {createRockGeometry,makeRockBumpTexture,seatRockCrystal} from './RockSurface.js';
// Paint detail is integrated into the sampled cloud banks; no separate floating
// accent meshes compete with their continuous silhouettes.

export class ExplorationField{
 constructor({scene,brushAtlas,rockSurface=ExplorationTuning.rockSurface}){
  this.group=new THREE.Group();this.group.name='ExplorableCloudCircuit';scene.add(this.group);this.clouds=[];this.brushes=[];this.rocks=[];this.checkpoint=0;this.elapsed=0;this.started=false;this.complete=false;this.closest=Infinity;
  this.rockSurfaceEnabled=Boolean(rockSurface.enabled);this.rockBump=this.rockSurfaceEnabled?makeRockBumpTexture():null;
  const stone=new THREE.MeshStandardMaterial({color:'#325f79',roughness:.86,metalness:.16,bumpMap:this.rockBump,bumpScale:.065});
  const gold=new THREE.MeshStandardMaterial({color:'#c7a15c',roughness:.4,metalness:.55,emissive:'#503713',emissiveIntensity:.24});
  const blue=new THREE.MeshStandardMaterial({color:'#9ed5df',roughness:.22,metalness:.30,emissive:'#398eb6',emissiveIntensity:.45});
  for(const [i,c] of ExplorationRocks.entries()){
   const g=createRockGeometry(i+1,this.rockSurfaceEnabled);
   const rock=new THREE.Mesh(g,stone);rock.position.fromArray(c.p);rock.scale.fromArray(c.s);rock.name='CircuitRock:'+c.id;this.group.add(rock);this.rocks.push(rock);
   if(i%2===0){for(let j=0;j<3;j++){const crystal=new THREE.Mesh(new THREE.ConeGeometry(.45+j*.15,2+j,5),j===1?blue:gold);crystal.position.set(c.p[0]+(j-1)*1.5,c.p[1]+c.s[1]+.6,c.p[2]);crystal.rotation.z=(j-1)*.17;if(this.rockSurfaceEnabled)seatRockCrystal(rock,crystal);this.group.add(crystal);}}
  }
  // Three nested, inclined arcs distinguish the high crown from the reef/sail.
  const crown=new THREE.Group();crown.position.fromArray(expandExplorationPosition([-132,73,-151]));crown.rotation.set(.3,.7,0);this.group.add(crown);
  for(let i=0;i<3;i++){const arc=new THREE.Mesh(new THREE.TorusGeometry(7+i*1.1,.065,8,96,Math.PI*1.55),gold);arc.rotation.set(-.10+i*.12,-.12+i*.11,.23+i*.14);crown.add(arc);}
  for(const [i,c] of ExplorationClouds.entries()){
   const profile={windField:true,windPhase:i*.53,clearRadius:c.id==='crown-flow'?3.1:c.link?2.5:1.6,density:c.link?.48:.59,erosion:.24,breakup:.30,width:[.16,c.width+(c.link?2.7:0)],depth:[.18,c.depth*1.2+(c.link?2.2:0)],color:i%2?'#255d87':'#326f94',crest:'#73a8ba',paintLight:'#c6a665',bulges:[{at:.3,spread:.16,width:1.3,depth:1.2},{at:.72,spread:.13,width:.8,depth:.8}]};
   const {geometry,curve}=sweptBody(c.points.map(p=>new THREE.Vector3(...p)),profile,{curveSegments:144,crossSegments:24},profile);
   const volume=makePaintedCloudVolume({geometry,curve,curveSegments:144,crossSegments:24,profile,brushAtlas});geometry.dispose();
   volume.name='CircuitCloud:'+c.id;volume.position.fromArray(c.p);volume.renderOrder=-2;this.group.add(volume);this.clouds.push(volume);
  }
  const beaconGeometry=new THREE.OctahedronGeometry(.6,0);
  this.beacons=ExplorationRoute.slice(0,-1).map((point,i)=>{const marker=new THREE.Group();marker.position.fromArray(point.position);const gem=new THREE.Mesh(beaconGeometry,blue);gem.position.y=7;marker.add(gem);this.group.add(marker);return marker;});
 }
 setPigmentTexture(texture){for(const mesh of this.clouds){mesh.material.userData.paintUniforms.oilPaintMap.value=texture;mesh.material.userData.paintUniforms.oilPaintLoaded.value=texture?1:0;}}
 update(dt,time,player,active){
  for(const mesh of this.brushes){const u=mesh.material.uniforms;u.time.value=time;u.focusActive.value=player?1:0;if(player)u.focus.value.copy(player).add(new THREE.Vector3(0,1,0));}
  for(const mesh of this.clouds){const u=mesh.material.userData.paintUniforms;u.cloudTime.value=time;u.oilFocusActive.value=player?1:0;if(player)u.oilFocus.value.copy(player).add(new THREE.Vector3(0,1,0));}
  for(let i=0;i<this.beacons.length;i++)this.beacons[i].children[0].rotation.y=time*.18+i;
  if(!player)return;
  if(active)this.started=true;if(this.started&&!this.complete&&active)this.elapsed+=dt;
  const point=ExplorationRoute[this.checkpoint],distance=player.distanceTo(new THREE.Vector3(...point.position));this.closest=distance;
  if(this.started&&!this.complete&&distance<point.radius){if(this.checkpoint<ExplorationRoute.length-1)this.checkpoint++;else this.complete=true;}
 }
 resetRoute(){this.checkpoint=0;this.elapsed=0;this.started=false;this.complete=false;}
 get target(){return ExplorationRoute[this.checkpoint];}
 getTelemetry(){return {checkpoint:this.checkpoint,target:this.target,elapsed:this.elapsed,complete:this.complete,distance:this.closest,landmarks:ExplorationRoute,rocks:this.rocks.length,clouds:this.clouds.length,raisedBrushStrips:0,roundedPaintLobes:0,expansion:ExplorationTuning.expansion,rockSurface:this.rockSurfaceEnabled};}
 dispose(){if(this.disposed)return;this.disposed=true;const geometries=new Set(),materials=new Set();this.group.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);});for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();this.rockBump?.dispose();this.group.removeFromParent();}
}
