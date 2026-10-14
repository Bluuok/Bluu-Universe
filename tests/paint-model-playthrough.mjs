import {chromium} from '@playwright/test';
import {flyTo,faceHeading} from './room-flight-route.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const phase=process.env.MODEL_PHASE||'before',out=`screenshots/v18-model-${phase}`;
await mkdir(out,{recursive:true});
const report={phase,method:'Normal spawn, real keyboard and RMB mouse via existing flight helpers. Telemetry reads and passive input log only; no fixture or state injection.',steps:[],errors:[],requests:[]};
const browser=await chromium.launch({headless:false,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling']});
const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage();
await page.addInitScript(()=>{window.__modelInputs=[];for(const name of ['keydown','keyup','pointermove','pointerdown','pointerup'])document.addEventListener(name,e=>__modelInputs.push({type:e.type,trusted:e.isTrusted}),true);});
page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.requests.push(r.url()));
async function shot(name){const file=`${out}/${name}.png`;await page.screenshot({path:file});report.steps.push({name,file,...await page.evaluate(()=>({player:starhaven.player,camera:starhaven.camera,flight:starhaven.flight,paint:starhaven.ambient.paintFlow}))});console.log(name);}
try{
 await page.goto('http://127.0.0.1:4259/');await page.waitForFunction(()=>window.starhaven?.ready);await page.locator('#loading').waitFor({state:'hidden'});
 const bundle=await page.locator('script[src*="/assets/index-"]').getAttribute('src');report.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(new URL(bundle,page.url()))).arrayBuffer())).digest('hex')};
 await shot('00-spawn');await flyTo(page,[-12,7,8]);await flyTo(page,[-24,7,-22]);
 for(const [name,p,yaw,pitch] of [['01-front',[-112,-17,-65],0,-.10],['02-side',[-62,-17,-111],Math.PI/2,-.10],['03-back',[-112,-17,-157],Math.PI,-.10]]){
  await flyTo(page,p,{radius:1.2,timeout:70000});await faceHeading(page,yaw,pitch);await page.waitForTimeout(900);await shot(name);
 }
 report.inputs=await page.evaluate(()=>({total:__modelInputs.length,untrusted:__modelInputs.filter(e=>!e.trusted).length}));assert.equal(report.inputs.untrusted,0);assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;}
finally{await context.close();await browser.close();report.browserClosed=true;await writeFile(`tests/v18-model-${phase}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,build:report.build,inputs:report.inputs,failure:report.failure}));}
