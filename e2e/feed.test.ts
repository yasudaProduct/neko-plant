import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

/**
 * 主要フロー M1（写真を楽しむ）/ M7（サービスを把握する）
 * フィードの閲覧・回遊・いいね導線を検証する。
 *
 * 注: シードは testuser×3 / sakura×1 の計4投稿。@user の投稿フローや
 * いいねトグルが並列で走っても壊れないよう、件数は下限(>=)で、
 * 個別要素は「既知のシード投稿が存在すること」で検証する。
 */

const screenshotDir = 'test-results/screenshots/feed/';
const SEED_POST_COMMENT = 'パキラのとなりでお昼寝しています';

test.describe('フィード / ランディング @public', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('未ログイン時はランディングヒーローとフィードが表示される', async ({ page }) => {
    // M7: 初見向けヒーロー
    await expect(page.getByRole('heading', { name: '猫と植物は、いっしょに暮らせる？' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'はじめる' })).toBeVisible();
    await expect(page.getByRole('link', { name: '植物をさがす' })).toBeVisible();

    // M1: フィード
    await expect(page.getByRole('heading', { name: '新着の投稿' })).toBeVisible();
    expect(await page.getByTestId('post-card').count()).toBeGreaterThanOrEqual(4);

    // サイドパネル（共存実績ランキング＝モンステラが最多3匹）
    await expect(page.getByRole('heading', { name: '共存実績の多い植物' })).toBeVisible();
    await expect(page.locator('text=共存実績について')).toBeVisible();

    await page.screenshot({ path: screenshotDir + 'landing.png', fullPage: true });
  });

  test('投稿カードにコメント・植物タグ・共存バッジが表示される', async ({ page }) => {
    // 既知のシード投稿カードを特定（並列でカード順が変わっても安定）
    const seedCard = page.getByTestId('post-card').filter({ hasText: SEED_POST_COMMENT });
    await expect(seedCard).toBeVisible();

    // 植物タグ（パキラ）と共存バッジ
    await expect(seedCard.locator('a[href^="/plants/"]', { hasText: 'パキラ' })).toBeVisible();
    await expect(seedCard.locator('text=少数の暮らしが報告されています')).toBeVisible();

    await page.screenshot({ path: screenshotDir + 'post-card.png', fullPage: true });
  });

  test('植物タグから植物ページへ遷移できる', async ({ page }) => {
    const seedCard = page.getByTestId('post-card').filter({ hasText: SEED_POST_COMMENT });
    await seedCard.locator('a[href^="/plants/"]', { hasText: 'パキラ' }).click();

    await expect(page).toHaveURL(/\/plants\/\d+/);
    await expect(page.getByTestId('plant-name')).toHaveText('パキラ');
  });

  test('投稿写真から投稿詳細へ遷移できる', async ({ page }) => {
    const seedCard = page.getByTestId('post-card').filter({ hasText: SEED_POST_COMMENT });
    await seedCard.locator('a[href^="/posts/"]').first().click();

    await expect(page).toHaveURL(/\/posts\/\d+/);
    await expect(page.locator('text=写っている植物')).toBeVisible();
    await page.screenshot({ path: screenshotDir + 'post-detail.png', fullPage: true });
  });

  test('投稿者名からユーザープロフィールへ遷移できる（M6）', async ({ page }) => {
    const seedCard = page.getByTestId('post-card').filter({ hasText: SEED_POST_COMMENT });
    await seedCard.getByRole('link', { name: 'テストユーザー' }).first().click();

    await expect(page).toHaveURL('/testuser');
    await expect(page.getByTestId('profile-name')).toHaveText('テストユーザー');
  });

  test('未ログインでいいねするとログイン導線が表示される', async ({ page }) => {
    await page.getByTestId('like-button').first().click();

    // AuthDialogContext 経由のログインダイアログ
    await expect(page.locator('text=いいねするにはログインしてください')).toBeVisible();
    await page.screenshot({ path: screenshotDir + 'like-login-dialog.png', fullPage: true });
  });
});

test.describe('フィード（ログイン済み） @user', () => {
  test('ヒーローは表示されず、いいねのトグルがサーバーに反映される', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ログイン済みはランディングヒーロー非表示
    await expect(page.getByRole('heading', { name: '猫と植物は、いっしょに暮らせる？' })).toHaveCount(0);

    // シード投稿カードのいいねボタンをトグル
    const seedCard = page.getByTestId('post-card').filter({ hasText: SEED_POST_COMMENT });
    const likeButton = seedCard.getByTestId('like-button');
    const initialText = (await likeButton.textContent())?.trim() ?? '';

    await likeButton.click();
    await expect(likeButton).not.toHaveText(initialText);

    // リロードしてもいいね状態がサーバーに永続していることを確認
    const afterText = (await likeButton.textContent())?.trim() ?? '';
    await page.reload();
    await page.waitForLoadState('networkidle');
    const reloadedCard = page.getByTestId('post-card').filter({ hasText: SEED_POST_COMMENT });
    await expect(reloadedCard.getByTestId('like-button')).toHaveText(afterText);

    await page.screenshot({ path: screenshotDir + 'like-toggled.png', fullPage: true });

    // 後続テストへの影響を避けるため元に戻す
    await reloadedCard.getByTestId('like-button').click();
    await expect(reloadedCard.getByTestId('like-button')).toHaveText(initialText);
  });
});
