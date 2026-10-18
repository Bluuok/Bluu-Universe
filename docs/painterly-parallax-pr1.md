# PR 1 — Painted sky depth layering

Scope: **visual atmosphere only**. Do not touch input, camera orientation,
flight physics, entry/exit transitions, or portfolio/book UI in this PR.

## Baseline (inspected against main, October 2026)

- The sky already uses the user's 6144x3072 panorama, a radius-550 sphere,
  194,000 instanced surface marks, 24,750 volume dust points and separate stars.
- Sculpted vortices and near-field paint already exist as real permeable volumes
  and swept/merged geometry. The goal is **not** to replace or duplicate them.
- The missing transition is a painterly *middle distance*: the far painted sky
  stays almost static while nearby 3D paint has more translational parallax.
  A 2.5D field is cheaper and more coherent than new manually modeled assets.

## Implementation

One mesh / one draw call / no new downloaded image, atlas, model or package:

1. Keep the original 6K panorama and its shared longitude seam/polar sampler.
2. Instance 3,600 tapered, six-segment ribbons on fixed world spherical shells
   at radii 245, 345 and 455 (behind reachable scenery, before radius 550).
3. Follow the panorama's local luminance *contours*, not a random radial ring;
   all sample the same texture and tint, and the central strip row has
   physical radial relief instead of always-flat camera-facing billboards.
4. Keep distant opacity highest, nearest opacity lowest; anti-alias bristle
   frequencies using screen-space derivatives during flight.
5. Reuse the existing texture-loading owner, room fade and resource cleanup;
   the layer has no camera/animation/physics authority.

The numbers are conservative aesthetic starting values, not a claim of final
colour or fidelity on every display. Config lives in AssetManifest.sky.parallax;
set enabled:false to compare without the new layer.

## Reference research (design references, not copied files)

- https://github.com/Victor-EU/the-world-of-van-gogh — MIT runtime;
  GPU-instanced painterly ribbons and a procedural sky flow field.
  Some Victor-EU code was already separately vendored in this project.
- https://github.com/Sekuta82/oil-on-threejs-template — MIT; painting
  marks as GPU-driven planes/points, rather than full model assets.
- https://github.com/CathyKernel/Animated-version-of-Van-Gogh-Starry-Night —
  MIT code; image segmentation/depth/parallax is a useful research route for
  future **offline asset preparation**, not a runtime ML requirement.
- https://threejs.org/docs/pages/InstancedBufferGeometry.html and
  https://threejs.org/docs/pages/InstancedBufferAttribute.html — official API.

The shader/ribbons in this PR were authored for Bluu-Universe based on
those ideas and the repository's own PaintedSkyStrokes/SkyShaders interface;
they are **not a verbatim extraction** of third-party source. Source assets
and their prior attribution/permissions remain unchanged. Permission to
reuse one project does not change the terms of another project's images.

## Local verification

```bash
npm ci
node tests/painterly-parallax-check.mjs
npm run build
```

Browser sign-off (not replaced by CPU tests): compare enabled/disabled using
the config flag, with identical spawn and camera route. Check front/side/back
of the astronaut, entry into the studio, sky seam and polar look angles,
flight near vortices and far from the studio, reduced motion, 390px viewport,
and low/integrated GPU. Inspect FPS, GPU overdraw and WebGL shader compile
errors; tune count/opacity before production if the layer gets too busy.

**Not claimed:** visual acceptance, screenshot comparison or browser FPS
passing without actually running these checks. PR 2 is project presentation
and transitions; PR 3 is mouse-look controller refactoring.
