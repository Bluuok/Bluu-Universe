import * as THREE from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {MarchingCubes} from 'three/examples/jsm/objects/MarchingCubes.js';

const clamp=THREE.MathUtils.clamp;
// CPU authoring from actual overlapping strokes, not a rendered cloud volume
// or texture. The installed Three mesher emits their closed outer surface;
// the existing shared paint material still renders it.
export function blendPaintStrokes(sources,{material,curve,normal,geometry:layout,palette,motion,resolution=96,smoothness=.26,profile={width:1,depth:1,axial:1.25,exponent:2},pigment:paint={width:1,strength:.8}}){
  const bounds=new THREE.Box3();for(const source of sources)bounds.union(source.geometry.boundingBox);
  bounds.expandByScalar(1.2);const size=bounds.getSize(new THREE.Vector3()),step=size.clone().divideScalar(resolution);
  const mesher=new MarchingCubes(resolution,material,false,false,26000);mesher.isolation=0;mesher.field.fill(-1000);
  const field=mesher.field,p=new THREE.Vector3(),v=new THREE.Vector3(),tangent=new THREE.Vector3(),wide=new THREE.Vector3(),deep=new THREE.Vector3();
  const ellipsoids=[];
  const goldPaths=sources.filter(s=>s.coat).map(source=>{
    const columns=Math.ceil(layout.crossSegments/4)-Math.floor(layout.crossSegments/4)+1,rows=layout.curveSegments-1,attribute=source.coat.attributes.position;
    return Array.from({length:rows},(_,row)=>{
      const a=new THREE.Vector3().fromBufferAttribute(attribute,row*columns),b=new THREE.Vector3().fromBufferAttribute(attribute,row*columns+columns-1);
      return {centre:a.clone().lerp(b,.5),width:a.distanceTo(b)*.5};
    });
  });
  for(const source of sources){
    const positions=source.geometry.attributes.position;
    for(let ring=0;ring<=layout.curveSegments;ring++){
      const t=ring/layout.curveSegments;source.curve.getPointAt(t,p);source.curve.getTangentAt(t,tangent);
      wide.crossVectors(normal,tangent).normalize();deep.crossVectors(tangent,wide).normalize();
      let width=0,depth=0;
      for(let j=0;j<layout.crossSegments;j++){v.fromBufferAttribute(positions,ring*(layout.crossSegments+1)+j).sub(p);width=Math.max(width,Math.abs(v.dot(wide)));depth=Math.max(depth,Math.abs(v.dot(deep)));}
      // Broad, compressed superellipse sections represent pressed paint.
      // Longer axial overlap removes the bead pattern at sampled rings;
      // width/depth still come from the actual authored source geometry.
      width*=profile.width;depth*=profile.depth;
      const axial=source.curve.getLength()/layout.curveSegments*profile.axial,scale=Math.min(width,depth,axial);
      if(scale<.025)continue;
      const radius=new THREE.Vector3(...[0,1,2].map(a=>Math.abs(wide.getComponent(a))*width+Math.abs(deep.getComponent(a))*depth+Math.abs(tangent.getComponent(a))*axial)).addScalar(smoothness+.1);
      ellipsoids.push({p:p.clone(),wide:wide.clone(),deep:deep.clone(),tangent:tangent.clone(),width,depth,axial,scale,radius});
    }
  }
  // The pressed profile has longer axial support than the original swept
  // tips. Bound the actual implicit primitives, leaving an empty grid rim;
  // bounding only the original triangles clips the new surface open.
  bounds.makeEmpty();
  for(const e of ellipsoids){bounds.expandByPoint(e.p.clone().sub(e.radius));bounds.expandByPoint(e.p.clone().add(e.radius));}
  bounds.expandByScalar(1.2);bounds.getSize(size);step.copy(size).divideScalar(resolution);
  for(const e of ellipsoids){
    const lo=e.p.clone().sub(e.radius).sub(bounds.min).divide(step).floor(),hi=e.p.clone().add(e.radius).sub(bounds.min).divide(step).ceil();
    for(let z=Math.max(1,lo.z);z<=Math.min(resolution-2,hi.z);z++)for(let y=Math.max(1,lo.y);y<=Math.min(resolution-2,hi.y);y++)for(let x=Math.max(1,lo.x);x<=Math.min(resolution-2,hi.x);x++){
      const dx=bounds.min.x+x*step.x-e.p.x,dy=bounds.min.y+y*step.y-e.p.y,dz=bounds.min.z+z*step.z-e.p.z;
      const side=(dx*e.wide.x+dy*e.wide.y+dz*e.wide.z)/e.width,height=(dx*e.deep.x+dy*e.deep.y+dz*e.deep.z)/e.depth,along=(dx*e.tangent.x+dy*e.tangent.y+dz*e.tangent.z)/e.axial;
      const cross=Math.pow(Math.pow(Math.abs(side),profile.exponent)+Math.pow(Math.abs(height),profile.exponent),2/profile.exponent);
      const distance=(1-Math.sqrt(cross+along*along))*e.scale,index=x+resolution*(y+resolution*z),old=field[index];
      const h=clamp(.5+.5*(distance-old)/smoothness,0,1);field[index]=old+(distance-old)*h+smoothness*h*(1-h);
    }
  }
  mesher.update();
  if(mesher.count/3>=26000){mesher.geometry.dispose();throw new Error('Near paint blend exceeds mesher buffer');}
  const positions=new Float32Array(mesher.count*3);
  for(let i=0;i<mesher.count;i++){p.fromArray(mesher.positionArray,i*3).addScalar(1).multiply(size).multiplyScalar(.5).add(bounds.min);positions.set(p.toArray(),i*3);}
  const raw=new THREE.BufferGeometry();raw.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const welded=mergeVertices(raw,.0001);raw.dispose();
  const kept=[],used=new Map(),compact=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<welded.index.count;i+=3){
    const ids=[0,1,2].map(j=>welded.index.getX(i+j));if(new Set(ids).size<3)continue;
    a.fromBufferAttribute(welded.attributes.position,ids[0]);b.fromBufferAttribute(welded.attributes.position,ids[1]);c.fromBufferAttribute(welded.attributes.position,ids[2]);
    if(b.sub(a).cross(c.sub(a)).lengthSq()===0)continue;
    for(const id of ids){if(!used.has(id)){used.set(id,used.size);p.fromBufferAttribute(welded.attributes.position,id);compact.push(...p.toArray());}kept.push(used.get(id));}
  }
  welded.dispose();const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(compact,3));geometry.setIndex(kept);geometry.computeVertexNormals();
  const count=geometry.attributes.position.count,uvs=new Float32Array(count*2),colors=new Float32Array(count*3),axes=new Float32Array(count*3),motions=new Float32Array(count*2);
  const samples=Array.from({length:129},(_,i)=>curve.getPointAt(i/128)),length=curve.getLength(),blue=new THREE.Color(palette.blue[0]),light=new THREE.Color(palette.blue.at(-1)),shadow=new THREE.Color(palette.shadow),crest=new THREE.Color(palette.crest),gold=new THREE.Color(palette.gold),colour=new THREE.Color(),n=new THREE.Vector3(),nearest=new THREE.Vector3(),line=new THREE.Vector3();
  let goldVertices=0;const pigments=new Float32Array(count);
  for(let i=0;i<count;i++){
    p.fromBufferAttribute(geometry.attributes.position,i);n.fromBufferAttribute(geometry.attributes.normal,i);
    let distance=Infinity,t=0;
    for(let j=0;j<128;j++){line.subVectors(samples[j+1],samples[j]);const u=clamp(v.subVectors(p,samples[j]).dot(line)/line.lengthSq(),0,1);nearest.copy(samples[j]).addScaledVector(line,u);const d=nearest.distanceToSquared(p);if(d<distance){distance=d;t=(j+u)/128;}}
    curve.getPointAt(t,nearest);curve.getTangentAt(t,tangent);wide.crossVectors(normal,tangent).normalize();deep.crossVectors(tangent,wide).normalize();v.subVectors(p,nearest);
    const across=v.dot(wide)*.3+v.dot(deep)*.08,highlight=clamp(.5+.5*n.dot(deep.clone().multiplyScalar(.8).addScaledVector(wide,.6)),0,1);
    colour.copy(blue).lerp(light,.15+.35*(.5+.5*Math.sin(t*6+1))).lerp(shadow,(1-highlight)*.3).lerp(crest,highlight*.24);
    // Project the actual narrow coat footprint, not an entire axial interval.
    // All pigment is vertex colour on this surface, so it cannot float above it.
    let pigment=0;
    for(const path of goldPaths)for(let j=0;j<path.length-1;j++){
      line.subVectors(path[j+1].centre,path[j].centre);line.addScaledVector(normal,-line.dot(normal));
      v.subVectors(p,path[j].centre);const u=clamp(v.dot(line)/line.lengthSq(),0,1);
      nearest.copy(path[j].centre).addScaledVector(line,u);v.subVectors(p,nearest);v.addScaledVector(normal,-v.dot(normal));
      const width=THREE.MathUtils.lerp(path[j].width,path[j+1].width,u)*paint.width,side=1-THREE.MathUtils.smoothstep(v.length(),width*.45,width+.03);
      const end=Math.pow(Math.sin(Math.PI*(j+u)/(path.length-1)),.65);
      pigment=Math.max(pigment,side*end*THREE.MathUtils.smoothstep(n.dot(normal),.30,.75));
    }
    pigments[i]=pigment;
    colors.set(colour.toArray(),i*3);uvs.set([t*length,across],i*2);axes.set(tangent.toArray(),i*3);motions.set([t*4.8,motion.rate],i*2);
  }
  // Conservative diffusion on welded surface edges softens grid-shaped
  // pigment boundaries. Paired flux preserves the vertex coverage sum (not
  // physical surface-area pigment mass); bounded weights
  // keep coverage in [0,1]. Position, blue base and borrowed material stay put.
  const edges=new Map(),degree=new Uint16Array(count),index=geometry.index;
  for(let i=0;i<index.count;i+=3)for(let j=0;j<3;j++){
    const a=index.getX(i+j),b=index.getX(i+(j+1)%3),key=Math.min(a,b)*count+Math.max(a,b);
    if(!edges.has(key)){edges.set(key,[a,b]);degree[a]++;degree[b]++;}
  }
  const contrast=()=>Math.max(0,...[...edges.values()].map(([a,b])=>Math.abs(pigments[a]-pigments[b])));
  const pigmentBefore={mass:pigments.reduce((a,b)=>a+b,0),edgeContrast:contrast()};
  for(let pass=0;pass<(paint.smoothing||0);pass++){
    const delta=new Float32Array(count);
    for(const [a,b]of edges.values()){const flux=.35*(pigments[b]-pigments[a])/Math.max(degree[a],degree[b]);delta[a]+=flux;delta[b]-=flux;}
    for(let i=0;i<count;i++)pigments[i]+=delta[i];
  }
  const pigmentAfter={mass:pigments.reduce((a,b)=>a+b,0),edgeContrast:contrast(),min:Math.min(...pigments),max:Math.max(...pigments)};
  for(let i=0;i<count;i++){colour.fromArray(colors,i*3).lerp(gold,pigments[i]*paint.strength);colors.set(colour.toArray(),i*3);if(pigments[i]>.2)goldVertices++;}
  for(const [name,array,itemSize]of [['uv',uvs,2],['color',colors,3],['flowAxis',axes,3],['flowMotion',motions,2]])geometry.setAttribute(name,new THREE.BufferAttribute(array,itemSize));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();mesher.geometry.dispose();
  return {geometry,telemetry:{sourceStrokes:sources.length,sourceGoldMarks:goldPaths.length,renderedParts:1,renderedVertices:count,ellipsoids:ellipsoids.length,profile:{...profile},pigment:{...paint,before:pigmentBefore,after:pigmentAfter},resolution,triangles:geometry.index.count/3,rawTriangles:mesher.count/3,collapsedTriangles:(mesher.count-geometry.index.count)/3,goldVertices,newTextures:0,temporaryCPUGridBytes:resolution**3*28}};
}
