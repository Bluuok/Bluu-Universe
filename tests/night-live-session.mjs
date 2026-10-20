// Local interactive verification harness. Browser actions are real trusted
// keyboard/pointer input; page evaluation reads diagnostics only.
import { chromium } from './browser-runtime.mjs';
import { createServer } from 'node:http';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root=path.resolve('.'), out=path.resolve(process.env.LIVE_SHOTS||'screenshots/live-review'), reportFile=process.env.LIVE_REPORT||'tests/live-review.json';
const liveURL=process.env.LIVE_URL||'http://127.0.0.1:4175/',bridgePort=Number(process.env.LIVE_PORT||4183);
async function developmentIdentity(folder='src'){
 const entries=await readdir(folder,{withFileTypes:true}),hashes={};
 for(const entry of entries){const file=path.join(folder,entry.name);if(entry.isDirectory())Object.assign(hashes,await developmentIdentity(file));else hashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');}
 return hashes;
}
await mkdir(out,{recursive:true});
const headed=process.env.LIVE_HEADED==='1';
const browser=await chromium.launch({headless:!headed,executablePath:headed?'C:/Program Files/Google/Chrome/Application/chrome.exe':'C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--use-angle=d3d11','--enable-gpu','--disable-software-rasterizer','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1,
 recordVideo:process.env.LIVE_VIDEO?{dir:path.resolve(process.env.LIVE_VIDEO),size:{width:1440,height:960}}:undefined});
let page=await context.newPage();
const cdp=await context.newCDPSession(page);
let report={startedAt:new Date().toISOString(),method:(headed?'Installed headed Google Chrome':'Local Chromium headless shell')+', trusted keyboard/mouse only; evaluate is read-only product telemetry plus passive input logs.',launchLimitation:headed?'Isolated local Chrome profile; OS focus-loss and physical mobile remain separate tests.':'Headless shell; not an OS focus-loss or visible-browser test.',video:process.env.LIVE_VIDEO?await page.video().path():null,actions:[],errors:[]};
if(process.env.LIVE_APPEND==='1'){
 const previous=JSON.parse(await readFile(reportFile,'utf8')),html=await readFile('dist/index.html','utf8'),bundle=html.match(/\/assets\/(index-[^" ]+\.js)/)?.[1];
 if(previous.actions.some(a=>a.build!==bundle))throw new Error('Cannot append evidence from different builds');
 report={...previous,finishedAt:undefined,sessions:[...(previous.sessions||[{startedAt:previous.startedAt,finishedAt:previous.finishedAt}]),{startedAt:report.startedAt}]};
}
await context.addInitScript(()=>{window.__liveInputs=[];for(const type of ['keydown','keyup','pointerdown','pointerup','pointermove','click','blur','focus'])window.addEventListener(type,e=>{window.__liveInputs.push({type,trusted:e.isTrusted,code:e.code,x:e.clientX,y:e.clientY,time:performance.now()});},true);});
function watch(p){p.on('console',m=>{if(m.type()==='error')report.errors.push({kind:'console',message:m.text(),at:new Date().toISOString()});});p.on('pageerror',e=>report.errors.push({kind:'page',message:e.message}));p.on('requestfailed',r=>report.errors.push({kind:'request',url:r.url(),message:r.failure()?.errorText}));}
watch(page);
async function observation(){return page.evaluate(()=>{const a=window.starhaven,c=document.getElementById('world'),gl=c.getContext('webgl2')||c.getContext('webgl'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return {ready:a?.ready,state:a?.state,player:a?.player,velocity:a?.velocity,keys:a?.keys,camera:a?.camera,cameraProgress:a?.cameraProgress,framing:a?.framing,flight:a?.flight,pointerLocked:document.pointerLockElement===c,character:a?.ready?a.inspect.characterBounds():null,room:a?.inspect?.roomEntities(),collision:a?.inspect?.collision(),rendering:a?.rendering,content:a?.projectContent,vortex:a?.vortex,sky:a?.sky,build:[...document.scripts].map(s=>s.src).find(s=>s.includes('/assets/index-')),inputs:window.__liveInputs,project:a?.currentProject,body:document.body.innerText,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null};});}
async function save(){await writeFile(reportFile,JSON.stringify(report,null,2)+'\n');}
await page.goto(liveURL,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.starhaven?.ready,{timeout:120000});await page.waitForTimeout(1500);
const server=createServer(async(req,res)=>{try{let body='';for await(const chunk of req)body+=chunk;const a=body?JSON.parse(body):{type:'observe'},before=await observation();let during=null;
 switch(a.type){
 case 'keys': for(const k of a.keys)await page.keyboard.down(k);await page.waitForTimeout(Math.min(a.ms||500,8000));for(const k of a.keys)await page.keyboard.up(k);await page.waitForTimeout(a.settle??950);break;
 case 'contact': {
  for(const key of a.keys)await page.keyboard.down(key);
  try{const hit=await page.waitForFunction(group=>{const a=window.starhaven,last=a.inspect.collision().lastSolve;if(last?.contacts.some(c=>c.collider===group))return {player:a.player,velocity:a.velocity,collision:{lastSolve:last},framing:a.framing};return false;},a.collider,{timeout:a.ms||6000});during=await hit.jsonValue();}
  finally{for(const key of a.keys)await page.keyboard.up(key);}
  await page.waitForTimeout(a.settle??1300);break;
 }
 case 'fly': {
  if(a.x!==undefined)await page.mouse.move(a.x,a.y,{steps:a.steps||1});
  for(const k of a.keys||[])await page.keyboard.down(k);
  await page.waitForTimeout(Math.min(a.ms||500,8000));
  during=await observation();
  for(const k of a.keys||[])await page.keyboard.up(k);
  await page.waitForTimeout(a.settle??0);break;
 }
 case 'drag': await page.mouse.move(a.x??950,a.y??480);await page.mouse.down({button:a.button||'left'});await page.mouse.move((a.x??950)+a.dx,(a.y??480)+a.dy,{steps:a.steps||12});await page.mouse.up({button:a.button||'left'});await page.waitForTimeout(a.settle??1600);break;
 case 'mousemove': await page.mouse.move(a.x,a.y,{steps:a.steps||12});await page.waitForTimeout(a.settle??1300);break;
 case 'click': if(a.selector)await page.locator(a.selector).click();else await page.mouse.click(a.x,a.y);await page.waitForTimeout(a.settle??1800);break;
 case 'reload': await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.starhaven?.ready);await page.waitForTimeout(1800);break;
 case 'resize': await page.setViewportSize({width:a.width,height:a.height});await page.waitForTimeout(1800);break;
 case 'wait': await page.waitForTimeout(Math.min(a.ms||1000,8000));break;
 case 'focus': {for(const k of a.keys||['w'])await page.keyboard.down(k);await page.waitForTimeout(450);const other=await context.newPage();await other.goto('about:blank');await other.bringToFront();await page.waitForTimeout(700);for(const k of a.keys||['w'])await page.keyboard.up(k);await other.close();await page.bringToFront();await page.waitForTimeout(1200);break;}
 case 'close': report.finishedAt=new Date().toISOString();if(report.sessions)report.sessions.at(-1).finishedAt=report.finishedAt;await save();await context.close();await browser.close();res.end(JSON.stringify({closed:true,video:report.video}));server.close();return;
 case 'observe': break;
 default: throw new Error('Unknown input action');
 }
 const after=await observation();const name=a.name||`step-${report.actions.length+1}`;const screenshot=path.join(out,name+'.png');const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});await writeFile(screenshot,Buffer.from(shot.data,'base64'));
 const bundle=after.build?new URL(after.build).pathname.split('/').at(-1):'vite-development';
 const development=bundle==='vite-development',sha=development?null:createHash('sha256').update(await readFile(path.join(process.env.LIVE_DIST||'dist','assets',bundle))).digest('hex');
 const sourceHashes=development?await developmentIdentity():undefined;
 report.actions.push({name,action:a,at:new Date().toISOString(),before,during,after,screenshot,build:bundle,sha256:sha,sourceHashes,url:liveURL,evidenceScope:development?'unfrozen development exploration':'production build'});await save();
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify({name,screenshot,build:bundle,sha256:sha,state:after.state,player:after.player,velocity:after.velocity,camera:after.camera,project:after.project,flight:after.flight,vortex:after.vortex,pointerLocked:after.pointerLocked,navigationMode:after.framing?.navigationMode,gpu:after.gpu,body:after.body,errors:report.errors,contact:during?.collision?.lastSolve?.contacts||after.collision?.lastSolve?.contacts,contactPlayer:during?.player,avoidance:after.framing?.avoidance}));
 }catch(e){res.statusCode=500;res.end(JSON.stringify({error:e.message}));}});
server.listen(bridgePort,'127.0.0.1',()=>console.log('Live browser input bridge: http://127.0.0.1:'+bridgePort+'; evidence '+reportFile));
