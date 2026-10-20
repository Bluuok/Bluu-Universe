import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from './browser-runtime.mjs';
const expected=process.env.PLAYER_BUILD||(await readFile('dist/index.html','utf8')).match(/assets\/(index-[^" ]+\.js)/)[1],url='http://127.0.0.1:4175',timeout=180000;
const outDir=path.resolve(process.env.PLAYER_SHOTS||'screenshots/v04-alpha4-player-review'),file=process.env.PLAYER_REPORT||'tests/v04-alpha4-player-review.json';
const viewport={width:1440,height:960};
let report={expectedBuild:expected,url,startedAt:new Date().toISOString(),status:'running',viewport:[viewport.width,viewport.height],deviceScaleFactor:1,method:'Normal reload spawn; trusted Playwright keyboard/mouse and DOM controls only. evaluate installs passive logs or reads telemetry. No product action/inspection mutation APIs used.',priorEvidence:'Earlier reports remain historical; artificial-start/isolatedfixture checks are not counted as these continuous player routes.',limitations:['Local desktop headless Chromium D3D11; actual renderer recorded; not physical monitor or phone acceptance','Camera avoidance active in SPACE; doorway and ROOM/PROJECT camera paths are authored'],routes:[],consoleErrors:[],pageErrors:[],requestFailures:[]};
const resume=Number(process.env.PLAYER_ROUTE_RESUME||'1');
const routeLimit=Number(process.env.PLAYER_ROUTE_LIMIT||'3');assert.ok([1,2,3].includes(routeLimit));
if(resume>1){
 const previous=JSON.parse(await readFile(file,'utf8'));assert.equal(previous.build,expected);
 const completed=previous.routes.filter(r=>r.id<resume&&r.status==='passed');assert.equal(completed.length,resume-1);
 const incomplete=previous.routes.filter(r=>r.status!=='passed');
 report={...previous,status:'running',routes:completed,interruptedAttempts:[...(previous.interruptedAttempts||[]),...incomplete.map(r=>({...r,status:'incomplete-prior-attempt',countedAsCompleteRoute:false}))],browserRuns:[...(previous.browserRuns||[{startedAt:previous.startedAt,ending:previous.browserClosed?'context and browser closed normally':'prior termination not certified by this run'}]),{startedAt:new Date().toISOString(),ending:'pending'}]};
}
report.routesExpected=routeLimit;report.fullThreeRouteRequirementCompleted=false;
let browser,page,context,cdp,current;
async function save(){await writeFile(file+'.tmp',JSON.stringify(report,null,2)+'\n','utf8');await rename(file+'.tmp',file);}
function observation(){const a=window.starhaven,c=a.inspect.collision();const p=a.camera,t=a.cameraProgress.target,d=p.map((v,i)=>v-t[i]);return {time:performance.now(),state:a.state,player:a.player,velocity:a.velocity,keys:a.keys,flight:a.flight,camera:p,cameraProgress:a.cameraProgress,framing:a.framing,vortex:a.vortex,orbit:{yaw:Math.atan2(d[0],d[2])-.47,pitch:Math.asin(d[1]/Math.hypot(...d))},collision:{solveCount:c.solveCount,doorOpen:c.doorOpen,gateActive:c.gateActive,lastSolve:c.lastSolve,lastTraversal:c.lastTraversal},roomEntities:a.inspect.roomEntities(),characterBounds:a.inspect.characterBounds(),characterEnvelope:a.inspect.characterEnvelope()};}
const observe=()=>page.evaluate(observation);
async function settle(state){await page.waitForFunction(s=>window.starhaven.state===s&&window.starhaven.cameraProgress.transition===null&&Number(getComputedStyle(document.getElementById('transition')).opacity)<.02,state,{timeout});await page.waitForFunction(()=>Math.hypot(...window.starhaven.velocity)<.025,null,{timeout});}
async function logs(){return page.evaluate(()=>({inputs:window.__playerRoute.inputs,samples:window.__playerRoute.samples}));}
async function checkpoint(name,data={}){const observed=await observe();current.steps.push({name,...data,observed});Object.assign(current,await logs());await save();console.log(JSON.stringify({route:current.id,checkpoint:name,player:observed.player,state:observed.state}));return observed;}
async function screenshot(name){assert.ok(await page.evaluate(()=>Number(getComputedStyle(document.getElementById('transition')).opacity)<.02));const before=await observe(),data=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true}),target=path.join(outDir,name+'.png');await writeFile(target,Buffer.from(data.data,'base64'));const after=await observe();current.captures.push({file:target,before,after,imageEdited:false});await save();}
async function release(key){await page.keyboard.up(key);await page.waitForFunction(()=>Math.hypot(...window.starhaven.velocity)<.025,null,{timeout});}
const keyFor=(axis,sign)=>axis===0?(sign>0?'d':'a'):axis===1?(sign>0?'Space':'Shift'):(sign>0?'s':'w');
async function fly(axis,target,name){
 if(await page.evaluate(()=>Boolean(window.starhaven.flight)))return flyFollowing(axis,target,name);
 let attempts=[];
 for(let attempt=0;attempt<5;attempt++){
  const before=await observe(),delta=target-before.player[axis];assert.equal(before.state,'SPACE');if(Math.abs(delta)<.15)break;
  const sign=Math.sign(delta),key=keyFor(axis,sign),count=before.collision.solveCount;await page.keyboard.down(key);
  const handle=await page.waitForFunction(({axis,target,sign,count})=>{const a=window.starhaven,c=a.inspect.collision(),left=(target-a.player[axis])*sign,v=Math.max(0,a.velocity[axis]*sign);if(left<=Math.max(.02,v*v/8.8-v*.02+.035))return 'braking';if(c.solveCount>count+15&&c.lastSolve.contacts.length&&Math.abs(a.velocity[axis])<.16&&left>.4)return 'blocked';return false;},{axis,target,sign,count},{timeout});const reason=await handle.jsonValue();await release(key);const after=await observe();attempts.push({key,sign,before,after,reason});if(reason==='blocked'){await checkpoint(name+' blocked',{axis,target,attempts});throw Error('Actual route blocked before target '+name+' '+JSON.stringify(after.player));}
 }
 const final=await checkpoint(name,{axis,target,attempts});assert.ok(Math.abs(final.player[axis]-target)<.19,'Actual flight target missed '+name+' '+final.player[axis]);
}
const quick=()=>page.evaluate(()=>{const a=window.starhaven,c=a.inspect.collision();return {player:a.player,velocity:a.velocity,yaw:a.flight.yaw,brake:a.flight.brake,state:a.state,collision:{solveCount:c.solveCount,lastSolve:c.lastSolve}};});
let held=new Set();
async function setHeld(keys){const next=new Set(keys);for(const key of held)if(!next.has(key))await page.keyboard.up(key);for(const key of next)if(!held.has(key))await page.keyboard.down(key);held=next;}
const localKeys=(world,yaw)=>{const c=Math.cos(yaw),s=Math.sin(yaw),v=[world[0]*c-world[2]*s,world[1],world[0]*s+world[2]*c],max=Math.max(...v.map(Math.abs));if(max<.04)return [];const keys=[];if(Math.abs(v[0])>max*.32)keys.push(v[0]>0?'d':'a');if(Math.abs(v[2])>max*.32)keys.push(v[2]>0?'s':'w');if(Math.abs(v[1])>max*.32)keys.push(v[1]>0?'Space':'Shift');return keys;};
async function stopHeld(){await setHeld([]);await page.waitForFunction(()=>Math.hypot(...window.starhaven.velocity)<.025,null,{timeout});}
async function flyFollowing(axis,target,name){
 const before=await observe(),goal=[...before.player];goal[axis]=target;const attempts=[];const tolerance=axis===1&&target===1.15?.07:.23;
 for(let tick=0;tick<100;tick++){
  const a=await quick();assert.equal(a.state,'SPACE');const error=goal.map((v,i)=>v-a.player[i]),distance=Math.hypot(...error);if(distance<tolerance)break;
  // Pulse real keys, then let the production brake finish. Timing follows the
  // measured acceleration/brake rather than changing speed or actor position.
  const keys=localKeys(error,a.yaw),ms=Math.max(45,Math.min(850,Math.sqrt(distance/18.86)*780));
  await setHeld(keys);await page.waitForTimeout(ms);await stopHeld();const after=await quick();
  attempts.push({tick,before:a,keys,heldMs:ms,after});
 }
 await stopHeld();const final=await checkpoint(name,{axis,target,goal,attempts,steering:'trusted camera-relative key pulses and normal coasting; read-only telemetry, no product mutation'});
 assert.ok(Math.abs(final.player[axis]-target)<.27,'Actual following-flight target missed '+name+' '+final.player[axis]);
 assert.ok(final.player.every((v,i)=>i===axis||Math.abs(v-goal[i])<.45),'Following-flight orthogonal drift '+name+' '+final.player);
}

async function contact(key,name,accept){
 const before=await observe(),count=before.collision.solveCount;
 if(before.flight){
   const direction={d:[1,0,0],a:[-1,0,0],w:[0,0,-1],s:[0,0,1]}[key];let touched=null;
   for(let tick=0;tick<180;tick++){const a=await quick();if(a.collision.solveCount>count+1&&a.collision.lastSolve.contacts.length){touched=a;break;}const world=direction.map((v,i)=>v?4*v:(before.player[i]-a.player[i])*2);await setHeld(localKeys(world,a.yaw));await page.waitForTimeout(100);}
   assert.ok(touched,'No real following-flight contact '+name);const first=await observe();await stopHeld();const after=await observe();assert.ok(accept(first),'Contact happened at a different obstacle '+name+' '+JSON.stringify(first.player));await checkpoint(name,{key,before,firstContact:first,afterRelease:after});await screenshot('route-'+current.id+'-'+name);
 }else{
 await page.keyboard.down(key);
 await page.waitForFunction(count=>{const c=window.starhaven.inspect.collision();return c.solveCount>count+1&&c.lastSolve.contacts.length;},count,{timeout});const first=await observe();await release(key);const after=await observe();assert.equal(first.state,'SPACE');assert.ok(first.collision.lastSolve.contacts.length);assert.ok(accept(first),'Contact happened at a different obstacle '+name+' '+JSON.stringify(first.player));await checkpoint(name,{key,before,firstContact:first,afterRelease:after});await screenshot('route-'+current.id+'-'+name);
 }
 if(name==='front-rail-contact'){
  await drag('actual mouse front-left rail view',[600,360],[883.3333333,280]);await screenshot('route-2-front-rail-mouse-view');
  await drag('reverse mouse restores heading after rail view',[883.3333333,280],[600,360]);
 }
 if(name==='back-wall-contact'){
  await drag('actual mouse orbit to rear first half',[800,360],[350,300]);await drag('actual mouse orbit to rear second half',[800,300],[350,300]);await screenshot('route-2-back-wall-mouse-view');
  await drag('reverse rear orbit first half',[350,300],[800,300]);await drag('reverse rear orbit second half',[350,300],[800,360]);
 }
}

async function drag(name,from,to){const before=await observe();await page.mouse.move(...from);await page.mouse.down();await page.mouse.move(...to,{steps:12});await page.mouse.up();await page.evaluate(async()=>{for(let i=0;i<16;i++)await new Promise(requestAnimationFrame);});const after=await checkpoint(name,{from,to,before});assert.equal(after.state,'SPACE');assert.ok(Math.hypot(...after.camera.map((v,i)=>v-before.camera[i]))>.3,'Mouse drag did not orbit');}
async function vortexExcursion(){
 const initial=await observe();if(!initial.vortex)return;
 await fly(0,-10,'leave west wall for the vortex');await fly(2,-16,'clear rear studio corner on the west');
 const passage=initial.vortex.passage;
 for(const [name,target] of Object.entries(passage)){
  for(let axis=0;axis<3;axis++)await fly(axis,target[axis],'vortex '+name+' '+['x','y','z'][axis]);
  const a=await checkpoint('normal flight reaches vortex '+name);assert.equal(a.state,'SPACE');assert.ok(Math.hypot(...a.player.map((p,i)=>p-target[i]))<.45);assert.deepEqual(a.collision.lastSolve.contacts,[]);await screenshot('route-1-vortex-'+name);
 }
 await drag('turn to inspect the real back face first half',[950,480],[450,430]);await drag('turn to inspect real back face second half',[950,430],[450,430]);await page.waitForTimeout(1500);await screenshot('route-1-vortex-back-face');
 await drag('restore heading after back-face view first half',[450,430],[950,430]);await drag('restore heading after back-face view second half',[450,430],[950,480]);
 await fly(2,-57,'go behind the whole volume before crossing to its side');await fly(0,1,'fly across rear free space to side');await fly(1,-4,'level for side silhouette');
 await drag('actual mouse puts the camera beside the vortex plane',[950,480],[426.4012,480]);await page.waitForTimeout(1500);await screenshot('route-1-vortex-side');
 const rest=await observe();await page.waitForTimeout(5200);const later=await checkpoint('stop for over five seconds beside vortex');assert.ok(Math.hypot(...later.velocity)<.025);assert.ok(Math.hypot(...later.player.map((p,i)=>p-rest.player[i]))<.02);assert.deepEqual(later.vortex.position,rest.vortex.position);assert.deepEqual(later.vortex.core.position,rest.vortex.core.position);await screenshot('route-1-vortex-side-rest');
 await drag('restore heading after side view',[426.4012,480],[950,480]);await fly(1,12,'rise above props on physical return');await fly(0,-7.4,'return to west high flight lane');await fly(2,6.5,'fly back to studio front');await fly(0,-6.2,'clear the near asteroid before descent');await fly(1,4.3,'lower beside studio after full vortex trip');
 await checkpoint('physical return to studio without reset or teleport');
}
async function enterProject(exhibit,expectedTitle){
 const outside=await observe();assert.equal(outside.state,'SPACE');assert.ok(Math.hypot(...outside.player.map((v,i)=>v-[1.35,1.15,6.05][i]))<4);
 await page.keyboard.press('e');await page.keyboard.down('w');await page.waitForTimeout(180);await page.keyboard.up('w');await settle('ROOM');assert.deepEqual((await observe()).keys,[]);await checkpoint('real E confirms entrance; transition input released',{outside});await screenshot('route-'+current.id+'-room');
 const button=page.locator('#hotspots button[data-exhibit="'+exhibit+'"]');await button.click();await settle('PROJECT');assert.equal(await page.locator('#project-title').innerText(),expectedTitle);
 await page.waitForFunction(()=>{const im=document.getElementById('project-image');return im.hidden||(im.complete&&im.naturalWidth>0);},null,{timeout});
 const project=await page.evaluate(()=>({title:document.getElementById('project-title').textContent,summary:document.getElementById('project-summary').textContent,image:{hidden:document.getElementById('project-image').hidden,src:document.getElementById('project-image').src,naturalWidth:document.getElementById('project-image').naturalWidth},links:[...document.querySelectorAll('#project-links a')].map(a=>({text:a.textContent,url:a.href}))}));assert.ok(project.summary.length>10);assert.ok(project.links.length&&project.links.every(l=>/^https?:\/\//.test(l.url)));await checkpoint('real exhibit opens readable project DOM',{exhibit,project});
 await page.locator('#project-back').click();await settle('ROOM');await checkpoint('real project back');
 if(current.id===3){await page.locator('#hotspots button[data-exhibit="contact"]').click();await settle('PROJECT');const card=await page.evaluate(()=>({title:document.getElementById('project-title').innerText,expected:window.starhaven.registry.contact.name,summary:document.getElementById('project-summary').innerText,details:document.getElementById('project-details').innerText}));assert.equal(card.title,card.expected);assert.ok(card.summary.length>10);await checkpoint('real contact card opens',{card});await page.locator('#project-back').click();await settle('ROOM');}
 await page.locator('#exit').click();await settle('SPACE');const returned=await checkpoint('real exit returns through entrance');assert.equal(returned.collision.doorOpen,false);await screenshot('route-'+current.id+'-final-space');
}
async function startRoute(id,description){
 current={id,description,status:'running',steps:[],captures:[],inputs:[],samples:[]};report.routes.push(current);
 await page.goto(url,{waitUntil:'networkidle',timeout});await page.waitForFunction(()=>window.starhaven?.ready,null,{timeout});await page.locator('#loading').waitFor({state:'hidden'});await settle('SPACE');
 const build=await page.locator('script[src]').evaluateAll(es=>es.map(e=>e.getAttribute('src')).find(s=>s.includes('/assets/index-'))?.split('/').pop());assert.equal(build,expected);current.build=build;report.build=build;
 report.renderer=await page.evaluate(()=>{const g=document.getElementById('world').getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return g.getParameter(e.UNMASKED_RENDERER_WEBGL);});
 await page.evaluate(()=>{window.__playerRoute={inputs:[],samples:[]};const log=e=>window.__playerRoute.inputs.push({time:performance.now(),type:e.type,code:e.code||null,trusted:e.isTrusted,target:e.target.id||e.target.tagName,exhibit:e.target.dataset?.exhibit||null,x:e.clientX,y:e.clientY,state:window.starhaven.state,player:window.starhaven.player,velocity:window.starhaven.velocity,keys:window.starhaven.keys});for(const event of ['keydown','keyup','pointerdown','pointermove','pointerup','click'])window.addEventListener(event,log);const sample=()=>{const a=window.starhaven,c=a.inspect.collision();window.__playerRoute.samples.push({time:performance.now(),state:a.state,player:a.player,velocity:a.velocity,keys:a.keys,camera:a.camera,collision:{solveCount:c.solveCount,doorOpen:c.doorOpen,contacts:c.lastSolve?.contacts||[]}});requestAnimationFrame(sample);};requestAnimationFrame(sample);});
 const start=await checkpoint('normal page load default spawn');assert.deepEqual(start.player,[-4,2,8.5]);if(id===1){await screenshot('default-space');await page.locator('#enter').click();assert.equal((await observe()).state,'SPACE');await checkpoint('far entry button stays SPACE without docking');}
}
async function finishRoute(){Object.assign(current,await logs());assert.ok(current.inputs.length&&current.inputs.every(i=>i.trusted));assert.equal(current.steps.at(-1).observed.state,'SPACE');current.actualPathDistance=current.samples.slice(1).reduce((sum,p,i)=>{const previous=current.samples[i];return p.state==='SPACE'&&previous.state==='SPACE'?sum+Math.hypot(...p.player.map((v,j)=>v-previous.player[j])):sum;},0);assert.ok(current.actualPathDistance>20);current.status='passed';await save();}
try{
 if(expected==='index-DlruZU-e.js')report.priorAttempt={build:'index-D2fT_FBt.js',renderer:'SwiftShader',status:'failed',reason:'Closed-loop test steering overshot at measured 2.6 fps; not counted as a completed route. Replayed with actual D3D11 renderer without reducing product graphics.'};
 report.sha256=createHash('sha256').update(await readFile('dist/assets/'+expected)).digest('hex');
 await mkdir(outDir,{recursive:true});browser=await chromium.launch({headless:true,executablePath:'C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--use-angle=d3d11','--enable-gpu','--disable-software-rasterizer']});context=await browser.newContext({viewport,deviceScaleFactor:1});page=await context.newPage();page.setDefaultTimeout(timeout);cdp=await context.newCDPSession(page);page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});page.on('pageerror',e=>report.pageErrors.push(e.message));page.on('requestfailed',r=>report.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
 if(resume<=1){await startRoute(1,'West-side wall contact, return along left exterior to the closed front entrance, ThreadCove.');
 await fly(1,4.3,'ascend over terrace props');await fly(0,-7.4,'fly west outside shell');await fly(2,.5,'travel along left exterior');await contact('d','left-wall-contact',p=>p.player[0]<-5.8&&p.player[2]<1.2&&p.collision.lastSolve.contacts.some(c=>c.collider==='studio-static'));
 await vortexExcursion();await fly(2,6.5,'return south around left corner');await fly(0,1.35,'align with front entry gap');await fly(1,1.15,'descend at doorway');await contact('w','closed-door-contact',p=>Math.abs(p.player[0]-1.35)<.65&&p.player[2]>5.3&&p.player[2]<5.6&&p.collision.lastSolve.contacts.some(c=>c.collider==='studio-door'));await fly(2,6.05,'release from closed door');await fly(0,1.35,'center in entry opening after contact');await enterProject('threadcove','ThreadCove');await finishRoute();}
 if(resume<=2&&routeLimit>=2){await startRoute(2,'Low front rail contact, east-side circuit to back wall, elevated return, Clawtide.');
 await fly(1,.65,'descend outside front terrace');await contact('w','front-rail-contact',p=>p.player[2]>7.3&&p.player[2]<8.3&&p.player[0]<-.8&&p.player[1]<1.2&&p.collision.lastSolve.contacts.some(c=>c.collider==='studio-static'));
 await fly(1,4.4,'clear rail by ascent');await fly(0,11,'round east side outside satellites');await fly(2,-9,'travel east to rear');await fly(0,0,'cross rear exterior');await fly(1,2.5,'lower behind studio');await contact('s','back-wall-contact',p=>p.player[2]<-5.5&&p.player[2]>-5.8&&p.collision.lastSolve.contacts.some(c=>c.collider==='studio-static'));
 await fly(1,8.2,'ascend above roof and satellite hardware');await fly(0,11,'return via east high lane');await fly(2,8.2,'return to front outside');await fly(0,1.35,'align doorway from east');await fly(1,1.15,'descend outside entry gap');await fly(2,6.05,'approach front door through rail opening');await enterProject('clawtide','Clawtide');await finishRoute();}
 if(routeLimit>=3){await startRoute(3,'High east/rear orbit, descend below house from the outside, real mouse look and restore, front-window look, contributions.');
 await fly(1,9,'ascend above roof');await fly(0,11,'move to clear east lane');await fly(2,-11,'fly beyond rear edge');await fly(1,-4,'descend below studio outside its footprint');await checkpoint('actual below-house exterior position');
 await drag('mouse orbit below studio',[760,360],[550,390]);await screenshot('route-3-below-orbit');await drag('reverse mouse drag restores flight heading',[550,390],[760,360]);
 await fly(1,4.3,'rise outside house');await fly(2,8.2,'return forward on east side');await fly(0,1.35,'align entrance from east');await fly(1,1.15,'descend at front gap');await fly(2,6.05,'approach entrance');
 await drag('real mouse lowers and faces front window',[600,400],[756.6666667,270]);const windowLook=await checkpoint('window viewed while still outside');assert.ok(windowLook.framing.requestedOrbit.pitch<.18);assert.equal(windowLook.framing.avoidance.lineOfSightClear,true);assert.equal(windowLook.state,'SPACE');await screenshot('route-3-front-window');await enterProject('contributions','Folio & DeerFlow');await finishRoute();}
 assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.requestFailures,[]);assert.equal(report.routes.length,routeLimit);assert.ok(report.routes.every(r=>r.status==='passed'&&r.build===expected));report.status='passed';report.fullThreeRouteRequirementCompleted=routeLimit===3;
}catch(error){report.status='failed';report.error={message:error.message,stack:error.stack};if(current)current.status='failed';if(page){report.failureSnapshot=await observe().catch(()=>null);if(current)Object.assign(current,await logs().catch(()=>({})));}console.log('FAIL '+error.message);}
finally{await context?.close();await browser?.close();report.browserClosed=true;if(report.browserRuns)report.browserRuns.at(-1).ending='context and browser await close normally';report.finishedAt=new Date().toISOString();await save();console.log(JSON.stringify({status:report.status,build:report.build,routes:report.routes.map(r=>({id:r.id,status:r.status,steps:r.steps.length,pathDistance:r.actualPathDistance})),errors:report.consoleErrors.length+report.pageErrors.length+report.requestFailures.length,browserClosed:true}));process.exitCode=report.status==='passed'?0:1;}
