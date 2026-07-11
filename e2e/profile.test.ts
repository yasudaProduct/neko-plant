import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

/**
 * 主要フロー M5（アカウント・猫情報を整える）/ M6（人や投稿を辿る）
 * プロフィールのタブ、他ユーザーの閲覧（view-only）、猫プロフィールのCRUD。
 */

const screenshotDir = 'test-results/screenshots/profile/';

test.describe('プロフィール @public', () => {
  test('自分のプロフィール: 投稿・猫・植物コレクションのタブを閲覧できる', async ({ page }) => {
    await page.goto('/testuser');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('profile-name')).toHaveText('テストユーザー');
    await expect(page.locator('text=@testuser')).toBeVisible();

    // 投稿タブ（デフォルト）
    expect(await page.getByTestId('post-tile').count()).toBeGreaterThanOrEqual(3);
    await page.screenshot({ path: screenshotDir + 'profile-posts.png', fullPage: true });

    // 猫タブ（ミケ・クロ）
    await page.getByTestId('profile-tab-cats').click();
    await expect(page.getByText('ミケ')).toBeVisible();
    await expect(page.getByText('クロ')).toBeVisible();
    await page.screenshot({ path: screenshotDir + 'profile-cats.png', fullPage: true });

    // 植物タブ（投稿から自動集計）
    await page.getByTestId('profile-tab-plants').click();
    await expect(page.locator('text=投稿から自動的に集計された')).toBeVisible();
    await expect(page.locator('a[href^="/plants/"]', { hasText: 'モンステラ' })).toBeVisible();
    await page.screenshot({ path: screenshotDir + 'profile-plants.png', fullPage: true });
  });

  test('他ユーザーのプロフィールは閲覧のみで編集ボタンが出ない（M6）', async ({ page }) => {
    await page.goto('/sakura');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('profile-name')).toHaveText('さくら');
    expect(await page.getByTestId('post-tile').count()).toBeGreaterThanOrEqual(1);

    // 未ログイン（他人）には編集導線が表示されない
    await expect(page.getByRole('link', { name: 'プロフィール編集' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: '猫プロフィールを編集' })).toHaveCount(0);

    await page.screenshot({ path: screenshotDir + 'profile-other-view-only.png', fullPage: true });
  });
});

test.describe('プロフィール（ログイン済み） @user', () => {
  test('自分のプロフィールには編集導線が表示される', async ({ page }) => {
    await page.goto('/testuser');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: 'プロフィール編集' })).toBeVisible();
    await expect(page.getByRole('link', { name: '猫プロフィールを編集' })).toBeVisible();
  });
});

test.describe('猫プロフィール管理 @user', () => {
  test('猫を追加して一覧に反映され、削除できる（CRUD）', async ({ page }) => {
    await page.goto('/settings/cats');
    await page.waitForLoadState('networkidle');

    // 既存の猫（ミケ・クロ）
    const initialCount = await page.getByTestId('pet-card').count();
    expect(initialCount).toBeGreaterThanOrEqual(2);

    const catName = `E2Eねこ_${Date.now()}`;

    // 追加
    await page.getByTestId('add-pet-button').click();
    await expect(page.getByRole('heading', { name: '猫を追加' })).toBeVisible();
    await page.getByTestId('pet-name-input').fill(catName);
    await page.getByTestId('pet-save-button').click();

    // 一覧に反映される（router.refresh による即時反映）
    const addedCard = page.getByTestId('pet-card').filter({ hasText: catName });
    await expect(addedCard).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: screenshotDir + 'cat-added.png', fullPage: true });

    // 削除（追加したカードの編集ダイアログから）
    await addedCard.getByRole('button', { name: '編集' }).click();
    await expect(page.getByRole('heading', { name: '猫プロフィールを編集' })).toBeVisible();
    await page.getByRole('button', { name: '削除' }).click();

    // 一覧から消える
    await expect(page.getByTestId('pet-card').filter({ hasText: catName })).toHaveCount(0, { timeout: 10000 });
    await page.screenshot({ path: screenshotDir + 'cat-deleted.png', fullPage: true });
  });
});
