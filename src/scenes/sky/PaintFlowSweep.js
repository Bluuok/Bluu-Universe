import * as THREE from 'three';
import {sweptBody} from './VortexField.js';

// One closed sweep carries the long stroke, pigment and continuous motion.
export function sweepPaintCurrent(recipe,{normal,palette,motion}){
  const spec=recipe.sweep,points=recipe.points.map(p=>new THREE.Vector3(...p));
  const length=new THREE.CatmullRomCurve3(points,false,'centripetal').getLength();
  const layout={curveSegments:Math.ceil(length/spec.segmentLength),crossSegments:spec.crossSegments};
  const {geometry,curve}=sweptBody(points,{paintStroke:true,transportFrame:true,normal:normal.toArray(),...spec.profile},layout,{color:palette.blue[0],crest:palette.crest,shadow:palette.shadow});
  const count=geometry.attributes.position.count,axis=new Float32Array(count*3),animation=new Float32Array(count*2),tangent=new THREE.Vector3(),colour=new THREE.Color(),gold=new THREE.Color(palette.gold);
  let goldVertices=0;
  for(let i=0;i<count;i++){
    const t=THREE.MathUtils.clamp(geometry.attributes.uv.getX(i)/length,0,1),angle=geometry.attributes.uv.getY(i)*Math.PI*2,across=Math.cos(angle);
    let coverage=0;
    for(const patch of spec.pigment){
      const u=(t-patch.start)/(patch.end-patch.start);if(u<=0||u>=1)continue;
      const shift=patch.across+.12*Math.sin(u*Math.PI*2),side=1-THREE.MathUtils.smoothstep(Math.abs(across-shift),patch.width*.4,patch.width);
      coverage=Math.max(coverage,side*Math.pow(Math.sin(u*Math.PI),.65)*Math.abs(Math.sin(angle)));
    }
    colour.fromBufferAttribute(geometry.attributes.color,i).lerp(gold,coverage*.94);geometry.attributes.color.setXYZ(i,colour.r,colour.g,colour.b);if(coverage>.2)goldVertices++;
    curve.getTangentAt(t,tangent);axis.set(tangent.toArray(),i*3);animation.set([t*4.8+(recipe.phase||0),motion.rate],i*2);
  }
  geometry.setAttribute('flowAxis',new THREE.BufferAttribute(axis,3));geometry.setAttribute('flowMotion',new THREE.BufferAttribute(animation,2));
  return {geometry,telemetry:{layout,length,renderedVertices:count,triangles:geometry.index.count/3,goldVertices,pigmentMarks:spec.pigment.length,transportedFrame:true}};
}
