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

// The remote SwiftShader run reached ready=true, but Playwright's surface
// screenshot timed out. Capture the actual headed view through CDP instead;
// never pause animation, alter render quality, or substitute a DOM mock.
export async function saveDesktopFrame(page, file) {
  if (process.platform !== 'linux' || process.env.GITHUB_ACTIONS !== 'true')
    throw new Error('Desktop view capture is restricted to the remote Linux job');
  const session = await page.context().newCDPSession(page);
  let timer;
  try {
    const result = await Promise.race([
      session.send('Page.captureScreenshot', { format: 'png', fromSurface: false, captureBeyondViewport: false }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Remote view capture exceeded 10 seconds')), 10000); }),
    ]);
    const bytes = Buffer.from(result.data, 'base64'), viewport = page.viewportSize();
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Remote frame is not a PNG');
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    if (width !== viewport.width || height !== viewport.height)
      throw new Error(`Remote frame was clipped: ${width}x${height}, expected ${viewport.width}x${viewport.height}`);
    const { writeFile } = await import('node:fs/promises'); await writeFile(file, bytes);
    return { method: 'CDP.Page.captureScreenshot fromSurface=false', width, height };
  } finally { clearTimeout(timer); await session.detach(); }
}
