// Adapted from CameraSystem.ts:344-359, three-player-controller v0.6.2.
// MIT, ca82bbc76a3b9b0afa80c73b60167adf6123b9b6. The caller supplies the
// active collider list instead of upstream ctrl/vehicle state. No camera writes.
export function closestCameraHit(raycaster, meshes) {
  let closest = null;
  for (const mesh of meshes) {
    const hits = raycaster.intersectObject(mesh, false);
    if (hits[0] && (!closest || hits[0].distance < closest.distance)) closest = hits[0];
  }
  return closest;
}
