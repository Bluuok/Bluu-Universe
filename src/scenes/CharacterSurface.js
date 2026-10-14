import {Vector3,Matrix4,Box3,Float32BufferAttribute} from 'three';

// Contract the asset's measured rear corner points toward a rounded outline
// in the normalized model-root frame; this does not add curved tessellation.
// Invert the actual weighted skin matrix to write the result into bind space.
// No bone scale, UV, topology or original asset bytes are changed.
export function bevelCharacterBackpack(model,parent,config){
  if(!config)return [];
  parent.updateWorldMatrix(true,false);parent.updateMatrixWorld(true);const records=[];
  const p=new Vector3(),nearest=new Vector3(),direction=new Vector3(),target=new Vector3(),boneMatrix=new Matrix4(),skinMatrix=new Matrix4(),weighted=new Matrix4();
  model.traverse(mesh=>{
    if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();const bone=mesh.skeleton.bones.findIndex(b=>b.name===config.bone);if(bone<0)return;
    const toParent=new Matrix4().copy(parent.matrixWorld).invert().multiply(mesh.matrixWorld),fromParent=toParent.clone().invert();
    const g=mesh.geometry,position=g.attributes.position,indices=g.attributes.skinIndex,weights=g.attributes.skinWeight,affected=new Box3(),rearBounds=new Box3(),candidates=[];let modified=0,maxDisplacement=0;
    for(let i=0;i<position.count;i++){
      let attachment=0;for(let k=0;k<4;k++)if(indices.array[i*4+k]===bone)attachment+=weights.array[i*4+k];if(attachment<config.minWeight)continue;
      mesh.getVertexPosition(i,p);p.applyMatrix4(toParent);
      if(p.z>config.rearFaceZ||p.y<config.yRange[0]||p.y>config.yRange[1])continue;
      candidates.push({i,p:p.clone()});rearBounds.expandByPoint(p);
    }
    const lo=rearBounds.min.clone().addScalar(config.radius),hi=rearBounds.max.clone().addScalar(-config.radius);
    for(const candidate of candidates){const {i}=candidate;p.copy(candidate.p);
      // Round only the measured rear outline. Keep its authored depth and
      // emblem, rather than adding a second cover over the original pack.
      nearest.set(THREEClamp(p.x,lo.x,hi.x),THREEClamp(p.y,lo.y,hi.y),p.z);direction.subVectors(p,nearest);const distance=direction.length();if(distance<=config.radius)continue;
      target.copy(nearest).addScaledVector(direction,config.radius/distance);if(target.distanceToSquared(p)<1e-10)continue;
      affected.expandByPoint(p);maxDisplacement=Math.max(maxDisplacement,target.distanceTo(p));target.applyMatrix4(fromParent);
      weighted.elements.fill(0);for(let k=0;k<4;k++){const weight=weights.array[i*4+k];boneMatrix.fromArray(mesh.skeleton.boneMatrices,indices.array[i*4+k]*16);for(let j=0;j<16;j++)weighted.elements[j]+=boneMatrix.elements[j]*weight;}
      skinMatrix.copy(mesh.bindMatrixInverse).multiply(weighted).multiply(mesh.bindMatrix);target.applyMatrix4(skinMatrix.invert());position.setXYZ(i,target.x,target.y,target.z);modified++;
    }
    if(modified){position.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();}
    records.push({mesh:mesh.name,candidateVertices:candidates.length,modifiedVertices:modified,maxDisplacement,radius:config.radius,affected:modified?{min:affected.min.toArray(),max:affected.max.toArray()}:null});
  });return records;
}
const THREEClamp=(v,min,max)=>Math.max(min,Math.min(max,v));

// Average only normal directions across duplicate bind-space vertices with
// matching skin bindings. Keep original topology, UV islands and bone weights;
// a crease limit protects the backpack plates, cuffs and helmet rim.
export function smoothCharacterSeams(geometry,{tolerance=.0001,creaseAngle=60}={}){
  const position=geometry.attributes.position,skin=geometry.attributes.skinIndex,weight=geometry.attributes.skinWeight;
  const normals=geometry.attributes.normal,groups=new Map(),output=new Float32Array(normals.array),cos=Math.cos(creaseAngle*Math.PI/180);
  for(let i=0;i<position.count;i++){
    const key=[...Array.from({length:3},(_,k)=>Math.round(position.array[i*3+k]/tolerance)),...Array.from({length:4},(_,k)=>skin?.array[i*4+k]??0),...Array.from({length:4},(_,k)=>Math.round((weight?.array[i*4+k]??0)*100000))].join(':');
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);
  }
  const a=new Vector3(),b=new Vector3(),sum=new Vector3();let smoothedVertices=0,seams=0;
  for(const ids of groups.values()){
    if(ids.length<2)continue;seams++;
    for(const i of ids){a.fromBufferAttribute(normals,i);sum.set(0,0,0);for(const j of ids){b.fromBufferAttribute(normals,j);if(a.dot(b)>=cos)sum.add(b);}
      if(sum.lengthSq()<1e-12)continue;sum.normalize();if(a.distanceToSquared(sum)>1e-10)smoothedVertices++;sum.toArray(output,i*3);
    }
  }
  geometry.setAttribute('normal',new Float32BufferAttribute(output,3));
  return {vertices:position.count,seamGroups:seams,smoothedVertices,creaseAngle,tolerance,positionsUnchanged:true,skinWeightsUnchanged:true};
}
