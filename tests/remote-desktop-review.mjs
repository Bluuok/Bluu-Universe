// Import the Windows suspension guard before starting any server or child.
import { chromium } from './browser-runtime.mjs';
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { promisify } from 'node:util';
import { preview } from 'vite';

assert.equal(process.platform, 'linux', 'Remote desktop QA requires Linux');
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Run through the explicit GitHub workflow');
const root = 'screenshots/remote-desktop';
await mkdir(root, { recursive: true });
const execute = promisify(execFile);
const startRecording = file => {
  const recorder = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'x11grab', '-video_size', '1600x1100', '-framerate', '8', '-i', process.env.DISPLAY,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-threads', '1',
    '-g', '16', '-pix_fmt', 'yuv420p', file], { stdio: ['pipe', 'ignore', 'pipe'] });
  let diagnostic = ''; recorder.stderr.on('data', bytes => { diagnostic = (diagnostic + bytes).slice(-65536); });
  recorder.stdin.on('error', () => {});
  const done = new Promise(resolve => {
    recorder.once('error', error => resolve({ error: error.message }));
    recorder.once('close', (code, signal) => resolve({ code, signal, diagnostic }));
  });
  return { recorder, done };
};
const finishRecording = async (recording, entry) => {
  if (recording.recorder.exitCode === null) recording.recorder.stdin.end('q\n');
  let timer;
  const closed = await Promise.race([recording.done, new Promise(resolve => {
    timer = setTimeout(() => { recording.recorder.kill('SIGKILL'); resolve({ error: 'X11 recorder stop timeout' }); }, 10000);
  })]); clearTimeout(timer); entry.recording.closed = closed;
  if (closed.code !== 0) return;
  try {
    const probe = await execute('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height,codec_name', '-of', 'json', entry.recording.file], { timeout: 10000 });
    entry.recording.media = JSON.parse(probe.stdout);
    const start = Math.max(0, Number(entry.recording.media.format.duration) - 20);
    entry.recording.preview = entry.recording.file.replace(/\.mp4$/, '-preview.mp4');
    await execute('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(start),
      '-i', entry.recording.file, '-t', '20', '-c', 'copy', '-movflags', '+faststart', entry.recording.preview], { timeout: 10000 });
    entry.recording.previewStartSeconds = start;
  } catch (error) { entry.recording.probeError = error.message; }
};
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
  assert(/^:\d+(\.\d+)?$/.test(process.env.DISPLAY || ''), 'Expected the remote local X11 display');
  const devices = await execute('ffmpeg', ['-hide_banner', '-devices'], { timeout: 10000 });
  assert((devices.stdout + devices.stderr).includes('x11grab'), 'FFmpeg must support X11 capture');
  server = await preview({ preview: { host: '127.0.0.1', port: 4259, strictPort: true } });
  for (const suite of [
    { name: 'three-normal-routes', file: 'tests/goal-player-review.mjs',
      report: 'tests/remote-player.json', env: { GOAL_OUT: `${root}/player`, GOAL_REPORT: 'tests/remote-player.json' } },
    { name: 'three-continuous-visits', file: 'tests/goal-continuous-visit-review.mjs',
      report: 'tests/remote-continuous.json', env: { CONTINUOUS_OUT: `${root}/continuous`, CONTINUOUS_REPORT: 'tests/remote-continuous.json' } },
  ]) {
    const entry = { name: suite.name, report: suite.report, status: 'running' };
    report.suites.push(entry);
    entry.recording = { method: 'FFmpeg X11 desktop; independent of Chromium screencast',
      file: `${root}/${suite.name}.mp4`, started: new Date().toISOString(), frameRate: 8 };
    const recording = startRecording(entry.recording.file);
    try { await run(suite.file, { ...suite.env, REMOTE_SCREEN_RECORDING: entry.recording.file }); }
    finally {
      await finishRecording(recording, entry);
      const result = await readFile(suite.report, 'utf8').then(JSON.parse).catch(() => null);
      if (result) {
        entry.status = result.status; entry.build = result.build;
        entry.completedRounds = (result.routes || result.rounds || []).filter(round => round.status === 'passed').length;
        entry.trustedInputs = result.trustedInputs ?? result.routes?.reduce((n, route) => n + (route.trustedInputs || 0), 0);
      } else entry.status = 'missing-report';
    }
    assert.equal(entry.status, 'passed', `${suite.name} did not fully pass`);
    assert.equal(entry.completedRounds, 3);
    assert.equal(entry.recording.closed.code, 0, 'The independent recording must close cleanly');
    assert(entry.recording.media?.streams.some(stream => stream.width === 1600 && stream.height === 1100));
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
  // Artifact downloads failed at the Azure storage connection on the host.
  // Also preserve bounded, checksummed project evidence in ordinary job logs.
  // No tokens, environment dump, arbitrary paths or Windows files are read.
  const priority = file => ['failure', 'normal-spawn', 'window', 'room', 'body-contact', 'project', 'exit'].findIndex(word => file.includes(word));
  const files = await readdir(root, { recursive: true });
  const pictures = files.filter(file => file.endsWith('.png')).sort((a, b) =>
    (priority(a) < 0 ? 99 : priority(a)) - (priority(b) < 0 ? 99 : priority(b)));
  const clips = files.filter(file => file.endsWith('-preview.mp4'));
  let remaining = 24 * 1024 * 1024;
  for (const file of ['tests/remote-desktop-summary.json', 'tests/remote-player.json', 'tests/remote-continuous.json', ...clips.map(file => `${root}/${file}`), ...pictures.map(file => `${root}/${file}`)]) {
    const bytes = await readFile(file).catch(() => null); if (!bytes) continue;
    const compressed = gzipSync(bytes);
    if (compressed.length > remaining) continue;
    remaining -= compressed.length;
    console.log('REMOTE_QA_FILE_BEGIN ' + JSON.stringify({ file, bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'), encoding: 'gzip-base64' }));
    const encoded = compressed.toString('base64');
    for (let offset = 0; offset < encoded.length; offset += 16000) console.log('REMOTE_QA_FILE_DATA ' + encoded.slice(offset, offset + 16000));
    console.log('REMOTE_QA_FILE_END');
  }
}
