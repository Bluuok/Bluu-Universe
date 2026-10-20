import {chromium} from './browser-runtime.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const url=process.env.ROOM_URL||'http://127.0.0.1:4214/',out=process.env.ROOM_OUT||'E:/temp/starhaven-alpha11-rc15-room';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--use-angle=d3d11','--enable-gpu','--disable-software-rasterizer']});
const page=await browser.newPage({viewport:{width:1440,height:960}});
const report={url,started:new Date().toISOString(),method:'Normal spawn; trusted keyboard and mouse, telemetry reads only; reset through H.',trials:[],errors:[]};
await page.addInitScript(()=>{window.__departureInputs=[];for(const type of ['keydown','keyup','pointermove'])window.addEventListener(type,e=>window.__departureInputs.push({type,code:e.code,trusted:e.isTrusted,at:performance.now()}),true);});
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
const snap=()=>page.evaluate(()=>{const a=window.starhaven;return {now:performance.now(),player:a.player,velocity:a.velocity,flight:a.flight,camera:a.camera,solve:a.inspect.collision().lastSolve};});
try{
 await page.goto(url);await page.waitForFunction(()=>window.starhaven?.ready);await page.waitForTimeout(1000);await page.mouse.move(720,480);
 const bundle=await page.evaluate(()=>[...document.scripts].map(s=>s.src).find(s=>s.includes('/assets/index-')));
 report.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(bundle)).arrayBuffer())).digest('hex')};
 await page.keyboard.down('d');await page.waitForTimeout(700);await page.keyboard.up('d');
 await page.keyboard.down('s');await page.waitForTimeout(1000);await page.keyboard.up('s');
 report.approach=await snap();await page.screenshot({path:path.join(out,'01-door-approach.png')});
 await page.keyboard.press('e');const began=Date.now();report.timeline=[];
 for(let n=0;n<120;n++){
  const state=await page.evaluate(()=>({state:window.starhaven.state,camera:window.starhaven.cameraProgress,covered:document.getElementById('transition').classList.contains('cover'),rendering:window.starhaven.rendering}));
  report.timeline.push({afterMs:Date.now()-began,...state});
  if(state.state==='ROOM'&&state.camera.transition===null&&!state.covered)break;
  await page.waitForTimeout(100);
 }
 const latest=report.timeline.at(-1);if(latest.state!=='ROOM'||latest.camera.transition||latest.covered)throw new Error('Room did not finish its actual entry transition');
 await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'02-settled-room.png')});report.roomReadyMs=latest.afterMs;
 await page.locator('[data-exhibit="threadcove"]').click();await page.waitForTimeout(1500);await page.screenshot({path:path.join(out,'03-project.png')});
 await page.locator('#project-back').click();await page.waitForFunction(()=>window.starhaven.state==='ROOM'&&window.starhaven.cameraProgress.transition===null);
 await page.screenshot({path:path.join(out,'04-settled-room-return.png')});
 await page.locator('#exit').click();await page.waitForFunction(()=>window.starhaven.state==='SPACE'&&window.starhaven.cameraProgress.transition===null&&!document.getElementById('transition').classList.contains('cover'));await page.waitForTimeout(500);
 await page.screenshot({path:path.join(out,'05-settled-space-return.png')});report.end=await snap();
 report.inputs=await page.evaluate(()=>window.__departureInputs);report.status=report.errors.length?'failed':'passed';
}catch(error){report.status='failed';report.failure=error.message;}
finally{await browser.close();report.browserClosed=true;report.finished=new Date().toISOString();await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,roomReadyMs:report.roomReadyMs,errors:report.errors,report:path.join(out,'report.json')}));if(report.status==='failed')process.exitCode=1;}
