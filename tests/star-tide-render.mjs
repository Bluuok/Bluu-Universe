// Linux-only fixed-camera comparison. The in-memory Vite transform steps the
// normal simulation and renderer without putting a capture API in the product.
import { chromium, desktopLaunchOptions, saveDesktopFrame } from './browser-runtime.mjs';
import { build, preview } from 'vite';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { runtimeBuildIdentity } from './runtime-build-identity.mjs';

assert.equal(process.platform, 'linux');
assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.LIBGL_ALWAYS_SOFTWARE, 'true');
const output = 'star-tide-evidence', fps = 12;
const width = 1440, height = 960;
await mkdir(output, { recursive: true });
const report = {
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  viewport: [width, height], seed: 4417, fps, frames: [], errors: [],
  method: 'Fixed diagnostic poses, two simulation steps per frame. MP4 encoded from canvas PNGs. Timings include both updates, rendering and gl.finish on SwiftShader.',
};
let server, browser;
try {
  let instrumented = false;
  await build({ plugins: [{
    name: 'fixed-step-star-tide', enforce: 'pre',
    transform(source, id) {
      if (!id.endsWith('/src/main.js')) return null;
      const begin = 'requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.35)';
      const end = 'renderer.render(scene,camera);}}animate();';
      assert.equal(source.split(begin).length, 2);
      assert.equal(source.split(end).length, 2);
      instrumented = true;
      return source.replace(begin, 'const dt=1/24').replace(end, `
        if (drawFrame) renderer.render(scene,camera);
      }}
      let drawFrame=false;
      window.stepStarTide=(count,draw)=>{
        for(let i=0;i<count;i++){drawFrame=draw && i===count-1;animate();}
        drawFrame=false;
        return elapsed;
      };`);
    },
  }] });
  assert(instrumented, 'Expected one instrumented app entry');
  server = await preview({ preview: { host: '127.0.0.1', port: 4259, strictPort: true } });
  browser = await chromium.launch(desktopLaunchOptions);
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') report.errors.push(message.text());
  });
  await page.addInitScript(() => {
    let seed = 4417;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  });
  await page.goto('http://127.0.0.1:4259/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.starhaven?.ready, null, { timeout: 240000 });
  await page.locator('#loading').waitFor({ state: 'hidden', timeout: 30000 });
  report.build = await runtimeBuildIdentity(page);
  report.renderer = await page.evaluate(() => {
    const gl = document.querySelector('#world').getContext('webgl2'), info = gl.getExtension('WEBGL_debug_renderer_info');
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });

  const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const add = (a, b) => a.map((v, i) => v + b[i]);
  async function capture(name, pose = {}) {
    const frame = await page.evaluate(({ pose, width, height }) => {
      const app = window.starhaven;
      if (pose.player && !app.inspect.placeFlightFixture({ position: pose.player, yaw: pose.yaw || 0 })) throw Error('Rejected flight fixture');
      if (pose.camera && !app.inspect.framePosition({ position: pose.camera, target: pose.target, duration: .001 })) throw Error('Rejected camera fixture');
      const canvas = document.getElementById('world'), gl = canvas.getContext('webgl2');
      const start = performance.now(), time = window.stepStarTide(2, true);
      gl.finish();
      const milliseconds = performance.now() - start;
      if (gl.isContextLost() || canvas.width !== width || canvas.height !== height) throw Error('Unexpected drawing buffer');
      // Read synchronously in the rendering task, before Chromium invalidates
      // its default framebuffer. Encoding is outside the reported frame time.
      return { png: canvas.toDataURL('image/png').split(',')[1], time, milliseconds,
        state: app.state, player: app.player, camera: app.camera, target: app.cameraProgress.target, rendering: app.rendering };
    }, { pose, width, height });
    assert.equal(frame.rendering.toneMappingExposure, .85);
    if (pose.camera) {
      for (const key of ['camera', 'target']) {
        assert(Math.hypot(...frame[key].map((v, i) => v - pose[key][i])) < .0001, 'Camera fixture drift');
      }
    }
    const { png, ...data } = frame;
    await writeFile(`${output}/${name}.png`, Buffer.from(png, 'base64'));
    report.frames.push({ name, ...data });
    if (report.frames.length % fps === 1) {
      console.log(`${name}  simulation=${frame.time.toFixed(2)}s  capture=${frame.milliseconds.toFixed(0)}ms`);
      await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
    }
    return frame.state;
  }
  assert.equal(await capture('porch'), 'SPACE');
  report.desktop = await saveDesktopFrame(page, `${output}/porch-desktop.png`);
  const porchFrame=report.frames[0];
  for(const [name,direction] of Object.entries({
    east:[1,0,0],west:[-1,0,0],north:[0,0,-1],south:[0,0,1],
    zenith:[0,1,-.001],nadir:[0,-1,-.001],
  })){
    await capture(name,{camera:porchFrame.camera,target:add(porchFrame.camera,direction)});
  }
  async function film(name, seconds, poseAt) {
    await mkdir(`${output}/${name}`, { recursive: true });
    for (let i = 0; i < seconds * fps; i++) {
      const t = i / (seconds * fps - 1);
      await capture(`${name}/${String(i).padStart(3, '0')}`, poseAt(t));
    }
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(fps),
      '-i', `${output}/${name}/%03d.png`, '-c:v', 'libx264', '-crf', '16',
      '-pix_fmt', 'yuv420p', `${output}/${name}.mp4`], { timeout: 90000 });
  }
  await film('lateral', 4, t => {
    const camera = lerp([-20, 4, -9], [-5, 4, -17], t);
    return { camera, target: add(camera, [-23, -2, -37]), player: add(camera, [-3.2, -2.4, -5.6]), yaw: .55 };
  });
  await film('cross-and-look-back', 5, t => {
    const u = Math.min(1, t / .58);
    const player = lerp([-28, 5, -33], [-39, 3, -55], u);
    // Brake on the far side, then turn together. The last second holds
    // the view still so motion along the ridges is visible independently.
    const turn = Math.max(0, Math.min(1, (t - .58) / .22));
    const yaw = .46 + Math.PI * turn * turn * (3 - 2 * turn);
    const dir = [-Math.sin(yaw), 0, -Math.cos(yaw)];
    const camera = add(player, [-dir[0] * 6, 2.1, -dir[2] * 6]);
    return { player, camera, target: add(player, [dir[0] * 4, 1, dir[2] * 4]), yaw };
  });
  await page.evaluate(() => {
    const app = window.starhaven;
    if (!app.inspect.placeFlightFixture({ position: [1.35, 1.15, 7.2], velocity: [0, 0, -2], yaw: 0 })) throw Error('Door fixture rejected');
    window.stepStarTide(1, false);
    if (app.state === 'SPACE' && !app.enterRoom()) throw Error('Doorway entry rejected');
    window.stepStarTide(120, false);
    if (app.state !== 'ROOM') throw Error('Expected room presentation');
  });
  assert.equal(await capture('window', { camera: [-1.1, 3.3, 1.1], target: [4.14635, 3.7746, -.74205] }), 'ROOM');
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser?.close();
  if (server) await new Promise(resolve => server.httpServer.close(resolve));
}
