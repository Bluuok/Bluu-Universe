import {runtimeBuildIdentity} from './runtime-build-identity.mjs';
import {chromium,desktopLaunchOptions,saveDesktopFrame} from './browser-runtime.mjs';
import {flyTo,flyIntoRoom,departAfterExit} from './room-flight-route.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.CONTINUOUS_OUT||'screenshots/v14-rc63-continuous';await mkdir(out,{recursive:true});
const flightTimeout=Number(process.env.GOAL_FLIGHT_TIMEOUT_MS||60000),transitionTimeout=Number(process.env.GOAL_CONTACT_TIMEOUT_MS||30000);
const report={started:new Date().toISOString(),method:'One normal load, one page, three consecutive real flight/entry/project/exit routes. No reload, Home, or pose/state/camera writes. Trusted mouse/keyboard and passive telemetry.',environment:{platform:process.platform,executable:chromium.executablePath(),launchOptions:desktopLaunchOptions},rounds:[],errors:[],requests:[]};
const browser=await chromium.launch(desktopLaunchOptions);
const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage();
await page.addInitScript(()=>{window.__continuousInputs=[];window.__continuousSamples=[];let previous=0;for(const type of ['keydown','keyup','pointermove','click'])window.addEventListener(type,e=>window.__continuousInputs.push({type,code:e.code,trusted:e.isTrusted,time:performance.now()}),true);function sample(now){const a=window.starhaven;if(a?.ready&&now-previous>120){previous=now;window.__continuousSamples.push({time:now,state:a.state,player:a.player,keys:a.keys,camera:a.camera,avoidance:a.framing?.avoidance,contacts:a.inspect.collision().lastSolve?.contacts});}requestAnimationFrame(sample);}requestAnimationFrame(sample);});
page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.requests.push({url:r.url(),reason:r.failure()?.errorText}));
const snap=()=>page.evaluate(()=>({state:starhaven.state,passage:starhaven.passage,player:starhaven.player,keys:starhaven.keys,room:starhaven.inspect.roomEntities()}));
try{
 await page.goto(process.env.GOAL_URL||'http://127.0.0.1:4259/');
 report.build=await runtimeBuildIdentity(page);
 await page.waitForFunction(()=>window.starhaven?.ready,null,{timeout:120000});await page.bringToFront();await page.locator('#loading').waitFor({state:'hidden'});
 report.renderer=await page.evaluate(()=>{const canvas=document.getElementById('world'),gl=canvas.getContext('webgl2')||canvas.getContext('webgl');if(!gl)return null;const ext=gl.getExtension('WEBGL_debug_renderer_info');return {version:gl.getParameter(gl.VERSION),renderer:gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER),vendor:gl.getParameter(ext?ext.UNMASKED_VENDOR_WEBGL:gl.VENDOR)};});
 const identity=(await snap()).room;
 const routes=[{points:[[-3,3,10]],projects:['threadcove']},{points:[[12,5,15],[12,7,-10],[-10,7,-10],[-10,5,10]],projects:['clawtide']},{points:[[12,-3,12],[-12,10,12],[-2,3,10]],riseAfterFirst:true,projects:['contributions','contact']}];
 for(const [index,route]of routes.entries()){
  const round={round:index+1,waypoints:[],projects:route.projects};report.rounds.push(round);
  for(const [pointIndex,point]of route.points.entries()){
   await flyTo(page,point,{radius:1,timeout:flightTimeout});round.waypoints.push(await snap());
   if(route.riseAfterFirst&&pointIndex===0){
    // A nearly vertical target has no stable horizontal bearing for flyTo's
    // aiming helper. Exercise the product's actual dedicated rise key.
    await page.mouse.move(720,480);await page.keyboard.down('Space');
    try{await page.waitForFunction(()=>starhaven.player[1]>=9.5,null,{timeout:transitionTimeout});}finally{await page.keyboard.up('Space');}
    await page.keyboard.down('x');await page.waitForTimeout(700);await page.keyboard.up('x');round.verticalRise=await snap();assert.ok(round.verticalRise.player[1]>9.4);
   }
  }
  await flyIntoRoom(page,{timeout:flightTimeout});await page.waitForFunction(()=>starhaven.state==='ROOM'&&!starhaven.cameraProgress.transition,null,{timeout:transitionTimeout});round.entered=await snap();assert.equal(round.entered.passage.entries,index+1);assert.equal(round.entered.room.groupUUID,identity.groupUUID);assert.deepEqual(round.entered.room.entities.map(e=>e.uuid),identity.entities.map(e=>e.uuid));
  round.roomScreenshot=`${out}/round-${index+1}-room.png`;round.capture=await saveDesktopFrame(page,round.roomScreenshot,{settle:true,finishGPU:true});
  round.projectScreenshots=[];
  for(const id of route.projects){await page.locator(`#hotspots [data-exhibit="${id}"]`).click();await page.waitForFunction(project=>starhaven.book.status==='open'&&starhaven.currentProject===project,id,{timeout:transitionTimeout});const file=`${out}/round-${index+1}-project-${id}.png`;round.projectScreenshots.push({id,file,capture:await saveDesktopFrame(page,file,{settle:true,finishGPU:true})});await page.locator('#project-back').click();await page.waitForFunction(()=>starhaven.state==='ROOM'&&!starhaven.cameraProgress.transition,null,{timeout:transitionTimeout});}
  await page.locator('#exit').click();await page.waitForFunction(()=>starhaven.state==='SPACE'&&!starhaven.cameraProgress.transition,null,{timeout:transitionTimeout});round.exited=await snap();assert.equal(round.exited.passage.exits,index+1);assert.deepEqual(round.exited.keys,[]);
  round.exitScreenshot=`${out}/round-${index+1}-exit.png`;round.exitCapture=await saveDesktopFrame(page,round.exitScreenshot,{settle:true,finishGPU:true});
  round.departure=await departAfterExit(page,{timeout:transitionTimeout});round.departed=await snap();assert.equal(round.departed.state,'SPACE');assert.equal(round.departed.passage.entries,index+1);assert.ok(round.departed.player[2]>round.exited.player[2]+2);round.departedScreenshot=`${out}/round-${index+1}-departed.png`;round.departedCapture=await saveDesktopFrame(page,round.departedScreenshot,{settle:true,finishGPU:true});round.status='passed';
  console.log(JSON.stringify({round:index+1,entries:round.departed.passage.entries,exits:round.departed.passage.exits,status:round.status}));
  console.log(`::notice title=Continuous visit::Round ${index+1} passed; entries=${round.departed.passage.entries}, exits=${round.departed.passage.exits}`);
 }
 report.inputs=await page.evaluate(()=>window.__continuousInputs);report.trustedInputs=report.inputs.filter(i=>i.trusted).length;report.untrustedInputs=report.inputs.filter(i=>!i.trusted).length;assert.equal(report.untrustedInputs,0);assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;await saveDesktopFrame(page,`${out}/failure.png`).catch(captureError=>{report.failureCaptureError=captureError.message;});}
finally{
 const telemetry=await page.evaluate(()=>({inputs:window.__continuousInputs,samples:window.__continuousSamples})).catch(()=>null);
 if(telemetry){report.inputs=telemetry.inputs;report.samples=telemetry.samples;report.trustedInputs=report.inputs.filter(i=>i.trusted).length;report.untrustedInputs=report.inputs.filter(i=>!i.trusted).length;}else report.inputCaptureUnavailable=true;
 await page.keyboard.up('w').catch(()=>{});await page.keyboard.up('x').catch(()=>{});await context.close();report.video=process.env.REMOTE_SCREEN_RECORDING||null;await browser.close();report.browserClosed=true;report.finished=new Date().toISOString();await writeFile(process.env.CONTINUOUS_REPORT||'tests/v14-rc63-continuous.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,rounds:report.rounds.length,trustedInputs:report.trustedInputs,failure:report.failure}));}
