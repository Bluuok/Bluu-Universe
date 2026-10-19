import {chromium} from '@playwright/test';
import {flyIntoRoom} from './room-flight-route.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {runtimeBuildIdentity} from './runtime-build-identity.mjs';
import assert from 'node:assert/strict';
const out=process.env.BOOK_MEDIA_OUT||'screenshots/v23-book-media';await mkdir(out,{recursive:true});
const report={started:new Date().toISOString(),method:'Headed installed Chrome, normal spawn and actual keyboard/RMB flight into shared room. Real clicks/keys; delayed/failed screenshot responses are explicit network fixtures. No pose/state/camera writes.',checks:[],errors:[],requests:[]};
const browser=await chromium.launch({headless:false,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling','--disable-renderer-backgrounding']}),context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage();
await page.addInitScript(()=>{window.__mediaInputs=[];for(const type of ['keydown','keyup','pointermove','pointerdown','pointerup','click'])addEventListener(type,e=>__mediaInputs.push(e.isTrusted),true);});
page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.requests.push({path:new URL(r.url()).pathname,reason:r.failure()?.errorText}));
page.on('console',m=>{if(m.type()==='error'&&/THREE\.WebGLProgram|VALIDATE_STATUS|Shader Error|GL_INVALID/.test(m.text()))report.errors.push(m.text());});
let releaseHome,releaseDetails,failClaw=true,homeHeld=false,detailsHeld=false;
const read=()=>page.evaluate(()=>{const frame=document.querySelector('.book-media'),img=document.querySelector('#project-image');return {project:starhaven.currentProject,book:starhaven.book,state:frame.dataset.state,rect:{width:frame.getBoundingClientRect().width,height:frame.getBoundingClientRect().height},src:img.getAttribute('src'),imageHidden:img.hidden,width:img.naturalWidth,focus:document.activeElement?.id||document.activeElement?.dataset.exhibit,focusPage:document.activeElement?.dataset.bookPage,busy:frame.getAttribute('aria-busy')};});
async function shot(name){if((await read()).state==='loaded')await page.waitForTimeout(280);const file=`${out}/${name}.png`;await page.screenshot({path:file});const state=await read();report.checks.push({name,file,state});console.log(JSON.stringify({name,state}));return state;}
const loaded=()=>page.waitForFunction(()=>document.querySelector('.book-media').dataset.state==='loaded'&&document.querySelector('#project-image').naturalWidth>0);
try{
 await page.route('**/assets/projects/threadcove-home.png',async route=>{if(!homeHeld){homeHeld=true;await new Promise(resolve=>{releaseHome=resolve;});await route.abort('failed').catch(()=>{});return;}await route.continue().catch(()=>{});});
 await page.route('**/assets/projects/threadcove-conversation.png',async route=>{if(!detailsHeld){detailsHeld=true;await new Promise(resolve=>{releaseDetails=resolve;});}await route.continue().catch(()=>{});});
 await page.route('**/assets/projects/clawtide-chat.png',route=>{if(failClaw){failClaw=false;return route.abort('failed');}return route.continue();});
 await page.goto(process.env.BOOK_MEDIA_URL||'http://127.0.0.1:4259/');await page.waitForFunction(()=>window.starhaven?.ready);await page.locator('#loading').waitFor({state:'hidden'});report.build=await runtimeBuildIdentity(page);
 await flyIntoRoom(page);await page.locator('[data-exhibit="threadcove"]').click();await page.waitForFunction(()=>starhaven.book.status==='open');
 const loading=await shot('01-delayed-image');assert.equal(loading.state,'loading');assert.equal(loading.imageHidden,true);assert.ok(loading.rect.height>120);assert.equal(loading.busy,'true');assert.ok(releaseHome);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>starhaven.state==='ROOM'&&!starhaven.cameraProgress.transition);releaseHome();await page.waitForFunction(()=>document.querySelector('#project-image').complete&&!document.querySelector('#project-image').naturalWidth);
 await page.locator('[data-exhibit="threadcove"]').click();await page.waitForFunction(()=>starhaven.book.status==='open');assert.equal((await read()).state,'error');assert.ok(await page.locator('#book-media-retry').isVisible());await shot('01b-reopen-failed-while-closed');report.closedFailureRecovered=true;
 await page.locator('#book-media-retry').click();await loaded();const complete=await shot('02-loaded-image');assert.ok(Math.abs(loading.rect.height-complete.rect.height)<1);assert.equal(complete.busy,'false');
 await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>starhaven.book.status==='open'&&starhaven.book.page===1);assert.equal((await read()).state,'loading');assert.ok(releaseDetails);await page.keyboard.press('Escape');await page.waitForFunction(()=>starhaven.state==='ROOM'&&!starhaven.cameraProgress.transition);
 await page.locator('[data-exhibit="clawtide"]').click();await page.waitForFunction(()=>starhaven.book.status==='open'&&document.querySelector('.book-media').dataset.state==='error');const failed=await shot('03-image-failed');assert.ok(failed.rect.height>120);assert.equal(failed.imageHidden,true);assert.ok(await page.locator('#book-media-retry').isVisible());assert.ok(await page.locator('.book-empty').isHidden());
 releaseDetails();await page.waitForTimeout(600);const late=await read();assert.equal(late.project,'clawtide');assert.equal(late.state,'error');assert.ok(late.src.endsWith('clawtide-chat.png'));
 await page.locator('#book-media-retry').click();await loaded();const retry=await shot('04-retry-loaded');assert.equal(retry.focusPage,'0');assert.ok(Math.abs(retry.rect.height-failed.rect.height)<1);
 for(const chapter of [1,2,0,1,0])await page.locator(`[data-book-page="${chapter}"]`).click();await page.waitForFunction(()=>starhaven.book.status==='open'&&starhaven.book.page===0);await loaded();await shot('05-rapid-turn-final');
 const bounds=await page.locator('#project-image').evaluate(img=>{const a=img.getBoundingClientRect(),b=img.closest('.book-media').getBoundingClientRect(),s=getComputedStyle(img);return {top:a.top-b.top,bottom:b.bottom-a.bottom,left:a.left-b.left,right:b.right-a.right,margin:s.margin,background:s.backgroundColor};});assert.equal(bounds.margin,'0px');assert.equal(bounds.background,'rgba(0, 0, 0, 0)');assert.ok(Object.values(bounds).slice(0,4).every(v=>v>=3&&v<=6));report.imageBounds=bounds;
 await page.keyboard.press('Escape');await page.waitForFunction(()=>starhaven.state==='ROOM'&&!starhaven.cameraProgress.transition);await page.locator('[data-exhibit="threadcove"]').click();await page.waitForFunction(()=>starhaven.book.status==='open');await loaded();
 // Auxiliary decode timing fault. Real UI turns exercise A -> B -> A; no
 // state, pose, camera, or product method is called by this instrumentation.
 await page.locator('#project-image').evaluate(img=>{window.__nativeMediaDecode=img.decode.bind(img);window.__heldMediaDecodes=[];img.decode=()=>img.getAttribute('src').endsWith('threadcove-home.png')?new Promise((resolve,reject)=>__heldMediaDecodes.push({resolve,reject})):__nativeMediaDecode();});
 await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>starhaven.book.status==='open'&&starhaven.book.page===1);await loaded();await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>window.__heldMediaDecodes.length>=1&&starhaven.book.status==='open');
 await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>starhaven.book.status==='open'&&starhaven.book.page===1);await loaded();await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>window.__heldMediaDecodes.length>=2&&starhaven.book.status==='open');
 await page.evaluate(()=>__heldMediaDecodes[0].reject(new DOMException('Injected obsolete decode','AbortError')));await page.waitForTimeout(80);assert.equal((await read()).state,'loading');
 await page.evaluate(async()=>{await __nativeMediaDecode();__heldMediaDecodes.at(-1).resolve();document.querySelector('#project-image').decode=__nativeMediaDecode;});await loaded();await shot('05b-obsolete-same-url-decode');report.obsoleteDecodeIgnored=true;
 await page.setViewportSize({width:900,height:650});await page.waitForTimeout(400);const compact=await shot('06-desktop-window');assert.ok(compact.rect.width<=900);assert.ok(await page.locator('#project-close').isVisible());
 await page.setViewportSize({width:1440,height:960});await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#project-image').evaluate(el=>getComputedStyle(el).animationName),'none');await page.keyboard.press('Escape');await page.waitForFunction(()=>starhaven.state==='ROOM'&&!starhaven.cameraProgress.transition);
 await page.locator('[data-exhibit="contact"]').click();await page.waitForFunction(()=>starhaven.book.status==='open');const empty=await shot('07-no-media');assert.equal(empty.state,'empty');assert.ok(await page.locator('.book-empty').isVisible());assert.equal(empty.busy,'false');await page.keyboard.press('Escape');await page.waitForFunction(()=>starhaven.state==='ROOM'&&!starhaven.cameraProgress.transition);await page.locator('#exit').click();await page.waitForFunction(()=>starhaven.state==='SPACE'&&!starhaven.cameraProgress.transition);
 // PR2 integration: catalog and adjacent projects after the explicit media
 // faults above, so lazy thumbnails cannot consume a notebook fault fixture.
 await page.emulateMedia({reducedMotion:'no-preference'});
 const flightOrigin=await page.evaluate(()=>({player:starhaven.player,yaw:starhaven.flight.yaw,pitch:starhaven.flight.pitch}));
 await page.locator('#project-toggle').click();
 assert.equal(await page.locator('#catalog .catalog-item').count(),4);
 await page.waitForFunction(()=>[...document.querySelectorAll('#catalog img')].every(img=>img.complete&&img.naturalWidth>0));
 await page.screenshot({path:`${out}/08-editorial-catalog.png`});
 await page.locator('#catalog [data-project-id="threadcove"]').click();
 await page.waitForFunction(()=>starhaven.book.status==='open');await loaded();
 await page.locator('#project-previous').click();await page.waitForFunction(()=>starhaven.book.status==='open'&&starhaven.currentProject==='contact');
 await page.locator('#project-next').click();await page.waitForFunction(()=>starhaven.book.status==='open'&&starhaven.currentProject==='threadcove');
 for(let i=0;i<8;i++)await page.locator('#project-next').click({force:true});
 await page.waitForFunction(()=>starhaven.book.status==='open'&&starhaven.currentProject==='threadcove');await loaded();
 assert.equal(await page.locator('#project-next').evaluate(el=>el===document.activeElement),true);
 await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>starhaven.book.status==='open'&&starhaven.book.page===1);
 assert.equal(await page.evaluate(()=>starhaven.currentProject),'threadcove');await loaded();
 await page.setViewportSize({width:900,height:650});await page.waitForTimeout(450);
 const heading=await page.locator('.book-heading').evaluate(el=>{
   const panel=document.querySelector('#project-panel').getBoundingClientRect(),buttons=[...el.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
   return {panel:{left:panel.left,right:panel.right},buttons,columns:getComputedStyle(document.querySelector('.book-spread')).gridTemplateColumns};
 });
 assert.ok(heading.buttons.every(b=>b.left>=heading.panel.left&&b.right<=heading.panel.right));
 assert.ok(heading.buttons.every((b,i)=>heading.buttons.every((c,j)=>i===j||b.right<=c.left||c.right<=b.left)));
 assert.equal(heading.columns.split(' ').length,2);report.adjacentHeader=heading;await shot('09-desktop-adjacent-projects');
 await page.setViewportSize({width:1440,height:960});await page.waitForTimeout(450);
 await page.locator('#project-next').click();await page.keyboard.press('Escape');await page.waitForFunction(()=>starhaven.state==='SPACE'&&!starhaven.cameraProgress.transition);
 assert.equal(await page.locator('#project-toggle').evaluate(el=>el===document.activeElement),true);
 const returned=await page.evaluate(()=>({player:starhaven.player,yaw:starhaven.flight.yaw,pitch:starhaven.flight.pitch}));assert.deepEqual(returned,flightOrigin);
 await flyIntoRoom(page);const roomEntities=await page.evaluate(()=>starhaven.inspect.roomEntities());
 await page.locator('[data-exhibit="threadcove"]').click();await page.waitForFunction(()=>starhaven.book.status==='open');
 for(const expected of ['clawtide','contributions']){await page.locator('#project-next').click();await page.waitForFunction(id=>starhaven.book.status==='open'&&starhaven.currentProject===id,expected);}
 await page.locator('#project-back').click();await page.waitForFunction(()=>starhaven.state==='ROOM'&&!starhaven.cameraProgress.transition);
 const returnedEntities=await page.evaluate(()=>starhaven.inspect.roomEntities());
 assert.equal(returnedEntities.groupUUID,roomEntities.groupUUID);
 for(const before of roomEntities.entities){
   const after=returnedEntities.entities.find(e=>e.uuid===before.uuid);assert.ok(after,'Room must retain the same entity');
   assert.deepEqual(after.worldMatrix.slice(12,15),before.worldMatrix.slice(12,15),'Furniture must retain its position');
   if(!/chair/i.test(before.name))assert.deepEqual(after.worldMatrix,before.worldMatrix,'Static furniture must retain its transform');
 }
 await page.locator('#exit').click();await page.waitForFunction(()=>starhaven.state==='SPACE'&&!starhaven.cameraProgress.transition);report.adjacentProjects={wrap:true,rapidSwitches:8,chapterDistinct:true,spaceReturn:true,roomReturn:true,closeDuringSwitch:true};
 report.inputs=await page.evaluate(()=>({trusted:__mediaInputs.filter(Boolean).length,untrusted:__mediaInputs.filter(v=>!v).length}));assert.equal(report.inputs.untrusted,0);assert.deepEqual(report.errors,[]);assert.ok(report.requests.every(r=>r.path.startsWith('/assets/projects/')&&['net::ERR_FAILED','net::ERR_ABORTED'].includes(r.reason)));report.expectedNetworkFailures=report.requests;report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{releaseHome?.();releaseDetails?.();await context.close();await browser.close();report.browserClosed=true;report.finished=new Date().toISOString();await writeFile(process.env.BOOK_MEDIA_REPORT||'tests/v23-book-media.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,inputs:report.inputs,failure:report.failure}));}
