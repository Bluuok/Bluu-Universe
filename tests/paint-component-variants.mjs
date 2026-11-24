import assert from 'node:assert/strict';

// Diagnostic ablation, never production settings or a proposed final material.
export const paintComponents=[
  {id:'production',patches:[]},
  {id:'no-atlas',patches:[
    ['dab=oilPrint(paintUV,1.65*oilStrokeScale,23.);','dab=vec4(0.);'],
    ['under=oilPrint(paintUV+vec2(.31,.035),.85*oilStrokeScale,11.);','under=vec4(0.);']]},
  {id:'no-relief',patches:[['float relief=(dab.r*dab.g+under.r*under.g*.45)*oilRelief+sourceGrain*.001;','float relief=0.;']]},
  {id:'no-source',patches:[['sourceGrain=sourcePaint(paintPosition.yz)*paintWeights.x+sourcePaint(paintPosition.zx+7.3)*paintWeights.y+sourcePaint(paintPosition.xy+3.1)*paintWeights.z;','sourceGrain=.25;']]},
];
export function applyPaintComponent(shader,patches){
  for(const [before,after]of patches){
    if(shader.fragmentShader.split(before).length!==2)throw Error('Component diagnostic patch is stale or ambiguous: '+before);
    shader.fragmentShader=shader.fragmentShader.replace(before,after);
  }
}
export function componentFieldSource(source,variant){
  assert(paintComponents.includes(variant),'Unknown diagnostic component');
  if(!variant.patches.length)return source;
  const anchor='paintCompile(shader);shader.uniforms.paintFlowTime=this.clockUniform;';
  assert.equal(source.split(anchor).length,2,'Flow-only shader hook changed');
  const insert=`(${applyPaintComponent.toString()})(shader,${JSON.stringify(variant.patches)});`;
  return source.replace(anchor,'paintCompile(shader);'+insert+'shader.uniforms.paintFlowTime=this.clockUniform;');
}
