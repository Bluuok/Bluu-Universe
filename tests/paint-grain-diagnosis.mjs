import {chromium} from './browser-runtime.mjs';
import {flyTo,faceHeading} from './room-flight-route.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out='screenshots/v24-grain-diagnosis';await mkdir(out,{recursive:true});
const html=await readFile('dist/index.html','utf8'),bundle=html.match(/assets\/(index-[^" ]+\.js)/)[1],source=await readFile('dist/assets/'+bundle,'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
const modes=[{id:'production',patches:[]},{id:'no-relief',patches:[['float relief=(dab.r*dab.g+under.r*under.g*.45)*oilRelief+sourceGrain*.005;','float relief=0.;']]},{id:'no-atlas',patches:[['dab=oilPrint(paintUV,1.65*oilStrokeScale,5.);','dab=vec4(0.);'],['under=oilPrint(paintUV+vec2(.31,.035),.85*oilStrokeScale,3.);','under=vec4(0.);']]},{id:'no-source',patches:[['sourcePaint(vec2(vOilUV.x*.7,vOilUV.y*1.8))','.25']]}];
const report={at:new Date().toISOString(),method:'Material diagnosis only: altered JS response in isolated browser context, actual keyboard/RMB flight from normal spawn. No pose/state/camera fixtures. Altered responses are not production acceptance.',sourceBuild:{bundle,sha256:hash(source)},modes:[]};
const browser=await chromium.launch({headless:false,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
try{for(const mode of modes){let modified=source;for(const [before,after]of mode.patches){assert.equal(modified.split(before).length-1,1,'Diagnostic patch must be unique');modified=modified.replace(before,after);}
 const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage(),item={id:mode.id,responseSHA256:hash(modified),diagnosticOverrides:mode.patches,errors:[],requests:[],views:[]};report.modes.push(item);
 try{if(mode.patches.length)await page.route('**/assets/'+bundle,route=>route.fulfill({status:200,contentType:'text/javascript',body:modified}));page.on('pageerror',e=>item.errors.push(e.message));page.on('requestfailed',r=>item.requests.push(r.url()));await page.addInitScript(()=>{window.__grainInputs=[];for(const type of ['keydown','keyup','pointerdown','pointerup','pointermove'])addEventListener(type,e=>__grainInputs.push(e.isTrusted),true);});
 await page.goto('http://127.0.0.1:4259/');await page.waitForFunction(()=>window.starhaven?.ready);await page.locator('#loading').waitFor({state:'hidden'});await flyTo(page,[-15,12,-15]);await flyTo(page,[-110.46617,-35.08571,-121.13181],{radius:.3,timeout:70000});
 for(const [name,yaw,pitch]of [['close',.09698,-.14166],['side',.57698,-.14166],['up',.09698,.6]]){await faceHeading(page,yaw,pitch);await page.waitForTimeout(500);const file=`${out}/${mode.id}-${name}.png`;await page.screenshot({path:file});item.views.push({name,file,...await page.evaluate(()=>({player:starhaven.player,camera:starhaven.camera,framing:starhaven.framing}))});}
 item.inputs=await page.evaluate(()=>({trusted:__grainInputs.filter(Boolean).length,untrusted:__grainInputs.filter(v=>!v).length}));assert.equal(item.inputs.untrusted,0);assert.deepEqual(item.errors,[]);assert.deepEqual(item.requests,[]);item.status='captured';console.log(JSON.stringify({mode:item.id,inputs:item.inputs}));
 }finally{await context.close();item.contextClosed=true;}
 }report.status='diagnostics-captured-awaiting-art-review';}catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;}
finally{await browser.close();report.browserClosed=true;await writeFile('tests/v24-grain-diagnosis.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,failure:report.failure}));}
