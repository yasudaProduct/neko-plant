import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const screenshotDir = 'test-results/screenshots/profile/';

test.describe('プロフィール @public', () => {
  test('投稿・猫・植物コレクションのタブが表示される', async ({ page }) => {
    await page.goto('/testuser');
    await page.waitForLoadState('networkidle');

    // プロフィールカード
    await expect(page.getByTestId('profile-name')).toHaveText('テストユーザー');
    await expect(page.locator('text=@testuser')).toBeVisible();

    // 投稿タブ (デフォルト)
    expect(await page.getByTestId('post-tile').count()).toBeGreaterThanOrEqual(3);
    await page.screenshot({ path: screenshotDir + 'profile-posts.png', fullPage: true });

    // 猫タブ (シード: ミケ・クロ)
    await page.getByTestId('profile-tab-cats').click();
    await expect(page.locator('text=ミケ')).toBeVisible();
    await expect(page.locator('text=クロ')).toBeVisible();
    await page.screenshot({ path: screenshotDir + 'profile-cats.png', fullPage: true });

    // 植物タブ (投稿から自動集計)
    await page.getByTestId('profile-tab-plants').click();
    await expect(page.locator('text=投稿から自動的に集計された')).toBeVisible();
    await expect(page.locator('a', { hasText: 'パキラ' }).first()).toBeVisible();
    await page.screenshot({ path: screenshotDir + 'profile-plants.png', fullPage: true });
  });
});

test.describe('猫プロフィール管理 @user', () => {
  test('猫の一覧が表示され追加ダイアログが開ける', async ({ page }) => {
    await page.goto('/settings/cats');
    await page.waitForLoadState('networkidle');

    // シードした猫
    expect(await page.getByTestId('pet-card').count()).toBeGreaterThanOrEqual(2);

    // 追加ダイアログ
    await page.getByTestId('add-pet-button').click();
    await expect(page.getByRole('heading', { name: '猫を追加' })).toBeVisible();
    await expect(page.getByTestId('pet-name-input')).toBeVisible();

    await page.screenshot({ path: screenshotDir + 'add-pet-dialog.png', fullPage: true });
  });
});
