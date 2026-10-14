import * as THREE from 'three';
import {FlightTuning} from '../config/FlightTuning.js';
import {FlightExhaust} from './FlightExhaust.js';
import {FlightWake} from './FlightWake.js';
import {smoothCharacterSeams,bevelCharacterBackpack} from './CharacterSurface.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
export class CharacterScene {
  constructor({scene,manifest,animationMap,multisampled=false}){
    this.presenceCoverage=multisampled;this.manifest=manifest;this.animationMap=animationMap;this.group=new THREE.Group();this.modelRoot=new THREE.Group();this.group.add(this.modelRoot);this.group.position.fromArray(manifest.position);scene.add(this.group);this.provisional=true;
    this.wake=new FlightWake(scene);this.particles=this.wake.particles;this.points=this.wake.points;

  }
  async load(){
    try{const r=await fetch('/assets/character/manifest.json');if(r.ok)Object.assign(this.manifest,await r.json());}catch(e){console.warn('Character manifest unavailable',e);}
    if(!this.manifest.url){this.placeholder();return;}
    const gltf=await new GLTFLoader().loadAsync(this.manifest.url);const model=gltf.scene;this.model=model;this.modelRoot.add(model);model.rotation.fromArray(this.manifest.rotation||[0,0,0]);
    // Model-specific mesh and bone names belong in the asset adapter, never the flight controller.
    const adaptation=this.manifest.adaptation||{};
    if(this.manifest.shapeScale)model.scale.fromArray(this.manifest.shapeScale);
    for(const [name,value] of Object.entries(adaptation.nodeScale||{})){model.getObjectByName(name)?.scale.multiply(new THREE.Vector3(...value));}
    for(const [name,value] of Object.entries(adaptation.nodeRotation||{})){const n=model.getObjectByName(name);if(n)n.rotation.set(...value);}
    this.mixer=new THREE.AnimationMixer(model);const clips=[...(gltf.animations||[])];
    // Authored source clips stay intact; a small external, configured float clip
    // animates the selected rig without playing a walk cycle in zero gravity.
    if(this.animationMap.generatedClipUrl){
      const response=await fetch(this.animationMap.generatedClipUrl);
      if(!response.ok)throw new Error('Float animation adapter failed to load');
      clips.push(THREE.AnimationClip.parse(await response.json()));
    }
    this.actions={};for(const key of ['idle','float','move','wave']){const name=this.animationMap[key]||this.manifest.animationMap?.[key]||this.manifest.animations?.[key];const clip=clips.find(c=>c.name===name);if(clip){this.actions[key]=this.mixer.clipAction(clip);this.actions[key].setEffectiveTimeScale(this.animationMap.speed??.6);}}this.currentAction=this.actions.float||this.actions.idle;if(this.currentAction){this.currentAction.play();this.mixer.update(0);}
    const shortening=this.manifest.adaptation?.legShortening;const body=shortening&&model.getObjectByName(shortening.bodyNode);this.poseBaseY=body?.position.y;this.bodyPositionAnimated=Boolean(this.currentAction?.getClip().tracks.some(track=>track.name===shortening?.bodyNode+'.position'));this.applyLegPose();model.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(model,true);let size=box.getSize(new THREE.Vector3());model.scale.multiplyScalar((this.manifest.height||1.65)/size.y);model.updateMatrixWorld(true);box.setFromObject(model,true);model.position.y-=box.min.y;const center=box.getCenter(new THREE.Vector3());model.position.x-=center.x;model.position.z-=center.z;
    model.traverse(node=>{if(!node.isMesh)return;node.castShadow=true;node.receiveShadow=true;if(this.manifest.smoothNormals){const smooth=node.geometry.clone();smooth.deleteAttribute('normal');node.geometry=mergeVertices(smooth,1e-7);node.geometry.computeVertexNormals();smooth.dispose();}const materials=Array.isArray(node.material)?node.material:[node.material];node.material=materials.map(original=>{const mat=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(mat,original);mat.defines={STANDARD:'',PHYSICAL:''};mat.flatShading=false;if('roughness'in mat){mat.roughness=.33;mat.metalness=.09;const override=this.manifest.meshMaterialMap?.[node.name]||this.manifest.materialMap?.[original.name];if(override){mat.vertexColors=false;mat.envMapIntensity=override.envMapIntensity??(original.name==='Grey'?.35:.5);if(override.clearcoat!==undefined)mat.clearcoat=override.clearcoat;if(override.clearcoatRoughness!==undefined)mat.clearcoatRoughness=override.clearcoatRoughness;if(override.color)mat.color.set(override.color);if(override.roughness!==undefined)mat.roughness=override.roughness;if(override.metalness!==undefined)mat.metalness=override.metalness;if(override.specularIntensity!==undefined)mat.specularIntensity=override.specularIntensity;if(override.emissive)mat.emissive.set(override.emissive);if(override.emissiveIntensity!==undefined)mat.emissiveIntensity=override.emissiveIntensity;
          if(override.albedoLift){
            // Keep the author's texture/patches; lift only neutral suit tones.
            mat.onBeforeCompile=shader=>{
              shader.uniforms.uSuitLift={value:override.albedoLift};
              shader.uniforms.uSuitCream={value:new THREE.Color(override.albedoTarget||'#f4eee1')};
              shader.fragmentShader='uniform float uSuitLift; uniform vec3 uSuitCream;\n'+shader.fragmentShader;
              shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
                float suitHi=max(max(diffuseColor.r,diffuseColor.g),diffuseColor.b);
                float suitLo=min(min(diffuseColor.r,diffuseColor.g),diffuseColor.b);
                float suitNeutral=1.0-smoothstep(.18,.40,(suitHi-suitLo)/max(suitHi,.001));
                float suitLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
                diffuseColor.rgb=mix(diffuseColor.rgb,uSuitCream,uSuitLift*suitNeutral*smoothstep(.045,.18,suitLuma));`);
            };
            mat.customProgramCacheKey=()=>`starhaven-suit-lift:${original.name}`;
          }
          }else if(mat.color){const light=mat.color.r*.2126+mat.color.g*.7152+mat.color.b*.0722;if(light<.14){mat.color.set('#072d4d');mat.metalness=.72;mat.roughness=.14;}else if(light>.66&&!mat.map){mat.color.set('#f7eddb');}}}return mat;});if(node.material.length===1)node.material=node.material[0];});
    this.provisional=Boolean(this.manifest.provisional);this.model=model;this.pivotHeight=.86;model.position.y-=this.pivotHeight;this.poseOffsets=[];
    this.surfaceTelemetry={bevel:bevelCharacterBackpack(model,this.modelRoot,this.manifest.surface?.backpackBevel),normals:[]};
    if(this.manifest.surface?.normalSeams)model.traverse(node=>{if(node.isMesh)this.surfaceTelemetry.normals.push({mesh:node.name,...smoothCharacterSeams(node.geometry,this.manifest.surface.normalSeams)});});
    this.exhaust=new FlightExhaust(this.modelRoot,this.manifest.backpack);
  }
  applyLegPose(){
    const adaptation=this.manifest.adaptation?.legShortening;if(!adaptation||!this.model)return;
    const body=this.model.getObjectByName(adaptation.bodyNode);const feet=adaptation.footNodes.map(name=>this.model.getObjectByName(name)).filter(Boolean);if(!body||!feet.length)return;
    const footY=feet.reduce((sum,foot)=>sum+foot.position.y,0)/feet.length;
    const animatedY=this.bodyPositionAnimated?body.position.y:this.poseBaseY;
    body.position.y=footY+adaptation.ratio*(animatedY-footY);
  }
  placeholder(){
    // Temporary docking proxy only. Replaced by a downloaded model before art acceptance.
    const m=new THREE.MeshStandardMaterial({color:'#f4ede0',roughness:.4});const body=new THREE.Mesh(new RoundedBoxGeometry(.65,.75,.42,4,.12),m);body.position.y=.6;this.modelRoot.add(body);const helmet=new THREE.Mesh(new THREE.SphereGeometry(.48,32,24),m);helmet.position.y=1.25;this.modelRoot.add(helmet);const visor=new THREE.Mesh(new THREE.SphereGeometry(.4,32,24),new THREE.MeshPhysicalMaterial({color:'#092e52',metalness:.7,roughness:.12}));visor.scale.set(1,.75,.35);visor.position.set(0,1.27,.37);this.modelRoot.add(visor);
  }
  update(dt,time,speed,velocity=null,flight={}){
    for(const {bone,axis,delta} of this.poseOffsets||[])bone.rotation[axis]-=delta;
    this.poseOffsets=[];this.mixer?.update(dt);this.applyLegPose();
    const thrust=flight.thrust||0,braking=Boolean(flight.braking);
    const yaw=flight.yaw??this.lastYaw??0;
    const turn=this.lastYaw===undefined?0:THREE.MathUtils.euclideanModulo(yaw-this.lastYaw+Math.PI,Math.PI*2)-Math.PI;
    const pose=FlightTuning.pose;
    this.lastYaw=yaw;this.turnLean=THREE.MathUtils.lerp(this.turnLean||0,THREE.MathUtils.clamp(turn/Math.max(dt,.001),-1.65,1.65),1-Math.exp(-pose.turnResponse*dt));
    this.modelRoot.rotation.z=-this.turnLean*pose.bank*Math.min(speed,1);
    this.flightPose=braking?'brake':thrust>.05?'thrust':speed>.04?'glide':'float';
    this.modelRoot.position.y=(this.pivotHeight||0)+Math.sin(time*1.6)*.04;
    const lean=(braking?pose.brakeLean:thrust*pose.thrustLean+(1-thrust)*Math.min(speed,1)*pose.coastLean)-MathUtilsPitch(flight.pitch)*.06;
    this.modelRoot.rotation.x=THREE.MathUtils.lerp(this.modelRoot.rotation.x,lean,1-Math.exp(-(thrust>0?pose.thrustResponse:pose.releaseResponse)*dt));
    const offset=(key,axis,delta)=>{const bone=this.model?.getObjectByName(this.animationMap.bones[key]);if(bone){bone.rotation[axis]+=delta;this.poseOffsets.push({bone,axis,delta});}};
    const blend=1-Math.exp(-7*dt);this.poseThrust=THREE.MathUtils.lerp(this.poseThrust||0,thrust,blend);this.poseBrake=THREE.MathUtils.lerp(this.poseBrake||0,braking?1:0,blend);
    offset('head','x',-this.poseThrust*pose.headCounterLean);
    offset('leftArm','z',this.poseBrake*.3-this.poseThrust*.14+this.turnLean*.025);offset('rightArm','z',-this.poseBrake*.3+this.poseThrust*.14+this.turnLean*.025);
    offset('leftForearm','x',this.poseBrake*.20-this.poseThrust*.18);offset('rightForearm','x',this.poseBrake*.20-this.poseThrust*.18);
    offset('leftLeg','x',this.poseThrust*.12-this.poseBrake*.12);offset('rightLeg','x',this.poseThrust*.12-this.poseBrake*.12);
    this.exhaust?.update(dt,time,thrust,braking,this.modelRoot.rotation.x,flight.pitch||0);this.group.updateWorldMatrix(true,true);
    this.wake.update(dt,{thrust,braking,speed,velocity,turn:this.turnLean,nozzles:this.exhaust?.jets.map(j=>j.nozzle)||[],visible:this.group.visible,position:this.group.position});
  }
  setVisible(v){this.group.visible=v;this.points.visible=v;if(!v)this.wake.clear();}
  // Coverage preserves opaque self-occlusion during the passage fade. Blending
  // every overlapping suit triangle exposed its internal faces at half alpha.
  setPresence(value){
    if(!this.model)return;
    if(!this.presenceMaterials){this.presenceMaterials=new Map();for(const object of this.getSolidMeshes())for(const material of [object.material].flat()){if(this.presenceMaterials.has(material))continue;this.presenceMaterials.set(material,{opacity:material.opacity,depthWrite:material.depthWrite});material.transparent=false;material.alphaToCoverage=this.presenceCoverage;material.alphaHash=!this.presenceCoverage;material.needsUpdate=true;}}
    const p=THREE.MathUtils.clamp(value,0,1);for(const [material,base] of this.presenceMaterials){material.opacity=base.opacity*p;material.depthWrite=base.depthWrite&&p>.001;}this.exhaust?.setPresence(p);this.wake.setPresence(p);
  }
  getSolidMeshes(){const meshes=[];this.model?.traverse(node=>{if(node.isMesh)meshes.push(node);});return meshes.concat(this.exhaust?.solidMeshes||[]);}
  getBodyBounds(){this.group.updateWorldMatrix(true,false);this.group.updateMatrixWorld(true);const bounds=new THREE.Box3();for(const mesh of this.getSolidMeshes())bounds.expandByObject(mesh,true);return bounds;}
  dispose(){
    if(this.disposed)return;this.disposed=true;
    this.wake.dispose();this.exhaust?.dispose();this.mixer?.stopAllAction();if(this.model)this.mixer?.uncacheRoot(this.model);
    this.group.removeFromParent();const resources=new Set();
    this.group.traverse(object=>{if(object.geometry)resources.add(object.geometry);if(object.skeleton)resources.add(object.skeleton);for(const material of [object.material].flat())if(material){resources.add(material);for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap'])if(material[key])resources.add(material[key]);}});
    for(const resource of resources)resource.dispose();this.presenceMaterials?.clear();
  }
}


function MathUtilsPitch(pitch){return THREE.MathUtils.clamp(pitch||0,-1.25,1.25);}
