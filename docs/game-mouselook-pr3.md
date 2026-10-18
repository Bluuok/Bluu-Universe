# PR 3 — Game-style mouse look: single input owner

## Goal

WASD, vertical movement, braking and the existing collision/camera avoidance
must be unchanged. Mouse movement should behave like a browser 3D game:

- Click **开始操控**, or click blank scene, to capture the pointer.
- Locked **mousemove.movementX/Y** rotates immediately, independent of
  screen edges; releasing the mouse position should never keep turning.
- W/S/A/D and Space/Shift continue while the mouse turns.
- Esc exits pointer lock and pauses; after release, hold **right mouse** and
  drag to look. Left drag is reserved for scene selection, not flight heading.
- Mode transitions, blur and pointer capture failures clean up listeners and
  transient drag state predictably.

## Source review and root cause

The old implementation used several overlapping event authorities:

1. `Interaction` listened to `pointermove` for both selection hover and
   locked game look, while also using any-button drag for steering.
2. `main.js` listened separately to `pointerlockchange` and unconditionally
   called `controller.clear()`; this clears **pressed WASD keys, velocity,
   steering and thrust**, even on successful lock acquisition.
3. UI **pointerover** also called `controller.clear()`, so hovering a button
   could kill movement without any genuine pause or navigation action.
4. Right-drag pointer capture, selection raycast and pointer lock were mixed
   into one dense event handler. Transient states could be reset by unrelated
   pointer events.

The existing `CameraDirector` intentionally owns camera framing/obstacle
avoidance. `SpaceController` owns heading and flight kinematics. Neither
needs a new camera library or full rewrite to fix input arbitration.

## Design

- New `FlightLookInput` exclusively owns Pointer Lock and unlocked RMB drag.
  Locked mouse motion uses `document.mousemove` **once**; fallback uses
  captured `canvas.pointermove` coordinate deltas, never both.
- `Interaction` only handles hover and left-click selection. A left drag
  cancels click selection and **cannot** steer.
- The main entry point wires flight input to existing
  `SpaceController.lookDelta` and keeps `CameraDirector.followHeading`,
  scene bounds, acceleration, collision and project/room routing intact.
- Capture **acquisition** no longer calls `controller.clear()`. Hovering UI
  only ends an active fallback drag; explicit UI activation or actual pause
  still clears flight input to avoid sticking a held key.
- Releasing mouse capture (including Esc) pauses via the existing
  `pauseFlight` state. User can restart with the same visible control.
- `dispose()` detaches listeners; tests can supply fake document/window
  targets to prove ownership and state cleanup.

## Reference decisions

- Three.js [PointerLockControls](https://threejs.org/docs/pages/PointerLockControls.html):
  direct relative movement, continuous yaw and clamped pitch were the model.
  It was **not** instantiated because that addon writes the camera transform
  directly, violating the project's one-writer CameraDirector contract.
- [MDN Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API):
  lock state belongs to `document.pointerLockElement`; locked movement is
  measured in `mousemove.movementX/Y`, and Escape can release it. It is a
  user-activation-restricted API, so request is initiated before any await.
- The existing vendored `hh-hang/three-player-controller` is kept for
  collision helpers; its camera controller is **not** added as a second
  authority.

All new source is written for this codebase; no upstream code files copied.
There are no new runtime dependencies, third-party assets or license changes.

## Test plan

```bash
npm ci
node tests/flight-look-input-check.mjs
npm run build
npx playwright install chromium
node tests/flight-mouselook-browser-check.mjs
```

The unit test asserts unlocked/locked motion separation, exact sensitivity,
yaw wrap, pitch clamp, no continuing turn after movement stops, RMB cancellation,
key/velocity continuity, blur cleanup and detach. The browser smoke test uses
real Chromium's button, mouse, keyboard and Escape from a clean page and reads
the existing read-only `starhaven` telemetry.

Manual acceptance still required: Windows native Chrome, different mouse
sensitivities/DPI, rapid Esc/relock, clicking UI while holding W, room/project
return, near-obstacle camera avoidance and 390px viewport. CPU and headless
checks do not establish subjective game feel or cross-GPU performance.

PR1 and PR2 are intentionally untouched. This branch starts from main.
