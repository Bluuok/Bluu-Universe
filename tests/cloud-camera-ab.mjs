import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Existing inspection APIs fix both eye and character/focus-capsule positions.
// This isolates cloud appearance; it is deliberately not a flight acceptance test.
const out = process.env.CLOUD_AB_OUT || 'E:/temp/starhaven-rc36-rc37-cloud-ab';
const headless = process.env.CLOUD_AB_HEADLESS === '1';
const versions = JSON.parse(process.env.CLOUD_AB_VERSIONS || '[{"id":"rc36","url":"http://127.0.0.1:4235/"},{"id":"rc37","url":"http://127.0.0.1:4236/"}]');
const reference = JSON.parse(await readFile('E:/temp/starhaven-rc29-main-vortex/report.json', 'utf8'));
const views = process.env.CLOUD_AB_POSES ? JSON.parse(await readFile(process.env.CLOUD_AB_POSES, 'utf8')) : reference.checks.filter(c => /look/.test(c.name) && (!process.env.CLOUD_AB_FILTER || c.name.includes(process.env.CLOUD_AB_FILTER))).map(c => ({
  name: c.name, position: c.camera, target: c.framing.avoidance.focus,
  player: c.player, yaw: c.flight.yaw,
}));
await mkdir(out, { recursive: true });
const report = {
  started: new Date().toISOString(),
  method: `Installed ${headless?'headless':'headed'} Chrome / ANGLE D3D11. Exact camera and character positions set using pre-existing diagnostic fixtures; no flight/input/OS-focus acceptance claim. Camera targets use recorded RC29 body focus. Animated noise is not time-locked. Timing samples exclude screenshots and camera transitions; rAF cadence is not GPU duration.`,
  views, sessions: [], errors: [],
};
const save = () => writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
try {
  for (const version of versions) {
    const dir = path.join(out, version.id);
    await mkdir(dir, { recursive: true });
    const session = { ...version, started: new Date().toISOString(), views: [], errors: [], requestFailures: [], browserClosed: false };
    report.sessions.push(session);
    const browser = await chromium.launch({
      headless,
      executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      args: ['--use-angle=d3d11', '--enable-gpu', '--disable-software-rasterizer', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
    });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
      const page = await context.newPage();
      page.on('pageerror', e => session.errors.push(e.message));
      page.on('console', e => { if (e.type() === 'error') session.errors.push(e.text()); });
      page.on('requestfailed', r => session.requestFailures.push({ url: r.url(), error: r.failure()?.errorText }));
      await page.goto(version.url, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.starhaven?.ready, { timeout: 120000 });
      await page.waitForTimeout(800);
      const bundle = await page.evaluate(() => [...document.scripts].map(s => s.src).find(s => s.includes('/assets/index-')));
      session.build = { bundle, sha256: createHash('sha256').update(Buffer.from(await (await fetch(bundle)).arrayBuffer())).digest('hex') };
      session.gpu = await page.evaluate(() => {
        const gl = document.querySelector('canvas').getContext('webgl2');
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), samples: gl.getParameter(gl.SAMPLES) };
      });
      session.spawn = await page.evaluate(() => ({ camera: starhaven.camera, player: starhaven.player, state: starhaven.state }));
      session.spawn.screenshot = path.join(dir, '00-normal-spawn.png');
      await page.screenshot({ path: session.spawn.screenshot });
      for (const view of views) {
        const applied = await page.evaluate(v => {
          const a = window.starhaven;
          return a.inspect.placeFlightFixture({ position: v.player, yaw: v.yaw }) && a.inspect.framePosition({ position: v.position, target: v.target, duration: .2 });
        }, view);
        assert.ok(applied, 'Diagnostic pose was rejected');
        await page.waitForFunction(() => !window.starhaven.cameraProgress.transition);
        await page.waitForTimeout(450);
        const sample = await page.evaluate(async () => {
          const a = window.starhaven, gaps = [];
          let last;
          await new Promise(resolve => {
            function frame(now) {
              if (last !== undefined) gaps.push(now - last);
              last = now;
              if (gaps.length === 240) resolve(); else requestAnimationFrame(frame);
            }
            requestAnimationFrame(frame);
          });
          const sorted = [...gaps].sort((x, y) => x - y);
          return { camera: a.camera, target: a.cameraProgress.target, player: a.player, state: a.state,
            rendering: a.rendering, vortex: a.vortex, paintFlow: a.ambient?.paintFlow||null,
            cadence: { samples: gaps.length, median: sorted[120], p95: sorted[228], max: sorted.at(-1), gaps } };
        });
        assert.ok(Math.hypot(...sample.camera.map((x, i) => x - view.position[i])) < 1e-7, 'Camera drift');
        assert.ok(Math.hypot(...sample.target.map((x, i) => x - view.target[i])) < 1e-7, 'Target drift');
        assert.ok(Math.hypot(...sample.player.map((x, i) => x - view.player[i])) < 1e-7, 'Player drift');
        const screenshot = path.join(dir, `${view.name}.png`);
        await page.screenshot({ path: screenshot });
        session.views.push({ name: view.name, screenshot, ...sample });
        await save();
        console.log(JSON.stringify({ version: version.id, view: view.name, median: sample.cadence.median, p95: sample.cadence.p95, max: sample.cadence.max }));
      }
      assert.equal(session.errors.length, 0, 'Browser runtime error');
      session.status = 'captured';
    } finally {
      await browser.close();
      session.browserClosed = true;
      session.finished = new Date().toISOString();
      await save();
    }
  }
  report.status = 'captured-awaiting-visual-review';
} catch (error) {
  report.status = 'failed';
  report.errors.push(error.stack);
  process.exitCode = 1;
} finally {
  report.finished = new Date().toISOString();
  await save();
  console.log(JSON.stringify({ status: report.status, report: path.join(out, 'report.json') }));
}
