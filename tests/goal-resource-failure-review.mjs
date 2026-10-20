import {chromium} from './browser-runtime.mjs';
import {runtimeBuildIdentity} from './runtime-build-identity.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';

const url=process.env.GOAL_URL||'http://127.0.0.1:4259/',out=process.env.GOAL_FAULT_OUT||'screenshots/v13-rc61-failures';await mkdir(out,{recursive:true});
const transportResponse=await fetch(new URL('/assets/transport.json',url)),transport=(transportResponse.headers.get('content-type')||'').includes('json')?await transportResponse.json():null;const chunkPattern=part=>transport?new URL(transport.assets[Object.keys(transport.assets).find(k=>k.includes(part))].parts[0].url,url).href:part==='panorama'?'**/assets/sky/world/blue-gold-panorama*.png':'**/assets/sky/candidates/layer-*.png';
const report={started:new Date().toISOString(),method:'Isolated network interception in installed Chrome; no state/pose writes. Expected loader and optional-content failures are separate from runtime errors.',cases:[]};
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11']});
try{
 for(const [name,pattern,invalid]of [['optional-content-network','**/content-notes.json'],['optional-content-json','**/content-notes.json',true],['required-character','**/assets/character/astronaut.glb'],['required-sky',chunkPattern('panorama')],['required-pigment',chunkPattern('layer-')],...(transport?[['required-transport-manifest','**/assets/transport.json'],['required-corrupt-sky',chunkPattern('panorama'),'corrupt']]:[])]){
  const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage(),item={name,interceptions:0,errors:[],requests:[]};report.cases.push(item);
  try{
   page.on('pageerror',e=>item.errors.push(e.message));page.on('requestfailed',r=>item.requests.push({url:r.url(),reason:r.failure()?.errorText}));
   await page.route(pattern,r=>{item.interceptions++;if(invalid==='corrupt')return r.fetch().then(async response=>{const body=await response.body();body[0]^=1;return r.fulfill({response,body});});return invalid?r.fulfill({contentType:'application/json',body:'{invalid'}):r.abort();});
   await page.goto(url);const build=await runtimeBuildIdentity(page);
   if(report.build)assert.deepEqual(report.build,build);else report.build=build;
   if(name.startsWith('required')){await page.waitForFunction(()=>document.querySelector('#loading p')?.textContent.includes('星港暂时未能加载'),{timeout:25000});item.result=await page.evaluate(()=>({ready:window.starhaven?.ready,text:document.querySelector('#loading p').textContent}));assert.ok(!item.result.ready);}
   else{await page.waitForFunction(()=>window.starhaven?.ready,{timeout:45000});item.result=await page.evaluate(()=>({ready:starhaven.ready,content:starhaven.projectContent}));assert.equal(item.result.content.loaded,false);}
   assert.ok(item.interceptions>0);assert.deepEqual(item.errors,[]);item.screenshot=`${out}/${name}.png`;await page.screenshot({path:item.screenshot});item.status='passed';
  }finally{await context.close();}
 }
 const asset='/assets/room/props/star-ceramic.png',local=await readFile('public'+asset),response=await fetch(new URL(asset,url)),http=Buffer.from(await response.arrayBuffer());assert.ok(response.ok);assert.deepEqual(local,http);report.starOrnament={asset,bytes:local.length,sha256:createHash('sha256').update(local).digest('hex'),httpMatches:true};
 report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();report.browserClosed=true;report.finished=new Date().toISOString();await writeFile(process.env.GOAL_FAULT_REPORT||'tests/v13-rc61-resource-failures.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
