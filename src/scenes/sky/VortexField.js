import * as THREE from 'three';
import {VortexManifest} from '../../config/VortexManifest.js';
import {makeBrushAtlas,BRUSH_ROWS} from '../../vendor/victor-eu/brushAtlas.js';
import {makeVortexPaintMaterial} from './VortexPaintMaterial.js';
import {makePaintedCloudVolume,getPaintedCloudBounds} from './PaintedCloudVolume.js';

/** Closed elliptical swept geometry: continuous broad silhouette, both sides
 * and actual depth. The local authoring curve is distinct from the original
 * Starry Night demo, which remains a brush/flow reference, not this model. */
export function sweptBody(points,profile,{curveSegments,crossSegments},palette) {
  const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
  const positions=[],uvs=[],colors=[],indices=[];
  const base=new THREE.Color(palette.color),crest=new THREE.Color(palette.crest),shadow=new THREE.Color(palette.shadow),color=new THREE.Color();
  const p=new THREE.Vector3(),q=new THREE.Vector3(),tangent=new THREE.Vector3(),wide=new THREE.Vector3(),deep=new THREE.Vector3();
  const length=curve.getLength(),strokePlane=profile.paintStroke?new THREE.Vector3(...(profile.normal||[0,0,1])):null;
  // Opt-in transport for long 3D strokes, seeded by the authored plane.
  // Three's slowly rotating frames avoid a sudden width flip when the path
  // approaches that plane's normal. Other profiles retain their old frame.
  const frames=profile.transportFrame?curve.computeFrenetFrames(curveSegments,false):null;
  let frameCos=1,frameSin=0;
  if(frames){
    wide.crossVectors(strokePlane||new THREE.Vector3(0,0,1),frames.tangents[0]).normalize();
    if(wide.lengthSq()<1e-8)wide.copy(frames.normals[0]);
    frameCos=wide.dot(frames.normals[0]);frameSin=wide.dot(frames.binormals[0]);
  }
  const rawCaps=Array.from({length:curveSegments+1},(_,i)=>{
    const t=i/curveSegments,epsilon=.5/curveSegments;
    const turn=curve.getTangentAt(Math.max(0,t-epsilon)).angleTo(curve.getTangentAt(Math.min(1,t+epsilon)));
    return .78*(Math.min(1,t+epsilon)-Math.max(0,t-epsilon))*length/Math.max(.00001,turn);
  });
  // Spread each tight bend's thickness limit into its neighbours. A hard
  // per-ring cap produced abrupt pinches that read as joined sections even
  // with a pure opaque material. This conservative soft minimum stays below
  // the local bend radius and eases the section into and out of the bend.
  const caps=rawCaps.map((_,i)=>{
    const candidates=[];
    for(let j=Math.max(0,i-8);j<=Math.min(curveSegments,i+8);j++)candidates.push(rawCaps[j]+Math.abs(j-i)*length/curveSegments*.28);
    const minimum=Math.min(...candidates),softness=.12;
    return Math.max(.03,minimum-softness*Math.log(candidates.reduce((s,r)=>s+Math.exp(-(r-minimum)/softness),0)));
  });
  for(let i=0;i<=curveSegments;i++){
    const t=i/curveSegments;curve.getPointAt(t,p);curve.getTangentAt(t,tangent);
    // Width lies across the authoring plane; depth follows its actual 3D
    // tangent. Arbitrary Frenet chart roll made the first prototype a hose.
    if(frames)wide.copy(frames.normals[i]).multiplyScalar(frameCos).addScaledVector(frames.binormals[i],frameSin).normalize();
    else if(strokePlane)wide.crossVectors(strokePlane,tangent).normalize();else wide.set(-tangent.y,tangent.x,0).normalize();deep.crossVectors(tangent,wide).normalize();
    const envelope=Math.pow(Math.sin(Math.PI*t),.48),end=.03+.97*THREE.MathUtils.smoothstep(Math.min(t,1-t),0,.12);
    const pressure=profile.paintStroke?.96+.04*Math.sin(t*Math.PI*2+.4):.86+.11*Math.sin(t*16.4+1)+.065*Math.sin(t*31.7);
    const tip=profile.endSize??.03,roundedEnd=tip+(1-tip)*(end-.03)/.97;
    const bulge=(axis)=>(profile.bulges||[]).reduce((sum,b)=>sum+b[axis]*Math.exp(-.5*Math.pow((t-b.at)/b.spread,2)),0);
    // A thick section cannot exceed its bend radius: otherwise the inner
    // surface folds over and triangles turn inside out around a tight curl.
    const breakup=profile.edgeBreakup??0;
    // Reserve bend clearance for the widest lobe. The centreline/passages
    // stay unchanged while the surface loses its mechanically even outline.
    const radiusCap=caps[i]/(1+breakup),limit=size=>size/Math.pow(1+Math.pow(size/radiusCap,8),1/8);
    const width=limit((THREE.MathUtils.lerp(profile.width[0],profile.width[1],envelope)*pressure+bulge('width'))*roundedEnd);
    const depthPressure=profile.paintStroke?.98+.025*Math.sin(t*Math.PI*2):.88+.15*Math.sin(t*13.2+.7);
    const depth=limit((THREE.MathUtils.lerp(profile.depth[0],profile.depth[1],envelope)*depthPressure+bulge('depth'))*roundedEnd);
    for(let j=0;j<=crossSegments;j++){
      const angle=j/crossSegments*Math.PI*2;
      // Broad lobes carry the silhouette; bristle-sized detail belongs in the
      // pigment. High angular frequencies undersampled the cross-section and
      // made the side view look like folded paper instead of a thick cloud.
      const lobes=.62*Math.sin(t*21+angle*2+Math.sin(t*7))+.28*Math.sin(t*43-angle*3)+.10*Math.sin(t*67+angle);
      const irregular=profile.paintStroke?1+.018*Math.sin(t*6+angle*2)+breakup*(.7*Math.sin(t*6+angle*2)+.3*Math.sin(t*13-angle*3)):1+.035*Math.sin(t*27+angle*3)+.012*Math.sin(t*47-angle*2)+breakup*lobes;
      const ridge=profile.paintStroke?1+.14*Math.cos(Math.cos(angle)*Math.PI*3+.5*Math.sin(t*Math.PI)):1;
      q.copy(p).addScaledVector(wide,Math.cos(angle)*width*irregular).addScaledVector(deep,Math.sin(angle)*depth*irregular*ridge);
      positions.push(q.x,q.y,q.z);uvs.push(t*length,j/crossSegments);
      const highlight=.5+.5*Math.sin(angle+.65+Math.sin(t*8)*.35);
      color.copy(shadow).lerp(base,.65+highlight*.35).lerp(crest,highlight*.24);colors.push(color.r,color.g,color.b);
      if(i<curveSegments&&j<crossSegments){const a=i*(crossSegments+1)+j,b=a+crossSegments+1;indices.push(a,a+1,b,b,a+1,b+1);}
    }
  }
  // End caps close the actual volume; taper does not leave open paper edges.
  for(const [row,start] of [[0,true],[curveSegments,false]]){
    const center=positions.length/3;curve.getPointAt(start?0:1,p);positions.push(p.x,p.y,p.z);uvs.push(start?0:length,.5);colors.push(base.r,base.g,base.b);
    for(let j=0;j<crossSegments;j++){const a=row*(crossSegments+1)+j;indices.push(center,start?a+1:a,start?a:a+1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  // UVs split at the closed cross-section, but illumination must not split.
  const normals=geometry.getAttribute('normal');
  for(let i=0;i<=curveSegments;i++){const a=i*(crossSegments+1),b=a+crossSegments;q.fromBufferAttribute(normals,a).add(p.fromBufferAttribute(normals,b)).normalize();normals.setXYZ(a,q.x,q.y,q.z);normals.setXYZ(b,q.x,q.y,q.z);}
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  return {geometry,curve};
}

function spiralPoints(profile,wing=false) {
  if(profile.path)return profile.path.map(point=>new THREE.Vector3(...point));
  const points=[];
  for(let i=0;i<=70;i++){
    const t=i/70,angle=profile.phase+t*Math.PI*2*profile.turns,r=THREE.MathUtils.lerp(profile.innerRadius,profile.outerRadius,t);
    const depthPath=profile.depthPath||[[0,wing?-3:0],[1,wing?-3:0]];
    const next=Math.max(1,depthPath.findIndex(([at])=>at>=t)),lo=depthPath[next-1],hi=depthPath[next],prev=depthPath[Math.max(0,next-2)],after=depthPath[Math.min(depthPath.length-1,next+1)],span=hi[0]-lo[0],u=(t-lo[0])/span;
    const m0=(hi[1]-prev[1])/(hi[0]-prev[0]),m1=(after[1]-lo[1])/(after[0]-lo[0]);
    const depth=(2*u*u*u-3*u*u+1)*lo[1]+(u*u*u-2*u*u+u)*span*m0+(-2*u*u*u+3*u*u)*hi[1]+(u*u*u-u*u)*span*m1;
    points.push(new THREE.Vector3(Math.cos(angle)*r,Math.sin(angle)*r*(wing?.78:.88),
      Math.sin(angle*1.2)*2.3+Math.sin(t*Math.PI)*1.4+depth));
  }
  return points;
}

export class VortexField {
  constructor({scene,manifest=VortexManifest}) {
    this.brushAtlas=makeBrushAtlas();this.brushAtlas.colorSpace=THREE.NoColorSpace;
    this.config=manifest;this.group=new THREE.Group();this.group.name='WorldVortex:'+manifest.id;
    this.group.position.set(...manifest.position);this.group.rotation.set(...manifest.rotation);scene.add(this.group);
    this.bands=[];
    for(const [id,profile,wing] of [['main',manifest.cloud,false],['wing',manifest.wing,true]]){
      const {geometry,curve}=sweptBody(spiralPoints(profile,wing),profile,manifest.geometry,profile);
      const mesh=makePaintedCloudVolume({geometry,curve,...manifest.geometry,profile,brushAtlas:this.brushAtlas});
      mesh.name='PermeablePaintBody:'+id;mesh.renderOrder=-2;this.group.add(mesh);this.bands.push({id,mesh,curve,authoringGeometry:geometry});
    }
    this.coreAnchor=new THREE.Group();this.coreAnchor.name=manifest.core.anchor;this.coreAnchor.position.set(...manifest.core.position);this.group.add(this.coreAnchor);
    const geometry=new THREE.SphereGeometry(manifest.core.radius,64,40),position=geometry.getAttribute('position');
    const v=new THREE.Vector3();
    for(let i=0;i<position.count;i++){v.fromBufferAttribute(position,i);const ripple=1+.012*Math.sin(v.x*2.1+v.y*1.7)*Math.cos(v.z*2.3)+.008*Math.sin(v.y*3.2+v.z);v.multiplyScalar(ripple);position.setXYZ(i,v.x,v.y,v.z);}
    geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    this.core=new THREE.Mesh(geometry,makeVortexPaintMaterial(manifest.core,{brushAtlas:this.brushAtlas}));this.core.name='SolidPaintedStarCore';this.coreAnchor.add(this.core);
    for(const [id,r,start,end,z] of [['inner',3.9,-.8,3.7,1],['outer',5.3,1.2,5.1,-.8]]){
      const points=[];for(let i=0;i<=48;i++){const t=i/48,a=THREE.MathUtils.lerp(start,end,t),radius=r+.20*Math.sin(a*3+.5);points.push(new THREE.Vector3(Math.cos(a)*radius,Math.sin(a)*radius*.88,z+Math.sin(a*2)*.65));}
      const profile={...manifest.halo,width:[.18,.46],depth:[.055,.12],endSize:.14,opacity:manifest.halo.opacity??.9,crest:manifest.halo.crest,shadow:manifest.halo.shadow};
      const {geometry}=sweptBody(points,profile,{curveSegments:100,crossSegments:12},profile);
      const mesh=new THREE.Mesh(geometry,makeVortexPaintMaterial(profile,{cloud:true,brushAtlas:this.brushAtlas}));mesh.name='DecorativeStarHalo:'+id;this.coreAnchor.add(mesh);
    }
  }

  getTelemetry() {
    this.group.updateWorldMatrix(true,true);const bounds=new THREE.Box3();
    for(const child of this.group.children)bounds.union(child.userData.cloudVolume?getPaintedCloudBounds(child):new THREE.Box3().setFromObject(child));
    return {id:this.config.id,worldFixed:true,cameraAttached:false,position:this.group.position.toArray(),rotation:this.group.rotation.toArray(),
      worldBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},core:{anchor:this.config.core.anchor,position:this.coreAnchor.getWorldPosition(new THREE.Vector3()).toArray(),visualRadius:this.config.core.radius,collisionRadius:this.config.core.collisionRadius,solid:true},
      bands:this.bands.map(({id,mesh})=>({id,closedVolume:true,collidable:false,position:mesh.getWorldPosition(new THREE.Vector3()).toArray(),triangles:mesh.geometry.index.count/3,volume:mesh.userData.cloudVolume})),
      passage:Object.fromEntries(Object.entries(this.config.passage).map(([id,p])=>[id,this.group.localToWorld(new THREE.Vector3(...p)).toArray()])),
      paint:{loaded:Boolean(this.pigmentTexture),source:'Borrowed original Starry Night sky-layer pigment texture; shared owner is StarfieldBackdrop',proceduralDetail:true,
        brushAtlas:{source:'Victor-EU makeBrushAtlas at 8cb50612e5769229da3781679cb3dc1b06d3d441; MIT; exact generator extraction',size:[256,512],rows:BRUSH_ROWS,colorSpace:this.brushAtlas.colorSpace,channels:'R height / G coverage / B tone / A secondary pigment, not alpha',owner:'VortexField',sharedMaterials:5}},
      source:'Local authored sweep/paint implementation using installed Three r161 primitives; user video is visual reference only'};
  }

  setPigmentTexture(texture){this.pigmentTexture=texture||null;this.group.traverse(object=>{const u=object.material?.userData.paintUniforms;if(u){u.oilPaintMap.value=this.pigmentTexture;u.oilPaintLoaded.value=texture?1:0;}});}

  setPlayerFocus(position){this.group.traverse(object=>{if(!object.material?.userData.permeable)return;const u=object.material.userData.paintUniforms;u.oilFocusActive.value=position?1:0;if(position){u.oilFocus.value.copy(position);u.oilFocus.value.y+=1;}});}

  dispose(){if(this.disposed)return;this.disposed=true;this.group.removeFromParent();this.group.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});for(const band of this.bands)band.authoringGeometry.dispose();this.brushAtlas.dispose();}
}
