import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const url=process.env.ADDITIONS_URL||'http://127.0.0.1:4243/',tag=process.env.ADDITIONS_TAG||'rc44';
const out=`screenshots/v12-${tag}-additions`;await mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),url,method:'Installed Chrome / D3D11. Normal spawn loop observations; existing pose/camera fixtures for isolated word crossing with trusted W/S. Separate resource/physics fixtures are labelled; not full-route or physical OS acceptance.',checks:[],shots:[],errors:[],requestFailures:[]};
const browser=await chromium.launch({headless:false,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage();
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text())});page.on('requestfailed',r=>report.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
const snap=()=>page.evaluate(()=>({ambient:starhaven.ambient,player:starhaven.player,camera:starhaven.camera,state:starhaven.state,flight:starhaven.flight,rendering:starhaven.rendering}));
const check=(name,condition,evidence)=>{assert.ok(condition,name);report.checks.push({name,passed:true,evidence});};
const shot=async name=>{const file=`${out}/${name}.png`;await page.screenshot({path:file});report.shots.push({name,file,...await snap()});};
try{
 await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.starhaven?.ready,{timeout:120000});await page.mouse.move(720,480);
 const bundle=await page.evaluate(()=>[...document.scripts].find(s=>s.src.includes('/assets/index-')).src);report.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(bundle)).arrayBuffer())).digest('hex')};
 await shot('00-normal-spawn');
 const words=new Set(),flybys=new Set();const loopStart=Date.now();
 while(Date.now()-loopStart<55000&&(words.size<4||flybys.size<2)){
  const sample=await snap(),word=sample.ambient.words,flyby=sample.ambient.flybys;
  if(word.morph<.005&&!words.has(word.word)){words.add(word.word);await shot(`word-${words.size}-${word.word.replace(/[^A-Z]/g,'')}`);}
  if(flyby.active&&flyby.progress>.25&&flyby.progress<.8&&!flybys.has(flyby.spawned)){flybys.add(flyby.spawned);await shot(`flyby-${flyby.spawned}`);}
  await page.waitForTimeout(130);
 }
 check('All four words form during a real elapsed-time loop',words.size===4,[...words]);
 check('Two separated flybys appear',flybys.size>=2,[...flybys]);
 await page.keyboard.press('p');const paused=await snap();await page.waitForTimeout(500);const still=await snap();
 check('Pause freezes word phase and flyby progress',Math.abs(paused.ambient.words.time-still.ambient.words.time)<.03&&Math.abs(paused.ambient.flybys.progress-still.ambient.flybys.progress)<.005);
 await page.keyboard.press('p');
 const placement=await page.evaluate(()=>{
  const config=starhaven.manifest.sky.wordField,n=[Math.sin(config.rotation[1]),0,Math.cos(config.rotation[1])];
  const start=config.position.map((v,i)=>v+n[i]*7-(i===1?1:0));
  starhaven.inspect.placeFlightFixture({position:start,yaw:config.rotation[1]});
  starhaven.inspect.framePosition({position:config.position.map((v,i)=>v+n[i]*28+(i===1?2:0)),target:config.position,duration:.2});return {start,normal:n};
 });
 await page.waitForTimeout(550);await shot('medium-word');
 await page.waitForFunction(()=>starhaven.ambient.words.morph>.12&&starhaven.ambient.words.morph<.7);
 await page.keyboard.down('w');let affected=0,displacement=0;const crossing=[];
 for(let i=0;i<34;i++){const s=await snap();crossing.push({player:s.player,words:s.ambient.words});affected=Math.max(affected,s.ambient.words.affected);displacement=Math.max(displacement,s.ambient.words.maxDisplacement);if(i===20)await shot('crossing-word');await page.waitForTimeout(75);}
 await page.keyboard.up('w');await page.keyboard.down('s');await page.waitForTimeout(750);await page.keyboard.up('s');await shot('after-crossing');
 check('Trusted W crosses and scatters particles during word morph',affected>20&&displacement>.25,{placement,affected,displacement,crossing});
 await page.waitForTimeout(2500);const restored=await snap();await shot('regathered-word');
 check('Particles regather after departure',restored.ambient.words.affected===0&&restored.ambient.words.maxDisplacement<.06,restored.ambient.words);
 await page.click('#project-toggle');await page.locator('.catalog-item').first().click();await page.waitForFunction(()=>starhaven.state==='PROJECT'&&!starhaven.cameraProgress.transition);
 const reading=await snap();check('Project reading hides both ambient modules',!reading.ambient.words.visible&&!reading.ambient.flybys.visible);await shot('project-hidden');
 await page.click('#project-close');await page.waitForFunction(()=>starhaven.state==='SPACE'&&!starhaven.cameraProgress.transition);await page.waitForTimeout(180);
 check('Closing the book restores ambient visibility',(await snap()).ambient.words.visible);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(120);const reduced=await snap();await page.waitForTimeout(600);const reducedStill=await snap();
 check('Reduced motion holds WELCOME and suppresses flybys',reducedStill.ambient.words.word==='WELCOME'&&Math.abs(reducedStill.ambient.words.time-reduced.ambient.words.time)<.01&&!reducedStill.ambient.flybys.visible);await shot('reduced-motion');
 await page.emulateMedia({reducedMotion:'no-preference'});
 const cadence=await page.evaluate(async()=>{const gaps=[];let last;await new Promise(resolve=>{function frame(now){if(last!==undefined)gaps.push(now-last);last=now;if(gaps.length===240)resolve();else requestAnimationFrame(frame)}requestAnimationFrame(frame)});const sorted=[...gaps].sort((a,b)=>a-b);return {median:sorted[120],p95:sorted[228],max:sorted.at(-1),gaps}});report.cadence=cadence;
 const fixtureBundle=await build({stdin:{contents:"export * as THREE from 'three';export {createFlybys} from './src/scenes/sky/AmbientFlybys.js';export {ParticleWords} from './src/scenes/sky/ParticleWords.js';export {WordFieldManifest} from './src/config/WordFieldManifest.js';",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'SpaceModuleFixtures',logLevel:'silent'});
 const fixture=await context.newPage();await fixture.addScriptTag({content:fixtureBundle.outputFiles[0].text});
 report.moduleFixture=await fixture.evaluate(()=>{
  const {THREE,createFlybys,ParticleWords,WordFieldManifest}=SpaceModuleFixtures,scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(43,1.5,.1,1800);camera.position.set(0,10,35);camera.lookAt(0,10,0);camera.updateMatrixWorld(true);
  const flyby=createFlybys(scene,{random:()=>.2});for(let i=0;i<140;i++)flyby.update(.1,camera);const world=flyby.getState().position;camera.position.x+=40;flyby.update(.1,camera);const fixed=flyby.getState().position.every((v,i)=>v===world[i]);
  const words=new ParticleWords({scene,config:WordFieldManifest}),player=new THREE.Vector3(...WordFieldManifest.position);player.y-=1;const velocity=new THREE.Vector3(0,0,-12);let max=0,finite=true;
  for(let i=0;i<720;i++){words.update(1/60,camera,{player,velocity});max=Math.max(max,words.telemetry.maxDisplacement);}
  for(const n of words.positions)if(!Number.isFinite(n))finite=false;
  player.set(100,100,100);for(let i=0;i<240;i++)words.update(1/60,camera,{player});const recovered=words.telemetry.maxDisplacement;
  const resources=new Set(),borrowed=new Set();scene.traverse(object=>{if(object.geometry)(object.isSprite?borrowed:resources).add(object.geometry);for(const m of [object.material].flat()){if(!m)continue;resources.add(m);if(m.map)resources.add(m.map)}});const counts=[],borrowedCounts=[];for(const resource of resources){const c={type:resource.type,count:0};counts.push(c);resource.addEventListener('dispose',()=>c.count++)}for(const resource of borrowed){const c={type:resource.type,count:0};borrowedCounts.push(c);resource.addEventListener('dispose',()=>c.count++)}
  flyby.dispose();flyby.dispose();words.dispose();words.dispose();flyby.update(.1,camera);words.update(.1,camera,{player});
  return {method:'Separate module fixture; no renderer or product scene mutation',worldFixed:fixed,maxDisplacement:max,finite,recovered,resources:counts,borrowedSpriteGeometry:borrowedCounts,detached:scene.children.length===0};
 });await fixture.close();
 check('Flybys remain world fixed after camera translation',report.moduleFixture.worldFixed);
 check('Sustained particle contact remains bounded and recovers',report.moduleFixture.finite&&report.moduleFixture.maxDisplacement<=5.5001&&report.moduleFixture.recovered<.01,report.moduleFixture);
 check('Owned module resources dispose once and detach',report.moduleFixture.detached&&report.moduleFixture.resources.every(r=>r.count===1)&&report.moduleFixture.borrowedSpriteGeometry.every(r=>r.count===0));
 check('No shader/page/console errors',report.errors.length===0,report.errors);report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();report.browserClosed=true;report.finished=new Date().toISOString();await writeFile(`tests/v12-${tag}-additions.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,errors:report.errors,failure:report.failure,cadence:report.cadence&&{median:report.cadence.median,p95:report.cadence.p95,max:report.cadence.max}}));}
