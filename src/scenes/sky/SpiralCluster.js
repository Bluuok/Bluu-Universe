import * as THREE from 'three';

// Static positions and tints only; the backdrop owns rendering and lifecycle.
const TAU = Math.PI * 2;
function randomFrom(id) {
  let seed = 2166136261;
  for (const character of String(id)) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
}
function gaussian(random) {
  return Math.sqrt(-2 * Math.log(Math.max(1e-7, random()))) * Math.cos(TAU * random());
}

// Returns only attribute data. The backdrop retains all GPU resource ownership.
export function sampleSpiralCluster({ count, seed, center, spread, normal, arms = 2,
  twist = 1.5, armSpread = .12, warm = '#eed18d', blue = '#82bfe3' }) {
  const random = randomFrom(seed), positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...normal).normalize());
  const point = new THREE.Vector3(), gold = new THREE.Color(warm), azure = new THREE.Color(blue), tint = new THREE.Color();
  const knots = Array.from({ length: 6 }, (_, i) => {
    const radius = .34 + i % 3 * .21, angle = i % arms * TAU / arms + Math.log(radius / .12) * twist;
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, size: .018 + i % 3 * .007 };
  });
  for (let i = 0; i < count; i++) {
    // Stratify populations for the existing 80-point allowance, without adding stars.
    const population = (i + random()) / count;
    let x, y, z, radius, core = false, knot = false, dust = 1;
    if (population < .2) {
      radius = Math.pow(random(), 1.4) * .24;
      const angle = random() * TAU;
      x = Math.cos(angle) * radius; z = Math.sin(angle) * radius;
      y = gaussian(random) * .047 * (1 - radius / .3); core = true;
    } else if (population > .9) {
      const k = knots[Math.floor(random() * knots.length)];
      x = k.x + gaussian(random) * k.size; z = k.z + gaussian(random) * k.size;
      y = gaussian(random) * .008; radius = Math.hypot(x, z); knot = true;
    } else {
      radius = .1 + Math.pow(random(), .69) * .9;
      const arm = Math.floor(random() * arms), offset = gaussian(random) * armSpread;
      const inArm = population > .3;
      const angle = inArm ? arm * TAU / arms + Math.log(radius / .12) * twist + offset : random() * TAU;
      x = Math.cos(angle) * radius + gaussian(random) * .009;
      z = Math.sin(angle) * radius + gaussian(random) * .009;
      y = gaussian(random) * (.004 + radius * .012);
      if (inArm && offset < -.035 && offset > -.115) dust = .2;
      if (!inArm) dust *= .65;
    }
    point.set(x * spread[0] * 2, y * spread[1] * 2, z * spread[2] * 2).applyQuaternion(rotation);
    positions.set([point.x + center[0], point.y + center[1], point.z + center[2]], i * 3);
    tint.copy(core ? gold : azure);
    if (!core && !knot) tint.lerp(gold, Math.max(0, .42 - radius * .7));
    if (knot) tint.lerp(gold, .16);
    tint.multiplyScalar((.58 + random() * .94) * dust).toArray(colors, i * 3);
  }
  return { positions, colors };
}
