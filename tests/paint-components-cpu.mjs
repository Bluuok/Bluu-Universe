import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {ShaderLib} from 'three';
import {makeVortexPaintMaterial} from '../src/scenes/sky/VortexPaintMaterial.js';
import {makeBrushAtlas} from '../src/vendor/victor-eu/brushAtlas.js';
import {paintComponents,applyPaintComponent,componentFieldSource} from './paint-component-variants.mjs';

const atlas=makeBrushAtlas(),material=makeVortexPaintMaterial({flowStroke:true,color:'#ffffff'},{brushAtlas:atlas});
try{
  const shader={uniforms:{},vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
  const original=readFileSync('src/scenes/sky/PaintFlowField.js','utf8'),hash=s=>createHash('sha256').update(s).digest('hex'),rows=[];
  for(const variant of paintComponents){
    const changed={...shader};applyPaintComponent(changed,variant.patches);
    assert.equal(changed.vertexShader,shader.vertexShader);
    const source=componentFieldSource(original,variant);
    execFileSync(process.execPath,['--input-type=module','--check'],{input:source,timeout:10000});
    if(variant.patches.length){assert.notEqual(changed.fragmentShader,shader.fragmentShader);assert.notEqual(source,original);}
    else{assert.equal(changed.fragmentShader,shader.fragmentShader);assert.equal(source,original);}
    rows.push({id:variant.id,fragmentSHA256:hash(changed.fragmentShader),fieldSHA256:hash(source)});
  }
  assert.equal(new Set(rows.map(r=>r.fragmentSHA256)).size,4);
  assert.throws(()=>applyPaintComponent({fragmentShader:'obsolete shader'},paintComponents[1].patches),/stale or ambiguous/);
  console.log(JSON.stringify({status:'passed',browserStarted:false,GPUCompiled:false,method:'Actual current flow shader tokens, flow-only hook and four distinct diagnostic variants; not art acceptance',variants:rows}));
}finally{material.dispose();atlas.dispose();}
