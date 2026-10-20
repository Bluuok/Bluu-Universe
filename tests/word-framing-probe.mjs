import {chromium} from './browser-runtime.mjs';
import * as THREE from 'three';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11']});
try{const page=await browser.newPage({viewport:{width:1440,height:960}});await page.goto('http://127.0.0.1:4243/');await page.waitForFunction(()=>window.starhaven?.ready,{timeout:120000});
 const state=await page.evaluate(()=>({eye:starhaven.camera,target:starhaven.cameraProgress.target}));const camera=new THREE.PerspectiveCamera(43,1.5,.1,1800);camera.position.fromArray(state.eye);camera.lookAt(new THREE.Vector3(...state.target));camera.updateMatrixWorld(true);
 const proposals=[];for(const p of [[-5,14,-22],[-5,8,-22],[-8,7,-18],[-10,8,-26],[-10,6,-26]]){const points=[];for(const x of [-12,0,12]){const v=new THREE.Vector3(x,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),.47).add(new THREE.Vector3(...p)).project(camera);points.push([Math.round((v.x+1)*720),Math.round((1-v.y)*480)])}proposals.push({position:p,points})}
 console.log(JSON.stringify({state,proposals}));await writeFile('E:/temp/starhaven-word-framing-probe.json',JSON.stringify({state,proposals},null,2));
}finally{await browser.close();}
