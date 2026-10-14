import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const url=process.env.FEEL_URL||'http://127.0.0.1:4202/',out=process.env.FEEL_OUT||'E:/temp/starhaven-feel-baseline';
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
const inv=(rate,maxRate,limit)=>Math.max(-limit,Math.min(limit,Math.sign(rate)*(.14+.86*Math.pow(Math.min(1,Math.abs(rate)/maxRate),1/1.35))));
async function seek(target,{radius=12,name='waypoint',limit=45000,stop=false}={}){
 const start=Date.now();let sample=await snap(),lastLog=0;
 while(Date.now()-start<limit){
  sample=await snap();const d=target.map((n,i)=>n-sample.player[i]),distance=Math.hypot(...d),speed=Math.hypot(...sample.velocity);
  if(distance<radius){await keys([]);await neutral();if(stop)await brake();const end=await shot(name);report.route.push({name,target,reached:true,seconds:(Date.now()-start)/1000,...end});console.log(JSON.stringify({waypoint:name,reached:true,player:end.player,seconds:(Date.now()-start)/1000}));return end;}
  const yaw=Math.atan2(-d[0],-d[2]),pitch=Math.atan2(d[1],Math.hypot(d[0],d[2])),ye=wrap(yaw-sample.flight.yaw),pe=pitch-sample.flight.pitch;
  const sx=inv(-ye*2,1.05,.88),sy=inv(-pe*2,.85,.50);
  await page.mouse.move(720+sx*720,480+sy*480);
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
async function timedMouse(name,x,y,ms){
 await home();const before=await snap();await page.mouse.move(x,y);const samples=[],started=Date.now();
 while(Date.now()-started<ms){samples.push({elapsedMs:Date.now()-started,...await snap()});await sleep(50);}
 const held=await snap(),actualHoldMs=Date.now()-started;await neutral();await page.screenshot({path:path.join(out,name+'-held.png')});report.checks.push({name:name+'-held',...held});await sleep(600);const settled=await shot(name+'-settled');
 report.trials.push({name,pointer:[x,y],holdMs:ms,actualHoldMs,before,held,settled,samples,yawDeltaDeg:wrap(held.flight.yaw-before.flight.yaw)*180/Math.PI,pitchDeltaDeg:(held.flight.pitch-before.flight.pitch)*180/Math.PI});
}
try{
 await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.starhaven?.ready,{timeout:120000});await sleep(1200);
 const bundle=await page.evaluate(()=>[...document.scripts].map(s=>s.src).find(s=>s.includes('/assets/index-')));
 report.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(bundle)).arrayBuffer())).digest('hex')};
 report.trials=[];report.method='Normal spawn and visible H reset; actual pointer offset holds and actual W/S presses; camera/heading/velocity telemetry read only. Not a user-subjective-acceptance proxy.';
 await timedMouse('00-tiny-no-zoom-25px',745,480,200);
 await timedMouse('00b-small-offset-60px',780,480,1000);
 await timedMouse('00c-small-vertical-60px',720,420,1000);
 await timedMouse('01-small-offset-100px',820,480,1000);
 await timedMouse('02-medium-offset-180px',900,480,1000);
 await timedMouse('03-wide-offset-360px',1080,480,1200);
 await timedMouse('04-upper-pointer',720,160,1000);
 await timedMouse('05-lower-pointer',720,745,1000);
 await timedMouse('06-edge-held',1380,480,1600);
 await home();await page.mouse.move(720,280);await sleep(500);await neutral();await keys(['w']);await sleep(2000);await shot('07-powered-before-turn');
 await page.mouse.move(1080,430);await sleep(1300);await shot('08-powered-turn');
 await neutral();await keys([]);await sleep(500);await shot('09-coast');
 await keys(['s']);await sleep(900);await shot('10-brake');await keys([]);
 await keys(['w']);await sleep(250);await page.mouse.move(720,70);await sleep(250);await shot('11-hover-decorative-hud');await page.locator('#reset-view').hover();await sleep(250);await shot('11b-hover-real-button-clears');
 await page.mouse.move(1000,480);await sleep(500);await shot('12-return-offset-canvas-held-w');await neutral();await sleep(250);await shot('12b-return-center-rearms');
 await keys([]);await keys(['w']);await sleep(650);await shot('13-fresh-w-after-ui');await brake();await home();
 check(report.errors.length===0,'Browser errors');report.status='passed';
}catch(error){report.status='failed';report.failure=error.message;console.error(error);}
finally{
 await keys([]).catch(()=>{});report.inputs=await page.evaluate(()=>window.__routeInputs).catch(()=>[]);report.trustedInputs=report.inputs.filter(e=>e.trusted).length;
 report.finished=new Date().toISOString();report.video=await page.video().path();await context.close();await browser.close();report.browserClosed=true;
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,errors:report.errors,trials:report.trials?.map(t=>({name:t.name,yawDeltaDeg:t.yawDeltaDeg,pitchDeltaDeg:t.pitchDeltaDeg})),report:path.join(out,'report.json')}));
 if(report.status!=='passed')process.exitCode=1;
}
