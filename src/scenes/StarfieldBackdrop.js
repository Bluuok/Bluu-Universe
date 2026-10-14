import * as THREE from 'three';
import {sampleSpiralCluster} from './sky/SpiralCluster.js';
import {
  environmentVertex, environmentFragment, dustVertex, dustFragment,
  starVertex, starFragment,
} from './sky/SkyShaders.js';
import {createPaintedSkyStrokes} from './sky/PaintedSkyStrokes.js';

/** One fixed, shared world sky. No camera, renderer or second animation loop.
 * The old localized six painting cards are retired. A newly generated seamless
 * panorama supplies the distant environment; curved *volumes* of paint dust,
 * distributed world stars and star clusters supply actual translation parallax.
 * Three r161 Points/BufferGeometry/CatmullRomCurve3 are the geometry primitives.
 * The unchanged original PNG is sampled only as small pigments in the dust:
 * alchaincyf/3d-vibe-coding-handbook v260914c, CC BY-NC-SA 4.0 + user's permission.
 * Asset origins and checksums: public/assets/sky/world/SOURCE.md.
 */
export const UPSTREAM_SKY_LAYERS = Object.freeze([
  Object.freeze({ id: 'sky', z: 0, tex: '/assets/sky/candidates/layer-夜空.png' }),
  Object.freeze({ id: 'stars', z: .11, tex: '/assets/sky/candidates/layer-星月与旋涡.png' }),
]);

const DEFAULTS = {
  center: [-.53, 2, 1], radius: 550, seed: 2809,
  panorama: { url: '/assets/sky/world/blue-gold-panorama-v07-6k.png', intensity: .72, longitude: .16 },
  pigment: { url: UPSTREAM_SKY_LAYERS[0].tex },
  dust: { count: 24750, strength: 1 },
  stars: { distant: 2600, nearby: 130, clusters: 480 },
  brushes: { coarse: 14000, fine: 180000, radius: 550, seed: 3203,
    coarseSize: [13, 28, 3, 7], fineSize: [3, 9, .8, 2.6] },
  bands: [
    { id: 'azure-river', color: '#82b7d0', count: 6800, width: 8.5, depth: 7,
      points: [[-105,-12,-130],[-60,36,-98],[-8,62,-76],[65,43,-94],[126,14,-38],[92,-28,45],[20,-47,98]] },
    { id: 'high-tide', color: '#619ac5', count: 5900, width: 10, depth: 9,
      points: [[110,72,110],[20,94,110],[-63,74,75],[-116,25,18],[-92,-36,-48],[-15,-76,-107],[82,-60,-85]] },
    { id: 'gold-current', color: '#d6ba78', count: 3700, width: 5.6, depth: 6,
      points: [[-140,-70,95],[-105,-80,140],[-15,-54,165],[100,-18,135],[165,55,90],[90,90,120]] },
    { id: 'near-filament', color: '#b3ccd7', count: 2400, width: 4.4, depth: 4.5, alphaScale: 1.5,
      points: [[-64,-10,-52],[-42,-27,-62],[-8,-36,-70],[35,-30,-61],[65,-9,-43]] },
    { id: 'near-front-brush', color: '#9fc5d8', gold: .24, count: 850, width: 3, depth: 3.8,
      size: [.75, 2.8], opacity: .30, fleckOpacity: .38, luminous: false, pigmentStrength: .60,
      points: [[-33,15,-36],[-18,27,-40],[4,24,-45],[25,10,-38]] },
    { id: 'near-low-brush', color: '#82b4ce', gold: .15, count: 850, width: 3.4, depth: 3.2,
      size: [.75, 2.8], opacity: .30, fleckOpacity: .38, luminous: false, pigmentStrength: .60,
      points: [[25,-24,-32],[4,-30,-41],[-15,-24,-45],[-33,-17,-38]] },
    { id: 'near-back-brush', color: '#abc6d5', gold: .40, count: 850, width: 3.5, depth: 3.6,
      size: [.75, 2.8], opacity: .30, fleckOpacity: .38, luminous: false, pigmentStrength: .60,
      points: [[-33,14,40],[-12,25,44],[12,18,46],[30,7,35]] },
    { id: 'near-right-brush', color: '#91bed5', gold: .24, count: 850, width: 3.2, depth: 3.5,
      size: [.75, 2.8], opacity: .30, fleckOpacity: .38, luminous: false, pigmentStrength: .60,
      points: [[42,-16,-20],[45,6,-5],[39,25,18],[35,28,35]] },
    { id: 'near-left-brush', color: '#a5bdd0', gold: .37, count: 850, width: 3.2, depth: 3.8,
      size: [.75, 2.8], opacity: .30, fleckOpacity: .38, luminous: false, pigmentStrength: .60,
      points: [[-36,-15,31],[-39,9,12],[-43,24,-8],[-38,12,-29]] },
    { id: 'near-above-brush', color: '#93bbd1', gold: .22, count: 850, width: 3.3, depth: 3.5,
      size: [.75, 2.8], opacity: .30, fleckOpacity: .38, luminous: false, pigmentStrength: .60,
      points: [[-26,41,-28],[-6,49,-7],[13,47,13],[30,39,20]] },
    { id: 'near-below-brush', color: '#9fbed0', gold: .35, count: 850, width: 3.3, depth: 3.5,
      size: [.75, 2.8], opacity: .30, fleckOpacity: .38, luminous: false, pigmentStrength: .60,
      points: [[-26,-35,-22],[-7,-44,0],[18,-39,17],[30,-25,20]] },
  ],
  starClusters: [
    { center: [-75,34,-91], spread: [7,5,9], color: '#ffe3a0' },
    { center: [68,48,-100], spread: [9,6,7], color: '#bddcef' },
    { center: [96,-25,80], spread: [8,5,8], color: '#e7c27e' },
    { center: [-80,-57,93], spread: [7,7,9], color: '#b1cfe4' },
    { center: [15,87,90], spread: [8,5,8], color: '#f2d294' },
    { center: [-18,-81,-78], spread: [7,6,8], color: '#85b9d9' },
  ],
};

function randomGenerator(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
function gaussian(random) {
  return Math.sqrt(-2 * Math.log(Math.max(random(), .000001))) * Math.cos(random() * Math.PI * 2);
}
function uri(path) { try { return encodeURI(decodeURI(path)); } catch { return encodeURI(path); } }
function vector(value) { return new THREE.Vector3(...value); }
function attribute(data, size) { return new THREE.Float32BufferAttribute(data, size); }
function viewportHeight() { return (globalThis.innerHeight || 960) * Math.min(globalThis.devicePixelRatio || 1, 2); }

export class StarfieldBackdrop {
  constructor({ scene, manifest = {} } = {}) {
    this.config = { ...DEFAULTS, ...manifest,
      panorama: { ...DEFAULTS.panorama, ...manifest.panorama },
      pigment: { ...DEFAULTS.pigment, ...manifest.pigment },
      dust: { ...DEFAULTS.dust, ...manifest.dust },
      brushes: { ...DEFAULTS.brushes, ...manifest.brushes },
      stars: typeof manifest.stars === 'object' ? { ...DEFAULTS.stars, ...manifest.stars } : DEFAULTS.stars,
      bands: manifest.bands || DEFAULTS.bands, starClusters: manifest.starClusters || DEFAULTS.starClusters };
    this.group = new THREE.Group(); this.group.name = 'SharedThreeDimensionalStarSea';
    this.ownedTextures = new Set(); this.loadErrors = []; this.loaded = false;
    this.loader = new THREE.TextureLoader(); this.dustVolumes = []; this.starFields = [];
    this.expandNow = 0; this.expandTarget = 0; // retained callable API, no old-card displacement
    this.random = randomGenerator(this.config.seed);
    this.makeEnvironment();
    this.brushwork = createPaintedSkyStrokes(this.config.brushes, this.config.panorama);
    this.brushwork.position.set(...this.config.center); this.group.add(this.brushwork);
    const configuredDust = this.config.bands.reduce((sum, band) => sum + band.count, 0);
    for (const band of this.config.bands) this.makeDustVolume({ ...band,
      count: Math.max(1, Math.round(band.count * this.config.dust.count / configuredDust)) });
    this.makeStarField('distant-stars', this.config.stars.distant, [150, 410].map(v=>v*this.config.radius/950));
    this.makeStarField('nearby-stars', this.config.stars.nearby, [30, 76]);
    this.makeClusterField();
    if (scene) scene.add(this.group);
  }

  makeEnvironment() {
    const material = new THREE.ShaderMaterial({
      uniforms: { panorama: { value: null }, intensity: { value: this.config.panorama.intensity },
        longitude: { value: this.config.panorama.longitude } },
      vertexShader: environmentVertex, fragmentShader: environmentFragment,
      side: THREE.BackSide, depthWrite: false, depthTest: false, toneMapped: false, fog: false,
    });
    this.environment = new THREE.Mesh(new THREE.SphereGeometry(this.config.radius, 96, 64), material);
    this.environment.name = 'ContinuousPainterlyEnvironment';
    this.environment.position.set(...this.config.center);
    this.environment.renderOrder = -40; this.environment.frustumCulled = false;
    this.environment.visible = false; this.group.add(this.environment);
  }

  makeDustVolume(band) {
    const curve = new THREE.CatmullRomCurve3(band.points.map(vector), false, 'centripetal');
    const geometry = new THREE.BufferGeometry(), count = band.count;
    const positions = [], sizes = [], opacities = [], phases = [], paintUV = [], tints = [];
    const random = this.random, color = new THREE.Color(band.color), tint = new THREE.Color();
    const gold = new THREE.Color('#e7ce91'), dark = new THREE.Color('#294b7c');
    const p = new THREE.Vector3(), tangent = new THREE.Vector3(), normal = new THREE.Vector3(), binormal = new THREE.Vector3();
    const ref = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < count; i++) {
      const t = random(); curve.getPointAt(t, p); curve.getTangentAt(t, tangent);
      ref.set(0, Math.abs(tangent.y) > .9 ? 0 : 1, Math.abs(tangent.y) > .9 ? 1 : 0);
      normal.crossVectors(tangent, ref).normalize(); binormal.crossVectors(tangent, normal).normalize();
      // A non-uniform Gaussian cross-section creates a cloud with measurable
      // thickness, not a plane or a row of points. Endcaps fade organically.
      const taper = Math.pow(Math.sin(Math.PI * t), .35);
      const crossX = THREE.MathUtils.clamp(gaussian(random), -2.6, 2.6);
      const crossY = THREE.MathUtils.clamp(gaussian(random), -2.6, 2.6);
      const filament = Math.sin(t * 26 + crossY) * band.width * .2;
      p.addScaledVector(normal, (crossX * band.width + filament) * taper);
      p.addScaledVector(binormal, crossY * band.depth * taper);
      positions.push(p.x, p.y, p.z);
      const thin = random() < .27;
      sizes.push(thin ? .35 + random() * 1.3 : band.size
        ? band.size[0] + random() * (band.size[1] - band.size[0]) : 1.2 + random() * 3.6);
      opacities.push((thin ? band.fleckOpacity ?? .23 : band.opacity ?? .095)
        * (band.alphaScale || 1) * taper * (.45 + random() * .55));
      phases.push(random());
      // All samples stay inside sky-only source artwork, excluding the
      // cypress, source moon and transparent village silhouette.
      paintUV.push(.35 + random() * .27, .4 + random() * .45);
      tint.copy(color).lerp(dark, random() * .22);
      if (random() < (band.gold || 0)) tint.lerp(gold, .5 + random() * .25);
      tint.multiplyScalar(.75 + random() * .35); tint.toArray(tints, i * 3);
    }
    geometry.setAttribute('position', attribute(positions, 3));
    geometry.setAttribute('worldSize', attribute(sizes, 1)); geometry.setAttribute('opacity', attribute(opacities, 1));
    geometry.setAttribute('phase', attribute(phases, 1)); geometry.setAttribute('paintUV', attribute(paintUV, 2));
    geometry.setAttribute('tint', attribute(tints, 3)); geometry.computeBoundingSphere(); geometry.computeBoundingBox();
    const material = new THREE.ShaderMaterial({
      uniforms: { paintMap: { value: null }, time: { value: 0 }, strength: { value: this.config.dust.strength * (band.pigmentStrength ?? 1) },
        viewportHeight: { value: viewportHeight() } },
      vertexShader: dustVertex, fragmentShader: dustFragment,
      transparent: true, depthWrite: false, depthTest: true, toneMapped: false,
      blending: band.luminous ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false,
    });
    const points = new THREE.Points(geometry, material);
    points.name = `WorldPaintDust:${band.id}`; points.visible = false;
    this.group.add(points); this.dustVolumes.push({ id: band.id, object: points, curve, count,
      width: band.width, depth: band.depth, controlPoints: band.points });
  }

  makeStarGeometry(positions, sizes, phases, colors) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', attribute(positions, 3)); geometry.setAttribute('worldSize', attribute(sizes, 1));
    geometry.setAttribute('phase', attribute(phases, 1)); geometry.setAttribute('tint', attribute(colors, 3));
    geometry.computeBoundingSphere(); geometry.computeBoundingBox(); return geometry;
  }

  makeStarMaterial() {
    return new THREE.ShaderMaterial({ uniforms: { viewportHeight: { value: viewportHeight() }, time: { value: 0 } },
      vertexShader: starVertex, fragmentShader: starFragment, transparent: true,
      depthWrite: false, depthTest: true, toneMapped: false, blending: THREE.AdditiveBlending, fog: false });
  }

  makeStarField(id, count, radii) {
    const positions = [], sizes = [], phases = [], colors = [], random = this.random;
    const palettes = ['#97bddc', '#b1d7e2', '#f1d694', '#d0ba82'].map(value => new THREE.Color(value));
    for (let i = 0; i < count; i++) {
      const azimuth = random() * Math.PI * 2, y = random() * 2 - 1;
      const radius = radii[0] + Math.pow(random(), .6) * (radii[1] - radii[0]), h = Math.sqrt(1 - y * y);
      positions.push(Math.cos(azimuth) * h * radius, y * radius + 2, Math.sin(azimuth) * h * radius);
      sizes.push(id === 'nearby-stars' ? .10 + Math.pow(random(), 2) * .38 : .15 + random() * .70);
      phases.push(random()); palettes[Math.floor(random() * palettes.length)].clone().multiplyScalar(.7 + random() * .35).toArray(colors, i * 3);
    }
    const points = new THREE.Points(this.makeStarGeometry(positions, sizes, phases, colors), this.makeStarMaterial());
    points.name = `WorldStarField:${id}`; this.group.add(points); this.starFields.push({ id, object: points, count, radii });
  }

  makeClusterField() {
    const positions = [], sizes = [], phases = [], colors = [], random = this.random;
    const clusters = this.config.starClusters, count = this.config.stars.clusters;
    for (let i = 0; i < count; i++) {
      const cluster = clusters[i % clusters.length];
      positions.push(...cluster.center.map((value, axis) => value + gaussian(random) * cluster.spread[axis]));
      sizes.push(.18 + Math.pow(random(), 3) * 1.3); phases.push(random());
      new THREE.Color(cluster.color).multiplyScalar(.8 + random() * .25).toArray(colors, i * 3);
    }
    const spiral = this.config.spiralCluster;
    if (spiral?.enabled && clusters[spiral.index]) {
      // Generate the baseline first so the other five clusters, sizes and phases
      // keep their exact existing random sequence and attribute values.
      const indices = Array.from({ length: count }, (_, i) => i).filter(i => i % clusters.length === spiral.index);
      const samples = sampleSpiralCluster({ ...clusters[spiral.index], ...spiral, count: indices.length });
      indices.forEach((index, local) => {
        for (let axis = 0; axis < 3; axis++) {
          positions[index * 3 + axis] = samples.positions[local * 3 + axis];
          colors[index * 3 + axis] = samples.colors[local * 3 + axis];
        }
      });
    }
    const points = new THREE.Points(this.makeStarGeometry(positions, sizes, phases, colors), this.makeStarMaterial());
    points.name = 'WorldDepthStarClusters'; this.group.add(points); this.starFields.push({ id: 'depth-clusters', object: points, count });
  }

  async load() {
    this.loadErrors = [];
    const definitions = [
      { id: 'panorama', path: this.config.panorama.url },
      { id: 'pigment', path: this.config.pigment.url },
    ];
    const results = await Promise.allSettled(definitions.map(async definition => {
      const texture = await this.loader.loadAsync(uri(definition.path));
      this.ownedTextures.add(texture); texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8; texture.wrapS = definition.id === 'panorama' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping; texture.needsUpdate = true;
      if (definition.id === 'panorama') {
        // atan's longitude wrap has a discontinuous implicit UV derivative.
        // This far painting is magnified in our views; omit derivative-based
        // mip selection so the seam cannot turn into a dark/coarse mip stripe.
        texture.minFilter = texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
      }
      this.setTexture(texture, definition.id);
    }));
    results.forEach((result, index) => {
      if (result.status === 'rejected') this.loadErrors.push({ id: definitions[index].id,
        url: definitions[index].path, message: result.reason?.message || String(result.reason) });
    });
    if (this.loadErrors.length) throw new Error(`星海资源加载失败：${this.loadErrors.map(error => error.url).join('、')}`);
    this.loaded = true; return this;
  }

  setTexture(texture, layerId = 'panorama') {
    if (!texture?.isTexture) throw new TypeError('setTexture 需要 Three.Texture');
    texture.colorSpace = THREE.SRGBColorSpace;
    if (layerId === 'panorama' || layerId === 'paint') {
      this.environment.material.uniforms.panorama.value = texture; this.environment.visible = true;
      this.brushwork.material.uniforms.panorama.value = texture; this.brushwork.visible = true;
      return this.environment;
    }
    if (layerId === 'pigment') {
      this.pigmentTexture = texture;
      for (const volume of this.dustVolumes) {
        volume.object.material.uniforms.paintMap.value = texture; volume.object.visible = true;
      }
      return this.dustVolumes[0]?.object;
    }
    throw new Error(`未配置星海纹理：${layerId}`);
  }

  setExpand(value) { this.expandTarget = THREE.MathUtils.clamp(value, 0, 1); }

  update(dt = 0, time = 0) {
    this.expandNow += (this.expandTarget - this.expandNow) * (1 - Math.exp(-4 * Math.min(Math.max(dt, 0), .1)));
    for (const { object } of this.dustVolumes) {
      const uniforms = object.material.uniforms;
      uniforms.viewportHeight.value = viewportHeight(); uniforms.time.value = time;
    }
    for (const { object } of this.starFields) {
      object.material.uniforms.viewportHeight.value = viewportHeight();
      object.material.uniforms.time.value = time;
    }
    // Deliberately no position/rotation writes: translating or looking around
    // changes projection of fixed 3D points, rather than moving scenery with a camera.
  }

  getTelemetry() {
    this.group.updateWorldMatrix(true, true);
    const describe = item => ({ id: item.id, count: item.count,
      bounds: { min: item.object.geometry.boundingBox.min.toArray(), max: item.object.geometry.boundingBox.max.toArray() },
      worldPosition: item.object.getWorldPosition(new THREE.Vector3()).toArray(),
      samples: [0, Math.floor(item.count / 3), Math.floor(item.count * 2 / 3)].map(index =>
        new THREE.Vector3().fromBufferAttribute(item.object.geometry.getAttribute('position'), index).toArray()) });
    return { loaded: this.loaded, textureCount: this.ownedTextures.size, mode: 'WORLD_3D',
      fixedWorld: true, cameraAttached: false, frameCount: 0, frames: [], layers: [],
      environment: { type: 'distant-equirectangular', position: this.environment.position.toArray(), radius: this.config.radius,
        path: this.config.panorama.url, edgeBlend: .045, edgeBlendMethod: 'monotone-dual-chart', polarChartBlend: [.80, .93],
        textureSize: this.environment.material.uniforms.panorama.value?.image ? [
          this.environment.material.uniforms.panorama.value.image.width,
          this.environment.material.uniforms.panorama.value.image.height] : null },
      nativeBrushwork: { type: 'InstancedBufferGeometry', count: this.brushwork.geometry.instanceCount,
        radius: this.config.brushes.radius, position: this.brushwork.position.toArray(), worldFixed: true,
        depthTest: this.brushwork.material.depthTest, collidable: false, sourceDetailRecovered: false },
      volumes: this.dustVolumes.map(item => ({ ...describe(item), crossSection: [item.width, item.depth],
        curve: 'CatmullRomCurve3', controlPoints: item.controlPoints })),
      stars: this.starFields.map(describe), totalDust: this.dustVolumes.reduce((sum, item) => sum + item.count, 0),
      totalStars: this.starFields.reduce((sum, item) => sum + item.count, 0),
      depthOcclusion: true, unchangedOriginalPigmentPath: this.config.pigment.url, loadErrors: this.loadErrors };
  }

  dispose() {
    this.group.removeFromParent();
    this.group.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
    for (const texture of this.ownedTextures) texture.dispose();
    this.ownedTextures.clear(); this.dustVolumes.length = 0; this.starFields.length = 0;
  }
}

export default StarfieldBackdrop;
