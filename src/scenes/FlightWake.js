import * as THREE from 'three';
import {FlightEffects} from '../config/FlightEffects.js';

// A bounded world-space wake, with one draw call and no particle textures.
// Projecting the aft axis makes a glint shorten naturally when viewed end-on.
export class FlightWake {
  constructor(scene, capacity = FlightEffects.wake.capacity) {
    this.capacity=capacity;this.config=FlightEffects.wake;
    this.particles=Array.from({length:capacity},()=>({age:100,life:1,position:new THREE.Vector3(),velocity:new THREE.Vector3(),axis:new THREE.Vector3(),size:0,length:0}));
    this.positions=new Float32Array(capacity*3);this.colors=new Float32Array(capacity*3);
    this.axes=new Float32Array(capacity*3);this.sizes=new Float32Array(capacity);
    this.lengths=new Float32Array(capacity);this.alphas=new Float32Array(capacity);
    this.geometry=new THREE.BufferGeometry();
    for(const [name,array,size]of [['position',this.positions,3],['color',this.colors,3],['wakeAxis',this.axes,3],['wakeSize',this.sizes,1],['wakeLength',this.lengths,1],['wakeAlpha',this.alphas,1]])
      this.geometry.setAttribute(name,new THREE.BufferAttribute(array,size).setUsage(THREE.DynamicDrawUsage));
    const palette=['#32aeff','#62cdef','#62cdef','#ffcb53'];
    for(let i=0;i<capacity;i++)new THREE.Color(palette[i%4]).toArray(this.colors,i*3);
    this.material=new THREE.ShaderMaterial({transparent:true,depthTest:true,depthWrite:false,blending:THREE.NormalBlending,toneMapped:false,
      uniforms:{viewportHeight:{value:960},presence:{value:1}},
      vertexShader:`attribute vec3 color;attribute vec3 wakeAxis;attribute float wakeSize;attribute float wakeLength;attribute float wakeAlpha;
        uniform float viewportHeight;varying vec3 vColor;varying float vAlpha;varying vec2 vAxis;varying float vAspect;
        void main(){vec4 view=modelViewMatrix*vec4(position,1.);vec3 axis=mat3(modelViewMatrix)*wakeAxis;
          float projected=length(axis.xy);vAxis=projected>.001?vec2(axis.x,-axis.y)/projected:vec2(1.,0.);
          float extent=mix(wakeSize,wakeLength,clamp(projected,0.,1.));vAspect=max(1.,extent/max(.001,wakeSize));
          vColor=color;vAlpha=wakeAlpha;gl_Position=projectionMatrix*view;
          gl_PointSize=clamp(extent*viewportHeight*projectionMatrix[1][1]/max(1.,-2.*view.z),1.,24.);}`,
      fragmentShader:`uniform float presence;varying vec3 vColor;varying float vAlpha;varying vec2 vAxis;varying float vAspect;
        void main(){vec2 p=gl_PointCoord*2.-1.;float along=dot(p,vAxis);float across=dot(p,vec2(-vAxis.y,vAxis.x))*vAspect;
          float taper=mix(.45,1.,smoothstep(-.8,.5,along));float r=length(vec2(along,across/max(.2,taper)));
          float pigment=1.-smoothstep(.16,.95,r);float alpha=pigment*vAlpha*presence;
          if(alpha<.008)discard;gl_FragColor=vec4(vColor,alpha);
          #include <colorspace_fragment>
        }`});
    this.points=new THREE.Points(this.geometry,this.material);this.points.name='BlueGoldFlightWake';this.points.frustumCulled=false;scene.add(this.points);
    this.emit=0;this.cursor=0;this.power=0;this.direction=new THREE.Vector3();this.origin=new THREE.Vector3();this.outletBasis=new THREE.Matrix3();
    this.previousPosition=new THREE.Vector3();this.hasPrevious=false;this.outlets=[];
  }
  setPresence(value){this.material.uniforms.presence.value=THREE.MathUtils.clamp(value,0,1);if(value<=.001)this.clear();}
  update(dt,{thrust=0,braking=false,speed=0,velocity,turn=0,nozzles=[],visible=true,position}){
    if(!visible||this.material.uniforms.presence.value<=.001){this.clear();this.points.visible=false;return;}
    this.points.visible=true;
    if(position){if(this.hasPrevious&&position.distanceToSquared(this.previousPosition)>64)this.clear();this.previousPosition.copy(position);this.hasPrevious=true;}
    const step=THREE.MathUtils.clamp(dt,0,.06),cfg=this.config;
    this.power=THREE.MathUtils.lerp(this.power,braking?0:thrust,1-Math.exp(-(braking?24:thrust>0?11:16)*step));
    const rate=this.power>.015?cfg.rate*this.power*(1+Math.min(1,Math.abs(turn))*.13):0;
    // Cache both outlets even while idle. Births interpolate within this frame,
    // rather than all appearing at its final nozzle position.
    const outlets=nozzles.map((nozzle,index)=>{
      const current=new THREE.Vector3(0,0,-.10).applyMatrix4(nozzle.matrixWorld);
      return {current,previous:this.outlets[index]||current};
    });
    const accumulated=this.emit+step*rate,births=nozzles.length?Math.min(this.capacity,Math.floor(accumulated)):0;
    for(let birth=0;birth<births;birth++){
      const fraction=rate>0?THREE.MathUtils.clamp((1-this.emit+birth)/(step*rate),0,1):1;
      const i=this.cursor++%this.capacity,p=this.particles[i],j=i%nozzles.length,nozzle=nozzles[j];
      const age=(1-fraction)*step;
      p.age=-fraction*step;p.life=cfg.life+Math.random()*cfg.lifeSpread;p.size=cfg.width+Math.random()*cfg.widthSpread;p.length=cfg.length+Math.random()*cfg.lengthSpread;
      p.position.lerpVectors(outlets[j].previous,outlets[j].current,fraction);
      this.origin.set((Math.random()-.5)*.034,(Math.random()-.5)*.034,0).applyMatrix3(this.outletBasis.setFromMatrix4(nozzle.matrixWorld));
      p.position.add(this.origin);
      p.axis.set(0,0,-1).transformDirection(nozzle.matrixWorld);
      this.direction.set((Math.random()-.5)*.16,(Math.random()-.5)*.14,-1).transformDirection(nozzle.matrixWorld);
      p.velocity.copy(this.direction).multiplyScalar(2.1+this.power*1.0);if(velocity)p.velocity.addScaledVector(velocity,cfg.carry);
      // Existing particles advance a full frame; newborns advance only since birth.
      p.position.addScaledVector(p.velocity,age-step);
    }
    this.emit=nozzles.length?accumulated-births:0;
    this.outlets=outlets.map(o=>o.current);
    let alive=0,gold=0,maxSize=0;
    for(let i=0;i<this.capacity;i++){
      const p=this.particles[i];p.age+=step;
      if(braking||thrust<=0)p.age+=Math.min(step,Math.max(0,p.age))*(braking?1.5:.55);
      if(p.age>=p.life){this.alphas[i]=0;this.sizes[i]=0;this.lengths[i]=0;continue;}
      p.position.addScaledVector(p.velocity,step);p.position.toArray(this.positions,i*3);p.axis.toArray(this.axes,i*3);
      const progress=p.age/p.life;this.sizes[i]=p.size*(1-progress*.35);this.lengths[i]=p.length*(1-progress*.45);
      this.alphas[i]=cfg.opacity*Math.pow(1-progress,1.3)*Math.min(1,p.age/.035);
      alive++;if(i%4===3)gold++;maxSize=Math.max(maxSize,this.sizes[i]);
    }
    for(const name of ['position','wakeAxis','wakeSize','wakeLength','wakeAlpha'])this.geometry.attributes[name].needsUpdate=true;
    this.material.uniforms.viewportHeight.value=(globalThis.innerHeight||960)*Math.min(globalThis.devicePixelRatio||1,2);
    this.telemetry={capacity:this.capacity,alive,gold,blue:alive-gold,emissionRate:rate,maxSize,power:this.power,mode:braking?'brake':thrust>.05?'thrust':speed>.04?'glide':'float',drawCalls:1,blending:'normal-alpha',shape:'projected-tapered-glint'};
  }
  clear(){for(const p of this.particles)p.age=p.life;this.alphas.fill(0);this.sizes.fill(0);this.lengths.fill(0);this.emit=0;this.power=0;this.hasPrevious=false;this.outlets=[];if(this.telemetry)this.telemetry={...this.telemetry,alive:0,gold:0,blue:0,emissionRate:0,maxSize:0,power:0};for(const name of ['wakeAlpha','wakeSize','wakeLength'])this.geometry.attributes[name].needsUpdate=true;}
  dispose(){if(this.disposed)return;this.disposed=true;this.points.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
