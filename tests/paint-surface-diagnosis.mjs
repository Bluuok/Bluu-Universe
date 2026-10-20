import {chromium} from './browser-runtime.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const phase=process.env.SURFACE_DIAG_PHASE||'diagnosis';
const url='http://127.0.0.1:4259/',out='screenshots/v15-surface-'+phase;await mkdir(out,{recursive:true});
const html=await readFile('dist/index.html','utf8'),bundle=html.match(/assets\/(index-[^" ]+\.js)/)[1],original=await readFile('dist/assets/'+bundle,'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex');
const source=['sourcePaint(vec2(vOilUV.x*.7,vOilUV.y*1.8))','.25'];
const atlas=[['dab=oilPrint(paintUV,1.65*oilStrokeScale,5.);','dab=vec4(0.);'],['under=oilPrint(paintUV+vec2(.31,.035),.85*oilStrokeScale,3.);','under=vec4(0.);']];
const settings='emissiveIntensity:.16,strokeStrength:.5,relief:.007,paintScale:.3';
const modes=phase==='coordinate'?[{id:'lower-colour-only',patches:[['globalUV:!0','globalUV:!1']]}]:phase==='components'?[{id:'atlas-colour-without-relief',patches:[[settings,'emissiveIntensity:.16,strokeStrength:.5,relief:0,paintScale:.3']]},{id:'atlas-relief-without-colour',patches:[[settings,'emissiveIntensity:.16,strokeStrength:0,relief:.007,paintScale:.3']]}]:[{id:'production',patches:[]},{id:'no-source-grain',patches:[source]},{id:'no-brush-atlas',patches:atlas},{id:'plain-painted-volume',patches:[source,...atlas]}];
const views=JSON.parse(await readFile('tests/paint-flow-review-poses.json','utf8')).slice(0,3);
const report={started:new Date().toISOString(),method:'Material diagnosis only. Intercept the loaded JS response in isolated browser contexts, replacing unique flow-stroke shader expressions or Field material options. Repository source and dist unchanged. Camera/player fixtures isolate surface appearance; not playthrough, visual acceptance or production-build proof for altered responses.',originalBuild:{bundle,sha256:hash(original)},modes:[]};
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling']});
try{
 for(const mode of modes){
  let modified=original;for(const [before,after]of mode.patches){assert.equal(modified.split(before).length-1,1,'Diagnostic replacement must be unique');modified=modified.replace(before,after);}
  const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage(),item={id:mode.id,runtimeSourceSHA256:hash(modified),diagnosticOverrides:mode.patches,errors:[],views:[]};report.modes.push(item);await mkdir(`${out}/${mode.id}`,{recursive:true});
  try{
   if(mode.patches.length)await page.route('**/assets/'+bundle,route=>route.fulfill({status:200,contentType:'text/javascript',body:modified}));
   page.on('pageerror',e=>item.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')item.errors.push(e.text());});
   await page.goto(url);await page.waitForFunction(()=>window.starhaven?.ready,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});await page.keyboard.press('p');
   for(const view of views){
    assert.ok(await page.evaluate(v=>starhaven.inspect.placeFlightFixture({position:v.player,yaw:v.yaw})&&starhaven.inspect.framePosition({position:v.position,target:v.target,duration:.2}),view));
    await page.waitForFunction(()=>!starhaven.cameraProgress.transition);await page.waitForTimeout(500);const screenshot=`${out}/${mode.id}/${view.name}.png`;await page.screenshot({path:screenshot});
    item.views.push({name:view.name,screenshot,observed:await page.evaluate(()=>({camera:starhaven.camera,player:starhaven.player,paintFlow:starhaven.ambient.paintFlow,rendering:starhaven.rendering}))});
   }
   assert.deepEqual(item.errors,[]);item.status='captured';
  }finally{await context.close();item.browserContextClosed=true;}
 }
 report.status='diagnostics-captured-awaiting-analysis';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();report.browserClosed=true;report.finished=new Date().toISOString();await writeFile('tests/v15-surface-'+phase+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,modes:report.modes.map(m=>({id:m.id,views:m.views.length,errors:m.errors})),failure:report.failure}));}
