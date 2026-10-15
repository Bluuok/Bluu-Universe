import * as THREE from 'three';
import {WordFieldManifest} from '../../config/WordFieldManifest.js';

function sampleWords(config){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  context.font='900 180px Arial, sans-serif';context.textAlign='center';context.textBaseline='middle';
  const widest=Math.max(...config.words.map(word=>context.measureText(word).width));
  const scale=config.width/widest;
  return config.words.map(word=>{
    context.clearRect(0,0,1024,256);context.fillStyle='#fff';context.fillText(word,512,132);
    const pixels=context.getImageData(0,0,1024,256).data,points=[];
    // Stable left-to-right ordering maps the same particles across every word.
    for(let x=1;x<1024;x++)for(let y=1;y<256;y++)if(pixels[(x+y*1024)*4+3]>150)points.push([x,y]);
    if(!points.length)throw new Error('Particle word has no font samples');
    const result=new Float32Array(config.count*3);
    for(let i=0;i<config.count;i++){
      const point=points[Math.floor((i+.5)*points.length/config.count)];
      result[i*3]=(point[0]-512+.45*Math.sin(i*12.9898))*scale;
      result[i*3+1]=(132-point[1]+.45*Math.cos(i*7.237))*scale;
      result[i*3+2]=Math.sin(i*2.39996)*config.depth;
    }
    return result;
  });
}

export class ParticleWords{
  constructor({scene,config=WordFieldManifest}){
    this.config=config;this.time=0;this.disposed=false;this.affected=0;this.maximum=0;this.interactionHold=0;this.presentationLift=0;
    this.targets=sampleWords(config);this.offsets=new Float32Array(config.count*3);this.velocities=new Float32Array(config.count*3);
    this.positions=new Float32Array(this.targets[0]);this.phase=0;this.wordIndex=0;
    this.preference=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    const colors=new Float32Array(config.count*3),sizes=new Float32Array(config.count);
    const blue=new THREE.Color(config.blue),gold=new THREE.Color(config.gold),color=new THREE.Color();
    for(let i=0;i<config.count;i++){
      color.copy(i%4===0?gold:blue).multiplyScalar(1.12);color.toArray(colors,i*3);
      sizes[i]=.85+.25*(.5+.5*Math.sin(i*1.718));
    }
    this.geometry=new THREE.BufferGeometry();
    this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));this.geometry.setAttribute('size',new THREE.BufferAttribute(sizes,1));
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,toneMapped:false,
      uniforms:{pixelScale:{value:1},pointSize:{value:config.particleSize},pixelLimit:{value:config.maxPixelSize},pixelRatio:{value:1},opacity:{value:1},player:{value:new THREE.Vector3(9999,9999,9999)}},
      vertexShader:`attribute vec3 color;attribute float size;varying vec3 ink;varying float alpha;uniform float pixelScale;uniform float pointSize;uniform float pixelLimit;uniform float pixelRatio;uniform float opacity;uniform vec3 player;
        void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;
          gl_PointSize=clamp(pointSize*size*pixelScale/max(.25,-p.z),1.1*pixelRatio,pixelLimit*pixelRatio);
          ink=color;alpha=opacity*smoothstep(.35,.9,distance(position,player))*smoothstep(.2,1.0,-p.z);}`,
      fragmentShader:`varying vec3 ink;varying float alpha;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float core=exp(-r*r*4.);float halo=.42*exp(-r*r*2.);gl_FragColor=vec4(ink,alpha*(core+halo)*(1.-smoothstep(.8,1.,r)));#include <colorspace_fragment>}`.replace(';#include',';\n#include'),
    });
    this.object=new THREE.Points(this.geometry,this.material);this.object.name='UniverseParticleWords';this.object.frustumCulled=false;
    this.object.position.fromArray(config.position);this.object.rotation.set(...config.rotation);scene.add(this.object);this.object.updateMatrixWorld(true);
    this.inverse=this.object.matrixWorld.clone().invert();this.inverseRotation=this.object.quaternion.clone().invert();
    this.localPlayer=new THREE.Vector3();this.localVelocity=new THREE.Vector3();this.normal=new THREE.Vector3(0,0,1).applyQuaternion(this.object.quaternion);this.view=new THREE.Vector3();
    this.cameraPosition=new THREE.Vector3();this.worldPosition=new THREE.Vector3();this.cameraRotation=new THREE.Quaternion();this.parentRotation=new THREE.Quaternion();
  }

  update(dt,camera,{enabled=true,paused=false,player,velocity,viewportHeight=960,pixelRatio=1}={}){
    if(this.disposed)return;
    const c=this.config,reduced=Boolean(this.preference?.matches);
    this.object.visible=Boolean(c.enabled&&enabled);
    if(!this.object.visible)return;
    dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.1));
    // Keep the cloud's world anchor and actual particle depth, but present its
    // glyphs upright to every orbit angle, including above and below. Refresh
    // the interaction transform as well so contact follows the visible cloud.
    camera.getWorldPosition(this.cameraPosition);camera.getWorldQuaternion(this.cameraRotation);
    if(this.object.parent){this.object.parent.getWorldQuaternion(this.parentRotation).invert();this.object.quaternion.multiplyQuaternions(this.parentRotation,this.cameraRotation);}
    else this.object.quaternion.copy(this.cameraRotation);
    this.object.updateWorldMatrix(true,false);this.object.getWorldPosition(this.worldPosition);
    this.inverse.copy(this.object.matrixWorld).invert();this.object.getWorldQuaternion(this.inverseRotation).invert();
    this.normal.set(0,0,1).applyQuaternion(this.cameraRotation);
    this.view.subVectors(this.cameraPosition,this.worldPosition);const distance=this.view.length();
    // Leave headroom above the pilot when aiming at the world anchor. Bound
    // the angular shift on approach rather than pushing nearby glyphs offscreen.
    const lift=Math.min(c.presentationLift??0,distance*(c.presentationLiftRatio??.18)),liftDelta=lift-this.presentationLift;
    this.presentationLift=lift;
    this.material.uniforms.opacity.value=1-THREE.MathUtils.smoothstep(distance,c.fadeDistance,c.visibleDistance);
    this.material.uniforms.pixelRatio.value=pixelRatio;this.material.uniforms.pixelScale.value=viewportHeight*pixelRatio*.5*camera.projectionMatrix.elements[5];
    if(player){this.localPlayer.copy(player);this.localPlayer.y+=1;this.localPlayer.applyMatrix4(this.inverse);}else this.localPlayer.set(9999,9999,9999);
    this.material.uniforms.player.value.copy(this.localPlayer);
    if(paused){
      if(liftDelta!==0){for(let k=1;k<this.positions.length;k+=3)this.positions[k]+=liftDelta;this.geometry.attributes.position.needsUpdate=true;}
      return;
    }
    const physics=c.interaction,duration=c.holdSeconds+c.morphSeconds;
    const approaching=Boolean(player)&&Math.abs(this.localPlayer.x)<c.width*.5+physics.radius&&Math.abs(this.localPlayer.y-lift)<8+physics.radius&&Math.abs(this.localPlayer.z)<physics.radius+physics.approachBuffer;
    this.interactionHold=approaching?physics.releaseDelay:Math.max(0,this.interactionHold-dt);
    if(!reduced){
      const elapsed=this.time%duration;
      // Complete an already-started morph, then keep the displayed word still
      // while the pilot approaches, touches it and leaves. Contact never drives
      // the word transform; only particles inside the local radius get force.
      if(this.interactionHold===0)this.time+=dt;
      else if(elapsed>=c.holdSeconds)this.time=Math.min(this.time+dt,(Math.floor(this.time/duration)+1)*duration);
    }
    const cycle=reduced?0:this.time%(duration*c.words.length);
    this.wordIndex=Math.floor(cycle/duration);const progress=Math.max(0,(cycle%duration-c.holdSeconds)/c.morphSeconds);
    this.phase=progress*progress*progress*(progress*(progress*6-15)+10);
    const from=this.targets[this.wordIndex],to=this.targets[(this.wordIndex+1)%this.targets.length],arc=Math.sin(Math.PI*this.phase);
    if(velocity)this.localVelocity.copy(velocity).applyQuaternion(this.inverseRotation);else this.localVelocity.set(0,0,0);
    const steps=Math.max(1,Math.ceil(dt/(1/90))),h=dt/steps;
    const nearField=Math.abs(this.localPlayer.x)<c.width*.5+physics.radius+physics.maxOffset&&Math.abs(this.localPlayer.y-lift)<8+physics.radius&&Math.abs(this.localPlayer.z)<physics.radius+physics.maxOffset+1;
    const integrate=!reduced&&(nearField||this.maximum>.00001);
    let affected=0,maximum=0;
    for(let i=0;i<c.count;i++){
      const k=i*3,seed=i*2.39996;
      const tx=THREE.MathUtils.lerp(from[k],to[k],this.phase)+(arc?arc*.45*Math.sin(seed):0);
      const ty=THREE.MathUtils.lerp(from[k+1],to[k+1],this.phase)+lift+(arc?arc*c.arcHeight*Math.sin(seed*.41):0);
      const tz=THREE.MathUtils.lerp(from[k+2],to[k+2],this.phase)+(arc?arc*.75*Math.cos(seed):0);
      if(reduced){this.offsets[k]=this.offsets[k+1]=this.offsets[k+2]=this.velocities[k]=this.velocities[k+1]=this.velocities[k+2]=0;}
      let touched=false;
      for(let step=0;step<steps&&integrate;step++){
        let dx=tx+this.offsets[k]-this.localPlayer.x,dy=ty+this.offsets[k+1]-this.localPlayer.y,dz=tz+this.offsets[k+2]-this.localPlayer.z;
        let length=Math.hypot(dx,dy,dz);const falloff=Math.max(0,1-length/physics.radius);
        if(length<.001){dx=Math.cos(seed);dy=Math.sin(seed);dz=.3;length=Math.hypot(dx,dy,dz);}
        if(falloff>0)touched=true;
        const push=physics.force*falloff*falloff/length;
        const fx=dx*push+this.localVelocity.x*physics.drag*falloff,fy=dy*push+this.localVelocity.y*physics.drag*falloff,fz=dz*push+this.localVelocity.z*physics.drag*falloff;
        for(let axis=0;axis<3;axis++){
          const j=k+axis;this.velocities[j]+=((axis===0?fx:axis===1?fy:fz)-this.offsets[j]*physics.spring-this.velocities[j]*physics.damping)*h;
          this.velocities[j]=THREE.MathUtils.clamp(this.velocities[j],-physics.maxSpeed,physics.maxSpeed);this.offsets[j]+=this.velocities[j]*h;
        }
        const displaced=Math.hypot(this.offsets[k],this.offsets[k+1],this.offsets[k+2]);
        if(displaced>physics.maxOffset){const ratio=physics.maxOffset/displaced;for(let axis=0;axis<3;axis++){this.offsets[k+axis]*=ratio;this.velocities[k+axis]*=.5;}}
      }
      if(touched)affected++;
      maximum=Math.max(maximum,Math.hypot(this.offsets[k],this.offsets[k+1],this.offsets[k+2]));
      this.positions[k]=tx+this.offsets[k];this.positions[k+1]=ty+this.offsets[k+1];this.positions[k+2]=tz+this.offsets[k+2];
    }
    this.affected=affected;this.maximum=maximum;this.geometry.attributes.position.needsUpdate=true;
  }
  get telemetry(){return {enabled:this.config.enabled,visible:this.object.visible,word:this.config.words[this.wordIndex],nextWord:this.config.words[(this.wordIndex+1)%this.config.words.length],morph:this.phase,time:this.time,count:this.config.count,affected:this.affected,holdingForInteraction:this.interactionHold>0,interactionRadius:this.config.interaction.radius,maxDisplacement:this.maximum,reducedMotion:Boolean(this.preference?.matches),position:[...this.config.position],rotation:this.object.rotation.toArray().slice(0,3),authoredRotation:[...this.config.rotation],presentation:'camera-facing-volume',presentationLift:this.presentationLift,opacity:this.material.uniforms.opacity.value,disposed:this.disposed};}
  dispose(){if(this.disposed)return;this.disposed=true;this.object.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
