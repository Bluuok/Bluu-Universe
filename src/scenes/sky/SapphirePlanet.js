import * as THREE from 'three';
import {PlanetManifest} from '../../config/PlanetManifest.js';
import {PlanetVertexShader,PlanetFragmentShader,AtmosphereVertexShader,AtmosphereFragmentShader,RingVertexShader,RingFragmentShader} from './SapphirePlanetShaders.js';

// Adapted visual components from the user's reference, under the existing
// scene/update/camera. The sphere is solid; atmosphere and dust ring are not.
export class SapphirePlanet {
  constructor({scene,manifest=PlanetManifest}) {
    this.config=manifest;this.elapsed=0;this.disposed=false;
    this.group=new THREE.Group();this.group.name=manifest.anchor;
    this.group.position.fromArray(manifest.position);scene.add(this.group);
    const p=manifest.palette,color=key=>({value:new THREE.Color(p[key])});
    const light={value:new THREE.Vector3(...manifest.lightDirection).normalize()};
    const time={value:0};this.timeUniform=time;
    this.surface=new THREE.Mesh(new THREE.SphereGeometry(manifest.radius,128,128),new THREE.ShaderMaterial({
      vertexShader:PlanetVertexShader,fragmentShader:PlanetFragmentShader,
      uniforms:{uTime:time,uLightDir:light,uDeepBlue:color('deepBlue'),uSapphireBlue:color('sapphireBlue'),
        uLightBlue:color('lightBlue'),uGoldCore:color('goldCore'),uGoldEdge:color('goldEdge'),uFresnelColor:color('fresnel'),
        uFlowSpeed:{value:manifest.flowSpeed},uSparkleIntensity:{value:1}},depthTest:true,depthWrite:true,
    }));
    this.surface.name='SapphirePlanetSurface';this.group.add(this.surface);
    this.atmosphere=new THREE.Mesh(new THREE.SphereGeometry(manifest.radius*1.038,96,96),new THREE.ShaderMaterial({
      vertexShader:AtmosphereVertexShader,fragmentShader:AtmosphereFragmentShader,
      uniforms:{uLightDir:light,uAtmosphereColor:color('atmosphere'),uSunHaloColor:color('sunHalo')},
      transparent:true,blending:THREE.AdditiveBlending,side:THREE.BackSide,depthWrite:false,depthTest:true,
    }));
    this.atmosphere.name='SapphireAtmosphere';this.group.add(this.atmosphere);
    const geometry=new THREE.RingGeometry(manifest.ring.innerRadius,manifest.ring.outerRadius,360,64);
    geometry.rotateX(-Math.PI/2);
    this.ring=new THREE.Mesh(geometry,new THREE.ShaderMaterial({vertexShader:RingVertexShader,fragmentShader:RingFragmentShader,
      uniforms:{uTime:time,uLightDir:light,uInnerRadius:{value:manifest.ring.innerRadius},uOuterRadius:{value:manifest.ring.outerRadius},
        uPlanetRadius:{value:manifest.radius},uPlanetCenter:{value:new THREE.Vector3(...manifest.position)},
        uRingColorCore:color('ringCore'),uRingColorEdge:color('ringEdge'),uRingColorIndigo:color('ringIndigo')},
      transparent:true,side:THREE.DoubleSide,depthWrite:false,depthTest:true,blending:THREE.NormalBlending,
    }));
    this.ring.name='PermeableSapphireDustRing';
    this.ring.rotation.set(...manifest.ring.tilt.map(THREE.MathUtils.degToRad));this.group.add(this.ring);
  }

  update(dt) {
    if(this.disposed)return;
    this.elapsed+=Number.isFinite(dt)?Math.max(0,dt):0;
    this.timeUniform.value=this.elapsed;
    this.surface.rotation.y=this.elapsed*this.config.rotationSpeed;
    this.ring.rotation.y=this.elapsed*this.config.ringRotationSpeed;
    this.group.getWorldPosition(this.ring.material.uniforms.uPlanetCenter.value);
  }

  getTelemetry() {
    this.group.updateWorldMatrix(true,true);
    const bounds=new THREE.Box3().setFromObject(this.group);
    return {id:this.config.id,anchor:this.config.anchor,worldFixed:true,cameraAttached:false,
      position:this.group.getWorldPosition(new THREE.Vector3()).toArray(),radius:this.config.radius,
      collisionRadius:this.config.collisionRadius,worldBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
      elapsed:this.elapsed,surfaceRotation:this.surface.rotation.y,ringRotation:this.ring.rotation.toArray(),
      ring:{innerRadius:this.config.ring.innerRadius,outerRadius:this.config.ring.outerRadius,collidable:false},
      atmosphereCollidable:false,source:'Extracted/adapted user sapphire_gold_planet.html shader components',
      output:'existing direct ACES/SRGB pipeline; no composer/bloom',disposed:this.disposed};
  }

  dispose() {
    if(this.disposed)return;
    this.disposed=true;this.group.removeFromParent();
    for(const mesh of [this.surface,this.atmosphere,this.ring]){mesh.geometry.dispose();mesh.material.dispose();}
  }
}
