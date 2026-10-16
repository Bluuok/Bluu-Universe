import {runtimeBuildIdentity} from './runtime-build-identity.mjs';
import {chromium} from '@playwright/test';
import * as THREE from 'three';
import {flyTo,faceHeading} from './room-flight-route.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const out=process.env.WORD_CONTACT_OUT||'screenshots/v26-word-contact';await mkdir(out,{recursive:true});
const report={started:new Date().toISOString(),method:'One normal spawn, trusted keyboard/RMB only. Read-only displayed word/rotation/lift guides physical strafing toward its first glyph; no pose/camera/phase/state writes. Passive frame samples track contact/recovery. Browser reduced-motion emulation is separately labelled.',rounds:[],errors:[],requests:[]};
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling','--disable-renderer-backgrounding']}),page=await browser.newPage({viewport:{width:1440,height:960}});
await page.addInitScript(()=>{window.__contactInputs=[];window.__contactFrames=[];for(const t of ['keydown','keyup','pointermove','pointerdown','pointerup','click'])addEventListener(t,e=>__contactInputs.push(e.isTrusted),true);function sample(){if(window.starhaven?.ready)__contactFrames.push({at:performance.now(),word:starhaven.ambient.words,player:starhaven.player});requestAnimationFrame(sample);}requestAnimationFrame(sample);});
page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.requests.push(r.url()));
const snap=()=>page.evaluate(()=>({word:starhaven.ambient.words,player:starhaven.player,flight:starhaven.flight,velocity:starhaven.velocity,state:starhaven.state}));
async function shot(name){const file=`${out}/${name}.png`;await page.screenshot({path:file});return{file,...await snap()};}
async function strafeIntoGlyph(yaw,pitch){
 await faceHeading(page,yaw,pitch);const start=Date.now(),trace=[];
 while(Date.now()-start<60000){
  await page.keyboard.down('x');await page.waitForTimeout(180);const s=await snap();
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...s.word.rotation));
  const glyphX={WELCOME:-10.5,TO:-2,"BLUU'S":-7.5,UNIVERSE:-10.5}[s.word.word];assert.ok(Number.isFinite(glyphX),'Recognized displayed first glyph');
  const target=new THREE.Vector3(glyphX,s.word.presentationLift,0).applyQuaternion(q).add(new THREE.Vector3(...s.word.position));target.y-=1;
  const delta=target.sub(new THREE.Vector3(...s.player));trace.push({word:s.word.word,player:s.player,target:target.clone().add(new THREE.Vector3(...s.player)).toArray(),distance:delta.length(),affected:s.word.affected});
  if(delta.length()<.45){await page.keyboard.up('x');return trace;}
  const right=delta.x*Math.cos(yaw)-delta.z*Math.sin(yaw),forward=-delta.x*Math.sin(yaw)-delta.z*Math.cos(yaw);
  let key,amount;if(Math.abs(forward)>.45){key=forward>0?'w':'s';amount=Math.abs(forward);}else if(Math.abs(right)>Math.abs(delta.y)){key=right>0?'d':'a';amount=Math.abs(right);}else{key=delta.y>0?'Space':'Shift';amount=Math.abs(delta.y);}
  await page.keyboard.up('x');await page.keyboard.down(key);await page.waitForTimeout(Math.min(140,Math.max(25,amount*80)));await page.keyboard.up(key);
 }
 throw Error('Physical glyph approach timed out: '+JSON.stringify(trace.slice(-6)));
}
const routes=[
 {id:'front',via:[],stage:[-19,9,6],near:[-19,9,-8],yaw:0,pitch:0,leave:[-19,9,20]},
 {id:'back',via:[[-35,20,-55]],stage:[3,9,-43],near:[3,9,-28],yaw:Math.PI,pitch:0,leave:[3,9,-55]},
 {id:'upper',via:[[-35,40,20]],stage:[-19,34,-10],near:[-19,17,-14],yaw:0,pitch:-1.2,leave:[-19,42,-10]},
];
try{
 await page.goto(process.env.WORD_CONTACT_URL||'http://127.0.0.1:4259/');await page.waitForFunction(()=>window.starhaven?.ready);await page.locator('#loading').waitFor({state:'hidden'});
 report.build=await runtimeBuildIdentity(page);
 const selected=routes.filter(r=>!process.env.WORD_CONTACT_ROUTES||process.env.WORD_CONTACT_ROUTES.split(',').includes(r.id));assert.ok(selected.length>0,'At least one recognized route required');
 for(const route of selected){
  const inputStart=await page.evaluate(()=>__contactInputs.length);
  for(const p of route.via)await flyTo(page,p,{radius:1,pulseNear:true,timeout:90000});await flyTo(page,route.stage,{radius:.7,pulseNear:true,timeout:90000});
  await faceHeading(page,route.yaw,route.pitch);await page.waitForFunction(()=>{const w=starhaven.ambient.words,c=starhaven.manifest.sky.wordField;return w.word==='WELCOME'&&w.morph===0&&w.time%(c.holdSeconds+c.morphSeconds)<.15;},null,{timeout:20000});
  const from=await page.evaluate(()=>__contactFrames.length),before=await shot(`${route.id}-before`);await flyTo(page,route.near,{radius:.7,pulseNear:true,timeout:90000});
  await page.waitForFunction(()=>starhaven.ambient.words.morph===0&&starhaven.ambient.words.holdingForInteraction);const trace=await strafeIntoGlyph(route.yaw,route.pitch);await page.waitForTimeout(500);const contact=await shot(`${route.id}-contact`);
  const samples=await page.evaluate(i=>__contactFrames.slice(i),from),peakAffected=Math.max(...samples.map(s=>s.word.affected)),peakDisplacement=Math.max(...samples.map(s=>s.word.maxDisplacement));
  const round={id:route.id,before,contact,peakAffected,peakDisplacement,trace};report.rounds.push(round);
  assert.equal(contact.word.word,trace.at(-1).word,'Contact follows the actual held glyph');assert.ok(peakAffected>20&&peakAffected<4500,route.id+' localized physical contact');assert.ok(peakDisplacement>.01,route.id+' measurable contact displacement');
  await flyTo(page,route.leave,{radius:1,pulseNear:true,timeout:90000});await page.waitForFunction(()=>starhaven.ambient.words.maxDisplacement<.02&&!starhaven.ambient.words.holdingForInteraction,null,{timeout:6000});
  await faceHeading(page,route.yaw,route.pitch);const recovered=await shot(`${route.id}-recovered`),time=recovered.word.time;await page.waitForTimeout(500);assert.ok((await snap()).word.time>time,'Word cycle resumes after physical departure');
  round.inputs=await page.evaluate(i=>{const events=__contactInputs.slice(i);return{trusted:events.filter(Boolean).length,untrusted:events.filter(v=>!v).length};},inputStart);assert.equal(round.inputs.untrusted,0);
  round.recovered=recovered;round.status='passed';console.log(JSON.stringify({id:route.id,peakAffected,peakDisplacement,status:'passed'}));
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);const reduced=await snap();await page.waitForTimeout(600);const held=await snap();assert.equal(held.word.time,reduced.word.time);assert.equal(held.word.word,'WELCOME');assert.equal(held.word.maxDisplacement,0);report.reducedMotion={before:reduced,after:held,screenshot:await shot('reduced-motion')};
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(600);assert.ok((await snap()).word.time>held.word.time);
 report.inputs=await page.evaluate(()=>({trusted:__contactInputs.filter(Boolean).length,untrusted:__contactInputs.filter(v=>!v).length}));assert.equal(report.inputs.untrusted,0);assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{report.inputs??=await page.evaluate(()=>({trusted:__contactInputs.filter(Boolean).length,untrusted:__contactInputs.filter(v=>!v).length})).catch(()=>null);for(const k of ['w','s','a','d','x','Space','Shift'])await page.keyboard.up(k).catch(()=>{});await browser.close();report.browserClosed=true;report.finished=new Date().toISOString();await writeFile(process.env.WORD_CONTACT_REPORT||'tests/v26-word-contact.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,rounds:report.rounds.length,inputs:report.inputs,failure:report.failure}));}
