// Isolated production-sky render fixtures. These cannot substitute for actual
// player routes: only this separate test renderer has programmable directions.
import {build} from 'esbuild';
import {chromium} from './browser-runtime.mjs';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('.'), temporary=path.resolve('E:/temp',`starhaven-sky-${process.pid}.js`);
const bundle=(await readFile('dist/index.html','utf8')).match(/assets\/(index-[^" ]+\.js)/)[1];
const hash=data=>createHash('sha256').update(data).digest('hex');
const report={build:bundle,sha256:hash(await readFile('dist/assets/'+bundle)),startedAt:new Date().toISOString(),method:'Isolated source-bundled actual StarfieldBackdrop shader/geometry/asset render fixtures. Camera poses here are diagnostic fixtures, not product player input or exploration evidence.',views:[],errors:[],status:'running'};
const shots=path.resolve('screenshots/v03-sky-fixture');await mkdir(shots,{recursive:true});
await build({stdin:{contents:`import * as THREE from 'three';import {StarfieldBackdrop} from './src/scenes/StarfieldBackdrop.js';import {AssetManifest} from './src/config/AssetManifest.js';
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setSize(900,900);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(52,1,.1,650),sky=new StarfieldBackdrop({scene,manifest:AssetManifest.sky});camera.position.set(...AssetManifest.sky.center);
const box=new THREE.Mesh(new THREE.BoxGeometry(5,5,1),new THREE.MeshBasicMaterial({color:'#ddffcc'}));box.position.set(camera.position.x,camera.position.y,camera.position.z-12);box.visible=false;scene.add(box);
window.fixture={ready:false,render(direction,occluder=false){camera.lookAt(camera.position.clone().add(new THREE.Vector3(...direction)));box.visible=occluder;sky.update(0,0);renderer.render(scene,camera);return {sky:sky.getTelemetry(),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};},dispose(){sky.dispose();box.geometry.dispose();box.material.dispose();return {skyRemoved:!sky.group.parent,textureCount:sky.ownedTextures.size};}};
await sky.load();window.fixture.ready=true;`,resolveDir:root,sourcefile:'sky-render-fixture.js'},bundle:true,platform:'browser',format:'esm',mainFields:['browser','module','main'],outfile:temporary,logLevel:'silent'});
report.sourceHashes={};for(const file of ['src/scenes/StarfieldBackdrop.js','src/scenes/sky/SkyShaders.js','src/scenes/sky/PaintedSkyStrokes.js','src/config/AssetManifest.js'])report.sourceHashes[file]=hash(await readFile(file));
const html='<html><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>';
const server=createServer(async(req,res)=>{try{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(temporary));return;}
const decoded=decodeURIComponent(req.url.split('?')[0]);assert.ok(decoded.startsWith('/assets/sky/'));const target=path.resolve(root,'public','.'+decoded);assert.ok(target.startsWith(path.resolve(root,'public/assets/sky')+path.sep));res.setHeader('Content-Type','image/png');res.end(await readFile(target));}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(resolve=>server.listen(4184,'127.0.0.1',resolve));
let browser;
try {
 browser=await chromium.launch({headless:true,executablePath:'C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--use-angle=d3d11','--enable-gpu','--disable-software-rasterizer']});
 const page=await browser.newPage({viewport:{width:900,height:900}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});await page.goto('http://127.0.0.1:4184/');await page.waitForFunction(()=>window.fixture?.ready);
 const cdp=await page.context().newCDPSession(page),seam=Math.PI-AssetLongitude()*Math.PI*2;
 for(const [name,direction,occluder] of [['front',[0,0,-1]],['back',[0,0,1]],['left',[-1,0,0]],['right',[1,0,0]],['north-pole',[0,1,.0001]],['south-pole',[0,-1,.0001]],['longitude-left',[Math.cos(seam-.02),0,Math.sin(seam-.02)]],['longitude-right',[Math.cos(seam+.02),0,Math.sin(seam+.02)]],['opaque-occlusion',[0,0,-1],true]]){
  const observed=await page.evaluate(({direction,occluder})=>window.fixture.render(direction,occluder),{direction,occluder:Boolean(occluder)});assert.equal(observed.sky.nativeBrushwork.count,194000);assert.equal(observed.sky.environment.path,'/assets/sky/world/blue-gold-panorama-v03.png');assert.equal(observed.sky.textureCount,2);const file=path.join(shots,name+'.png');const shot=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true});await writeFile(file,Buffer.from(shot.data,'base64'));report.views.push({name,direction,occluder:Boolean(occluder),observed,file});
 }
 report.disposal=await page.evaluate(()=>window.fixture.dispose());assert.equal(report.disposal.skyRemoved,true);assert.equal(report.disposal.textureCount,0);assert.deepEqual(report.errors,[]);assert.equal(hash(await readFile('dist/assets/'+bundle)),report.sha256);report.status='passed';
}catch(e){report.status='failed';report.error={message:e.message,stack:e.stack};}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await unlink(temporary);report.browserClosed=true;report.finishedAt=new Date().toISOString();await writeFile('tests/v03-sky-fixture.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,views:report.views.length,error:report.error?.message}));process.exitCode=report.status==='passed'?0:1;}
function AssetLongitude(){return .16;} // Fixture view only, current manifest checked above.
