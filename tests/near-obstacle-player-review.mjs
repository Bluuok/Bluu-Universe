import {chromium} from '@playwright/test';
import {flyTo,flyIntoRoom,faceHeading} from './room-flight-route.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out=process.env.NEAR_OUT||'screenshots/v15-rc64-near-obstacles';await mkdir(out,{recursive:true});
const report={started:new Date().toISOString(),method:'Installed headless hardware Chrome. Normal-spawn trusted keyboard/mouse; physically approach front window, moving robot and terrace deck, then enter/project/back/exit. Body contacts are separate from camera observations. No pose/state/camera writes.',contacts:[],errors:[],requests:[]};
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling']});
const context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:out,size:{width:1440,height:960}}}),page=await context.newPage();
await page.addInitScript(()=>{window.__nearInputs=[];for(const type of ['keydown','keyup','pointermove','click'])window.addEventListener(type,e=>window.__nearInputs.push({type,code:e.code,trusted:e.isTrusted}),true);});
page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.requests.push({url:r.url(),reason:r.failure()?.errorText}));
const snap=()=>page.evaluate(()=>({state:starhaven.state,player:starhaven.player,velocity:starhaven.velocity,collision:starhaven.inspect.collision(),camera:starhaven.camera,framing:starhaven.framing,passage:starhaven.passage}));
const wrap=v=>Math.atan2(Math.sin(v),Math.cos(v));
async function faceNorth(){
 if((await page.evaluate(()=>starhaven.flight.inputMode))==='relative-mouse')return faceHeading(page,0,0);
 await page.mouse.move(720,480);await page.waitForTimeout(80);
 for(let i=0;i<100;i++){
  let f=await page.evaluate(()=>starhaven.flight);if(Math.abs(wrap(f.yaw))<.025&&Math.abs(f.pitch)<.025){await page.mouse.move(720,480);return;}
  if(Math.abs(wrap(f.aimBaseYaw))>f.aimYawRange*.98||Math.abs(f.aimBasePitch)>f.aimPitchRange*.98){await page.mouse.move(720,480);await page.waitForTimeout(80);f=await page.evaluate(()=>starhaven.flight);}
  const offset=(v,max)=>Math.max(-.99,Math.min(.99,Math.sign(v)*(f.deadZone+(1-f.deadZone)*Math.pow(Math.min(1,Math.abs(v)/max),1/f.responseExponent))));
  await page.mouse.move(720+offset(wrap(f.aimBaseYaw),f.aimYawRange)*f.pointerRangePx,480+offset(f.aimBasePitch,f.aimPitchRange)*f.pointerRangePx);await page.waitForTimeout(100);
 }throw Error('Normal mouse aiming did not settle north');
}
async function contact(name,key,collider,normal){
 await page.keyboard.down(key);let body;
 try{const handle=await page.waitForFunction(({collider,normal})=>{const a=starhaven,solve=a.inspect.collision().lastSolve;return solve?.contacts.some(c=>c.collider===collider&&c.normal.reduce((s,v,i)=>s+v*normal[i],0)>.7)?{player:a.player,solve}:false;},{collider,normal},{timeout:7000});body=await handle.jsonValue();}
 finally{await page.keyboard.up(key);}
 await page.keyboard.down('x');await page.waitForTimeout(350);await page.keyboard.up('x');const after=await snap();assert.equal(after.state,'SPACE');
 const screenshot=`${out}/${name}.png`;await page.screenshot({path:screenshot});report.contacts.push({name,collider,expectedNormal:normal,body,after,screenshot});console.log(JSON.stringify({name,player:body.player,collider}));return body;
}
try{
 await page.goto(process.env.GOAL_URL||'http://127.0.0.1:4259/');await page.waitForFunction(()=>window.starhaven?.ready);await page.locator('#loading').waitFor({state:'hidden'});
 const bundle=await page.locator('script[src*="/assets/index-"]').getAttribute('src');report.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(new URL(bundle,page.url()))).arrayBuffer())).digest('hex')};
 await flyTo(page,[-2,4,9],{radius:.35});await faceNorth();const windowBody=await contact('front-window-body','w','studio-static',[0,0,1]);assert.ok(windowBody.player[0]<-.8&&windowBody.player[1]>3.4&&windowBody.player[2]>5.65&&windowBody.player[2]<6.0);
 await flyTo(page,[-2.8,2,9],{radius:.35});await faceNorth();const robotBody=await contact('moving-robot-body','w','robot',[0,0,1]);assert.ok(robotBody.player[2]>6.2&&robotBody.player[2]<7.4);
 await flyTo(page,[-.25,3,5.84],{radius:.18});const deck=await contact('terrace-deck-body','Shift','studio-static',[0,1,0]);assert.ok(deck.player[1]>.15&&deck.player[1]<.35);
 await page.keyboard.down('Space');await page.waitForTimeout(450);await page.keyboard.up('Space');await flyIntoRoom(page);await page.locator('#hotspots [data-exhibit="threadcove"]').click();await page.waitForFunction(()=>starhaven.book.status==='open');await page.locator('#project-back').click();await page.waitForTimeout(900);await page.locator('#exit').click();await page.waitForFunction(()=>starhaven.state==='SPACE'&&!starhaven.cameraProgress.transition);report.returned=await snap();assert.equal(report.returned.passage.entries,1);assert.equal(report.returned.passage.exits,1);
 report.inputs=await page.evaluate(()=>window.__nearInputs);report.trustedInputs=report.inputs.filter(e=>e.trusted).length;report.untrustedInputs=report.inputs.filter(e=>!e.trusted).length;assert.equal(report.untrustedInputs,0);assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{for(const key of ['w','s','Space','Shift'])await page.keyboard.up(key).catch(()=>{});const video=page.video();await context.close();report.video=await video?.path();await browser.close();report.browserClosed=true;report.finished=new Date().toISOString();await writeFile(process.env.NEAR_REPORT||'tests/v15-rc64-near-obstacles.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,contacts:report.contacts.length,trustedInputs:report.trustedInputs,failure:report.failure}));}
