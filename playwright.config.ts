import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/integration',
  timeout: 30_000,
  use: {
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @phipri/react-threadport dev:fixtures',
      reuseExistingServer: false,
      url: 'http://127.0.0.1:5175/fixtures/',
    },
    {
      command: 'pnpm --filter @phipri/react-threadport-site dev',
      reuseExistingServer: false,
      url: 'http://127.0.0.1:5176/',
    },
    {
      command: 'pnpm --filter @phipri/react-threadport-playground dev',
      reuseExistingServer: false,
      url: 'http://127.0.0.1:5177/examples/',
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
})
