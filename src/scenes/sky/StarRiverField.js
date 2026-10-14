import * as THREE from 'three';
import {StarRiverManifest} from '../../config/StarRiverManifest.js';
import {sweptBody} from './VortexField.js';
import {makePaintedCloudVolume,getPaintedCloudBounds} from './PaintedCloudVolume.js';

// Reuse the existing closed sweep and the genuinely extracted Victor atlas.
// VortexField owns that atlas; this field owns only its two meshes/materials.
export class StarRiverField {
  constructor({scene,brushAtlas,manifest=StarRiverManifest}) {
    this.group=new THREE.Group();this.group.name='WorldPaintedRivers';scene.add(this.group);
    this.rivers=manifest.map(config=>{
      const {geometry,curve}=sweptBody(config.points.map(p=>new THREE.Vector3(...p)),config.paint,
        {curveSegments:144,crossSegments:24},config.paint);
      const mesh=makePaintedCloudVolume({geometry,curve,curveSegments:144,crossSegments:24,profile:config.paint,brushAtlas});
      geometry.dispose();
      mesh.name='PermeablePaintRiver:'+config.id;mesh.position.set(...config.position);mesh.rotation.set(...config.rotation);
      mesh.renderOrder=-2;this.group.add(mesh);return {config,mesh};
    });
  }
  setPigmentTexture(texture) {
    for(const {mesh} of this.rivers){const u=mesh.material.userData.paintUniforms;
      u.oilPaintMap.value=texture||null;u.oilPaintLoaded.value=texture?1:0;}
  }
  setPlayerFocus(position) {
    for(const {mesh} of this.rivers){const u=mesh.material.userData.paintUniforms;
      u.oilFocusActive.value=position?1:0;if(position){u.oilFocus.value.copy(position);u.oilFocus.value.y+=1;}}
  }
  getTelemetry() {
    this.group.updateWorldMatrix(true,true);
    return this.rivers.map(({config,mesh})=>{const box=getPaintedCloudBounds(mesh),renderBox=new THREE.Box3().setFromObject(mesh,true);
      return {id:config.id,worldFixed:true,closedVolume:true,permeable:true,position:mesh.position.toArray(),
        worldBounds:{min:box.min.toArray(),max:box.max.toArray()},renderBoxBounds:{min:renderBox.min.toArray(),max:renderBox.max.toArray()},triangles:mesh.geometry.index.count/3,volume:mesh.userData.cloudVolume};});
  }
  dispose() {
    if(this.disposed)return;this.disposed=true;this.group.removeFromParent();
    for(const {mesh} of this.rivers){mesh.geometry.dispose();mesh.material.dispose();}
  }
}
