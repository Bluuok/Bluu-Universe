import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const versions=JSON.parse(process.env.WORD_VISUAL_VERSIONS||'[{"id":"rc50","url":"http://127.0.0.1:4249/"}]');
const tag=process.env.WORD_VISUAL_TAG||'rc50';
const out=`screenshots/v12-${tag}-words`;await mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),method:'Installed headless Chrome / D3D11. All four words observed in real time at normal spawn and an explicitly labelled fixed camera/player comparison pose. Trusted W/S crossing from the fixture is separate from natural full-route acceptance. No word-phase mutation.',sessions:[]};
for(const version of versions){
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const session={...version,shots:[],errors:[],requestFailures:[],browserClosed:false};report.sessions.push(session);
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 page.on('pageerror',e=>session.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')session.errors.push(e.text())});page.on('requestfailed',r=>session.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
 const snap=()=>page.evaluate(()=>({word:starhaven.ambient.words,camera:starhaven.camera,player:starhaven.player,state:starhaven.state}));
 const shot=async name=>{const file=`${out}/${version.id}-${name}.png`;await page.screenshot({path:file});const sample=await snap();session.shots.push({name,file,...sample});return sample;};
 const cycle=async stage=>{
  const seen=new Set(),start=Date.now();
  while(seen.size<4&&Date.now()-start<18000){const s=await snap();if(s.word.morph===0&&!seen.has(s.word.word)){seen.add(s.word.word);await shot(`${stage}-${s.word.word.replace(/[^A-Z]/g,'')}`)}await page.waitForTimeout(80);}
  assert.equal(seen.size,4,stage+' complete four-word loop');
 };
 try{
  await page.goto(version.url);await page.waitForFunction(()=>window.starhaven?.ready,{},{timeout:120000});await page.mouse.move(720,480);
  const bundle=await page.evaluate(()=>[...document.scripts].map(s=>s.src).find(s=>s.includes('/assets/index-')));
  session.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(bundle)).arrayBuffer())).digest('hex')};
  await cycle('spawn');
  session.fixture=await page.evaluate(()=>{
   const c=starhaven.manifest.sky.wordField,n=[Math.sin(c.rotation[1]),0,Math.cos(c.rotation[1])];
   const player=c.position.map((v,i)=>v+n[i]*7-(i===1?1:0));
   starhaven.inspect.placeFlightFixture({position:player,yaw:c.rotation[1]});
   const camera=c.position.map((v,i)=>v+n[i]*28+(i===1?2:0));starhaven.inspect.framePosition({position:camera,target:c.position,duration:.2});return {player,camera,target:c.position};
  });await page.waitForTimeout(400);await cycle('medium');
  await page.waitForFunction(()=>starhaven.ambient.words.morph>.15&&starhaven.ambient.words.morph<.65);
  await page.keyboard.down('w');session.crossing=[];
  for(let i=0;i<30;i++){const s=await snap();session.crossing.push(s);if([5,12,20,28].includes(i))await shot('moving-'+i);await page.waitForTimeout(75);}
  await page.keyboard.up('w');await page.keyboard.down('s');await page.waitForTimeout(700);await page.keyboard.up('s');await page.waitForTimeout(2600);
  session.regathered=await shot('regathered');assert.ok(session.crossing.some(s=>s.word.affected>100));assert.ok(session.regathered.word.maxDisplacement<.05);
  assert.equal(session.errors.length,0);session.status='captured';
 }catch(error){session.status='failed';session.failure=error.stack;process.exitCode=1;}
 finally{await browser.close();session.browserClosed=true;await writeFile(`tests/v12-${tag}-words.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({id:version.id,status:session.status,shots:session.shots.length,errors:session.errors,failure:session.failure}));}
}
