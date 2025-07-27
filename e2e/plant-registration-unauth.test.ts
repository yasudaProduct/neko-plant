import { test, expect } from '@playwright/test';

const screenshotDir = 'test-results/screenshots/';

test.describe('未認証ユーザーの植物登録', () => {
  test('未認証ユーザーは植物登録ページにアクセスできない', async ({ page }) => {
    // 植物登録ページに直接アクセス
    await page.goto('/plants/new');
    
    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL('/signin');
    
    await page.screenshot({ path: screenshotDir + 'plant-registration-unauthenticated.png', fullPage: true });
  });
});