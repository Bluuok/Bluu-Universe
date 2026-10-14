import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { flyIntoRoom } from './room-flight-route.mjs';

const url = process.env.REFRAME_URL || 'http://127.0.0.1:4238/';
const out = process.env.REFRAME_OUT || 'E:/temp/starhaven-rc39-reframe';
await mkdir(out, { recursive: true });
const report = { started: new Date().toISOString(), url,
  method: 'Installed Chrome, trusted keyboard/mouse and viewport resize; read-only product telemetry. Browser mode recorded below; no OS focus claim.',
  checks: [], errors: [], requestFailures: [], browserClosed: false };
report.headless=process.env.REFRAME_HEADLESS==='1';
const browser = await chromium.launch({ headless: process.env.REFRAME_HEADLESS==='1',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--use-angle=d3d11', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
await context.addInitScript(() => {
  window.__reframeInputs = [];
  for (const type of ['keydown', 'keyup', 'blur', 'focus', 'click']) window.addEventListener(type, event => {
    window.__reframeInputs.push({ type, code: event.code, trusted: event.isTrusted, time: performance.now(), documentHasFocus: document.hasFocus(), exhibit: document.activeElement?.dataset.exhibit });
  }, true);
});
const page = await context.newPage();
page.on('pageerror', e => report.errors.push(e.message));
page.on('console', e => { if (e.type() === 'error') report.errors.push(e.text()); });
page.on('requestfailed', r => report.requestFailures.push({ url: r.url(), error: r.failure()?.errorText }));
const snap = () => page.evaluate(() => ({ time: performance.now(), state: starhaven.state, book: starhaven.book,
  passage: starhaven.passage, cameraProgress: starhaven.cameraProgress, player: starhaven.player, keys: starhaven.keys,
  paused: starhaven.flight.paused, documentHasFocus: document.hasFocus(),
  active: { tag: document.activeElement?.tagName, id: document.activeElement?.id, exhibit: document.activeElement?.dataset.exhibit },
  exhibits: [...document.querySelectorAll('[data-exhibit]')].filter(b => !b.hidden && b.getClientRects().length).map(b => b.dataset.exhibit) }));
const settled = state => page.waitForFunction(value => starhaven.state === value && !starhaven.cameraProgress.transition, state);
const close = async () => { await page.keyboard.press('Escape'); await settled('ROOM'); await page.waitForTimeout(40); };
const opener = async () => {
  await page.locator('[data-exhibit="threadcove"]').click();
  await page.waitForFunction(() => starhaven.book.status === 'open');
  await close();
  assert.equal((await snap()).active.exhibit, 'threadcove');
};
async function check(name, fn) {
  const evidence = await fn();
  report.checks.push({ name, status: 'passed', evidence });
  console.log(JSON.stringify({ check: name, status: 'passed' }));
}
try {
  await page.goto(url); await page.waitForFunction(() => window.starhaven?.ready, { timeout: 120000 });
  await page.waitForTimeout(500);
  const bundle = await page.evaluate(() => [...document.scripts].map(s => s.src).find(s => s.includes('/assets/index-')));
  report.build = { bundle, sha256: createHash('sha256').update(Buffer.from(await (await fetch(bundle)).arrayBuffer())).digest('hex') };
  await flyIntoRoom(page); await settled('ROOM');
  await check('Settled ROOM Tab reaches the next actual exhibit', async () => {
    await opener(); const before = await snap(); await page.keyboard.press('Tab'); const after = await snap();
    assert.equal(after.active.exhibit, 'clawtide'); assert.ok(after.documentHasFocus && !after.paused);
    return { before, after };
  });
  for (const [name, viewport] of [['shrink', { width: 1280, height: 720 }], ['grow', { width: 1440, height: 960 }]]) {
    await check(`ROOM ${name}: Tab at 80ms preserves the complete exhibit sequence and flight state`, async () => {
      await opener(); const before = await snap(); await page.setViewportSize(viewport); await page.waitForTimeout(80);
      const during = await snap();
      assert.ok(during.cameraProgress.transition, 'Must exercise an active ROOM reframe');
      assert.equal(during.exhibits.length, 4);
      await page.keyboard.press('Tab'); const immediate = await snap();
      assert.equal(immediate.active.exhibit, 'clawtide'); assert.ok(immediate.documentHasFocus && !immediate.paused);
      await settled('ROOM'); const after = await snap();
      assert.equal(after.active.exhibit, 'clawtide'); assert.ok(after.documentHasFocus && !after.paused);
      await page.keyboard.press('Enter'); await page.waitForFunction(() => starhaven.book.status === 'open');
      assert.equal((await snap()).book.project, 'clawtide'); await close();
      assert.equal((await snap()).active.exhibit, 'clawtide');
      return { before, during, immediate, after, afterBookReturn: await snap() };
    });
  }
  await check('ROOM reframe reverse Tab reaches the previous actual exhibit without focus theft', async () => {
    await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(80);
    const before = await snap(); assert.ok(before.cameraProgress.transition);
    await page.keyboard.press('Shift+Tab'); const immediate = await snap(); await settled('ROOM'); const after = await snap();
    assert.equal(immediate.active.exhibit, 'threadcove'); assert.equal(after.active.exhibit, 'threadcove');
    assert.ok(after.documentHasFocus && !after.paused);
    return { before, immediate, after };
  });
  await page.setViewportSize({ width: 1440, height: 960 }); await settled('ROOM');
  await check('After resize Tab and book return, exit and fresh centered W depart without manual resume', async () => {
    await page.locator('#exit').click(); await settled('SPACE'); await page.mouse.move(720, 480);
    const before = await snap(); assert.ok(!before.paused && before.documentHasFocus);
    await page.evaluate(() => {
      window.__departureFrames = []; window.__observeDeparture = true;
      const frame = () => { if (!window.__observeDeparture) return; window.__departureFrames.push({ time: performance.now(), player: starhaven.player, contacts: starhaven.inspect.collision().lastSolve.contacts }); requestAnimationFrame(frame); };
      requestAnimationFrame(frame);
    });
    await page.keyboard.down('w'); await page.waitForTimeout(1450); await page.keyboard.up('w');
    await page.keyboard.down('s'); await page.waitForTimeout(650); await page.keyboard.up('s');
    const after = await snap(); report.departureFrames = await page.evaluate(() => { window.__observeDeparture = false; return window.__departureFrames; });
    assert.equal(after.state, 'SPACE'); assert.ok(!after.paused);
    assert.ok(after.player[2] - before.player[2] > 10);
    assert.ok(Math.abs(after.player[1] - before.player[1]) < .03);
    assert.equal(report.departureFrames.filter(f => f.contacts.length).length, 0);
    return { before, after, outwardMetres: after.player[2] - before.player[2] };
  });
  report.screenshot = path.join(out, 'after-resize-tab-exit-W.png'); await page.screenshot({ path: report.screenshot });
  assert.equal(report.errors.length, 0);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failure = error.stack; process.exitCode = 1;
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
} finally {
  await page.keyboard.up('w').catch(() => {}); await page.keyboard.up('s').catch(() => {});
  report.inputs = await page.evaluate(() => window.__reframeInputs).catch(() => []);
  await browser.close(); report.browserClosed = true; report.finished = new Date().toISOString();
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, checks: report.checks.length, failure: report.failure, errors: report.errors, report: path.join(out, 'report.json') }));
}
