import {runtimeBuildIdentity} from './runtime-build-identity.mjs';
import {chromium} from './browser-runtime.mjs';
import {flyTo,faceHeading} from './room-flight-route.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.WORD_ORBIT_OUT||'screenshots/v25-word-orbit';await mkdir(out,{recursive:true});
const report={started:new Date().toISOString(),method:'Normal spawn, actual keyboard/RMB flight around world anchor. Front/back/left/right/upper/lower views; observe all four words naturally. No pose/state/camera or word-phase writes. Exact-pole geometry checks are separate CPU evidence.',views:[],errors:[],requests:[]};
const browser=await chromium.launch({headless:false,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling','--disable-renderer-backgrounding']}),context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage();
await page.addInitScript(()=>{window.__orbitInputs=[];for(const type of ['keydown','keyup','pointermove','pointerdown','pointerup','click'])addEventListener(type,e=>__orbitInputs.push(e.isTrusted),true);});page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.requests.push(r.url()));
const anchor=[-8,7,-18],routes=[{id:'front',via:[],point:[-8,7,20]},{id:'right',via:[[30,15,20]],point:[30,7,-18]},{id:'back',via:[[30,15,-56]],point:[-8,7,-56]},{id:'left',via:[],point:[-46,7,-18]},{id:'upper',via:[],point:[-8,40,5]},{id:'lower',via:[[-46,40,5],[-46,-26,5]],point:[-8,-26,5]}];
try{
 await page.goto(process.env.WORD_ORBIT_URL||'http://127.0.0.1:4259/');await page.waitForFunction(()=>window.starhaven?.ready);await page.locator('#loading').waitFor({state:'hidden'});report.build=await runtimeBuildIdentity(page);
 for(const route of routes){for(const p of route.via)await flyTo(page,p,{radius:1,timeout:70000});await flyTo(page,route.point,{radius:.7,timeout:70000});const player=await page.evaluate(()=>starhaven.player),d=anchor.map((v,i)=>v-player[i]);await faceHeading(page,Math.atan2(-d[0],-d[2]),Math.atan2(d[1],Math.hypot(d[0],d[2])));const view={id:route.id,words:[]};report.views.push(view);const seen=new Set(),started=Date.now();
  while(seen.size<4&&Date.now()-started<20000){const s=await page.evaluate(()=>({words:starhaven.ambient.words,player:starhaven.player,camera:starhaven.camera,flight:starhaven.flight}));assert.ok(s.words.opacity>.99,'No directional opacity loss: '+route.id);if(s.words.morph===0&&!seen.has(s.words.word)){seen.add(s.words.word);const file=`${out}/${route.id}-${s.words.word.replace(/[^A-Z]/g,'')}.png`;await page.screenshot({path:file});view.words.push({file,...s});}await page.waitForTimeout(80);}
  assert.equal(seen.size,4,'Complete natural word cycle from '+route.id);console.log(JSON.stringify({view:route.id,words:[...seen]}));
 }
 report.inputs=await page.evaluate(()=>({trusted:__orbitInputs.filter(Boolean).length,untrusted:__orbitInputs.filter(v=>!v).length}));assert.equal(report.inputs.untrusted,0);assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await context.close();await browser.close();report.browserClosed=true;report.finished=new Date().toISOString();await writeFile(process.env.WORD_ORBIT_REPORT||'tests/v25-word-orbit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,views:report.views.length,inputs:report.inputs,failure:report.failure}));}
