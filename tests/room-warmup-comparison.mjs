import {chromium} from './browser-runtime.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {flyIntoRoom} from './room-flight-route.mjs';

const out=process.env.WARMUP_OUT||'E:/temp/starhaven-rc32-rc33-warmup';await mkdir(out,{recursive:true});
const variants=[{name:'RC32',url:'http://127.0.0.1:4231/'},{name:'RC33',url:'http://127.0.0.1:4232/'}];
const report={started:new Date().toISOString(),method:'Alternating fresh installed Chrome sessions; same normal-input route, two entries each. No video or screenshots during measured transitions. rAF and program/resource counts are browser observations, not GPU time or OS-focus proof.',runs:[]};
if(process.env.WARMUP_WAIT_FOR){
  const began=Date.now();console.log('Waiting for the independent review to confirm its browser is closed before GPU timing.');
  while(true){
    let closed=false;try{closed=JSON.parse(await readFile(process.env.WARMUP_WAIT_FOR,'utf8')).browserClosed===true;}catch{}
    if(closed)break;if(Date.now()-began>20*60*1000)throw Error('Independent browser did not report closure within 20 minutes; comparison was not started.');
    await new Promise(resolve=>setTimeout(resolve,2000));
  }
  report.waitedForIndependentBrowserMs=Date.now()-began;console.log('Independent browser closed; starting isolated alternating comparison.');
}
for(let round=1;round<=Number(process.env.WARMUP_ROUNDS||3);round++)for(const variant of variants){
  const browser=await chromium.launch({headless:false,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling']});
  const context=await browser.newContext({viewport:{width:1440,height:960}});
  await context.addInitScript(()=>{
    window.__warmSamples=[];window.__warmReadyAt=null;
    const sample=rafAt=>{const a=window.starhaven;if(a?.ready){const at=performance.now();window.__warmReadyAt??=at;window.__warmSamples.push({at,rafAt,state:a.state,phase:a.passage?.phase,entries:a.passage?.entries,exits:a.passage?.exits,progress:a.passage?.progress,camera:a.camera,programs:a.rendering.programs,textures:a.rendering.textures,geometries:a.rendering.geometries});}requestAnimationFrame(sample);};requestAnimationFrame(sample);
  });
  const page=await context.newPage(),run={...variant,round,errors:[],requestFailures:[],entries:[]};
  page.on('pageerror',e=>run.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')run.errors.push(m.text());});page.on('requestfailed',r=>run.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
  try{
    await page.goto(variant.url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.starhaven?.ready,undefined,{timeout:120000});await page.waitForTimeout(400);
    const bundle=await page.evaluate(()=>[...document.scripts].map(s=>s.src).find(s=>s.includes('/assets/index-')));
    run.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(bundle)).arrayBuffer())).digest('hex')};
    run.initial=await page.evaluate(()=>({readyAt:window.__warmReadyAt,rendering:starhaven.rendering,player:starhaven.player}));
    for(let entry=1;entry<=2;entry++){
      await flyIntoRoom(page);await page.waitForTimeout(550);
      run.entries.push(await page.evaluate(()=>({state:starhaven.state,passage:starhaven.passage,rendering:starhaven.rendering})));
      if(entry===1){await page.locator('#exit').click();await page.waitForFunction(()=>starhaven.state==='SPACE'&&!starhaven.cameraProgress.transition);await page.waitForTimeout(300);}
    }
    run.samples=await page.evaluate(()=>window.__warmSamples);
    run.entryFrames=[1,2].map(entry=>{
      const frames=run.samples.filter(s=>s.entries===entry&&(s.phase==='approach'||s.phase==='reveal'));
      const intervals=frames.slice(1).map((s,i)=>s.rafAt-frames[i].rafAt).sort((a,b)=>a-b);
      const steps=frames.slice(1).map((s,i)=>Math.hypot(...s.camera.map((v,k)=>v-frames[i].camera[k])));
      return{entry,frames:frames.length,maxRafMs:Math.max(...intervals),p95RafMs:intervals[Math.floor(intervals.length*.95)],over50ms:intervals.filter(v=>v>50).length,maxCameraStep:Math.max(...steps),programsBefore:frames[0]?.programs,programsAfter:frames.at(-1)?.programs};
    });
    await page.screenshot({path:`${out}/${variant.name}-${round}-settled.png`});
    run.status=run.errors.length?'failed':run.requestFailures.length?'completed-with-request-diagnostics':'passed';
  }catch(error){run.status='failed';run.failure=error.stack;run.samples=await page.evaluate(()=>window.__warmSamples).catch(()=>[]);}
  finally{await context.close();await browser.close();report.runs.push(run);await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({variant:run.name,round,status:run.status,readyMs:run.initial?.readyAt,warmMs:run.initial?.rendering.gpuWarmup.milliseconds,initialPrograms:run.initial?.rendering.programs,entries:run.entryFrames,errors:run.errors,failure:run.failure}));}
}
report.finished=new Date().toISOString();report.status=report.runs.some(r=>r.status==='failed')?'failed':'completed';await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));if(report.status==='failed')process.exitCode=1;
