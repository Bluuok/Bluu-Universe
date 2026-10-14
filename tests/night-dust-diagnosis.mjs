import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const url=process.env.FLOW_URL||'http://127.0.0.1:4203/',out=process.env.FLOW_OUT||'E:/temp/starhaven-alpha11-rc7-flow';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--use-angle=d3d11','--enable-gpu','--disable-software-rasterizer','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:out,size:{width:1440,height:960}}});
await context.addInitScript(()=>{window.__routeInputs=[];for(const type of ['keydown','keyup','pointermove','pointerdown','pointerup','click','blur','focus'])window.addEventListener(type,e=>window.__routeInputs.push({type,code:e.code,trusted:e.isTrusted,x:e.clientX,y:e.clientY,at:performance.now()}),true);});
const page=await context.newPage(),report={method:'Normal spawn, real Playwright keyboard/mouse; page evaluation reads only. Home resets only through visible UI/keyboard.',url,started:new Date().toISOString(),checks:[],route:[],errors:[]},pressed=new Set();
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});page.on('requestfailed',r=>report.errors.push(r.url()+': '+r.failure()?.errorText));
const sleep=ms=>page.waitForTimeout(ms);
const snap=()=>page.evaluate(()=>{const a=window.starhaven;return{state:a.state,player:a.player,velocity:a.velocity,flight:a.flight,route:a.route,keys:a.keys,project:a.currentProject,camera:a.camera,framing:a.framing,collision:a.inspect.collision().lastSolve};});
async function keys(wanted=[]){for(const k of [...pressed])if(!wanted.includes(k)){await page.keyboard.up(k);pressed.delete(k);}for(const k of wanted)if(!pressed.has(k)){await page.keyboard.down(k);pressed.add(k);}}
async function neutral(){await page.mouse.move(720,480);}
async function shot(name){await page.screenshot({path:path.join(out,name+'.png')});const state=await snap();report.checks.push({name,...state});return state;}
async function brake(){await neutral();await keys(['s']);await sleep(950);await keys([]);}
async function home(){await keys([]);await page.keyboard.press('h');await neutral();await sleep(1000);}
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
const inv=(rate,maxRate,limit,flight={})=>{const dz=flight.deadZone??.14,exponent=flight.responseExponent??1.35;return Math.max(-limit,Math.min(limit,Math.sign(rate)*(dz+(1-dz)*Math.pow(Math.min(1,Math.abs(rate)/maxRate),1/exponent))));};
async function seek(target,{radius=12,name='waypoint',limit=45000,stop=false}={}){
 const start=Date.now();let sample=await snap(),lastLog=0;
 while(Date.now()-start<limit){
  sample=await snap();const d=target.map((n,i)=>n-sample.player[i]),distance=Math.hypot(...d),speed=Math.hypot(...sample.velocity);
  if(distance<radius){await keys([]);await neutral();if(stop)await brake();const end=await shot(name);report.route.push({name,target,reached:true,seconds:(Date.now()-start)/1000,...end});console.log(JSON.stringify({waypoint:name,reached:true,player:end.player,seconds:(Date.now()-start)/1000}));return end;}
  const yaw=Math.atan2(-d[0],-d[2]),pitch=Math.atan2(d[1],Math.hypot(d[0],d[2])),ye=wrap(yaw-sample.flight.yaw),pe=pitch-sample.flight.pitch;
  const sx=inv(-ye*2,sample.flight.turnRate,.88,sample.flight),sy=inv(-pe*2,sample.flight.pitchRate,.75,sample.flight);
  await page.mouse.move(720+sx*(sample.flight.pointerRangePx??720),480+sy*(sample.flight.pointerRangePx??480));
  const desiredSpeed=stop?Math.min(12,Math.max(.9,(distance-radius)*1.5)):12;
  if(Math.abs(ye)>1.0||Math.abs(pe)>.8||speed>desiredSpeed+1.3)await keys(['s']);
  else if(speed<desiredSpeed-.3)await keys(['w']);
  else await keys([]);
  if(Date.now()-lastLog>1200){report.route.push({name,at:(Date.now()-start)/1000,distance,player:sample.player,velocity:sample.velocity,yaw:sample.flight.yaw,pitch:sample.flight.pitch});lastLog=Date.now();}
  await sleep(140);
 }
 await brake();const end=await shot(name+'-timeout');report.route.push({name,target,reached:false,seconds:(Date.now()-start)/1000,...end});throw new Error('Could not reach '+name);
}
const check=(condition,message)=>{if(!condition)throw new Error(message);};
async function face(yaw,pitch){
 await brake();const start=Date.now();
 while(Date.now()-start<10000){
  const s=await snap(),ye=wrap(yaw-s.flight.yaw),pe=pitch-s.flight.pitch;
  if(Math.abs(ye)<.018&&Math.abs(pe)<.018){await neutral();await sleep(900);return;}
  await page.mouse.move(720+inv(-ye*2,s.flight.turnRate,.88,s.flight)*(s.flight.pointerRangePx??720),480+inv(-pe*2,s.flight.pitchRate,.75,s.flight)*(s.flight.pointerRangePx??480));
  await sleep(100);
 }
 await neutral();throw new Error('Requested comparison heading not reached through mouse input');
}
try{
 await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.starhaven?.ready,{timeout:120000});await sleep(1200);
 const bundle=await page.evaluate(()=>[...document.scripts].map(s=>s.src).find(s=>s.includes('/assets/index-')));
 report.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(bundle)).arrayBuffer())).digest('hex')};
 report.comparison='Normal-spawn real mouse/W/S route; compare RC6 SolMax 31/32 at their recorded nearby poses. Normal input reaches all positions/headings. Afterwards only material visibility/blending is changed for diagnosis; not a formal acceptance run.';
 await shot('00-normal-spawn');
 await seek([-52,22,-43],{radius:1.6,name:'01-cloud-gate',stop:true,limit:65000});
 await face(.7048,.3385);await shot('02-gate-facing-flow');
 await seek([-94.2706868,47.588269,-96.283232],{radius:.95,name:'03-route-bridge',stop:true,limit:65000});
 await face(.7047878,.3384578);const before=await shot('04-stationary-flow-before');await sleep(3800);const after=await shot('05-stationary-flow-after');
 report.flowMotion={playerDisplacement:Math.hypot(...after.player.map((n,i)=>n-before.player[i])),cameraDisplacement:Math.hypot(...after.camera.map((n,i)=>n-before.camera[i]))};
 await face(-1.0561113,.6400568);await shot('06-RC6-side-comparison');
 await face(-2.43,.04);await shot('07-route-back-view');
 await face(.7047878,-.38);await shot('08-route-under-view');
 await seek([-128.2933,67.90323,-137.81918],{radius:.95,name:'09-star-crown-approach',stop:true,limit:65000});
 await face(.7253529,.3590064);await shot('10-RC6-crown-comparison');
 await seek([-143,78,-159],{radius:1.8,name:'11-through-crown',stop:true,limit:65000});
 await face(-2.45,-.3);await shot('12-crown-back-to-home');
 for(const mode of ['near-hidden','all-dust-hidden','original-volume-hidden','near-normal','original']){
  report.route.push({diagnosisOnly:true,mode,result:await page.evaluate(mode=>window.__dustDiagnosis(mode),mode)});
  await sleep(300);await shot('dust-diagnosis-'+mode);
 }

 check(report.errors.length===0,'Browser/resource errors');report.status='passed';
}catch(error){report.status='failed';report.failure=error.message;console.error(error);await shot('failure').catch(()=>{});}
finally{
 await keys([]).catch(()=>{});report.inputs=await page.evaluate(()=>window.__routeInputs).catch(()=>[]);report.trustedInputs=report.inputs.filter(e=>e.trusted).length;
 report.finished=new Date().toISOString();report.video=await page.video().path();await context.close();await browser.close();report.browserClosed=true;
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,failure:report.failure,checks:report.checks.length,trustedInputs:report.trustedInputs,errors:report.errors,report:path.join(out,'report.json')}));
 if(report.status!=='passed')process.exitCode=1;
}
