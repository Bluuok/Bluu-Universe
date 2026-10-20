import {chromium} from './browser-runtime.mjs';
import {flyIntoRoom} from './room-flight-route.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const url=process.env.ROUTE_URL||'http://127.0.0.1:4202/',out=process.env.ROUTE_OUT||'E:/temp/starhaven-alpha11-final-routes';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--use-angle=d3d11','--enable-gpu','--disable-software-rasterizer','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:out,size:{width:1440,height:960}}});
await context.addInitScript(()=>{window.__routeInputs=[];for(const type of ['keydown','keyup','pointermove','pointerdown','pointerup','click','blur','focus'])window.addEventListener(type,e=>window.__routeInputs.push({type,code:e.code,trusted:e.isTrusted,x:e.clientX,y:e.clientY,at:performance.now()}),true);});
const page=await context.newPage(),report={method:'Normal spawn, real Playwright keyboard/mouse; page evaluation reads only. Home resets only through visible UI/keyboard.',url,started:new Date().toISOString(),checks:[],route:[],errors:[]},pressed=new Set();
report.runtimeErrors=[];report.requestFailures=[];
page.on('pageerror',e=>{report.errors.push(e.message);report.runtimeErrors.push({type:'page',message:e.message});});
page.on('console',e=>{if(e.type()==='error'){report.errors.push(e.text());report.runtimeErrors.push({type:'console',message:e.text()});}});
page.on('requestfailed',r=>{report.errors.push(r.url()+': '+r.failure()?.errorText);report.requestFailures.push({url:r.url(),error:r.failure()?.errorText});});
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
try{
 await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.starhaven?.ready,{timeout:120000});await sleep(1000);
 const bundle=await page.evaluate(()=>[...document.scripts].map(s=>s.src).find(s=>s.includes('/assets/index-')));report.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(bundle)).arrayBuffer())).digest('hex')};
 report.gpu=await page.evaluate(()=>{const gl=document.getElementById('world').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL);});
 const spawn=await shot('01-normal-spawn');await sleep(800);check(Math.hypot(...(await snap()).player.map((n,i)=>n-spawn.player[i]))<.001,'Default movement');
 await page.mouse.move(650,245);await sleep(900);await neutral();await sleep(250);const turn=await shot('02-free-mouse-turn');check(turn.flight.pitch>.1&&Math.hypot(...turn.velocity)<.001,'Free mouse pitch without held button');
 await keys(['w']);await sleep(2200);const powered=await shot('03-powered-pose');report.envelope=await page.evaluate(()=>window.starhaven.inspect.characterEnvelope());check(powered.velocity[1]>1&&powered.flight.thrust>.99,'W must advance in full 3D');check(report.envelope.enclosed,'Powered character exceeds flight capsule');
 await keys([]);await sleep(600);const coast=await shot('04-unpowered-glide');
 // The user now requests a short coast. The old >5m/s assertion at 600ms
 // enforced the retired long-inertia behavior; precise timing is tested in wake review.
 check(Math.hypot(...coast.velocity)<3&&coast.flight.thrust===0&&coast.flight.exhaust.power<.02,'Short coast or thrust-driven exhaust');
 await keys(['s']);await sleep(950);const stopped=await shot('05-braking-pose');check(Math.hypot(...stopped.velocity)<.01&&stopped.flight.braking,'S brake');await keys([]);
 await keys(['w']);await sleep(500);await page.keyboard.press('p');await sleep(350);await page.keyboard.down('w');await sleep(350);const paused=await shot('06-paused-held-key');check(paused.flight.paused&&Math.hypot(...paused.velocity)<.001,'Pause clears input');await keys([]);
 await home();
 const circuitStart=Date.now();
 for(const [i,p] of (await snap()).route.landmarks.entries()){
  await seek(p.position,{radius:i===5?6:12,name:'circuit-'+(i+1)+'-'+p.id,stop:i===1||i===3||i===5,limit:50000});
  if(i===1||i===3)await sleep(4500);
 }
 report.circuitSeconds=(Date.now()-circuitStart)/1000;check((await snap()).route.complete,'Circuit checkpoint completion');
 await home();
 const pass=await page.evaluate(()=>window.starhaven.vortex.passage);
 await seek([-16,8,-15],{name:'vortex-clear-studio',radius:5});
 await seek(pass.front,{name:'vortex-front',radius:3,stop:true});
 await seek(pass.middle||[-26,-4,-42],{name:'vortex-middle',radius:3,stop:true});
 await seek(pass.back,{name:'vortex-back',radius:3,stop:true});
 await seek([-15,10,-18],{name:'vortex-return',radius:5});
 await home();
 await seek([-13,4,0],{name:'rear-route-west',radius:3});
 await seek([-12,3,-10],{name:'rear-route-corner',radius:3});
 await seek([-1,1.2,-7],{name:'rear-wall-low',radius:2,stop:true});
 await seek([9,4,-10],{name:'rear-route-east',radius:3});
 await seek([9,4,10],{name:'front-window-outside',radius:3,stop:true});
 await seek([1.35,1.5,8.5],{name:'door-approach',radius:1,stop:true});
 await keys([]);await neutral();await flyIntoRoom(page);const room=await shot('room-entry');check(room.state==='ROOM','Automatic door entry failed');
 await page.locator('[data-exhibit="threadcove"]').click();await sleep(1400);check((await snap()).state==='PROJECT','Exhibit open');await shot('threadcove-project');
 await page.locator('#project-back').click();await sleep(1300);check((await snap()).state==='ROOM','Project return');
 await page.locator('#exit').click();await sleep(3400);check((await snap()).state==='SPACE','Room exit');await shot('same-studio-exit');
 await page.locator('#project-toggle').click();await sleep(250);await page.locator('.catalog-item').first().click();await sleep(1400);check((await snap()).state==='PROJECT','Exterior catalog');await page.locator('#project-back').click();await sleep(1400);check((await snap()).state==='SPACE','Exterior project return');
 await home();
 // An actual second page takes browser focus; no synthetic blur event.
 await keys(['w']);await sleep(450);const other=await context.newPage();await other.goto('about:blank');await other.bringToFront();await sleep(700);await keys([]);await other.close();await page.bringToFront();await sleep(400);
 report.focus=await shot('focus-return');report.focusVerified=report.focus.flight.paused&&report.focus.keys.length===0;
 await home();report.routeCompleted=true;
 report.requestEvidence=await page.evaluate(failures=>failures.map(failure=>{
  const entry=performance.getEntriesByName(failure.url).at(-1);
  return {...failure,responseStatus:entry?.responseStatus,encodedBodySize:entry?.encodedBodySize,decodedBodySize:entry?.decodedBodySize,duration:entry?.duration};
 }),report.requestFailures);
 for(const entry of report.requestEvidence){
  const resource=new URL(entry.url);if(resource.origin!==new URL(url).origin||!resource.pathname.startsWith('/assets/'))continue;
  const publicRoot=path.resolve('public'),local=path.resolve(publicRoot,'.'+decodeURIComponent(resource.pathname));
  if(!local.startsWith(publicRoot+path.sep))continue;
  try{entry.localBytes=(await readFile(local)).length;entry.receivedFullBody=entry.encodedBodySize===entry.localBytes&&entry.decodedBodySize===entry.localBytes;}catch{}
 }
 report.focusLimit='Second-tab focus in a headless browser is not a real OS focus-loss or Windows lock/unlock test.';
 report.status=report.runtimeErrors.length?'failed':report.requestFailures.length?'completed-with-request-diagnostics':'passed';
}catch(error){report.status='failed';report.failure=error.message;console.error(error);await shot('failure').catch(()=>{});}
finally{
 await keys([]).catch(()=>{});report.inputs=await page.evaluate(()=>window.__routeInputs).catch(()=>[]);report.trustedInputs=report.inputs.filter(e=>e.trusted).length;report.finished=new Date().toISOString();report.video=await page.video().path();await context.close();await browser.close();report.browserClosed=true;await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,failure:report.failure,circuitSeconds:report.circuitSeconds,checks:report.checks.length,trustedInputs:report.trustedInputs,errors:report.errors,report:path.join(out,'report.json')}));if(report.status!=='passed')process.exitCode=1;
}
