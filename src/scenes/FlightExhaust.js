import * as THREE from 'three';
// Continuous bright nozzles/short flames; free particles supply only the wake.
export class FlightExhaust{
  constructor(parent,config={}){
    this.group=new THREE.Group();this.group.name='TwinBlueGoldBackpackJets';parent.add(this.group);
    this.power=0;this.jets=[];this.solidMeshes=[];
    const metal=new THREE.MeshStandardMaterial({color:'#536f80',metalness:.42,roughness:.43});
    for(const sign of [-1,1]){
      const nozzle=new THREE.Group();nozzle.position.set(sign*(config.nozzles?.spacing??.20),config.nozzles?.height??.08,config.nozzles?.depth??-.42);this.group.add(nozzle);
      const rim=new THREE.Mesh(new THREE.CylinderGeometry(.073,.082,.09,32,1,true),metal);rim.name='BackpackNozzleBarrel:'+sign;rim.rotation.x=Math.PI/2;nozzle.add(rim);this.solidMeshes.push(rim);
      const lip=new THREE.Mesh(new THREE.TorusGeometry(.061,.012,8,32),metal);lip.name='BackpackNozzleLip:'+sign;lip.position.z=-.048;nozzle.add(lip);this.solidMeshes.push(lip);
      const core=new THREE.Mesh(new THREE.SphereGeometry(.036,24,16),new THREE.MeshBasicMaterial({color:'#4098bd',toneMapped:false}));core.name='BackpackJetCore:'+sign;core.scale.z=.5;core.position.z=-.05;nozzle.add(core);this.solidMeshes.push(core);
      const geometry=new THREE.CylinderGeometry(.087,.003,1,20,8,true);geometry.translate(0,-.5,0);geometry.rotateX(Math.PI/2);
      const flame=new THREE.Mesh(geometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,
        uniforms:{power:{value:0},time:{value:0},presence:{value:1}},vertexShader:'varying vec2 uvFlame;varying vec3 flameWorld;varying vec3 flameNormal;void main(){uvFlame=uv;flameWorld=(modelMatrix*vec4(position,1.)).xyz;flameNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:'uniform float power;uniform float time;uniform float presence;varying vec2 uvFlame;varying vec3 flameWorld;varying vec3 flameNormal;void main(){float tail=1.-uvFlame.y;float ripple=.88+.12*sin(tail*28.-time*23.);vec3 c=mix(vec3(.04,.33,.92),vec3(1.,.58,.13),pow(uvFlame.y,6.));float edge=smoothstep(.015,.65,abs(dot(normalize(flameNormal),normalize(cameraPosition-flameWorld))));float a=pow(uvFlame.y,.65)*(.12+.48*power)*ripple*edge*presence;gl_FragColor=vec4(c*(.72+power*.35),a);}' }));
      flame.position.z=-.075;nozzle.add(flame);this.jets.push({nozzle,core,flame});
    }
  }
  setPresence(value){for(const jet of this.jets)jet.flame.material.uniforms.presence.value=value;}
  update(dt,time,thrust,braking,bodyLean=0,pitch=0){
    this.power=THREE.MathUtils.lerp(this.power,braking?0:thrust,1-Math.exp(-13*dt));
    for(const {nozzle,core,flame} of this.jets){
      // Keep the mount on the backpack while the outlet aims aft. The body's
      // Small body lean must not turn the exhaust into an upward plume.
      nozzle.rotation.x=-bodyLean-THREE.MathUtils.clamp(pitch,-.7,.7);
      core.scale.setScalar(.65+this.power*.5);core.scale.z*=.5;flame.scale.set(.7+this.power*.47,.7+this.power*.47,.08+this.power*.78);flame.material.uniforms.power.value=this.power;flame.material.uniforms.time.value=time;
    }
    this.telemetry={power:this.power,length:.08+this.power*.78,continuousNozzles:2,drivenBy:'thrust',bodyLean,nozzlePitch:this.jets[0].nozzle.rotation.x};
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;this.group.removeFromParent();
    const resources=new Set();this.group.traverse(object=>{if(object.geometry)resources.add(object.geometry);for(const material of [object.material].flat())if(material)resources.add(material);});
    for(const resource of resources)resource.dispose();this.jets.length=0;
  }
}
