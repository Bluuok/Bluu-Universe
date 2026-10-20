import {runtimeBuildIdentity} from './runtime-build-identity.mjs';
import {chromium} from './browser-runtime.mjs';
import {flyTo,faceHeading} from './room-flight-route.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const phase=process.env.WAKE_PHASE||'current',out=`screenshots/v20-wake-${phase}`;await mkdir(out,{recursive:true});
const report={phase,method:'Normal spawn, real keyboard/mouse only. No pose, camera, material or state fixtures; read-only telemetry and passive trusted-input logging.',steps:[],errors:[],requests:[]};
const browser=await chromium.launch({headless:false,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling','--disable-renderer-backgrounding']}),context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:out,size:{width:1440,height:960}}}),page=await context.newPage();
await page.addInitScript(()=>{window.__wakeInputs=[];for(const type of ['keydown','keyup','pointerdown','pointermove','pointerup','click'])document.addEventListener(type,e=>__wakeInputs.push({type,trusted:e.isTrusted}),true);});
page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.requests.push(r.url()));
async function shot(name){const file=`${out}/${name}.png`;await page.screenshot({path:file});report.steps.push({name,file,...await page.evaluate(()=>({state:starhaven.state,player:starhaven.player,velocity:starhaven.velocity,flight:starhaven.flight,rendering:starhaven.rendering}))});console.log(name);}
try{
 await page.goto('http://127.0.0.1:4259/');await page.waitForFunction(()=>window.starhaven?.ready);await page.locator('#loading').waitFor({state:'hidden'});
 const hash=b=>createHash('sha256').update(b).digest('hex');report.build={...await runtimeBuildIdentity(page),manifestSHA256:hash(Buffer.from(await(await fetch(new URL('/assets/character/manifest.json',page.url()))).arrayBuffer()))};
 await flyTo(page,[-15,12,-20],{radius:.7});await faceHeading(page,0,0);await shot('00-idle');
 // Tail art does not require OS pointer capture; the separate controls suite
 // verifies capture. Use the supported real RMB drag here for reproducibility.
 await page.mouse.move(720,480);
 await page.keyboard.down('w');await page.waitForTimeout(850);await shot('01-thrust');
 await page.mouse.down({button:'right'});await page.mouse.move(1050,420,{steps:12});await page.mouse.up({button:'right'});await page.waitForTimeout(220);await shot('02-turn');
 await page.keyboard.up('w');await page.waitForTimeout(100);await shot('03-release');await page.keyboard.down('x');await page.waitForTimeout(350);await shot('04-brake');await page.keyboard.up('x');
 await page.keyboard.press('Escape');await faceHeading(page,1.3,.8);await page.keyboard.down('w');await page.waitForTimeout(600);await shot('05-upward-flight');await page.keyboard.up('w');await page.keyboard.down('x');await page.waitForTimeout(400);await page.keyboard.up('x');
 await faceHeading(page,1.3,0);await page.keyboard.down('Space');await page.waitForTimeout(600);await shot('06-rise');await page.keyboard.up('Space');await page.keyboard.down('Shift');await page.waitForTimeout(600);await shot('07-descend');await page.keyboard.up('Shift');await page.keyboard.down('x');await page.waitForTimeout(700);await page.keyboard.up('x');await shot('08-rest');
 report.inputs=await page.evaluate(()=>({total:__wakeInputs.length,untrusted:__wakeInputs.filter(e=>!e.trusted).length}));assert.equal(report.inputs.untrusted,0);assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);assert.equal(report.steps.at(-1).flight.wake.alive,0);report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;}
finally{for(const k of ['w','x','Space','Shift'])await page.keyboard.up(k).catch(()=>{});await context.close();await browser.close();report.browserClosed=true;await writeFile(`tests/v20-wake-${phase}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,build:report.build,inputs:report.inputs,failure:report.failure}));}
