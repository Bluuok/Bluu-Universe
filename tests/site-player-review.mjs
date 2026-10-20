import {runtimeBuildIdentity} from './runtime-build-identity.mjs';
import {chromium} from './browser-runtime.mjs';
import {flyTo,flyIntoRoom,faceHeading} from './room-flight-route.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
// Default: normal browser sign-in. An explicitly authorized QA token may arrive
// only through hidden stdin, stay in memory, and be sent to this Site origin.
if(process.stdin.isTTY){process.stdin.setRawMode(true);console.log('Ready for site QA JSON on stdin (input is hidden).');}
const input=await new Promise((resolve,reject)=>{let value='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{value+=chunk;if(value.includes('\n')||value.includes('\r')){if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();try{resolve(JSON.parse(value));}catch(e){reject(e);}}});});
assert.ok(!input.token||typeof input.token==='string','Invalid QA credential');
const url=input.url,origin=new URL(url).origin,out=process.env.SITE_QA_OUT||'screenshots/v21-site-live';await mkdir(out,{recursive:true});
const report={url,method:(new URL(url).hostname==='127.0.0.1'?'Local production build':'Production Site')+(input.token?'; explicitly authorized in-memory same-origin QA bearer.':'; normal browser sign-in, no bypass token.')+' Normal spawn and three continuous real-keyboard/mouse flight/room/exhibit/exit routes, no state/camera/pose writes; passive telemetry.',rounds:[],steps:[],errors:[],requests:[],parts:[]};
const browser=await chromium.launch({headless:process.env.SITE_QA_HEADLESS==='1',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling','--disable-renderer-backgrounding']}),context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:input.normalLogin||input.token?undefined:{dir:out,size:{width:1440,height:960}}}),page=await context.newPage();
report.browserMode=process.env.SITE_QA_HEADLESS==='1'?'Installed Chrome headless with actual trusted input':'Installed Chrome headed with actual trusted input';
if(input.token)await context.route('**/*',route=>{const headers={...route.request().headers()};delete headers['oai-sites-authorization'];if(new URL(route.request().url()).origin===origin)headers['OAI-Sites-Authorization']='Bearer '+input.token;return route.continue({headers});});
await page.addInitScript(()=>{window.__siteInputs=[];for(const type of ['keydown','keyup','pointermove','pointerdown','pointerup','click'])window.addEventListener(type,e=>{if(window.starhaven?.ready)__siteInputs.push({type,trusted:e.isTrusted,code:e.code});},true);});
page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.requests.push({origin:new URL(r.url()).origin,path:new URL(r.url()).pathname,reason:r.failure()?.errorText}));page.on('response',r=>{if(r.url().includes('/assets/transport/')&&r.url().endsWith('.part'))report.parts.push({path:new URL(r.url()).pathname,status:r.status()});});
const snapshot=()=>page.evaluate(()=>({state:starhaven.state,player:starhaven.player,keys:starhaven.keys,flight:starhaven.flight,sky:starhaven.sky,book:starhaven.book,passage:starhaven.passage,room:starhaven.inspect.roomEntities(),camera:starhaven.cameraProgress,framing:starhaven.framing}));
const routeOptions={pulseNear:true,timeout:90000};report.nearTargetInput='Real short W pulses with X braking before feedback/turning; no pose or speed writes.';
async function shot(name){if(name.includes('project')||name.includes('overview'))await page.waitForTimeout(280);const file=`${out}/${name}.png`;await page.screenshot({path:file});report.steps.push({name,file,...await snapshot()});console.log(name);}
const fetchSite=async path=>{const target=new URL(path,url);assert.equal(target.origin,origin,'Site QA assets must remain on the selected origin');const response=await context.request.get(target.href,{maxRedirects:0,headers:input.token?{'OAI-Sites-Authorization':'Bearer '+input.token}:{}});assert.ok(response.ok(),'Authenticated Site asset request failed');return {arrayBuffer:()=>response.body()};};
try{
 await page.goto(url);
 if(input.normalLogin){
  console.log('Normal sign-in window is open. Waiting for the owner to finish login; no credentials are read or recorded.');
  const deadline=Date.now()+600000;let ready=false;
  while(Date.now()<deadline&&!ready){assert.ok(!page.isClosed(),'Normal sign-in window was closed');ready=await page.evaluate(()=>Boolean(window.starhaven?.ready)).catch(()=>false);if(!ready)await new Promise(resolve=>setTimeout(resolve,1000));}
  assert.ok(ready,'Normal sign-in timed out');report.errors=[];report.requests=[];
 }
 else await page.waitForFunction(()=>window.starhaven?.ready,null,{timeout:120000});
 await page.locator('#loading').waitFor({state:'hidden'});const hash=b=>createHash('sha256').update(b).digest('hex');report.build={...await runtimeBuildIdentity(page,fetchSite),characterManifestSHA256:hash(Buffer.from(await(await fetchSite('/assets/character/manifest.json')).arrayBuffer()))};report.build.localSHA256=input.expectedSHA256||hash(await readFile('dist/assets/'+report.build.bundle.split('/').at(-1)));report.build.localCSSSHA256=input.expectedCSSSHA256||hash(await readFile('dist/assets/'+report.build.css.split('/').at(-1)));assert.equal(report.build.sha256,report.build.localSHA256);assert.equal(report.build.cssSHA256,report.build.localCSSSHA256);await shot('00-production-loaded');
 const identity=(await snapshot()).room;
 const routes=[{points:[[-15,12,-15],[-119,-28,-82],[-112,-22,-111],[-15,12,-15]],id:'threadcove'},{points:[[12,7,15],[12,7,-10],[-10,7,-10],[-10,5,10],[-1.8,3,9.5]],id:'clawtide'},{points:[[12,-3,12],[-12,10,12],[-2,3,10]],id:'contributions'}];
 for(const [index,route]of routes.entries()){
  for(const [pointIndex,point]of route.points.entries()){await flyTo(page,point,{...routeOptions,radius:1});if(index===0&&pointIndex===2){await faceHeading(page,.2,.1);await shot('01-near-paint-baseline');}}
  if(index===1){await faceHeading(page,0,0);await shot('02-window-furniture');}
  if(index===2){await page.keyboard.down('Space');await page.waitForTimeout(500);await page.keyboard.up('Space');await page.keyboard.down('Shift');await page.waitForTimeout(500);await page.keyboard.up('Shift');await page.keyboard.down('x');await page.waitForTimeout(600);await page.keyboard.up('x');}
  await flyIntoRoom(page,routeOptions);await page.waitForFunction(()=>starhaven.state==='ROOM'&&!starhaven.cameraProgress.transition);const inside=await snapshot();assert.equal(inside.room.groupUUID,identity.groupUUID);assert.deepEqual(inside.room.entities.map(e=>e.uuid),identity.entities.map(e=>e.uuid));await shot(`round-${index+1}-room`);
  await page.locator(`[data-exhibit="${route.id}"]`).click();await page.waitForFunction(()=>starhaven.book.status==='open');
  await page.waitForFunction(()=>{const img=document.querySelector('#project-image');const frame=img.closest('.book-media');return img.complete&&img.naturalWidth>0&&(!frame||frame.dataset.state==='loaded');},null,{timeout:60000});await shot(`round-${index+1}-overview`);
  await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>starhaven.book.status==='open'&&starhaven.book.page===1);
  await page.waitForFunction(()=>{const img=document.querySelector('#project-image');const frame=img.closest('.book-media');return img.complete&&img.naturalWidth>0&&(!frame||frame.dataset.state==='loaded');},null,{timeout:60000});await shot(`round-${index+1}-project`);await page.keyboard.press('Escape');await page.waitForFunction(()=>starhaven.state==='ROOM'&&!starhaven.cameraProgress.transition);
  await page.locator('#exit').click();await page.waitForFunction(()=>starhaven.state==='SPACE'&&!starhaven.cameraProgress.transition);const outside=await snapshot();assert.equal(outside.passage.entries,index+1);assert.equal(outside.passage.exits,index+1);await page.mouse.move(720,480);await page.keyboard.down('w');await page.waitForTimeout(850);await page.keyboard.up('w');await page.keyboard.down('x');await page.waitForTimeout(600);await page.keyboard.up('x');report.rounds.push({round:index+1,status:'passed',entries:outside.passage.entries,exits:outside.passage.exits});console.log(JSON.stringify(report.rounds.at(-1)));
 }
 report.inputs=await page.evaluate(()=>({total:__siteInputs.length,untrusted:__siteInputs.filter(e=>!e.trusted).length}));assert.equal(report.inputs.untrusted,0);assert.deepEqual(report.errors,[]);
 // Retain every failure. Only this origin's cancelled platform challenge is a
 // separate diagnostic; product assets, other origins and other errors fail.
 const platformAbort=r=>r.origin===origin&&r.path.startsWith('/cdn-cgi/challenge-platform/')&&r.reason==='net::ERR_ABORTED';
 report.platformDiagnostics=report.requests.filter(platformAbort);report.productRequestFailures=report.requests.filter(r=>!platformAbort(r));assert.deepEqual(report.productRequestFailures,[]);assert.equal(report.parts.length,11);assert.ok(report.parts.every(p=>p.status===200));report.status=report.platformDiagnostics.length?'passed-with-platform-diagnostics':'passed';
}catch(e){process.exitCode=1;if(input.normalLogin&&!report.build){report.status='login-required';report.failure='Normal owner sign-in did not complete; no Site play performed.';report.errors=[];report.requests=[];}else{report.status='failed';report.failure=e.stack;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}}
finally{for(const key of ['w','x','Space','Shift'])await page.keyboard.up(key).catch(()=>{});await context.close();await browser.close();report.browserClosed=true;await writeFile(process.env.SITE_QA_REPORT||'tests/v21-site-live.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,build:report.build,inputs:report.inputs,rounds:report.rounds,failure:report.failure}));}
