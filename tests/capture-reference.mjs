import {chromium} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import path from 'node:path';
export const referenceCaptureSpec={executablePath:'C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',viewport:{width:1440,height:1000},deviceScaleFactor:1,args:['--enable-unsafe-swiftshader']};
export async function captureOriginalReference(browser){
  const referenceRoot=path.resolve('vendor/starry-night-reference/package/10-demo-星月夜/星月夜');
  const source=await readFile(path.join(referenceRoot,'index.html'),'utf8');const threeSource=await readFile(path.join(referenceRoot,'lib/three.module.js'),'utf8');
  const modelMark=source.match(/models\[L\.id\] \? '([^']+)'/)?.[1];assert.ok(modelMark,'Original debug model-ready marker missing');
  const diagnostics={consoleErrors:[],pageErrors:[],requestFailures:[],modelWarnings:[]};const modelRequests=[];
  const context=await browser.newContext({viewport:referenceCaptureSpec.viewport,deviceScaleFactor:referenceCaptureSpec.deviceScaleFactor});
  try{
    const page=await context.newPage();page.setDefaultTimeout(180000);
    page.on('console',m=>{if(m.type()==='error')diagnostics.consoleErrors.push(m.text());if(m.type()==='warning'&&/model fail|shader/i.test(m.text()))diagnostics.modelWarnings.push(m.text());});page.on('pageerror',e=>diagnostics.pageErrors.push(e.message));page.on('requestfailed',r=>diagnostics.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
    page.on('response',r=>{if(/models\/.+\.glb/.test(r.url()))modelRequests.push({event:'response',url:r.url(),status:r.status(),length:r.headers()['content-length']});});page.on('requestfinished',r=>{if(/models\/.+\.glb/.test(r.url()))modelRequests.push({event:'finished',url:r.url()});});
    const url=process.env.REFERENCE_URL||'http://127.0.0.1:4181/';await page.goto(url,{waitUntil:'networkidle',timeout:180000});
    await page.waitForFunction(mark=>{const d=window.__dbg?.();return d?.ready&&!d.err&&!d.ctxLost&&d.layers.every(l=>l.plane.startsWith('IMG'))&&d.layers.filter(l=>l.id==='village'||l.id==='cypress').every(l=>l.model===mark);},modelMark,{timeout:180000});
    await page.waitForFunction(()=>Number(getComputedStyle(document.getElementById('load')).opacity)<.01,null,{timeout:180000});await page.locator('#bReal').click();await page.locator('#bOpen').click();await page.waitForFunction(()=>window.__dbg().layers.find(l=>l.id==='cypress').z>1.51,null,{timeout:180000});
    const before=await page.evaluate(()=>({debug:window.__dbg(),realMode:document.getElementById('bReal').classList.contains('act'),expanded:document.getElementById('bOpen').classList.contains('act')}));assert.equal(before.realMode,true);assert.equal(before.expanded,true);assert.equal(before.debug.layers.find(l=>l.id==='village').vis,false);assert.equal(before.debug.layers.find(l=>l.id==='cypress').vis,false);
    await mkdir('screenshots',{recursive:true});const screenshot=path.resolve('screenshots/reference-starry-night.png');await page.screenshot({path:screenshot});const after=await page.evaluate(()=>window.__dbg());assert.equal(after.ready,true);assert.equal(after.err,null);assert.equal(after.ctxLost,false);
    assert.deepEqual(diagnostics.consoleErrors,[]);assert.deepEqual(diagnostics.pageErrors,[]);assert.deepEqual(diagnostics.modelWarnings,[]);
    // Keep the already observed fetch cancellation separate from actual model/render success.
    const unexpected=diagnostics.requestFailures.filter(r=>r.error!=='net::ERR_ABORTED'||!/\/assets\/models\/(village|cypress)\.glb$/.test(r.url)||!modelRequests.some(event=>event.event==='response'&&event.url===r.url&&event.status===200));assert.deepEqual(unexpected,[],'Unexpected reference resource failure');
    const result={status:'render-ready',networkStatus:diagnostics.requestFailures.length?'aborted-model-request-observed':'passed',url,screenshot,captureSpec:referenceCaptureSpec,threeRevision:threeSource.match(/REVISION = '([^']+)'/)?.[1],sourceEvidence:{file:path.join(referenceRoot,'index.html'),sha256:createHash('sha256').update(source).digest('hex'),postRoute:'renderer.render(scene,camera), no Composer/OutputPass',planeMaterial:'MeshBasicMaterial, SRGB map, white default color, toneMapped:false'},modelMark,before,after,diagnostics,modelRequests};console.log(JSON.stringify({reference:result}));return result;
  }finally{await context.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const browser=await chromium.launch({headless:true,executablePath:referenceCaptureSpec.executablePath,args:referenceCaptureSpec.args});try{await captureOriginalReference(browser);}finally{await browser.close();}}