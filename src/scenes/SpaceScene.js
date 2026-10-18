import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BuildingLayout } from '../config/BuildingLayout.js';
import { StudioBuilding } from './StudioBuilding.js';
import { StarfieldBackdrop } from './StarfieldBackdrop.js';
import { VortexField } from './sky/VortexField.js';
import { SapphirePlanet } from './sky/SapphirePlanet.js';
import { StarRiverField } from './sky/StarRiverField.js';
import { ExplorationField } from './sky/ExplorationField.js';
import { ViewFraming } from '../config/ViewFraming.js';
import { createFlybys } from './sky/AmbientFlybys.js';
import { ParticleWords } from './sky/ParticleWords.js';
import { PaintFlowField } from './sky/PaintFlowField.js';

// Props are original. The sky loads credited upstream painting layers; one
// measured studio and its terrace remain in world space in every scene state.
const PI = Math.PI;
const TAU = PI * 2;
const UP = new THREE.Vector3(0, 1, 0);

function seeded(seed = 7) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function roundShape(width, height, radius, ox = 0, oy = 0, path = new THREE.Shape()) {
  const x = ox - width / 2, y = oy - height / 2;
  path.moveTo(x + radius, y);
  path.lineTo(x + width - radius, y);
  path.quadraticCurveTo(x + width, y, x + width, y + radius);
  path.lineTo(x + width, y + height - radius);
  path.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  path.lineTo(x + radius, y + height);
  path.quadraticCurveTo(x, y + height, x, y + height - radius);
  path.lineTo(x, y + radius);
  path.quadraticCurveTo(x, y, x + radius, y);
  return path;
}

function material(color, roughness = 0.5, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function box(parent, size, position, mat, radius = 0.06) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, radius), mat);
  mesh.position.set(...position);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function sphere(parent, radius, position, mat, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24), mat);
  mesh.position.set(...position); mesh.scale.set(...scale);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}

function cylinder(parent, rTop, rBottom, height, position, mat, radial = 32) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, height, radial), mat);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}

function rod(parent, a, b, radius, mat) {
  const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b);
  const delta = bv.clone().sub(av);
  const mesh = cylinder(parent, radius, radius, delta.length(), av.clone().add(bv).multiplyScalar(0.5).toArray(), mat, 12);
  mesh.quaternion.setFromUnitVectors(UP, delta.normalize());
  return mesh;
}

function roundedPanel(parent, width, height, depth, position, mat, radius = 0.22) {
  const geometry = new THREE.ExtrudeGeometry(roundShape(width, height, radius), {
    depth, bevelEnabled: true, bevelSegments: 3, steps: 1,
    bevelSize: Math.min(0.055, depth / 3), bevelThickness: Math.min(0.055, depth / 3), curveSegments: 16,
  });
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}

function textTexture(title, subline = '', { width = 1024, height = 256, ink = '#fff3cb', background = '#162e40', large = 108 } = {}) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${large}px "Microsoft YaHei", "Noto Sans SC", sans-serif`;
  ctx.fillText(title, width / 2, subline ? height * 0.41 : height * 0.52);
  if (subline) {
    ctx.globalAlpha = 0.58; ctx.font = '400 33px "Microsoft YaHei", sans-serif';
    ctx.fillText(subline, width / 2, height * 0.79);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function woodTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d'), random = seeded(15);
  ctx.fillStyle = '#a77950'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 410; i++) {
    const y = random() * 512;
    ctx.strokeStyle = random() > 0.6 ? 'rgba(58,28,16,0.10)' : 'rgba(248,209,144,0.12)';
    ctx.lineWidth = random() * 2 + 0.5;
    ctx.beginPath(); ctx.moveTo(0, y);
    ctx.bezierCurveTo(140, y + 9 * random(), 290, y - 7 * random(), 512, y + 3 * random());
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(2.3, 2.3);
  return texture;
}

export class SpaceScene {
  constructor({ scene, registry = {}, manifest = {} }) {
    this.scene = scene; this.registry = registry; this.manifest = manifest;
    this.group = new THREE.Group(); this.group.name = 'StarhavenExterior'; scene.add(this.group);
    this.backgroundRoot = new THREE.Group(); this.backgroundRoot.name = 'SharedPaintedStarSea'; scene.add(this.backgroundRoot);
    this.building = new StudioBuilding({scene, layout: manifest.building || BuildingLayout});
    this.studio = this.building.group;
    this.door = this.building.door;
    this.docking = this.building.docking;
    this.entranceObject = this.building.entranceObject;
    this.backdrop = new StarfieldBackdrop({scene, manifest: manifest.sky || {}});
    this.vortex = new VortexField({scene, manifest: manifest.vortex});
    this.planet = new SapphirePlanet({scene, manifest: manifest.planet});
    this.rivers = new StarRiverField({scene,brushAtlas:this.vortex.brushAtlas,manifest:manifest.rivers});
    this.exploration = new ExplorationField({scene,brushAtlas:this.vortex.brushAtlas,rockSurface:manifest.space?.rockSurface});
    this.paintFlow = new PaintFlowField({scene,vortex:this.vortex});
    this.flybys = manifest.sky?.flybys?.enabled ? createFlybys(scene,{random:seeded(manifest.sky.flybys.seed)}) : null;
    this.wordField = manifest.sky?.wordField?.enabled ? new ParticleWords({scene,config:manifest.sky.wordField}) : null;
    this.hotspots = []; this.floaters = []; this.spinObjects = [];
    this.resources = [];
    this.materials = {
      ivory: material('#ddd8cb', 0.48), blue: material('#234c65', 0.47, 0.12), roof: material('#163d54', 0.55, 0.1),
      dark: material('#173546', 0.45, 0.23), gold: material('#b68f50', 0.44, 0.42),
      silver: material('#a6bdc1', 0.28, 0.65), wood: new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.68 }),
      terracotta: material('#c47c55', 0.7), green: material('#3e7765', 0.63), paleGreen: material('#8aac78', 0.58),
      window: new THREE.MeshPhysicalMaterial({ color: '#b3d5db', roughness: 0.13, metalness: 0.12,
        transmission: 0.08, transparent: true, opacity: 0.23, clearcoat: 1, clearcoatRoughness: 0.15, depthWrite: false }),
      lamp: new THREE.MeshStandardMaterial({ color: '#ffe0a4', emissive: '#ffd193', emissiveIntensity: 1.3, roughness: 0.35 }),
      screen: new THREE.MeshStandardMaterial({ color: '#aacde0', emissive: '#4b9cb3', emissiveIntensity: 0.75, roughness: 0.27 }),
    };
    this.makeLights(); this.makeAsteroids(); this.makeRobot(); this.makeSatellites();
  }

  async load() { await this.backdrop.load(); this.vortex.setPigmentTexture(this.backdrop.pigmentTexture); this.rivers.setPigmentTexture(this.backdrop.pigmentTexture); this.exploration.setPigmentTexture(this.backdrop.pigmentTexture); this.paintFlow.setPigmentTexture(this.backdrop.pigmentTexture); return this; }

  makeLights() {
    // The app owns shared key/rim/environment lighting. Local lights belong to
    // the studio, so exterior mode does not double the global light exposure.
    const doorLight = new THREE.PointLight('#ffbc68', 8, 8, 2);
    doorLight.position.copy(this.door).add(new THREE.Vector3(0, 1, .7)); this.group.add(doorLight);
  }

  makePlant(parent, position, scale = 0.7) {
    const m = this.materials, plant = new THREE.Group(); plant.position.set(...position); plant.scale.setScalar(scale); parent.add(plant);
    cylinder(plant, 0.30, 0.20, 0.45, [0, 0.225, 0], m.terracotta);
    cylinder(plant, 0.324, 0.324, 0.07, [0, 0.435, 0], m.gold);
    cylinder(plant, 0.28, 0.28, 0.02, [0, 0.467, 0], material('#3b3329', 0.96));
    const random = seeded(27);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, length = 0.44 + random() * 0.38;
      const end = [Math.cos(a) * 0.24, 0.71 + length * 0.45, Math.sin(a) * 0.24];
      rod(plant, [0, 0.44, 0], end, 0.018, m.green);
      const leaf = sphere(plant, 0.18, end, i % 3 ? m.green : m.paleGreen, [0.49, length / 0.25, 0.22]);
      leaf.rotation.set(Math.cos(a) * 0.56, a, Math.sin(a) * 0.56);
    }
    return plant;
  }

  makeAsteroids() {
    const specs = [
      { p: [-11.4, -0.10, 2.8], s: [2.05, 1.2, 1.68], seed: 4, plant: true },
      { p: [8.3, 0.22, -3.3], s: [1.48, 0.85, 1.2], seed: 15, plant: true },
      { p: [-4.8, -1.6, -7.4], s: [0.93, 0.69, 0.92], seed: 24, plant: false },
    ];
    this.asteroids=[];
    for (const spec of specs) {
      const asteroid = new THREE.Group(); asteroid.position.set(...spec.p); this.group.add(asteroid); this.asteroids.push(asteroid); this.nearAsteroid=this.asteroids[0];
      const geometry = new THREE.IcosahedronGeometry(1, 2), random = seeded(spec.seed);
      const pos = geometry.getAttribute('position');
      // Deform by continuous coordinates so duplicate vertices remain joined.
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const displacement = 0.93 + Math.sin(x * 5.7 + z * 2.4) * 0.06 + Math.cos(y * 7.1 + z * 3.7) * 0.08;
        pos.setXYZ(i, x * displacement * spec.s[0], y * displacement * spec.s[1], z * displacement * spec.s[2]);
      }
      geometry.computeVertexNormals();
      const rock = new THREE.Mesh(geometry, material('#718896', 0.93, 0.04)); rock.castShadow = true; rock.receiveShadow = true; asteroid.add(rock);
      // Embedded seams and tiny warm crystal inclusions soften the stone.
      for (let i = 0; i < 4; i++) {
        const pebble = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15 + random() * 0.20, 1), material(i % 2 ? '#a4b3b5' : '#bf9a64', 0.67, 0.15));
        pebble.position.set((random() - 0.5) * spec.s[0] * 1.2, spec.s[1] * 0.72, (random() - 0.5) * spec.s[2]);
        pebble.scale.y = 0.49; asteroid.add(pebble);
      }
      if (spec.plant) this.makePlant(asteroid, [-0.17, spec.s[1] * 0.76, 0.1], spec.seed === 4 ? 0.73 : 0.46);
      this.floaters.push({ object: asteroid, base: asteroid.position.clone(), amplitude: 0.16, rate: 0.33, phase: spec.seed });
    }
  }

  makeRobot() {
    // The original position intersected the default W departure corridor at
    // ~0.67s. Keep the guide beside the terrace, clear of the pilot's capsule.
    // Collision proxies follow this same anchor, including its hover motion.
    const m = this.materials, robot = new THREE.Group(); robot.position.set(-2.8, 2.15, 5.4); robot.rotation.y = 0.38; this.group.add(robot);
    box(robot, [0.91, 0.68, 0.70], [0, 0.13, 0], m.ivory, 0.21);
    box(robot, [0.76, 0.39, 0.06], [0, 0.18, 0.37], m.dark, 0.026);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: '#91d4e4', emissive: '#4cbfcf', emissiveIntensity: 1.8, roughness: 0.3 });
    for (const x of [-0.17, 0.17]) sphere(robot, 0.065, [x, 0.20, 0.425], eyeMaterial, [1, 1.30, 0.28]);
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.012, 6, 20, PI * 0.64), eyeMaterial);
    smile.position.set(0, 0.12, 0.421); smile.rotation.z = PI * 1.18; robot.add(smile);
    sphere(robot, 0.36, [0, -0.37, 0], m.blue, [0.90, 0.83, 0.85]);
    cylinder(robot, 0.20, 0.25, 0.14, [0, -0.62, 0], m.gold);
    sphere(robot, 0.15, [0, -0.72, 0], m.screen, [1, 0.5, 1]);
    for (const sign of [-1, 1]) {
      sphere(robot, 0.115, [sign * 0.47, -0.04, 0], m.gold);
      rod(robot, [sign * 0.47, -0.10, 0], [sign * 0.64, -0.30, 0.12], 0.06, m.ivory);
      sphere(robot, 0.11, [sign * 0.65, -0.29, 0.13], m.ivory, [0.82, 0.78, 1]);
    }
    rod(robot, [0.15, 0.46, 0], [0.15, 0.66, 0], 0.016, m.gold);
    sphere(robot, 0.049, [0.15, 0.69, 0], m.lamp);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.018, 8, 48), m.gold);
    halo.position.y = -0.83; halo.rotation.x = PI / 2; robot.add(halo);
    const target = box(robot, [1.18, 1.61, 1.0], [0, -0.08, 0], new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), 0.15);
    target.castShadow = false; target.receiveShadow = false;
    target.name = 'StudioGuideRobot'; target.userData.hotspotId = 'robot';
    this.robot = robot; this.robotEyes = eyeMaterial;
    this.hotspots.push({ id: 'robot', object: target, anchor: robot.position.clone(), camera: { position: new THREE.Vector3(-2.8, 3.5, 10.5), target: robot.position.clone() } });
    this.floaters.push({ object: robot, base: robot.position.clone(), amplitude: 0.14, rate: 1.35, phase: 0 });
  }

  makeSatellites() {
    const m = this.materials;
    const projects = Array.isArray(this.registry) ? this.registry : (this.registry.projects || Object.values(this.registry));
    const resolveId = (name) => projects.find?.((p) => p?.id?.toLowerCase() === name || p?.name?.toLowerCase() === name)?.id || name;
    const specs = [
      { id: resolveId('threadcove'), name: 'ThreadCove', p: [-7.4, 5.3, -5.6], angle: -0.26, color: '#79bad4' },
      { id: resolveId('clawtide'), name: 'Clawtide', p: [7.6, 4.2, -6.1], angle: 0.34, color: '#d4ac6c' },
    ];
    for (const spec of specs) {
      const satellite = new THREE.Group(); satellite.position.set(...spec.p); this.satellites ||= {}; this.satellites[spec.id]=satellite; satellite.rotation.set(0.07, spec.angle, -0.11); this.backgroundRoot.add(satellite);
      box(satellite, [0.75, 0.74, 0.86], [0, 0, 0], m.ivory, 0.16);
      box(satellite, [0.58, 0.53, 0.04], [0, 0, 0.47], m.dark, 0.02);
      sphere(satellite, 0.16, [0, 0.01, 0.51], material(spec.color, 0.17, 0.25), [1, 1, 0.52]);
      for (const sign of [-1, 1]) {
        rod(satellite, [sign * 0.35, 0, 0], [sign * 0.77, 0, 0], 0.045, m.gold);
        box(satellite, [1.0, 0.67, 0.09], [sign * 1.21, 0.02, 0], m.gold, 0.04);
        for (let x = 0; x < 3; x++) for (let y = 0; y < 2; y++) {
          box(satellite, [0.26, 0.27, 0.02], [sign * 1.21 - 0.30 + x * 0.30, -0.13 + y * 0.31, 0.059], m.blue, 0.008);
        }
      }
      rod(satellite, [0, 0.33, 0], [0, 0.70, 0], 0.021, m.silver);
      sphere(satellite, 0.063, [0, 0.72, 0], m.lamp);
      const plaque = box(satellite, [1.62, 0.32, 0.048], [0, -0.64, 0.25], m.dark, 0.023);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(1.51, 0.245), new THREE.MeshBasicMaterial({ map: textTexture(spec.name, '', { width: 1024, height: 180, large: 105, background: '#173546' }), toneMapped: false }));
      label.position.set(0, -0.64, 0.285); satellite.add(label);
      const target = box(satellite, [3.4, 1.60, 1.25], [0, 0, 0], new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), 0.10);
      target.castShadow = false; target.receiveShadow = false;
      target.userData.hotspotId = spec.id;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.93, 0.011, 6, 100), new THREE.MeshBasicMaterial({ color: '#83bacf', transparent: true, opacity: 0.13, depthWrite: false }));
      ring.rotation.x = PI / 2; ring.rotation.z = 0.34; ring.position.y = -0.45; satellite.add(ring);
      this.hotspots.push({ id: spec.id, object: target, anchor: satellite.position.clone(), camera: { position: satellite.position.clone().add(new THREE.Vector3(...ViewFraming.satelliteProjectOffsets[spec.name.toLowerCase()])), target: satellite.position.clone() } });
      this.floaters.push({ object: satellite, base: satellite.position.clone(), amplitude: 0.21, rate: 0.5, phase: spec.angle * 9 });
      this.spinObjects.push(ring);
    }
  }

  update(dt, time, playerFocus = null) {
    const t = Number.isFinite(time) ? time : 0;
    this.backdrop.update(dt, t);
    this.interiorBlend = (this.interiorBlend || 0) + ((Number(this.interior)||0) - (this.interiorBlend || 0)) * (1 - Math.exp(-3 * dt));
    const skyIntensity = this.backdrop.config.panorama.intensity * (1 - .48 * this.interiorBlend);
    this.backdrop.environment.material.uniforms.intensity.value = skyIntensity;
    this.backdrop.brushwork.material.uniforms.intensity.value = skyIntensity;
    if (this.backdrop.parallax) this.backdrop.parallax.material.uniforms.intensity.value = skyIntensity;
    this.vortex.setPlayerFocus(playerFocus);
    this.rivers.setPlayerFocus(playerFocus);
    this.planet.update(dt);
    this.building.update?.(dt);
    for (const floater of this.floaters) floater.object.position.y = floater.base.y + Math.sin(t * floater.rate + floater.phase) * floater.amplitude;
    for (const ring of this.spinObjects) ring.rotation.z += Math.min(dt || 0, 0.05) * 0.08;
    if (this.robot) this.robot.rotation.y = 0.38 + Math.sin(t * 0.45) * 0.08;
    if (this.robotEyes) this.robotEyes.emissiveIntensity = 1.65 + Math.sin(t * 2.0) * 0.16;
  }

  updateAmbient(dt,camera,options){this.flybys?.update(dt,camera,options);this.wordField?.update(dt,camera,options);this.paintFlow?.update(dt,options);}
  disposeAmbient(){this.flybys?.dispose();this.wordField?.dispose();this.paintFlow?.dispose();}

  setInteriorProgress(progress) {
    const p=THREE.MathUtils.clamp(progress,0,1);this.interior=p;this.group.visible=p<.999;
    if(!this.presenceMaterials){
      this.presenceMaterials=new Map();this.presenceLights=new Map();
      this.group.traverse(object=>{if(object.isLight)this.presenceLights.set(object,object.intensity);if(!object.isMesh)return;for(const material of [object.material].flat())if(!this.presenceMaterials.has(material)){this.presenceMaterials.set(material,{opacity:material.opacity,depthWrite:material.depthWrite});material.transparent=true;}});
    }
    for(const [material,base] of this.presenceMaterials){material.opacity=base.opacity*(1-p);material.depthWrite=base.depthWrite&&p<.02;}
    for(const [light,intensity] of this.presenceLights)light.intensity=intensity*(1-p);
    this.building.setReveal(p);
  }
  setVisible(visible) { this.setInteriorProgress(visible?0:1); }
}
