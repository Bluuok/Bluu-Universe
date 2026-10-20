// Passive display-frame sampling on the real production page. This measures
// Chromium rAF intervals, not isolated GPU time or physical monitor refresh.
import {chromium} from './browser-runtime.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const liveURL=process.env.PERFORMANCE_URL||'http://127.0.0.1:4202/';
const build=(await(await fetch(liveURL)).text()).match(/assets\/(index-[^" ]+\.js)/)[1];
const sha=async()=>createHash('sha256').update(Buffer.from(await(await fetch(new URL('assets/'+build,liveURL))).arrayBuffer())).digest('hex');
const report={build,sha256:await sha(),startedAt:new Date().toISOString(),method:'Warm production page; passive requestAnimationFrame interval samples, trusted free mouse flight/orbit. No product coordinates/state/camera mutations. Not GPU timer queries, OS display color, or a cross-device FPS guarantee.',phases:[],errors:[],status:'running'};
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--use-angle=d3d11','--enable-gpu','--disable-software-rasterizer']});
try {
 report.browser=await browser.version();const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:Number(process.env.PERFORMANCE_DPR||1)});
 await page.addInitScript(()=>{window.__performanceInputs=[];for(const type of ['keydown','keyup','pointerdown','pointerup','pointermove'])window.addEventListener(type,e=>{window.__performanceInputs.push({type,code:e.code,trusted:e.isTrusted,time:performance.now()});},true);});
 page.on('pageerror',e=>report.errors.push({type:'page',message:e.message}));page.on('console',m=>{if(m.type()==='error')report.errors.push({type:'console',message:m.text()});});page.on('requestfailed',r=>report.errors.push({type:'request',url:r.url(),message:r.failure()?.errorText}));
 await page.goto(liveURL,{waitUntil:'domcontentloaded'});
 if(process.env.PERFORMANCE_LOADING_INPUT==='1'){
  await page.waitForFunction(()=>window.starhaven);
  const before=await page.evaluate(()=>({ready:window.starhaven.ready,player:window.starhaven.player}));assert.equal(before.ready,false,'Loading input test missed the loading phase');
  await page.keyboard.down('w');await page.waitForFunction(()=>window.starhaven.ready);await page.waitForTimeout(500);
  const after=await page.evaluate(()=>({player:window.starhaven.player,keys:window.starhaven.keys,velocity:window.starhaven.velocity}));await page.keyboard.up('w');
  report.loadingInput={before,after};assert.deepEqual(after.keys,[]);assert.deepEqual(after.velocity,[0,0,0]);assert.deepEqual(after.player,before.player);
 }
 await page.waitForFunction(()=>window.starhaven?.ready);report.boot=await page.evaluate(()=>({readyAtMs:performance.now(),warmup:window.starhaven.rendering.gpuWarmup??null}));await page.waitForTimeout(3000);
 report.conditions=await page.evaluate(()=>{const c=document.getElementById('world'),g=c.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return {viewport:[innerWidth,innerHeight],canvas:[c.width,c.height],dpr:devicePixelRatio,contextAttributes:g.getContextAttributes(),maximumTextureSize:g.getParameter(g.MAX_TEXTURE_SIZE),renderer:g.getParameter(e.UNMASKED_RENDERER_WEBGL),parallelShaderCompile:Boolean(g.getExtension('KHR_parallel_shader_compile')),rendering:window.starhaven.rendering,sky:window.starhaven.sky.environment,brushes:window.starhaven.sky.nativeBrushwork,vortex:window.starhaven.vortex};});
 assert.match(report.conditions.renderer,/NVIDIA.*D3D11/);
 assert.ok(report.conditions.sky.textureSize.every(size=>size<=report.conditions.maximumTextureSize),
   'Loaded panorama exceeds the GPU texture limit; Three would resize the bitmap');
 const sample=()=>page.evaluate(()=>new Promise(resolve=>{let previous=null,lastCounts=null;const intervals=[],initializations=[];
 function collect(now){if(previous!==null)intervals.push(now-previous);previous=now;
 const r=window.starhaven.rendering,counts=[r.programs,r.textures,r.geometries];
 if(!lastCounts||counts.some((v,i)=>v!==lastCounts[i])){initializations.push({frame:intervals.length,programs:r.programs,textures:r.textures,geometries:r.geometries,calls:r.calls,now});lastCounts=counts;}
 if(intervals.length>=180)resolve({intervals,initializations});else requestAnimationFrame(collect);
 }requestAnimationFrame(collect);}));
 const record=(name,data)=>{const {intervals,initializations}=data;const sorted=[...intervals].sort((a,b)=>a-b),total=intervals.reduce((a,b)=>a+b,0);report.phases.push({name,initializations,sampleCount:intervals.length,intervalsMs:intervals,meanIntervalMs:total/intervals.length,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:sorted.at(-1),measuredMeanFramesPerSecond:intervals.length*1000/total});};
 record('warmed studio overview',await sample());

 const pilot=()=>page.evaluate(()=>({player:window.starhaven.player,flight:window.starhaven.flight}));
 const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
 const inverse=(rate,maxRate,f)=>Math.sign(rate)*(f.deadZone+(1-f.deadZone)*Math.pow(Math.min(1,Math.abs(rate)/maxRate),1/(f.responseExponent??1.35)));
 await page.mouse.move(720,480);
 const target=[-52,22,-43],start=Date.now();let holding=false,flightSample=null;
 while(Date.now()-start<25000){
  const state=await pilot(),d=target.map((v,i)=>v-state.player[i]),distance=Math.hypot(...d);
  if(distance<6)break;
  const yaw=Math.atan2(-d[0],-d[2]),pitch=Math.atan2(d[1],Math.hypot(d[0],d[2])),ye=wrap(yaw-state.flight.yaw),pe=pitch-state.flight.pitch;
  const x=inverse(-ye*2,state.flight.turnRate,state.flight),y=inverse(-pe*2,state.flight.pitchRate,state.flight);
  await page.mouse.move(720+Math.max(-.88,Math.min(.88,x))*(state.flight.pointerRangePx??720),480+Math.max(-.75,Math.min(.75,y))*(state.flight.pointerRangePx??480));
  if(!holding&&Math.abs(ye)<.4&&Math.abs(pe)<.3){flightSample=sample();await page.keyboard.down('w');holding=true;}
  await page.waitForTimeout(140);
 }
 assert.ok(holding&&flightSample,'No actual powered flight began');
 await page.keyboard.up('w');await page.mouse.move(720,480);await page.keyboard.down('s');await page.waitForTimeout(1000);await page.keyboard.up('s');
 record('normal-spawn real W flight toward cloud gate',await flightSample);
 report.cloudPosition=await page.evaluate(()=>window.starhaven.player);
 report.cloudDistance=Math.hypot(...report.cloudPosition.map((v,i)=>v-[-52,22,-43][i]));
 assert.ok(report.cloudDistance<24,'The real-input route did not reach the cloud-gate region');
 const motionShots=path.resolve(process.env.PERFORMANCE_SHOTS||'E:/temp/starhaven-alpha11-rc6-performance');await mkdir(motionShots,{recursive:true});
 const motionState=()=>page.evaluate(()=>({player:window.starhaven.player,camera:window.starhaven.camera,velocity:window.starhaven.velocity,route:window.starhaven.route}));
 report.flowMotion={before:await motionState(),beforeScreenshot:path.join(motionShots,'flow-before.png')};await page.screenshot({path:report.flowMotion.beforeScreenshot});
 record('warmed nearby cloud gate',await sample());
 report.flowMotion.after=await motionState();report.flowMotion.afterScreenshot=path.join(motionShots,'flow-after.png');await page.screenshot({path:report.flowMotion.afterScreenshot});
 report.flowMotion.playerDisplacement=Math.hypot(...report.flowMotion.after.player.map((v,i)=>v-report.flowMotion.before.player[i]));report.flowMotion.cameraDisplacement=Math.hypot(...report.flowMotion.after.camera.map((v,i)=>v-report.flowMotion.before.camera[i]));

 const orbit=sample();await page.mouse.move(330,480);await page.waitForTimeout(3100);await page.mouse.move(720,480);record('free mouse turn among cloud currents',await orbit);
 report.finalRendering=await page.evaluate(()=>window.starhaven.rendering);

 report.inputs=await page.evaluate(()=>window.__performanceInputs);assert.ok(report.inputs.length&&report.inputs.every(e=>e.trusted));
 const shots=path.resolve(process.env.PERFORMANCE_SHOTS||'E:/temp/starhaven-alpha11-rc6-performance');await mkdir(shots,{recursive:true});report.screenshot=path.join(shots,'warmed-orbit.png');await page.screenshot({path:report.screenshot});
 assert.deepEqual(report.errors,[]);assert.equal(await sha(),report.sha256);report.status='passed';
}catch(e){report.status='failed';report.error={message:e.message,stack:e.stack};}
finally{await browser.close();report.browserClosed=true;report.finishedAt=new Date().toISOString();await writeFile(process.env.PERFORMANCE_REPORT||'tests/v11-rc6-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,phases:report.phases.map(({name,medianMs,p95Ms,maxMs,initializations,measuredMeanFramesPerSecond})=>({name,medianMs,p95Ms,maxMs,initializations,measuredMeanFramesPerSecond})),error:report.error?.message}));process.exitCode=report.status==='passed'?0:1;}
