import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {flyIntoRoom,flyTo} from './room-flight-route.mjs';
const url=process.env.PASSAGE_URL||'http://127.0.0.1:4229/',out=process.env.PASSAGE_OUT||'E:/temp/starhaven-rc30-passage';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:process.env.PASSAGE_HEADLESS==='1',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling']});
const context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:out,size:{width:1440,height:960}}});
await context.addInitScript(()=>{
  window.__doorFrames=[];window.__doorInputs=[];
  for(const type of ['keydown','keyup','click'])window.addEventListener(type,e=>window.__doorInputs.push({type,code:e.code,trusted:e.isTrusted,at:performance.now()}),true);
  const sample=()=>{const a=window.starhaven;if(a?.ready&&a.passage?.phase)window.__doorFrames.push({at:performance.now(),state:a.state,passage:a.passage,player:a.player,camera:a.camera,lean:a.flight.lean,keys:a.keys,covered:document.getElementById('transition').classList.contains('cover')});requestAnimationFrame(sample);};requestAnimationFrame(sample);
});
const page=await context.newPage(),report={url,method:'Installed Chrome headed, isolated profile, trusted keys/mouse; normal-spawn flight. Passive transition samples. Does not establish unlocked OS focus or physical mobile behavior.',checks:[],errors:[],requestFailures:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('requestfailed',r=>report.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
const snap=()=>page.evaluate(()=>({state:starhaven.state,player:starhaven.player,velocity:starhaven.velocity,passage:starhaven.passage,keys:starhaven.keys,camera:starhaven.camera}));
const check=async(name,fn)=>{await fn();report.checks.push({name,status:'passed',observation:await snap()});};
try{
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.starhaven);
  const initial=await snap();await page.keyboard.down('w');await page.waitForFunction(()=>starhaven.ready,{timeout:120000});await page.waitForFunction(()=>document.getElementById('loading').hidden);
  const bundle=await page.evaluate(()=>[...document.scripts].map(s=>s.src).find(s=>s.includes('/assets/index-')));
  report.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(bundle)).arrayBuffer())).digest('hex')};
  await check('W held during loading does not queue a flight or entry',async()=>{const s=await snap();assert.deepEqual(s.player,initial.player);assert.equal(Math.hypot(...s.velocity),0);assert.equal(s.passage.entries,0);});await page.keyboard.up('w');
  await check('Normal inward flight opens the shared room without E or clicking entry',async()=>{await flyIntoRoom(page);assert.equal((await snap()).state,'ROOM');assert.equal((await snap()).passage.entries,1);});
  await page.screenshot({path:out+'/01-room.png'});
  await check('Exit double click and held W neither reset nor immediately pull back inside',async()=>{
    const box=await page.locator('#exit').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
    await page.mouse.click(x,y);await page.keyboard.down('w');await page.waitForTimeout(216);assert.equal(await page.locator('#controls').isHidden(),true);await page.mouse.click(x,y);
    if(process.env.PASSAGE_VISUAL==='1'){await page.waitForFunction(()=>starhaven.passage.phase==='exit'&&starhaven.passage.progress>.53);report.exitFadeBefore=await snap();await page.screenshot({path:out+'/exit-partial-presence.png'});report.exitFadeAfter=await snap();report.timingLimitation='One exit screenshot captured for material inspection; use separate no-capture warmup comparison for frame-time claims.';}
    await page.waitForFunction(()=>starhaven.state==='SPACE'&&!starhaven.cameraProgress.transition);const landing=await snap();await page.keyboard.down('w');await page.waitForTimeout(1200);
    const s=await snap();const aim=await page.evaluate(()=>starhaven.flight);if(aim.targetYaw!==undefined){assert.ok(Math.abs(Math.atan2(Math.sin(aim.targetYaw-aim.yaw),Math.cos(aim.targetYaw-aim.yaw)))<1e-9);assert.ok(Math.abs(aim.targetPitch-aim.pitch)<1e-9);}assert.equal(s.state,'SPACE');assert.equal(s.passage.entries,1);assert.equal(s.passage.exits,1);assert.equal(Math.hypot(...s.velocity),0);assert.deepEqual(s.player,landing.player);assert.ok(Math.abs(s.player[0]-1.35)<.001);assert.ok(s.player[2]>15);await page.keyboard.up('w');
  });
  await check('Fresh W after exit flies outward with no wall contact or reentry',async()=>{const landing=await snap();await page.mouse.move(720,480);await page.waitForTimeout(60);await page.keyboard.down('w');await page.waitForTimeout(1100);const moving=await snap();assert.ok(moving.player[2]>landing.player[2]+6);assert.ok(moving.velocity[2]>11);assert.ok(Math.abs(moving.player[1]-landing.player[1])<.01);assert.equal(await page.evaluate(()=>starhaven.inspect.collision().lastSolve.contacts.length),0);await page.keyboard.up('w');await page.keyboard.down('s');await page.waitForTimeout(400);await page.keyboard.up('s');assert.equal((await snap()).state,'SPACE');assert.equal((await snap()).passage.entries,1);});
  await check('Flying away and returning permits one new entry',async()=>{await flyIntoRoom(page);assert.equal((await snap()).passage.entries,2);assert.equal((await snap()).state,'ROOM');});
  await check('Home during approach cancels all later room changes',async()=>{
    await page.locator('#exit').click();await page.waitForFunction(()=>starhaven.state==='SPACE'&&!starhaven.cameraProgress.transition);
    await flyTo(page,[1.35,1.8,11]);await flyTo(page,[1.35,1.15,6.2],{enter:true,stopOnCross:true});
    assert.notEqual((await snap()).passage.phase,null);await page.keyboard.press('h');await page.waitForTimeout(2500);
    const s=await snap();assert.equal(s.state,'SPACE');assert.equal(s.passage.phase,null);assert.deepEqual(s.player,[-5.5,2,8.5]);assert.equal(s.keys.length,0);
  });
  await page.screenshot({path:out+'/02-reset.png'});
  report.frames=await page.evaluate(()=>window.__doorFrames);
  await check('Transitions clear input and never use the full-screen cover',async()=>{assert.ok(report.frames.length>100);assert.ok(report.frames.every(f=>!f.covered&&f.keys.length===0));});
  report.motion=report.frames.slice(1).flatMap((f,i)=>{const prior=report.frames[i],dt=f.at-prior.at;if(dt<=0||dt>=40||f.passage.entries!==prior.passage.entries||f.passage.exits!==prior.passage.exits)return[];return[{dt,cameraStep:Math.hypot(...f.camera.map((v,k)=>v-prior.camera[k])),playerStep:Math.hypot(...f.player.map((v,k)=>v-prior.player[k]))}];});
  report.motionSummary={samples:report.motion.length,maxCameraStep:Math.max(...report.motion.map(f=>f.cameraStep)),maxPlayerStep:Math.max(...report.motion.map(f=>f.playerStep))};delete report.motion;
  assert.deepEqual(report.errors,[]);report.status=report.requestFailures.length?'completed-with-request-diagnostics':'passed';
}catch(e){report.status='failed';report.failure=e.stack;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{report.frames=await page.evaluate(()=>window.__doorFrames).catch(()=>[]);report.inputs=await page.evaluate(()=>window.__doorInputs).catch(()=>[]);report.video=await page.video().path();await context.close();await browser.close();report.finished=new Date().toISOString();await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,checks:report.checks.length,errors:report.errors,failure:report.failure,motion:report.motionSummary,report:out+'/report.json'}));if(report.status==='failed')process.exitCode=1;}
