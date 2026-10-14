import {build} from 'vite';
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';

// Temporary instrumented copy of the full app. Product source and frozen builds
// are unchanged; the copy still has exactly its original renderer and RAF.
const out=process.env.SEAM_DIAG_OUT||'E:/temp/starhaven-rc50-seam-diagnostic';
await mkdir(out,{recursive:true});
const injection=`
window.__cloudProbe={configure({band='both',mode='original',reverse=false}){
  for(const [index,{id,mesh}]of space.vortex.bands.entries()){
    mesh.visible=band==='both'||band===id;mesh.renderOrder=reverse?-2-index:-2+index;
    const m=mesh.material;
    m.userData.originalFragment??=m.fragmentShader;
    m.fragmentShader=m.userData.originalFragment;
    if(mode==='flat-light')m.fragmentShader=m.fragmentShader.replace('float diffuse=smoothstep(-.35,.85,dot(normal,lightDirection));','float diffuse=.65;').replace('float lightDensity=field(surface+localLight*1.4)*.5+field(surface+localLight*2.8)*.32+field(surface+localLight*4.5)*.18;','float lightDensity=.2;');
    if(mode==='flat-pigment')m.fragmentShader=m.fragmentShader.replace('vec3 colour=mix(cloudBlue,cloudLight,smoothstep(.27,.78,wash)*.30);','vec3 colour=cloudBlue;').replace('colour=mix(colour,cloudGold,smoothstep(.66,.85,wash+fleck*.11)*.23);','').replace('colour*=.88+pigment*.52+bristle.g*(bristle.b-.5)*.24+under.g*(under.b-.5)*.12;','');
    if(mode==='flat-colour')m.fragmentShader=m.fragmentShader.replace('gl_FragColor=vec4(colour,opacity);','gl_FragColor=vec4(cloudBlue,opacity);');
    if(mode==='normal')m.fragmentShader=m.fragmentShader.replace('gl_FragColor=vec4(colour,opacity);','gl_FragColor=vec4(normal*.5+.5,opacity);');
    if(mode==='centre')m.fragmentShader=m.fragmentShader.replace('gl_FragColor=vec4(colour,opacity);','gl_FragColor=vec4((centre-cloudMin)/cloudSize,opacity);');
    if(mode==='skin')m.fragmentShader=m.fragmentShader.replace('gl_FragColor=vec4(colour,opacity);','gl_FragColor=vec4((surface-cloudMin)/cloudSize,opacity);');
    if(mode==='full-march')m.fragmentShader=m.fragmentShader.replace('if(opacity>.975)break;','');
    if(mode==='no-grain')m.fragmentShader=m.fragmentShader.replace('d=smoothstep(.04,mix(.68,.40,cloudWind),d-(1.-grain)*cloudErosion);','d=smoothstep(.04,mix(.68,.40,cloudWind),d);');
    if(mode==='front-point')m.fragmentShader=m.fragmentShader.replace('centre/=opacity;','centre=cloudEye+ray*(first+stride);').replace('vec3 surface=skin/max(.0001,skinWeight);','vec3 surface=centre;');
    if(mode==='skin-pigment')m.fragmentShader=m.fragmentShader.replace('centre/=opacity;','centre=skin/max(.0001,skinWeight);');
    if(mode==='soft-normal')m.fragmentShader=m.fragmentShader.replace('vec3 normal=normalize(mat3(cloudWorld)*(-gradient)+vec3(.0001));','vec3 g=mat3(cloudWorld)*(-gradient);vec3 normal=g/(length(g)+.04);');
    if(mode==='gradient')m.fragmentShader=m.fragmentShader.replace('gl_FragColor=vec4(colour,opacity);','gl_FragColor=vec4(abs(gradient)*4.,opacity);');
    if(mode==='surface-density')m.fragmentShader=m.fragmentShader.replace('gl_FragColor=vec4(colour,opacity);','gl_FragColor=vec4(vec3(field(surface)),opacity);');
    if(mode==='segmented'||mode==='segmented-4'){
      m.fragmentShader=m.fragmentShader.replace('vec3 sight=oilFocus-cameraPosition;', 'vec3 segmentCentre[8];float segmentWeight[8];for(int s=0;s<8;s++){segmentCentre[s]=vec3(0.);segmentWeight[s]=0.;}vec3 sight=oilFocus-cameraPosition;');
      m.fragmentShader=m.fragmentShader.replace('if(opacity<.015&&opacity+weight>=.015)first=distanceAlong;','segmentCentre[i/8]+=p*weight;segmentWeight[i/8]+=weight;if(opacity<.015&&opacity+weight>=.015)first=distanceAlong;');
      m.fragmentShader=m.fragmentShader.replace('vec4 centreField=texture(cloudDensity,(centre-cloudMin)/cloudSize);','vec3 combinedColour=vec3(0.);for(int segment=0;segment<8;segment++){if(segmentWeight[segment]<.00001)continue;centre=segmentCentre[segment]/segmentWeight[segment];skin=centre;skinWeight=1.;vec4 centreField=texture(cloudDensity,(centre-cloudMin)/cloudSize);');
      m.fragmentShader=m.fragmentShader.replace('colour*=.62+.56*diffuse;','colour*=.62+.56*diffuse;combinedColour+=colour*segmentWeight[segment];}vec3 colour=combinedColour/opacity;');
      if(mode==='segmented-4')m.fragmentShader=m.fragmentShader.replaceAll('segmentCentre[8]','segmentCentre[4]').replaceAll('segmentWeight[8]','segmentWeight[4]').replaceAll('s<8','s<4').replaceAll('i/8','i/16').replaceAll('segment<8','segment<4');
    }
    m.needsUpdate=true;
    if(!mesh.userData.timeLocked){const before=mesh.onBeforeRender;mesh.onBeforeRender=function(...args){before.apply(this,args);m.uniforms.cloudTime.value=30;};mesh.userData.timeLocked=true;}
  }
  return space.vortex.bands.map(({id,mesh})=>({id,visible:mesh.visible,renderOrder:mesh.renderOrder}));
}};
`;
await build({logLevel:'error',plugins:[{name:'temporary-cloud-seam-probe',transform(code,id){if(id.replaceAll('\\','/').endsWith('/src/main.js'))return code+injection;}}],build:{outDir:path.join(out,'site'),emptyOutDir:false}});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.glb':'model/gltf-binary'};
const server=createServer(async(req,res)=>{try{const rel=decodeURIComponent(new URL(req.url,'http://local').pathname);const file=path.resolve(out,'site','.'+(rel==='/'?'/index.html':rel));if(!file.startsWith(path.resolve(out,'site')+path.sep))throw Error('Outside');const s=await stat(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':s.size});createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--enable-gpu','--disable-software-rasterizer','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const report={at:new Date().toISOString(),method:'Instrumented temporary copy of RC50 full app; fixed side camera/player, cloud time 30, shader isolation. No product mutation, flight or acceptance claim.',captures:[],errors:[],browserClosed:false};
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.starhaven?.ready,{timeout:120000});
 const ref=JSON.parse(await readFile('E:/temp/starhaven-rc29-main-vortex/report.json','utf8'));
 const view=ref.checks.find(v=>v.name==='06-vortex-side-look');
 await page.evaluate(v=>{starhaven.inspect.placeFlightFixture({position:v.player,yaw:v.flight.yaw});starhaven.inspect.framePosition({position:v.camera,target:v.framing.avoidance.focus,duration:.1});},view);
 await page.waitForFunction(()=>!starhaven.cameraProgress.transition);
 await page.waitForTimeout(1000);
 const cases=JSON.parse(process.env.SEAM_DIAG_CASES||'null')||[{id:'01-both',band:'both'},{id:'02-main',band:'main'},{id:'03-wing',band:'wing'},{id:'04-reverse',reverse:true},...['flat-light','flat-pigment','flat-colour','normal'].map((mode,i)=>({id:`${i+5}-${mode}`,mode})),{id:'09-wing-flat-light',band:'wing',mode:'flat-light'},{id:'10-main-flat-light',band:'main',mode:'flat-light'}];
 for(const c of cases){const applied=await page.evaluate(c=>__cloudProbe.configure(c),c);await page.waitForTimeout(250);const screenshot=path.join(out,`${c.id}.png`);await page.screenshot({path:screenshot});const cadence=await page.evaluate(async()=>{const gaps=[];let previous;await new Promise(resolve=>{function tick(now){if(previous!==undefined)gaps.push(now-previous);previous=now;if(gaps.length===240)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);});gaps.sort((a,b)=>a-b);return{median:gaps[120],p95:gaps[228],max:gaps[239]};});report.captures.push({...c,applied,screenshot,cadence});console.log(JSON.stringify({id:c.id,cadence}));}
 report.status=report.errors.length?'errors':'captured';
}finally{await browser.close();report.browserClosed=true;await new Promise(resolve=>server.close(resolve));await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,errors:report.errors,out}));}
