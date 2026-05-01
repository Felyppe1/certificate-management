import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests/e2e',
  timeout: 240000, // Time for each individual test to complete
  fullyParallel: false, // Do not run tests in parallel to avoid DB conflicts
  forbidOnly: !!process.env.CI, // Fail if test.only is left in the source code
  retries: process.env.CI ? 2 : 0, // Retry on CI only
  workers: 1, // Use a single worker to avoid DB deadlocks since tests share a single Next.js backend and DB schema
  reporter: 'html',
  use: { // Options shared across all tests
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    colorScheme: 'dark',
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // {
    //   name: 'Microsoft Edge',
    //   use: { 
    //     ...devices['Desktop Edge'], 
    //     channel: 'msedge' // Tell Playwright to use the official Edge brand
    //   },
    // },
  ],
  webServer: { // Guarantee the server is running before starting the tests
    command: 'npx tsx src/tests/e2e/start-server.ts',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 300000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
