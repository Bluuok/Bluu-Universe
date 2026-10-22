// Shared browser route: trusted input only, no product fixtures or teleport.
export async function flyTo(page,target,{radius=.5,enter=false,stopOnCross=false,timeout=45000,pulseNear=false}={}){
  const started=Date.now(),held=new Set(),trace=[],wrap=v=>Math.atan2(Math.sin(v),Math.cos(v));
  let wasMoving=false,nearStops=0,nearStride=0,primaryError;
  const keys=async wanted=>{for(const k of [...held])if(!wanted.includes(k)){await page.keyboard.up(k);held.delete(k);}for(const k of wanted)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}};
  const center=async()=>{const v=page.viewportSize();await page.mouse.move(v.width/2,v.height/2);};
  try{
    // Returning from a real UI intentionally requires recentering the pointer.
    // Do this before feedback steering, just as a player returning to flight.
    await center();await page.waitForTimeout(60);
    while(Date.now()-started<timeout){
      const s=await page.evaluate(()=>({state:starhaven.state,p:starhaven.player,v:starhaven.velocity,f:starhaven.flight}));
      if(!trace.length||Date.now()-trace.at(-1).at>600)trace.push({at:Date.now(),p:s.p,v:s.v,yaw:s.f.yaw,pitch:s.f.pitch,needsCenter:s.f.needsCenter,paused:s.f.paused});
      if(enter&&s.state!=='SPACE'){await keys([]);await center();if(!stopOnCross)await page.waitForFunction(()=>starhaven.state==='ROOM'&&!starhaven.cameraProgress.transition,{},{timeout:Math.max(15000,timeout)});return;}
      if(s.state!=='SPACE')throw Error('Flight route left SPACE unexpectedly: '+s.state);
      const d=target.map((v,i)=>v-s.p[i]),distance=Math.hypot(...d),speed=Math.hypot(...s.v);
      if(speed>.15)wasMoving=true;
      else if(wasMoving){wasMoving=false;if(distance<3)nearStops++;}
      if(!enter&&distance<radius){
        await center();await keys([s.f.inputMode==='relative-mouse'?'x':'s']);
        // Hold through an actual simulation frame. A fixed short tap can be
        // released between software-rendered frames and leave the pilot moving.
        await page.waitForFunction(()=>starhaven.state!=='SPACE'||Math.hypot(...starhaven.velocity)<.15,null,
          {timeout:Math.max(1,timeout-(Date.now()-started))});
        await keys([]);
        const stopped=await page.evaluate(()=>({state:starhaven.state,p:starhaven.player}));
        if(stopped.state!=='SPACE')throw Error('Braking left SPACE unexpectedly: '+stopped.state);
        // Crossing the radius before braking is not arrival. Correct any real
        // inertial overshoot using the same keyboard/mouse feedback loop.
        if(Math.hypot(...target.map((v,i)=>v-stopped.p[i]))>=radius)continue;
        console.log(JSON.stringify({waypoint:target,at:stopped.p}));
        return {target,player:stopped.p,detours:trace.filter(step=>step.action)};
      }
      // Near a target, sustained long frames can make one forward step wider
      // than the arrival radius. Measure real stopped-to-stopped travel rather
      // than repeating a straight-line chase or relying on fixed short taps.
      if(!enter&&s.f.inputMode==='relative-mouse'&&distance<12&&nearStops>=2){
        await keys(['x']);
        await page.waitForFunction(()=>starhaven.state!=='SPACE'||Math.hypot(...starhaven.velocity)<.15,null,
          {timeout:Math.max(1,timeout-(Date.now()-started))});
        const before=await page.evaluate(()=>({state:starhaven.state,p:starhaven.player}));
        if(before.state!=='SPACE')throw Error('Measured approach left SPACE unexpectedly: '+before.state);
        const aim=target.map((v,i)=>v-before.p[i]),remaining=Math.hypot(...aim);
        if(remaining<radius)continue;
        // A perpendicular step makes room for a subsequent direct approach
        // when the measured minimum stride would cross the whole target.
        const sideways=!nearStride||remaining<nearStride*.65;
        const heading=sideways?(Math.hypot(aim[0],aim[2])>.01?[aim[2],0,-aim[0]]:[1,0,0]):aim;
        const pitch=Math.max(-1.3,Math.min(1.3,Math.atan2(heading[1],Math.hypot(heading[0],heading[2]))));
        await faceHeading(page,Math.atan2(-heading[0],-heading[2]),pitch);
        await keys(['w']);
        await page.waitForFunction(p=>starhaven.state!=='SPACE'||Math.hypot(...starhaven.player.map((v,i)=>v-p[i]))>.05,before.p,
          {timeout:Math.max(1,timeout-(Date.now()-started))});
        await keys(['x']);
        await page.waitForFunction(()=>starhaven.state!=='SPACE'||Math.hypot(...starhaven.velocity)<.15,null,
          {timeout:Math.max(1,timeout-(Date.now()-started))});
        await keys([]);
        const after=await page.evaluate(()=>({state:starhaven.state,p:starhaven.player}));
        if(after.state!=='SPACE')throw Error('Measured approach left SPACE unexpectedly: '+after.state);
        nearStride=Math.hypot(...after.p.map((v,i)=>v-before.p[i]));
        trace.push({at:Date.now(),action:'real-measured-approach',sideways,from:before.p,to:after.p,stride:nearStride});
        continue;
      }
      // Optional slow-feedback QA route: stop before reading/turning near a
      // target, then issue a bounded real key pulse. No game state is written.
      if(pulseNear&&s.f.inputMode==='relative-mouse'&&distance<12){
        await keys(['x']);await page.waitForTimeout(180);
        const settled=await page.evaluate(()=>({state:starhaven.state,p:starhaven.player}));
        if(settled.state!=='SPACE')continue;
        const remaining=target.map((v,i)=>v-settled.p[i]),length=Math.hypot(...remaining);
        if(!enter&&length<radius){await keys([]);console.log(JSON.stringify({waypoint:target,at:settled.p,pulseNear:true}));return;}
        // Match the pilot's authored pitch cap; a near-vertical target cannot
        // converge to an angle outside that range through real mouse input.
        const pitch=Math.max(-1.3,Math.min(1.3,Math.atan2(remaining[1],Math.hypot(remaining[0],remaining[2]))));
        await faceHeading(page,Math.atan2(-remaining[0],-remaining[2]),pitch);
        await keys(['w']);await page.waitForTimeout(Math.min(160,Math.max(30,(length-(enter?0:radius*.6))*70)));
        await keys(['x']);await page.waitForTimeout(180);continue;
      }
      const ye=wrap(Math.atan2(-d[0],-d[2])-s.f.yaw),pe=Math.max(-1.3,Math.min(1.3,Math.atan2(d[1],Math.hypot(d[0],d[2]))))-s.f.pitch;
      if(s.f.inputMode==='relative-mouse'){
        // Each real mouse command can span a rendered frame. Do not leave W
        // held while issuing a turn, or an old heading keeps flying meanwhile.
        // Aligned travel needs no mouse command at all.
        if(Math.abs(ye)>.008||Math.abs(pe)>.008){
          await keys(['x']);
          await page.waitForFunction(()=>starhaven.state!=='SPACE'||Math.hypot(...starhaven.velocity)<.15,null,
            {timeout:Math.max(1,timeout-(Date.now()-started))});
          const stopped=await page.evaluate(()=>({state:starhaven.state,p:starhaven.player,f:starhaven.flight}));
          if(stopped.state!=='SPACE')throw Error('Steering brake left SPACE unexpectedly: '+stopped.state);
          const aim=target.map((v,i)=>v-stopped.p[i]);
          await lookBy(page,-wrap(Math.atan2(-aim[0],-aim[2])-stopped.f.yaw)/stopped.f.lookSensitivity,
            -(Math.max(-1.3,Math.min(1.3,Math.atan2(aim[1],Math.hypot(aim[0],aim[2]))))-stopped.f.pitch)/stopped.f.lookSensitivity);
          continue;
        }
        const desired=enter?Math.min(8,Math.max(2,distance*1.3)):Math.min(10,Math.max(.8,(distance-radius)*1.8));
        await keys(Math.abs(ye)>1||Math.abs(pe)>.8||speed>desired+1?['x']:speed<desired-.3?['w']:[]);
        await page.waitForTimeout(70);continue;
      }
      const limit=s.f.aimYawRange?.99:.8;const rate=(v,max)=>Math.max(-limit,Math.min(limit,Math.sign(v)*(s.f.deadZone+(1-s.f.deadZone)*Math.pow(Math.min(1,Math.abs(v)/max),1/s.f.responseExponent))));
      const vp=page.viewportSize(),range=s.f.pointerRangePx;
      let sx,sy;
      if(s.f.aimYawRange){
        const yaw=Math.atan2(-d[0],-d[2]),pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));let basis=s.f;
        if(Math.abs(wrap(yaw-basis.aimBaseYaw))>basis.aimYawRange*.98||Math.abs(pitch-basis.aimBasePitch)>basis.aimPitchRange*.98){await center();basis=await page.evaluate(()=>starhaven.flight);}
        sx=rate(-wrap(yaw-basis.aimBaseYaw),basis.aimYawRange);sy=rate(-(pitch-basis.aimBasePitch),basis.aimPitchRange);
      }else{sx=rate(-ye*2,s.f.turnRate);sy=rate(-pe*2,s.f.pitchRate);}
      await page.mouse.move(vp.width/2+sx*range,vp.height/2+sy*range);
      const desired=enter?Math.min(8,Math.max(2,distance*1.3)):Math.min(10,Math.max(.8,(distance-radius)*1.4));
      await keys(Math.abs(ye)>1||Math.abs(pe)>.8||speed>desired+1?['s']:speed<desired-.3?['w']:[]);
      await page.waitForTimeout(70);
    }
    throw Error('Normal-input flight route timed out: '+JSON.stringify({target,trace:trace.slice(-8),observation:await page.evaluate(()=>({state:starhaven.state,p:starhaven.player,v:starhaven.velocity,f:starhaven.flight,passage:starhaven.passage}))}));
  }catch(error){
    primaryError=error;
    error.stack=(error.stack||error.message)+'\nFlight context: '+JSON.stringify({target,trace:trace.slice(-8),detours:trace.filter(step=>step.action)});
    throw error;
  }finally{
    try{await keys([]);await center();}catch(cleanupError){if(!primaryError)throw cleanupError;}
  }
}
export async function flyIntoRoom(page,options={}){
  await flyTo(page,[1.35,1.8,11],{...options,radius:.45});
  await flyTo(page,[1.35,1.15,6.2],{...options,enter:true});
}

// A short key tap can fall entirely between software-rendered frames. Keep
// real W held until observed outward travel, then verify actual braking.
export async function departAfterExit(page,{distance=2,timeout=30000}={}){
  const read=()=>page.evaluate(()=>({state:starhaven.state,player:starhaven.player,
    velocity:starhaven.velocity,passage:starhaven.passage}));
  const before=await read();
  if(before.state!=='SPACE')throw Error('Departure must start outside');
  const viewport=page.viewportSize();await page.mouse.move(viewport.width/2,viewport.height/2);
  await page.keyboard.down('w');
  try{await page.waitForFunction(({z,distance,entries})=>starhaven.state!=='SPACE'||
    starhaven.passage.entries!==entries||starhaven.player[2]>z+distance,
    {z:before.player[2],distance,entries:before.passage.entries},{timeout});}
  finally{await page.keyboard.up('w').catch(()=>{});}
  await page.keyboard.down('x');
  try{await page.waitForFunction(()=>Math.hypot(...starhaven.velocity)<.15,null,{timeout});}
  finally{await page.keyboard.up('x').catch(()=>{});}
  const after=await read();
  if(after.state!=='SPACE'||after.passage.entries!==before.passage.entries||after.player[2]<=before.player[2]+distance)
    throw Error('Outward departure was not completed: '+JSON.stringify({before,after,distance}));
  return {before,after,distance};
}

// Relative look via the actual RMB fallback. Mouse recentering occurs only
// with the button released, so it never changes the pilot's heading.
export async function lookBy(page,dx,dy){
 const v=page.viewportSize(),x=v.width/2,y=v.height/2;
 await page.mouse.move(x,y);await page.mouse.down({button:'right'});
 try{await page.mouse.move(x+Math.max(-500,Math.min(500,dx)),y+Math.max(-350,Math.min(350,dy)));}
 finally{await page.mouse.up({button:'right'});}
}
export async function faceHeading(page,yaw,pitch=0){
 const wrap=v=>Math.atan2(Math.sin(v),Math.cos(v));
 for(let i=0;i<12;i++){const f=await page.evaluate(()=>starhaven.flight),dy=wrap(yaw-f.yaw),dp=pitch-f.pitch;if(Math.abs(dy)<.008&&Math.abs(dp)<.008)return;await lookBy(page,-dy/f.lookSensitivity,-dp/f.lookSensitivity);await page.waitForTimeout(25);}
 throw Error('Relative mouse heading did not converge');
}
