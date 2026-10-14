import {chromium} from '@playwright/test';
import {flyTo,faceHeading} from './room-flight-route.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const phase=process.env.CHARACTER_PHASE||'before',out=`screenshots/v19-character-${phase}`;await mkdir(out,{recursive:true});
const report={phase,method:'Actual production page: trusted mouse/keyboard flight first. Close front/side/back camera fixtures are separately marked art diagnostics, not flight/avoidance evidence.',flight:[],diagnostics:[],errors:[],requests:[]};
const browser=await chromium.launch({headless:false,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling']}),context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage();
await page.addInitScript(()=>{window.__characterInputs=[];for(const type of ['keydown','keyup','pointermove','pointerdown','pointerup'])document.addEventListener(type,e=>__characterInputs.push({type,trusted:e.isTrusted}),true);});
page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.requests.push(r.url()));
const observe=()=>page.evaluate(()=>({state:starhaven.state,player:starhaven.player,flight:starhaven.flight,bounds:starhaven.inspect.characterBounds(),envelope:starhaven.inspect.characterEnvelope(),surface:starhaven.inspect.characterSurface?.(),rendering:starhaven.rendering}));
async function shot(name,diagnostic=false){const file=`${out}/${name}.png`;await page.screenshot({path:file});report[diagnostic?'diagnostics':'flight'].push({name,file,...await observe()});console.log(name);}
try{
 await page.goto(process.env.CHARACTER_URL||'http://127.0.0.1:4259/');await page.waitForFunction(()=>window.starhaven?.ready);await page.locator('#loading').waitFor({state:'hidden'});
 const bundle=await page.locator('script[src*="/assets/index-"]').getAttribute('src');report.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(new URL(bundle,page.url()))).arrayBuffer())).digest('hex'),manifestSHA256:createHash('sha256').update(Buffer.from(await(await fetch(new URL('/assets/character/manifest.json',page.url()))).arrayBuffer())).digest('hex')};
 await flyTo(page,[-15,10,-20],{radius:.7});await faceHeading(page,0,0);await shot('00-idle');
 await page.keyboard.down('w');await page.waitForTimeout(700);await shot('01-thrust');await page.keyboard.up('w');await shot('02-coast');await page.keyboard.down('x');await page.waitForTimeout(180);await shot('03-brake');await page.keyboard.up('x');await page.waitForTimeout(700);
 const p=await page.evaluate(()=>starhaven.player),target=p.map((v,i)=>v+(i===1?.85:0));
 for(const [name,offset] of [['04-front',[0,.2,-4.3]],['05-side',[4.3,.2,0]],['06-back',[0,.2,4.3]]]){
  assert(await page.evaluate(v=>starhaven.inspect.framePosition(v),{position:target.map((v,i)=>v+offset[i]),target,duration:.2}));await page.waitForTimeout(550);await shot(name,true);
 }
 report.inputs=await page.evaluate(()=>({total:__characterInputs.length,untrusted:__characterInputs.filter(e=>!e.trusted).length}));assert.equal(report.inputs.untrusted,0);assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;}
finally{await context.close();await browser.close();report.browserClosed=true;await writeFile(`tests/v19-character-${phase}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,build:report.build,inputs:report.inputs,failure:report.failure}));}
