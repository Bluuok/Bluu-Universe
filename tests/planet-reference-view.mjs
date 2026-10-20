// Visual comparison of the exact user reference. It remains outside production.
import {chromium} from './browser-runtime.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('screenshots/v08-planet-reference',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/ertstyuqk/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--use-angle=d3d11','--enable-gpu','--disable-software-rasterizer']});
const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[],result={at:new Date().toISOString(),source:'vendor/user-sapphire-planet/source.html',method:'Original HTML rendered separately; trusted mouse orbit; reference only, not product evidence'};
page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
try{
  await page.goto('http://127.0.0.1:4173/vendor/user-sapphire-planet/source.html',{waitUntil:'load',timeout:40000});
  await page.waitForFunction(()=>typeof planetMesh!=='undefined'&&planetMesh&&typeof renderer!=='undefined',{timeout:12000});
  await page.waitForTimeout(1000);await page.screenshot({path:'screenshots/v08-planet-reference/original-front.png'});
  await page.mouse.move(740,420);await page.mouse.down();await page.mouse.move(1020,520,{steps:20});await page.mouse.up();
  await page.waitForTimeout(700);await page.screenshot({path:'screenshots/v08-planet-reference/original-orbit.png'});result.rendered=true;
}catch(error){result.rendered=false;result.reason=error.message;}
finally{result.errors=errors;await browser.close();await writeFile('tests/v08-planet-reference.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));}
