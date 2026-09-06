import { defineConfig } from '@playwright/test';

const BROWSER_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1400, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'edge',
      use: {
        executablePath: BROWSER_PATH,
        browserName: 'chromium',
      },
    },
  ],
  webServer: {
    command: 'npx vite --host',
    port: 5173,
    reuseExistingServer: true,
    timeout: 15_000,
  },
});
