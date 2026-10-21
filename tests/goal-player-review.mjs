import {runtimeBuildIdentity} from './runtime-build-identity.mjs';
import {chromium,desktopLaunchOptions,saveDesktopFrame} from './browser-runtime.mjs';
import {flyTo,flyIntoRoom,faceHeading} from './room-flight-route.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';

const url=process.env.GOAL_URL||'http://127.0.0.1:4259/',out=process.env.GOAL_OUT||'screenshots/v13-player-review';
const file=process.env.GOAL_REPORT||'tests/v13-player-review.json';
const flightTimeout=Number(process.env.GOAL_FLIGHT_TIMEOUT_MS||60000),contactTimeout=Number(process.env.GOAL_CONTACT_TIMEOUT_MS||7000);
await mkdir(out,{recursive:true});
const browser=await chromium.launch(desktopLaunchOptions);
const context=await browser.newContext({viewport:{width:1440,height:960}});
await context.addInitScript(()=>{window.__goalInputs=[];window.__goalSamples=[];let previous=0;
  for(const type of ['keydown','keyup','pointermove','pointerdown','pointerup','click','blur','focus'])window.addEventListener(type,e=>window.__goalInputs.push({type,code:e.code,trusted:e.isTrusted,x:e.clientX,y:e.clientY,time:performance.now()}),true);
  function sample(now){const a=window.starhaven;if(a?.ready&&now-previous>120){previous=now;window.__goalSamples.push({time:now,state:a.state,player:a.player,keys:a.keys,camera:a.camera,avoidance:a.framing?.avoidance,contacts:a.inspect.collision().lastSolve?.contacts});}requestAnimationFrame(sample);}requestAnimationFrame(sample);
});
const report={startedAt:new Date().toISOString(),method:'Three normal-reload routes, trusted keyboard/mouse and visible controls. Existing room-flight-route helpers are used directly. Evaluation only reads telemetry or passive event logs; no product pose/state/camera fixtures.',environment:{platform:process.platform,executable:chromium.executablePath(),launchOptions:desktopLaunchOptions},url,routes:[],runtimeErrors:[],requestFailures:[]};
let page,current;
const observe=()=>page.evaluate(()=>({state:starhaven.state,player:starhaven.player,velocity:starhaven.velocity,flight:starhaven.flight,camera:starhaven.camera,framing:starhaven.framing,room:starhaven.inspect.roomEntities(),collision:starhaven.inspect.collision(),rendering:starhaven.rendering,project:starhaven.currentProject}));
async function save(){await writeFile(file,JSON.stringify(report,null,2)+'\n');}
async function shot(name){const p=path.join(out,`route-${current.id}-${name}.png`);const capture=await saveDesktopFrame(page,p);const observation=await observe();current.steps.push({name,screenshot:p,capturedAt:new Date().toISOString(),capture,observation});await save();console.log(JSON.stringify({route:current.id,step:name,state:observation.state,player:observation.player}));console.log(`::notice title=Desktop route ${current.id}::${name} ${JSON.stringify(observation.player)}`);}
async function go(p,name,radius=1.0){await flyTo(page,p,{radius,timeout:flightTimeout});await shot(name);}
const wrap=v=>Math.atan2(Math.sin(v),Math.cos(v));
async function face(yaw,pitch=0){
  if((await page.evaluate(()=>starhaven.flight.inputMode))==='relative-mouse')return faceHeading(page,yaw,pitch);
  await page.mouse.move(720,480);await page.waitForTimeout(100);
  for(let i=0;i<120;i++){
    let f=await page.evaluate(()=>starhaven.flight);if(Math.abs(wrap(yaw-f.yaw))<.025&&Math.abs(pitch-f.pitch)<.025){await page.mouse.move(720,480);return;}
    if(Math.abs(wrap(yaw-f.aimBaseYaw))>f.aimYawRange*.98||Math.abs(pitch-f.aimBasePitch)>f.aimPitchRange*.98){await page.mouse.move(720,480);await page.waitForTimeout(80);f=await page.evaluate(()=>starhaven.flight);}
    const offset=(v,max)=>Math.max(-.99,Math.min(.99,Math.sign(v)*(f.deadZone+(1-f.deadZone)*Math.pow(Math.min(1,Math.abs(v)/max),1/f.responseExponent))));
    await page.mouse.move(720+offset(-wrap(yaw-f.aimBaseYaw),f.aimYawRange)*f.pointerRangePx,480+offset(-(pitch-f.aimBasePitch),f.aimPitchRange)*f.pointerRangePx);await page.waitForTimeout(100);
  }throw Error('Actual pointer turn failed to converge');
}
async function contact(key,normal,name){
  await page.keyboard.down(key);
  // Static proxies are intentionally merged into one BVH. Confirm its real
  // contact normal at the physically reached wall/rail/roof, not a mesh name
  // that the merged solver never exposes.
  try{const handle=await page.waitForFunction(expected=>{const a=starhaven,c=a.inspect.collision().lastSolve;return c?.contacts.some(h=>h.collider==='studio-static'&&h.normal.reduce((s,v,i)=>s+v*expected[i],0)>.7)?{player:a.player,solve:c,avoidance:a.framing?.avoidance}:false;},normal,{timeout:contactTimeout});const body=await handle.jsonValue();current.contacts.push({name,expectedNormal:normal,body});if(name==='left-wall-body-contact')assert.ok(body.player[0]<-5.8);if(name==='back-wall-body-contact')assert.ok(body.player[2]<-5.4);if(name==='rail-body-contact')assert.ok(body.player[2]>6.7);if(name==='roof-body-contact')assert.ok(body.player[1]>6.2);}
  finally{await page.keyboard.up(key);}
  await page.mouse.move(720,480);await page.waitForTimeout(500);await shot(name);
}
async function room(projects){
  await flyIntoRoom(page,{timeout:flightTimeout});await page.waitForTimeout(800);assert.equal((await observe()).state,'ROOM');await shot('room');
  const entities=(await observe()).room;current.roomBefore=entities;
  for(const id of projects){await page.locator(`#hotspots [data-exhibit="${id}"]`).click();await page.waitForFunction(project=>starhaven.book.status==='open'&&starhaven.currentProject===project,id,{timeout:contactTimeout});assert.equal((await observe()).project,id);await shot('project-'+id);await page.locator('#project-back').click();await page.waitForFunction(()=>starhaven.state==='ROOM'&&!starhaven.cameraProgress.transition,null,{timeout:contactTimeout});assert.equal((await observe()).state,'ROOM');}
  current.roomAfter=(await observe()).room;
  await page.locator('#exit').click();await page.waitForFunction(()=>starhaven.state==='SPACE'&&!starhaven.cameraProgress.transition,null,{timeout:contactTimeout});await page.mouse.move(720,480);await page.waitForTimeout(400);await shot('exit');
  await page.keyboard.down('w');await page.waitForTimeout(500);await page.keyboard.up('w');await page.keyboard.down('x');await page.waitForTimeout(500);await page.keyboard.up('x');assert.equal((await observe()).state,'SPACE');await shot('outward-departure');
}
try{
  for(let id=1;id<=3;id++){
    current={id,status:'running',startedAt:new Date().toISOString(),steps:[],contacts:[]};report.routes.push(current);page=await context.newPage();
    page.on('pageerror',e=>report.runtimeErrors.push({route:id,message:e.message}));page.on('console',m=>{if(m.type()==='error')report.runtimeErrors.push({route:id,message:m.text()});});page.on('requestfailed',r=>report.requestFailures.push({route:id,url:r.url(),error:r.failure()?.errorText}));
    await page.goto(url,{waitUntil:'networkidle'});
    const build=await runtimeBuildIdentity(page);if(report.build)assert.deepEqual(build,report.build);else report.build=build;
    await page.waitForFunction(()=>window.starhaven?.ready,null,{timeout:120000});await page.bringToFront();await page.mouse.move(720,480);await page.waitForTimeout(800);
    if(!report.renderer)report.renderer=await page.evaluate(()=>{const gl=document.getElementById('world').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return{version:gl.getParameter(gl.VERSION),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR)};});
    await shot('normal-spawn');
    if(id===1){
      await go([-15,12,-15],'west-clear');
      const shellRoute=process.env.GOAL_PARALLAX_ROUTE==='1'?[
        [[-65,180,-205],'parallax-shell-245-outside'],[[-280,180,-205],'parallax-shell-345-outside'],
        [[-490,180,-205],'parallax-shell-455-outside'],[[-280,180,-205],'parallax-return-mid'],[[-65,180,-205],'parallax-return-near'],
      ]:[];
      for(const [p,n] of [[[-119,-28,-82],'near-curl-front'],[[-112,-22,-111],'near-curl-middle'],[[-105,-16,-139],'near-curl-back'],[[-7,-38,-155],'far-curl-front'],[[-25,-30,-178],'far-curl-middle'],[[-43,-22,-200],'far-curl-back'],...shellRoute,[[-65,12,-95],'physical-return-clear'],[[-15,12,-15],'physical-return-studio'],[[-10,5,10],'front-exterior']])await go(p,n);
      await room(['threadcove']);
    }else if(id===2){
      await go([-10,8,10],'rise-clear');await go([-9,3,0],'west-wall-approach');await face(-Math.PI/2);await contact('w',[-1,0,0],'left-wall-body-contact');
      await go([-10,3,0],'leave-wall');await go([-10,8,-10],'rear-west');await go([0,8,-10],'rear-high');await go([0,2,-9],'rear-low');await face(Math.PI);await contact('w',[0,0,-1],'back-wall-body-contact');
      await go([0,3,-10],'leave-back');await go([11,4,-10],'east-back');await go([11,-3,10],'under-roof-outside');await go([-3.5,.8,10],'front-rail-approach');await face(0);await contact('w',[0,0,1],'rail-body-contact');
      await go([-3.5,4.2,10],'rise-clear-rail');await go([-1.8,3,9.5],'front-window-furniture');await face(0);await shot('front-window-look');await room(['clawtide']);
    }else{
      for(const [p,n] of [[[12,12,10],'east-high'],[[12,12,-12],'rear-east-high'],[[-14,12,-12],'rear-west-high'],[[-14,12,10],'front-west-high'],[[0,11,0],'roof-above']])await go(p,n);
      await page.mouse.move(720,480);await contact('Shift',[0,1,0],'roof-body-contact');await page.keyboard.down('Space');await page.waitForTimeout(500);await page.keyboard.up('Space');
      for(const [p,n] of [[[-12,12,10],'leave-roof'],[[-27,30,12],'upper-cloud'],[[-22,20,-25],'rear-upper-clear'],[[20,-20,-19],'lower-cloud'],[[12,9,-12],'return-east-high'],[[12,9,12],'return-front-high']])await go(p,n);
      await room(['contributions','contact']);
    }
    current.inputs=await page.evaluate(()=>window.__goalInputs);current.samples=await page.evaluate(()=>window.__goalSamples);assert.ok(current.inputs.every(e=>e.trusted));current.trustedInputs=current.inputs.length;current.status='passed';current.finishedAt=new Date().toISOString();current.video=process.env.REMOTE_SCREEN_RECORDING||null;await page.close();await save();
  }
  assert.equal(report.routes.filter(r=>r.status==='passed').length,3);assert.deepEqual(report.runtimeErrors,[]);report.status=report.requestFailures.length?'completed-with-request-diagnostics':'passed';
}catch(e){report.status='failed';report.failure={message:e.message,stack:e.stack};if(current)current.status='failed';if(page&&!page.isClosed()){current.inputs=await page.evaluate(()=>window.__goalInputs).catch(()=>[]);current.samples=await page.evaluate(()=>window.__goalSamples).catch(()=>[]);current.failureContext=await page.evaluate(()=>({url:location.href,appPresent:Boolean(window.starhaven),ready:window.starhaven?.ready??false,loading:document.getElementById('loading')?.innerText,resources:performance.getEntriesByType('resource').length})).catch(()=>null);current.failureScreenshot=path.join(out,`route-${current.id}-failure.png`);await saveDesktopFrame(page,current.failureScreenshot).catch(error=>{current.failureCaptureError=error.message;});}process.exitCode=1;}
finally{await context.close();await browser.close();report.browserClosed=true;report.finishedAt=new Date().toISOString();await save();console.log(JSON.stringify({status:report.status,failure:report.failure?.message,routes:report.routes.map(r=>({id:r.id,status:r.status,steps:r.steps.length,inputs:r.inputs?.length})),errors:report.runtimeErrors.length,requests:report.requestFailures.length,browserClosed:true}));}
