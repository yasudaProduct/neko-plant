import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3001',
    navigationTimeout: 2 * 60 * 1000, // 2 minutes
    actionTimeout: 10 * 1000, // 10 seconds
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    // セットアップ
    { name: 'auth', testMatch: 'auth.setup.ts' },

    // デスクトップ × 未認証
    {
      name: 'desktop-public',
      use: { ...devices['Desktop Chrome'] },
      grep: /@public/,
      grepInvert: /@mobile/,
    },
    // デスクトップ × 一般ユーザー
    {
      name: 'desktop-user',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['auth'],
      grep: /@user/,
      grepInvert: /@mobile/,
    },
    // デスクトップ × 管理者
    {
      name: 'desktop-admin',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/admin.json' },
      dependencies: ['auth'],
      grep: /@admin/,
      grepInvert: /@mobile/,
    },

    // モバイル（必要なものだけ有効化）
    {
      name: 'mobile-public',
      use: { ...devices['Pixel 5'] },
      grep: /@public.*@mobile/,
    },
    {
      name: 'mobile-user',
      use: { ...devices['Pixel 5'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['auth'],
      grep: /@user.*@mobile/,
    },
    // {
    //   name: 'no-auth',
    //   use: { ...devices['Desktop Chrome'] },
    //   testIgnore: ['**/admin-protection.test.ts', '**/plant-registration.test.ts', '**/authentication.test.ts', '**/plant-detail.test.ts', '**/evaluation-system.test.ts'],
    //   testMatch: ['**/neko-plant.test.ts', '**/plant-registration-unauth.test.ts', '**/plant-search.test.ts'],
    // },
    // {
    //   name: 'authenticated',
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     storageState: 'playwright/.auth/user.json',
    //   },
    //   dependencies: ['auth'],
    //   testMatch: ['**/admin-protection.test.ts', '**/authenticated-screenshots.test.ts', '**/plant-registration.test.ts', '**/authentication.test.ts', '**/plant-detail.test.ts', '**/evaluation-system.test.ts'],
    // },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev -- --port 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
});
