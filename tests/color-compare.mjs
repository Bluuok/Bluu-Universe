import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);const {PNG}=require('../node_modules/playwright-core/lib/utilsBundle.js');
// Decode the exact captured PNG bytes. No image transformation or output is produced.
async function sample(file,regions){
  const png=PNG.sync.read(await readFile(file));assert.equal(png.width,1440);assert.equal(png.height,1000);
  let pixels=0;const sums={gold:[0,0,0],blue:[0,0,0]},counts={gold:0,blue:0};
  for(const [left,top,right,bottom] of regions)for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
    const offset=(y*png.width+x)*4;const r=png.data[offset],g=png.data[offset+1],b=png.data[offset+2];pixels++;
    const kind=r>=110&&g>=85&&r>=b*1.18&&g>=b*1.02?'gold':b>=85&&b>=r*1.08&&b>=g*.9?'blue':null;
    if(kind){counts[kind]++;sums[kind][0]+=r;sums[kind][1]+=g;sums[kind][2]+=b;}
  }
  return {file,dimensions:[png.width,png.height],regions,pixels,gold:{count:counts.gold,fraction:counts.gold/pixels,meanRGB:counts.gold?sums.gold.map(v=>Math.round(v/counts.gold)):null},blue:{count:counts.blue,fraction:counts.blue/pixels,meanRGB:counts.blue?sums.blue.map(v=>Math.round(v/counts.blue)):null}};
}
export async function compareCapturedColors(referenceFile,mainFile){
  const source=await sample(referenceFile,[[360,250,1040,840]]);
  // The upper sky band avoids DOM text, the studio wall, and gold terrace hardware.
  const main=await sample(mainFile,[[400,110,1430,245]]);
  return {method:'sRGB pixel classes in actual PNGs; unchanged pixels',classification:{gold:'R>=110,G>=85,R>=1.18B,G>=1.02B',blue:'B>=85,B>=1.08R,B>=.9G'},source,main,presence:{sourceBlue:source.blue.count>1000,sourceGold:source.gold.count>100,mainBlue:main.blue.count>1000,mainGold:main.gold.count>100},caveat:'Different camera crops and scene compositions: counts indicate visible colors in these regions, not exact color-match equivalence. Assess the actual two screenshots together.'};
}