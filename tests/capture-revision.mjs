import {chromium} from './browser-runtime.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {captureOriginalReference,referenceCaptureSpec} from './capture-reference.mjs';
import {compareCapturedColors} from './color-compare.mjs';
import {verifySkySnapshots} from './verify-sky.mjs';

// Prepared only: a supplied revision hash is mandatory before any browser launches.
// Camera requests go exclusively through the application's CameraDirector frameView action.
const expectedBuild=process.env.REVISION_BUILD;
if(!expectedBuild){console.log('Prepared. Set REVISION_BUILD=index-<hash>.js before running.');process.exit(0);}
const timeout=180000;
const outDir=path.resolve('screenshots/revision');
const report={expectedBuild,url:process.env.REVISION_URL||'http://127.0.0.1:4175',startedAt:new Date().toISOString(),captures:[],checks:[],consoleErrors:[],shaderErrors:[],shaderWarnings:[],pageErrors:[],requestFailures:[]};
let browser,page,cdp;
const save=()=>writeFile('tests/revision-capture.json',JSON.stringify(report,null,2)+'\n','utf8');
const readSnapshot=()=>{
  const a=window.starhaven;const overlay=document.getElementById('transition');const style=overlay?getComputedStyle(overlay):null;const alpha=style&&style.display!=='none'&&style.visibility!=='hidden'?Number(style.opacity):0;
  return {atUtc:new Date().toISOString(),performanceMs:performance.now(),frame:window.__revisionFrameNo||0,state:a.state,player:a.player,velocity:a.velocity,keys:a.keys,camera:a.camera,cameraProgress:a.cameraProgress,architecture:a.architecture,sky:a.sky,rendering:a.rendering,coverage:{overlayOpacity:alpha,covered:alpha>.8},lastRenderedFrame:window.__revisionFrames?.at(-1)||null};
};
const snapshot=()=>page.evaluate(readSnapshot);

const waitState=state=>page.waitForFunction(s=>window.starhaven.state===s,state,{timeout});
const settled=state=>page.waitForFunction(s=>{
  const a=window.starhaven;const el=document.getElementById('transition');const opacity=el?Number(getComputedStyle(el).opacity):0;
  return a.state===s&&a.cameraProgress?.transition===null&&opacity<.02;
},state,{timeout});
async function view(name,state){assert.equal(await page.evaluate(n=>window.starhaven.frameView(n),name),true,'Unknown or locked CameraDirector view '+name);await settled(state);}
async function capture(name,intendedState){
  // Only real composited browser pixels are saved. Before/after telemetry is retained
  // and a moving screenshot is rejected if it crosses navigation states or fades.
  const before=await snapshot();assert.equal(before.state,intendedState);assert.ok(before.coverage.overlayOpacity<.02,'Covered frame rejected');
  const rendered=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
  const file=path.join(outDir,name+'.png');await writeFile(file,Buffer.from(rendered.data,'base64'));const after=await snapshot();
  const entry={name,file,intendedState,before,after,stateChangedDuringExposure:before.state!==after.state,coverageChangedDuringExposure:after.coverage.overlayOpacity>=.02};report.captures.push(entry);await save();console.log(JSON.stringify({capture:name,file,stateBefore:before.state,stateAfter:after.state,cameraBefore:before.camera,cameraAfter:after.camera,progressBefore:before.cameraProgress.transition?.progress,progressAfter:after.cameraProgress.transition?.progress,coverageBefore:before.coverage.overlayOpacity,coverageAfter:after.coverage.overlayOpacity}));
  assert.equal(entry.stateChangedDuringExposure,false,'Capture crossed navigation state '+name);assert.equal(entry.coverageChangedDuringExposure,false,'Overlay covered capture '+name);
}
async function lockedKey(code,key,expectedState){
  await page.evaluate(()=>window.__revisionKeydowns=[]);
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',code,key,windowsVirtualKeyCode:key.toUpperCase().charCodeAt(0),nativeVirtualKeyCode:key.toUpperCase().charCodeAt(0)});
  await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',code,key,windowsVirtualKeyCode:key.toUpperCase().charCodeAt(0),nativeVirtualKeyCode:key.toUpperCase().charCodeAt(0)});
  const observed=await page.evaluate(()=>window.__revisionKeydowns.at(-1));assert.ok(observed?.trusted);assert.equal(observed.state,expectedState);assert.deepEqual(observed.keys,[]);report.checks.push({name:'trusted input locked in '+expectedState,status:'passed',observed});
}
try{
  browser=await chromium.launch({headless:true,executablePath:'C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--enable-unsafe-swiftshader']});
  report.captureSpec=referenceCaptureSpec;if(process.env.COMPARE_REFERENCE==='1')report.reference=await captureOriginalReference(browser);
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});page=await context.newPage();page.setDefaultTimeout(timeout);cdp=await context.newCDPSession(page);
  page.on('console',m=>{const text=m.text();if(m.type()==='error')report.consoleErrors.push(text);if(/shader|webglprogram|compile.*program|link.*program/i.test(text)){if(m.type()==='error')report.shaderErrors.push(text);else if(m.type()==='warning')report.shaderWarnings.push(text);}});page.on('pageerror',e=>report.pageErrors.push(e.message));page.on('requestfailed',r=>report.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
  await page.goto(report.url,{waitUntil:'networkidle',timeout});await page.waitForFunction(()=>window.starhaven?.ready,null,{timeout});await page.locator('#loading').waitFor({state:'hidden'});
  const scripts=await page.locator('script[src]').evaluateAll(es=>es.map(e=>e.getAttribute('src')));report.build=scripts.find(s=>s.includes('/assets/index-'))?.split('/').pop();assert.equal(report.build,expectedBuild);
  report.anchors=await page.evaluate(()=>window.starhaven.anchors);report.building=await page.evaluate(()=>window.starhaven.manifest.building);assert.ok(report.anchors?.entry&&report.anchors?.docking);assert.ok(await page.evaluate(()=>window.starhaven.cameraProgress&&typeof window.starhaven.frameView==='function'));
  await mkdir(outDir,{recursive:true});
  await page.evaluate(()=>{
    window.__revisionFrames=[];window.__revisionFrameNo=0;window.__revisionKeydowns=[];
    window.addEventListener('keydown',e=>{const a=window.starhaven;window.__revisionKeydowns.push({code:e.code,trusted:e.isTrusted,state:a.state,keys:a.keys,velocity:a.velocity});});
    function record(t){const a=window.starhaven;const overlay=document.getElementById('transition');window.__revisionFrameNo++;window.__revisionFrames.push({frame:window.__revisionFrameNo,rafMs:t,state:a.state,camera:a.camera,cameraProgress:a.cameraProgress,overlayOpacity:overlay?Number(getComputedStyle(overlay).opacity):0});if(window.__revisionFrames.length>1000)window.__revisionFrames.shift();requestAnimationFrame(record)}requestAnimationFrame(record);
  });
  await view('externalFront','SPACE');await capture('external-front','SPACE');if(report.reference){report.colorComparison=await compareCapturedColors(report.reference.screenshot,path.join(outDir,'external-front.png'));await save();console.log(JSON.stringify({mainColorPresence:report.colorComparison.presence,mainSkyGold:report.colorComparison.main.gold,mainSkyBlue:report.colorComparison.main.blue}));}
  report.character=await page.evaluate(()=>({asset:window.starhaven.manifest.character,loading:window.starhaven.loading,provisional:window.starhaven.provisionalCharacter}));assert.equal(report.character.provisional,false,'Final cute astronaut must be the configured real model');assert.equal(report.character.loading.character,true);
  await page.evaluate(()=>window.starhaven.frameCharacter());await settled('SPACE');await capture('astronaut-closeup','SPACE');await view('externalFront','SPACE');
  await page.locator('#enter').click();await waitState('DOCKING');await lockedKey('KeyW','w','DOCKING');
  await page.waitForFunction(()=>window.starhaven.state==='DOCKING'&&(window.starhaven.cameraProgress.transition?.progress||0)>=.45,null,{timeout});await capture('entrance-01-docking','DOCKING');
  await waitState('TRANSITION');
  await page.waitForFunction(()=>window.starhaven.state==='TRANSITION'&&(window.starhaven.cameraProgress.transition?.progress||0)>=.2&&Number(getComputedStyle(document.getElementById('transition')).opacity)<.02,null,{timeout});await capture('entrance-02-threshold','TRANSITION');await lockedKey('KeyA','a','TRANSITION');
  await settled('ROOM');await capture('entrance-03-room','ROOM');
  const architecture=(await snapshot()).architecture;assert.equal(architecture.roomVisible,true);assert.equal(architecture.terraceVisible,true);assert.equal(architecture.cutaway,true);report.checks.push({name:'shared room and real terrace visible in ROOM',status:'passed',architecture});
  await view('roomTerrace','ROOM');await capture('room-overview-with-terrace','ROOM');
  const exhibit=page.locator('#hotspots button').filter({hasText:'ThreadCove'});await exhibit.waitFor({state:'visible'});await exhibit.click();await waitState('PROJECT');report.projectSnapshot=await snapshot();assert.equal(await page.locator('#project-title').innerText(),'ThreadCove');await page.waitForFunction(()=>document.getElementById('project-image').complete&&document.getElementById('project-image').naturalWidth>=300,null,{timeout});
  report.checks.push({name:'existing ThreadCove real exhibit click',status:'passed',image:await page.locator('#project-image').evaluate(e=>({src:e.getAttribute('src'),width:e.naturalWidth,height:e.naturalHeight}))});
  await page.locator('#project-back').click();await settled('ROOM');await view('insideFacingDoor','ROOM');await capture('room-terrace','ROOM');
  await page.locator('#exit').click();await waitState('TRANSITION');await lockedKey('KeyD','d','TRANSITION');await settled('SPACE');const returned=await snapshot();const proximity=Math.hypot(...returned.player.map((v,i)=>v-report.anchors.docking[i]));assert.ok(proximity<2,'Exit returned away from shared entrance docking anchor');assert.equal(returned.architecture.cutaway,false);assert.equal(returned.architecture.terraceVisible,true);report.checks.push({name:'exit returns through shared entrance',status:'passed',docking:report.anchors.docking,returned,proximity});
  report.styleStates=[...report.captures.map(c=>({name:c.name,state:c.before.state,sky:c.before.sky,rendering:c.before.rendering})),{name:'PROJECT',state:report.projectSnapshot.state,sky:report.projectSnapshot.sky,rendering:report.projectSnapshot.rendering},{name:'EXIT',state:returned.state,sky:returned.sky,rendering:returned.rendering}];
  if(process.env.COMPARE_REFERENCE==='1')report.skyVerification=verifySkySnapshots(report.styleStates);
  report.timeline=await page.evaluate(()=>window.__revisionFrames);
  // Close the desktop context before mobile rendering; both remain this isolated browser.
  await context.close();
  const mobileContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  page=await mobileContext.newPage();page.setDefaultTimeout(timeout);cdp=await mobileContext.newCDPSession(page);
  page.on('console',m=>{const text=m.text();if(m.type()==='error')report.consoleErrors.push(text);if(/shader|webglprogram|compile.*program|link.*program/i.test(text)){if(m.type()==='error')report.shaderErrors.push(text);else if(m.type()==='warning')report.shaderWarnings.push(text);}});
  page.on('pageerror',e=>report.pageErrors.push(e.message));page.on('requestfailed',r=>report.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
  await page.goto(report.url,{waitUntil:'networkidle',timeout});await page.waitForFunction(()=>window.starhaven?.ready,null,{timeout});await page.locator('#loading').waitFor({state:'hidden'});
  const mobileBuild=await page.locator('script[src]').evaluateAll(es=>es.map(e=>e.getAttribute('src')).find(s=>s.includes('/assets/index-'))?.split('/').pop());assert.equal(mobileBuild,expectedBuild);
  const mobileLayout=()=>page.evaluate(()=>({viewport:[innerWidth,innerHeight],scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],body:[document.body.scrollWidth,document.body.scrollHeight],nav:{background:getComputedStyle(document.querySelector('header nav')).backgroundColor,color:getComputedStyle(document.querySelector('header nav')).color},header:[...document.querySelectorAll('header,#project-toggle,#sound')].map(e=>({tag:e.id||e.tagName,rect:{x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height},text:e.textContent.trim()}))}));
  const assertFits=d=>{assert.ok(d.scroll[0]<=390&&d.body[0]<=390,'Mobile horizontal overflow '+JSON.stringify(d));for(const e of d.header){assert.ok(e.rect.x>=0&&e.rect.y>=0&&e.rect.width>0&&e.rect.height>0&&e.rect.x+e.rect.width<=390+.5&&e.rect.y+e.rect.height<=844,'Mobile header outside viewport '+JSON.stringify(e));}};
  const initialMobile=await mobileLayout();assertFits(initialMobile);assert.equal(await page.locator('header').isVisible(),true);assert.equal(await page.locator('#project-toggle').isVisible(),true);assert.equal(await page.locator('#sound').isVisible(),true);
  assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');await page.locator('#sound').tap();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');await page.locator('#sound').tap();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');
  await page.locator('#project-toggle').tap();await page.locator('#catalog').waitFor({state:'visible'});const catalogMobile=await mobileLayout();assertFits(catalogMobile);
  await page.locator('#catalog-items button').filter({hasText:'Clawtide'}).tap();await waitState('PROJECT');assert.equal(await page.locator('#project-title').innerText(),'Clawtide');await page.waitForFunction(()=>document.getElementById('project-image').complete&&document.getElementById('project-image').naturalWidth>=300,null,{timeout});const projectMobile=await mobileLayout();assertFits(projectMobile);assert.equal(await page.locator('#project-toggle').isVisible(),true);
  await page.locator('#project-back').tap();await settled('SPACE');await page.locator('#project-toggle').tap();await page.locator('#catalog').waitFor({state:'visible'});await page.locator('#catalog-close').tap();await page.locator('#catalog').waitFor({state:'hidden'});
  report.mobile={status:'passed',build:mobileBuild,initial:initialMobile,catalog:catalogMobile,project:projectMobile,soundTapWorks:true,catalogTapWorks:true,projectEntryWorks:true,persistentCatalog:true};await save();await mobileContext.close();page=null;
  if(report.reference)report.colorComparison=await compareCapturedColors(report.reference.screenshot,path.join(outDir,'external-front.png'));
  assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.shaderErrors,[]);assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.requestFailures,[]);report.checks.push({name:'no console shader page or request errors',status:'passed'});report.status='passed';
}catch(error){report.status='failed';report.error={message:error.message,stack:error.stack};if(page)report.failureSnapshot=await snapshot().catch(()=>null);console.log('FAIL '+error.message);}
finally{report.finishedAt=new Date().toISOString();if(page&&!report.timeline)report.timeline=await page.evaluate(()=>window.__revisionFrames||[]).catch(()=>[]);await save();await browser?.close();console.log(JSON.stringify({status:report.status,build:report.build,captures:report.captures.length,checks:report.checks.length,consoleErrors:report.consoleErrors.length,shaderErrors:report.shaderErrors.length,shaderWarnings:report.shaderWarnings.length,pageErrors:report.pageErrors.length}));process.exitCode=report.status==='passed'?0:1;}
