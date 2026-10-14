import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const url=process.env.RETURN_URL||'http://127.0.0.1:4209/',out=process.env.RETURN_OUT||'E:/temp/starhaven-alpha11-rc11-return';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--use-angle=d3d11','--enable-gpu','--disable-software-rasterizer','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:out,size:{width:1440,height:960}}});
await context.addInitScript(()=>{window.__routeInputs=[];for(const type of ['keydown','keyup','pointermove','pointerdown','pointerup','click','blur','focus'])window.addEventListener(type,e=>window.__routeInputs.push({type,code:e.code,trusted:e.isTrusted,x:e.clientX,y:e.clientY,at:performance.now()}),true);});
const page=await context.newPage(),report={method:'Normal spawn, real Playwright keyboard/mouse; page evaluation reads only. Home resets only through visible UI/keyboard.',url,started:new Date().toISOString(),checks:[],route:[],errors:[]},pressed=new Set();
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});page.on('requestfailed',r=>report.errors.push(r.url()+': '+r.failure()?.errorText));
const sleep=ms=>page.waitForTimeout(ms);
const snap=()=>page.evaluate(()=>{const a=window.starhaven;return{state:a.state,player:a.player,velocity:a.velocity,flight:a.flight,route:a.route,keys:a.keys,project:a.currentProject,camera:a.camera,cameraTarget:a.cameraProgress.target,framing:a.framing,collision:a.inspect.collision().lastSolve};});
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
try{
 await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.starhaven?.ready,{timeout:120000});await sleep(900);await neutral();
 const bundle=await page.evaluate(()=>[...document.scripts].map(s=>s.src).find(s=>s.includes('/assets/index-')));report.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(bundle)).arrayBuffer())).digest('hex')};
 await seek([-52,22,-43],{name:'01-real-flight-away',radius:3,stop:true});
 const original=await shot('02-before-project');report.originalPilot={yaw:original.flight.yaw,pitch:original.flight.pitch};
 await page.locator('#project-toggle').click();await sleep(200);await page.locator('.catalog-item').first().click();await sleep(1400);check((await snap()).state==='PROJECT','Actual project did not open');
 await shot('03-project');await page.locator('#project-back').click();await neutral();await sleep(1600);
 const restored=await shot('04-restored-flight');await sleep(1000);const idle=await shot('05-idle-no-self-turn');
 const cameraDirection=s=>Math.atan2(s.camera[0]-s.cameraTarget[0],s.camera[2]-s.cameraTarget[2]);
 report.returnCheck={pilotYawError:wrap(idle.flight.yaw-original.flight.yaw),pilotPitchError:idle.flight.pitch-original.flight.pitch,idleCameraYawChange:wrap(cameraDirection(idle)-cameraDirection(restored)),positionChange:Math.hypot(...idle.player.map((v,i)=>v-restored.player[i]))};
 check(Math.abs(report.returnCheck.pilotYawError)<.001&&Math.abs(report.returnCheck.pilotPitchError)<.001,'Pilot heading not restored');
 check(Math.abs(report.returnCheck.idleCameraYawChange)<.02&&report.returnCheck.positionChange<.001,'Idle camera or player moves after return');
 await keys(['w']);await sleep(200);const firstThrust=await snap();await keys([]);await brake();await shot('06-restarted-propulsion');
 report.returnCheck.firstThrustHeadingChange=wrap(firstThrust.flight.yaw-idle.flight.yaw);
 report.returnCheck.firstThrustCameraYawChange=wrap(cameraDirection(firstThrust)-cameraDirection(idle));
 check(Math.abs(report.returnCheck.firstThrustHeadingChange)<.001&&Math.abs(report.returnCheck.firstThrustCameraYawChange)<.03,'Restarted propulsion causes heading snap');
 check(report.errors.length===0,'Browser errors');report.status='passed';
}catch(error){report.status='failed';report.failure=error.message;console.error(error);await shot('failure').catch(()=>{});}
finally{
 await keys([]).catch(()=>{});report.inputs=await page.evaluate(()=>window.__routeInputs).catch(()=>[]);report.trustedInputs=report.inputs.filter(e=>e.trusted).length;report.finished=new Date().toISOString();report.video=await page.video().path();await context.close();await browser.close();report.browserClosed=true;await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,failure:report.failure,circuitSeconds:report.circuitSeconds,checks:report.checks.length,trustedInputs:report.trustedInputs,errors:report.errors,report:path.join(out,'report.json')}));if(report.status!=='passed')process.exitCode=1;
}
