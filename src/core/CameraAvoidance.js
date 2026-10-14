import { Quaternion, Raycaster, Vector3 } from 'three';
import { closestCameraHit } from '../vendor/hh-hang/cameraRaycast.js';

// Collision queries are separate from the character capsule solver. This
// module only calculates a safe view; CameraDirector remains the sole writer.
const UP = new Vector3(0, 1, 0);
export class CameraAvoidance {
  constructor(getMeshes, { radius = .30, focusHeight = 1.0 } = {}) {
    this.getMeshes = getMeshes;
    this.radius = radius;
    this.focusHeight = focusHeight;
    this.ray = new Raycaster();
    this.ray.firstHitOnly = true;
    this.direction = null;
    this.telemetry = null;
    this.preferred = null;this.recovering = false;
  }
  hit(from, to, meshes, radius = this.radius) {
    const delta = to.clone().sub(from), length = delta.length();
    if (length < 1e-6) return null;
    const forward = delta.divideScalar(length);
    const right = new Vector3().crossVectors(forward, UP);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const up = new Vector3().crossVectors(right, forward).normalize();
    let nearest = null;
    // Near-plane clearance, with central plus four parallel offset rays.
    for (const offset of [new Vector3(), right.clone().multiplyScalar(radius), right.clone().multiplyScalar(-radius), up.clone().multiplyScalar(radius), up.clone().multiplyScalar(-radius)]) {
      this.ray.set(from.clone().add(offset), forward);
      this.ray.near = 0; this.ray.far = length;
      const hit = closestCameraHit(this.ray, meshes);
      if (hit && (!nearest || hit.distance < nearest.distance)) nearest = hit;
    }
    return nearest;
  }
  resolve(desired, player, viewForDirection, dt, previousCamera) {
    const meshes = this.getMeshes();
    const focus = player.clone().add(new Vector3(0, this.focusHeight, 0));
    const bodySamples=[focus,player.clone().add(new Vector3(0,.05,0)),player.clone().add(new Vector3(0,1.95,0))];
    const bodyHits=position=>bodySamples.map((from,i)=>this.hit(from,position,meshes,i===0?this.radius:.18));
    const viewHit=position=>bodyHits(position).find(Boolean)||null;
    const preferred = desired.position.clone().sub(desired.target).normalize();
    const yaw = Math.atan2(preferred.x, preferred.z), pitch = Math.asin(preferred.y);
    const directionAt = (y, p) => new Vector3(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p));
    const blocked = viewHit(desired.position);
    let chosen = preferred, view = desired, found = !blocked;
    if (blocked) {
      const candidates = [];
      // Build vertical and azimuth alternatives together. Picking every pitch
      // alternative first allowed a clear but near-vertical view to win over a
      // much smaller turn around the studio, putting its underside on screen.
      for (const offset of [.20, -.20, .40, -.40, .64, -.64, .92, -.92]) {
        candidates.push(directionAt(yaw, Math.max(-1.47, Math.min(1.47, pitch + offset))));
      }
      candidates.push(directionAt(yaw,1.47),directionAt(yaw,-1.47));
      for (const offset of [.32, -.32, .64, -.64, .96, -.96, 1.28, -1.28, 1.60, -1.60, 2.1, -2.1, Math.PI]) {
        candidates.push(directionAt(yaw + offset, pitch));
      }
      const candidateScore = d => {
        const angle = Math.acos(Math.max(-1, Math.min(1, d.dot(preferred))));
        const candidatePitch = Math.asin(Math.max(-1, Math.min(1, d.y)));
        // Only penalise extremity introduced by avoidance. A user-requested
        // high/low orbit remains valid and is judged by angular deviation.
        const introducedExtreme = Math.max(0,
          Math.abs(candidatePitch) - Math.max(Math.abs(pitch), 1.10));
        const continuity = this.direction ? .08 * (1 - d.dot(this.direction)) : 0;
        return angle + introducedExtreme * .55 + continuity;
      };
      candidates.sort((a, b) => {
        return candidateScore(a) - candidateScore(b);
      });
      let firstClear = null, selected = null;
      for (const candidate of candidates) {
        const candidateView = viewForDirection(candidate);
        if (!viewHit(candidateView.position)) {
          const clear = { direction: candidate, view: candidateView };
          firstClear ||= clear;
          if (!previousCamera || !this.direction || !this.hit(previousCamera, candidateView.position, meshes)) {
            selected = clear; break;
          }
        }
      }
      // If possible, choose a clear endpoint that the camera can also reach
      // without sweeping through a solid. This prevents an old clear direction
      // from pinning the camera on the wrong side of the studio.
      selected ||= firstClear;
      if (selected) { chosen = selected.direction; view = selected.view; found = true; }
    }
    // Free steering is filtered once in CameraDirector. Smooth only an actual
    // avoidance detour and its recovery, while retaining every clearance query.
    if (blocked) this.recovering = true;
    if (this.direction && found && this.recovering) {
      const recoveryStart = this.direction.clone();
      // Carry deliberate pilot turns through immediately; damp only the old
      // obstacle offset, so a continuing turn cannot trap recovery in a lag.
      if (!blocked && this.preferred) recoveryStart.applyQuaternion(new Quaternion().setFromUnitVectors(this.preferred, preferred));
      const smooth = recoveryStart.lerp(chosen, 1 - Math.exp(-10 * Math.max(dt, 0))).normalize();
      const smoothView = viewForDirection(smooth);
      if (!viewHit(smoothView.position)) { chosen = smooth; view = smoothView; }
      // Keep the newly ranked clear endpoint when the interpolation itself is
      // obstructed. Reusing lastView here can lock the camera indefinitely in
      // an obsolete vertical detour while the requested orbit is already clear.
    }
    // Sweep the actual camera independently; don't cross a solid between two
    // clear endpoints. Scripted open-door transitions have their own path.
    const sweep = previousCamera && this.direction ? this.hit(previousCamera, view.position, meshes) : null;
    let safetyReframe = false;
    if (sweep) {
      const movement = view.position.clone().sub(previousCamera).normalize();
      const clipped = previousCamera.clone().addScaledVector(movement, Math.max(0, sweep.distance - this.radius - .05));
      if (!viewHit(clipped)) view = { ...view, position: clipped };
      else {
        // A stopped camera can become hidden by the moving studio silhouette.
        // Try a clear vertical detour from its actual position before correcting
        // to the already checked view. Never keep a clipped, obscured endpoint.
        const oldDirection = previousCamera.clone().sub(focus).normalize();
        const oldYaw = Math.atan2(oldDirection.x, oldDirection.z);
        const oldPitch = Math.asin(oldDirection.y);
        let detour = null;
        for (const offset of [.2,-.2,.4,-.4,.7,-.7,1.1,-1.1]) {
          const d = directionAt(oldYaw,Math.max(-1.47,Math.min(1.47,oldPitch+offset)));
          const candidate = viewForDirection(d);
          if (!viewHit(candidate.position) && !this.hit(previousCamera,candidate.position,meshes)) {detour=candidate;chosen=d;break;}
        }
        if(detour){view=detour;this.recovering=true;}
        else safetyReframe=true;
      }
    }
    this.direction = chosen.clone();
    this.preferred = preferred.clone();
    if (!blocked && this.direction.angleTo(preferred) < .025) this.recovering = false;
    const remaining = bodyHits(view.position);
    this.telemetry = { integrated: true, method: 'active-BVH-eye-clearance-and-body-samples', mode: 'SPACE',
      radius: this.radius, focus: focus.toArray(), desiredPosition: desired.position.toArray(),
      resolvedPosition: view.position.toArray(), obstruction: blocked ? { distance: blocked.distance, group: blocked.object.name } : null,
      adjusted: Boolean(blocked || sweep), lineOfSightClear: remaining.every(hit=>!hit),
      bodySightlines:{centre:!remaining[0],feet:!remaining[1],head:!remaining[2]},
      cameraSweepBlocked: Boolean(sweep),safetyReframe,
      scope: 'SPACE view; three body-height samples with separate eye clearance; confirmed doorway and cutaway ROOM/PROJECT use authored camera paths',
      source: 'adapted closest-hit collection from hh-hang CameraSystem.ts:344-359; local clearance/reframing' };
    return view;
  }
  reset() { this.direction = null; this.telemetry = null; this.recovering = false; this.preferred = null; }
}
