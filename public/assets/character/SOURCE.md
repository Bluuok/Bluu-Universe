# Cute Astronaut — haefu

2026-10-14 runtime adaptation: the original GLB bytes and attribution remain unchanged. The adapter contracts 11 rear-outline vertices by at most 0.02367 world units, preserves topology/UV/skin bindings, and smooths 256 matching-skin seam normals with a 60-degree crease limit. No subdivision or new source model is claimed. Separate opaque nozzle barrels/lips follow the character fade and fit the retained collision envelopes.

- Original creator: [haefu](https://sketchfab.com/haefu)
- Original model: [Cute Astronaut](https://sketchfab.com/3d-models/cute-astronaut-816bd786fe8b4559a009de6a95582003)
- Original license: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/), also embedded in `asset.extras` in the GLB.
- User supplied the model and explicitly authorized publication of this project on GitHub on 2026-10-14. The original CC BY 4.0 attribution and license remain applicable.
- SHA-256: `0fc948127a889f64ed4659f74d084d998eb68acb92d7a892965a03edbea2905d`.

`astronaut.glb` is a byte-for-byte copy of the supplied file. Its 2048×2048 embedded PNG, geometry, 54-bone skeleton, original author animation and embedded attribution remain intact. There are 5,736 triangles, two skinned mesh primitives and two source materials (`Astronaut`, `visier`).

Local runtime changes are configured separately: cream plastic body and dark blue reflective visor PBR overrides; `float.animation.json` supplies a 4.8-second quiet four-bone shoulder/forearm loop based on the original bind pose. It changes no root translation, scale or leg proportions. The original walking action remains in the GLB but is not mapped to flight or idle.

Library download used the current official `library_file_transfer.py` unchanged. Windows lacks Python `os.setxattr`; a wrapper supplied NTFS alternate data streams so the official helper could apply and verify `user.library-file-id` and `user.library-file-version`. The original file retains those streams and `incoming/library-identity.json` records the same non-sensitive identity.

Asset identity and static parsing are verified. Integrated appearance remains subject to review of the actual running scene.
