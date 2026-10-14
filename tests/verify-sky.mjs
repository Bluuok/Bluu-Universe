import assert from 'node:assert/strict';
const near=(a,b,epsilon=1e-5)=>Math.abs(a-b)<=epsilon;
export function verifySkySnapshots(states){
  const first=states[0];assert.ok(first?.sky?.loaded,'Sky textures must actually finish loading');const frames=new Map(first.sky.frames.map(f=>[f.id,f]));
  for(const observation of states){
    const {sky,rendering}=observation;assert.equal(rendering.pipeline,'direct');assert.equal(rendering.outputColorSpace,'srgb');assert.ok(rendering.calls>1,'Scene draw calls must be observed beyond a final full-screen pass');assert.equal(sky.loaded,true);
    assert.equal(sky.frames.length,frames.size);assert.ok(sky.layers.length>=2);
    for(const frame of sky.frames){const initial=frames.get(frame.id);assert.ok(initial);assert.equal(frame.paired,true);assert.deepEqual(frame.worldPosition,initial.worldPosition,'World frame moved in '+observation.state);assert.deepEqual(frame.worldQuaternion,initial.worldQuaternion,'World frame rotated in '+observation.state);}
    for(const layer of sky.layers){
      assert.equal(layer.material,'MeshBasicMaterial');assert.equal(layer.white,'ffffff');assert.equal(layer.toneMapped,false);assert.equal(layer.srgb,true);assert.ok(layer.textureSize[0]>0&&layer.textureSize[1]>0);
      const u=layer.uv.map(v=>v[0]),v=layer.uv.map(v=>v[1]);const imageAspect=layer.textureSize[0]*(Math.max(...u)-Math.min(...u))/(layer.textureSize[1]*(Math.max(...v)-Math.min(...v)));const geometryAspect=layer.size[0]/layer.size[1];assert.ok(near(imageAspect,geometryAspect),'Texture crop stretched for '+layer.id);
      const partner=sky.layers.find(p=>p.frame===layer.frame&&p.id!==layer.id);assert.ok(partner);assert.deepEqual(partner.uv,layer.uv,'Actual cropped UVs disagree');assert.deepEqual(partner.size,layer.size);assert.deepEqual(partner.crop,layer.crop);
      if(layer.dataMask){assert.equal(layer.maskUV,1);assert.deepEqual(layer.uv1,[[0,1],[1,1],[0,0],[1,0]],'Coverage mask must retain independent uncropped UV1');}
    }
  }
  return {status:'passed',observedStates:[...new Set(states.map(s=>s.state))],snapshots:states.length,frames:frames.size,layers:first.sky.layers.length,pipeline:'direct',material:'white MeshBasicMaterial, toneMapped:false, SRGB',aspect:'checked from actual image size and cropped geometry UV span',registration:'actual UV0 plus independent UV1 coverage checked',worldFrames:'worldPosition and worldQuaternion invariant across observations'};
}