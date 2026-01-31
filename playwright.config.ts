import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests',
  timeout: 30 * 1000,
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'webkit (iOS Safari)',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'chromium (Android Chrome)',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'firefox (Mobile Emulation)',
      use: { ...devices['Desktop Firefox'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'webkit (iPad)',
      use: { ...devices['iPad Pro 11'] },
    },
  ],
})
