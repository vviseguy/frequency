import { defineConfig, devices } from '@playwright/test';

// Vite dev server runs the app pointed at a LOCAL PeerJS broker (started in
// global-setup) so the P2P e2e is deterministic and offline — no public broker.
const PEER_ENV = {
  VITE_PEER_HOST: 'localhost',
  VITE_PEER_PORT: '9000',
  VITE_PEER_PATH: '/',
  VITE_PEER_SECURE: 'false',
};

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            // expose real loopback ICE candidates so WebRTC connects
            // between browser contexts on the same machine
            '--disable-features=WebRtcHideLocalIpsWithMdns',
          ],
        },
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173/frequency/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: PEER_ENV,
  },
});
