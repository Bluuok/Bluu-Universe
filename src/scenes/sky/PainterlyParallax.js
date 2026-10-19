import * as THREE from 'three';
import {environmentSampling} from './SkyShaders.js';

// Depth-aware, non-colliding paint between the 2D panorama and near 3D clouds.
// The strokes are authored on nested world-fixed spherical shells; their
// direction follows the existing panorama's luminance contours in the shader.
// Inspired by instanced ribbon techniques, without copying third-party source.
const vertexShader = /* glsl */`
${environmentSampling}
attribute vec3 strokeDirection;
attribute vec2 strokeSize;
attribute vec2 strokeSeed;
attribute float strokeRadius;
attribute float strokeOpacity;
varying vec2 vBrush;
varying vec2 vSeed;
varying vec3 vColor;
varying float vOpacity;
varying float vFlow;
void main() {
  vec3 n = normalize(strokeDirection);
  vec3 reference = abs(n.y) > .88 ? vec3(0., 0., 1.) : vec3(0., 1., 0.);
  vec3 east = normalize(cross(reference, n));
  vec3 north = cross(n, east);
  vec3 luma = vec3(.2126, .7152, .0722);
  // The shared longitude/polar sampler keeps every shell aligned with the
  // actual 360-degree image, rather than inventing a second sky map.
  float gx = dot(sampleEnvironment(n + east * .012) - sampleEnvironment(n - east * .012), luma);
  float gy = dot(sampleEnvironment(n + north * .012) - sampleEnvironment(n - north * .012), luma);
  float gradient = length(vec2(gx, gy));
  float quietFlow = .55 + sin(dot(n, vec3(5., 3., 4.))) * .68;
  float angle = gradient > .003 ? atan(gy, gx) + PI * .5 : quietFlow;
  angle += (strokeSeed.x - .5) * .55;
  vec3 along = east * cos(angle) + north * sin(angle);
  vec3 across = -east * sin(angle) + north * cos(angle);
  vec2 p = position.xy;
  float curl = sin(p.x * PI) * (.07 + .09 * strokeSeed.y);
  vec3 tangentPoint = n * strokeRadius
    + along * p.x * strokeSize.x * .5
    + across * (p.y + curl) * strokeSize.y * .5;
  // The centre row of each strip is physically raised. This adds genuine
  // relief and changing parallax without making a 3D model or using billboards.
  float loadedPaint = (1. - abs(p.y)) * (1. - p.x * p.x)
    * (.13 + .17 * strokeSeed.x);
  vec3 paintedPoint = normalize(tangentPoint) * strokeRadius + n * loadedPaint;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(paintedPoint, 1.);
  vBrush = p;
  vSeed = strokeSeed;
  vColor = sampleEnvironment(n) * intensity;
  vOpacity = strokeOpacity;
  vFlow = smoothstep(.001, .018, gradient);
}`;

const fragmentShader = /* glsl */`
uniform float layerStrength;
varying vec2 vBrush;
varying vec2 vSeed;
varying vec3 vColor;
varying float vOpacity;
varying float vFlow;
void main() {
  vec2 p = vBrush;
  // Tapered dry ends and a broken lateral edge read as strokes rather than
  // translucent rectangular cards, even when viewed from a steep angle.
  float bend = sin(p.x * 2.7 + vSeed.y * 6.) * .07;
  float taper = pow(max(0., 1. - abs(p.x * p.x * p.x)), .56);
  float edge = abs(p.y - bend) / max(.03, taper * (.73 + vSeed.x * .16));
  float aa = max(fwidth(edge), .015);
  float coverage = 1. - smoothstep(1. - aa, 1. + aa, edge);
  float bristlePhase = p.y * (17. + vSeed.x * 13.)
    + p.x * (1.5 + vSeed.y * 2.) + vSeed.y * 18.;
  // Screen-space filtering avoids glitter/moiré during rapid flight.
  float resolved = 1. - smoothstep(1.1, 3., fwidth(bristlePhase));
  float grain = sin(bristlePhase) * .072 * resolved;
  float dryEnd = 1. - smoothstep(.60, 1., p.x) * (.28 + vSeed.y * .18);
  float alpha = coverage * dryEnd * layerStrength * vOpacity
    * mix(.65, 1., vFlow);
  if (alpha < .008) discard;
  vec3 pigment = vColor * (1.16 + .08 * vSeed.x + grain);
  gl_FragColor = vec4(pigment, alpha);
  #include <colorspace_fragment>
}`;

export const DEFAULT_PARALLAX = Object.freeze({
  enabled: true,
  count: 3600,
  seed: 4417,
  // Flyable shells sit in front of the radius-5000 panorama.
  // The weights sum to one; the last shell receives any rounding remainder.
  radii: [245, 345, 455],
  weights: [.22, .35, .43],
  opacity: .50,
});

/**
 * One instanced draw call, zero textures/animation loops/physics colliders.
 * All directions and sizes are deterministic, so route screenshots are stable.
 * The caller exclusively owns the panorama texture and releases this geometry.
 */
export function createPainterlyParallax(config = {}, panorama = {}) {
  const settings = {...DEFAULT_PARALLAX, ...config};
  const {radii, weights} = settings;
  if (!Number.isInteger(settings.count) || settings.count < 1 ||
    radii.length !== 3 || weights.length !== 3 ||
    radii.some(r => !Number.isFinite(r) || r <= 0) ||
    radii.some((r, i) => i > 0 && r <= radii[i - 1]) ||
    weights.some(w => !Number.isFinite(w) || w < 0) ||
    Math.abs(weights.reduce((a, b) => a + b, 0) - 1) > .00001) {
    throw new Error('Invalid painterly parallax shell configuration');
  }
  const [nearCount, midCount] = [Math.floor(settings.count * weights[0]), Math.floor(settings.count * weights[1])];
  const layerCounts = [nearCount, midCount, settings.count - nearCount - midCount];
  const base = new THREE.PlaneGeometry(2, 2, 6, 2);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setIndex(base.index.clone());
  geometry.setAttribute('position', base.getAttribute('position').clone());
  base.dispose();

  const directions = new Float32Array(settings.count * 3);
  const sizes = new Float32Array(settings.count * 2);
  const seeds = new Float32Array(settings.count * 2);
  const depths = new Float32Array(settings.count);
  const opacities = new Float32Array(settings.count);
  let seed = settings.seed >>> 0;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  let index = 0;
  for (let layer = 0; layer < 3; layer++) {
    const radius = radii[layer];
    for (let i = 0; i < layerCounts[layer]; i++, index++) {
      const y = 2 * random() - 1;
      const azimuth = random() * Math.PI * 2;
      const planar = Math.sqrt(Math.max(0, 1 - y * y));
      directions.set([planar * Math.cos(azimuth), y, planar * Math.sin(azimuth)], index * 3);
      // Constant approximate angular stroke size across depth layers.
      sizes.set([radius * (.024 + random() * .028), radius * (.0029 + random() * .0046)], index * 2);
      seeds.set([random(), random()], index * 2);
      depths[index] = radius;
      opacities[index] = [.40, .67, .86][layer] * (.78 + .22 * random());
    }
  }
  for (const [name, data, width] of [
    ['strokeDirection', directions, 3], ['strokeSize', sizes, 2],
    ['strokeSeed', seeds, 2], ['strokeRadius', depths, 1],
    ['strokeOpacity', opacities, 1],
  ]) geometry.setAttribute(name, new THREE.InstancedBufferAttribute(data.slice(), width).setUsage(THREE.DynamicDrawUsage));
  geometry.instanceCount = settings.count;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radii[2] + 25);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      panorama: {value: null},
      intensity: {value: panorama.intensity ?? .32},
      longitude: {value: panorama.longitude ?? .16},
      layerStrength: {value: settings.opacity},
    },
    vertexShader, fragmentShader,
    side: THREE.DoubleSide, transparent: true,
    depthTest: true, depthWrite: false, toneMapped: false, fog: false,
  });
  const object = new THREE.Mesh(geometry, material);
  object.name = 'WorldFixedParallaxOilStrokes';
  object.renderOrder = -38;
  object.frustumCulled = false;
  object.visible = false; // Never draw sampling an uninitialised panorama.
  object.userData.layerCounts = layerCounts;
  object.userData.radii = [...radii];
  // Three sorts transparent objects, not instances within one draw. Reorder
  // complete stroke records before the renderer uploads instance attributes.
  const sources = [directions, sizes, seeds, depths, opacities];
  const attributes = ['strokeDirection', 'strokeSize', 'strokeSeed', 'strokeRadius', 'strokeOpacity']
    .map(name => geometry.getAttribute(name));
  const order = Array.from({length: settings.count}, (_, i) => i);
  const viewDepth = new Float64Array(settings.count);
  const modelView = new THREE.Matrix4(), lastView = new THREE.Matrix4();
  let sorted = false;
  object.sortForCamera = camera => {
    modelView.multiplyMatrices(camera.matrixWorldInverse, object.matrixWorld);
    if (sorted && modelView.equals(lastView)) return false;
    const e = modelView.elements;
    for (let i = 0; i < settings.count; i++) {
      viewDepth[i] = (e[2] * directions[i * 3] + e[6] * directions[i * 3 + 1]
        + e[10] * directions[i * 3 + 2]) * depths[i] + e[14];
    }
    order.sort((a, b) => viewDepth[a] - viewDepth[b] || a - b);
    attributes.forEach((attribute, a) => {
      const width = attribute.itemSize, source = sources[a], destination = attribute.array;
      for (let i = 0; i < settings.count; i++) {
        for (let j = 0; j < width; j++) destination[i * width + j] = source[order[i] * width + j];
      }
      attribute.needsUpdate = true;
    });
    lastView.copy(modelView);
    sorted = true;
    return true;
  };
  object.userData.sorting = 'camera-depth-per-stroke-centre';
  return object;
}
