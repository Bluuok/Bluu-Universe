// Historical pre-v0.2 baseline suite. The current npm entry runs v02-edge-review.mjs; old artificial starts/long-distance entry assumptions are not final-version evidence.
import { chromium } from './browser-runtime.mjs';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import assert from 'node:assert/strict';

let browser; const launchFailures=[]; for(const executablePath of ['C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe','C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1187/chrome-win/headless_shell.exe','C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium-1187/chrome-win/chrome.exe']) {try { browser=await chromium.launch({headless:true,executablePath,args:['--enable-unsafe-swiftshader']}); console.log('LAUNCH '+executablePath); break; } catch(e) { launchFailures.push({executablePath,error:e.message}); console.log('LAUNCH FAILED '+executablePath); }} if(!browser) { await writeFile('tests/results.json',JSON.stringify({fatalError:'All independent Playwright launch paths failed',launchFailures},null,2)); process.exit(1); }
const context = await browser.newContext({viewport:{width:960,height:640}, deviceScaleFactor:1});
const page = await context.newPage();
page.setDefaultTimeout(30000);
const results = {url:process.env.STARHAVEN_URL||'http://127.0.0.1:4175',startedAt:new Date().toISOString(),tests:[],consoleErrors:[],pageErrors:[],requestFailures:[],links:[],assetResponses:[],observations:{}};
let evidencePage=page;
await page.addInitScript(()=>{window.__testRuntime={keyups:[]};window.addEventListener('keyup',e=>{const a=window.starhaven;if(a)window.__testRuntime.keyups.push({code:e.code,trusted:e.isTrusted,snapshot:{state:a.state,player:a.player,velocity:a.velocity,keys:a.keys,camera:a.camera,currentProject:a.currentProject}});});});
if(process.env.STARHAVEN_TEST_FILTER){const previous=JSON.parse(await readFile('tests/results.json','utf8'));Object.assign(results,previous);results.url=process.env.STARHAVEN_URL||'http://127.0.0.1:4175';delete results.fatalError;results.supplementStartedAt=new Date().toISOString();}
page.on('console',m=>{if(m.type()==='error')results.consoleErrors.push(m.text());});
page.on('pageerror',e=>results.pageErrors.push(e.message));
page.on('response',r=>{if(r.url().includes('/assets/'))results.assetResponses.push({url:r.url(),status:r.status(),contentType:r.headers()['content-type']});});
page.on('requestfailed',r=>results.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
let savedFailure=false;
const snapshot=async()=>page.evaluate(()=>({state:window.starhaven.state,player:window.starhaven.player,velocity:window.starhaven.velocity,keys:window.starhaven.keys,camera:window.starhaven.camera,currentProject:window.starhaven.currentProject}));
const norm=v=>Math.hypot(...v);
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
async function test(name,fn){if(process.env.STARHAVEN_TEST_FILTER&&!new RegExp(process.env.STARHAVEN_TEST_FILTER).test(name))return;results.tests=results.tests.filter(t=>t.name!==name);const start=Date.now();try{const evidence=await fn();results.tests.push({name,status:'passed',durationMs:Date.now()-start,evidence});console.log('PASS '+name);}catch(e){results.tests.push({name,status:'failed',durationMs:Date.now()-start,error:e.message,stack:e.stack});console.log('FAIL '+name+': '+e.message);await evidencePage.screenshot({path:'tests/failure.png'}).catch(()=>{});savedFailure=true;}await writeResults();}
async function writeResults(){await writeFile('tests/results.json',JSON.stringify(results,null,2)+'\n','utf8');}
async function clearFocus(){await page.evaluate(()=>document.activeElement?.blur());}
async function waitState(state){await page.waitForFunction(state=>window.starhaven?.state===state,state,{timeout:30000});}
async function exitWithTransitionKey(){
  await clearFocus();const box=await page.locator('#exit').boundingBox();
  const cdp=await context.newCDPSession(page);
  await page.evaluate(()=>window.__testRuntime.keydowns=[]);
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:box.x+box.width/2,y:box.y+box.height/2,button:'left',clickCount:1});
  await Promise.all([
    cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:box.x+box.width/2,y:box.y+box.height/2,button:'left',clickCount:1}),
    cdp.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyA',key:'a',windowsVirtualKeyCode:65,nativeVirtualKeyCode:65})
  ]);
  await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyA',key:'a',windowsVirtualKeyCode:65,nativeVirtualKeyCode:65});
  const observed=await page.evaluate(()=>window.__testRuntime.keydowns.filter(e=>e.code==='KeyA').at(-1));
  await cdp.detach();assert.ok(observed?.trusted,'input was not a trusted browser event');
  assert.equal(observed.state,'TRANSITION','keydown fell outside transition: '+JSON.stringify(observed));
  assert.deepEqual(observed.keys,[],'input accepted while actually in TRANSITION');
  await waitState('SPACE');return observed;
}
async function reset(){await page.locator('#reset-view').click();await clearFocus();await page.waitForTimeout(120);}
async function tapKey(code,ms=450){await clearFocus();const before=await snapshot();await page.keyboard.down(code);await page.waitForFunction(()=>Math.hypot(...window.starhaven.velocity)>1.6,null,{timeout:20000});const pressed=await snapshot();await page.keyboard.up(code);const released=await page.evaluate(()=>window.__testRuntime.keyups.at(-1).snapshot);await page.waitForFunction(()=>Math.hypot(...window.starhaven.velocity)<.02,null,{timeout:20000});const stopped=await snapshot();return {before,pressed,released,stopped};}

await mkdir('tests',{recursive:true});
try{
  await page.goto(results.url,{waitUntil:'networkidle',timeout:45000});
  await page.waitForFunction(()=>window.starhaven?.ready,null,{timeout:90000});
  await page.locator('#loading').waitFor({state:'hidden',timeout:12000});
  await page.evaluate(()=>{window.__testRuntime.keydowns=[];window.addEventListener('keydown',e=>{const a=window.starhaven;window.__testRuntime.keydowns.push({code:e.code,trusted:e.isTrusted,state:a.state,keys:a.keys,velocity:a.velocity});});});
  results.observations.initial=await snapshot();
  results.observations.provisionalCharacter=await page.evaluate(()=>window.starhaven.provisionalCharacter);
  await test('ready; no runtime exceptions',async()=>{assert.equal(results.pageErrors.length,0,results.pageErrors.join('\n'));assert.equal((await snapshot()).state,'SPACE');return results.observations.initial;});
  await test('software rendering RAF timing',async()=>{const times=await page.evaluate(()=>new Promise(resolve=>{const frames=[];function tick(t){frames.push(t);if(frames.length===11)resolve(frames);else requestAnimationFrame(tick)}requestAnimationFrame(tick)}));const deltas=times.slice(1).map((t,i)=>t-times[i]);const elapsed=times.at(-1)-times[0];results.observations.rafTiming={frames:10,elapsedMs:elapsed,averageFps:10000/elapsed,deltas};return results.observations.rafTiming;});
  await test('Chinese DOM has no replacement characters',async()=>{const evidence=await page.evaluate(()=>({title:document.title,body:document.body.innerText,replacementCount:(document.body.innerText.match(/\uFFFD/g)||[]).length}));results.observations.text=evidence;assert.equal(evidence.replacementCount,0,'DOM contains '+evidence.replacementCount+' replacement characters');return evidence;});
  await test('default muted; sound enabled only by explicit user click',async()=>{assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');return {defaultMuted:true,toggleWorks:true};});
  await test('keyboard remains active after header button click',async()=>{await reset();await page.locator('#sound').click();const before=await snapshot();await page.keyboard.down('w');try{await page.waitForFunction(()=>window.starhaven.keys.includes('KeyW')&&Math.hypot(...window.starhaven.velocity)>1,null,{timeout:20000});}finally{await page.keyboard.up('w');}await page.waitForFunction(()=>Math.hypot(...window.starhaven.velocity)<.02,null,{timeout:20000});await page.locator('#sound').click();return {before,after:await snapshot()};});
  for(const [key,axis,sign] of [['w',2,-1],['a',0,-1],['s',2,1],['d',0,1],['Space',1,1],['Shift',1,-1]]){
    await test('real keyboard '+key+' accelerates and releases to stop',async()=>{await reset();const ev=await tapKey(key);const delta=ev.pressed.player[axis]-ev.before.player[axis];results.observations['motion_'+key]=ev;assert.ok(delta*sign>.015,'expected movement sign; delta='+delta);assert.ok(norm(ev.released.velocity)>0.01,'no velocity at key release');assert.ok(norm(ev.stopped.velocity)<.08,'did not settle: '+norm(ev.stopped.velocity));assert.ok(distance(ev.stopped.player,ev.released.player)>.015,'no inertial travel after release');return {axis,delta,speedAtRelease:norm(ev.released.velocity),speedAfterPause:norm(ev.stopped.velocity),inertialTravel:distance(ev.stopped.player,ev.released.player)};});
  }
  await test('soft limits constrain horizontal and vertical movement',async()=>{await reset();await page.keyboard.down('d');await page.keyboard.down('Space');await page.waitForFunction(()=>window.starhaven.player[0]>10.12&&window.starhaven.player[1]>7.12,null,{timeout:180000});const atEdge=await snapshot();await page.keyboard.up('d');await page.keyboard.up('Space');await page.waitForFunction(()=>Math.hypot(...window.starhaven.velocity)<.02,null,{timeout:20000});const stopped=await snapshot();const bounds=await page.evaluate(()=>window.starhaven.manifest.space.bounds);assert.ok(atEdge.player[0]>bounds.max[0]-.9,'did not reach x edge: '+atEdge.player[0]);assert.ok(atEdge.player[1]>bounds.max[1]-.9,'did not reach y edge: '+atEdge.player[1]);for(let i=0;i<3;i++){assert.ok(stopped.player[i]>=bounds.min[i]-1e-5&&stopped.player[i]<=bounds.max[i]+1e-5,'escaped bounds axis '+i);}assert.ok(norm(stopped.velocity)<.08);return {bounds,atEdge,stopped};});
  await test('window blur clears held keys and velocity',async()=>{await reset();await page.keyboard.down('w');await page.waitForFunction(()=>Math.hypot(...window.starhaven.velocity)>1,null,{timeout:20000});assert.ok((await snapshot()).keys.includes('KeyW'));await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const ev=await snapshot();await page.keyboard.up('w');assert.deepEqual(ev.keys,[]);assert.equal(norm(ev.velocity),0);return ev;});
  await test('drag gesture orbits without selecting an exhibit',async()=>{await reset();const before=await snapshot();await page.mouse.move(650,300);await page.mouse.down();await page.mouse.move(820,350,{steps:15});await page.mouse.up();await page.waitForTimeout(350);const after=await snapshot();assert.equal(after.state,'SPACE');assert.equal(after.currentProject,null);assert.ok(distance(before.camera,after.camera)>.15,'camera did not orbit');return {before:before.camera,after:after.camera};});
  await test('always available catalogue opens a real project from space',async()=>{await page.locator('#project-toggle').click();await page.locator('#catalog').waitFor({state:'visible'});await page.locator('#catalog-items button').filter({hasText:'ThreadCove'}).click();await waitState('PROJECT');assert.equal(await page.locator('#project-title').innerText(),'ThreadCove');assert.equal(await page.locator('#project-panel').isVisible(),true);await page.locator('#project-close').click();await waitState('SPACE');return {directEntry:true};});
  for(let cycle=1;cycle<=3;cycle++){
    await test('room/project/return/exit cycle '+cycle,async()=>{await reset();await page.locator('#enter').click();await waitState('DOCKING');await clearFocus();await page.keyboard.down('w');await page.keyboard.down('Space');await page.waitForTimeout(180);const duringDock=await snapshot();assert.deepEqual(duringDock.keys,[],'input accepted while docking');await page.keyboard.up('w');await page.keyboard.up('Space');await waitState('ROOM');await page.locator('#hotspots button').filter({hasText:'ThreadCove'}).waitFor({state:'visible',timeout:12000});const roomBefore=await snapshot();await clearFocus();await page.keyboard.down('w');await page.waitForTimeout(200);await page.keyboard.up('w');assert.deepEqual((await snapshot()).player,roomBefore.player,'room movement changed player');await page.locator('#hotspots button').filter({hasText:'ThreadCove'}).click();await waitState('PROJECT');assert.equal(await page.locator('#project-title').innerText(),'ThreadCove');await page.locator('#project-image').waitFor({state:'visible'});const image=await page.locator('#project-image').evaluate(el=>({src:el.getAttribute('src'),complete:el.complete,width:el.naturalWidth,height:el.naturalHeight}));assert.ok(image.complete&&image.width>=300,'real screenshot not loaded: '+JSON.stringify(image));const detailText=await page.locator('#project-details').innerText();assert.ok(detailText.trim().length>30,'empty project details');const links=await page.locator('#project-links a').evaluateAll(items=>items.map(a=>({href:a.href,target:a.target,rel:a.rel})));assert.ok(links.length>0);assert.ok(links.every(a=>/^https:\/\//.test(a.href)&&a.target==='_blank'&&a.rel.includes('noopener')));await page.locator('#project-back').click();await waitState('ROOM');const transition=await exitWithTransitionKey();return {cycle,duringDock,transition,image,detailLength:detailText.length,links,exit:await snapshot()};});
  }
  await test('both project panels contain loaded screenshots and links',async()=>{const evidence=[];for(const name of ['ThreadCove','Clawtide']){await page.locator('#project-toggle').click();await page.locator('#catalog-items button').filter({hasText:name}).click();await waitState('PROJECT');await page.locator('#project-image').waitFor({state:'visible'});await page.waitForFunction(()=>document.getElementById('project-image').complete);const p=await page.evaluate(()=>({title:document.getElementById('project-title').textContent,summary:document.getElementById('project-summary').textContent,image:{src:document.getElementById('project-image').getAttribute('src'),width:document.getElementById('project-image').naturalWidth},links:[...document.querySelectorAll('#project-links a')].map(a=>a.href)}));assert.ok(p.image.width>=300);assert.ok(p.summary.length>20);assert.ok(p.links.length>0);evidence.push(p);await page.locator('#project-close').click();await waitState('SPACE');}return evidence;});
  await test('all configured project links are valid HTTPS and publicly reachable',async()=>{const urls=await page.evaluate(()=>[...new Set(Object.values(window.starhaven.registry).flatMap(p=>(p.links||[]).map(l=>l.url)))]);for(const url of urls){assert.match(url,/^https:\/\/[^\s]+$/);try{const response=await context.request.get(url,{timeout:20000});results.links.push({url,status:response.status(),ok:response.ok()});}catch(e){results.links.push({url,error:e.message,ok:false});}}const failed=results.links.filter(l=>!l.ok);assert.equal(failed.length,0,JSON.stringify(failed));return results.links;});

  await test('GPU geometry and texture counts remain stable across 3 room cycles',async()=>{
    assert.ok(await page.evaluate(()=>window.starhaven.rendering),'read-only rendering counters unavailable');
    const cycles=[];
    const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    for(let cycle=1;cycle<=3;cycle++){
      await page.locator('#enter').click();await waitState('ROOM');
      await page.locator('#hotspots button').filter({hasText:'ThreadCove'}).waitFor({state:'visible',timeout:30000});
      await frames();const room=await page.evaluate(()=>window.starhaven.rendering);
      await page.locator('#hotspots button').filter({hasText:'ThreadCove'}).click();await waitState('PROJECT');
      await frames();await page.keyboard.press('Escape');await waitState('ROOM');
      await page.locator('#exit').click();await waitState('SPACE');await frames();
      const rendering=await page.evaluate(()=>window.starhaven.rendering);
      cycles.push({cycle,room,rendering,resources:{textures:rendering.textures,geometries:rendering.geometries}});
    }
    assert.ok(cycles.every(c=>c.resources.textures>0&&c.resources.geometries>0));
    assert.deepEqual(cycles[2].resources,cycles[1].resources,'GPU resource counts grew on repeated navigation');
    return cycles;
  });
  await page.close();
  if(!process.env.STARHAVEN_TEST_FILTER||new RegExp(process.env.STARHAVEN_TEST_FILTER).test('mobile')){
  const mobileContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const mobile=await mobileContext.newPage();evidencePage=mobile;mobile.setDefaultTimeout(30000);await mobile.goto(results.url,{waitUntil:'networkidle',timeout:45000});await mobile.waitForFunction(()=>window.starhaven?.ready,null,{timeout:90000});await mobile.locator('#loading').waitFor({state:'hidden'});
  await test('mobile 390x844 has no overflow and persistent catalogue',async()=>{const dims=await mobile.evaluate(()=>({viewport:[innerWidth,innerHeight],scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],body:[document.body.scrollWidth,document.body.scrollHeight]}));assert.ok(dims.scroll[0]<=390&&dims.body[0]<=390,'horizontal overflow '+JSON.stringify(dims));assert.ok(dims.scroll[1]<=844&&dims.body[1]<=844,'vertical overflow '+JSON.stringify(dims));assert.equal(await mobile.locator('#project-toggle').isVisible(),true);await mobile.locator('#project-toggle').tap();await mobile.locator('#catalog-items button').filter({hasText:'Clawtide'}).tap();await mobile.waitForFunction(()=>window.starhaven.state==='PROJECT');assert.equal(await mobile.locator('#project-panel').isVisible(),true);await mobile.locator('#project-back').tap();await mobile.waitForFunction(()=>window.starhaven.state==='SPACE');return dims;});
  await test('mobile movement touch buttons and enter/exit work',async()=>{const button=mobile.locator('[data-move="KeyD"]');const box=await button.boundingBox();const before=await mobile.evaluate(()=>window.starhaven.player);const cdp=await mobileContext.newCDPSession(mobile);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await mobile.waitForFunction(start=>window.starhaven.player[0]>start+.25,before[0],{timeout:20000});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.waitForFunction(()=>Math.hypot(...window.starhaven.velocity)<.02,null,{timeout:20000});const after=await mobile.evaluate(()=>({player:window.starhaven.player,keys:window.starhaven.keys,velocity:window.starhaven.velocity}));assert.ok(after.player[0]>before[0]+.03);assert.deepEqual(after.keys,[]);assert.ok(norm(after.velocity)<.08);await mobile.locator('#enter').tap();await mobile.waitForFunction(()=>window.starhaven.state==='ROOM',null,{timeout:30000});assert.equal(await mobile.locator('#exit').isVisible(),true);assert.equal(await mobile.locator('#project-toggle').isVisible(),true);await mobile.locator('#exit').tap();await mobile.waitForFunction(()=>window.starhaven.state==='SPACE');return {before,after};});
  await mobileContext.close();
  }
}catch(error){results.fatalError={message:error.message,stack:error.stack}; results.observations.fatal=await page.evaluate(()=>({title:document.title,body:document.body.innerText,starhaven:window.starhaven?{state:window.starhaven.state,ready:window.starhaven.ready}:null})).catch(()=>null);console.log('FATAL '+error.message); if(!savedFailure) await evidencePage.screenshot({path:'tests/failure.png'}).catch(()=>{});}
finally{results.finishedAt=new Date().toISOString();results.summary={passed:results.tests.filter(t=>t.status==='passed').length,failed:results.tests.filter(t=>t.status==='failed').length,fatal:!!results.fatalError};await writeResults();if(!results.summary.failed&&!results.summary.fatal)await unlink('tests/failure.png').catch(()=>{});await browser.close();console.log(JSON.stringify(results.summary));process.exitCode=results.summary.failed||results.summary.fatal?1:0;}







