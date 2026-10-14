import { Box3, MathUtils, Vector3 } from 'three';
import { ViewFraming } from '../config/ViewFraming.js';

const UP = new Vector3(0, 1, 0);
const vector = value => value?.isVector3 ? value.clone() : new Vector3(...value);
const box = value => value?.isBox3 ? value.clone() : new Box3(vector(value.min), vector(value.max));
const corners = bounds => Array.from({ length: 8 }, (_, i) => new Vector3(
  i & 1 ? bounds.max.x : bounds.min.x,
  i & 2 ? bounds.max.y : bounds.min.y,
  i & 4 ? bounds.max.z : bounds.min.z,
));

export class CameraDirector {
  constructor(camera, { focusOffset = [0, 0, 0], framing = {} } = {}) {
    this.camera = camera;
    this.focusOffset = vector(focusOffset);
    this.framing = { ...ViewFraming, ...framing };
    this.target = new Vector3(0, 2, 1);
    this.yaw = 0;
    this.pitch = 0.38;
    this.distance = 15;
    this.mode = 'SPACE';
    this.transition = null;
    this.viewport = { width: globalThis.innerWidth || 1440, height: globalThis.innerHeight || 960 };
    this._viewYaw = this.yaw;
    this._viewPitch = this.pitch;
    this._followCenter = null;
    this._fitDistance = 0;
    this._player = null;
    this._lastFit = null;
    this.avoidance = null;
    this.exploring = false;
    this._exploreBlend = 0;
    this._previousPlayer = null;
    this.camera.position.set(10, 7, 20);
    this.camera.up.copy(UP);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld(true);
  }

  setViewport(width, height) {
    this.viewport.width = Math.max(1, Number(width) || 1);
    this.viewport.height = Math.max(1, Number(height) || 1);
    this.camera.aspect = this.viewport.width / this.viewport.height;
    this.camera.updateProjectionMatrix();
  }

  setMode(mode) {
    if (mode !== this.mode) this.avoidance?.reset();
    if (mode === 'SPACE' && this.mode !== 'SPACE') {
      this.exploring=false;this._exploreBlend=0;this._previousPlayer=this._player?.clone()||null;
      const direction = this.camera.position.clone().sub(this.target).normalize();
      this._viewYaw = Math.atan2(direction.x, direction.z) - 0.47;
      this._viewPitch = Math.asin(MathUtils.clamp(direction.y, -1, 1));
      this.yaw=this._viewYaw;this.pitch=this._viewPitch;
      this._followCenter = null;
      this._fitDistance = 0;
    }
    this.mode = mode;
  }

  // Raw transitions retain the portal and project closeup coordinates.
  moveTo(position, target, duration = 1, onComplete = null) {
    this.transition = {
      from: this.camera.position.clone(), fromTarget: this.target.clone(),
      to: position.clone(), toTarget: target.clone(),
      duration: Math.max(0.001, duration), elapsed: 0, onComplete,
    };
  }

  snapToSpace(player) {
    this.avoidance?.reset();
    this.exploring = false;this._exploreBlend = 0;this._previousPlayer = vector(player);
    this.mode = 'SPACE';
    this.transition = null;
    const limits = this.framing.orbitLimits;
    this.yaw = limits.continuousYaw ? MathUtils.euclideanModulo(this.yaw + Math.PI, Math.PI * 2) - Math.PI : MathUtils.clamp(this.yaw, ...limits.yaw);
    this.pitch = MathUtils.clamp(this.pitch, ...limits.pitch);
    this._viewYaw = this.yaw;
    this._viewPitch = this.pitch;
    this._followCenter = null;
    this._fitDistance = 0;
    this.update(0, player);
  }

  getFlightReturnView(player,yaw,pitch) {
    const direction=new Vector3(Math.sin(yaw)*Math.cos(-pitch),Math.sin(-pitch),Math.cos(yaw)*Math.cos(-pitch));
    const focus=vector(player).add(new Vector3(0,this.framing.flight.focusHeight,0));
    const wasExploring=this.exploring;this.exploring=true;
    const view=this._fitView(this._playerBounds(player),direction,'SPACE',focus,this.framing.flight.distance);
    this.exploring=wasExploring;return view;
  }

  resumeFlightView(player,yaw,pitch) {
    this.setMode('SPACE');this.exploring=true;this._exploreBlend=1;
    this.yaw=yaw-.47;this.pitch=MathUtils.clamp(-pitch,-1.36,1.36);
    this._viewYaw=this.yaw;this._viewPitch=this.pitch;
    this._previousPlayer=vector(player);this._followCenter=null;this._fitDistance=0;
  }

  followHeading(yaw,pitch,active,propelling=false){
    this._pilotSteering=Boolean(active);
    if(this.mode!=='SPACE'||this.transition||!active)return;
    // Relative mouse look begins close follow without requiring translation.
    this.yaw=yaw-.47;this.pitch=MathUtils.clamp(-pitch,-1.36,1.36);
    this.exploring=true;
  }

  orbit(dx, dy) {
    if (this.mode !== 'SPACE' || this.transition) return;
    if (dx || dy) this.exploring = true;
    const limits = this.framing.orbitLimits;
    const requestedYaw = this.yaw - dx * 0.003;
    this.yaw = limits.continuousYaw ? MathUtils.euclideanModulo(requestedYaw + Math.PI, Math.PI * 2) - Math.PI : MathUtils.clamp(requestedYaw, ...limits.yaw);
    this.pitch = MathUtils.clamp(this.pitch + dy * 0.002, ...limits.pitch);
  }

  getSafeRect(kind = 'SPACE') {
    const { width: w, height: h } = this.viewport;
    if (kind === 'SPACE') {
      if (w >= 800) {
        const r = this.exploring ? this.framing.desktopFlight : this.framing.desktopSpace;
        return { left: r.left * w, right: r.right * w, top: r.top * h, bottom: r.bottom * h };
      }
      return { left: 16, right: w - 16, top: Math.min(260, h * 0.32), bottom: Math.min(610, h * 0.74) };
    }
    const m = this.framing.roomMargins;
    return { left: m.left, right: w - m.right, top: m.top,
      bottom: h - (w < 800 ? m.mobileBottom : m.bottom) };
  }

  getFramingBounds(kind = 'SPACE', player = null) {
    if (kind === 'SPACE' && this.exploring && player) return this._playerBounds(player);
    const bounds = box(kind === 'SPACE' ? this.framing.spaceBounds : this.framing.roomBounds);
    if (kind === 'SPACE' && player) bounds.union(this._playerBounds(player));
    return bounds;
  }

  _playerBounds(player) {
    const position = vector(player), extents = this.framing.characterExtents;
    return new Box3(vector(extents.min).add(position), vector(extents.max).add(position));
  }

  // Pure calculation: keep the anchor's viewing direction and fit the complete
  // bounds to the usable screen rectangle. Calling this never moves the camera.
  getFramedView(position, target, { kind = 'ROOM', player = null } = {}) {
    if (kind !== 'SPACE' && kind !== 'ROOM') return { position: vector(position), target: vector(target) };
    const direction = vector(position).sub(vector(target));
    const bounds = this.getFramingBounds(kind, player);
    const center = bounds.getCenter(new Vector3());
    if (kind === 'SPACE') center.add(this.focusOffset);
    return this._fitView(bounds, direction, kind, center);
  }

  getFramedProjectView(position, target, bounds, panel) {
    const { width: w, height: h } = this.viewport;
    const gap = 24;
    // Desktop panels sit at the right; the retained narrow layout puts the
    // panel below the subject. Use real CSS geometry rather than a second
    // camera or a duplicate breakpoint/panel-width calculation.
    const safeRect = panel.left > w * .25
      ? { left: 24, right: panel.left-gap, top: 112, bottom: h-76 }
      : { left: 16, right: w-16, top: 94, bottom: panel.top-16 };
    // A nearly full-width/height panel leaves no useful subject rectangle.
    // Preserve the safe authored view instead of shrinking the subject to a
    // speck by inventing a 32px fit area.
    if(safeRect.right-safeRect.left<120||safeRect.bottom-safeRect.top<120)
      return {position:vector(position),target:vector(target)};
    return this._fitView(box(bounds).expandByScalar(.22),
      vector(position).sub(vector(target)), 'PROJECT', undefined, 0, safeRect);
  }

  _fitView(bounds, direction, kind, center = bounds.getCenter(new Vector3()), minimumDistance = 0, customRect = null) {
    const n = direction.clone();
    if (n.lengthSq() < 1e-10) n.set(1, 0.5, 1);
    n.normalize();
    const right = new Vector3().crossVectors(UP, n).normalize();
    if (right.lengthSq() < 1e-10) right.set(1, 0, 0);
    const up = new Vector3().crossVectors(n, right).normalize();
    const { width: w, height: h } = this.viewport;
    const safeRect = customRect || this.getSafeRect(kind);
    const l = safeRect.left * 2 / w - 1, r = safeRect.right * 2 / w - 1;
    const t = 1 - safeRect.top * 2 / h, b = 1 - safeRect.bottom * 2 / h;
    const tanV = Math.tan(MathUtils.degToRad(this.camera.getEffectiveFOV()) / 2);
    const tanH = tanV * this.camera.aspect;
    const points = corners(bounds).map(point => {
      point.sub(center);
      return { x: point.dot(right), y: point.dot(up), z: point.dot(n) };
    });
    const min = fn => Math.min(...points.map(fn));
    const max = fn => Math.max(...points.map(fn));
    // Every perspective corner imposes a linear interval on the aim shift.
    // Intersecting those intervals gives the minimum distance, including depth.
    const requiredDistance = Math.max(
      max(p => p.z) + this.camera.near + 0.1,
      (max(p => p.x + r * tanH * p.z) - min(p => p.x + l * tanH * p.z)) / ((r - l) * tanH),
      (max(p => p.y + t * tanV * p.z) - min(p => p.y + b * tanV * p.z)) / ((t - b) * tanV),
    ) + 0.001;
    const distance = Math.max(requiredDistance, minimumDistance);
    const shiftX = MathUtils.clamp(-(l + r) * 0.5 * tanH * distance,
      max(p => p.x - r * tanH * (distance - p.z)), min(p => p.x - l * tanH * (distance - p.z)));
    const shiftY = MathUtils.clamp(-(t + b) * 0.5 * tanV * distance,
      max(p => p.y - t * tanV * (distance - p.z)), min(p => p.y - b * tanV * (distance - p.z)));
    const target = center.clone().addScaledVector(right, shiftX).addScaledVector(up, shiftY);
    return { position: target.clone().addScaledVector(n, distance), target,
      distance, requiredDistance, bounds, safeRect };
  }

  _projectBounds(bounds) {
    const { width: w, height: h } = this.viewport;
    const projected = corners(bounds).map(point => {
      point.project(this.camera);
      return { x: (point.x * 0.5 + 0.5) * w, y: (-point.y * 0.5 + 0.5) * h, z: point.z };
    });
    return { left: Math.min(...projected.map(p => p.x)), right: Math.max(...projected.map(p => p.x)),
      top: Math.min(...projected.map(p => p.y)), bottom: Math.max(...projected.map(p => p.y)), corners: projected };
  }

  getTelemetry() {
    const kind = this.mode === 'SPACE' ? 'SPACE' : this.mode === 'ROOM' ? 'ROOM' : null;
    const bounds = kind ? this.getFramingBounds(kind, this._player) : null;
    return { mode: this.mode, viewport: { ...this.viewport }, safeRect: kind ? this.getSafeRect(kind) : null,
      navigationMode: this.exploring ? 'CHARACTER_FOLLOW' : 'STUDIO_OVERVIEW',requestedOrbit:{yaw:this.yaw,pitch:this.pitch},
      projectedBounds: bounds ? this._projectBounds(bounds) : null,
      playerBounds: kind === 'SPACE' && this._player ? this._projectBounds(this._playerBounds(this._player)) : null,
      avoidance: this.avoidance?.telemetry || null,
      lastFit: this._lastFit ? { kind: 'SPACE', distance: this._lastFit.distance,
        bounds: { min: this._lastFit.bounds.min.toArray(), max: this._lastFit.bounds.max.toArray() } } : null };
  }

  update(dt, player) {
    dt = Math.max(0, Math.min(dt || 0, 0.25));
    if (player) this._player = vector(player);
    if (this.transition) {
      const t = this.transition;
      t.elapsed += dt;
      const p = Math.min(1, t.elapsed / t.duration), ease = p * p * (3 - 2 * p);
      this.camera.position.lerpVectors(t.from, t.to, ease);
      this.target.lerpVectors(t.fromTarget, t.toTarget, ease);
      if (p === 1) {
        this.transition = null;
        t.onComplete?.();
        if (this.mode === 'SPACE') {
          const direction = this.camera.position.clone().sub(this.target).normalize();
          this._viewYaw = Math.atan2(direction.x, direction.z) - 0.47;
          this._viewPitch = Math.asin(MathUtils.clamp(direction.y, -1, 1));
      this.yaw=this._viewYaw;this.pitch=this._viewPitch;
          this._followCenter = null;
          this._fitDistance = 0;
        }
      }
    } else if (this.mode === 'SPACE') {
      const limits = this.framing.orbitLimits;
      this.yaw = limits.continuousYaw ? MathUtils.euclideanModulo(this.yaw + Math.PI, Math.PI * 2) - Math.PI : MathUtils.clamp(this.yaw, ...limits.yaw);
      this.pitch = MathUtils.clamp(this.pitch, ...limits.pitch);
      const blend = 1 - Math.exp(-(this.exploring || this._pilotSteering ? 5 : 4) * dt);
      const yawDelta = MathUtils.euclideanModulo(this.yaw - this._viewYaw + Math.PI, Math.PI * 2) - Math.PI;
      this._viewYaw = this._pilotSteering ? this.yaw : this._viewYaw + yawDelta * blend;
      this._viewPitch = this._pilotSteering ? this.pitch : MathUtils.lerp(this._viewPitch, this.pitch, blend);
      const angle = 0.47 + this._viewYaw, pitch = this._viewPitch;
      const direction = new Vector3(Math.sin(angle) * Math.cos(pitch), Math.sin(pitch), Math.cos(angle) * Math.cos(pitch));
      if(this._previousPlayer&&this._player.distanceToSquared(this._previousPlayer)>1e-7)this.exploring=true;
      this._previousPlayer=this._player.clone();
      this._exploreBlend=MathUtils.lerp(this._exploreBlend,this.exploring?1:0,1-Math.exp(-7*dt));
      const bounds = box(this.framing.spaceBounds).union(this._playerBounds(this._player));
      const focus = bounds.getCenter(new Vector3()).add(this.focusOffset);
      if (!this._followCenter) this._followCenter = focus;
      else this._followCenter.lerp(focus, blend);
      let view = this._fitView(bounds, direction, 'SPACE', this._followCenter);
      // Expand immediately to keep every corner; settle inward with light inertia.
      this._fitDistance = Math.max(view.requiredDistance,
        MathUtils.lerp(this._fitDistance, view.requiredDistance, 1 - Math.exp(-3.2 * dt)));
      const viewForDirection = safeDirection => {
        const wide=this._fitView(bounds,safeDirection,'SPACE',this._followCenter,this._fitDistance);
        if(this._exploreBlend<.001)return wide;
        const focus=this._player.clone().add(new Vector3(0,this.framing.flight.focusHeight,0));
        const follow=this._fitView(this._playerBounds(this._player),safeDirection,'SPACE',focus,this.framing.flight.distance);
        return {...follow,position:wide.position.clone().lerp(follow.position,this._exploreBlend),target:wide.target.clone().lerp(follow.target,this._exploreBlend)};
      };
      view = viewForDirection(direction);
      if (this.avoidance && this._player) view = this.avoidance.resolve(view, this._player,viewForDirection, dt, this.camera.position);
      this.distance = view.position.distanceTo(view.target);
      this._lastFit = view;
      this.camera.position.copy(view.position);
      this.target.copy(view.target);
    }
    this.camera.up.copy(UP);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld(true);
  }
}
