import * as THREE from 'three';

// A bounded, world-space wake. One draw call, no per-particle textures or
// lights. Normal alpha blending keeps the blue/gold pigments from adding white.
export class FlightWake {
  constructor(scene, capacity = 160) {
    this.capacity = capacity;
    this.particles = Array.from({length:capacity}, () => ({age:100,life:1,position:new THREE.Vector3(),velocity:new THREE.Vector3(),size:0}));
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.sizes = new Float32Array(capacity);
    this.alphas = new Float32Array(capacity);
    this.geometry = new THREE.BufferGeometry();
    for (const [name,array,size] of [['position',this.positions,3],['color',this.colors,3],['wakeSize',this.sizes,1],['wakeAlpha',this.alphas,1]])
      this.geometry.setAttribute(name,new THREE.BufferAttribute(array,size).setUsage(THREE.DynamicDrawUsage));
    const palette = ['#32aeff','#62cdef','#ffcb53'];
    for(let i=0;i<capacity;i++) new THREE.Color(palette[i%3]).toArray(this.colors,i*3);
    this.material = new THREE.ShaderMaterial({
      transparent:true,depthTest:true,depthWrite:false,blending:THREE.NormalBlending,toneMapped:false,
      uniforms:{viewportHeight:{value:960}},
      vertexShader:`attribute vec3 color; attribute float wakeSize; attribute float wakeAlpha;
        uniform float viewportHeight; varying vec3 vColor; varying float vAlpha;
        void main(){vec4 view=modelViewMatrix*vec4(position,1.);vColor=color;vAlpha=wakeAlpha;
          gl_Position=projectionMatrix*view;
          gl_PointSize=clamp(wakeSize*viewportHeight*projectionMatrix[1][1]/max(1.,-2.*view.z),1.,36.);}`,
      fragmentShader:`varying vec3 vColor; varying float vAlpha;
        void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p*vec2(1.,1.16));
          float body=1.-smoothstep(.34,.88,r);float core=1.-smoothstep(.06,.42,r);
          float alpha=(body*.85+core*.15)*vAlpha;if(alpha<.008)discard;
          gl_FragColor=vec4(vColor*(.91+.09*core),alpha);
          #include <colorspace_fragment>
        }`,
    });
    this.points = new THREE.Points(this.geometry,this.material);
    this.points.name='BlueGoldFlightWake';this.points.frustumCulled=false;scene.add(this.points);
    this.emit=0;this.cursor=0;this.power=0;this.direction=new THREE.Vector3();
    this.previousPosition=new THREE.Vector3();this.hasPrevious=false;
  }

  update(dt, {thrust=0,braking=false,speed=0,velocity,turn=0,nozzles=[],visible=true,position}) {
    if (!visible) { this.clear(); this.points.visible=false; return; }
    this.points.visible=true;
    if(position){
      if(this.hasPrevious&&position.distanceToSquared(this.previousPosition)>64)this.clear();
      this.previousPosition.copy(position);this.hasPrevious=true;
    }
    const step=Math.min(Math.max(dt,0),.06);
    this.power=THREE.MathUtils.lerp(this.power,braking?0:thrust,1-Math.exp(-(braking?24:thrust>0?11:16)*step));
    const rate=this.power>.015 ? 48*this.power*(1+Math.min(1,Math.abs(turn))*.13) : 0;
    this.emit=Math.min(this.emit+step*rate,this.capacity);
    while(this.emit>=1&&nozzles.length){
      this.emit--;
      const i=this.cursor++%this.capacity,p=this.particles[i],nozzle=nozzles[i%nozzles.length];
      p.age=0;p.life=.30+Math.random()*.18;p.size=(i%3===2?.055:.065)+Math.random()*.025;
      p.position.set((Math.random()-.5)*.065,(Math.random()-.5)*.06,-.18).applyMatrix4(nozzle.matrixWorld);
      this.direction.set((Math.random()-.5)*.26,(Math.random()-.5)*.20,-1).transformDirection(nozzle.matrixWorld);
      p.velocity.copy(this.direction).multiplyScalar(2.4+this.power*1.0);
      if(velocity)p.velocity.addScaledVector(velocity,.42);
    }
    let alive=0,gold=0,maxSize=0;
    for(let i=0;i<this.capacity;i++){
      const p=this.particles[i];p.age+=step*(braking?2.1:thrust>0?1:1.55);
      if(p.age>=p.life){this.alphas[i]=0;this.sizes[i]=0;continue;}
      p.position.addScaledVector(p.velocity,step);p.position.toArray(this.positions,i*3);
      const progress=p.age/p.life;
      // Slightly open out in the wake, with a short quiet tail on release.
      this.sizes[i]=p.size*(.72+Math.sin(progress*Math.PI)*.4);
      this.alphas[i]=Math.pow(1-progress,1.1)*Math.min(1,p.age/.035);
      alive++;if(i%3===2)gold++;maxSize=Math.max(maxSize,this.sizes[i]);
    }
    for(const name of ['position','wakeSize','wakeAlpha'])this.geometry.attributes[name].needsUpdate=true;
    this.material.uniforms.viewportHeight.value=(globalThis.innerHeight||960)*Math.min(globalThis.devicePixelRatio||1,2);
    this.telemetry={capacity:this.capacity,alive,gold,blue:alive-gold,emissionRate:rate,maxSize,power:this.power,mode:braking?'brake':thrust>.05?'thrust':speed>.04?'glide':'float',drawCalls:1,blending:'normal-alpha'};
  }
  clear(){for(const p of this.particles)p.age=p.life;this.alphas.fill(0);this.sizes.fill(0);this.emit=0;this.power=0;this.geometry.attributes.wakeAlpha.needsUpdate=true;}
  dispose(){if(this.disposed)return;this.disposed=true;this.points.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
