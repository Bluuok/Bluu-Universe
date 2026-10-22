import * as THREE from 'three';
import {BRUSH_ROWS} from '../../vendor/victor-eu/brushAtlas.js';

// Shared actual Victor-EU atlas sampling: overlapped support prevents cell seams.
export const paintBrushGLSL=`
      vec4 oilStamp(vec2 grid,vec2 cell,float rows,vec2 gx,vec2 gy){
        vec2 id=cell;id.y=mod(id.y,rows);
        float seed=oilHash(id),other=oilHash(id+17.3);
        vec2 q=grid-cell-.5-vec2(seed-.5,other-.5)*.60;
        float bend=.14*cos(q.y*4.+seed*6.);
        gx.x+=bend*gx.y;gy.x+=bend*gy.y;
        q.x+=sin(q.y*4.+seed*6.)*.035;
        q.y+=q.x*(seed-.5)*.3;
        gx.y+=gx.x*(seed-.5)*.3;gy.y+=gy.x*(seed-.5)*.3;
        // Short marks follow the sweep with small per-print turns. Transform
        // gradients by the same Jacobian; random row selection has no dFdx.
        float angle=(other-.5)*.50;
        mat2 turn=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
        q=turn*q;gx=turn*gx;gy=turn*gy;
        // Actual Victor-EU bristle prints: R height, G coverage, B tone,
        // A secondary pigment weight. A is never treated as mesh opacity.
        vec2 footprint=vec2(1.25+.3*other,.49+.11*seed);
        vec2 st=vec2(q.x/footprint.x+.48,q.y/footprint.y);
        if(st.x<=0.||st.x>=1.||abs(st.y)>=1.)return vec4(0.);
        float row=floor(seed*${BRUSH_ROWS.toFixed(1)});
        vec2 atlasUV=vec2(clamp(st.x,.002,.998),(row*64.+5.+(clamp(st.y,-1.,1.)*.5+.5)*54.)/512.);
        // Explicit gradients ignore discontinuous row/cell selection. Fade
        // subpixel strokes before atlas mip levels can mix adjacent prints.
        vec2 atlasDX=vec2(gx.x/footprint.x,gx.y/footprint.y*27./512.);
        vec2 atlasDY=vec2(gy.x/footprint.x,gy.y/footprint.y*27./512.);
        vec4 ink=textureGrad(oilBrushAtlas,atlasUV,atlasDX,atlasDY);
        float edge=smoothstep(0.,.035,st.x)*(1.-smoothstep(.965,1.,st.x))*(1.-smoothstep(.91,1.,abs(st.y)));
        float resolved=1.-smoothstep(.32,.85,max(length(gx),length(gy)));
        ink.rg*=edge*resolved;
        return ink;
      }
      vec4 oilPrint(vec2 uv,float density,float rows){
        vec2 grid=vec2(uv.x*density+.36*sin(uv.y*6.2831853*7.+sin(uv.x*.31))+.21*sin(uv.x*.8),
          uv.y*rows+.25*sin(uv.x*1.35)+.23*sin(uv.y*6.2831853*5.+uv.x*.12));
        vec2 cell=floor(grid),gx=dFdx(grid),gy=dFdy(grid);
        vec3 pigment=vec3(0.);float coverage=0.;
        // Complete support neighbourhood: including the bounded .25-radian
        // turn, support plus jitter/shear remains below 1.5 cells on each
        // axis. A 3x3 set retains every print across floor() changes.
        // The next cell beyond this set is farther than the maximum footprint
        // + jitter + shear; zero-support stamps skip the atlas fetch above.
        for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
          vec4 ink=oilStamp(grid,cell+vec2(float(x),float(y)),rows,gx,gy);
          pigment+=ink.rba*ink.g;coverage+=ink.g;
        }
        pigment/=max(.0001,coverage);
        return vec4(pigment.x,min(1.,coverage),pigment.y,pigment.z);
      }
`;

// Material adaptation only; geometry and owned resources stay with VortexField.
export function makeVortexPaintMaterial(profile,{cloud=false,brushAtlas}={}) {
  const paintUniforms={oilPaintMap:{value:null},oilPaintLoaded:{value:0},oilBrushAtlas:{value:brushAtlas},
    oilStrokeScale:{value:profile.strokeScale??1},oilStrokeStrength:{value:profile.strokeStrength??.28},
    oilRelief:{value:profile.relief??.014},oilAccent:{value:new THREE.Color(profile.paintAccent||profile.crest||profile.color)},
    oilShadow:{value:new THREE.Color(profile.paintShadow||profile.shadow||'#98632d')},
    oilLight:{value:new THREE.Color(profile.paintLight||'#c5ba8b')},oilEmission:{value:profile.emissiveIntensity??.4},
    oilFocus:{value:new THREE.Vector3()},oilFocusActive:{value:0},oilHalo:{value:profile.halo?1:0}};
  const material=new THREE.MeshStandardMaterial({color:cloud?'#ffffff':profile.color,vertexColors:cloud,
    roughness:.96,metalness:0,envMapIntensity:.12,emissive:profile.emissive||profile.color,emissiveIntensity:profile.emissiveIntensity??.4,
    transparent:cloud,opacity:profile.opacity??1,alphaTest:cloud?.025:0,
    depthWrite:true,depthTest:true,side:THREE.FrontSide});
  if(profile.halo){material.blending=THREE.AdditiveBlending;material.depthWrite=false;}
  material.onBeforeCompile=shader=>{
    shader.uniforms.oilScale={value:profile.paintScale||1};
    Object.assign(shader.uniforms,paintUniforms);
    shader.vertexShader='varying vec2 vOilUV; varying vec3 vOilWorld; varying vec3 vOilLocal; varying vec3 vOilNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOilUV=uv; vOilLocal=transformed; vOilNormal=normal; vOilWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=`varying vec2 vOilUV; varying vec3 vOilWorld; varying vec3 vOilLocal; varying vec3 vOilNormal; uniform float oilScale;
      uniform sampler2D oilPaintMap; uniform float oilPaintLoaded;
      uniform sampler2D oilBrushAtlas; uniform float oilStrokeScale; uniform float oilStrokeStrength; uniform float oilRelief; uniform vec3 oilAccent; uniform vec3 oilShadow; uniform vec3 oilLight; uniform float oilEmission;
      uniform vec3 oilFocus; uniform float oilFocusActive; uniform float oilHalo;
      float oilHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float oilCloud(vec3 p){
        vec3 cell=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        float z0=cell.z*37.17,z1=z0+37.17;
        return mix(mix(mix(oilHash(cell.xy+z0),oilHash(cell.xy+vec2(1.,0.)+z0),f.x),
          mix(oilHash(cell.xy+vec2(0.,1.)+z0),oilHash(cell.xy+vec2(1.)+z0),f.x),f.y),
          mix(mix(oilHash(cell.xy+z1),oilHash(cell.xy+vec2(1.,0.)+z1),f.x),
          mix(oilHash(cell.xy+vec2(0.,1.)+z1),oilHash(cell.xy+vec2(1.)+z1),f.x),f.y),f.z);
      }
      float paintPatch(vec2 p,vec2 cell){
        vec2 seed=vec2(oilHash(cell),oilHash(cell+17.3));
        float angle=(seed.x-.5)*1.4;mat2 turn=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
        // Tiny sky-only brush fragments, away from cypress, village and star
        // centres. Affine sampling preserves open brush marks; the former
        // periodic sine crop folded a single large swirl into wood knots.
        vec2 crop=vec2(.43,.79)+(seed-.5)*vec2(.10,.045)+turn*(p-cell)*.018;
        // Derivatives must come from continuous surface coordinates, not the
        // random crop offset, which otherwise picks blurry mip levels at tile
        // edges and reveals square patches during close inspection.
        vec2 dx=turn*dFdx(p)*.018,dy=turn*dFdy(p)*.018;
        return dot(textureGrad(oilPaintMap,crop,dx,dy).rgb,vec3(.2126,.7152,.0722));
      }
      float sourcePaint(vec2 p){
        vec2 cell=floor(p),f=fract(p),blend=f*f*(3.-2.*f);
        return mix(mix(paintPatch(p,cell),paintPatch(p,cell+vec2(1.,0.)),blend.x),
          mix(paintPatch(p,cell+vec2(0.,1.)),paintPatch(p,cell+vec2(1.)),blend.x),blend.y);
      }
      ${profile.flowStroke?paintBrushGLSL.replace(`vec2 grid=vec2(uv.x*density+.36*sin(uv.y*6.2831853*7.+sin(uv.x*.31))+.21*sin(uv.x*.8),
          uv.y*rows+.25*sin(uv.x*1.35)+.23*sin(uv.y*6.2831853*5.+uv.x*.12));`,`vec2 grid=vec2(uv.x*density,uv.y*rows);`):paintBrushGLSL}
      `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 paintUV=vec2(vOilUV.x*oilScale,vOilUV.y);
      vec3 paintWeights=pow(abs(normalize(vOilNormal)),vec3(4.));paintWeights/=max(.001,dot(paintWeights,vec3(1.)));
      vec4 dab,under;
      ${profile.flowStroke?`dab=oilPrint(paintUV,1.65*oilStrokeScale,5.);
      under=oilPrint(paintUV+vec2(.31,.035),.85*oilStrokeScale,3.);`:cloud?`dab=oilPrint(paintUV,3.15*oilStrokeScale,27.);
      under=oilPrint(paintUV+vec2(.31,.018),1.55*oilStrokeScale,19.);`:`
      // The spherical core uses local triplanar marks, with no UV meridian
      // or polar chart. Each projection stays fixed when the camera moves.
      vec3 coat=vOilLocal*oilStrokeScale;
      dab=oilPrint(coat.yz,1.3,3.)*paintWeights.x+oilPrint(coat.zx+7.3,1.3,3.)*paintWeights.y+oilPrint(coat.xy+3.1,1.3,3.)*paintWeights.z;
      under=oilPrint(coat.yz+2.1,.7,1.8)*paintWeights.x+oilPrint(coat.zx+9.4,.7,1.8)*paintWeights.y+oilPrint(coat.xy+5.2,.7,1.8)*paintWeights.z;`}
      // Object-space cloud masses break long parallel bands without following
      // the eye. The borrowed painting and brush atlas supply fine detail.
      // The same fixed 3D pigment masses read from the side and back, unlike
      // a facing sprite or a chart repeated around a latitude. The coarse
      // wash, broken mid-scale paint and real bristles have distinct sizes.
      vec3 washPosition=vOilLocal*.27;
      float warp=oilCloud(washPosition*.63+4.7);
      float cloudMass=.58*oilCloud(washPosition+vec3(warp*1.8))+.42*oilCloud(washPosition*2.7+7.3);
      float brokenPaint=oilCloud(vOilLocal*vec3(1.3,2.8,1.9)+warp*2.);
      float pigment=${profile.flowStroke?'.88+.18*cloudMass':'.64+.60*cloudMass'};
      float sourceGrain=.25;
      if(oilPaintLoaded>.5){
        // Borrow the already loaded, licensed sky-only pigment. Stochastic
        // affine patches blend continuously across all three projections.
        vec3 paintPosition=vOilLocal*${cloud?'1.1':'1.4'};
        sourceGrain=sourcePaint(paintPosition.yz)*paintWeights.x+sourcePaint(paintPosition.zx+7.3)*paintWeights.y+sourcePaint(paintPosition.xy+3.1)*paintWeights.z;
        pigment*=${profile.flowStroke?'.90+sourceGrain*.22':'.72+sourceGrain*.95'};
      }
      diffuseColor.rgb*=pigment;
      ${cloud?`float wash=smoothstep(.24,.72,cloudMass);
      diffuseColor.rgb=mix(oilShadow*(.64+.5*sourceGrain),diffuseColor.rgb*1.3,wash);
      float dryGold=smoothstep(.60,.79,cloudMass+.12*(brokenPaint-.5));
      diffuseColor.rgb=mix(diffuseColor.rgb,oilLight*(.55+.65*sourceGrain),dryGold*.40);`:profile.flowStroke?`diffuseColor.rgb*=.92+.12*sourceGrain;`:`
      float coreWash=smoothstep(.23,.76,cloudMass+.22*(brokenPaint-.5));
      diffuseColor.rgb=mix(oilShadow*(.88+.25*sourceGrain),diffuseColor.rgb*1.16,.30+.70*coreWash);
      diffuseColor.rgb=mix(diffuseColor.rgb,oilLight,under.g*under.a*.16);`}
      diffuseColor.rgb*=1.+oilStrokeStrength*(dab.g*(dab.b-.42)*.70+under.g*(under.b-.5)*.45);
      diffuseColor.rgb=mix(diffuseColor.rgb,oilAccent*(.82+.25*dab.b)*pigment,dab.g*dab.a*oilStrokeStrength*.10);
      ${cloud?`float nearEye=smoothstep(.8,3.8,distance(vOilWorld,cameraPosition));
      float facing=abs(dot(normalize(vNormal),normalize(vViewPosition)));
      // Fade the grazing rim, not the whole curved surface. The old facing
      // power made a broad half-transparent sheet that read as grey plastic.
      float rimStart=.06+.15*(1.-cloudMass);
      float paintedEdge=smoothstep(rimStart,rimStart+.24,facing);
      float softEdge=mix(paintedEdge,pow(facing,.85),oilHalo);
      vec3 sight=oilFocus-cameraPosition;float along=dot(vOilWorld-cameraPosition,sight)/max(.001,dot(sight,sight));
      float sightFade=1.;
      if(oilFocusActive>.5&&along>0.&&along<1.)sightFade=smoothstep(1.3,2.8,distance(vOilWorld,cameraPosition+sight*along));
      // Break the formerly unbroken smooth outline with stable pigment
      // coverage. Keep the interior substantial and its passage permeable.
      float edgePaint=smoothstep(.17,.54,cloudMass+.21*(brokenPaint-.5));
      diffuseColor.a*=nearEye*softEdge*sightFade*mix(.30,1.,edgePaint)*(.88+.12*max(dab.g,under.g));`:''}`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float relief=(dab.r*dab.g+under.r*under.g*.45)*oilRelief+sourceGrain*${profile.flowStroke?'.001':'.005'};
      vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition),rx=cross(sy,normal),ry=cross(normal,sx);
      float determinant=dot(sx,rx);
      ${profile.flowStroke?`// Keep real bristle relief without grazing-angle normal spikes.
      vec3 paintSlope=sign(determinant)*(dFdx(relief)*rx+dFdy(relief)*ry)/max(abs(determinant),1e-9);
      paintSlope*=.22/sqrt(.22*.22+dot(paintSlope,paintSlope));
      normal=normalize(normal-paintSlope);`:`normal=normalize(abs(determinant)*normal-sign(determinant)*(dFdx(relief)*rx+dFdy(relief)*ry));`}`);
    // Emission follows the painted pigment instead of filling every shadow
    // with one uniform blue/yellow. Lighting still describes the real volume.
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance=diffuseColor.rgb*oilEmission;');
  };
  material.userData.paintUniforms=paintUniforms;
  material.userData.permeable=cloud;
  material.customProgramCacheKey=()=>profile.flowStroke?'vortex-bristle-flow-v3':cloud?'vortex-bristle-cloud-v10':'vortex-bristle-solid-v10';
  return material;
}

