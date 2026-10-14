// Isolated resource/lifecycle checks; actual shader appearance is verified
// separately through trusted keyboard/mouse routes in the production page.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {VortexField} from '../src/scenes/sky/VortexField.js';
import {makeBrushAtlas} from '../src/vendor/victor-eu/brushAtlas.js';

const build=(await readFile('dist/index.html','utf8')).match(/assets\/(index-[^" ]+\.js)/)[1];
const field=new VortexField({scene:new THREE.Scene()}),atlas=field.brushAtlas,reference=makeBrushAtlas(),pigment=new THREE.Texture();
const report={at:new Date().toISOString(),build,sha256:createHash('sha256').update(await readFile('dist/assets/'+build)).digest('hex'),method:'Isolated Node checks of atlas channel semantics, deterministic bytes, sharing, fallback and ownership; not browser art acceptance.',checks:[]};
let ownDisposes=0,borrowedDisposes=0;
atlas.addEventListener('dispose',()=>ownDisposes++);pigment.addEventListener('dispose',()=>borrowedDisposes++);
try {
 const materials=[];field.group.traverse(o=>{if(o.material)materials.push(o.material);});
 assert.equal(materials.length,5);assert.ok(materials.every(m=>m.userData.paintUniforms.oilBrushAtlas.value===atlas));
 report.checks.push('Five materials share one owned atlas');
 assert.deepEqual([atlas.image.width,atlas.image.height],[256,512]);assert.equal(atlas.colorSpace,THREE.NoColorSpace);assert.equal(atlas.generateMipmaps,true);
 assert.deepEqual(atlas.image.data,reference.image.data);report.atlasSha256=createHash('sha256').update(atlas.image.data).digest('hex');
 report.checks.push('Deterministic 256x512 data atlas with mipmaps and no sRGB conversion');
 let bristlesWithoutSecondaryPigment=0;
 for(let i=0;i<atlas.image.data.length;i+=4)if(atlas.image.data[i+1]>100&&atlas.image.data[i+3]===0)bristlesWithoutSecondaryPigment++;
 assert.ok(bristlesWithoutSecondaryPigment>1000);report.bristlesWithoutSecondaryPigment=bristlesWithoutSecondaryPigment;
 report.checks.push('Coverage exists when A=0: A is secondary pigment, not opacity');
 field.setPigmentTexture(pigment);assert.ok(materials.every(m=>m.userData.paintUniforms.oilPaintMap.value===pigment));
 field.setPigmentTexture(null);assert.ok(materials.every(m=>m.userData.paintUniforms.oilPaintLoaded.value===0&&m.userData.paintUniforms.oilBrushAtlas.value===atlas));
 report.checks.push('Missing borrowed panorama pigment keeps the independent brush atlas available');
 field.dispose();assert.equal(ownDisposes,1);assert.equal(borrowedDisposes,0);
 report.checks.push('Field disposes its atlas once and does not dispose the borrowed pigment texture');
 report.status='passed';
}catch(e){report.status='failed';report.error=e.message;process.exitCode=1;}
finally {
 if(!ownDisposes)field.dispose();reference.dispose();pigment.dispose();
 await writeFile(process.env.BRUSH_REPORT||'tests/v05-brush-atlas.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,checks:report.checks.length,atlasSha256:report.atlasSha256,error:report.error}));
}
