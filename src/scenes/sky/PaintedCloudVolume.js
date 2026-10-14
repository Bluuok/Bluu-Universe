import * as THREE from 'three';
import {paintBrushGLSL} from './VortexPaintMaterial.js';

// Conservative support of the actual density, including linear filtering.
// Empty rotated entry-box corners must not masquerade as visible cloud bounds.
export function getPaintedCloudBounds(mesh) {
  mesh.updateWorldMatrix(true,false);
  const support=mesh.userData.densitySupport,m=mesh.matrixWorld.elements,box=new THREE.Box3();
  const p=new THREE.Vector3();
  for(let i=0;i<support.centres.length;i+=3){p.fromArray(support.centres,i).applyMatrix4(mesh.matrixWorld);box.expandByPoint(p);}
  const s=support.step;
  const padding=new THREE.Vector3(Math.abs(m[0])*s.x+Math.abs(m[4])*s.y+Math.abs(m[8])*s.z,
    Math.abs(m[1])*s.x+Math.abs(m[5])*s.y+Math.abs(m[9])*s.z,Math.abs(m[2])*s.x+Math.abs(m[6])*s.y+Math.abs(m[10])*s.z);
  box.min.sub(padding);box.max.add(padding);return box;
}

// Bake the existing authored sweep into a small density field. The box is only
// a ray-entry bound: visible colour/opacity comes from samples inside the field,
// including when the eye is inside it. No camera-facing cards or extra renderer.
export function makePaintedCloudVolume({geometry,curve,curveSegments,crossSegments,profile,brushAtlas}) {
  const shadingSegments=profile.shadingSegments===4?4:1;
  const box=geometry.boundingBox.clone().expandByScalar(1.1),size=box.getSize(new THREE.Vector3());
  const resolution=size.toArray().map(n=>Math.max(12,Math.min(112,Math.ceil(n/.42))));
  const sculpted=profile.windField===true,channels=sculpted?4:1;
  const [nx,ny,nz]=resolution,data=new Uint8Array(nx*ny*nz*channels);
  const step=new THREE.Vector3(size.x/nx,size.y/ny,size.z/nz);
  const p=new THREE.Vector3(),v=new THREE.Vector3(),tangent=new THREE.Vector3(),wide=new THREE.Vector3(),deep=new THREE.Vector3();
  const attribute=geometry.attributes.position;
  // Overlapping, finite ellipsoids along the exact curve describe the sweep's
  // continuous interior. A maximum union avoids density seams between samples.
  const axial=Math.max(.8,curve.getLength()/curveSegments*2.7);
  for(let ring=0;ring<=curveSegments;ring+=2){
    curve.getPointAt(ring/curveSegments,p);curve.getTangentAt(ring/curveSegments,tangent);
    wide.set(-tangent.y,tangent.x,0).normalize();deep.crossVectors(tangent,wide).normalize();
    let width=0,depth=0;
    for(let j=0;j<crossSegments;j++){
      v.fromBufferAttribute(attribute,ring*(crossSegments+1)+j).sub(p);
      width=Math.max(width,Math.abs(v.dot(wide)));depth=Math.max(depth,Math.abs(v.dot(deep)));
    }
    width+=.14;depth+=.14;
    const radius=Math.max(width,depth,axial);
    const lo=p.clone().addScalar(-radius).sub(box.min).divide(step).floor();
    const hi=p.clone().addScalar(radius).sub(box.min).divide(step).ceil();
    for(let z=Math.max(0,lo.z);z<Math.min(nz,hi.z+1);z++)for(let y=Math.max(0,lo.y);y<Math.min(ny,hi.y+1);y++)for(let x=Math.max(0,lo.x);x<Math.min(nx,hi.x+1);x++){
      v.set(box.min.x+(x+.5)*step.x-p.x,box.min.y+(y+.5)*step.y-p.y,box.min.z+(z+.5)*step.z-p.z);
      const side=v.dot(wide),height=v.dot(deep),along=v.dot(tangent)/axial;
      // Flatter axial support removes sample-spaced scallops from a smooth sweep.
      // The default ellipsoid is retained for other cloud families.
      const q=(side/width)**2+(height/depth)**2+Math.abs(along)**(profile.axialPower??2);
      if(q>=1)continue;
      let strength=1-q,lane=0;
      if(sculpted){
        // Three broad, overlapping density strokes share a pale underwash.
        // They are sampled interiors, not surfaces or camera-facing paint cards.
        strength*=.035;
        const t=ring/curveSegments;
        for(let strand=0;strand<3;strand++){
          const angle=strand*2.22+Math.sin(t*5.8+strand*.8)*.36+(profile.windPhase??0);
          const w=width*(.42+.045*Math.sin(t*11+strand)),d=depth*(.43+.035*Math.cos(t*9+strand));
          const sw=side-Math.cos(angle)*width*.64,sh=height-Math.sin(angle)*depth*.64;
          const shell=(sw/w)**2+(sh/d)**2+along**2;
          const mass=Math.max(0,1-shell)*(.80+.18*Math.sin(t*8.5+strand*.7)**2);
          if(mass>strength){strength=mass;lane=strand/2;}
        }
        // Density itself leaves a continuous passage; surface accents alone
        // cannot prevent a wide transparent volume from washing the full view.
        const passage=Math.max(0,Math.min(1,(Math.hypot(side,height)-(profile.clearRadius??1.8))/1.5));
        strength*=passage*passage*(3-2*passage);
      }
      const index=(x+nx*(y+ny*z))*channels,value=Math.round(255*strength);
      if(value>data[index]){
        data[index]=value;
        if(sculpted){data[index+1]=Math.round(255*ring/curveSegments);data[index+2]=Math.round(255*lane);data[index+3]=255;}
      }
    }
  }
  const density=new THREE.Data3DTexture(data,nx,ny,nz);
  density.format=sculpted?THREE.RGBAFormat:THREE.RedFormat;density.type=THREE.UnsignedByteType;
  density.minFilter=THREE.LinearFilter;density.magFilter=THREE.LinearFilter;density.unpackAlignment=1;density.needsUpdate=true;
  const uniforms={cloudDensity:{value:density},cloudTime:{value:0},cloudWind:{value:sculpted?1:0},cloudPathLength:{value:curve.getLength()},cloudOpacity:{value:profile.density??.72},cloudShadowStrength:{value:profile.shadowStrength??1},cloudErosion:{value:profile.erosion??.36},cloudBreakup:{value:profile.breakup??0},cloudMin:{value:box.min},cloudSize:{value:size},
    cloudInverse:{value:new THREE.Matrix4()},cloudWorld:{value:new THREE.Matrix4()},
    cloudBlue:{value:new THREE.Color(profile.color)},cloudLight:{value:new THREE.Color(profile.crest).lerp(new THREE.Color(profile.color),profile.crestBlend??0)},cloudGold:{value:new THREE.Color(profile.paintLight)},cloudShadow:{value:new THREE.Color(profile.shadow||profile.color).multiplyScalar(profile.shadow?1:.52)},
    oilBrushAtlas:{value:brushAtlas},oilPaintMap:{value:null},oilPaintLoaded:{value:0},
    oilFocus:{value:new THREE.Vector3()},oilFocusActive:{value:0}};
  const material=new THREE.ShaderMaterial({uniforms,side:THREE.BackSide,transparent:true,depthWrite:false,depthTest:true,
    vertexShader:`uniform mat4 cloudInverse;varying vec3 cloudEye;varying vec3 cloudPoint;
      void main(){cloudEye=(cloudInverse*vec4(cameraPosition,1.)).xyz;cloudPoint=position;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`precision highp sampler3D;
      uniform sampler3D cloudDensity;uniform float cloudTime;uniform float cloudWind;uniform float cloudPathLength;uniform float cloudOpacity;uniform float cloudShadowStrength;uniform float cloudErosion;uniform float cloudBreakup;uniform vec3 cloudMin;uniform vec3 cloudSize;
      uniform mat4 cloudWorld;uniform mat4 cloudInverse;uniform mat4 projectionMatrix;uniform vec3 cloudBlue;uniform vec3 cloudLight;uniform vec3 cloudGold;uniform vec3 cloudShadow;
      uniform sampler2D oilBrushAtlas;uniform sampler2D oilPaintMap;uniform float oilPaintLoaded;
      uniform vec3 oilFocus;uniform float oilFocusActive;varying vec3 cloudEye;varying vec3 cloudPoint;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float oilHash(vec2 p){return hash(vec3(p,0.));}
      ${paintBrushGLSL}
      float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float field(vec3 p){return texture(cloudDensity,(p-cloudMin)/cloudSize).r;}
      vec3 shadeCloudSegment(vec3 centre,vec3 surface){
        vec4 centreField=texture(cloudDensity,(centre-cloudMin)/cloudSize);
        float windPaint=centreField.g*cloudPathLength*.20-cloudTime*.24;
        float wash=noise3(centre*.42),fleck=noise3(centre*2.1);
        if(cloudWind>.5)wash=.24+.56*noise3(vec3(windPaint,centreField.b*2.,centre.z*.11));
        // Use the same overlapping support neighbourhood as the painted core,
        // instead of repeating one atlas row in visible square UV cells.
        vec2 paintPoint=cloudWind>.5?vec2(windPaint,centreField.b*2.+centre.y*.12):centre.xy;
        vec4 bristle=oilPrint(paintPoint,1.6,3.);
        vec4 under=oilPrint(centre.zy+vec2(2.1,3.7),1.1,2.);
        float pigment=oilPaintLoaded>.5?dot(texture2D(oilPaintMap,vec2(.43,.79)+centre.xy*.0025).rgb,vec3(.2126,.7152,.0722)):.4;
        vec3 colour=mix(cloudBlue,cloudLight,smoothstep(.27,.78,wash)*.30);
        colour=mix(colour,cloudGold,smoothstep(.66,.85,wash+fleck*.11)*.23);
        colour*=.88+pigment*.52+bristle.g*(bristle.b-.5)*.24+under.g*(under.b-.5)*.12;
        // Broad density lighting avoids amplifying individual baked voxel rows.
        // Three filtered light samples add depth to side/back views without a
        // second march or a hard shadow threshold across the porous clouds.
        vec3 gradient=vec3(field(surface+vec3(.8,0,0))-field(surface-vec3(.8,0,0)),field(surface+vec3(0,.8,0))-field(surface-vec3(0,.8,0)),field(surface+vec3(0,0,.8))-field(surface-vec3(0,0,.8)));
        vec3 lightDirection=normalize(vec3(-.3,1.,.4));
        vec3 normal=normalize(mat3(cloudWorld)*(-gradient)+vec3(.0001));
        float diffuse=smoothstep(-.35,.85,dot(normal,lightDirection));
        vec3 localLight=normalize(mat3(cloudInverse)*lightDirection);
        float lightDensity=field(surface+localLight*1.4)*.5+field(surface+localLight*2.8)*.32+field(surface+localLight*4.5)*.18;
        colour=mix(colour,cloudShadow,clamp((.18*(1.-diffuse)+.26*lightDensity)*cloudShadowStrength,0.,.85));
        colour*=.62+.56*diffuse;
        return colour;
      }
      void main(){
        vec3 ray=normalize(cloudPoint-cloudEye);
        vec3 inv=mix(vec3(-1.),vec3(1.),step(vec3(0.),ray))/max(abs(ray),vec3(.00001));
        vec3 a=(cloudMin-cloudEye)*inv,b=(cloudMin+cloudSize-cloudEye)*inv;
        vec3 nearT=min(a,b),farT=max(a,b);
        float begin=max(0.,max(nearT.x,max(nearT.y,nearT.z))),end=min(farT.x,min(farT.y,farT.z));
        if(end<=begin)discard;
        float stride=(end-begin)/64.,opacity=0.,first=end;
        // The vortex opts into four local intervals for rays crossing separate
        // lobes. Other cloud families retain their original front-weighted
        // lighting. Density, opacity and 64 integration samples are unchanged.
        vec3 segmentCentre[${shadingSegments}];float segmentWeight[${shadingSegments}];
        for(int segment=0;segment<${shadingSegments};segment++){segmentCentre[segment]=vec3(0.);segmentWeight[segment]=0.;}
        ${shadingSegments===1?'vec3 skin=vec3(0.);float skinWeight=0.;':''}
        vec3 sight=oilFocus-cameraPosition;float sightLength=max(.001,dot(sight,sight));
        for(int i=0;i<64;i++){
          float distanceAlong=begin+(float(i)+.5)*stride;vec3 p=cloudEye+ray*distanceAlong;
          vec4 sampleField=texture(cloudDensity,(p-cloudMin)/cloudSize);float d=sampleField.r;if(d<.012)continue;
          float broadWeight=mix(.66,.84,cloudBreakup);
          vec3 grainPoint=p*mix(.65,.14,cloudBreakup)-vec3(cloudTime*.09,0.,0.);
          if(cloudWind>.5)grainPoint=vec3(sampleField.g*cloudPathLength*.22-cloudTime*.32,p.y*.18,p.z*.18);
          float grain=broadWeight*noise3(grainPoint)+(1.-broadWeight)*noise3(p*1.8+7.3-vec3(cloudTime*.12,0.,0.));
          // Keep the open corridor from the baked field. A narrower shoulder
          // gives its existing banks a coherent core instead of a broad wash.
          d=smoothstep(.04,mix(.68,.40,cloudWind),d-(1.-grain)*cloudErosion);d*=mix(1.,smoothstep(.25,.68,grain),cloudBreakup);
          vec3 world=(cloudWorld*vec4(p,1.)).xyz;
          d*=smoothstep(.45,2.2,distance(world,cameraPosition));
          float along=dot(world-cameraPosition,sight)/sightLength;
          // A smooth capsule, including its ends. A hard along<1 plane made
          // each ray-march sample reappear at once, producing screen-wide slabs.
          if(oilFocusActive>.5)d*=smoothstep(1.15,2.5,distance(world,cameraPosition+sight*clamp(along,0.,1.)));
          float weight=(1.-opacity)*(1.-exp(-d*stride*cloudOpacity));
          if(opacity<.015&&opacity+weight>=.015)first=distanceAlong;
          segmentCentre[i/${64/shadingSegments}]+=p*weight;segmentWeight[i/${64/shadingSegments}]+=weight;
          ${shadingSegments===1?'float frontWeight=weight*exp(-opacity*5.);skin+=p*frontWeight;skinWeight+=frontWeight;':''}
          opacity+=weight;if(opacity>.975)break;
        }
        if(opacity<.015)discard;
        vec3 colour=vec3(0.);
        for(int segment=0;segment<${shadingSegments};segment++){
          float weight=segmentWeight[segment];if(weight<.00001)continue;
          colour+=shadeCloudSegment(segmentCentre[segment]/weight,${shadingSegments===1?'skin/max(.0001,skinWeight)':'segmentCentre[segment]/weight'})*weight;
        }
        colour/=opacity;
        gl_FragColor=vec4(colour,opacity);
        vec4 depthPoint=projectionMatrix*viewMatrix*cloudWorld*vec4(cloudEye+ray*first,1.);
        gl_FragDepth=clamp(.5+.5*depthPoint.z/depthPoint.w,0.,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  material.userData.paintUniforms=uniforms;material.userData.permeable=true;
  const boundsGeometry=new THREE.BoxGeometry(size.x,size.y,size.z);boundsGeometry.translate(...box.getCenter(new THREE.Vector3()).toArray());
  const mesh=new THREE.Mesh(boundsGeometry,material);
  const centres=[];
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)if(data[(x+nx*(y+ny*z))*channels])centres.push(box.min.x+(x+.5)*step.x,box.min.y+(y+.5)*step.y,box.min.z+(z+.5)*step.z);
  mesh.userData.densitySupport={centres:new Float32Array(centres),step};
  mesh.onBeforeRender=()=>{uniforms.cloudInverse.value.copy(mesh.matrixWorld).invert();uniforms.cloudWorld.value.copy(mesh.matrixWorld);};
  let densityReleased=false;
  material.addEventListener('dispose',()=>{if(!densityReleased){densityReleased=true;density.dispose();}});
  mesh.userData.cloudVolume={resolution,bytes:data.length,channels,method:sculpted?'64-step sculpted density strokes with arc-length pigment flow':'64-step interior density ray integration from authored sweep'};
  return mesh;
}
