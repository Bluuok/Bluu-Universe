// Local composition shaders. Geometry, curves and points use Three r161.
// The distant texture is an ImageGen panorama; paint-map samples in dust use
// the separately credited original Starry Night PNG without changing its bytes.
export const environmentVertex = /* glsl */`
varying vec3 vWorldDirection;
void main() {
  vWorldDirection = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// One mapping for the underpainting and its native geometric brush details.
// Keeping the seam/pole charts shared prevents the two layers changing palette
// at different longitudes. This does not increase the source bitmap resolution.
export const environmentSampling = /* glsl */`
uniform sampler2D panorama;
uniform float intensity;
uniform float longitude;
const float PI = 3.141592653589793;
vec3 seamlessSample(vec2 uv) {
  uv.x = fract(uv.x);
  vec3 color = texture2D(panorama, uv).rgb;
  // Both edge charts advance in the same direction across the longitude seam.
  // Mirroring with 1-u produced a symmetric V in the diagnostic seam view.
  // A shared signed interval feathers the two source-edge strips continuously
  // without reversing their paint flow or repeating the full panorama.
  float seam = uv.x > .5 ? uv.x - 1.0 : uv.x;
  const float width = .045;
  if (abs(seam) >= width) return color;
  float chartU = (seam + width) * .5;
  vec3 before = texture2D(panorama, vec2(1.0 - width + chartU, uv.y)).rgb;
  vec3 after = texture2D(panorama, vec2(chartU, uv.y)).rgb;
  return mix(before, after, smoothstep(-width, width, seam));
}
vec3 sampleEnvironment(vec3 direction) {
  direction = normalize(direction);
  float u = atan(direction.z, direction.x) / (2.0 * PI) + .5 + longitude;
  float v = asin(clamp(direction.y, -1.0, 1.0)) / PI + .5;
  vec3 color = seamlessSample(vec2(u, v));
  // Longitude is undefined at the poles. A second smooth UV chart uses the
  // same painting without squeezing a latitude row into concentric rings.
  // This is a distant sphere mapping, never a foreground image card.
  float cap = smoothstep(.80, .93, abs(direction.y));
  if (cap > .001) {
    vec2 center = direction.y > 0.0 ? vec2(.68, .40) : vec2(.31, .56);
    vec2 polarUV = center + direction.xz * vec2(.31, .42);
    color = mix(color, seamlessSample(polarUV), cap);
  }
  // Preserve source detail but compress far contrast; both sky layers share this map.
  return mix(vec3(.018,.034,.063),color,.22);
}`;

export const environmentFragment = /* glsl */`
${environmentSampling}
varying vec3 vWorldDirection;
void main() {
  gl_FragColor = vec4(sampleEnvironment(vWorldDirection) * intensity, 1.0);
  #include <colorspace_fragment>
}`;

export const dustVertex = /* glsl */`
uniform float viewportHeight;
attribute float worldSize;
attribute float opacity;
attribute float phase;
attribute vec2 paintUV;
attribute vec3 tint;
varying float vOpacity;
varying float vPhase;
varying vec2 vPaintUV;
varying vec3 vTint;
void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = clamp(worldSize * viewportHeight * .5 * projectionMatrix[1][1]
    / max(.1, -viewPosition.z), .5, 96.0);
  vOpacity = opacity; vPhase = phase; vPaintUV = paintUV; vTint = tint;
}`;

export const dustFragment = /* glsl */`
uniform sampler2D paintMap;
uniform float time;
uniform float strength;
varying float vOpacity;
varying float vPhase;
varying vec2 vPaintUV;
varying vec3 vTint;
void main() {
  vec2 p = gl_PointCoord - .5;
  float angle = vPhase * 6.283185;
  p = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * p;
  // Irregular soft brush seeds overlap into a continuous *volume*, rather
  // than discrete dashed lines. Their centres remain fixed world positions.
  vec2 q = p * vec2(1.15, 1.85);
  float radius = length(q);
  float coverage = 1.0 - smoothstep(.16, .53, radius);
  vec3 pigment = texture2D(paintMap, vPaintUV + p * .021).rgb;
  float grain = dot(pigment, vec3(.2126, .7152, .0722));
  float alpha = coverage * vOpacity * (.5 + grain * .5) * strength;
  if (alpha < .003) discard;
  vec3 color = mix(pigment, vTint, .67);
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}`;

export const starVertex = /* glsl */`
uniform float viewportHeight;
uniform float time;
attribute float worldSize;
attribute float phase;
attribute vec3 tint;
varying vec3 vTint;
varying float vBrightness;
void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = clamp(worldSize * viewportHeight * .5 * projectionMatrix[1][1]
    / max(.1, -viewPosition.z), 1.1, 11.0);
  vTint = tint;
  vBrightness = .76 + .24 * sin(time * (.35 + phase * .4) + phase * 50.0);
}`;

export const starFragment = /* glsl */`
varying vec3 vTint;
varying float vBrightness;
void main() {
  float radius = length(gl_PointCoord - .5) * 2.0;
  float core = exp(-radius * radius * 15.0);
  float halo = .15 * (1.0 - smoothstep(.15, 1.0, radius));
  float alpha = (core + halo) * vBrightness;
  if (alpha < .004) discard;
  gl_FragColor = vec4(vTint, alpha);
  #include <colorspace_fragment>
}`;
