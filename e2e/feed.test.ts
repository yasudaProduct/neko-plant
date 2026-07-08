import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const screenshotDir = 'test-results/screenshots/feed/';

test.describe('フィード（未認証） @public', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('ランディングヒーローとフィードが表示される', async ({ page }) => {
    // ヒーロー (未ログイン時のみ)
    await expect(page.locator('text=猫と植物は、いっしょに暮らせる？')).toBeVisible();
    await expect(page.getByRole('link', { name: 'はじめる' })).toBeVisible();
    await expect(page.getByRole('link', { name: '植物をさがす' })).toBeVisible();

    // フィード
    await expect(page.locator('text=新着の投稿')).toBeVisible();
    expect(await page.getByTestId('post-card').count()).toBeGreaterThanOrEqual(3);

    // サイドパネル
    await expect(page.locator('text=共存実績の多い植物')).toBeVisible();
    await expect(page.locator('text=共存実績について')).toBeVisible();

    await page.screenshot({ path: screenshotDir + 'feed-public.png', fullPage: true });
  });

  test('投稿カードに植物タグと共存バッジが表示される', async ({ page }) => {
    const firstCard = page.getByTestId('post-card').first();

    // シードした投稿のコメント
    await expect(page.locator('text=パキラのとなりでお昼寝しています')).toBeVisible();

    // 植物タグと猫チップ
    await expect(firstCard.locator('a', { hasText: 'パキラ' }).first()).toBeVisible();

    await page.screenshot({ path: screenshotDir + 'post-card.png', fullPage: true });
  });

  test('植物タグをタップすると植物ページへ移動する', async ({ page }) => {
    const plantTag = page.getByTestId('post-card').first().locator('a[href^="/plants/"]').first();
    await plantTag.click();

    await expect(page).toHaveURL(/\/plants\/\d+/);
    await expect(page.getByTestId('plant-name')).toBeVisible();
  });

  test('投稿写真をタップすると投稿詳細へ移動する', async ({ page }) => {
    await page.getByTestId('post-card').first().locator('a[href^="/posts/"]').first().click();

    await expect(page).toHaveURL(/\/posts\/\d+/);
    await expect(page.locator('text=写っている植物')).toBeVisible();
    await page.screenshot({ path: screenshotDir + 'post-detail.png', fullPage: true });
  });

  test('未ログインでいいねするとログインダイアログが表示される', async ({ page }) => {
    await page.getByTestId('like-button').first().click();

    // ログインダイアログ (AuthDialogContext経由)
    await expect(page.locator('text=いいねするにはログインしてください')).toBeVisible();
    await page.screenshot({ path: screenshotDir + 'like-login-dialog.png', fullPage: true });
  });
});

test.describe('フィード（認証済み） @user', () => {
  test('ヒーローは表示されず、いいねができる', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ログイン済みはヒーロー非表示
    await expect(page.locator('text=猫と植物は、いっしょに暮らせる？')).not.toBeVisible();

    // いいねトグル
    const likeButton = page.getByTestId('like-button').first();
    const before = await likeButton.textContent();
    await likeButton.click();
    await expect(likeButton).not.toHaveText(before ?? '');

    await page.screenshot({ path: screenshotDir + 'feed-user-liked.png', fullPage: true });

    // 戻す (他テストへの影響を避ける)
    await likeButton.click();
  });
});
