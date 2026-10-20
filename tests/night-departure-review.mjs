import {chromium} from './browser-runtime.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const url=process.env.DEPARTURE_URL||'http://127.0.0.1:4209/',out=process.env.DEPARTURE_OUT||'E:/temp/starhaven-alpha11-rc11-departure';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--use-angle=d3d11','--enable-gpu','--disable-software-rasterizer']});
const page=await browser.newPage({viewport:{width:1440,height:960}});
const report={url,started:new Date().toISOString(),method:'Normal spawn; trusted keyboard and mouse, telemetry reads only; reset through H.',trials:[],errors:[]};
await page.addInitScript(()=>{window.__departureInputs=[];for(const type of ['keydown','keyup','pointermove'])window.addEventListener(type,e=>window.__departureInputs.push({type,code:e.code,trusted:e.isTrusted,at:performance.now()}),true);});
await page.addInitScript(()=>{window.__departureFrames=[];const sample=()=>{const a=window.starhaven;if(a?.ready&&window.__departureFrames.length<5000)window.__departureFrames.push({now:performance.now(),player:a.player,contacts:a.inspect.collision().lastSolve?.contacts||[]});requestAnimationFrame(sample);};requestAnimationFrame(sample);});
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
const snap=()=>page.evaluate(()=>{const a=window.starhaven;return {now:performance.now(),player:a.player,velocity:a.velocity,flight:a.flight,camera:a.camera,solve:a.inspect.collision().lastSolve};});
try{
 await page.goto(url);await page.waitForFunction(()=>window.starhaven?.ready);await page.waitForTimeout(1000);await page.mouse.move(720,480);
 const bundle=await page.evaluate(()=>[...document.scripts].map(s=>s.src).find(s=>s.includes('/assets/index-')));
 report.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(bundle)).arrayBuffer())).digest('hex')};
 for(const [name,raise] of [['level-W',false],['slightly-up-W',true]]){
  if(report.trials.length){await page.keyboard.press('h');await page.mouse.move(720,480);await page.waitForTimeout(1000);}
  if(raise){await page.mouse.move(720,420);await page.waitForTimeout(1000);await page.mouse.move(720,480);}
  const trial={name,start:await snap(),samples:[]};
  await page.keyboard.down('w');const start=Date.now();
  while(Date.now()-start<6000){trial.samples.push(await snap());await page.waitForTimeout(100);}
  await page.keyboard.up('w');await page.keyboard.down('s');await page.waitForTimeout(1000);await page.keyboard.up('s');
  trial.end=await snap();trial.displacement=Math.hypot(...trial.end.player.map((v,i)=>v-trial.start.player[i]));
  trial.frames=await page.evaluate(start=>window.__departureFrames.filter(frame=>frame.now>=start),trial.start.now);
  trial.frameContacts=trial.frames.filter(frame=>frame.contacts.length);
  trial.maxHeightDeviation=Math.max(...trial.frames.map(frame=>Math.abs(frame.player[1]-trial.start.player[1])));
  trial.contactSamples=trial.samples.filter(s=>s.solve?.contacts.length).map(s=>({afterMs:s.now-trial.start.now,player:s.player,velocity:s.velocity,contacts:s.solve.contacts}));
  await page.screenshot({path:path.join(out,name+'.png')});report.trials.push(trial);
 }
 report.inputs=await page.evaluate(()=>window.__departureInputs);report.status=report.errors.length?'failed':'observed';
}catch(error){report.status='failed';report.failure=error.message;}
finally{await browser.close();report.browserClosed=true;report.finished=new Date().toISOString();await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,trials:report.trials.map(t=>({name:t.name,displacement:t.displacement,start:t.start.player,end:t.end.player,firstContact:t.contactSamples[0],contactSamples:t.contactSamples.length})),errors:report.errors,report:path.join(out,'report.json')}));if(report.status==='failed')process.exitCode=1;}
