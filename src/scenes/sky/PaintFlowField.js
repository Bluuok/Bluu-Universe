import {buildStaticMergedMesh,attachBoundsTree} from '../../vendor/hh-hang/colliderBuild.js';
import * as THREE from 'three';
import {ExtendedTriangle} from 'three-mesh-bvh';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {PaintFlowManifest} from '../../config/PaintFlowManifest.js';
import {blendPaintStrokes} from './PaintFlowBlend.js';
import {sweptBody} from './VortexField.js';
import {makeVortexPaintMaterial} from './VortexPaintMaterial.js';

const clamp=THREE.MathUtils.clamp;
function randomFrom(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function distanceToSegment(p,a,b){const line=b.clone().sub(a),t=clamp(p.clone().sub(a).dot(line)/line.lengthSq(),0,1);return p.distanceTo(a.clone().addScaledVector(line,t));}
function offsetPaintUV(geometry,offset){const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)+offset);}

// Pigment follows the existing blue surface, including its bend limits and
// taper. A separately swept, raised centreline left the gold tips floating.
export function makePaintCoat(body,{curveSegments,crossSegments},palette){
  const first=1,last=curveSegments-1,left=Math.floor(crossSegments/4),right=Math.ceil(crossSegments/4);
  const rows=last-first+1,columns=right-left+1,count=rows*columns;
  const positions=[],uvs=[],colors=[],axes=[],motions=[],indices=[];
  const p=new THREE.Vector3(),n=new THREE.Vector3(),base=new THREE.Color(palette.gold),crest=new THREE.Color(palette.goldCrest);
  for(let side=0;side<2;side++)for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
    const source=(first+row)*(crossSegments+1)+left+column;
    const thickness=side===0?.003+.012*Math.sin(Math.PI*row/(rows-1)):-.025;
    p.fromBufferAttribute(body.attributes.position,source);n.fromBufferAttribute(body.attributes.normal,source);p.addScaledVector(n,thickness);
    positions.push(...p.toArray());uvs.push(body.attributes.uv.getX(source),body.attributes.uv.getY(source));
    // The physical coat remains attached; its pigment blends into the exact
    // underlying blue at either end instead of exposing a square gold cut.
    const coverage=Math.pow(Math.sin(Math.PI*row/(rows-1)),.65);
    const color=new THREE.Color().fromBufferAttribute(body.attributes.color,source).lerp(base,coverage).lerp(crest,.18*coverage);colors.push(color.r,color.g,color.b);
    axes.push(body.attributes.flowAxis.getX(source),body.attributes.flowAxis.getY(source),body.attributes.flowAxis.getZ(source));
    motions.push(body.attributes.flowMotion.getX(source),body.attributes.flowMotion.getY(source));
  }
  for(let row=0;row<rows-1;row++)for(let column=0;column<columns-1;column++){
    const a=row*columns+column,b=a+columns;
    indices.push(a,a+1,b,b,a+1,b+1,a+count,b+count,a+1+count,b+count,b+1+count,a+1+count);
  }
  const boundary=[];
  for(let c=0;c<columns;c++)boundary.push(c);
  for(let r=1;r<rows;r++)boundary.push(r*columns+columns-1);
  for(let c=columns-2;c>=0;c--)boundary.push((rows-1)*columns+c);
  for(let r=rows-2;r>0;r--)boundary.push(r*columns);
  for(let i=0;i<boundary.length;i++){const a=boundary[i],b=boundary[(i+1)%boundary.length];indices.push(a,a+count,b,b,a+count,b+count);}
  const geometry=new THREE.BufferGeometry();
  for(const [name,array,size]of [['position',positions,3],['uv',uvs,2],['color',colors,3],['flowAxis',axes,3],['flowMotion',motions,2]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(array,size));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

// Accept the cheap enclosing sphere when it clears the passage. Only nearby
// curved strokes need exact triangle checks; a large sphere used to discard
// safe inner curl sections and turn the spiral back into an empty ring.
function clearsPassages(geometry,passages,radius){
  const sphere=geometry.boundingSphere,triangle=new ExtendedTriangle(),hit=new THREE.Vector3();
  for(const passage of passages){
    if(distanceToSegment(sphere.center,...passage.ends)-sphere.radius>=radius)continue;
    const line=new THREE.Line3(...passage.ends),ray=new THREE.Ray(line.start.clone(),line.delta(new THREE.Vector3()).normalize()),length=line.distance();
    for(let i=0;i<geometry.index.count;i+=3){
      triangle.a.fromBufferAttribute(geometry.attributes.position,geometry.index.getX(i));triangle.b.fromBufferAttribute(geometry.attributes.position,geometry.index.getX(i+1));triangle.c.fromBufferAttribute(geometry.attributes.position,geometry.index.getX(i+2));triangle.needsUpdate=true;
      if(ray.intersectTriangle(triangle.a,triangle.b,triangle.c,false,hit)&&hit.distanceTo(line.start)<=length)return false;
      if(triangle.closestPointToSegment(line)<radius)return false;
    }
  }
  return true;
}

// Reachable, closed paint strokes. Distant panorama marks remain separately
// owned by the backdrop. This owner borrows the existing pigment and atlas.
export class PaintFlowField {
  constructor({scene,vortex,config=PaintFlowManifest}){
    this.config=config;this.group=new THREE.Group();this.group.name='DirectionalThickPaint';scene.add(this.group);
    this.time=0;this.disposed=false;this.meshes=[];this.paths=[];this.blended=[];this.strokeCount=0;this.underpaintCount=0;this.goldCount=0;this.skipped=0;this.motionQuery=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');this.passages=[];
    this.group.visible=config.enabled;if(!config.enabled)return;
    const palette=config.palette,surface=config.surface||{},random=randomFrom(config.seed),collections=[[],[],[]];
    vortex.group.updateWorldMatrix(true,true);
    this.clearanceEnds=['front','back'].map(id=>vortex.group.localToWorld(new THREE.Vector3(...vortex.config.passage[id]).add(new THREE.Vector3(0,1,0))));
    this.passages.push({id:'main-vortex',ends:this.clearanceEnds});
    for(const recipe of config.paths.filter(p=>p.enabled!==false&&p.kind==='curl')){
      const center=new THREE.Vector3(...recipe.position),normal=new THREE.Vector3(0,0,1).applyEuler(new THREE.Euler(...recipe.rotation));
      this.passages.push({id:recipe.id,ends:[center.clone().addScaledVector(normal,30),center.clone().addScaledVector(normal,-30)]});
    }
    const material=makeVortexPaintMaterial({flowStroke:true,color:'#ffffff',crest:palette.crest,shadow:palette.shadow,paintAccent:palette.crest,paintLight:palette.gold,paintShadow:palette.shadow,emissiveIntensity:.16,strokeStrength:surface.strokeStrength??.50,relief:surface.relief??.007,paintScale:surface.paintScale??.30},{brushAtlas:vortex.brushAtlas});
    material.vertexColors=true;material.roughness=.97;material.metalness=0;material.envMapIntensity=.10;
    this.material=material;this.clockUniform={value:0};
    const paintCompile=material.onBeforeCompile;
    material.onBeforeCompile=shader=>{
      paintCompile(shader);shader.uniforms.paintFlowTime=this.clockUniform;
      shader.vertexShader='uniform float paintFlowTime;attribute vec3 flowAxis;attribute vec2 flowMotion;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        transformed+=flowAxis*sin(paintFlowTime*flowMotion.y+flowMotion.x)*${config.motion.amplitude.toFixed(4)};`);
    };
    material.customProgramCacheKey=()=> 'directional-thick-paint-v2';
    for(const recipe of config.paths){
      if(recipe.enabled===false)continue;
      const {curve,normal}=this.makeCurve(recipe,vortex),length=curve.getLength(),perLane=Math.ceil(recipe.count/recipe.lanes);
      let accepted=0;const strokeLengths=[],blendSources=[],partStart=collections[recipe.group].length;
      if(config.underpaint?.enabled&&recipe.kind==='path'){
        const base=config.underpaint,segments=Math.ceil(length/base.segmentLength);
        for(let section=0;section<segments;section++){
          const start=clamp((section-.12)/segments,.002,.998),end=clamp((section+1.12)/segments,.002,.998),points=[];
          for(let j=0;j<=12;j++)points.push(curve.getPointAt(THREE.MathUtils.lerp(start,end,j/12)).addScaledVector(normal,-.45));
          const {geometry}=sweptBody(points,{paintStroke:true,normal:normal.toArray(),width:[base.width*.88,base.width],depth:[base.depth*.85,base.depth],endSize:.65,edgeBreakup:.04},{curveSegments:base.curveSegments,crossSegments:base.crossSegments},{color:palette.blue[0],crest:palette.blue[1],shadow:palette.shadow});
          const position=geometry.attributes.position;
          if(!clearsPassages(geometry,this.passages,config.clearance+config.motion.amplitude)){geometry.dispose();this.skipped++;continue;}
          if(surface.globalUV)offsetPaintUV(geometry,start*length);
          const axis=new Float32Array(position.count*3),motion=new Float32Array(position.count*2),tangent=curve.getTangentAt((start+end)*.5);
          for(let vertex=0;vertex<position.count;vertex++){axis.set(tangent.toArray(),vertex*3);motion.set([section*.4,config.motion.rate],vertex*2);}
          geometry.setAttribute('flowAxis',new THREE.BufferAttribute(axis,3));geometry.setAttribute('flowMotion',new THREE.BufferAttribute(motion,2));
          collections[recipe.group].push(geometry);this.underpaintCount++;this.strokeCount++;
        }
      }
      for(let i=0;i<recipe.count;i++){
        const lane=i%recipe.lanes,index=Math.floor(i/recipe.lanes),t=(index+.45+lane*.37+(random()-.5)*.56)/perLane;
        if(t>=.985)continue;
        const variation=random(),span=Math.min(recipe.strokeLength?THREE.MathUtils.lerp(...recipe.strokeLength,variation)/length:recipe.length/perLane*(.60+variation*.65),12/length),half=span*.5;
        const width=THREE.MathUtils.lerp(...recipe.width,random()),depth=THREE.MathUtils.lerp(...recipe.depth,random());
        const range=recipe.laneRanges?.[lane];
        if(range&&(t<range[0]||t>range[1]))continue;
        const spread=range&&lane>0?THREE.MathUtils.smoothstep(t,range[0],range[0]+.08)*(1-THREE.MathUtils.smoothstep(t,range[1]-.08,range[1])):1;
        const laneOffset=range?(lane===0?0:lane===1?-1:1)*spread:lane-(recipe.lanes-1)*.5;
        // A coherent lane bends with the whole current. Independent offsets
        // per short stroke made neighbouring marks alternate like loose stones.
        const lateral=laneOffset*recipe.laneSpacing*(.75+.25*Math.sin(t*Math.PI))+.30*Math.sin(t*Math.PI*2.8+lane*.8);
        const lift=(recipe.surface||0)+laneOffset*config.layerDepth*.7+.15*Math.sin(t*8+lane),points=[];
        for(let j=0;j<=6;j++){
          const u=clamp(t-half+j/6*span,.002,.998),p=curve.getPointAt(u),tangent=curve.getTangentAt(u);
          const across=new THREE.Vector3().crossVectors(normal,tangent).normalize();
          p.addScaledVector(across,lateral+.17*Math.sin(j/6*Math.PI*2+i*.71)).addScaledVector(normal,lift+.18*Math.sin(j/6*Math.PI+i));points.push(p);
        }
        const gold=palette.goldFraction>0&&(i+recipe.group*3)%Math.max(1,Math.round(1/palette.goldFraction))===0;
        const blue=new THREE.Color(palette.blue[0]).lerp(new THREE.Color(palette.blue.at(-1)),.15+.35*(.5+.5*Math.sin(t*6+recipe.group)));
        const colours={color:'#'+blue.getHexString(),crest:palette.crest,shadow:palette.shadow};
        const profile={paintStroke:true,normal:normal.toArray(),width:[width*.45,width],depth:[depth*.50,depth],endSize:.12,edgeBreakup:.045,bulges:[{at:.44,spread:.23,width:width*.10,depth:depth*.08}]};
        const {geometry,curve:strokeCurve}=sweptBody(points,profile,config.geometry,colours),positions=geometry.attributes.position;
        if(!clearsPassages(geometry,this.passages,config.clearance+config.motion.amplitude)){geometry.dispose();this.skipped++;continue;}
        // Keep pigment anchored along the whole current rather than replaying
        // the same local wood-grain-like chart at every short stroke's start.
        if(surface.globalUV)offsetPaintUV(geometry,clamp(t-half,.002,.998)*length+lane*13.7);
        const axis=new Float32Array(positions.count*3),motion=new Float32Array(positions.count*2),tangent=curve.getTangentAt(clamp(t,0,1));
        for(let j=0;j<positions.count;j++){axis.set(tangent.toArray(),j*3);motion.set([i*.73+(recipe.phase||0),config.motion.rate*(.85+lane*.12+recipe.group*.06)],j*2);}
        geometry.setAttribute('flowAxis',new THREE.BufferAttribute(axis,3));geometry.setAttribute('flowMotion',new THREE.BufferAttribute(motion,2));
        if(recipe.blend)blendSources.push({geometry,curve:strokeCurve,t,span,gold});
        collections[recipe.group].push(geometry);accepted++;strokeLengths.push(strokeCurve.getLength());this.strokeCount++;
        // Warm pigment rides on a blue mark instead of replacing an entire
        // thick section with a yellow block. It borrows the same material.
        if(gold){
          const accent=makePaintCoat(geometry,config.geometry,palette);
          if(clearsPassages(accent,this.passages,config.clearance+config.motion.amplitude)){
            if(recipe.blend)blendSources.at(-1).coat=accent;
            collections[recipe.group].push(accent);this.strokeCount++;this.goldCount++;
          }else accent.dispose();
        }
      }
      if(recipe.blend){
        const result=blendPaintStrokes(blendSources,{material,curve,normal,geometry:config.geometry,palette,motion:config.motion,...config.blend});
        if(!clearsPassages(result.geometry,this.passages,config.clearance+config.motion.amplitude)){result.geometry.dispose();throw new Error('Blended near paint violates passage clearance');}
        const replaced=collections[recipe.group].splice(partStart),sourceVertices=replaced.reduce((sum,g)=>sum+g.attributes.position.count,0),sourceTriangles=replaced.reduce((sum,g)=>sum+g.index.count/3,0);
        for(const part of replaced)part.dispose();
        collections[recipe.group].push(result.geometry);this.blended.push({id:recipe.id,group:recipe.group,sourceParts:replaced.length,sourceVertices,sourceTriangles,...result.telemetry});
      }
      strokeLengths.sort((a,b)=>a-b);
      this.paths.push({id:recipe.id,kind:recipe.kind,strokes:accepted,length,strokeLengths:accepted?{min:strokeLengths[0],median:strokeLengths[Math.floor(accepted/2)],max:strokeLengths.at(-1)}:null});
    }
    for(const [i,parts]of collections.entries()){
      if(!parts.length)continue;const geometry=mergeGeometries(parts,false);for(const part of parts)part.dispose();
      geometry.computeBoundingBox();geometry.boundingBox.expandByScalar(config.motion.amplitude);geometry.computeBoundingSphere();geometry.boundingSphere.radius+=config.motion.amplitude;
      const mesh=new THREE.Mesh(geometry,material);mesh.name='ThickPaintLayer:'+i;this.group.add(mesh);this.meshes.push(mesh);
    }
    const triangles=this.meshes.reduce((sum,m)=>sum+m.geometry.index.count/3,0);
    if(this.strokeCount>config.budget.strokes||triangles>config.budget.triangles||this.meshes.length>config.budget.drawCalls){this.dispose();throw Error('Thick paint exceeds configured budget');}
  }
  makeCurve(recipe,vortex){
    let points,normal=new THREE.Vector3(0,0,1);
    if(recipe.kind==='vortex'){
      const band=vortex.bands.find(b=>b.id===recipe.band);points=Array.from({length:49},(_,i)=>vortex.group.localToWorld(band.curve.getPointAt(i/48)));
      normal.applyQuaternion(vortex.group.quaternion);
    }else if(recipe.kind==='curl'){
      const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(...recipe.rotation)),origin=new THREE.Vector3(...recipe.position);
      normal.applyQuaternion(rotation);points=Array.from({length:49},(_,i)=>{const t=i/48,a=recipe.phase+t*Math.PI*2*recipe.turns,r=THREE.MathUtils.lerp(...recipe.radius,t),wave=recipe.depthCycles===undefined?Math.sin(t*Math.PI*1.6):Math.sin(t*Math.PI*2*recipe.depthCycles);return new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r*recipe.flatten,wave*recipe.depthWave+(recipe.depthDrift||0)*(t-.5)).applyQuaternion(rotation).add(origin);});
    }else points=recipe.points.map(p=>new THREE.Vector3(...p));
    return {curve:new THREE.CatmullRomCurve3(points,false,'centripetal'),normal};
  }
  // Camera-only clone: preserve rendered indices/attributes and body collision.
  // This base-surface BVH does not reproduce the small shader-driven sway.
  getCameraMeshes(){
    if(this.disposed||!this.group.visible||!this.meshes.length)return [];
    if(!this.cameraCollider){
      this.cameraCollider=buildStaticMergedMesh(this.meshes);
      if(!this.cameraCollider)throw Error('Paint camera geometry could not be merged');
      attachBoundsTree(this.cameraCollider.geometry,{onReady:()=>{}});
      this.cameraCollider.mesh.name='paint-surfaces';this.cameraCollider.mesh.updateMatrixWorld(true);
    }
    return [this.cameraCollider.mesh];
  }
  setPigmentTexture(texture){const u=this.material?.userData.paintUniforms;if(u){u.oilPaintMap.value=texture||null;u.oilPaintLoaded.value=texture?1:0;}}
  update(dt,{enabled=true,paused=false,reducedMotion=false}={}){if(this.disposed||!this.config.enabled)return;if(enabled&&!paused&&!reducedMotion&&!this.motionQuery?.matches)this.time+=Math.min(Math.max(dt||0,0),.05);this.clockUniform.value=this.time;}
  get telemetry(){return {cameraProxy:{integrated:Boolean(this.cameraCollider),triangles:this.cameraCollider?.geometry.index.count/3||0,rendered:false,baseGeometry:true,shaderSway:this.config.motion.amplitude},enabled:this.config.enabled,disposed:this.disposed,strokes:this.strokeCount-this.blended.reduce((sum,p)=>sum+p.sourceParts-p.renderedParts,0),authoredStrokes:this.strokeCount,underpaint:this.underpaintCount,gold:this.goldCount,goldCoats:this.goldCount-this.blended.reduce((sum,p)=>sum+p.sourceGoldMarks,0),embeddedGoldMarks:this.blended.reduce((sum,p)=>sum+p.sourceGoldMarks,0),skippedForClearance:this.skipped,drawCalls:this.meshes.length,triangles:this.meshes.reduce((s,m)=>s+m.geometry.index.count/3,0),newTextures:0,blended:this.blended,paths:this.paths,passages:this.passages.map(p=>({id:p.id,front:p.ends[0].toArray(),center:p.ends[0].clone().lerp(p.ends[1],.5).toArray(),back:p.ends[1].toArray()})),time:this.time,motionAmplitude:this.config.motion.amplitude};}
  dispose(){if(this.disposed)return;this.disposed=true;this.group.removeFromParent();for(const mesh of this.meshes)mesh.geometry.dispose();this.material?.dispose();if(this.cameraCollider){this.cameraCollider.geometry.dispose();this.cameraCollider.mesh.material.dispose();this.cameraCollider=null;}}
}
