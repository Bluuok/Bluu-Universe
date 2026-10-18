import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createServer} from 'vite';

// Actual browser input and production app telemetry. No direct writes to the
// controller/camera: the user-facing start button, keyboard, and mouse are used.
const server=await createServer({server:{host:'127.0.0.1',port:4589,strictPort:true}});
let browser=null;
const errors=[];
try {
  await server.listen();
  browser=await chromium.launch({
    headless:true,
    args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
  });
  const page=await browser.newPage({viewport:{width:1440,height:960}});
  await page.addInitScript(()=>{
    window.__lockedMouseEvents=[];
    document.addEventListener('mousemove',event=>{
      if(document.pointerLockElement?.id==='world')
        window.__lockedMouseEvents.push([event.movementX,event.movementY]);
    },true);
  });
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('http://127.0.0.1:4589/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.starhaven?.ready,null,{timeout:120000});
  await page.locator('#loading').waitFor({state:'hidden',timeout:15000});
  const flight=()=>page.evaluate(()=>starhaven.flight);
  const initial=await flight();
  assert.equal(initial.mouseCaptured,false);

  await page.locator('#look-mode').click();
  await page.waitForFunction(()=>document.pointerLockElement?.id==='world',null,{timeout:15000});
  await page.waitForTimeout(150);
  const captured=await flight();
  assert.ok(Math.abs(Math.atan2(Math.sin(captured.yaw-initial.yaw),
    Math.cos(captured.yaw-initial.yaw)))<.03,
    `lock acquisition must not spin the camera: initial=${initial.yaw}, captured=${captured.yaw}`);
  await page.keyboard.down('w');
  await page.waitForTimeout(300);
  const before=await flight();
  assert.equal(before.mouseCaptured,true);
  assert.equal(before.paused,false);
  assert.ok((await page.evaluate(()=>starhaven.keys)).includes('KeyW'));

  await page.mouse.move(800,430,{steps:1});
  await page.mouse.move(920,455,{steps:4});
  await page.mouse.move(1080,470,{steps:4});
  await page.waitForTimeout(100);
  const after=await flight();
  // Verify real relative movement, not a floating-point no-op in wrapped yaw.
  const lockedEvents=await page.evaluate(()=>window.__lockedMouseEvents);
  const yawChange=Math.atan2(Math.sin(after.yaw-before.yaw),Math.cos(after.yaw-before.yaw));
  assert.ok((await page.evaluate(()=>starhaven.keys)).includes('KeyW'));
  assert.ok(Math.abs(yawChange)>.10,
    `actual captured mouse turn required; delta=${yawChange}, events=${JSON.stringify(lockedEvents)}`);
  await page.waitForTimeout(250);
  const held=await flight();
  assert.equal(held.yaw,after.yaw,'no delayed camera yaw/heading tail when the mouse stops');
  await page.keyboard.up('w');

  // Native Escape releases capture and pauses flight through the public UI.
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.pointerLockElement===null,null,{timeout:5000});
  const released=await flight();
  assert.equal(released.mouseCaptured,false);
  assert.equal(released.paused,true);

  // RMB works without capture, using relative drag instead of cursor location.
  const origin=await flight();
  await page.mouse.move(600,450);
  await page.mouse.down({button:'right'});
  await page.mouse.move(720,415,{steps:3});
  await page.mouse.up({button:'right'});
  const fallback=await flight();
  assert.notEqual(fallback.yaw,origin.yaw,'RMB drag should turn after releasing pointer lock');
  assert.equal(fallback.paused,false);

  // Left-drag is only for ordinary scene interaction, never steering.
  const left=await flight();
  await page.mouse.move(420,570);
  await page.mouse.down({button:'left'});
  await page.mouse.move(530,610,{steps:3});
  await page.mouse.up({button:'left'});
  assert.equal((await flight()).yaw,left.yaw);

  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({
    result:'passed',lockedEvents,headings:{initial:initial.yaw,captured:captured.yaw,before:before.yaw,after:after.yaw,
      held:held.yaw,released:released.yaw,rightDrag:fallback.yaw,leftDrag:left.yaw},
    capture:true,keyboardPreserved:true,errors,
  }));
} finally {
  if(browser)await browser.close();
  await server.close();
}
