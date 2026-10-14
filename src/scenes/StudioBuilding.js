import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { BuildingLayout } from '../config/BuildingLayout.js';

const TAU = Math.PI * 2;

function roundedRectangle(width, height, radius, ox = 0, oy = 0, path = new THREE.Shape()) {
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

function woodTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 1024;
  const context = canvas.getContext('2d');
  context.fillStyle = '#a87552'; context.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 180; i++) {
    const x = (i * 103.17) % 512;
    context.strokeStyle = i % 4 ? 'rgba(57,30,20,.10)' : 'rgba(238,199,149,.24)';
    context.lineWidth = i % 9 === 0 ? 4 : 1;
    context.beginPath();
    for (let step = 0; step <= 24; step++) {
      const y = step * 44;
      const px = x + Math.sin(step * 0.29 + i * 0.71) * 8 + Math.sin(step * 0.9 + i) * 2;
      step ? context.lineTo(px, y) : context.moveTo(px, y);
    }
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// The original Joan GLBs supply the real floor, back/right walls and their
// narrow window. This module closes the missing cutaway walls and roof, adds
// outward-facing skins where the source uses one-sided interior faces, then
// adds one shared physical terrace and entry frame.
export class StudioBuilding {
  constructor({ scene, layout = BuildingLayout }) {
    this.scene = scene; this.layout = layout;
    this.group = new THREE.Group(); this.group.name = 'SharedStudioBuilding';
    this.shellGroup = new THREE.Group(); this.shellGroup.name = 'CutawayStudioShell';
    this.persistentGroup = new THREE.Group(); this.persistentGroup.name = 'SharedEntryAndTerrace';
    this.group.add(this.shellGroup, this.persistentGroup); scene.add(this.group);
    this.resources = new Set(); this.cutaway = false; this.doorTargetAngle = 0;
    this.cornerRadius = 0.30;
    this.exterior = { minX: layout.walls.left.outer, maxX: layout.walls.right.outer + 0.003,
      backZ: layout.walls.back.outer - 0.003, frontZ: layout.walls.front.outer };
    this.roofProfile = { rise: 0.68, thickness: 0.22, overhang: 0.32, radius: 0.98 };
    this.roofSpan = { width: layout.shell.max[0] - layout.shell.min[0] + this.roofProfile.overhang * 2,
      depth: layout.shell.max[2] - layout.shell.min[2] + this.roofProfile.overhang * 2 };
    const wood = woodTexture(); this.resources.add(wood);
    this.materials = {
      plaster: new THREE.MeshStandardMaterial({ color: '#d8c9b3', roughness: 0.76, metalness: 0.015 }),
      navy: new THREE.MeshStandardMaterial({ color: '#274854', roughness: 0.47, metalness: 0.15 }),
      roof: new THREE.MeshPhysicalMaterial({ color: '#2e566d', roughness: 0.45, metalness: 0.12,
        clearcoat: 0.28, clearcoatRoughness: 0.40 }),
      dark: new THREE.MeshStandardMaterial({ color: '#203746', roughness: 0.51, metalness: 0.28 }),
      brass: new THREE.MeshStandardMaterial({ color: '#b59661', roughness: 0.35, metalness: 0.56 }),
      wood: new THREE.MeshStandardMaterial({ map: wood, roughness: 0.76, metalness: 0.02 }),
      // Ordinary transparent glazing preserves the actual indoor draw calls.
      // Transmission would need a separate render target; a heavily reflective
      // tinted sheet previously obscured the baked furniture from outside.
      glass: new THREE.MeshPhysicalMaterial({ color: '#c8dedb', roughness: 0.12, metalness: 0,
        clearcoat: 0.15, transparent: true, opacity: 0.11, side: THREE.DoubleSide, depthWrite: false }),
      lamp: new THREE.MeshStandardMaterial({ color: '#ffe4b2', emissive: '#ffd091', emissiveIntensity: 1.2, roughness: 0.30 }),
      terracotta: new THREE.MeshStandardMaterial({ color: '#b47957', roughness: 0.8 }),
      leaves: new THREE.MeshStandardMaterial({ color: '#4f806c', roughness: 0.75 }),
    };
    Object.values(this.materials).forEach(material => this.resources.add(material));
    this.door = new THREE.Vector3(...layout.door.center);
    this.docking = new THREE.Vector3(...layout.anchors.docking);
    this.makeShell(); this.makeTerrace(); this.makeEntry(); this.makeRightWindow(); this.makeRoofDetails();
      // Fade only the removable shell and door; the retained terrace keeps its
      // own materials. Clones are owned here and released with the building.
      this.revealMaterials=new Map();const clones=new Map();
      for(const root of [this.shellGroup,this.doorLeaf])root.traverse(object=>{
        if(!object.isMesh)return;
        const clone=material=>{if(!clones.has(material)){const copy=material.clone();copy.transparent=true;clones.set(material,copy);this.resources.add(copy);this.revealMaterials.set(copy,{opacity:material.opacity,depthWrite:material.depthWrite});}return clones.get(material);};
        object.material=Array.isArray(object.material)?object.material.map(clone):clone(object.material);
      });
      this.setCutaway(false);
  }

  async load() { return this; }

  mesh(parent, geometry, material, position = [0, 0, 0], name = '') {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position); object.name = name;
    object.castShadow = true; object.receiveShadow = true;
    parent.add(object); this.resources.add(geometry);
    return object;
  }

  box(parent, size, position, material, radius = 0.04, name = '') {
    return this.mesh(parent, new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map(value => value / 3))), material, position, name);
  }

  rod(parent, from, to, radius, material) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), direction = b.clone().sub(a);
    const object = this.mesh(parent, new THREE.CylinderGeometry(radius, radius, direction.length(), 12), material, a.clone().add(b).multiplyScalar(0.5).toArray());
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return object;
  }

  frame(parent, width, height, trim, radius, material, center, depth = 0.075) {
    const bevel = Math.min(0.012, depth / 4, trim / 4);
    const shape = roundedRectangle(width + trim * 2 - bevel * 2, height + trim * 2 - bevel * 2, radius + trim - bevel);
    shape.holes.push(roundedRectangle(width + bevel * 2, height + bevel * 2, radius + bevel, 0, 0, new THREE.Path()));
    const geometry = this.smoothExtrusion(shape, { depth: depth - bevel * 2, bevelEnabled: true,
      bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 12 });
    const position = [center[0], center[1], center[2] + bevel];
    return this.mesh(parent, geometry, material, position);
  }

  smoothExtrusion(shape, options) {
    const geometry = new THREE.ExtrudeGeometry(shape, options);
    geometry.deleteAttribute('normal');
    const smooth = mergeVertices(geometry, 0.0001);
    smooth.computeVertexNormals(); geometry.dispose();
    return smooth;
  }

  roundedSlab(parent, width, depth, thickness, radius, bevel, center, material, name) {
    // XZ corner radius is independent of the thin Y profile. Shrinking the
    // core shape by the bevel keeps the final bounding dimensions unchanged.
    const edge = Math.min(bevel, thickness * 0.40);
    const shape = roundedRectangle(width - edge * 2, depth - edge * 2, radius - edge);
    const geometry = this.smoothExtrusion(shape, { depth: thickness - edge * 2,
      bevelEnabled: true, bevelSize: edge, bevelThickness: edge, bevelSegments: 4, curveSegments: 20 });
    const slab = this.mesh(parent, geometry, material,
      [center[0], center[1] - thickness / 2 + edge, center[2]], name);
    slab.rotation.x = -Math.PI / 2;
    return slab;
  }

  cornerSurface(parent, center, radius, bottom, top, start, material, name) {
    const segments = 32, positions = [], normals = [], uvs = [], indices = [];
    for (let i = 0; i <= segments; i++) {
      const angle = start + (i / segments) * Math.PI / 2;
      const x = Math.cos(angle), z = Math.sin(angle);
      for (const y of [bottom, top]) {
        positions.push(center[0] + radius * x, y, center[1] + radius * z);
        normals.push(x, 0, z); uvs.push(i / segments, (y - bottom) / (top - bottom));
      }
      if (i < segments) {
        const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices);
    return this.mesh(parent, geometry, material, [0, 0, 0], name);
  }

  roofTopAt(x, z) {
    const shell = this.layout.shell;
    const nx = Math.min(1, Math.abs(x - shell.center[0]) / (this.roofSpan.width / 2));
    const nz = Math.min(1, Math.abs(z - shell.center[2]) / (this.roofSpan.depth / 2));
    const arch = Math.pow(Math.max(0, Math.cos(nx * Math.PI / 2)), 1.35);
    const gentleHip = 0.83 + 0.17 * Math.cos(nz * Math.PI / 2);
    return this.layout.walls.front.top + 0.38 + this.roofProfile.rise * arch * gentleHip;
  }

  vaultLayer(width, depth, radius, upperOffset, lowerOffset, bevel, material, name) {
    const count = 160, levels = 14, center = this.layout.shell.center;
    const edge = Math.min(bevel, (upperOffset - lowerOffset) * 0.40);
    const inner = roundedRectangle(width - edge * 2, depth - edge * 2, radius - edge).getSpacedPoints(count).slice(0, count);
    const outer = roundedRectangle(width, depth, radius).getSpacedPoints(count).slice(0, count);
    const positions = [], uvs = [], indices = [];
    const add = (x, y, z) => {
      const index = positions.length / 3; positions.push(x, y, z);
      uvs.push((x - center[0]) / width + 0.5, (z - center[2]) / depth + 0.5);
      return index;
    };
    const addRing = (points, radial, offset) => points.map(point => {
      const x = center[0] + point.x * radial, z = center[2] + point.y * radial;
      return add(x, this.roofTopAt(x, z) + offset, z);
    });
    const connect = (a, b) => {
      for (let i = 0; i < count; i++) {
        const j = (i + 1) % count;
        indices.push(a[i], b[j], b[i], a[i], a[j], b[j]);
      }
    };
    const topCenter = add(center[0], this.roofTopAt(center[0], center[2]) + upperOffset, center[2]);
    let previous;
    for (let level = 1; level <= levels; level++) {
      const ring = addRing(inner, level / levels, upperOffset);
      if (!previous) for (let i = 0; i < count; i++) indices.push(topCenter, ring[(i + 1) % count], ring[i]);
      else connect(previous, ring);
      previous = ring;
    }
    for (let step = 1; step <= 4; step++) {
      const angle = step * Math.PI / 8;
      const points = inner.map((point, i) => point.clone().lerp(outer[i], Math.sin(angle)));
      const ring = addRing(points, 1, upperOffset - edge * (1 - Math.cos(angle)));
      connect(previous, ring); previous = ring;
    }
    let ring = addRing(outer, 1, lowerOffset + edge); connect(previous, ring); previous = ring;
    for (let step = 3; step >= 0; step--) {
      const angle = step * Math.PI / 8;
      const points = inner.map((point, i) => point.clone().lerp(outer[i], Math.sin(angle)));
      ring = addRing(points, 1, lowerOffset + edge * (1 - Math.cos(angle)));
      connect(previous, ring); previous = ring;
    }
    for (let level = levels - 1; level >= 1; level--) {
      ring = addRing(inner, level / levels, lowerOffset); connect(previous, ring); previous = ring;
    }
    const bottomCenter = add(center[0], this.roofTopAt(center[0], center[2]) + lowerOffset, center[2]);
    for (let i = 0; i < count; i++) indices.push(previous[i], previous[(i + 1) % count], bottomCenter);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
    return this.mesh(this.shellGroup, geometry, material, [0, 0, 0], name);
  }

  makeVaultRoof() {
    const { width, depth } = this.roofSpan, m = this.materials;
    this.vaultLayer(width, depth, this.roofProfile.radius, 0, -0.22, 0.055, m.roof, 'SharedRoundedRoof');
    this.vaultLayer(width - 0.04, depth - 0.04, 0.90, -0.216, -0.325, 0.025, m.plaster, 'SoftIvoryRoofUnderside');
    this.vaultLayer(width - 0.02, depth - 0.02, 0.94, -0.219, -0.267, 0.012, m.wood, 'RoofEdgeTrim');
    // A shallow arched coaming closes the space above the original flat wall
    // tops. It is only the exterior attic skin and disappears in cutaway.
    const { minX, maxX, backZ, frontZ } = this.exterior;
    const outline = roundedRectangle(maxX - minX, frontZ - backZ, this.cornerRadius,
      (minX + maxX) / 2, (backZ + frontZ) / 2).getSpacedPoints(160).slice(0, 160);
    const positions = [], indices = [], uvs = [];
    for (let i = 0; i < outline.length; i++) {
      const point = outline[i], next = (i + 1) % outline.length;
      positions.push(point.x, this.layout.walls.front.top - 0.004, point.y,
        point.x, this.roofTopAt(point.x, point.y) - 0.315, point.y);
      uvs.push(i / outline.length, 0, i / outline.length, 1);
      const a = i * 2, b = next * 2;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
    // The coaming is visible through the real windows from inside, too.
    // Back-face culling used to expose a blue slit between the baked walls
    // and the curved roof when viewing the same room from outdoors.
    const coamingMaterial = m.plaster.clone(); coamingMaterial.side = THREE.DoubleSide;
    this.resources.add(coamingMaterial);
    this.mesh(this.shellGroup, geometry, coamingMaterial, [0, 0, 0], 'SharedArchedRoofCoaming');
  }

  makeShell() {
    const { shell, walls, floor, frontWindow, door } = this.layout, m = this.materials;
    const width = shell.max[0] - shell.min[0], height = walls.front.top - floor.top;
    const { minX, maxX, backZ, frontZ } = this.exterior, radius = this.cornerRadius;
    const front = new THREE.Shape();
    front.moveTo(minX + radius, floor.top); front.lineTo(maxX - radius, floor.top);
    front.lineTo(maxX - radius, walls.front.top); front.lineTo(minX + radius, walls.front.top); front.closePath();
    front.holes.push(roundedRectangle(frontWindow.width, frontWindow.height, frontWindow.radius,
      frontWindow.center[0], frontWindow.center[1], new THREE.Path()));
    // 2 mm threshold connects the doorway cutout to the continuous floor.
    front.holes.push(roundedRectangle(door.width, door.height - 0.002, 0.025,
      door.center[0], door.center[1] + 0.001, new THREE.Path()));
    this.mesh(this.persistentGroup, new THREE.ExtrudeGeometry(front, { depth: walls.thickness, bevelEnabled: false }),
      m.plaster, [0, 0, walls.front.inner], 'NewFrontFacade');
    this.mesh(this.shellGroup, new THREE.BoxGeometry(walls.thickness, height, frontZ - backZ - radius * 2), m.plaster,
      [(walls.left.inner + walls.left.outer) / 2, floor.top + height / 2, (frontZ + backZ) / 2], 'NewLeftWall');
    this.makeExteriorSkins();
    this.makeVaultRoof();
    const frontFrame = this.frame(this.persistentGroup, frontWindow.width, frontWindow.height, 0.13,
      frontWindow.radius, m.navy, [frontWindow.center[0], frontWindow.center[1], walls.front.outer + 0.003]);
    frontFrame.name = 'SharedFrontWindowFrame';
    const glazingShape = roundedRectangle(frontWindow.width, frontWindow.height, frontWindow.radius);
    const frontGlass = this.mesh(this.persistentGroup, new THREE.ShapeGeometry(glazingShape), m.glass,
      [frontWindow.center[0], frontWindow.center[1], walls.front.outer + 0.018], 'SharedFrontGlazing');
    frontGlass.castShadow = false;
    this.box(this.persistentGroup, [0.065, frontWindow.height, 0.085],
      [frontWindow.center[0], frontWindow.center[1], walls.front.outer + 0.035], m.brass, 0.012);
    this.box(this.persistentGroup, [frontWindow.width + 0.35, 0.08, 0.36],
      [frontWindow.center[0], frontWindow.center[1] - frontWindow.height / 2 - 0.06, walls.front.outer + 0.08], m.navy, 0.03);
    // The warm timber skirting repeats the retained room's floor material.
    for (const [a, b] of [[minX + radius, door.openingMinX - 0.12], [door.openingMaxX + 0.12, maxX - radius]]) {
      this.box(this.persistentGroup, [b - a, 0.32, 0.07], [(a + b) / 2, floor.top + 0.24, walls.front.outer + 0.036], m.wood, 0.018);
    }
    this.box(this.shellGroup, [0.07, 0.32, frontZ - backZ - radius * 2],
      [walls.left.outer - 0.036, floor.top + 0.24, (frontZ + backZ) / 2], m.wood, 0.018);
    const corners = [
      { name: 'FrontRight', center: [maxX - radius, frontZ - radius], angle: 0 },
      { name: 'FrontLeft', center: [minX + radius, frontZ - radius], angle: Math.PI / 2 },
      { name: 'BackLeft', center: [minX + radius, backZ + radius], angle: Math.PI },
      { name: 'BackRight', center: [maxX - radius, backZ + radius], angle: Math.PI * 1.5 },
    ];
    for (const corner of corners) {
      const parent=corner.name==='BackLeft'?this.shellGroup:this.persistentGroup;
      this.cornerSurface(parent, corner.center, radius, floor.min[1], walls.front.top,
        corner.angle, m.plaster, 'RoundedWallCorner' + corner.name);
      this.cornerSurface(parent, corner.center, radius + 0.071, floor.top + 0.08, floor.top + 0.40,
        corner.angle, m.wood, 'RoundedTimberSkirting' + corner.name);
    }
  }

  makeExteriorSkins() {
    const { shell, walls, floor, rightWindow } = this.layout, m = this.materials;
    const { minX, maxX, backZ, frontZ } = this.exterior, radius = this.cornerRadius;
    // The baked source's right/back walls face into the room. These thin
    // exterior surfaces face out, lie 3 mm beyond the measured outer planes,
    // remain visible with the original baked inside faces in every room state.
    const right = new THREE.Shape();
    right.moveTo(-frontZ + radius, floor.min[1]);
    right.lineTo(-backZ - radius, floor.min[1]);
    right.lineTo(-backZ - radius, walls.right.top);
    right.lineTo(-frontZ + radius, walls.right.top); right.closePath();
    right.holes.push(roundedRectangle(rightWindow.width, rightWindow.height, 0,
      -rightWindow.center[2], rightWindow.center[1], new THREE.Path()));
    const rightSkin = this.mesh(this.persistentGroup, new THREE.ShapeGeometry(right), m.plaster,
      [maxX, 0, 0], 'OriginalRightWallExteriorSkin');
    rightSkin.rotation.y = Math.PI / 2;
    const backHeight = walls.back.top - floor.min[1];
    const backSkin = this.mesh(this.persistentGroup,
      new THREE.PlaneGeometry(maxX - minX - radius * 2, backHeight), m.plaster,
      [(minX + maxX) / 2, floor.min[1] + backHeight / 2, backZ], 'OriginalBackWallExteriorSkin');
    backSkin.rotation.y = Math.PI;
    this.box(this.persistentGroup, [0.07, 0.32, frontZ - backZ - radius * 2],
      [maxX + 0.036, floor.top + 0.24, (frontZ + backZ) / 2], m.wood, 0.018);
    this.box(this.persistentGroup, [maxX - minX - radius * 2, 0.32, 0.07],
      [(minX + maxX) / 2, floor.top + 0.24, backZ - 0.036], m.wood, 0.018);
  }

  makeTerrace() {
    const { terrace, shell, floor } = this.layout, m = this.materials;
    const terraceWidth = terrace.max[0] - terrace.min[0], terraceDepth = terrace.max[2] - terrace.min[2];
    const cx = (terrace.max[0] + terrace.min[0]) / 2, cz = (terrace.max[2] + terrace.min[2]) / 2;
    this.terrace = new THREE.Group(); this.terrace.name = 'OneSharedWoodTerrace'; this.persistentGroup.add(this.terrace);
    const fullDepth = terrace.max[2] - shell.min[2];
    this.roundedSlab(this.persistentGroup, terraceWidth + 0.10, fullDepth + 0.10, 0.26, 0.15, 0.025,
      [cx, -0.38, (terrace.max[2] + shell.min[2]) / 2], m.dark, 'SharedFloatingFoundation');
    this.box(this.terrace, [terraceWidth + 0.04, 0.06, terraceDepth + 0.05], [cx, -0.17, cz], m.brass, 0.025);
    for (const x of [terrace.min[0] + 0.70, cx, terrace.max[0] - 0.70]) {
      this.box(this.terrace, [0.15, 0.15, terraceDepth + 0.08], [x, -0.16, cz], m.dark, 0.022);
      this.rod(this.terrace, [x, -0.28, terrace.min[2] - 0.36], [x, -0.57, terrace.min[2] + 0.95], 0.070, m.brass);
    }
    const count = 38, plankWidth = terraceWidth / count;
    const geometry = new RoundedBoxGeometry(plankWidth - 0.014, 0.12, terraceDepth, 2, 0.016);
    const planks = new THREE.InstancedMesh(geometry, m.wood, count); planks.name = 'RealTerraceWoodPlanks';
    planks.castShadow = true; planks.receiveShadow = true;
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      matrix.makeTranslation(terrace.min[0] + plankWidth * (i + 0.5), floor.top - 0.06, cz);
      planks.setMatrixAt(i, matrix);
      planks.setColorAt(i, new THREE.Color().setRGB(0.89 + (i % 5) * 0.019, 0.88 + (i % 4) * 0.025, 0.85 + (i % 3) * 0.03));
    }
    this.terrace.add(planks); this.resources.add(geometry);
    const railY = terrace.top + terrace.railHeight;
    for (const x of [terrace.min[0] + 0.15, terrace.max[0] - 0.15]) {
      for (const z of [terrace.min[2] + 0.35, cz, terrace.max[2] - 0.14]) {
        this.rod(this.terrace, [x, terrace.top, z], [x, railY, z], 0.035, m.brass);
      }
      this.rod(this.terrace, [x, railY, terrace.min[2] + 0.35], [x, railY, terrace.max[2] - 0.14], 0.039, m.brass);
      this.rod(this.terrace, [x, terrace.top + 0.37, terrace.min[2] + 0.35], [x, terrace.top + 0.37, terrace.max[2] - 0.14], 0.015, m.navy);
    }
    for (const [start, end] of [[terrace.min[0] + 0.15, terrace.entryGap[0]], [terrace.entryGap[1], terrace.max[0] - 0.15]]) {
      const z = terrace.max[2] - 0.14;
      for (const x of [start, (start + end) / 2, end]) this.rod(this.terrace, [x, terrace.top, z], [x, railY, z], 0.035, m.brass);
      this.rod(this.terrace, [start, railY, z], [end, railY, z], 0.039, m.brass);
      this.rod(this.terrace, [start, terrace.top + 0.37, z], [end, terrace.top + 0.37, z], 0.015, m.navy);
    }
    const padMaterial = new THREE.MeshBasicMaterial({ color: '#b9dce1', transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false });
    this.resources.add(padMaterial);
    const marker = this.mesh(this.terrace, new THREE.RingGeometry(0.49, 0.505, 64), padMaterial,
      [this.docking.x, terrace.top + 0.012, this.docking.z], 'EntryLandingMarker');
    marker.rotation.x = -Math.PI / 2; marker.castShadow = false;
    this.makePlanter([-4.50, terrace.top, 5.50], 0.63);
    this.makePlanter([3.52, terrace.top, 6.32], 0.42);
    this.box(this.terrace, [1.35, 0.12, 0.50], [-2.70, 0.53, 6.60], m.wood, 0.035, 'TerraceBench');
    for (const x of [-3.18, -2.22]) this.box(this.terrace, [0.075, 0.49, 0.32], [x, 0.26, 6.60], m.dark, 0.012);
  }

  makeEntry() {
    const { door, walls, floor } = this.layout, m = this.materials;
    this.entryFrame = new THREE.Group(); this.entryFrame.name = 'PersistentSharedDoorFrame'; this.persistentGroup.add(this.entryFrame);
    const centerY = floor.top + door.height / 2, faceZ = walls.front.outer + 0.042;
    for (const x of [door.openingMinX - 0.062, door.openingMaxX + 0.062]) {
      this.box(this.entryFrame, [0.13, door.height + 0.13, 0.34], [x, centerY + 0.018, door.center[2]], m.navy, 0.035);
      this.box(this.entryFrame, [0.023, door.height - 0.10, 0.035], [x, centerY, faceZ + 0.013], m.brass, 0.009);
    }
    this.box(this.entryFrame, [door.width + 0.255, 0.13, 0.34], [door.center[0], floor.top + door.height + 0.048, door.center[2]], m.navy, 0.035);
    this.box(this.entryFrame, [door.width + 0.11, 0.029, 0.42], [door.center[0], floor.top + 0.015, door.center[2]], m.brass, 0.008, 'SharedDoorThreshold');
    this.box(this.entryFrame, [door.width - 0.09, 0.032, 0.065], [door.center[0], floor.top + door.height - 0.032, faceZ], m.lamp, 0.012);
    const light = new THREE.PointLight('#ffd699', 3.8, 5, 2); light.position.set(door.center[0], 3.42, 5.20); this.entryFrame.add(light);
    this.doorLeaf = new THREE.Group(); this.doorLeaf.name = 'SharedDoorLeaf';
    this.doorLeaf.position.set(door.openingMinX, floor.top, faceZ - 0.032); this.persistentGroup.add(this.doorLeaf);
    this.entranceObject = this.box(this.doorLeaf, [door.width - 0.04, door.height - 0.03, 0.035],
      [door.width / 2, door.height / 2, 0], m.glass, 0.014, 'StudioEntrance');
    this.entranceObject.userData.action = 'enter'; this.entranceObject.userData.hotspotId = 'entrance';
    for (const x of [0.045, door.width - 0.045]) this.box(this.doorLeaf, [0.055, door.height - 0.04, 0.066], [x, door.height / 2, 0], m.brass, 0.014);
    for (const y of [0.045, 0.98, door.height - 0.045]) this.box(this.doorLeaf, [door.width - 0.05, 0.055, 0.066], [door.width / 2, y, 0], m.brass, 0.014);
    this.box(this.doorLeaf, [0.045, 0.48, 0.08], [door.width - 0.24, 1.54, 0.075], m.brass, 0.018);
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 216;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#24414c'; ctx.fillRect(0, 0, 1024, 216);
    ctx.font = '500 103px "Microsoft YaHei", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#e8d8b7'; ctx.fillText('星港工作室', 512, 109);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; this.resources.add(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }); this.resources.add(material);
    this.box(this.entryFrame, [2.40, 0.49, 0.12], [door.center[0], 4.05, faceZ + 0.08], m.brass, 0.045);
    this.mesh(this.entryFrame, new THREE.PlaneGeometry(2.24, 0.40), material, [door.center[0], 4.05, faceZ + 0.146], 'SharedStudioSign');
    // Lightweight brackets connect the retained sign to the retained portal
    // after the facade is cut away; no freestanding sign or large room wall.
    for (const [index, offset] of [-0.73, 0.73].entries()) {
      const x = door.center[0] + offset;
      const support = new THREE.Group(); support.name = index ? 'SharedSignSupportRight' : 'SharedSignSupportLeft';
      this.entryFrame.add(support);
      this.rod(support, [x, floor.top + door.height + 0.048, door.center[2]], [x, 3.52, faceZ + 0.075], 0.030, m.brass);
      this.rod(support, [x, 3.52, faceZ + 0.075], [x, 3.88, faceZ + 0.075], 0.030, m.brass);
    }
  }

  makeRightWindow() {
    const window = this.layout.rightWindow, m = this.materials;
    const group = new THREE.Group(); group.name = 'OriginalRightWindowExteriorTrim';
    group.position.set(window.outerPlane + 0.009, window.center[1], window.center[2]); group.rotation.y = Math.PI / 2;
    this.persistentGroup.add(group);
    this.frame(group, window.width, window.height, 0.095, 0.015, m.navy, [0, 0, 0], 0.055);
    const glass = this.mesh(group, new THREE.PlaneGeometry(window.width - 0.028, window.height - 0.028), m.glass, [0, 0, -0.125], 'SameOriginalWindowGlass');
    glass.castShadow = false;
    this.box(this.persistentGroup, [0.36, 0.075, window.width + 0.28],
      [window.outerPlane + 0.09, window.min[1] - 0.04, window.center[2]], m.navy, 0.022);
  }

  makeRoofDetails() {
    const m = this.materials, top = this.roofTopAt(3.05, -2.30);
    this.rod(this.shellGroup, [3.05, top + 0.015, -2.30], [3.05, top + 0.83, -2.30], 0.035, m.brass);
    this.mesh(this.shellGroup, new THREE.SphereGeometry(0.09, 16, 10), m.lamp, [3.05, top + 0.86, -2.30]);
    const dish = this.mesh(this.shellGroup, new THREE.SphereGeometry(0.30, 24, 12, 0, TAU, 0, Math.PI / 2), m.navy, [3.05, top + 0.34, -2.30]);
    dish.rotation.z = -0.42;
    // A compact skylight detail sits on the same roof rather than inventing a
    // second glass dome that would disagree with the retained interior walls.
    const x = -2.18, z = -1.15, surface = this.roofTopAt(x, z);
    const dx = (this.roofTopAt(x + 0.01, z) - this.roofTopAt(x - 0.01, z)) / 0.02;
    const dz = (this.roofTopAt(x, z + 0.01) - this.roofTopAt(x, z - 0.01)) / 0.02;
    const hatch = new THREE.Group(); hatch.name = 'RoofServiceHatch';
    hatch.position.set(x, surface + 0.052, z); hatch.rotation.set(Math.atan(-dz), 0, Math.atan(dx)); this.shellGroup.add(hatch);
    this.box(hatch, [1.50, 0.10, 1.35], [0, 0, 0], m.dark, 0.04);
    this.box(hatch, [1.27, 0.035, 1.12], [0, 0.066, 0], m.glass, 0.01);
  }

  makePlanter(position, radius) {
    const m = this.materials, group = new THREE.Group(); group.position.set(...position); this.terrace.add(group);
    this.mesh(group, new THREE.CylinderGeometry(radius * 0.56, radius * 0.43, radius * 0.9, 24), m.terracotta, [0, radius * 0.45, 0]);
    this.mesh(group, new THREE.CylinderGeometry(radius * 0.48, radius * 0.48, 0.026, 24), m.dark, [0, radius * 0.88, 0]);
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.399;
      const leaf = this.mesh(group, new THREE.SphereGeometry(radius * 0.34, 16, 10), m.leaves,
        [Math.cos(angle) * radius * 0.28, radius * (1.10 + (i % 3) * 0.18), Math.sin(angle) * radius * 0.28]);
      leaf.scale.set(0.68, 1.6, 0.45); leaf.rotation.z = Math.cos(angle) * -0.5; leaf.rotation.x = Math.sin(angle) * 0.5;
    }
  }

  setCutaway(cutaway) {
    this.setReveal(cutaway?1:0);
  }

  setReveal(progress) {
    this.revealProgress=THREE.MathUtils.clamp(progress,0,1);
    this.applyReveal();
  }

  updateView(camera) {
    // Cut only for the elevated dollhouse overview. A camera inside the
    // room or looking through either window keeps the physical enclosure.
    const {walls}=this.layout,p=camera.position;
    const elevation=THREE.MathUtils.smoothstep(p.y,walls.front.top-.15,walls.front.top+1.2);
    const outside=Math.max(walls.left.inner-p.x,p.z-walls.front.inner);
    this.viewReveal=elevation*THREE.MathUtils.smoothstep(outside,0,1);
    this.applyReveal();
  }

  applyReveal() {
    const presence=1-this.revealProgress*(this.viewReveal??1);
    this.cutaway=presence<.001;this.shellGroup.visible=!this.cutaway;this.doorLeaf.visible=!this.cutaway;
    for(const [material,base] of this.revealMaterials){material.opacity=base.opacity*presence;material.depthWrite=base.depthWrite&&presence>.98;}
    this.persistentGroup.visible = true;
  }

  setDoorOpen(open) { this.doorTargetAngle = open ? -Math.PI * 0.48 : 0; }

  update(dt) {
    const blend = 1 - Math.exp(-Math.min(Math.max(dt || 0, 0), 0.10) * 8);
    this.doorLeaf.rotation.y += (this.doorTargetAngle - this.doorLeaf.rotation.y) * blend;
    if (Math.abs(this.doorTargetAngle - this.doorLeaf.rotation.y) < 0.001) this.doorLeaf.rotation.y = this.doorTargetAngle;
  }

  dispose() {
    this.scene.remove(this.group);
    for (const resource of this.resources) resource.dispose();
    this.resources.clear();
  }
}

export default StudioBuilding;
