import {
  Box3, CanvasTexture, CircleGeometry, Color, CylinderGeometry, DoubleSide,
  Group, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, PlaneGeometry, PointLight, RingGeometry,
  SphereGeometry, SRGBColorSpace, Vector3, Raycaster, TextureLoader,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

// Baked meshes, texture assignment, exhibit positions and camera anchors are
// adapted from jrefusta/joan-portfolio (MIT). The GLBs remain the original room.
const DEFAULT_EXHIBITS = {
  threadcove: {
    object: 'leftMonitor', anchor: [1.06738, 2.50725, -4.23009],
    camera: { position: [1.06738, 2.8, -0.8], target: [1.06738, 2.50725, -4.23009] },
  },
  clawtide: {
    object: 'rightMonitor', anchor: [2.47898, 2.50716, -4.14566],
    camera: { position: [2.13997, 2.9, -0.65], target: [2.47898, 2.50716, -4.14566] },
  },
  contributions: {
    object: 'whiteboard', anchor: [-3.3927, 3.18774, -4.61366],
    camera: { position: [-3.3927, 4.3, 0.75], target: [-3.3927, 3.18774, -4.61366] },
  },
  contact: {
    object: 'card', anchor: [-0.14, 2.07, -3.14],
    camera: { position: [-0.14, 2.65, -1.05], target: [-0.14, 2.07, -3.14] },
  },
};

const DEFAULT_MODELS = [
  { name: 'room1', file: 'room.glb', baked: 0 },
  { name: 'room2', file: 'room2.glb', baked: 1 },
  { name: 'room3', file: 'room3.glb', baked: 2 },
  { name: 'leftMonitor', file: 'leftMonitor.glb', baked: 1 },
  { name: 'rightMonitor', file: 'rightMonitor.glb', baked: 1 },
  { name: 'whiteboard', file: 'whiteboard.glb', baked: 0 },
  { name: 'topChair', file: 'topChair.glb', baked: 1, position: [1.4027, 0.496728, -1.21048] },
  { name: 'arcadeMachine', file: 'arcadeMachine.glb', baked: 0 },
];

const vector = (value, fallback = [0, 0, 0]) => value?.isVector3
  ? value.clone() : new Vector3(...(Array.isArray(value) ? value : fallback));

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function wrapText(ctx, value, x, y, maxWidth, lineHeight, maxLines = 2) {
  const text = String(value || '');
  let line = '';
  let row = 0;
  for (const char of text) {
    if (ctx.measureText(line + char).width > maxWidth && line) {
      ctx.fillText(line, x, y + row * lineHeight);
      line = char;
      if (++row >= maxLines) return;
    } else line += char;
  }
  if (line && row < maxLines) ctx.fillText(line, x, y + row * lineHeight);
}

export class RoomScene {
  constructor({ scene, renderer, manifest = {}, registry = {} }) {
    this.scene = scene;
    this.renderer = renderer;
    this.manifest = manifest.room || {};
    this.registry = registry;
    this.group = new Group();
    this.group.name = 'starhaven-room';
    this.group.userData.sharedInterior = true;
    this.group.position.copy(vector(this.manifest.position));
    const scale = this.manifest.scale ?? 1;
    Array.isArray(scale) ? this.group.scale.set(...scale) : this.group.scale.setScalar(scale);
    // One loaded interior stays in the same world in SPACE and ROOM.
    // The building shell handles cutaway; furniture never swaps at entry.
    this.group.visible = true;
    this.scene.add(this.group);
    this.hotspots = [];
    this.hoveredExhibit = null;
    this.feedbackTint = new Color('#fff2d5').multiplyScalar(1.12);
    this.objects = new Map();
    this.resources = new Set();
    this.status = 'idle';
    this.overview = {
      position: vector(this.manifest.overview?.position, [-12, 10, 15]),
      target: vector(this.manifest.overview?.target, [0, 2, 0]),
    };
    this.basePath = (this.manifest.basePath || this.manifest.base || '/assets/room/').replace(/\/?$/, '/');
  }

  async load() {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.loadRoom();
    return this.loadPromise;
  }

  async loadRoom() {
    this.status = 'loading';
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(this.basePath + 'draco/');
    dracoLoader.setDecoderConfig({ type: 'wasm' });
    gltfLoader.setDRACOLoader(dracoLoader);
    const ktxLoader = new KTX2Loader();
    ktxLoader.setTranscoderPath(this.basePath + 'basis/');
    ktxLoader.detectSupport(this.renderer);
    const models = this.manifest.models || DEFAULT_MODELS;
    try {
      const [textures, gltfs] = await Promise.all([
        Promise.all((this.manifest.bakedTextures || ['baked1.ktx2', 'baked2.ktx2', 'baked3.ktx2'])
          .map(file => ktxLoader.loadAsync(this.assetUrl(file, 'textures/')))),
        Promise.all(models.map(model => gltfLoader.loadAsync(this.assetUrl(model.file || model.url, 'models/')))),
      ]);
      // Keep the approved baked-room exposure after removing global OutputPass.
      this.bakedMaterials = textures.map(texture => {
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        texture.needsUpdate = true;
        this.resources.add(texture);
        const material = new MeshBasicMaterial({ map: texture, toneMapped: true });
        // Preserve the original baked textures and contact shadows. Local
        // spatial colour grading gives the existing pendant/desk/window their
        // own light pools; Basic materials would ignore extra PointLights.
        material.onBeforeCompile = shader => {
          shader.vertexShader = 'varying vec3 vStudioPosition;\n' + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvStudioPosition = (modelMatrix * vec4(position, 1.0)).xyz;');
          shader.fragmentShader = 'varying vec3 vStudioPosition;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
            vec3 deskDelta = (vStudioPosition - vec3(0.7, 2.0, -3.3)) / vec3(3.4, 2.0, 2.8);
            float deskPool = exp(-dot(deskDelta, deskDelta));
            vec3 pendantDelta = (vStudioPosition - vec3(-1.4, 0.1, -0.8)) / vec3(3.3, 2.9, 3.5);
            float pendantPool = exp(-dot(pendantDelta, pendantDelta));
            float windowFill = exp(-pow((vStudioPosition.x - 3.9) / 2.4, 2.0)) * exp(-pow((vStudioPosition.z + 0.8) / 2.6, 2.0));
            vec3 grade = vec3(.86, .87, .88) + vec3(.22, .12, .025) * deskPool + vec3(.13, .065, .008) * pendantPool + vec3(.025, .065, .105) * windowFill;
            outgoingLight *= grade;
            float floorWood = (1.0 - smoothstep(.06, .22, vStudioPosition.y)) * smoothstep(.06, .20, outgoingLight.r - outgoingLight.b);
            outgoingLight = mix(outgoingLight, min(outgoingLight, vec3(.46, .20, .065)), floorWood * .26);
            float underDesk = exp(-pow((vStudioPosition.x - 1.1) / 2.4, 2.0) - pow((vStudioPosition.z + 3.6) / 1.1, 2.0)) * (1.0 - smoothstep(1.5, 2.1, vStudioPosition.y));
            outgoingLight.b *= 1.0 - underDesk * .22;
            // The original shadows are baked. A local reflected-light floor
            // lowers their contrast without washing out the furniture texture.
            vec3 plantDelta = (vStudioPosition - vec3(3.5, 1.4, -1.9)) / vec3(2.7, 2.5, 2.6);
            float receiver = max(1.0 - smoothstep(.03, .16, abs(vStudioPosition.y)), smoothstep(4.2, 4.8, vStudioPosition.x));
            float shadowLift = exp(-dot(plantDelta, plantDelta)) * receiver * (1.0 - smoothstep(.04, .23, dot(outgoingLight, vec3(.2126, .7152, .0722))));
            outgoingLight += vec3(.035, .028, .018) * shadowLift;
            #include <opaque_fragment>
          `);
        };
        material.customProgramCacheKey = () => 'starhaven-baked-local-light-v3';
        this.resources.add(material);
        return material;
      });
      gltfs.forEach((gltf, index) => {
        const specification = models[index];
        const object = gltf.scene;
        object.name = specification.name;
        if (specification.position) object.position.copy(vector(specification.position));
        if (specification.rotation) object.rotation.set(...specification.rotation);
        if (specification.scale) object.scale.setScalar(specification.scale);
        object.traverse(child => {
          if (!child.isMesh) return;
          child.material = this.bakedMaterials[specification.baked ?? 0];
          child.castShadow = false;
          child.receiveShadow = false;
          this.resources.add(child.geometry);
        });
        this.objects.set(specification.name, object);
        this.group.add(object);
      });
      this.makeExhibits();
      this.makeWarmAccents();
      this.makeRug();
      await this.makeStarOrnament();
      this.group.updateMatrixWorld(true);
      this.bounds = new Box3().setFromObject(this.group);
      this.status = 'ready';
      return this;
    } catch (error) {
      this.status = 'error';
      this.error = error;
      throw new Error('原始房间资源加载失败：' + error.message, { cause: error });
    } finally {
      dracoLoader.dispose();
      ktxLoader.dispose();
    }
  }

  async makeStarOrnament() {
    const spec=this.manifest.starOrnament;
    if(!spec?.enabled)return;
    this.group.updateMatrixWorld(true);
    const origin=vector(spec.support).applyMatrix4(this.group.matrixWorld);
    const ray=new Raycaster(origin,new Vector3(0,-1,0));
    const support=ray.intersectObjects([...this.objects.values()],true)
      .find(hit=>hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y>.7);
    if(!support||support.point.y<.7)throw new Error('Star ornament requires an actual furniture surface');
    const texture=await new TextureLoader().loadAsync(spec.url);
    texture.colorSpace=SRGBColorSpace;
    texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    const geometry=new PlaneGeometry(spec.height,spec.height);
    const material=new MeshBasicMaterial({map:texture,transparent:true,alphaTest:.05,depthWrite:false,side:DoubleSide});
    const ornament=new Mesh(geometry,material);
    ornament.name='StarCeramicFlatOrnament';
    ornament.position.copy(this.group.worldToLocal(support.point.clone()));
    ornament.position.y+=spec.height*(spec.alphaBase-.5)+.002;
    ornament.rotation.y=spec.yaw;
    ornament.userData={flatImage:true,supportPoint:support.point.toArray(),supportObject:support.object.name};
    this.group.add(ornament);this.objects.set('starOrnament',ornament);
    for(const resource of [texture,geometry,material])this.resources.add(resource);
  }

  assetUrl(file, folder = '') {
    if (/^(https?:|\/)/.test(file)) return file;
    return this.basePath + folder + file;
  }

  project(id) {
    if (typeof this.registry.get === 'function') return this.registry.get(id) || {};
    if (Array.isArray(this.registry)) return this.registry.find(item => item.id === id) || {};
    if (Array.isArray(this.registry.projects)) return this.registry.projects.find(item => item.id === id) || {};
    return this.registry[id] || this.registry.projects?.[id] || {};
  }

  exhibitConfig(id) {
    const configured = Array.isArray(this.manifest.interactables)
      ? this.manifest.interactables.find(item => item.id === id)
      : this.manifest.interactables?.[id];
    const fallback = DEFAULT_EXHIBITS[id];
    return typeof configured === 'string'
      ? { ...fallback, object: configured }
      : { ...fallback, ...configured, camera: { ...fallback.camera, ...configured?.camera } };
  }

  makeExhibits() {
    for (const id of Object.keys(DEFAULT_EXHIBITS)) {
      const configuration = this.exhibitConfig(id);
      const objectName = configuration.object || configuration.mesh || configuration.name;
      let object = this.objects.get(objectName) || this.group.getObjectByName(objectName);
      if (id === 'contact' && !object) object = this.makeContactCard(configuration);
      if (!object) throw new Error('AssetManifest 中的室内展品不存在：' + objectName);
      object.userData.projectId = id;
      const anchor = vector(configuration.anchor);
      if (id !== 'contact') {
        const dimensions = id === 'contributions' ? [2.6, 1.82] : [1.3976, 0.7801];
        const screen = this.makeScreen(id, dimensions[0], dimensions[1]);
        screen.position.copy(anchor);
        screen.rotation.y = id === 'clawtide' ? (-7.406 * Math.PI / 180) : 0;
        screen.name = objectName + '-display';
        screen.userData.projectId = id;
        object.add(screen);
      }
      this.hotspots.push({
        id, object, anchor: this.group.localToWorld(anchor.clone()),
        feedback: [], amount: 0,
        camera: {
          position: this.group.localToWorld(vector(configuration.camera.position)),
          target: this.group.localToWorld(vector(configuration.camera.target || configuration.anchor)),
        },
      });
    }
    for (const hotspot of this.hotspots) hotspot.object.traverse(child => {
      if (child.userData.exhibitFeedback) hotspot.feedback.push(child.material);
    });
    // Reuse the arcade prop as a quiet star chart, with no embedded games or iframes.
    const chart = this.objects.get('arcadeMachine');
    if (chart) {
      const panel = this.makeStarChart();
      panel.position.set(3.24776, 2.7421, 2.3009);
      panel.rotation.set(-Math.PI / 7, -Math.PI / 2, 0);
      chart.add(panel);
    }
  }

  canvasTexture(canvas) {
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.magFilter = LinearFilter;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.resources.add(texture);
    return texture;
  }

  makeScreen(id, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = Math.round(1600 * height / width);
    const ctx = canvas.getContext('2d');
    const project = this.project(id);
    const isBoard = id === 'contributions';
    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, isBoard ? '#eef0e6' : '#173044');
    bg.addColorStop(1, isBoard ? '#dce8e0' : '#071725');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const ink = isBoard ? '#233d44' : '#e6f5f8';
    const muted = isBoard ? '#5d7577' : '#92b7c1';
    ctx.fillStyle = isBoard ? '#257c81' : '#d9b976';
    ctx.fillRect(70, 74, 70, 8);
    ctx.font = '500 30px "Microsoft YaHei", system-ui, sans-serif';
    ctx.fillStyle = muted;
    ctx.fillText(project.eyebrow || (isBoard ? '开源贡献 · 共同创造' : '工作室 · 项目档案'), 70, 126);
    ctx.font = '600 82px "Microsoft YaHei", system-ui, sans-serif';
    ctx.fillStyle = ink;
    wrapText(ctx, project.name || project.title || id, 70, 237, 1430, 102, 2);
    ctx.font = '400 36px "Microsoft YaHei", system-ui, sans-serif';
    ctx.fillStyle = muted;
    wrapText(ctx, project.tagline || project.subtitle || project.summary || '', 70, 365, 1380, 55, 2);
    const tags = (project.tags || []).slice(0, 3);
    let tagX = 70;
    ctx.font = '500 27px "Microsoft YaHei", system-ui, sans-serif';
    tags.forEach(tag => {
      const w = ctx.measureText(tag).width + 42;
      ctx.fillStyle = isBoard ? '#c6d9d3' : '#284457';
      roundRect(ctx, tagX, canvas.height - 135, w, 54, 27);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.fillText(tag, tagX + 21, canvas.height - 100);
      tagX += w + 17;
    });
    ctx.fillStyle = isBoard ? '#257c81' : '#d9b976';
    ctx.font = '500 29px "Microsoft YaHei", system-ui, sans-serif';
    ctx.fillText('点击展品 · 查看详情 ↗', 70, canvas.height - 30);
    if (isBoard) {
      ctx.strokeStyle = '#91b8b4';
      ctx.lineWidth = 3;
      for (let index = 0; index < 6; index++) {
        const x = 1090 + (index % 3) * 130;
        const y = 495 + Math.floor(index / 3) * 82;
        ctx.fillStyle = ['#bed7cd', '#edd8a6', '#b2d1d7'][index % 3];
        roundRect(ctx, x, y, 97, 53, 9); ctx.fill();
      }
    } else {
      ctx.strokeStyle = '#4d8992';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 80; i++) {
        const x = 1040 + i * 5;
        const y = 470 + Math.sin(i * 0.15 + (id === 'clawtide' ? 1 : 0)) * 38;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = '#d9b976';
      [1120, 1245, 1370].forEach((x, i) => {
        ctx.beginPath(); ctx.arc(x, 470 + Math.sin(i * 2.5) * 30, 7, 0, Math.PI * 2); ctx.fill();
      });
    }
    const material = new MeshBasicMaterial({ map: this.canvasTexture(canvas), toneMapped: true });
    const geometry = new PlaneGeometry(width, height);
    this.resources.add(material); this.resources.add(geometry);
    const screen = new Mesh(geometry, material);
    screen.userData.exhibitFeedback = true;
    return screen;
  }

  makeContactCard(configuration) {
    const card = new Group();
    card.name = configuration.object || 'card';
    const anchor = vector(configuration.anchor);
    const face = this.makeScreen('contact', 0.9, 0.55);
    face.position.copy(anchor);
    const backingMaterial = new MeshStandardMaterial({ color: 0xd9bb80, metalness: 0.32, roughness: 0.4 });
    const backing = new Mesh(new PlaneGeometry(0.94, 0.59), backingMaterial);
    backing.position.copy(anchor).add(new Vector3(0, 0, -0.016));
    backing.material.side = DoubleSide;
    const stand = new Mesh(new CylinderGeometry(0.17, 0.23, 0.055, 24), backingMaterial);
    stand.position.copy(anchor).add(new Vector3(0, -0.295, -0.07));
    card.add(backing, stand, face);
    this.resources.add(backingMaterial); this.resources.add(backing.geometry); this.resources.add(stand.geometry);
    this.group.add(card);
    this.objects.set(card.name, card);
    return card;
  }

  makeStarChart() {
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 924;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#091c2c'; ctx.fillRect(0, 0, 768, 924);
    ctx.strokeStyle = '#47727a'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.ellipse(385, 458, 70 + i * 53, 45 + i * 35, -0.3, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#e6c384'; ctx.beginPath(); ctx.arc(385, 458, 19, 0, Math.PI * 2); ctx.fill();
    ctx.font = '500 41px "Microsoft YaHei", system-ui, sans-serif';
    ctx.fillStyle = '#b9d9db'; ctx.fillText('星海观测站', 190, 155);
    ctx.font = '400 25px "Microsoft YaHei", system-ui, sans-serif';
    ctx.fillStyle = '#76969e'; ctx.fillText('把想法送入更远的轨道', 218, 786);
    const geometry = new PlaneGeometry(1.0271, 1.2343);
    const material = new MeshBasicMaterial({ map: this.canvasTexture(canvas), toneMapped: true });
    this.resources.add(geometry); this.resources.add(material);
    return new Mesh(geometry, material);
  }

  makeWarmAccents() {
    const brass = new MeshStandardMaterial({ color: 0xbf9654, metalness: 0.64, roughness: 0.3 });
    const cream = new MeshStandardMaterial({ color: 0xe9d8b1, roughness: 0.48, metalness: 0.08, side: DoubleSide });
    const glow = new MeshBasicMaterial({ color: new Color('#ffe7b0'), toneMapped: true });
    [brass, cream, glow].forEach(resource => this.resources.add(resource));
    const lamp = new Group(); lamp.name = 'warm-pendant'; lamp.position.set(-0.3, 5.6, -1.7);
    const stem = new Mesh(new CylinderGeometry(0.025, 0.025, 0.7, 12), brass);
    stem.position.y = 0.32;
    const shade = new Mesh(new CylinderGeometry(0.25, 0.66, 0.47, 40, 1, true), cream);
    shade.position.y = -0.21;
    const rim = new Mesh(new RingGeometry(0.62, 0.68, 40), brass);
    rim.rotation.x = Math.PI / 2; rim.position.y = -0.445;
    const bulb = new Mesh(new SphereGeometry(0.12, 20, 12), glow); bulb.position.y = -0.26;
    const warmLight = new PointLight(0xffdb9d, 18, 11, 2); warmLight.position.y = -0.5;
    lamp.add(stem, shade, rim, bulb, warmLight);
    lamp.traverse(child => { if (child.geometry) this.resources.add(child.geometry); });
    this.group.add(lamp);
    const deskLight = new PointLight(0x94d9ef, 3.5, 4, 2);
    deskLight.position.set(1.75, 2.8, -3.65); this.group.add(deskLight);
    const softWarm = new PointLight(0xffd1a1, 3, 8, 2);
    softWarm.position.set(-3.5, 3.8, 2.1); this.group.add(softWarm);
    this.chair = this.objects.get('topChair');
  }

  makeRug() {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#cbb09c'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 256; i++) {
      ctx.strokeStyle = i % 2 ? '#c3a891' : '#d6baa4'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(i * 2, 0); ctx.lineTo(i * 2, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * 2); ctx.lineTo(512, i * 2); ctx.stroke();
    }
    // The woven surface already clears the original rug by ~9mm. Lower its
    // reflectance under the studio lights and leave only a narrow contact rim.
    const material = new MeshStandardMaterial({ map: this.canvasTexture(canvas), color: 0x817368, roughness: 1 });
    const geometry = new CircleGeometry(1.69, 80);
    const rug = new Mesh(geometry, material);
    rug.name = 'woven-rug'; rug.rotation.x = -Math.PI / 2; rug.position.set(-2.61408, 0.03, -0.904327);
    this.group.add(rug); this.resources.add(geometry); this.resources.add(material);
  }

  setExhibitFocus(id, immediate = false) {
    this.hoveredExhibit = id;
    if (immediate) for (const hotspot of this.hotspots) hotspot.amount = hotspot.id === id ? 1 : 0;
  }

  update(dt, time) {
    if (!this.group.visible || this.status !== 'ready') return;
    for (const hotspot of this.hotspots) {
      hotspot.amount += ((hotspot.id === this.hoveredExhibit ? 1 : 0) - hotspot.amount) * (1 - Math.exp(-18 * dt));
      for (const material of hotspot.feedback) material.color.setRGB(1,1,1).lerp(this.feedbackTint,hotspot.amount);
    }
    if (this.chair) this.chair.rotation.y = Math.sin(time * 0.3) * 0.08;
  }

  setVisible(visible) { this.group.visible = visible; }

  getTelemetry() {
    this.group.updateMatrixWorld(true);
    const entities = [...this.objects.entries()].map(([name, object]) => {
      let meshes = 0;
      object.traverse(child => { if (child.isMesh) meshes++; });
      return {
        name, uuid: object.uuid, visible: object.visible, meshes,
        worldMatrix: object.matrixWorld.toArray(),
      };
    });
    return {
      status: this.status, groupUUID: this.group.uuid, visible: this.group.visible,
      sharedInterior: this.group.userData.sharedInterior === true,
      entities, worldMatrix: this.group.matrixWorld.toArray(),
    };
  }

  dispose() {
    this.scene.remove(this.group);
    for (const resource of this.resources) resource.dispose();
    this.resources.clear();
    this.hotspots.length = 0;
  }
}

export default RoomScene;
