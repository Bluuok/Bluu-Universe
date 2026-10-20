import {chromium} from './browser-runtime.mjs';
import {flyIntoRoom} from './room-flight-route.mjs';
import {runtimeBuildIdentity} from './runtime-build-identity.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const phase=process.env.BOOK_SCROLL_PHASE||'after',out=process.env.BOOK_SCROLL_OUT||`screenshots/v37-book-scroll-${phase}`;
await mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),method:'Normal spawn, actual keyboard/RMB entry and real wheel/page controls at 900x650 and 1440x960 desktop. Read-only scroll/frame observations; no scrollTop, pose, state or animation writes.',phase,turns:[],errors:[],requests:[],navigations:[],stages:[]};
const browser=await chromium.launch({headless:false,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const context=await browser.newContext({viewport:{width:900,height:650},recordVideo:{dir:out,size:{width:900,height:650}}}),page=await context.newPage();
const cdp=await context.newCDPSession(page);
await page.addInitScript(()=>{window.__bookScrollInputs=[];for(const type of ['keydown','keyup','pointermove','pointerdown','pointerup','click','wheel'])window.addEventListener(type,e=>__bookScrollInputs.push({type,trusted:e.isTrusted}),true);});
page.on('pageerror',e=>report.errors.push(e.stack||e.message));page.on('requestfailed',r=>report.requests.push(r.url()));page.on('framenavigated',frame=>{if(frame===page.mainFrame())report.navigations.push({url:frame.url(),at:new Date().toISOString()});});
const open=()=>page.waitForFunction(()=>starhaven.book.status==='open'&&!starhaven.cameraProgress.transition);
const state=()=>page.evaluate(()=>({state:starhaven.state,book:starhaven.book,keys:starhaven.keys,active:document.activeElement?.id||document.activeElement?.dataset.bookPage}));
const viewport=el=>({top:el.scrollTop,left:el.scrollLeft,height:el.clientHeight,scrollHeight:el.scrollHeight,width:el.clientWidth,typography:[...el.querySelectorAll('h2,h3,p,a')].map(node=>{const s=getComputedStyle(node);return {text:node.textContent,font:s.fontFamily,size:s.fontSize,line:s.lineHeight,weight:s.fontWeight,color:s.color,display:s.display,margin:s.margin,padding:s.padding,decoration:s.textDecorationLine,spacing:s.letterSpacing,border:s.borderWidth,borderStyle:s.borderStyle,radius:s.borderRadius};})});
async function wheel(selector,mustScroll){
 const element=page.locator(selector),initial=await element.evaluate(viewport);
 if(mustScroll||initial.scrollHeight-initial.height>25){await element.hover();await page.mouse.wheel(0,540);await page.waitForFunction(selector=>document.querySelector(selector).scrollTop>25,selector);await page.waitForTimeout(120);}
 return element.evaluate(viewport);
}
async function turn(direction,mustScroll=true){
 const selector=direction==='next'?'.book-right':'.book-left',before=await wheel('.book-spread>'+selector,mustScroll),index=report.turns.length;
 const screenshot=`${out}/${index}-${direction}-before.png`;await page.screenshot({path:screenshot});
 await page.locator(direction==='next'?'#book-next':'#book-prev').click();
 await page.waitForFunction(()=>!document.querySelector('.book-turn').hidden&&document.querySelector('.book-turn').firstElementChild);
 const during=await page.locator('.book-turn>.book-page').evaluate(viewport);
 const sheet=await page.locator('.book-turn').evaluate(el=>({opacity:Number(getComputedStyle(el).opacity),hidden:el.hidden,chapter:el.dataset.page,duplicateIds:el.querySelectorAll('[id]').length,inert:el.inert}));assert.equal(sheet.opacity,1);assert.equal(sheet.hidden,false);assert.equal(sheet.duplicateIds,0);assert.equal(sheet.inert,true);
 const item={direction,viewport:page.viewportSize(),before,during,sheet,screenshot,duringScreenshot:`${out}/${index}-${direction}-during.png`};report.turns.push(item);const captureBefore=await state(),frame=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});await writeFile(item.duringScreenshot,Buffer.from(frame.data,'base64'));item.capture={before:captureBefore,after:await state()};
 assert(Math.abs(during.top-before.top)<=1,`Turning ${direction} discarded visible scroll: ${before.top} -> ${during.top}`);assert.equal(during.left,before.left);
 assert.equal(during.width,before.width);assert.equal(during.height,before.height);assert.equal(during.scrollHeight,before.scrollHeight);assert.deepEqual(during.typography,before.typography);
 await open();const fresh=await page.locator('.book-spread>.book-page').evaluateAll(elements=>elements.map(el=>el.scrollTop));assert.deepEqual(fresh,[0,0]);item.status='passed';
}
try{
 await page.goto(process.env.BOOK_SCROLL_URL||'http://127.0.0.1:4259/');await page.waitForFunction(()=>window.starhaven?.ready);await page.locator('#loading').waitFor({state:'hidden'});report.build=await runtimeBuildIdentity(page);
 await flyIntoRoom(page);report.roomBefore=await page.evaluate(()=>starhaven.inspect.roomEntities());
 await page.locator('[data-exhibit="threadcove"]').click();await open();
 await page.locator('[data-book-page="1"]').click();await open();
 await turn('next');await turn('previous');
 await page.setViewportSize({width:1440,height:960});await page.waitForTimeout(450);await turn('next',false);await turn('previous',false);
 await page.locator('[data-book-page="1"]').click();for(const key of ['ArrowRight','ArrowLeft','ArrowRight','ArrowLeft'])await page.keyboard.press(key);await open();assert.equal((await state()).book.page,1);assert.equal((await state()).book.animations,0);report.repeatedReversal=await state();
 await page.locator('#project-back').click();await page.waitForFunction(()=>starhaven.state==='ROOM'&&!starhaven.cameraProgress.transition);report.roomAfter=await page.evaluate(()=>starhaven.inspect.roomEntities());assert.equal(report.roomAfter.groupUUID,report.roomBefore.groupUUID);
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-exhibit="clawtide"]').click();await open();await page.locator('[data-book-page="1"]').click();await open();assert.equal((await state()).book.animations,0);report.reducedMotion=await state();report.stages.push({name:'before-escape',url:page.url(),state:await state()});await page.keyboard.press('Escape');await page.waitForFunction(()=>starhaven.state==='ROOM'&&!starhaven.cameraProgress.transition);report.stages.push({name:'after-escape',url:page.url(),state:await state()});await page.locator('#exit').click();report.stages.push({name:'exit-clicked',url:page.url(),hasRuntime:await page.evaluate(()=>Boolean(window.starhaven))});await page.waitForFunction(()=>window.starhaven?.state==='SPACE'&&!starhaven.cameraProgress.transition);report.stages.push({name:'exited',url:page.url(),state:await state()});
 report.status='passed';assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);
}catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;}
finally{report.inputs=await page.evaluate(()=>({trusted:__bookScrollInputs.filter(e=>e.trusted).length,untrusted:__bookScrollInputs.filter(e=>!e.trusted).length,wheel:__bookScrollInputs.filter(e=>e.type==='wheel'&&e.trusted).length})).catch(()=>null);if(report.inputs?.untrusted){report.status='failed';report.failure='Untrusted input observed';process.exitCode=1;}await context.close();await browser.close();report.browserClosed=true;await writeFile(process.env.BOOK_SCROLL_REPORT||`tests/v37-book-scroll-${phase}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,turns:report.turns.map(t=>({direction:t.direction,before:t.before.top,during:t.during.top,status:t.status})),inputs:report.inputs,failure:report.failure}));}
