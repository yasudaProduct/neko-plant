import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const screenshotDir = 'test-results/screenshots/search-zukan/';

test.describe('検索・探索 @public', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/plants');
    await page.waitForLoadState('networkidle');
  });

  test('植物名で検索できる', async ({ page }) => {
    await page.getByTestId('search-input').fill('パキラ');
    await page.getByTestId('search-button').click();

    await expect(page).toHaveURL(/q=/);
    await expect(page.getByTestId('plant-card')).toHaveCount(1);
    await expect(page.getByTestId('plant-card').first()).toContainText('パキラ');

    await page.screenshot({ path: screenshotDir + 'search-result.png', fullPage: true });
  });

  test('実績あり/情報なしで絞り込める', async ({ page }) => {
    // 実績あり: シードで共存実績があるのはパキラとモンステラのみ
    await page.getByTestId('filter-proven').click();
    await expect(page).toHaveURL(/filter=proven/);
    await expect(page.getByTestId('plant-card')).toHaveCount(2);

    // 情報なし
    await page.getByTestId('filter-noinfo').click();
    await expect(page).toHaveURL(/filter=noinfo/);
    await expect(page.getByTestId('plant-card').first()).toBeVisible();
    expect(await page.getByTestId('plant-card').count()).toBeGreaterThanOrEqual(10);
    await expect(page.locator('text=猫との共存情報がありません').first()).toBeVisible();

    await page.screenshot({ path: screenshotDir + 'filter-noinfo.png', fullPage: true });
  });

  test('投稿タブに切り替えられる', async ({ page }) => {
    await page.locator('a', { hasText: /^投稿 \d+件$/ }).click();
    await expect(page).toHaveURL(/tab=posts/);

    await expect(page.getByTestId('post-tile').first()).toBeVisible();
    expect(await page.getByTestId('post-tile').count()).toBeGreaterThanOrEqual(3);

    await page.screenshot({ path: screenshotDir + 'posts-tab.png', fullPage: true });
  });
});

test.describe('共存図鑑 @public', () => {
  test('図鑑に全植物が共存実績順で表示される', async ({ page }) => {
    await page.goto('/zukan');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=共存図鑑')).toBeVisible();
    await expect(page.locator('text=ポジティブリスト方式')).toBeVisible();

    // 図鑑リスト (シード植物13種)
    expect(await page.getByTestId('zukan-row').count()).toBeGreaterThanOrEqual(13);

    // 共存実績のあるパキラが先頭 (No.01)
    await expect(page.getByTestId('zukan-row').first()).toContainText('パキラ');

    await page.screenshot({ path: screenshotDir + 'zukan.png', fullPage: true });
  });

  test('図鑑の行から植物ページへ移動できる', async ({ page }) => {
    await page.goto('/zukan');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('zukan-row').first().click();
    await expect(page).toHaveURL(/\/plants\/\d+/);
  });
});
