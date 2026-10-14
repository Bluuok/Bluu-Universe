// Direct TypeScript-to-JavaScript conversion; original collision algorithm unchanged.
// Source: hh-hang/three-player-controller v0.6.2 @ ca82bbc76a3b9b0afa80c73b60167adf6123b9b6
// src/utils/capsuleCollision.ts lines 1, 59-68, 251-295.
// MIT; original license retained in LICENSE.three-player-controller.txt.
import * as THREE from "three";
function createCollisionTemps() {
  return {
    invMat: new THREE.Matrix4(),
    localSeg: new THREE.Line3(),
    localBox: new THREE.Box3(),
    closestSeg: new THREE.Vector3(),
    closestTri: new THREE.Vector3()
  };
}
function applyCapsuleCollision(capsule, capsuleInfo, collider, temps, skipTri, useDynamicsSegment = false) {
  const segment = useDynamicsSegment ? capsuleInfo.dynamicsSegment ?? capsuleInfo.segment : capsuleInfo.segment;
  temps.invMat.copy(collider.matrixWorld).invert();
  temps.localSeg.start.copy(segment.start).applyMatrix4(capsule.matrixWorld).applyMatrix4(temps.invMat);
  temps.localSeg.end.copy(segment.end).applyMatrix4(capsule.matrixWorld).applyMatrix4(temps.invMat);
  temps.localBox.makeEmpty();
  temps.localBox.expandByPoint(temps.localSeg.start).expandByPoint(temps.localSeg.end);
  temps.localBox.expandByScalar(capsuleInfo.radius);
  collider.geometry?.boundsTree?.shapecast({
    intersectsBounds: (box) => box.intersectsBox(temps.localBox),
    intersectsTriangle: (tri) => {
      const distance = tri.closestPointToSegment(temps.localSeg, temps.closestSeg, temps.closestTri);
      if (distance >= capsuleInfo.radius) return;
      const dir = temps.closestTri.clone().sub(temps.closestSeg).normalize();
      if (skipTri?.(tri, dir)) return;
      temps.localSeg.start.addScaledVector(dir, capsuleInfo.radius - distance);
      temps.localSeg.end.addScaledVector(dir, capsuleInfo.radius - distance);
    }
  });
  const newPos = temps.closestSeg.copy(temps.localSeg.start).applyMatrix4(collider.matrixWorld);
  const delta = temps.closestTri.subVectors(newPos, capsule.position);
  const offset = Math.max(0, delta.length() - 1e-5);
  capsule.position.add(delta.normalize().multiplyScalar(offset));
}
export {
  applyCapsuleCollision,
  createCollisionTemps
};
