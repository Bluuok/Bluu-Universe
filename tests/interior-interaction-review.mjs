import {chromium} from './browser-runtime.mjs';
import {flyIntoRoom} from './room-flight-route.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const phase=process.env.INTERIOR_PHASE||'current',out=`screenshots/v20-interior-${phase}`;await mkdir(out,{recursive:true});
const report={phase,method:'Normal spawn, actual keyboard flight into shared room; trusted mouse/keyboard project interactions. Read-only diagnostics; no coordinate/state/camera writes.',steps:[],errors:[],requests:[]};
const browser=await chromium.launch({headless:false,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling','--disable-renderer-backgrounding']}),context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:out,size:{width:1440,height:960}}}),page=await context.newPage();
await page.addInitScript(()=>{window.__interiorInputs=[];for(const type of ['keydown','keyup','pointerdown','pointermove','pointerup','click'])document.addEventListener(type,e=>__interiorInputs.push({type,trusted:e.isTrusted}),true);});
page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.requests.push(r.url()));
const read=()=>page.evaluate(()=>({state:starhaven.state,book:starhaven.book,camera:starhaven.cameraProgress,keys:starhaven.keys,focus:document.activeElement?.id||document.activeElement?.dataset.exhibit,tooltipVisible:!document.querySelector('#hotspot-label').hidden,panelTransform:getComputedStyle(document.querySelector('#project-panel')).transform,panelOpacity:getComputedStyle(document.querySelector('#project-panel')).opacity}));
async function shot(name){const file=`${out}/${name}.png`;await page.screenshot({path:file});report.steps.push({name,file,...await read()});console.log(name);}
const settled=()=>page.waitForFunction(()=>starhaven.state==='ROOM'&&!starhaven.cameraProgress.transition);
try{
 await page.goto('http://127.0.0.1:4259/');await page.waitForFunction(()=>window.starhaven?.ready);await page.locator('#loading').waitFor({state:'hidden'});
 const bundle=await page.locator('script[src*="/assets/index-"]').getAttribute('src');report.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(new URL(bundle,page.url()))).arrayBuffer())).digest('hex')};
 await flyIntoRoom(page);await settled();await shot('00-room');
 await page.locator('[data-exhibit="threadcove"]').hover();await page.waitForTimeout(200);await shot('01-hover');
 // Native pointer activation, then immediate chapter change during opening.
 await page.locator('[data-exhibit="threadcove"]').click();await page.waitForTimeout(65);await page.keyboard.press('ArrowRight');report.openingInterrupt=await read();await shot('02-open-interrupted');
 await page.waitForFunction(()=>starhaven.book.status==='open');await shot('03-details');
 await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>starhaven.book.status==='open'&&starhaven.book.page===2);await shot('04-links');
 await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>starhaven.book.status==='open'&&starhaven.book.page===1);await shot('05-rapid-pages');
 await page.keyboard.press('Escape');await settled();report.focusReturn=await read();await shot('06-return');
 await page.locator('[data-exhibit="clawtide"]').click();await page.waitForTimeout(70);await page.keyboard.press('Escape');await settled();await shot('07-fast-close');
 await page.locator('#project-toggle').click();await page.mouse.click(25,500);assert.equal(await page.locator('#project-toggle').getAttribute('aria-expanded'),'false');await page.locator('#project-toggle').click();await page.locator('.catalog-item').filter({hasText:'ThreadCove'}).click();await page.waitForFunction(()=>starhaven.book.status==='open');await page.keyboard.press('Escape');await settled();report.catalogFocusReturn=await read();
 // Reduced motion uses the same behavior; animations must not remain pending.
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-exhibit="contributions"]').click();await page.waitForFunction(()=>starhaven.book.status==='open');await page.locator('[data-book-page="2"]').click();await page.waitForFunction(()=>starhaven.book.status==='open'&&starhaven.book.page===2);await shot('08-reduced-links');
 await page.setViewportSize({width:1024,height:768});await page.waitForTimeout(450);await shot('09-resize');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(450);await shot('10-narrow-regression');assert.ok(await page.locator('#project-close').isVisible());
 await page.keyboard.press('Escape');await settled();await page.locator('#exit').click();await page.waitForFunction(()=>starhaven.state==='SPACE'&&!starhaven.cameraProgress.transition);await shot('11-exit');
 if(phase!=='before'){assert.equal(report.openingInterrupt.book.page,1);assert.equal(report.openingInterrupt.book.animations,2,'Opening continues while a separate page animation starts');}
 report.inputs=await page.evaluate(()=>({total:__interiorInputs.length,untrusted:__interiorInputs.filter(e=>!e.trusted).length}));assert.equal(report.inputs.untrusted,0);assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);assert.equal(report.focusReturn.focus,'threadcove');assert.equal(report.catalogFocusReturn.focus,'project-toggle');report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await context.close();await browser.close();report.browserClosed=true;await writeFile(`tests/v20-interior-${phase}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,build:report.build,inputs:report.inputs,failure:report.failure}));}
