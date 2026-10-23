// Local route feasibility only: detached BVHs, three robot poses and sampled
// approach error. Other distant dynamic anchors are omitted. Not real play.
import assert from 'node:assert/strict';
import {Object3D,Vector3} from 'three';
import {SpaceCollision} from '../src/core/SpaceCollision.js';
import {CollisionManifest as manifest} from '../src/config/CollisionManifest.js';
import {attributeStaticContact} from './static-contact-attribution.mjs';

const robot=new Object3D();robot.position.set(-2.8,2.15,5.4);
const localDynamic=manifest.dynamic.filter(p=>p.anchor==='robot');
const world=new SpaceCollision({...manifest,dynamic:localDynamic},{anchors:{robot}});
let cases=0;
try{
  for(const [height,yaw]of [[2.01,.30],[2.15,.38],[2.29,.46]]){
    robot.position.y=height;robot.rotation.y=yaw;
    for(const fixture of [
      {name:'front',start:[-2,3.5,9],radius:.25,delta:[0,0,-.06],normal:[0,0,1],id:'studio-wall-front-left'},
      {name:'right',start:[9,3,-.74205],radius:.3,delta:[-.06,0,0],normal:[1,0,0],id:'studio-wall-right'},
    ])for(const dx of [-fixture.radius,fixture.radius])for(const dy of [-fixture.radius,fixture.radius])for(const dz of [-fixture.radius,fixture.radius]){
      // Cube corners exceed the route's spherical tolerance, giving a
      // conservative local approach sample without claiming exhaustive proof.
      const position=new Vector3(...fixture.start).add(new Vector3(dx,dy,dz)),delta=new Vector3(...fixture.delta),velocity=delta.clone().multiplyScalar(60);
      let observed;
      for(let step=0;step<100;step++){
        const solve=world.resolve(position,delta,velocity,{dt:1/60});
        if(solve.contacts.length){observed=solve;break;}
      }
      assert(observed,fixture.name+': no local contact');
      assert(observed.contacts.every(c=>c.collider==='studio-static'),fixture.name+': first contact is a different dynamic prop');
      assert(observed.contacts.some(c=>new Vector3(...c.normal).dot(new Vector3(...fixture.normal))>.7));
      assert(attributeStaticContact(observed,[fixture.id]).matched,fixture.name+': not the named glazing wall');
      cases++;
    }
  }
  console.log(JSON.stringify({status:'passed',cases,browserStarted:false,method:'Detached local BVH route samples; no rendering, camera, whole-world or input acceptance'}));
}finally{world.dispose();}
