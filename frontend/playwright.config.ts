import { defineConfig, devices } from '@playwright/test';
import { loadEnvConfig } from '@next/env';
import { resolve } from 'node:path';

const frontendDirectory = __dirname;
loadEnvConfig(resolve(frontendDirectory, '..'));

export default defineConfig({
  testDir: '../tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    cwd: frontendDirectory,
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
