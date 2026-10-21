// Containment for the 2026-10-20 Windows account-lockout incident.
// On Windows, fail before even importing Playwright or running caller code.

if (process.platform === 'win32') {
  const error = new Error(
    'Windows Chromium tests are suspended after an account-lockout incident. ' +
    'Do not retry with headless mode, another Chrome path, or a fresh profile. ' +
    'See docs/windows-browser-safety.md.'
  );
  error.code = 'WINDOWS_BROWSER_TESTS_SUSPENDED';
  throw error;
}

const { chromium } = await import('@playwright/test');
export { chromium };

// Shared by the remote desktop routes only. The Windows import guard above
// remains unconditional; Linux uses this Playwright version's bundled browser.
export const desktopLaunchOptions = {
  headless: false,
  args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding'],
};

// Capture the remote X11 framebuffer independently of Chromium's screenshot
// and screencast APIs. Keep the entire desktop as evidence of the real window;
// do not pause animation, crop away failures, or change application quality.
export async function saveDesktopFrame(page, file, { settle = false } = {}) {
  if (process.platform !== 'linux' || process.env.GITHUB_ACTIONS !== 'true')
    throw new Error('Desktop view capture is restricted to the remote Linux job');
  if (!/^:\d+(\.\d+)?$/.test(process.env.DISPLAY || '')) throw new Error('Expected a local X11 display');
  let presentation = null, paintFrames = null;
  if (settle) {
    // Logical book status precedes image decoding and compositor presentation.
    // Observe completion without pausing animation or writing product state.
    await page.waitForFunction(() => {
      const app = window.starhaven, panel = document.getElementById('project-panel');
      if (!app?.ready || !document.getElementById('loading').hidden ||
        app.cameraProgress.transition || app.passage.phase) return false;
      if (app.state !== 'PROJECT') return app.state === 'ROOM' || app.state === 'SPACE';
      return app.book.status === 'open' && ['loaded', 'empty', 'error'].includes(panel.querySelector('.book-media').dataset.state) &&
        panel.getAnimations({ subtree: true }).every(animation => !animation.pending && animation.playState !== 'running');
    }, null, { timeout: 180000 });
    presentation = await page.evaluate(() => ({ state: starhaven.state, book: starhaven.book,
      mediaState: document.querySelector('#project-panel .book-media').dataset.state }));
    if (presentation.state === 'PROJECT' && presentation.mediaState === 'error') throw new Error('Project image failed to load');
    let deadline;
    try {
      paintFrames = await Promise.race([
        page.evaluate(() => new Promise(resolve => requestAnimationFrame(first => requestAnimationFrame(second => resolve({ first, second }))))),
        new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('Display frame wait timed out')), 45000); }),
      ]);
    } finally { clearTimeout(deadline); }
  }
  const { execFile } = await import('node:child_process'), { promisify } = await import('node:util');
  await promisify(execFile)('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'x11grab', '-video_size', '1600x1100', '-framerate', '1', '-i', process.env.DISPLAY,
    '-frames:v', '1', '-threads', '1', '-update', '1', file], { timeout: 10000 });
  const { readFile } = await import('node:fs/promises'), bytes = await readFile(file);
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Remote frame is not a PNG');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (width !== 1600 || height !== 1100) throw new Error(`Unexpected desktop frame: ${width}x${height}`);
  const window = await page.evaluate(() => ({ x: screenX, y: screenY, outerWidth, outerHeight,
    innerWidth, innerHeight, screenWidth: screen.width, screenHeight: screen.height, focused: document.hasFocus() }));
  return { method: 'FFmpeg x11grab whole remote desktop', width, height, viewport: page.viewportSize(), window,
    settleRequested: settle, presentation, paintFrames };
}
