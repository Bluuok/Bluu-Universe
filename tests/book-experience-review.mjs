import assert from 'node:assert/strict';
import {chromium} from './browser-runtime.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {flyIntoRoom} from './room-flight-route.mjs';

const url=process.env.BOOK_URL||'http://127.0.0.1:4216/';
const out=process.env.BOOK_OUT||'E:/temp/starhaven-rc17-book';
await mkdir(out,{recursive:true});
const report={url,started:new Date().toISOString(),method:'Local browser, trusted mouse and keyboard; read-only product observations. No teleport or product state injection.',checks:[],errors:[],shots:[]};
let browser;
try {
  browser=await chromium.launch({headless:false,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling'],timeout:20000});
  report.browser='Installed Google Chrome, headed, isolated temporary profile';
} catch(error) {
  report.headedLimitation=error.message.slice(0,1400);
  browser=await chromium.launch({headless:true,executablePath:'C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--use-angle=d3d11','--enable-gpu','--disable-software-rasterizer']});
  report.browser='Local Chromium headless shell fallback; not an OS focus test';
}
const context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:out,size:{width:1440,height:960}}});
const page=await context.newPage();
page.on('pageerror',error=>report.errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
await page.addInitScript(()=>{window.__bookInputs=[];for(const type of ['keydown','keyup','pointerdown','pointerup','click'])window.addEventListener(type,event=>window.__bookInputs.push({type,code:event.code,trusted:event.isTrusted,at:performance.now()}),true);});
const snap=()=>page.evaluate(()=>({state:starhaven.state,book:starhaven.book,project:starhaven.currentProject,player:starhaven.player,camera:starhaven.camera,cameraProgress:starhaven.cameraProgress,rendering:starhaven.rendering,panelHidden:document.getElementById('project-panel').hidden,covered:document.getElementById('transition').classList.contains('cover')}));
const settled=state=>page.waitForFunction(value=>starhaven.state===value&&!starhaven.cameraProgress.transition&&!document.getElementById('transition').classList.contains('cover'),state);
async function shot(name){const file=path.join(out,name+'.png');await page.screenshot({path:file});report.shots.push({name,file,observation:await snap()});}
async function check(name,fn){await fn();report.checks.push({name,status:'passed',observation:await snap()});}
async function openCatalog(id){await page.locator('#project-toggle').click();await page.locator('.catalog-item').nth(['threadcove','clawtide','contributions','contact'].indexOf(id)).click();}
async function close(){await page.keyboard.press('Escape');await settled('ROOM');}
try {
  await page.goto(url);await page.waitForFunction(()=>window.starhaven?.ready);await page.waitForTimeout(800);
  const bundle=await page.evaluate(()=>[...document.scripts].map(s=>s.src).find(s=>s.includes('/assets/index-')));
  report.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(bundle)).arrayBuffer())).digest('hex')};
  await shot('01-approach');
  await check('Fly into the doorway once without E or an entry button',async()=>{
    await flyIntoRoom(page);await settled('ROOM');assert.equal((await snap()).state,'ROOM');
    assert.equal(await page.evaluate(()=>starhaven.passage.entries),1);
  });
  await shot('02-room');
  await check('Open the retained room exhibit as a book',async()=>{
    await page.locator('[data-exhibit="threadcove"]').click();
    await page.waitForFunction(()=>starhaven.book.status==='open');
    assert.equal((await snap()).book.page,0);
  });
  await shot('03-book-overview');
  await check('Open room book retains visible exhibits through desktop resize',async()=>{
    for(const width of [1000,800,1440]){
      await page.setViewportSize({width,height:960});await page.waitForTimeout(700);
      const composition=await page.evaluate(()=>({panel:document.getElementById('project-panel').getBoundingClientRect().left,exhibits:starhaven.exhibitProjection}));
      for(const exhibit of composition.exhibits)assert.ok(exhibit.screen[0]>0&&exhibit.screen[0]<composition.panel,`${exhibit.id} stays beside the open book at ${width}px`);
      await shot(`book-resize-${width}`);
    }
  });
  await check('Flip exposes all verified detail paragraphs',async()=>{
    await page.locator('#book-next').click();await page.waitForFunction(()=>starhaven.book.status==='open');
    assert.equal((await snap()).book.page,1);
    const count=await page.locator('#project-details p').count();assert.ok(count>=3);
  });
  await shot('04-book-details');
  await check('Terminal-page buttons retain focus and keyboard reversal',async()=>{
    await page.locator('#book-next').click();await page.waitForFunction(()=>starhaven.book.status==='open');
    assert.equal((await snap()).book.page,2);
    assert.equal(await page.evaluate(()=>document.getElementById('project-panel').contains(document.activeElement)),true,'Last-page next button must transfer focus before becoming disabled');
    await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>starhaven.book.status==='open');
    assert.equal((await snap()).book.page,1);
    await page.locator('#book-prev').click();await page.waitForFunction(()=>starhaven.book.status==='open');
    assert.equal((await snap()).book.page,0);
    assert.equal(await page.evaluate(()=>document.getElementById('project-panel').contains(document.activeElement)),true,'First-page previous button must retain focus inside the book');
    await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>starhaven.book.status==='open');
    assert.equal((await snap()).book.page,1);
  });
  await check('Rapid alternating turns end on the latest requested chapter',async()=>{
    for(const chapter of [2,0,1,2,1,0,2])await page.locator(`[data-book-page="${chapter}"]`).click({delay:5});
    await page.waitForFunction(()=>starhaven.book.status==='open');
    assert.equal((await snap()).book.page,2);assert.equal((await snap()).book.animations,0);
    assert.ok(await page.locator('#project-links a:visible').count());
  });
  await shot('05-book-links');
  await check('Close during a page turn and return to the same room overview',async()=>{
    await page.locator('[data-book-page="1"]').click();await page.keyboard.press('Escape');await settled('ROOM');
    assert.equal((await snap()).panelHidden,true);assert.equal((await snap()).book.status,'closed');
  });
  await shot('06-room-return');
  await check('Focused room exhibit survives resize and Enter reopens the same book',async()=>{
    assert.equal(await page.evaluate(()=>document.activeElement?.dataset.exhibit),'threadcove');
    for(const viewport of [{width:1280,height:720},{width:1440,height:960}]){
      await page.setViewportSize(viewport);await page.waitForTimeout(100);
      assert.equal(await page.evaluate(()=>document.activeElement?.dataset.exhibit),'threadcove');
      await settled('ROOM');assert.equal(await page.evaluate(()=>document.activeElement?.dataset.exhibit),'threadcove');
    }
    await page.keyboard.press('Enter');await page.waitForFunction(()=>starhaven.book.status==='open');
    assert.equal((await snap()).project,'threadcove');await close();
  });
  await check('All four retained exhibits repeatedly open and close',async()=>{
    for(const id of ['clawtide','contributions','contact','threadcove']){
      await page.locator(`[data-exhibit="${id}"]`).click();await page.waitForFunction(()=>starhaven.book.status==='open');
      assert.equal((await snap()).project,id);
      await page.locator('[data-book-page="2"]').click();await page.waitForFunction(()=>starhaven.book.status==='open');
      if(id==='contributions'){
        const labels=await page.locator('#project-links a').allTextContents();
        assert.ok(labels.includes('Folio 上游项目 ↗')&&labels.includes('DeerFlow 上游项目 ↗'));
      }
      await close();
      await page.waitForTimeout(50);
      assert.equal(await page.evaluate(()=>document.activeElement?.dataset.exhibit),id,'Return restores the actual exhibit opener');
    }
  });
  await check('Catalog switching during close cannot resurrect the previous project',async()=>{
    await openCatalog('threadcove');await page.keyboard.press('Escape');await openCatalog('clawtide');
    await page.waitForFunction(()=>starhaven.book.status==='open');await page.waitForTimeout(900);
    assert.equal((await snap()).project,'clawtide');assert.equal((await snap()).state,'PROJECT');await close();
  });
  await check('Keyboard chapter navigation and focus containment',async()=>{
    await openCatalog('threadcove');await page.waitForFunction(()=>starhaven.book.status==='open');
    await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>starhaven.book.status==='open');
    assert.equal((await snap()).book.page,1);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(()=>document.getElementById('project-panel').contains(document.activeElement)),true);
    for(let i=0;i<12;i++)await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.getElementById('project-panel').contains(document.activeElement)),true);await close();
  });
  await check('Escape closes only the top catalog and preserves the book chapter',async()=>{
    await page.locator('[data-exhibit="threadcove"]').click();await page.waitForFunction(()=>starhaven.book.status==='open');
    await page.locator('[data-book-page="1"]').click();await page.waitForFunction(()=>starhaven.book.status==='open');
    await page.locator('#project-toggle').click();await page.keyboard.press('Escape');
    assert.equal((await snap()).state,'PROJECT');assert.equal((await snap()).book.page,1);
    assert.equal(await page.locator('#catalog').isHidden(),true);await close();await page.waitForTimeout(50);
    assert.equal(await page.evaluate(()=>document.activeElement?.dataset.exhibit),'threadcove');
  });
  await check('720px desktop details show at least three complete entries at the original font size',async()=>{
    await page.setViewportSize({width:1280,height:720});await settled('ROOM');await openCatalog('contributions');
    await page.waitForFunction(()=>starhaven.book.status==='open');
    await page.locator('[data-book-page="1"]').click();await page.waitForFunction(()=>starhaven.book.status==='open');
    const layout=await page.evaluate(()=>{const right=document.querySelector('.book-right'),bounds=right.getBoundingClientRect(),items=[...document.querySelectorAll('#project-details p')];return{complete:items.filter(p=>{const r=p.getBoundingClientRect();return r.top>=bounds.top&&r.bottom<=bounds.bottom;}).length,fontSize:parseFloat(getComputedStyle(items[0]).fontSize),scrollable:right.scrollHeight>right.clientHeight};});
    assert.ok(layout.complete>=3,JSON.stringify(layout));assert.ok(layout.fontSize>=12);assert.equal(layout.scrollable,true);
    report.shortDesktop=layout;await shot('07-short-desktop-details');await close();
    await page.setViewportSize({width:1440,height:960});await settled('ROOM');
  });
  await check('390px viewport has usable pages and no horizontal overflow',async()=>{
    await page.setViewportSize({width:390,height:844});await settled('ROOM');await openCatalog('contributions');
    await page.waitForFunction(()=>starhaven.book.status==='open');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await shot('07-mobile-book');
    await page.locator('[data-book-page="1"]').click();await page.waitForFunction(()=>starhaven.book.status==='open');
    await shot('08-mobile-details');await close();
    await page.setViewportSize({width:1440,height:960});await settled('ROOM');
  });
  await check('Reduced motion retains navigation and close semantics',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});await openCatalog('contact');
    await page.waitForFunction(()=>starhaven.book.status==='open');await page.keyboard.press('ArrowRight');
    await page.waitForFunction(()=>starhaven.book.status==='open');assert.equal((await snap()).book.page,1);await close();
    await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await check('Return through the same door and resume flight',async()=>{
    const exit=await page.locator('#exit').boundingBox(),x=exit.x+exit.width*.5,y=exit.y+exit.height*.5;
    await page.mouse.click(x,y);await page.waitForTimeout(216);
    assert.equal(await page.locator('#controls').isHidden(),true);
    await page.mouse.click(x,y);await settled('SPACE');
    const landing=(await snap()).player;assert.ok(Math.abs(landing[0]-1.35)<.001&&Math.abs(landing[1]-1.15)<.001&&landing[2]>15,'Double click must finish in the outward departure corridor');assert.equal(await page.evaluate(()=>starhaven.passage.exits),1);
    await page.mouse.move(720,480);await page.keyboard.down('w');await page.waitForTimeout(250);await page.keyboard.up('w');
    await page.keyboard.down('s');await page.waitForTimeout(800);await page.keyboard.up('s');
    assert.equal((await snap()).state,'SPACE');
  });
  await shot('09-space-return');
  await check('Home during book animation clears pending work',async()=>{
    await openCatalog('threadcove');await page.keyboard.press('h');await settled('SPACE');await page.waitForTimeout(1000);
    assert.equal((await snap()).panelHidden,true);assert.equal((await snap()).book.animations,0);assert.equal((await snap()).project,null);
  });
  report.status=report.errors.length?'failed':'passed';
}catch(error){report.status='failed';report.failure=error.stack;await shot('failure').catch(()=>{});}
finally{
  report.inputs=await page.evaluate(()=>window.__bookInputs).catch(()=>[]);
  report.video=await page.video().path();await context.close();await browser.close();report.browserClosed=true;
  report.finished=new Date().toISOString();await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:report.status,browser:report.browser,headedLimitation:report.headedLimitation,checks:report.checks.map(c=>c.name),errors:report.errors,failure:report.failure,report:path.join(out,'report.json')}));
  if(report.status==='failed')process.exitCode=1;
}
