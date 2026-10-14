import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const url=process.env.FLOW_URL||'http://127.0.0.1:4203/',out=process.env.FLOW_OUT||'E:/temp/starhaven-alpha11-rc7-flow';
await mkdir(out,{recursive:true});
const headed=process.env.FLOW_HEADED==='1';
const browser=await chromium.launch({headless:!headed,executablePath:(headed||process.env.FLOW_CHROME==='installed')?'C:/Program Files/Google/Chrome/Application/chrome.exe':'C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--use-angle=d3d11','--enable-gpu','--disable-software-rasterizer','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:out,size:{width:1440,height:960}}});
await context.addInitScript(()=>{window.__routeInputs=[];window.__routeCadence=[];let lastFrame;function measure(now){if(lastFrame!==undefined)window.__routeCadence.push(now-lastFrame);lastFrame=now;requestAnimationFrame(measure);}requestAnimationFrame(measure);for(const type of ['keydown','keyup','pointermove','pointerdown','pointerup','click','blur','focus'])window.addEventListener(type,e=>window.__routeInputs.push({type,code:e.code,trusted:e.isTrusted,x:e.clientX,y:e.clientY,at:performance.now()}),true);});
const page=await context.newPage(),report={method:'Normal spawn, real Playwright keyboard/mouse; page evaluation reads only. Home resets only through visible UI/keyboard.',browser:headed?'installed headed Chrome / ANGLE D3D11':'GPU headless Chromium / ANGLE D3D11',url,started:new Date().toISOString(),checks:[],route:[],errors:[],runtimeErrors:[],requestFailures:[]},pressed=new Set();
page.on('pageerror',e=>{report.runtimeErrors.push(e.message);report.errors.push(e.message);});page.on('console',e=>{if(e.type()==='error'){report.runtimeErrors.push(e.text());report.errors.push(e.text());}});page.on('requestfailed',r=>{report.requestFailures.push({url:r.url(),error:r.failure()?.errorText});report.errors.push(r.url()+': '+r.failure()?.errorText);});
const sleep=ms=>page.waitForTimeout(ms);
const snap=()=>page.evaluate(()=>{const a=window.starhaven;return{state:a.state,player:a.player,velocity:a.velocity,flight:a.flight,route:a.route,keys:a.keys,project:a.currentProject,camera:a.camera,framing:a.framing,rendering:a.rendering,paintFlow:a.ambient?.paintFlow||null,collision:a.inspect.collision().lastSolve};});
async function keys(wanted=[]){for(const k of [...pressed])if(!wanted.includes(k)){await page.keyboard.up(k);pressed.delete(k);}for(const k of wanted)if(!pressed.has(k)){await page.keyboard.down(k);pressed.add(k);}}
async function neutral(){await page.mouse.move(720,480);}
async function shot(name){await page.screenshot({path:path.join(out,name+'.png')});const state=await snap();report.checks.push({name,...state});return state;}
async function brake(){await neutral();await keys(['s']);await sleep(950);await keys([]);}
async function home(){await keys([]);await page.keyboard.press('h');await neutral();await sleep(1000);}
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
const inv=(rate,maxRate,limit,flight={})=>{const dz=flight.deadZone??.14,exponent=flight.responseExponent??1.35;return Math.max(-limit,Math.min(limit,Math.sign(rate)*(dz+(1-dz)*Math.pow(Math.min(1,Math.abs(rate)/maxRate),1/exponent))));};
async function aimPointer(yaw,pitch,sample){
 const f=sample.flight;
 if(!f.aimYawRange)return {sx:inv(-wrap(yaw-f.yaw)*2,f.turnRate,.88,f),sy:inv(-(pitch-f.pitch)*2,f.pitchRate,.75,f)};
 if(Math.abs(wrap(yaw-f.aimBaseYaw))>f.aimYawRange*.98||Math.abs(pitch-f.aimBasePitch)>f.aimPitchRange*.98){await neutral();sample=await snap();}
 return {sx:inv(-wrap(yaw-sample.flight.aimBaseYaw),f.aimYawRange,.99,f),sy:inv(-(pitch-sample.flight.aimBasePitch),f.aimPitchRange,.99,f)};
}
async function seek(target,{radius=12,name='waypoint',limit=45000,stop=false}={}){
 const start=Date.now();let sample=await snap(),lastLog=0;
 while(Date.now()-start<limit){
  sample=await snap();const d=target.map((n,i)=>n-sample.player[i]),distance=Math.hypot(...d),speed=Math.hypot(...sample.velocity);
  if(distance<radius){await keys([]);await neutral();if(stop)await brake();const end=await shot(name);report.route.push({name,target,reached:true,seconds:(Date.now()-start)/1000,...end});console.log(JSON.stringify({waypoint:name,reached:true,player:end.player,seconds:(Date.now()-start)/1000}));return end;}
  const yaw=Math.atan2(-d[0],-d[2]),pitch=Math.atan2(d[1],Math.hypot(d[0],d[2])),ye=wrap(yaw-sample.flight.yaw),pe=pitch-sample.flight.pitch;
  const {sx,sy}=await aimPointer(yaw,pitch,sample);
  await page.mouse.move(720+sx*(sample.flight.pointerRangePx??720),480+sy*(sample.flight.pointerRangePx??480));
  const desiredSpeed=stop?Math.min(12,Math.max(.9,(distance-radius)*1.5)):12;
  if(Math.abs(ye)>1.0||Math.abs(pe)>.8||speed>desiredSpeed+1.3)await keys(['s']);
  else if(speed<desiredSpeed-.3)await keys(['w']);
  else await keys([]);
  if(Date.now()-lastLog>1200){report.route.push({name,at:(Date.now()-start)/1000,distance,player:sample.player,velocity:sample.velocity,yaw:sample.flight.yaw,pitch:sample.flight.pitch});lastLog=Date.now();}
  await sleep(140);
 }
 await brake();const end=await shot(name+'-timeout');report.route.push({name,target,reached:false,seconds:(Date.now()-start)/1000,...end});throw new Error('Could not reach '+name);
}
const check=(condition,message)=>{if(!condition)throw new Error(message);};
async function face(yaw,pitch){
 await brake();const start=Date.now();
 while(Date.now()-start<10000){
  const s=await snap(),ye=wrap(yaw-s.flight.yaw),pe=pitch-s.flight.pitch;
  if(Math.abs(ye)<.018&&Math.abs(pe)<.018){await neutral();await sleep(900);return;}
  const {sx,sy}=await aimPointer(yaw,pitch,s);await page.mouse.move(720+sx*(s.flight.pointerRangePx??720),480+sy*(s.flight.pointerRangePx??480));
  await sleep(100);
 }
 await neutral();throw new Error('Requested comparison heading not reached through mouse input');
}
try{
 await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.starhaven?.ready,{timeout:120000});await sleep(1200);
 const bundle=await page.evaluate(()=>[...document.scripts].map(s=>s.src).find(s=>s.includes('/assets/index-')));
 report.build={bundle,sha256:createHash('sha256').update(Buffer.from(await(await fetch(bundle)).arrayBuffer())).digest('hex')};
 report.comparison='Normal-spawn real mouse/W/S route; compare RC6 SolMax 31/32 at their recorded nearby poses. No product state injection; positions/headings reached by feedback input with tolerances.';
 await shot('00-normal-spawn');
 if(process.env.FLOW_SCOPE==='cluster'){
  report.comparison='RC56 single-cluster native flyby and Home return; normal W/S/mouse only, no pose injection. Not a new acceptance of every RC55 interaction scope.';
  await seek([-15,24,28],{radius:1.2,name:'cluster-01-clear-studio',stop:true});
  await seek([-48,22,-52],{radius:1.0,name:'cluster-02-front',stop:true,limit:65000});
  await face(.605,.288);await shot('cluster-03-front-look');
  await seek([-105,46,-60],{radius:1.0,name:'cluster-04-side',stop:true,limit:65000});
  await face(-.769,-.271);await shot('cluster-05-side-look');
 }else if(process.env.FLOW_SCOPE==='expanded'){
  report.comparison='Trusted input to expanded cloud-gate and star-crown landmarks beyond former negative-X/Z bounds, then visible Home return.';
  await seek([-15,24,28],{radius:1.2,name:'expanded-01-clear-studio',stop:true});
  await seek([-124.8,52.8,-103.2],{radius:2.0,name:'expanded-02-cloud-gate',stop:true,limit:65000});
  await seek([-316.8,168,-340.8],{radius:2.0,name:'expanded-03-star-crown',stop:true,limit:65000});
  const outer=await snap();check(outer.player[0]<-300&&outer.player[2]<-325,'Expanded landmark beyond the old walls not reached');report.expandedLandmark={player:outer.player,route:outer.route,collision:outer.collision};
 }else if(['interaction','word'].includes(process.env.FLOW_SCOPE)){

  report.comparison='New finite-target aim, trusted input crosses old positive-X world boundary and returns through existing Home UI; no pose/velocity injection.';
  const wordConfig=await page.evaluate(()=>starhaven.manifest.sky.wordField),rotation=wordConfig.rotation[1],cos=Math.cos(rotation),sin=Math.sin(rotation);
  const wordPoint=(x,y,z)=>[wordConfig.position[0]+cos*x+sin*z,wordConfig.position[1]+y-1,wordConfig.position[2]-sin*x+cos*z];
  const toLocal=p=>{const x=p[0]-wordConfig.position[0],y=p[1]+1-wordConfig.position[1],z=p[2]-wordConfig.position[2];return[cos*x-sin*z,y,sin*x+cos*z];};
  await page.waitForFunction(()=>{const w=starhaven.ambient.words;return w.word==='WELCOME'&&w.morph===0&&w.time%(2+1.6)<.12;},{},{timeout:22000});
  await seek(wordPoint(-10.361,.721,5),{radius:.4,name:'word-01-W-approach',stop:true,limit:20000});
  await face(rotation,0);await shot('word-02-fixed-W-before');
  const before=await page.evaluate(()=>starhaven.inspect.wordParticles());check(before.word==='WELCOME'&&before.morph===0,'Expected held WELCOME before local contact');
  const trail=[toLocal((await snap()).player)];let impact=null,impactPosition=null;await keys(['w']);const crossingStart=Date.now();
  while(Date.now()-crossingStart<3500){await sleep(50);const state=await snap(),local=toLocal(state.player);trail.push(local);if(!impact&&state.paintFlow!==undefined){const telemetry=await page.evaluate(()=>starhaven.ambient.words);if(telemetry.affected>30&&local[2]<.65){await brake();impactPosition=toLocal((await snap()).player);trail.push(impactPosition);await sleep(600);impact=await page.evaluate(()=>starhaven.inspect.wordParticles());await shot('word-03-local-W-impact');break;}}if(local[2]<-3)break;}
  await brake();trail.push(toLocal((await snap()).player));check(Boolean(impact),'No local word contact recorded');check(impact.word==='WELCOME'&&impact.morph===0,'Word must stay readable during local contact');
  const distanceToLine=(p,a,b)=>{const d=b.map((n,i)=>n-a[i]),length=d.reduce((sum,n)=>sum+n*n,0),t=Math.max(0,Math.min(1,p.reduce((sum,n,i)=>sum+(n-a[i])*d[i],0)/Math.max(length,1e-9)));return Math.hypot(...p.map((n,i)=>n-a[i]-d[i]*t));};
  let moved=0,movedOutside=0,maximum=0;for(let i=0;i<before.count;i++){const k=i*3,offset=Math.hypot(...impact.offsets.slice(k,k+3));maximum=Math.max(maximum,offset);if(offset>.00001){moved++;const point=before.positions.slice(k,k+3),distance=Math.min(...trail.slice(1).map((p,j)=>distanceToLine(point,trail[j],p)));if(distance>wordConfig.interaction.radius+.05)movedOutside++;}}
  check(moved>30&&moved<before.count*.3&&movedOutside===0,'Native contact must remain around one letter');await seek(wordPoint(-10.361,.721,5),{radius:.4,name:'word-04-leave-local-contact',stop:true,limit:20000});await face(rotation,0);await sleep(4000);const recovered=await page.evaluate(()=>starhaven.ambient.words);await shot('word-04-local-regather');check(recovered.maxDisplacement<.005,'Local word particles did not recover');report.wordInteraction={word:impact.word,morph:impact.morph,holding:impact.holdingForInteraction,moved,movedOutside,maximum,after:recovered,impactPosition,trail,pathSampleTolerance:.05};
  await home();
  if(process.env.FLOW_SCOPE==='interaction'){
  await seek([-15,24,28],{radius:1.2,name:'01-clear-studio-above',stop:true});
  await seek([350,24,100],{radius:1.0,name:'02-beyond-old-positive-x-wall',stop:true,limit:75000});
  await shot('03-large-world-stop');}
 }else if(process.env.FLOW_SCOPE==='paint'){

  report.comparison='Experimental PaintFlow native input validation, not visual acceptance. Three route axes read from production diagnostics. Full-session rAF includes startup/screenshots; it is not GPU timing.';
  await seek([-15,8,22],{radius:1.3,name:'01-clear-studio',stop:true});
  const passages=(await snap()).paintFlow.passages.filter(p=>p.id!=='main-vortex');
  let step=2;
  for(const p of passages){
   for(const location of ['front','center','back']){
    await seek(p[location],{radius:.6,name:String(step++).padStart(2,'0')+'-'+p.id+'-'+location,stop:true,limit:65000});
    const from=await snap(),target=location==='back'?p.center:p.back,d=target.map((n,i)=>n-from.player[i]);
    await face(Math.atan2(-d[0],-d[2]),Math.atan2(d[1],Math.hypot(d[0],d[2])));
    await shot(String(step++).padStart(2,'0')+'-'+p.id+'-'+location+'-look');
   }
  }
 }else if(process.env.FLOW_SCOPE==='vortex'){

  report.comparison='Main Vortex comparison against independently recorded RC23 front/side/back views. Trusted Playwright keyboard/mouse routes and tolerance-based braking only; no state injection or physical OS input claim.';
  await seek([-15,8,22],{radius:1.3,name:'01-clear-studio',stop:true});
  await seek([-27.316,6.269,19.146],{radius:.55,name:'02-vortex-front-position',stop:true});
  await face(-.0039,-.1589);await shot('03-vortex-front-look');
  await seek([-15,23,0],{radius:2,name:'04-clear-roof',stop:true});
  await seek([34.765,5.962,-42.708],{radius:.55,name:'05-vortex-side-position',stop:true});
  await face(1.56555,-.1556);await shot('06-vortex-side-look');
  await seek([-27.677,6.022,-103.691],{radius:.55,name:'07-vortex-back-position',stop:true});
  await face(-3.1286,-.1525);await shot('08-vortex-back-look');
  await seek([-28.82,-4.71,-47.82],{radius:.5,name:'09-passage-back',stop:true});
  await face(Math.PI,0);await shot('10-passage-back-look');
  await seek([-26.85,-4.84,-43.82],{radius:.5,name:'11-passage-middle',stop:true});
  await face(0,0);await shot('12-passage-middle-look');
  await seek([-22.67,-5.59,-33.72],{radius:.5,name:'13-passage-front',stop:true});
  await face(0,0);await shot('14-passage-front-look');
 }else{
 await seek([-52,22,-43],{radius:1.6,name:'01-cloud-gate',stop:true,limit:65000});
 await face(.7048,.3385);await shot('02-gate-facing-flow');
 await seek([-94.2706868,47.588269,-96.283232],{radius:.95,name:'03-route-bridge',stop:true,limit:65000});
 await face(.7047878,.3384578);const before=await shot('04-stationary-flow-before');await sleep(3800);const after=await shot('05-stationary-flow-after');
 report.flowMotion={playerDisplacement:Math.hypot(...after.player.map((n,i)=>n-before.player[i])),cameraDisplacement:Math.hypot(...after.camera.map((n,i)=>n-before.camera[i]))};
 await face(-1.0561113,.6400568);await shot('06-RC6-side-comparison');
 await face(-2.43,.04);await shot('07-route-back-view');
 await face(.7047878,-.38);await shot('08-route-under-view');
 await seek([-128.2933,67.90323,-137.81918],{radius:.95,name:'09-star-crown-approach',stop:true,limit:65000});
 await face(.7253529,.3590064);await shot('10-RC6-crown-comparison');
 await seek([-143,78,-159],{radius:1.8,name:'11-through-crown',stop:true,limit:65000});
 await face(-2.45,-.3);await shot('12-crown-back-to-home');
 await seek([-111,59,-111],{radius:3,name:'13-leaving-crown',stop:true,limit:65000});
 await face(.7047878,.3384578);await shot('14-crown-from-distance');
 }
 await home();await shot('15-home-return');
 check(report.runtimeErrors.length===0,'Browser runtime errors');report.status=report.requestFailures.length?'completed-with-request-diagnostics':'passed';
}catch(error){report.status='failed';report.failure=error.message;console.error(error);await shot('failure').catch(()=>{});}
finally{
 await keys([]).catch(()=>{});report.inputs=await page.evaluate(()=>window.__routeInputs).catch(()=>[]);report.trustedInputs=report.inputs.filter(e=>e.trusted).length;
 report.cadence=await page.evaluate(()=>{const gaps=window.__routeCadence||[],sorted=[...gaps].sort((a,b)=>a-b);return{scope:'Full session including startup, input, screenshots and waits',samples:gaps.length,median:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),over50:gaps.filter(x=>x>50).length,gaps};}).catch(()=>null);report.finished=new Date().toISOString();report.video=await page.video().path();await context.close();await browser.close();report.browserClosed=true;
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,failure:report.failure,checks:report.checks.length,trustedInputs:report.trustedInputs,errors:report.errors,report:path.join(out,'report.json')}));
 if(report.status!=='passed')process.exitCode=1;
}
