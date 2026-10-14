import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { flyTo, flyIntoRoom } from './room-flight-route.mjs';

const url=process.env.AMBIENT_ROUTE_URL||'http://127.0.0.1:4245/';
const tag=process.env.AMBIENT_ROUTE_TAG||'rc46';
const out=path.resolve(`screenshots/v12-${tag}-ambient-route`);
await mkdir(out,{recursive:true});
const report={started:new Date().toISOString(),url,method:'Installed headed Chrome / D3D11; normal spawn and trusted mouse/W/S/Home/UI only. Passive read-only telemetry; no product pose/camera fixtures and no physical OS focus claim.',checks:[],errors:[],requestFailures:[],browserClosed:false};
const browser=await chromium.launch({headless:false,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const context=await browser.newContext({viewport:{width:1440,height:960}});
await context.addInitScript(()=>{
  window.__ambientInputs=[];
  for(const type of ['keydown','keyup','pointermove','click'])window.addEventListener(type,e=>window.__ambientInputs.push({type,code:e.code,trusted:e.isTrusted,at:performance.now()}),true);
});
const page=await context.newPage();
page.on('pageerror',e=>report.errors.push(e.message));
page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});
page.on('requestfailed',r=>report.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
const snap=()=>page.evaluate(()=>({time:performance.now(),state:starhaven.state,player:starhaven.player,cameraProgress:starhaven.cameraProgress,ambient:starhaven.ambient}));
const shot=async name=>{const file=path.join(out,name+'.png');await page.screenshot({path:file});return {screenshot:file,...await snap()};};
const settled=state=>page.waitForFunction(s=>starhaven.state===s&&!starhaven.cameraProgress.transition,state);
const check=(name,evidence)=>{report.checks.push({name,passed:true,evidence});console.log(JSON.stringify({check:name,passed:true}));};
try{
  await page.goto(url);await page.waitForFunction(()=>window.starhaven?.ready,{},{timeout:120000});await page.waitForTimeout(500);
  const bundle=await page.evaluate(()=>[...document.scripts].map(s=>s.src).find(s=>s.includes('/assets/index-')));
  report.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(bundle)).arrayBuffer())).digest('hex')};
  report.spawn=await shot('01-normal-spawn');
  await page.evaluate(()=>{
    window.__ambientFrames=[];window.__ambientObserve=true;
    const frame=()=>{if(!window.__ambientObserve)return;const a=starhaven;window.__ambientFrames.push({time:performance.now(),state:a.state,transition:a.cameraProgress.transition,player:a.player,ambient:a.ambient});requestAnimationFrame(frame);};
    requestAnimationFrame(frame);
  });
  await flyTo(page,[-16,10,3],{radius:1});
  await flyTo(page,[-14,9,-12],{radius:1});
  await flyTo(page,[-4.83,6,-11.76],{radius:.5});
  report.approach=await shot('02-normal-word-approach');
  await flyTo(page,[-8,6,-18],{radius:.55});
  await page.waitForTimeout(650);report.contact=await shot('03-local-word-contact');
  await flyTo(page,[-12.53,6,-26.92],{radius:.75});
  await page.waitForTimeout(2800);report.departed=await shot('04-word-departure');
  const frames=await page.evaluate(()=>window.__ambientFrames);
  const peak=frames.reduce((best,f)=>f.ambient.words.affected>best.ambient.words.affected?f:best,frames[0]);
  assert.ok(peak.ambient.words.affected>100,'Normal flight must locally scatter particles');
  assert.ok(peak.ambient.words.maxDisplacement>.05);
  assert.ok(report.departed.ambient.words.maxDisplacement<.015,'Particles must regather after normal departure');
  check('Normal spawn approach, contact, departure and regather',{peak,approach:report.approach,contact:report.contact,departed:report.departed});
  await page.keyboard.press('h');await page.mouse.move(720,480);await settled('SPACE');await page.waitForTimeout(500);
  await flyIntoRoom(page);await settled('ROOM');report.room=await shot('05-room-hidden');
  assert.equal(report.room.ambient.words.visible,false);assert.equal(report.room.ambient.flybys.visible,false);
  await page.locator('[data-exhibit="threadcove"]').click();await page.waitForFunction(()=>starhaven.book.status==='open');
  report.project=await snap();assert.equal(report.project.ambient.words.visible,false);assert.equal(report.project.ambient.flybys.visible,false);
  await page.keyboard.press('Escape');await settled('ROOM');
  await page.locator('#exit').click();await settled('SPACE');await page.waitForTimeout(100);
  report.returned=await shot('06-space-restored');assert.equal(report.returned.ambient.words.visible,true);
  check('Native ROOM and PROJECT hide ambient effects; exit restores words',{room:report.room,project:report.project,returned:report.returned});
  report.frames=await page.evaluate(()=>{window.__ambientObserve=false;return window.__ambientFrames;});
  const transitions=report.frames.filter(f=>f.transition);
  assert.ok(transitions.length>20,'Must observe native camera transitions');
  assert.equal(transitions.filter(f=>f.ambient.words.visible||f.ambient.flybys.visible).length,0);
  check('Ambient effects remain hidden during observed native transitions',{samples:transitions.length,states:[...new Set(transitions.map(f=>f.state))]});
  assert.equal(report.errors.length,0);report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
finally{
  for(const key of ['w','s'])await page.keyboard.up(key).catch(()=>{});
  report.inputs=await page.evaluate(()=>window.__ambientInputs).catch(()=>[]);report.trustedInputs=report.inputs.filter(e=>e.trusted).length;
  if(!report.frames)report.frames=await page.evaluate(()=>{window.__ambientObserve=false;return window.__ambientFrames;}).catch(()=>[]);
  await browser.close();report.browserClosed=true;report.finished=new Date().toISOString();
  const file=`tests/v12-${tag}-ambient-route.json`;await writeFile(file,JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:report.status,checks:report.checks.length,errors:report.errors,failure:report.failure,trustedInputs:report.trustedInputs,report:file}));
}
