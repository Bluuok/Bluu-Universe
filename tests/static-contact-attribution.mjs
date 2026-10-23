import {Vector3} from 'three';
import {SpaceCollision} from '../src/core/SpaceCollision.js';
import {CollisionManifest} from '../src/config/CollisionManifest.js';

// Detached copies only: attribute an observed production solve without moving
// the browser actor or changing its collision world. Rounded rail contacts
// need not have the same normal as a flat front wall.
export function attributeStaticContactRebuilt(solve, ids) {
  const selected=new Set(ids),manifest=CollisionManifest;
  if(!selected.size||!solve?.start||!solve?.requested||!solve?.end)throw Error('Missing contact attribution input');
  const probes=[];
  for(const [name,parts]of [['full',manifest.static],['target',manifest.static.filter(p=>selected.has(p.id))],['without',manifest.static.filter(p=>!selected.has(p.id))]]){
    const world=new SpaceCollision({...manifest,static:parts,door:[],dynamic:[]});
    try{
      const position=new Vector3(...solve.start),result=world.resolve(position,new Vector3(...solve.requested),null,{dt:solve.dt});
      probes.push({name,contacts:result.contacts.length,endpointDifference:position.distanceTo(new Vector3(...solve.end)),normals:result.contacts.map(c=>c.normal)});
    }finally{world.dispose();}
  }
  return {method:'Observed solve replay: complete static BVH, named target only, target removed',ids:[...selected],
    // Rebuilding a smaller BVH changes triangle order at a rounded corner.
    // Its endpoint must still agree within the existing capsule skin.
    matched:probes[0].contacts>0&&probes[0].endpointDifference<1e-5&&probes[1].contacts>0&&
      probes[1].endpointDifference<manifest.capsule.skin&&probes[2].contacts===0,
    maximumTargetEndpointDifference:manifest.capsule.skin,probes};
}

// Preserve the production BVH and triangle order in every probe. Rebuilding a
// smaller curved mesh changes the sequential capsule corrections; that is not
// evidence of a different contacted prop. Filter only the original triangles
// in detached CPU worlds, without moving or modifying the browser world.
export function attributeStaticContact(solve,ids){
  const selected=new Set(ids),manifest=CollisionManifest;
  if(!selected.size||!solve?.start||!solve?.requested||!solve?.end)throw Error('Missing contact attribution input');
  const parts=manifest.static.filter(p=>selected.has(p.id));
  if(parts.length!==selected.size)throw Error('Unknown static contact target');
  const world=new SpaceCollision({...manifest,door:[],dynamic:[]});
  try{
    const mesh=world.groups[0].mesh,tree=mesh.geometry.boundsTree,original=tree.shapecast.bind(tree);
    const position=mesh.geometry.getAttribute('position'),index=mesh.geometry.index;
    const vertices=new Uint8Array(position.count);let offset=0;
    // The merger retains each primitive's original vertex block; the BVH
    // permutes indices only. Verify that contract against exact source bytes.
    // Coordinate fingerprints cannot distinguish coincident corner posts.
    for(const primitive of manifest.static){
      const part=new SpaceCollision({...manifest,static:[primitive],door:[],dynamic:[]});
      try{
        const points=part.groups[0].geometry.getAttribute('position');
        for(let i=0;i<points.array.length;i++)if(position.array[offset*3+i]!==points.array[i])throw Error('Merged vertex ownership changed');
        if(selected.has(primitive.id))vertices.fill(1,offset,offset+points.count);
        offset+=points.count;
      }finally{part.dispose();}
    }
    if(offset!==position.count||!index||tree._indirectBuffer)throw Error('Unsupported production BVH layout');
    const triangles=new Uint8Array(index.count/3);let matching=0;
    for(let i=0;i<index.count;i+=3){
      const belongs=vertices[index.getX(i)];
      if(vertices[index.getX(i+1)]!==belongs||vertices[index.getX(i+2)]!==belongs)throw Error('Triangle crosses primitive ownership');
      triangles[i/3]=belongs;matching+=belongs;
    }
    let mode='full';
    tree.shapecast=callbacks=>original({...callbacks,intersectsTriangle:(tri,triangleIndex,...args)=>{
      if(!Number.isInteger(triangleIndex)||triangleIndex<0||triangleIndex>=triangles.length)throw Error('Invalid production triangle index');
      const belongs=triangles[triangleIndex];
      if(mode==='target'&&!belongs||mode==='without'&&belongs)return false;
      return callbacks.intersectsTriangle(tri,triangleIndex,...args);
    }});
    const probes=[];
    for(mode of ['full','target','without']){
      const position=new Vector3(...solve.start),result=world.resolve(position,new Vector3(...solve.requested),null,{dt:solve.dt});
      probes.push({name:mode,contacts:result.contacts.length,endpointDifference:position.distanceTo(new Vector3(...solve.end)),normals:result.contacts.map(c=>c.normal)});
    }
    return {method:'Observed solve replay: same full production BVH and triangle order; target-only and target-removed triangle filters',ids:[...selected],
      matched:probes[0].contacts>0&&probes[0].endpointDifference<1e-5&&probes[1].contacts>0&&probes[1].endpointDifference<1e-5&&probes[2].contacts===0,
      maximumTargetEndpointDifference:1e-5,targetTriangles:matching,productionTriangles:triangles.length,probes};
  }finally{world.dispose();}
}
