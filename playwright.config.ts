import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, defineConfig, devices } from '@playwright/test';

/**
 * Use the browser bundled with this Playwright version; if the environment only ships a different
 * pre-installed Chromium build (PLAYWRIGHT_BROWSERS_PATH), fall back to it instead of downloading.
 */
function chromiumExecutable(): string | undefined {
  try {
    if (existsSync(chromium.executablePath())) return undefined;
  } catch {
    /* fall through */
  }
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root) return undefined;
  for (const p of [join(root, 'chromium_headless_shell'), join(root, 'chromium')]) if (existsSync(p)) return p;
  return undefined;
}
const executablePath = chromiumExecutable();

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    viewport: { width: 1440, height: 900 },
  },
  projects: [{
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: executablePath ? { executablePath } : {} },
  }],
  webServer: {
    command: 'npx vite --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
