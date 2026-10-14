# Starry Night reused textures

Original layered painted PNGs from https://github.com/alchaincyf/3d-vibe-coding-handbook, by alchaincyf / 花叔. Original filenames are preserved. Original painting is credited in the upstream demo to Vincent van Gogh, 1889; layering concept to @HoodyLiu.

Upstream README declares CC BY-NC-SA 4.0: https://creativecommons.org/licenses/by-nc-sa/4.0/. The user states prior author permission for this user’s personal reuse in the independent local portfolio. This does not grant unrestricted redistribution or permissions to other users. Keep original attribution and upstream/third-party license obligations.

Both files are 2048×1621 RGBA8 PNGs on the same pixel canvas; preserve matching crop/UV transforms when layering. The sky retains a left cypress and large upper-right moon, while its lower village/hills region is transparent. It is not seamless and not a 360-degree/equirectangular sky. Original paths, hashes, alpha measurements and demo alignment are in source-manifest.json.

Active use — build index-DKpZJTzf.js: StarfieldBackdrop now ports the applicable upstream LAYERS, makePlane, shared-canvas crop/aspect alignment, groups/renderOrder and layer-z inertia. Three fixed world frames each contain the matching sky/stars pair, for six instances sharing the two original PNGs. They are not the original five-layer scene. The village/cypress Tripo GLBs remain vendor references and are not active public assets.

Upstream material behavior is preserved: white MeshBasicMaterial, SRGB textures, transparent/DoubleSide, depthWrite=false and toneMapped=false. The original PNG bytes and shared textures are retained; no RGB tint/painting shader or separately recolored Texture clones are used. Project adaptations are fixed world frames, dt-equivalent depth inertia and a 256×256 scalar coverage DataTexture alphaMap using independent uv1/channel=1 for edge/quiet-area masking. The mask contains no painted RGB content. Original z = i*.0022 + L.z*expandNow*2.05 is scaled by frame width/4; the adapted depth target varies gently around .06±.02 at speed .18.

Frame crop and size: main [.29,.04,.49,.61], 124×122.182358; door [.44,.06,.27,.19], 180×100.2572; window [.41,.04,.29,.18], 160×78.6045. Each frame's two layers share identical crop, aspect and coverage. The frames stay fixed across camera motion and SPACE/ROOM transitions.

The portfolio keeps one Three r161 engine and camera owner. It uses direct renderer.render with ACES exposure .85 for PBR/RoomBasic materials, while the sky remains toneMapped=false. Upstream standalone renderer/camera/OrbitControls/UI/timers are not ported. The earlier custom color/crop shader was a historical v1 adaptation and is no longer active. No ImageGen assets were used. The build passed; runtime tests and integrated pixel/visual acceptance are still pending.

Reference code and full source package: vendor/starry-night-reference/package/10-demo-星月夜/星月夜/index.html. Source README declares CC BY-NC-SA 4.0 for the book/assets; bundled Three.js and Meshopt code retain their MIT notices. The official v260914c package and all 16 package checksums were verified.
