import {Vector3} from 'three';
import {SpaceCollision} from '../src/core/SpaceCollision.js';
import {CollisionManifest} from '../src/config/CollisionManifest.js';

// Detached copies only: attribute an observed production solve without moving
// the browser actor or changing its collision world. Rounded rail contacts
// need not have the same normal as a flat front wall.
export function attributeStaticContact(solve, ids) {
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
