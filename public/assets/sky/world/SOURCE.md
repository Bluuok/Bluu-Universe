# Shared 360-degree painterly star sea

This revision replaces localized painting cards with one fixed world environment
and actual volumetric world geometry. It does not claim the upstream Starry Night
demo was a 360-degree environment.

## New distant panorama

- File: `blue-gold-panorama.png`
- Created for this local portfolio with the session's ImageGen tool, 2026-10-06.
- Image size: 1774 × 887, 2:1 equirectangular composition.
- Bytes: 3,182,010.
- SHA-256: `0357bb0e805fdc6ce00599dd5c8406dae7a896cf4ed6c90d1a85a48a024c0c16`.
- The prompt requested rich ultramarine/cobalt, sea-salt blue and restrained
  antique gold, tactile oil brushwork, a continuous celestial panorama with no
  landscape, people, text, frames, repeated painting cards or dominant sun.
- The image bytes are unchanged. Longitude-edge blending and a polar UV chart
  with smooth blending happen only in the rendering shader, avoiding pole rings
  and pinching. This distant sphere is only the far layer;
  it is not presented as the source of near-space parallax.
- Only the panorama uses LinearFilter without mipmaps, avoiding implicit-UV
  derivative discontinuities at `atan` longitude wrapping. The upstream pigment
  keeps its normal filtering; no generic texture or renderer setting is changed.
- This is a generated project asset, not a downloaded model, CC0 pack or an
  alchaincyf asset. No paid asset or external publishing was used.

## Current alpha.7 user-provided 6K panorama, 2026-10-07

Active file: `blue-gold-panorama-v07-6k.png`. Directly copied, without changing
image bytes, from the user's supplied local result:
`C:/Users/ertstyuqk/Documents/Codex/2026-10-07/1-upscayl-2-3-real-esrgan/outputs/蓝金交织的星河画卷_UltraSharp_6144x3072.png`.

- Verified PNG dimensions: 6144 × 3072; bytes: 36,417,642.
- SHA-256: `dfb52f96469267b8e920f3111b40e2f64cfd1eb61644f6a2fb106fe9cff65e0a`.
- The user explicitly supplied this as the 6K replacement. Its filename/path
  identify an UltraSharp/upscayl result. The earlier local composition candidate
  `蓝金交织的星河画卷.png` is 1774 × 887, 3,542,270 bytes, SHA-256
  `ca5ea44a718056d63c021eda5a27b1962916ce511f3dcaf5a95bb08992d21b3d`.
  Do not describe the replacement as native 6K generation, recovered original
  detail, or a direct export from a verified generation platform. No detailed
  processing manifest or platform license was supplied; do not invent one.
- This asset is used locally for the authorized project. The older two project
  panoramas and the original licensed pigment remain byte-identical and kept
  as necessary source/recovery evidence. No asset was purchased or published.
- The replacement uses the same shared longitude/polar sampling and the same
  owned panorama texture for underpainting and distant brush details. The far
  painting has no collision/parallax; world-fixed cloud volumes, stars and
  VortexField remain separate. Browser evidence for this build is recorded in
  `tests/v07-review.json`; earlier v03-v06 results are historical.

## Actual 3D geometry

### v0.3 distant brush detail, 2026-10-06

At v0.3 the panorama was `blue-gold-panorama-v03.png`, an ImageGen edit/redraw
using this project's original panorama and the preserved upstream sky-only
painting as references. Exact selected output: 1774 × 887, 3,383,920 bytes,
SHA-256 `3f1c3432bf7e743c7c41ce49f7352e97e3b51040b428454283aa0cd1d0984146`.
The tool did NOT produce the requested 6144 × 3072: do not describe this as 6K,
super-resolution, or recovered original detail. Original panorama bytes remain
unchanged. No API-key fallback, paid asset or external deployment was used.

Mode: built-in ImageGen edit with two local references, opaque background.
Exact prompt:

> Use case: stylized-concept. Asset: a genuine high-resolution 360-degree equirectangular oil-painted celestial environment for an existing browser portfolio. EDIT/REDRAW the first reference panorama, not a UI screenshot. Reference 1 is the current approved blue/gold space color and continuous composition; reference 2 supplies authentic Van Gogh impasto stroke character, ONLY sky brushwork (exclude its cypress, village, hills and dominant moon). The current 1774x887 panorama becomes blurry when projected; redraw its brush marks and textures at a genuinely higher native resolution, requested 6144x3072 or the highest supported native 2:1 output. Do not merely upscale or sharpen blurry pixels. Preserve ultramarine/cobalt/sea-salt blue with restrained antique gold and creamy highlights, rich midtones, no neon or photorealistic nebula. Distinct sharply resolved impasto strokes with individual bristle ridges, layered directional oil paint, broad blue celestial currents with asymmetric organic bends, sparse warm stars embedded in strokes. No foggy blur, lens blur, depth-of-field, smooth plastic swirls, uniformly tiled motifs, dots marching in dashed spiral rings, or empty dark gaps. This is only the distant painting; no architecture, characters, floating islands or planets, no horizon, landscape, text, framing or UI. Compose ONE continuous full sphere, horizontal edges match in paint-flow/color, top/bottom spherical poles are calm irregular brushwork rather than concentric lines or polar rings. Keep the large blue/gold compositional balance of reference1. The final asset should read as an immersive Van Gogh painted star sea with crisp tactile brushwork when viewed in a 60 degree crop on a desktop. Output one flat opaque 2:1 environment map only.

`PaintedSkyStrokes.js` adds 14,000 broad and 180,000 fine native GPU brush
instances on the same radius-550 fixed-world distant surface. Three r161's
InstancedBufferGeometry/ShaderMaterial are directly used; brush shape, contour
orientation and bristle shaders are this project's new implementation, not a
claimed upstream brush engine. Pixel-frequency attenuation, varied spacing and
restrained relief address the independent review's repeated bright hatching.
The same panorama texture/mapping is shared with the underpainting and released
once. Depth testing allows opaque foreground objects to cover brush details.
The old mirrored seam feather created a symmetric V shape; the current shared
sampler advances both source-edge charts in the same direction and blends over
one continuous signed longitude interval. Diagnostic views and actual mouse
crossings verify this change; the low-resolution source limitation remains.
This is newly authored surface detail, not a reachable or collidable landscape;
the existing 24,750 volumetric dust and 3,210 world stars remain separate.
v0.3 render fixtures are diagnostic geometry views, not trusted player routes;
the three actual routes are recorded separately in `tests/v03-player-review.json`.

`src/scenes/StarfieldBackdrop.js` and `src/scenes/sky/SkyShaders.js` use the already
installed Three.js r161 MIT primitives: SphereGeometry, CatmullRomCurve3,
BufferGeometry, ShaderMaterial and Points. No extra runtime is installed.

Eleven world-fixed Gaussian curve volumes contain 24,750 paint-dust points. Their
normal/binormal cross-sections have width and depth, and span multiple elevations
and azimuths. Seven short near volumes at approximately 35–55 world-unit distance
make directional paint depth visible, with 0.75–2.8 unit brush seeds, genuine
cross-section thickness and blue/gold pigment variation. These seven nearby
volumes use additive light blending so their physical depth remains legible over
the distant painting; the four broader volumes retain normal pigment blending.
Three world star groups contain 2,600 distant stars, 130 near stars
and 480 clustered stars. All positions are seeded, deterministic and independent
of the camera. Depth testing against opaque architecture/props is enabled;
transparent dust does not write depth. Only star brightness changes over time.
The one environment and the same points remain present in SPACE and ROOM.

## v0.4-alpha.4 local VortexField

The representative macro form is locally authored code in
`src/scenes/sky/VortexField.js`, configured by `src/config/VortexManifest.js`.
It directly uses the installed Three r161 CatmullRomCurve3, BufferGeometry and
MeshStandardMaterial APIs; it is not an ImageGen output, a downloaded model,
or a port of the user video's unverified source.

Two world-fixed, depth-staggered closed swept cloud bodies have actual sides,
end caps and local volume bulges. Each body has 15,424 triangles. Cloud/halo
decoration is permeable; the 2.4-radius visual star core shares its transform
with a separately maintained 2.55-radius BVH proxy in CollisionManifest.
Character contacts and SPACE camera ray queries are exercised independently.
The finite world bounds are [-60,-35,-76] to [36,38,38], shrunk by the full
character capsule envelope rather than just the foot origin.

Vortex materials borrow the already loaded original `layer-夜空.png` texture.
StarfieldBackdrop remains its sole loader/disposal owner: no duplicate image
download or additional GPU texture. Small sky-only brush fragments use affine
random offsets with continuous interpolation and triplanar projection;
explicit continuous texture derivatives avoid crop-boundary mip artifacts.
This sampled upstream pigment keeps its existing CC BY-NC-SA 4.0 attribution
and the separately recorded user permission. Local geometry/shader authorship
does not change that license.

Pure-colour diagnosis established that the earlier transverse join was a
geometric thickness kink. Conservative smoothed bend limits and a gentler
wing depth path removed it in the checked views. Periodic reflected texture
sampling was also removed after its repeated wood-knot appearance was found
in actual play and independent review. Eye-to-player fading applies only to
permeable decoration; the solid core remains visible and collidable.

Current representative-stage build: index-B5HcTBbR.js, SHA-256
e15ebba3b374f22deb23dd647852e6cf9a6b3d7ebbe35f030b340b3235dba27e.
The three normal-spawn trusted keyboard/mouse routes and separate live star
contact/camera evidence are recorded in tests/v04-review.json. Earlier v0.3
records above remain historical surface-detail evidence and do not prove this
new macro form. Independent review permits retaining this representative
prototype; it does not certify the complete 360-degree macro composition,
all cloud-interior viewpoints, physical display color, or final user art.
The active panorama is still 1774x887; this geometry does not make it 6K.

## Unchanged upstream pigment texture

The dust samples small sky-only brush patches from the existing original
`public/assets/sky/candidates/layer-夜空.png`. It does not densely repeat the whole
painting on cards, render the source moon/cypress/village, or alter source bytes.

- Source: https://github.com/alchaincyf/3d-vibe-coding-handbook
- Release: `v260914c`; fixed tree `272a90ef84a078464dc277624267cb9b2dfe6449`.
- Existing file bytes: 6,159,983.
- SHA-256: `a77703e1cff496c9525d545b985610c9d545b953949178d93676754292d5016c`.
- README license: CC BY-NC-SA 4.0; user states author permission for their personal
  reuse. Keep that attribution and existing third-party notices. This permission
  is not broadened to unrestricted redistribution for everyone.
- Original painting attribution: Vincent van Gogh, 1889. Upstream layer concept:
  @HoodyLiu; book/demo author: alchaincyf / 花叔.

The old matching `layer-星月与旋涡.png` remains in candidates as a preserved source,
but this revision does not load it. The old six flat-layer material/layout/inertia
port is retired. See `candidates/source-manifest.json` for its historical audit;
its build marker does not describe this revision.
