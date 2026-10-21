// Environment diagnostic only; not a route or visual acceptance pass.
import { chromium, desktopLaunchOptions, saveDesktopFrame } from './browser-runtime.mjs';
import { runtimeBuildIdentity } from './runtime-build-identity.mjs';
import { preview, build } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { flyTo } from './room-flight-route.mjs';

assert.equal(process.platform, 'linux');
assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.LIBGL_ALWAYS_SOFTWARE, 'true');
const check = process.env.REMOTE_RENDER_CHECK || 'opengl';
assert(['opengl', 'ui-surface', 'arrival', 'paint-surface'].includes(check));
const paintSurfaceBefore = 'surface:{strokeStrength:.24,relief:.0018,paintScale:.30,globalUV:true}',
  paintSurfaceAfter = 'surface:{strokeStrength:.36,relief:.0018,paintScale:.16,globalUV:true}';
const root = `screenshots/remote-desktop/render-probe/${check}`;
await mkdir(root, { recursive: true });
const report = { started: new Date().toISOString(), commit: process.env.GITHUB_SHA,
  check, scope: check === 'paint-surface'
    ? 'Material A/B diagnostic: explicit inspection camera, normal reload, temporary CI source patch; zero gameplay acceptance'
    : 'Bounded renderer/UI diagnostic; no quality or product-state writes; not three-round acceptance',
  windowsBrowserStarted: false, completedRounds: 0, errors: [], captures: [] };
let server, browser, page, observe, restoreSource;
try {
  // Recreate the same baseline when this diagnostic is run after adoption.
  // Only the disposable CI checkout changes; restore its original text below.
  if (check === 'paint-surface') {
    const file = 'src/config/PaintFlowManifest.js', text = await readFile(file, 'utf8');
    if (text.includes(paintSurfaceAfter)) {
      assert.equal(text.split(paintSurfaceAfter).length, 2);
      restoreSource = { file, text };
      await writeFile(file, text.replace(paintSurfaceAfter, paintSurfaceBefore));
      await build();
    }
  }
  server = await preview({ preview: { host: '127.0.0.1', port: 4259, strictPort: true } });
  // Documented ANGLE backend selection; do not disable the watchdog or sandbox.
  // https://github.com/google/angle/blob/main/doc/DebuggingTips.md
  report.launchOptions = check !== 'opengl' ? desktopLaunchOptions : { headless: false, args: ['--enable-webgl', '--use-gl=angle',
    '--use-cmd-decoder=passthrough', '--use-angle=gl',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] };
  browser = await chromium.launch(report.launchOptions);
  page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.addInitScript(() => {
    window.__probeFrames = []; window.__probeInputs = [];
    for (const type of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'pointermove'])
      addEventListener(type, event => window.__probeInputs.push({ type, trusted: event.isTrusted }), true);
    const sample = time => { if (window.starhaven?.ready) window.__probeFrames.push(time); requestAnimationFrame(sample); };
    requestAnimationFrame(sample);
  });
  await page.goto('http://127.0.0.1:4259/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  report.build = await runtimeBuildIdentity(page);
  await page.waitForFunction(() => window.starhaven?.ready, null, { timeout: 120000 });
  await page.bringToFront();
  observe = () => page.evaluate(() => ({ player: starhaven.player, velocity: starhaven.velocity, state: starhaven.state,
    book: starhaven.book, passage: starhaven.passage, cameraProgress: starhaven.cameraProgress,
    panel: { hidden: document.getElementById('project-panel').hidden,
      opacity: getComputedStyle(document.getElementById('project-panel')).opacity },
    rendering: starhaven.rendering, flight: starhaven.flight, samples: window.__probeFrames,
    inputs: window.__probeInputs }));
  report.before = await observe();
  const frame = async (name, options) => { const file = `${root}/${name}.png`, before = await observe();
    report.captures.push({ file, before, capture: await saveDesktopFrame(page, file, options), after: await observe() }); };
  if (check === 'paint-surface') {
    report.debugCameraUsed = true; report.gameplayAttempted = false; report.normalReloadUsed = true;
    report.viewSource = 'Explicit material closeups centred at authored broad-s-current curve t=.22; not player views or a replay';
    const { CatmullRomCurve3, Vector3 } = await import('three');
    const { PaintFlowManifest } = await import('../src/config/PaintFlowManifest.js');
    const recipe = PaintFlowManifest.paths.find(path => path.id === 'broad-s-current');
    const centre = new CatmullRomCurve3(recipe.points.map(point => new Vector3(...point)), false, 'centripetal').getPointAt(.22);
    const views = [
      { name: 's-pigment-front', position: centre.clone().add(new Vector3(0, 0, 15)).toArray(), target: centre.toArray() },
      { name: 's-pigment-back', position: centre.clone().add(new Vector3(0, 0, -15)).toArray(), target: centre.toArray() },
    ];
    const sourceFile = 'src/config/PaintFlowManifest.js', baseline = await readFile(sourceFile, 'utf8'),
      original = restoreSource?.text ?? baseline, before = paintSurfaceBefore, after = paintSurfaceAfter;
    assert.equal(baseline.split(before).length, 2, 'Expected one baseline surface profile');
    const candidate = baseline.replace(before, after), digest = text => createHash('sha256').update(text).digest('hex');
    report.surfacePatch = { file: sourceFile, before, after, originalSourceSHA256: digest(original),
      baselineSourceSHA256: digest(baseline), candidateSourceSHA256: digest(candidate) };
    report.variants = [];
    for (const variant of ['baseline', 'candidate']) {
      if (variant === 'candidate') {
        restoreSource = { file: sourceFile, text: original };
        await writeFile(sourceFile, candidate);
        await build();
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForFunction(() => window.starhaven?.ready, null, { timeout: 120000 });
      }
      await page.locator('#loading').waitFor({ state: 'hidden', timeout: 30000 });
      const entry = { variant, build: await runtimeBuildIdentity(page), views: [] };
      report.variants.push(entry);
      const origin = await page.evaluate(() => ({ player: starhaven.player, state: starhaven.state }));
      for (const view of views) {
        assert(await page.evaluate(view => starhaven.inspect.framePosition({ ...view, duration: .01 }), view));
        await page.waitForFunction(() => !starhaven.cameraProgress.transition, null, { timeout: 45000 });
        await frame(`${variant}-${view.name}`, { settle: true, finishGPU: true });
        const observation = await page.evaluate(() => ({ player: starhaven.player, state: starhaven.state,
          camera: starhaven.camera, target: starhaven.cameraProgress.target, paintFlow: starhaven.ambient.paintFlow }));
        assert.deepEqual(observation.player, origin.player, 'Diagnostic camera must not place the player');
        assert.equal(observation.state, origin.state, 'Diagnostic camera must not change scene state');
        entry.views.push({ name: view.name, requested: view, observation });
      }
    }
    assert.notEqual(report.variants[0].build.sha256, report.variants[1].build.sha256);
    assert.equal(report.variants[0].build.cssSHA256, report.variants[1].build.cssSHA256);
    assert.deepEqual(report.errors, []);
  } else if (check === 'arrival') {
    await page.locator('#loading').waitFor({ state: 'hidden', timeout: 30000 });
    report.arrivalTarget = [-3, 3, 10]; report.arrivalRadius = 1;
    await flyTo(page, report.arrivalTarget, { radius: report.arrivalRadius, timeout: 120000 });
    report.after = await observe();
    report.arrivalDistance = Math.hypot(...report.after.player.map((value, i) => value - report.arrivalTarget[i]));
    assert.equal(report.after.state, 'SPACE');
    assert(report.arrivalDistance < report.arrivalRadius);
    assert(Math.hypot(...report.after.velocity) < .15);
    assert.deepEqual(report.errors, []);
    assert(report.after.inputs.length > 0 && report.after.inputs.every(event => event.trusted));
    await frame('arrived-and-braked', { settle: true });
  } else if (check === 'ui-surface') {
    await page.locator('#loading').waitFor({ state: 'hidden', timeout: 30000 });
    await page.locator('#project-toggle').click();
    await page.locator('#catalog [data-project-id="threadcove"]').click();
    await page.waitForFunction(() => starhaven.state === 'PROJECT' && starhaven.book.status === 'open', null, { timeout: 45000 });
    await frame('project-before-frame-wait');
    const count = await page.evaluate(() => window.__probeFrames.length);
    await page.waitForFunction(count => window.__probeFrames.length >= count + 2, count, { timeout: 45000 });
    await frame('project-after-frame-wait');
    await page.locator('#project-back').click();
    await page.waitForFunction(() => starhaven.state === 'SPACE' && !starhaven.cameraProgress.transition, null, { timeout: 45000 });
    await page.mouse.move(720, 480); await page.mouse.down({ button: 'right' });
    await page.mouse.move(800, 445); await page.mouse.up({ button: 'right' });
    report.departureStart = await observe();
    await page.keyboard.down('w');
    try { await page.waitForFunction(start => Math.hypot(...starhaven.player.map((v, i) => v - start[i])) > 2,
      report.departureStart.player, { timeout: 45000 }); }
    finally { await page.keyboard.up('w'); }
    await page.keyboard.down('x');
    try { await page.waitForFunction(() => Math.hypot(...starhaven.velocity) < .15, null, { timeout: 45000 }); }
    finally { await page.keyboard.up('x'); }
    report.after = await observe();
    assert.equal(report.after.state, 'SPACE');
    assert(report.after.inputs.every(event => event.trusted));
    assert.deepEqual(report.errors, []);
    await frame('returned-and-moved');
  } else {
  await frame('before');
  await page.mouse.move(720, 480); await page.mouse.down({ button: 'right' });
  await page.mouse.move(800, 445); await page.mouse.up({ button: 'right' });
  await page.keyboard.down('w'); await page.waitForTimeout(5000); await page.keyboard.up('w');
  await page.keyboard.down('x'); await page.waitForTimeout(1000); await page.keyboard.up('x');
  await page.waitForTimeout(20000);
  report.after = await observe(); await frame('after');
  }
  report.status = 'diagnostic-completed';
} catch (error) {
  report.status = 'failed'; report.failure = error.stack; process.exitCode = 1;
  if (observe && page && !page.isClosed()) report.failureObservation = await observe().catch(error => ({ error: error.message }));
}
finally {
  if (page && !page.isClosed()) { await page.keyboard.up('w').catch(() => {}); await page.keyboard.up('x').catch(() => {}); }
  if (browser) await browser.close();
  if (server) { server.httpServer.closeAllConnections(); await new Promise(resolve => server.httpServer.close(resolve)); }
  if (restoreSource) {
    await writeFile(restoreSource.file, restoreSource.text);
    report.temporarySourceRestored = (await readFile(restoreSource.file, 'utf8')) === restoreSource.text;
  }
  report.finished = new Date().toISOString();
  const file = 'tests/remote-render-probe.json';
  await writeFile(file, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  for (const name of [file, ...report.captures.map(item => item.file)]) {
    const bytes = await readFile(name), encoded = gzipSync(bytes).toString('base64');
    assert(bytes.length < 8 * 1024 * 1024);
    console.log('REMOTE_QA_FILE_BEGIN ' + JSON.stringify({ file: name, bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'), encoding: 'gzip-base64' }));
    for (let offset = 0; offset < encoded.length; offset += 16000) console.log('REMOTE_QA_FILE_DATA ' + encoded.slice(offset, offset + 16000));
    console.log('REMOTE_QA_FILE_END');
  }
}
