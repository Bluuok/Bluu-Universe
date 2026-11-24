import {runtimeBuildIdentity} from './runtime-build-identity.mjs';
import {chromium,desktopLaunchOptions,saveDesktopFrame} from './browser-runtime.mjs';
import {flyTo,faceHeading} from './room-flight-route.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const phase=process.env.WAKE_PHASE||'current',out=process.env.WAKE_OUT||`screenshots/v20-wake-${phase}`;await mkdir(out,{recursive:true});
const reportFile=process.env.WAKE_REPORT||`tests/v20-wake-${phase}.json`,timeout=Number(process.env.GOAL_FLIGHT_TIMEOUT_MS||60000);
const report={phase,method:'Normal spawn, real keyboard/mouse only. No pose, camera, material or state fixtures; read-only telemetry and passive trusted-input logging.',steps:[],errors:[],requests:[]};
const browser=await chromium.launch(desktopLaunchOptions),context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage();
await page.addInitScript(()=>{window.__wakeInputs=[];for(const type of ['keydown','keyup','pointerdown','pointermove','pointerup','click'])document.addEventListener(type,e=>__wakeInputs.push({type,trusted:e.isTrusted}),true);});
page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.requests.push(r.url()));
const inputs=()=>page.evaluate(()=>({total:__wakeInputs.length,trusted:__wakeInputs.filter(e=>e.trusted).length,untrusted:__wakeInputs.filter(e=>!e.trusted).length}));
async function shot(name){const file=`${out}/${name}.png`;const before=await page.evaluate(()=>({state:starhaven.state,player:starhaven.player,velocity:starhaven.velocity,flight:starhaven.flight,rendering:starhaven.rendering}));const capture=await saveDesktopFrame(page,file,{settle:true,finishGPU:true,completionTimeout:120000});report.steps.push({name,file,...before,capture,afterCapture:await page.evaluate(()=>({player:starhaven.player,flight:starhaven.flight}))});report.inputs=await inputs();await writeFile(reportFile,JSON.stringify(report,null,2)+'\n');console.log(name);}
try{
 await page.goto('http://127.0.0.1:4259/');await page.waitForFunction(()=>window.starhaven?.ready,null,{timeout:180000});await page.locator('#loading').waitFor({state:'hidden',timeout:180000});
 const hash=b=>createHash('sha256').update(b).digest('hex');report.build={...await runtimeBuildIdentity(page),manifestSHA256:hash(Buffer.from(await(await fetch(new URL('/assets/character/manifest.json',page.url()))).arrayBuffer()))};
 await flyTo(page,[-15,12,-20],{radius:.7,timeout});await faceHeading(page,0,0);await page.waitForFunction(()=>starhaven.flight.wake.alive===0,null,{timeout});await shot('00-idle');
 // Tail art does not require OS pointer capture; the separate controls suite
 // verifies capture. Use the supported real RMB drag here for reproducibility.
 await page.mouse.move(720,480);
 await page.keyboard.down('w');await page.waitForFunction(()=>starhaven.flight.thrust>.9&&starhaven.flight.exhaust.power>.8&&starhaven.flight.wake.alive>20&&Math.hypot(...starhaven.velocity)>1,null,{timeout});await shot('01-thrust');
 await page.mouse.down({button:'right'});await page.mouse.move(1050,420,{steps:12});await page.mouse.up({button:'right'});await page.waitForTimeout(220);await shot('02-turn');
 await page.keyboard.up('w');await page.waitForFunction(()=>starhaven.flight.thrust===0,null,{timeout});await shot('03-release');await page.keyboard.down('x');await page.waitForFunction(()=>starhaven.flight.braking&&Math.hypot(...starhaven.velocity)<.15,null,{timeout});await shot('04-brake');await page.keyboard.up('x');
 await faceHeading(page,1.3,.8);await page.keyboard.down('w');await page.waitForFunction(()=>starhaven.velocity[1]>1&&starhaven.flight.exhaust.power>.8,null,{timeout});await shot('05-upward-flight');await page.keyboard.up('w');await page.keyboard.down('x');await page.waitForFunction(()=>Math.hypot(...starhaven.velocity)<.15,null,{timeout});await page.keyboard.up('x');
 await faceHeading(page,1.3,0);await page.keyboard.down('Space');await page.waitForFunction(()=>starhaven.velocity[1]>1,null,{timeout});await shot('06-rise');await page.keyboard.up('Space');await page.keyboard.down('Shift');await page.waitForFunction(()=>starhaven.velocity[1]<-1,null,{timeout});await shot('07-descend');await page.keyboard.up('Shift');await page.keyboard.down('x');await page.waitForFunction(()=>Math.hypot(...starhaven.velocity)<.15&&starhaven.flight.wake.alive===0&&starhaven.flight.exhaust.power<.02,null,{timeout});await page.keyboard.up('x');await shot('08-rest');
 report.inputs=await inputs();assert.ok(report.inputs.trusted>0);assert.equal(report.inputs.untrusted,0);assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);assert.equal(report.steps.length,9);assert.equal(report.steps.at(-1).flight.wake.alive,0);report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;}
finally{for(const k of ['w','x','Space','Shift'])await page.keyboard.up(k).catch(()=>{});report.inputs=await inputs().catch(()=>report.inputs);await context.close();await browser.close();report.browserClosed=true;await writeFile(reportFile,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,build:report.build,inputs:report.inputs,failure:report.failure}));}
