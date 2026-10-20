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
