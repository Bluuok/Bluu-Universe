import * as THREE from 'three';
import { createGlowTexture, glow } from './FlybyGlow.js';

const tailVertex = `
  varying vec2 vUv;
  uniform float uLength, uWidth, uBend;
  #include <common>
  #include <logdepthbuf_pars_vertex>
  void main() {
    vUv = uv;
    float t = uv.x;
    vec3 p = vec3(-t * uLength,
      (uv.y * 2.0 - 1.0) * uWidth * mix(0.08, 1.0, t) + t * t * uBend, 0.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const tailFragment = `
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uOpacity, uTime;
  #include <common>
  #include <logdepthbuf_pars_fragment>
  void main() {
    // Interpolation can overshoot at the edge; keep fractional powers finite
    // so invalid pixels never propagate through the bloom passes.
    float t = clamp(vUv.x, 0.0, 1.0);
    float side = abs(vUv.y * 2.0 - 1.0);
    float feather = exp(-side * side * 5.0) * (1.0 - smoothstep(0.65, 1.0, side));
    float wisps = 0.92 + 0.08 * sin(vUv.x * 32.0 + side * 9.0 - uTime * 2.0);
    float alpha = feather * pow(1.0 - t, 1.7) * wisps * uOpacity;
    gl_FragColor = vec4(mix(uColor, vec3(1.5, 1.4, 1.2), pow(1.0 - t, 8.0)), alpha);
    #include <logdepthbuf_fragment>
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function createTail(geometry, color, length, width, bend, opacity) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) }, uLength: { value: length },
      uWidth: { value: width }, uBend: { value: bend },
      uOpacity: { value: 0 }, uTime: { value: 0 },
    },
    vertexShader: tailVertex, fragmentShader: tailFragment,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide, forceSinglePass: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  // The shader constructs the ribbon outside the source plane's bounds.
  mesh.frustumCulled = false;
  mesh.userData.opacity = opacity;
  return mesh;
}

function createVisitor(kind, geometry, glowMap) {
  const comet = kind === 'comet';
  const group = new THREE.Group();
  group.name = `ambient-${kind}`;
  group.visible = false;
  const tails = comet ? [
    createTail(geometry, 0x8ccfee, .64, .023, -.018, .64),
    createTail(geometry, 0xf0d2a3, .48, .056, .075, .24),
  ] : [createTail(geometry, 0xffbc79, .28, .008, .004, .85)];
  const halo = glow(glowMap, comet ? 0xa4e3ee : 0xffb879, comet ? .075 : .043, 0);
  const core = glow(glowMap, comet ? 0xe6fcff : 0xffe4b8, comet ? .022 : .019, 0);
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({
    color: comet ? 0xacc3c6 : 0x756256,
    transparent: true, opacity: 0, depthWrite: false,
  }));
  rock.scale.set(comet ? .003 : .006, .004, .0045);
  group.add(...tails, halo, rock, core);
  for (const child of group.children) child.renderOrder = -20;
  return { kind, group, tails, halo, core, rock };
}

/** Sparse background flybys: one reusable visitor at a time, in unpaused real time. */
export function createFlybys(scene, { random = Math.random } = {}) {
  const root = new THREE.Group();
  root.name = 'ambient-flybys';
  scene.add(root);
  const geometry = new THREE.PlaneGeometry(1, 1, 40, 1);
  const glowMap = createGlowTexture();
  const visitors = ['meteor', 'comet'].map(kind => createVisitor(kind, geometry, glowMap));
  root.add(...visitors.map(visitor => visitor.group));
  const start = new THREE.Vector3(), end = new THREE.Vector3();
  const heading = new THREE.Quaternion(), forward = new THREE.Vector3(0, 0, 1);
  const motionPreference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let active = null, elapsed = 0, duration = 0, nextIn = 6 + random() * 5;
  let lastKind = null, streak = 0, spawned = 0, disposed = false;

  function clear() {
    if (active) active.group.visible = false;
    active = null;
    elapsed = 0;
  }

  function spawn(camera) {
    let kind = random() < .42 ? 'comet' : 'meteor';
    if (streak >= 2 && kind === lastKind) kind = kind === 'comet' ? 'meteor' : 'comet';
    streak = kind === lastKind ? streak + 1 : 1;
    lastKind = kind;
    active = visitors.find(visitor => visitor.kind === kind);
    duration = kind === 'comet' ? 8 + random() * 4 : 2.2 + random() * 1.4;
    elapsed = 0;
    spawned++;

    // A sky plane behind the planets. Use the actual off-axis projection so
    // screen framing follows the project sidebar and resized browser viewport.
    const depth = Math.min(360, camera.far * .25);
    const projection = camera.projectionMatrix.elements;
    const halfHeight = depth / projection[5];
    const aspect = projection[5] / projection[0];
    const direction = random() < .5 ? -1 : 1;
    const y = .35 + random() * .6;
    start.set((-direction * 1.2 + projection[8]) * aspect, y + projection[9], -depth / halfHeight);
    end.set((direction * 1.85 + projection[8]) * aspect, y - .45 - random() * .8 + projection[9], start.z);
    heading.setFromAxisAngle(forward, Math.atan2(end.y - start.y, end.x - start.x));
    root.position.copy(camera.position);
    root.quaternion.copy(camera.quaternion);
    root.scale.setScalar(halfHeight);
    active.group.quaternion.copy(heading);
    active.group.scale.setScalar(.55 + random() * .15);
    active.group.visible = true;
  }

  function update(dt, camera, { paused = false, enabled = true, navigating = false } = {}) {
    if (disposed) return;
    dt = Math.max(0, Math.min(Number.isFinite(dt) ? dt : 0, .1));
    const allowed = enabled && !navigating && !motionPreference?.matches;
    root.visible = allowed;
    // The position and direction captured at spawn remain in world space.
    if (!allowed || navigating) {
      if (active) {
        clear();
        nextIn = 6 + random() * 5;
      }
      return;
    }
    if (paused) return;
    if (!active) {
      nextIn -= dt;
      if (nextIn > 0) return;
      spawn(camera);
    }
    elapsed += dt;
    const progress = Math.min(elapsed / duration, 1);
    if (progress >= 1) {
      clear();
      nextIn = 18 + random() * 16;
      return;
    }
    const opacity = THREE.MathUtils.smoothstep(progress, 0, .09)
      * (1 - THREE.MathUtils.smoothstep(progress, .78, 1));
    active.group.position.lerpVectors(start, end, progress);
    active.rock.rotation.x += dt * .8;
    active.rock.rotation.y += dt * 1.3;
    active.rock.material.opacity = opacity;
    active.halo.material.opacity = opacity * (active.kind === 'comet' ? .45 : .32);
    active.core.material.opacity = opacity * .9;
    for (const tail of active.tails) {
      tail.material.uniforms.uOpacity.value = opacity * tail.userData.opacity;
      tail.material.uniforms.uTime.value = elapsed;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    clear();
    root.visible = false;
    root.removeFromParent();
    geometry.dispose();
    glowMap.dispose();
    for (const visitor of visitors) {
      visitor.rock.geometry.dispose();
      visitor.group.children.forEach(child => child.material.dispose());
    }
  }

  return {
    update, dispose,
    getState: () => ({ disposed, visible: root.visible, position: root.position.toArray(), active: active?.kind ?? null, progress: active ? elapsed / duration : 0,
      nextIn: active ? null : Math.max(0, nextIn), spawned, reducedMotion: Boolean(motionPreference?.matches) }),
  };
}
