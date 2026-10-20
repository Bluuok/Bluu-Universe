import {runtimeBuildIdentity} from './runtime-build-identity.mjs';
import {chromium,desktopLaunchOptions} from './browser-runtime.mjs';
import {flyTo,flyIntoRoom} from './room-flight-route.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.CONTINUOUS_OUT||'screenshots/v14-rc63-continuous';await mkdir(out,{recursive:true});
const report={started:new Date().toISOString(),method:'One normal load, one page, three consecutive real flight/entry/project/exit routes. No reload, Home, or pose/state/camera writes. Trusted mouse/keyboard and passive telemetry.',environment:{platform:process.platform,executable:chromium.executablePath(),launchOptions:desktopLaunchOptions},rounds:[],errors:[],requests:[]};
const browser=await chromium.launch(desktopLaunchOptions);
const context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:out,size:{width:1440,height:960}}}),page=await context.newPage();
await page.addInitScript(()=>{window.__continuousInputs=[];for(const type of ['keydown','keyup','pointermove','click'])window.addEventListener(type,e=>window.__continuousInputs.push({type,code:e.code,trusted:e.isTrusted}),true);});
page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.requests.push({url:r.url(),reason:r.failure()?.errorText}));
const snap=()=>page.evaluate(()=>({state:starhaven.state,passage:starhaven.passage,player:starhaven.player,keys:starhaven.keys,room:starhaven.inspect.roomEntities()}));
try{
 await page.goto(process.env.GOAL_URL||'http://127.0.0.1:4259/');await page.waitForFunction(()=>window.starhaven?.ready);await page.locator('#loading').waitFor({state:'hidden'});
 report.build=await runtimeBuildIdentity(page);
 const identity=(await snap()).room;
 const routes=[{points:[[-3,3,10]],projects:['threadcove']},{points:[[12,5,15],[12,7,-10],[-10,7,-10],[-10,5,10]],projects:['clawtide']},{points:[[12,-3,12],[-12,10,12],[-2,3,10]],riseAfterFirst:true,projects:['contributions','contact']}];
 for(const [index,route]of routes.entries()){
  const round={round:index+1,waypoints:[],projects:route.projects};report.rounds.push(round);
  for(const [pointIndex,point]of route.points.entries()){
   await flyTo(page,point,{radius:1,timeout:60000});round.waypoints.push(await snap());
   if(route.riseAfterFirst&&pointIndex===0){
    // A nearly vertical target has no stable horizontal bearing for flyTo's
    // aiming helper. Exercise the product's actual dedicated rise key.
    await page.mouse.move(720,480);await page.keyboard.down('Space');
    try{await page.waitForFunction(()=>starhaven.player[1]>=9.5,{timeout:7000});}finally{await page.keyboard.up('Space');}
    await page.keyboard.down('x');await page.waitForTimeout(700);await page.keyboard.up('x');round.verticalRise=await snap();assert.ok(round.verticalRise.player[1]>9.4);
   }
  }
  await flyIntoRoom(page);await page.waitForFunction(()=>starhaven.state==='ROOM'&&!starhaven.cameraProgress.transition);round.entered=await snap();assert.equal(round.entered.passage.entries,index+1);assert.equal(round.entered.room.groupUUID,identity.groupUUID);assert.deepEqual(round.entered.room.entities.map(e=>e.uuid),identity.entities.map(e=>e.uuid));
  round.roomScreenshot=`${out}/round-${index+1}-room.png`;await page.screenshot({path:round.roomScreenshot});
  for(const id of route.projects){await page.locator(`#hotspots [data-exhibit="${id}"]`).click();await page.waitForFunction(project=>starhaven.book.status==='open'&&starhaven.currentProject===project,id);await page.locator('#project-back').click();await page.waitForTimeout(900);}
  await page.locator('#exit').click();await page.waitForFunction(()=>starhaven.state==='SPACE'&&!starhaven.cameraProgress.transition);round.exited=await snap();assert.equal(round.exited.passage.exits,index+1);assert.deepEqual(round.exited.keys,[]);
  await page.mouse.move(720,480);await page.keyboard.down('w');await page.waitForTimeout(900);await page.keyboard.up('w');await page.keyboard.down('x');await page.waitForTimeout(500);await page.keyboard.up('x');round.departed=await snap();assert.equal(round.departed.state,'SPACE');assert.equal(round.departed.passage.entries,index+1);assert.ok(round.departed.player[2]>round.exited.player[2]+2);round.status='passed';
  console.log(JSON.stringify({round:index+1,entries:round.departed.passage.entries,exits:round.departed.passage.exits,status:round.status}));
 }
 report.inputs=await page.evaluate(()=>window.__continuousInputs);report.trustedInputs=report.inputs.filter(i=>i.trusted).length;report.untrustedInputs=report.inputs.filter(i=>!i.trusted).length;assert.equal(report.untrustedInputs,0);assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await page.keyboard.up('w').catch(()=>{});await page.keyboard.up('x').catch(()=>{});const video=page.video();await context.close();report.video=await video?.path();await browser.close();report.browserClosed=true;report.finished=new Date().toISOString();await writeFile(process.env.CONTINUOUS_REPORT||'tests/v14-rc63-continuous.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,rounds:report.rounds.length,trustedInputs:report.trustedInputs,failure:report.failure}));}
