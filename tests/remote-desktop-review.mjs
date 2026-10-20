// Import the Windows suspension guard before starting any server or child.
import { chromium } from './browser-runtime.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { preview } from 'vite';

assert.equal(process.platform, 'linux', 'Remote desktop QA requires Linux');
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Run through the explicit GitHub workflow');
const root = 'screenshots/remote-desktop';
await mkdir(root, { recursive: true });
const report = { started: new Date().toISOString(), status: 'running',
  commit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID,
  platform: process.platform, executable: chromium.executablePath(),
  scope: 'Remote Linux software-rendered keyboard/mouse routes; not Windows GPU or OS-focus acceptance',
  suites: [], windowsBrowserStarted: false, independentReview: false };
const run = (file, env) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [file], { stdio: 'inherit',
    env: { ...process.env, GOAL_URL: 'http://127.0.0.1:4259/', ...env },
    timeout: 15 * 60 * 1000 });
  child.once('error', reject);
  child.once('close', (code, signal) => code === 0 ? resolve() : reject(new Error(`${file}: exit=${code}, signal=${signal}`)));
});
let server;
try {
  server = await preview({ preview: { host: '127.0.0.1', port: 4259, strictPort: true } });
  for (const suite of [
    { name: 'three-normal-routes', file: 'tests/goal-player-review.mjs',
      report: 'tests/remote-player.json', env: { GOAL_OUT: `${root}/player`, GOAL_REPORT: 'tests/remote-player.json' } },
    { name: 'three-continuous-visits', file: 'tests/goal-continuous-visit-review.mjs',
      report: 'tests/remote-continuous.json', env: { CONTINUOUS_OUT: `${root}/continuous`, CONTINUOUS_REPORT: 'tests/remote-continuous.json' } },
  ]) {
    const entry = { name: suite.name, report: suite.report, status: 'running' };
    report.suites.push(entry);
    try { await run(suite.file, suite.env); }
    finally {
      const result = await readFile(suite.report, 'utf8').then(JSON.parse).catch(() => null);
      if (result) {
        entry.status = result.status; entry.build = result.build;
        entry.completedRounds = (result.routes || result.rounds || []).filter(round => round.status === 'passed').length;
        entry.trustedInputs = result.trustedInputs ?? result.routes?.reduce((n, route) => n + (route.trustedInputs || 0), 0);
      } else entry.status = 'missing-report';
    }
    assert.equal(entry.status, 'passed', `${suite.name} did not fully pass`);
    assert.equal(entry.completedRounds, 3);
    if (report.build) assert.deepEqual(entry.build, report.build);
    else report.build = entry.build;
  }
  for (const [asset, expected] of [[report.build.bundle, report.build.sha256], [report.build.css, report.build.cssSHA256]]) {
    const bytes = await readFile(`dist/${asset.replace(/^\//, '')}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected);
  }
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.failure = error.stack; process.exitCode = 1; }
finally {
  if (server) await new Promise(resolve => server.httpServer.close(resolve));
  report.finished = new Date().toISOString();
  await writeFile('tests/remote-desktop-summary.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
