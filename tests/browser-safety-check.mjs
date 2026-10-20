import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Static inspection and import only. Never call a browser API, even on Linux.
const root = fileURLToPath(new URL('../', import.meta.url));
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', timeout: 10000 })
  .split('\0').filter(file => file.startsWith('tests/') && file.endsWith('.mjs'));
let guarded = 0;
for (const file of files) {
  if (file === 'tests/browser-runtime.mjs') continue;
  const source = readFileSync(path.join(root, file), 'utf8');
  assert(!/from\s*['"](?:@playwright\/test|playwright|playwright-core)['"]/.test(source),
    `${file}: direct Playwright import bypasses the safety entry`);
  if (/\bchromium\s*\.\s*(?:launch|launchPersistentContext|launchServer)\s*\(/.test(source)) {
    assert(source.includes('browser-runtime.mjs'), `${file}: unguarded browser launcher`);
    guarded++;
  }
}
const probe = spawnSync(process.execPath, ['--input-type=module', '-e', `
  try {
    await import('./tests/browser-runtime.mjs');
    process.stdout.write('import-ok');
  } catch (error) {
    if (error.code !== 'WINDOWS_BROWSER_TESTS_SUSPENDED') throw error;
    process.stdout.write(error.code);
  }
`], { cwd: root, encoding: 'utf8', timeout: 10000 });
assert.equal(probe.status, 0, probe.stderr);
assert.equal(probe.stdout, process.platform === 'win32'
  ? 'WINDOWS_BROWSER_TESTS_SUSPENDED' : 'import-ok');
console.log(JSON.stringify({ status: 'passed', guardedLaunchers: guarded,
  platform: process.platform, browserStarted: false, importResult: probe.stdout }));
