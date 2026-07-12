import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { APP_PORT, BASE_URL, DB_URL } from './src/tests/e2e/config';

dotenv.config({ path: '.env.test' });

// webServer command: builds, copies the assets required by `output: 'standalone'`
// (Next refuses `next start` in that mode) and starts the standalone server. The
// `rm -rf` keeps the copies idempotent across runs.
const startServerCommand = [
  'npm run build',
  'rm -rf .next/standalone/.next/static .next/standalone/public',
  'cp -r .next/static .next/standalone/.next/static',
  'cp -r public .next/standalone/public',
  // Overwrites the standalone-traced node_modules with the full one: tracing does
  // not capture external packages' data files (e.g. @google-cloud/tasks'
  // protos.json, listed in serverExternalPackages), breaking at runtime.
  'cp -rf node_modules/. .next/standalone/node_modules/',
  'node .next/standalone/server.js',
].join(' && ');

export default defineConfig({
  testDir: './src/tests/e2e',
  timeout: 60000, // Milisseconds for each individual test to complete
  // Default timeout for every `expect(...).toX()` assertion. Some flows (real
  // file upload + processing) genuinely take longer than Playwright's 5s default.
  expect: { timeout: 30000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // Fail if test.only is left in the source code
  retries: process.env.CI ? 2 : 0, // Retry on CI only
  workers: process.env.CI ? 2 : undefined,
  reporter: 'html',
  use: { // Options shared across all tests
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    colorScheme: 'dark',
    video: 'on',
  },
  projects: [
    {
      name: 'setup db',
      testMatch: /global-setup\.ts/,
      teardown: 'cleanup db',
    },
    {
      name: 'cleanup db',
      testMatch: /global-teardown\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.e2e\.test\.ts/,
      dependencies: ['setup db'],
    },
  ],
  webServer: { // Guarantee the server is running before starting the tests
    command: startServerCommand,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 400000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      IS_E2E: 'true',
      NEXT_PUBLIC_BASE_URL: BASE_URL,
      PORT: String(APP_PORT),
      DB_URL,
      DB_DIRECT_URL: DB_URL,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? 'test-client-id',
      GOOGLE_CLIENT_SECRET:
        process.env.GOOGLE_CLIENT_SECRET ?? 'test-client-secret',
      GCP_PROJECT_ID: process.env.GCP_PROJECT_ID ?? 'test-project',
      GCP_PROJECT_NUMBER: process.env.GCP_PROJECT_NUMBER ?? '000000000000',
      CLOUD_RUN_APP_URL: process.env.CLOUD_RUN_APP_URL ?? BASE_URL,
      CLOUD_FUNCTIONS_SA_EMAIL:
        process.env.CLOUD_FUNCTIONS_SA_EMAIL ??
        'placeholder@placeholder.iam.gserviceaccount.com',
      CERTIFICATES_BUCKET: process.env.CERTIFICATES_BUCKET ?? '',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? 'test-key',
      RESEND_API_KEY: process.env.RESEND_API_KEY ?? 'test-key',
      BREVO_API_KEY: process.env.BREVO_API_KEY ?? 'test-key',
      OWNER_EMAIL: process.env.OWNER_EMAIL ?? 'test@test.com',
      REDIS_URL: 'redis://localhost:6380',
      LOKI_URL: 'http://localhost:3100',
      OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: 'http://localhost:4318/v1/logs',
    },
  },
});
