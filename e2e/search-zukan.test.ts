import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

/**
 * 主要フロー M4（条件を決めて探す）
 * 植物検索・共存実績フィルタ・並び替え・投稿タブ・共存図鑑。
 */

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

  test('実績あり／情報なしで絞り込める', async ({ page }) => {
    // 実績あり: シードで共存実績があるのはパキラとモンステラ
    await page.getByTestId('filter-proven').click();
    await expect(page).toHaveURL(/filter=proven/);
    await expect(page.getByTestId('plant-card').filter({ hasText: 'パキラ' })).toBeVisible();
    await expect(page.getByTestId('plant-card').filter({ hasText: 'モンステラ' })).toBeVisible();

    // 情報なし: 投稿のない植物（11種）
    await page.getByTestId('filter-noinfo').click();
    await expect(page).toHaveURL(/filter=noinfo/);
    await expect(page.getByTestId('plant-card').first()).toBeVisible();
    expect(await page.getByTestId('plant-card').count()).toBeGreaterThanOrEqual(10);
    await expect(page.locator('text=投稿がありません').first()).toBeVisible();

    await page.screenshot({ path: screenshotDir + 'filter-noinfo.png', fullPage: true });
  });

  test('共存実績順・投稿数順で並び替えできる', async ({ page }) => {
    // デフォルト（共存実績順）でモンステラが先頭付近に来る
    await page.getByTestId('sort-select').click();
    await page.getByRole('option', { name: '投稿数（多い順）' }).click();
    await expect(page).toHaveURL(/sort=posts/);
    await expect(page.getByTestId('plant-card').first()).toBeVisible();
  });

  test('「もっと見る」で検索結果を追加読み込みできる', async ({ page }) => {
    // シード植物は13種あり、1ページ12件では収まらない
    const initial = await page.getByTestId('plant-card').count();
    expect(initial).toBe(12);

    await page.getByTestId('load-more').click();

    await expect.poll(() => page.getByTestId('plant-card').count()).toBeGreaterThan(initial);

    await page.screenshot({ path: screenshotDir + 'load-more.png', fullPage: true });
  });

  test('投稿タブに切り替えられる', async ({ page }) => {
    await page.getByRole('link', { name: /^投稿 \d+件$/ }).click();
    await expect(page).toHaveURL(/tab=posts/);

    await expect(page.getByTestId('post-tile').first()).toBeVisible();
    expect(await page.getByTestId('post-tile').count()).toBeGreaterThanOrEqual(4);

    await page.screenshot({ path: screenshotDir + 'posts-tab.png', fullPage: true });
  });
});

test.describe('共存図鑑 @public', () => {
  test('既定は実績のある植物のみが並び、「全て」で全植物を見られる', async ({ page }) => {
    await page.goto('/zukan');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '共存図鑑' })).toBeVisible();
    await expect(page.locator('text=ポジティブリスト方式')).toBeVisible();

    // 共存実績が最多のモンステラ（3匹）が先頭
    await expect(page.getByTestId('zukan-row').first()).toContainText('モンステラ');

    // 既定は「実績あり」。シードで実績があるのはパキラとモンステラのみ
    const provenCount = await page.getByTestId('zukan-row').count();

    await page.screenshot({ path: screenshotDir + 'zukan.png', fullPage: true });

    // 「全て」に切り替えるとシード植物13種が並ぶ
    await page.getByTestId('filter-all').click();
    await expect(page).toHaveURL(/filter=all/);
    const allCount = await page.getByTestId('zukan-row').count();

    expect(allCount).toBeGreaterThanOrEqual(13);
    expect(provenCount).toBeLessThan(allCount);
  });

  test('図鑑の行から植物ページへ遷移できる', async ({ page }) => {
    await page.goto('/zukan');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('zukan-row').first().click();
    await expect(page).toHaveURL(/\/plants\/\d+/);
    await expect(page.getByTestId('plant-name')).toHaveText('モンステラ');
  });
});
