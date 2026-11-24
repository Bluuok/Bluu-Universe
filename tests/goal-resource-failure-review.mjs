import {chromium,desktopLaunchOptions,saveDesktopFrame} from './browser-runtime.mjs';
import {runtimeBuildIdentity} from './runtime-build-identity.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';

assert.equal(process.platform,'linux','Resource fault review is restricted to the remote Linux job');
assert.equal(process.env.GITHUB_ACTIONS,'true','Use the explicit remote workflow');
const url=process.env.GOAL_URL||'http://127.0.0.1:4259/',out=process.env.GOAL_FAULT_OUT||'screenshots/v13-rc61-failures';await mkdir(out,{recursive:true});
const transportResponse=await fetch(new URL('/assets/transport.json',url)),transport=(transportResponse.headers.get('content-type')||'').includes('json')?await transportResponse.json():null;const chunkPattern=part=>transport?new URL(transport.assets[Object.keys(transport.assets).find(k=>k.includes(part))].parts[0].url,url).href:part==='panorama'?'**/assets/sky/world/blue-gold-panorama*.png':'**/assets/sky/candidates/layer-*.png';
const report={started:new Date().toISOString(),method:'Remote Linux, isolated network interception and X11 frames; no state/pose writes. Expected loader and optional-content failures are separate from runtime errors. Not a gameplay or OS-focus test.',environment:{platform:process.platform,executable:chromium.executablePath(),launchOptions:desktopLaunchOptions},cases:[]};
const browser=await chromium.launch(desktopLaunchOptions);
const errorView=page=>page.evaluate(()=>{const root=document.getElementById('loading'),icon=root.querySelector('.orbit-loader'),retry=document.getElementById('loading-retry');return {state:root.dataset.state,role:root.getAttribute('role'),hint:root.querySelector('small').textContent,spin:getComputedStyle(icon).animationName,starSpin:getComputedStyle(icon,'::after').animationName,retryVisible:!retry.hidden,retryFocused:document.activeElement===retry};});
function checkErrorView(view){assert.equal(view.state,'error');assert.equal(view.role,'alert');assert.equal(view.spin,'none');assert.equal(view.starSpin,'none');assert.equal(view.retryVisible,true);assert.equal(view.retryFocused,true);assert.equal(view.hint,'请检查网络连接，然后重新尝试。');assert(!view.hint.includes('/assets/'));}
try{
 for(const [name,pattern,invalid]of [['optional-content-network','**/content-notes.json'],['optional-content-json','**/content-notes.json',true],['required-character','**/assets/character/astronaut.glb'],['required-sky',chunkPattern('panorama')],['required-pigment',chunkPattern('layer-')],...(transport?[['required-transport-manifest','**/assets/transport.json'],['required-corrupt-sky',chunkPattern('panorama'),'corrupt']]:[])]){
  const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage(),item={name,interceptions:0,errors:[],requests:[]};report.cases.push(item);
  try{
   page.on('pageerror',e=>item.errors.push(e.message));page.on('requestfailed',r=>item.requests.push({url:r.url(),reason:r.failure()?.errorText}));
   await page.route(pattern,r=>{item.interceptions++;if(invalid==='corrupt')return r.fetch().then(async response=>{const body=await response.body();body[0]^=1;return r.fulfill({response,body});});return invalid?r.fulfill({contentType:'application/json',body:'{invalid'}):r.abort();});
   await page.goto(url);const build=await runtimeBuildIdentity(page);
   if(report.build)assert.deepEqual(report.build,build);else report.build=build;
   if(name.startsWith('required')){await page.waitForFunction(()=>document.querySelector('#loading p')?.textContent.includes('星港暂时未能加载'),null,{timeout:120000});item.result=await page.evaluate(()=>({ready:window.starhaven?.ready,text:document.querySelector('#loading p').textContent}));assert.ok(!item.result.ready);item.errorView=await errorView(page);checkErrorView(item.errorView);}
   else{await page.waitForFunction(()=>window.starhaven?.ready,null,{timeout:120000});item.result=await page.evaluate(()=>({ready:starhaven.ready,content:starhaven.projectContent}));assert.equal(item.result.content.loaded,false);}
   assert.ok(item.interceptions>0);assert.deepEqual(item.errors,[]);item.screenshot=`${out}/${name}.png`;item.capture=await saveDesktopFrame(page,item.screenshot,{settle:!name.startsWith('required'),finishGPU:!name.startsWith('required')});item.status='passed';
  }catch(error){item.status='failed';item.failure=error.stack;item.failureScreenshot=`${out}/${name}-failure.png`;await saveDesktopFrame(page,item.failureScreenshot).catch(captureError=>{item.failureCaptureError=captureError.message;});throw error;
  }finally{await context.close();}
 }
 // A real Space activation must reload, recover resources and leave flight
 // keys usable. The observer records input only; it never writes app state.
 {
  const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage();
  const item={name:'required-character-keyboard-retry',interceptions:0,errors:[],inputs:[]};report.cases.push(item);
  try{
   page.on('pageerror',error=>item.errors.push(error.message));
   await page.exposeBinding('__faultInput',(_,input)=>item.inputs.push(input));
   await page.addInitScript(()=>{for(const type of ['click','keydown','keyup'])addEventListener(type,event=>{void window.__faultInput({type,code:event.code,target:event.target.id,trusted:event.isTrusted,timeOrigin:performance.timeOrigin,time:performance.now()}).catch(()=>{});},true);});
   const pattern='**/assets/character/astronaut.glb';await page.route(pattern,route=>{item.interceptions++;return route.abort();});
   await page.goto(url);assert.deepEqual(await runtimeBuildIdentity(page),report.build);
   await page.waitForFunction(()=>document.getElementById('loading').dataset.state==='error',null,{timeout:120000});
   item.errorView=await errorView(page);checkErrorView(item.errorView);assert.equal(item.interceptions,1);
   item.failureScreenshot=`${out}/${item.name}-before.png`;await saveDesktopFrame(page,item.failureScreenshot);
   await page.unroute(pattern);
   await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:120000}),page.keyboard.press('Space')]);
   await page.waitForFunction(()=>window.starhaven?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden',timeout:120000});
   assert.deepEqual(await runtimeBuildIdentity(page),report.build);
   item.reloaded=await page.evaluate(()=>({player:starhaven.player,keys:starhaven.keys,retryHidden:document.getElementById('loading-retry').hidden}));
   assert.deepEqual(item.reloaded.keys,[]);assert.equal(item.reloaded.retryHidden,true);
   await page.keyboard.down('w');try{await page.waitForFunction(()=>Math.hypot(...starhaven.velocity)>1,null,{timeout:120000});}finally{await page.keyboard.up('w');}
   await page.keyboard.down('x');try{await page.waitForFunction(()=>Math.hypot(...starhaven.velocity)===0,null,{timeout:120000});}finally{await page.keyboard.up('x');}
   item.after=await page.evaluate(()=>({state:starhaven.state,player:starhaven.player,keys:starhaven.keys,velocity:starhaven.velocity}));
   assert.equal(item.after.state,'SPACE');assert(Math.hypot(...item.after.player.map((v,i)=>v-item.reloaded.player[i]))>.05);assert.deepEqual(item.after.keys,[]);
   assert(item.inputs.some(input=>input.type==='click'&&input.target==='loading-retry'&&input.trusted));assert(item.inputs.some(input=>input.code==='Space'&&input.trusted));assert(item.inputs.every(input=>input.trusted));assert.deepEqual(item.errors,[]);
   item.screenshot=`${out}/${item.name}-recovered.png`;item.capture=await saveDesktopFrame(page,item.screenshot,{settle:true,finishGPU:true});item.status='passed';
  }catch(error){item.status='failed';item.failure=error.stack;await saveDesktopFrame(page,`${out}/${item.name}-failure.png`).catch(()=>{});throw error;}
  finally{await page.keyboard.up('w').catch(()=>{});await page.keyboard.up('x').catch(()=>{});await context.close();}
 }
 const asset='/assets/room/props/star-ceramic.png',local=await readFile('public'+asset),response=await fetch(new URL(asset,url)),http=Buffer.from(await response.arrayBuffer());assert.ok(response.ok);assert.deepEqual(local,http);report.starOrnament={asset,bytes:local.length,sha256:createHash('sha256').update(local).digest('hex'),httpMatches:true};
 report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();report.browserClosed=true;report.finished=new Date().toISOString();await writeFile(process.env.GOAL_FAULT_REPORT||'tests/v13-rc61-resource-failures.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
