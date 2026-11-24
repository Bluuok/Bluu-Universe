import * as THREE from 'three';
import {environmentSampling} from './SkyShaders.js';

// World landmarks at different distances. Their silhouettes converge from
// the porch; the strands deliberately separate again when the player strafes.
const spine = new THREE.CatmullRomCurve3([
  [-136,-15,-101], [-104,-6,-92], [-68,-9,-66], [-42,1,-52],
  [-34,4,-45], [-30,2,-49], [-24,-3,-62], [-17,-6,-89],
].map(p => new THREE.Vector3(...p)));
const porch = new THREE.Vector3(6.337,12.857,29.667);
const cobalt = new THREE.Color('#4164a6'), turquoise = new THREE.Color('#6aaebd');
const ochre = new THREE.Color('#c6a269');

// An eight-segment blade with a raised centre and a darker underside.
// A continuous geometric taper keeps its silhouette antialiased by MSAA.
export function createStarTide({far, radius, centre, seed, skyUniforms}) {
  const origin = new THREE.Vector3(...centre);
  const centres = [], lengths = [], widths = [], colours = [], styles = [];
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state,1664525)+1013904223)>>>0; return state/4294967296; };
  const positionAt = (t, distanceScale) => {
    const ray = spine.getPointAt(THREE.MathUtils.clamp(t,0,1)).sub(porch);
    if (far) ray.setLength(radius*.987);
    else ray.multiplyScalar(distanceScale);
    return ray.add(porch).sub(origin);
  };
  function stroke(t, distanceScale, lateral, lift, length, width, bend, dry, warm, loose=false) {
    const point = positionAt(t,distanceScale);
    const along = positionAt(t+.001,distanceScale).sub(positionAt(t-.001,distanceScale)).normalize();
    const sight = point.clone().sub(porch).add(origin).normalize();
    const across = new THREE.Vector3().crossVectors(along,sight).normalize();
    const scale = far ? point.length()/spine.getPointAt(t).distanceTo(porch) : distanceScale;
    point.addScaledVector(across,lateral*scale).addScaledVector(sight,lift*scale);
    const colour = cobalt.clone().lerp(turquoise,random()*.38+.40*(1-dry)).lerp(ochre,warm);
    centres.push(...point.toArray());
    lengths.push(...along.multiplyScalar(length*scale*.5).toArray());
    widths.push(...across.multiplyScalar(width*scale*.5).toArray());
    colours.push(...colour.toArray());
    styles.push(bend,dry,loose ? -1 : t,random());
  }
  const clusters = far ? 24 : 34;
  for (let i=0;i<clusters;i++) {
    const t = .02+.96*(i+.35*random())/clusters;
    const turn = Math.exp(-((t-.70)**2)/.009);
    const pressure = (.5+turn*.75)*(1-.68*THREE.MathUtils.smoothstep(t,.73,1));
    const distanceScale = far ? 1 : [.88,1.32,1.75][i%3];
    const lane = (far ? 3 : .8)+Math.sin(t*13)*1.2+(random()-.5)*1.6;
    const count = far ? 5 : 19;
    for (let j=0;j<count;j++) {
      const leader = j<2, branch = j<count*.58;
      const spread = leader ? .3 : branch ? 1.8 : 4;
      const offset = (random()-.5)*spread;
      const u = THREE.MathUtils.clamp(t+(random()-.5)*(leader?.009:.032),.005,.995);
      const length = (leader?10+4*random():branch?3.2+4*random():.55+1.9*random())*pressure;
      const width = (leader?.8:branch?.44:.18)*(.62+random()*.75)*pressure;
      const gold = turn>.64 && j%5===0 ? .80 : 0;
      stroke(u,distanceScale,lane+offset,(random()-.5)*1.8,length,width,
        (leader?1.6:.8)+offset*.7,leader?.15:branch?.45:.78,gold);
    }
  }
  // A small fixed patch on the outer lip, many metres from the spawn.
  // These are suspended chips, independent of thrust or the suit exhaust.
  if (!far) for (let i=0;i<88;i++) {
    const t=.67+random()*.10;
    stroke(t,1,2+(random()-.5)*9,(random()-.5)*9,.12+random()*.55,
      .035+random()*.075,.45,.7,i%9===0?.75:0,true);
  }
  // Equal-area anchors avoid a crowded equator or a bare polar cap. Each
  // anchor carries part of a curved current with open sky between currents.
  const patches=56, goldenAngle=Math.PI*(3-Math.sqrt(5));
  for (let i=0;i<patches;i++) {
    const y=1-2*(i+.5)/patches, azimuth=i*goldenAngle;
    const horizontal=Math.sqrt(1-y*y);
    const normal=new THREE.Vector3(horizontal*Math.cos(azimuth),y,horizontal*Math.sin(azimuth));
    const east=new THREE.Vector3(-Math.sin(azimuth),0,Math.cos(azimuth));
    const north=new THREE.Vector3().crossVectors(east,normal);
    const roll=.85*Math.sin(azimuth*2+y*3);
    east.applyAxisAngle(normal,roll);
    north.applyAxisAngle(normal,roll);
    const span=.17+.09*random(), curl=(.08+.07*random())*(i%2?1:-1);
    const depth=far?radius*.98:105+random()*185;
    const count=far?12:32;
    for(let j=0;j<count;j++) {
      const u=2*(j+random())/count-1, pressure=1-.65*Math.abs(u);
      const lane=j%4, spineMark=lane===0;
      const r=depth*(far?1:1+.09*lane);
      const lateral=curl*(1-u*u)+lane*.007+(.5-random())*(spineMark?.008:.035);
      const direction=normal.clone().addScaledVector(east,u*span).addScaledVector(north,lateral).normalize();
      const axis=east.clone().multiplyScalar(span).addScaledVector(north,-2*curl*u);
      axis.addScaledVector(direction,-axis.dot(direction)).normalize();
      const cross=new THREE.Vector3().crossVectors(axis,direction).normalize();
      const tint=cobalt.clone().lerp(turquoise,.2+pressure*random()*.62);
      if(i%7===2 && spineMark && Math.abs(u)<.4) tint.lerp(ochre,.65);
      centres.push(...direction.multiplyScalar(r).toArray());
      lengths.push(...axis.multiplyScalar(r*pressure*(spineMark?.052:.012+.018*random())).toArray());
      widths.push(...cross.multiplyScalar(r*pressure*(spineMark?.0038:.0019)).toArray());
      colours.push(...tint.toArray());
      // Phase zero leaves the travelling highlight on the porch current.
      styles.push(curl*13,spineMark?.28:.68,0,random());
    }
  }
  const base=new THREE.PlaneGeometry(2,2,8,2);
  const geometry=new THREE.InstancedBufferGeometry();
  geometry.setIndex(base.index.clone());
  geometry.setAttribute('position',base.attributes.position.clone());
  base.dispose();
  for (const [name,array,size] of [
    ['tideCentre',centres,3],['tideAlong',lengths,3],['tideAcross',widths,3],
    ['tideColour',colours,3],['tideStyle',styles,4],
  ]) geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(array),size));
  geometry.instanceCount=styles.length/4;
  const material=new THREE.ShaderMaterial({
    side:THREE.DoubleSide,toneMapped:false,fog:false,
    uniforms:{panorama:skyUniforms.panorama,intensity:skyUniforms.intensity,
      longitude:skyUniforms.longitude,tideTime:{value:0}},
    vertexShader:`
      ${environmentSampling}
      attribute vec3 tideCentre,tideAlong,tideAcross,tideColour;
      attribute vec4 tideStyle;
      uniform float tideTime;
      varying vec3 vPigment;
      varying vec3 vUnderpaint;
      varying vec2 vBrush;
      varying float vDry;
      void main(){
        vec2 p=position.xy;
        float belly=1.-p.x*p.x;
        vec3 face=normalize(cross(tideAlong,tideAcross));
        float ridge=(1.-abs(p.y))*belly;
        vec3 at=tideCentre+p.x*tideAlong+
          tideAcross*(p.y*(.035+.965*belly)+belly*tideStyle.x)+
          face*length(tideAcross)*ridge*.48;
        float pulse=0.;
        ${far?'':`if(tideStyle.z<0.){
          at+=normalize(tideAlong)*sin(tideTime*.32+tideStyle.w*6.28)*.55;
        }else{
          float phase=fract(tideStyle.z-tideTime*.043+.16+tideStyle.y*.032);
          pulse=exp(-40.*phase)*smoothstep(0.,.016,phase)*smoothstep(.48,.6,tideStyle.z)*(1.-smoothstep(.76,.86,tideStyle.z));
        }`}
        vec3 sky=sampleEnvironment(normalize(tideCentre));
        vUnderpaint=sky*intensity;
        vPigment=(mix(sky,tideColour,${far?'.54':'.79'})*(.81+.32*ridge)
          +vec3(.22,.27,.25)*pulse*ridge)*intensity;
        vBrush=p;vDry=tideStyle.y;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(at,1.);
      }`,
    fragmentShader:`
      varying vec3 vPigment;
      varying vec3 vUnderpaint;
      varying vec2 vBrush;
      varying float vDry;
      void main(){
        float phase=vBrush.y*11.+vBrush.x*2.;
        float grain=sin(phase)*(1.-smoothstep(.6,2.8,fwidth(phase)));
        vec3 pigment=vPigment*(1.+grain*vDry*.18);
        if(!gl_FrontFacing) pigment*=vec3(.63,.79,.91);
        // As the entire blade falls below one pixel, lower its contrast too.
        pigment=mix(pigment,vUnderpaint,smoothstep(1.2,3.5,fwidth(vBrush.y))*.85);
        gl_FragColor=vec4(pigment,1.);
        #include <colorspace_fragment>
      }`,
  });
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name=far?'TideUnderpainting':'TideBrushClusters';
  mesh.frustumCulled=false;
  return mesh;
}
