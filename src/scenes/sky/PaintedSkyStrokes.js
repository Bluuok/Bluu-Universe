import * as THREE from 'three';
import {environmentSampling} from './SkyShaders.js';

const vertexShader = /* glsl */`
${environmentSampling}
uniform float radius;
attribute vec3 direction;
attribute vec2 brushSize;
attribute vec2 brushSeed;
varying vec2 vBrush;
varying vec2 vSeed;
varying vec3 vPaintDirection;
varying vec3 vStrokeColor;
void main() {
  vec3 n = normalize(direction);
  // Tangent charts are independent of latitude rows, including both poles.
  vec3 reference = abs(n.y) > .88 ? vec3(0.,0.,1.) : vec3(0.,1.,0.);
  vec3 x = normalize(cross(reference,n)), y = cross(n,x);
  vec3 weights = vec3(.2126,.7152,.0722);
  float gx = dot(sampleEnvironment(n+x*.012)-sampleEnvironment(n-x*.012),weights);
  float gy = dot(sampleEnvironment(n+y*.012)-sampleEnvironment(n-y*.012),weights);
  // Follow local painted contours with varied angles/lengths, avoiding ordered
  // rows of repeated dashes. Flat palette patches have independent directions.
  float quietFlow = .45+sin(dot(n,vec3(4.,2.,3.)))*.9;
  float flow = length(vec2(gx,gy)) > .00001 ? atan(gy,gx)+PI*.5 : quietFlow;
  float angle = length(vec2(gx,gy)) > .006 ? flow : quietFlow;
  angle += (brushSeed.y-.5)*.6;
  vec3 along = x*cos(angle)+y*sin(angle), across = -x*sin(angle)+y*cos(angle);
  vec3 curved = normalize(n*radius + along*position.x*brushSize.x + across*position.y*brushSize.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(curved*radius,1.);
  vBrush = position.xy*2.; vSeed = brushSeed;
  vPaintDirection = curved;
  vStrokeColor = sampleEnvironment(n)*intensity;
}`;

const fragmentShader = /* glsl */`
${environmentSampling}
varying vec2 vBrush;
varying vec2 vSeed;
varying vec3 vPaintDirection;
varying vec3 vStrokeColor;
void main() {
  vec2 p = vBrush;
  float bend = sin(p.x*3.1+vSeed.x*6.)*.13;
  float width = .80 + .08*sin(p.x*9.+vSeed.y*21.) + .06*sin(p.x*23.+vSeed.x*30.);
  float edge = length(vec2(p.x*.86,(p.y-bend)/width));
  float aa = max(fwidth(edge),.008);
  float coverage = 1.-smoothstep(1.-aa,1.+aa,edge);
  // Raised irregular bristles are evaluated at screen resolution. They are
  // new authored paint detail, never advertised as recovered image detail.
  float bristlePhase = (p.y-bend)*(14.+vSeed.x*13.)+sin(p.x*(4.+vSeed.y*3.)+vSeed.x*20.)*.8;
  float bristle = sin(bristlePhase);
  // Fade frequencies beyond the pixel footprint during orbit/resize. Varying
  // bristle spacing and restrained relief prevent bright repeated hatching.
  float resolved = 1.-smoothstep(1.1,3.,fwidth(bristlePhase));
  float ridge = (max(0.,bristle)*.06-max(0.,-bristle)*.04)*resolved;
  float ends = 1.-smoothstep(.7,1.,abs(p.x));
  float alpha = coverage * (.58+vSeed.y*.24) * (.83+ends*.17);
  if(alpha<.008) discard;
  vec3 color = mix(sampleEnvironment(vPaintDirection)*intensity,vStrokeColor,.7);
  gl_FragColor = vec4(color*(.96+vSeed.x*.08+ridge),alpha);
  #include <colorspace_fragment>
}`;

/** Distant, fixed-world surface detail, distinct from reachable scenery and
 * existing volumetric dust. One instanced draw; no camera or animation loop. */
export function createPaintedSkyStrokes(config, panorama) {
  const count = config.coarse + config.fine;
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],3));
  geometry.setIndex([0,1,2,0,2,3]);
  const directions = new Float32Array(count*3), sizes = new Float32Array(count*2), seeds = new Float32Array(count*2);
  let seed = config.seed >>> 0;
  const random = () => {seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<count;i++) {
    const y=random()*2-1, angle=random()*Math.PI*2, horizontal=Math.sqrt(1-y*y);
    directions.set([horizontal*Math.cos(angle),y,horizontal*Math.sin(angle)],i*3);
    const range=i<config.coarse?config.coarseSize:config.fineSize;
    sizes.set([THREE.MathUtils.lerp(range[0],range[1],random()),THREE.MathUtils.lerp(range[2],range[3],random())],i*2);
    seeds.set([random(),random()],i*2);
  }
  geometry.setAttribute('direction',new THREE.InstancedBufferAttribute(directions,3));
  geometry.setAttribute('brushSize',new THREE.InstancedBufferAttribute(sizes,2));
  geometry.setAttribute('brushSeed',new THREE.InstancedBufferAttribute(seeds,2));
  geometry.instanceCount=count;
  geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),config.radius+30);
  const material=new THREE.ShaderMaterial({uniforms:{panorama:{value:null},intensity:{value:panorama.intensity},longitude:{value:panorama.longitude},radius:{value:config.radius}},vertexShader,fragmentShader,
    side:THREE.DoubleSide,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,fog:false});
  const object=new THREE.Mesh(geometry,material);
  object.name='DistantNativeOilBrushwork';object.renderOrder=-39;object.frustumCulled=false;object.visible=false;
  return object;
}
