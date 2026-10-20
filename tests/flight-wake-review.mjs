import {chromium} from './browser-runtime.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const url=process.env.WAKE_URL||'http://127.0.0.1:4218/',out=process.env.WAKE_OUT||'E:/temp/starhaven-rc19-wake';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling']});
const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:1440,height:960}}});
const page=await context.newPage();
const report={url,started:new Date().toISOString(),method:'Installed headed Chrome, same normal-spawn real key/mouse sequence; screenshots and passive telemetry. rAF intervals measure browser display callbacks, not GPU time or universal FPS.',phases:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
await page.addInitScript(()=>{window.__wakeInputs=[];for(const type of ['keydown','keyup','pointermove'])window.addEventListener(type,e=>window.__wakeInputs.push({type,code:e.code,trusted:e.isTrusted,at:performance.now()}),true);});
await page.addInitScript(()=>{
 window.__releaseMeasurements=[];
 const observe=()=>{const a=window.starhaven;return a?{at:performance.now(),player:a.player,velocity:a.velocity,lean:a.flight.lean,wake:a.flight.wake.alive,braking:a.flight.braking}:null;};
 const begin=(mode,event)=>{const start=observe();if(!start||Math.hypot(...start.velocity)<8)return;const record={mode,trusted:event.isTrusted,start,samples:[]};window.__releaseMeasurements.push(record);};
 window.addEventListener('keyup',e=>{if(e.code==='KeyW')begin('release',e);},true);
 window.addEventListener('keydown',e=>{if(e.code==='KeyS'&&!e.repeat)begin('brake',e);},true);
 const sample=()=>{const now=performance.now();for(const record of window.__releaseMeasurements)if(now-record.start.at<1400){const state=observe();record.samples.push(state);if(record.stoppedAt===undefined&&Math.hypot(...state.velocity)<.03){record.stoppedAt=state.at;record.distance=Math.hypot(...state.player.map((p,i)=>p-record.start.player[i]));}}requestAnimationFrame(sample);};requestAnimationFrame(sample);
});
const snapshot=()=>page.evaluate(()=>({player:starhaven.player,velocity:starhaven.velocity,flight:starhaven.flight,rendering:starhaven.rendering,envelope:starhaven.inspect.characterEnvelope(),camera:starhaven.camera}));
async function phase(name,frames=0){
  let intervals=[];
  if(frames)intervals=await page.evaluate(count=>new Promise(resolve=>{let before;const values=[];function frame(now){if(before!==undefined)values.push(now-before);before=now;if(values.length>=count)resolve(values);else requestAnimationFrame(frame);}requestAnimationFrame(frame);}),frames);
  const observation=await snapshot();const file=out+'/'+name+'.png';await page.screenshot({path:file});
  const sorted=[...intervals].sort((a,b)=>a-b),percentile=p=>sorted[Math.floor((sorted.length-1)*p)];
  report.phases.push({name,observation,screenshot:file,intervals,frameTimes:frames?{median:percentile(.5),p95:percentile(.95),max:Math.max(...intervals)}:null});
  assert.equal(observation.envelope.enclosed,true,`${name}: original body must remain inside collision capsule`);
}
try{
  await page.goto(url);await page.waitForFunction(()=>window.starhaven?.ready);await page.waitForTimeout(1200);
  const bundle=await page.evaluate(()=>[...document.scripts].map(s=>s.src).find(s=>s.includes('/assets/index-')));
  report.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(bundle)).arrayBuffer())).digest('hex')};
  report.gpu=await page.evaluate(()=>{const gl=document.getElementById('world').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL);});
  await page.mouse.move(720,480);await phase('01-idle',120);
  await page.keyboard.down('w');await page.waitForTimeout(1600);await phase('02-powered',180);
  await page.mouse.move(845,480);await page.waitForTimeout(650);await phase('03-powered-turn');
  await page.mouse.move(720,480);await page.waitForTimeout(600);await phase('04-centered');
  await page.keyboard.up('w');await page.waitForTimeout(200);await phase('05-glide-decay');
  await page.waitForTimeout(900);await phase('06-glide-clear');
  await page.keyboard.press('h');await page.mouse.move(720,480);await page.keyboard.down('w');await page.waitForTimeout(1600);await page.keyboard.up('w');
  await page.keyboard.down('s');await page.waitForTimeout(200);await phase('07-braking');
  await page.waitForTimeout(1000);await page.keyboard.up('s');await page.waitForTimeout(300);await phase('08-stopped',120);
  const powered=report.phases.find(p=>p.name==='02-powered').observation.flight;
  const clear=report.phases.find(p=>p.name==='06-glide-clear').observation.flight;
  assert.ok(powered.lean*180/Math.PI>43&&powered.lean*180/Math.PI<47,'Level thrust leans the body approximately 45 degrees');
  // Screenshots can pause rendering while the app's wall clock advances. Keep
  // separate input-only coast/brake trials so capture stalls do not distort
  // elapsed stopping time or apply a stale telemetry position retroactively.
  report.capturePhaseMeasurements=await page.evaluate(()=>window.__releaseMeasurements);
  await page.evaluate(()=>{window.__releaseMeasurements=[];});
  await page.keyboard.press('h');await page.mouse.move(720,480);await page.waitForTimeout(300);
  await page.keyboard.down('w');await page.waitForTimeout(1600);await page.keyboard.up('w');await page.waitForTimeout(1500);
  await page.keyboard.press('h');await page.mouse.move(720,480);await page.waitForTimeout(300);
  await page.keyboard.down('w');await page.waitForTimeout(1600);await page.keyboard.up('w');await page.keyboard.down('s');await page.waitForTimeout(1500);await page.keyboard.up('s');
  report.stoppingMethod='Separate trusted-input runs with passive rAF sampling; no screenshots, page evaluations or protocol frame captures during either stop. Earlier capture-phase samples are retained but excluded from timing assertions.';
  report.releaseMeasurements=await page.evaluate(()=>window.__releaseMeasurements);
  const coast=report.releaseMeasurements.find(r=>r.mode==='release'&&!r.samples.some(s=>s.braking));
  const brake=report.releaseMeasurements.find(r=>r.mode==='brake');
  assert.ok(coast?.trusted&&coast.stoppedAt-coast.start.at<1100&&coast.distance>1.5&&coast.distance<3.5,'Release settles over a short natural coast');
  assert.ok(brake?.trusted&&brake.stoppedAt-brake.start.at<400&&brake.distance<1.5,'S stops faster and closer than coasting');
  if(powered.wake){assert.ok(powered.wake.alive>60);assert.ok(powered.wake.gold>15);assert.ok(powered.wake.maxSize>.12);assert.equal(clear.wake.alive,0);assert.ok(report.phases.every(p=>p.observation.flight.wake.alive<=160));}
  assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{report.inputs=await page.evaluate(()=>window.__wakeInputs).catch(()=>[]);await context.close();await browser.close();report.browserClosed=true;report.finished=new Date().toISOString();await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,build:report.build,gpu:report.gpu,phases:report.phases.map(p=>({name:p.name,wake:p.observation.flight.wake,particles:p.observation.flight.particles,envelope:p.observation.envelope.maximumDistanceToSegment,frameTimes:p.frameTimes})),errors:report.errors,failure:report.failure,report:out+'/report.json'}));if(report.status==='failed')process.exitCode=1;}
