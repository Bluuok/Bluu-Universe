// Passive display-frame sampling on the real production page. This measures
// Chromium rAF intervals, not isolated GPU time or physical monitor refresh.
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const build=(await readFile('dist/index.html','utf8')).match(/assets\/(index-[^" ]+\.js)/)[1];
const sha=()=>readFile('dist/assets/'+build).then(b=>createHash('sha256').update(b).digest('hex'));
const report={build,sha256:await sha(),startedAt:new Date().toISOString(),method:'Warm production page; passive requestAnimationFrame interval samples, trusted pointer orbit. No product coordinates/state/camera mutations. Not GPU timer queries, OS display color, or a cross-device FPS guarantee.',phases:[],errors:[],status:'running'};
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--use-angle=d3d11','--enable-gpu','--disable-software-rasterizer']});
try {
 report.browser=await browser.version();const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:Number(process.env.PERFORMANCE_DPR||1)});
 await page.addInitScript(()=>{window.__performanceInputs=[];for(const type of ['pointerdown','pointerup','pointermove'])window.addEventListener(type,e=>{if(e.buttons||type!=='pointermove')window.__performanceInputs.push({type,trusted:e.isTrusted,time:performance.now()});},true);});
 page.on('pageerror',e=>report.errors.push({type:'page',message:e.message}));page.on('console',m=>{if(m.type()==='error')report.errors.push({type:'console',message:m.text()});});page.on('requestfailed',r=>report.errors.push({type:'request',url:r.url(),message:r.failure()?.errorText}));
 await page.goto('http://127.0.0.1:4175/');await page.waitForFunction(()=>window.starhaven?.ready);await page.waitForTimeout(3000);
 report.conditions=await page.evaluate(()=>{const c=document.getElementById('world'),g=c.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return {viewport:[innerWidth,innerHeight],canvas:[c.width,c.height],dpr:devicePixelRatio,contextAttributes:g.getContextAttributes(),maximumTextureSize:g.getParameter(g.MAX_TEXTURE_SIZE),renderer:g.getParameter(e.UNMASKED_RENDERER_WEBGL),rendering:window.starhaven.rendering,sky:window.starhaven.sky.environment,brushes:window.starhaven.sky.nativeBrushwork,vortex:window.starhaven.vortex};});
 assert.match(report.conditions.renderer,/NVIDIA.*D3D11/);
 assert.ok(report.conditions.sky.textureSize.every(size=>size<=report.conditions.maximumTextureSize),
   'Loaded panorama exceeds the GPU texture limit; Three would resize the bitmap');
 const sample=()=>page.evaluate(()=>new Promise(resolve=>{let previous=null;const intervals=[];function collect(now){if(previous!==null)intervals.push(now-previous);previous=now;if(intervals.length>=180)resolve(intervals);else requestAnimationFrame(collect);}requestAnimationFrame(collect);}));
 const record=(name,intervals)=>{const sorted=[...intervals].sort((a,b)=>a-b),total=intervals.reduce((a,b)=>a+b,0);report.phases.push({name,sampleCount:intervals.length,intervalsMs:intervals,meanIntervalMs:total/intervals.length,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:sorted.at(-1),measuredMeanFramesPerSecond:intervals.length*1000/total});};
 record('warmed studio overview',await sample());
 const orbit=sample();for(const dx of [-350,350,-500,500,-350,350]){await page.mouse.move(800,420);await page.mouse.down({button:'right'});await page.mouse.move(800+dx,460,{steps:24});await page.mouse.up({button:'right'});await page.waitForTimeout(450);}record('trusted continuous mouse orbit',await orbit);
 report.inputs=await page.evaluate(()=>window.__performanceInputs);assert.ok(report.inputs.length&&report.inputs.every(e=>e.trusted));
 const shots=path.resolve(process.env.PERFORMANCE_SHOTS||'screenshots/v03-performance-review');await mkdir(shots,{recursive:true});report.screenshot=path.join(shots,'warmed-orbit.png');await page.screenshot({path:report.screenshot});
 assert.deepEqual(report.errors,[]);assert.equal(await sha(),report.sha256);report.status='passed';
}catch(e){report.status='failed';report.error={message:e.message,stack:e.stack};}
finally{await browser.close();report.browserClosed=true;report.finishedAt=new Date().toISOString();await writeFile(process.env.PERFORMANCE_REPORT||'tests/v03-performance-review.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,phases:report.phases.map(({name,medianMs,p95Ms,measuredMeanFramesPerSecond})=>({name,medianMs,p95Ms,measuredMeanFramesPerSecond})),error:report.error?.message}));process.exitCode=report.status==='passed'?0:1;}
