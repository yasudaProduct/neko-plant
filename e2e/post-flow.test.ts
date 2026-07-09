import { test, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

/**
 * 主要フロー M2（暮らしを共有・投稿する）
 * 写真 → 植物(AI判定/手動) → 猫 → コメント → 確認 → 投稿 の4ステップウィザード。
 *
 * 注: 完走テストは「既存の植物(パキラ)×既存の猫」を選ぶことで、
 * 共存実績の集計値(proven=2 等)を変えず、他テストと衝突しないようにしている。
 */

const screenshotDir = 'test-results/screenshots/post-flow/';
const testImagePath = path.resolve(__dirname, 'fixtures/test-plant.png');

test.describe('投稿フロー（未認証） @public', () => {
  test('未認証ユーザーはログインページにリダイレクトされる', async ({ page }) => {
    await page.goto('/posts/new');
    await expect(page).toHaveURL('/signin');
  });
});

test.describe('投稿フロー @user', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/posts/new');
    await page.waitForLoadState('networkidle');
  });

  test('写真→植物(AI判定)→猫→コメント→確認→投稿まで完走できる', async ({ page }) => {
    const marker = `E2E投稿マーカー_${Date.now()}`;
    const nextButton = page.getByTestId('next-step');

    // ステップ1: 写真（未選択では次へ無効）
    await expect(page.getByRole('heading', { name: '写真を選択' })).toBeVisible();
    await expect(nextButton).toBeDisabled();
    await page.getByTestId('image-input').setInputFiles(testImagePath);
    await expect(nextButton).toBeEnabled();
    await page.screenshot({ path: screenshotDir + 'step1-photo.png', fullPage: true });
    await nextButton.click();

    // ステップ2: 植物（モックAIがパキラ/モンステラ/テスト新規植物を返す）
    await expect(page.getByRole('heading', { name: '植物を紐付ける' })).toBeVisible();
    await expect(page.getByTestId('ai-candidate').first()).toBeVisible({ timeout: 15000 });
    // 既存の「パキラ」を選ぶ（共存実績を変えない）
    await page.getByTestId('ai-candidate').filter({ hasText: 'パキラ' }).first().click();
    await expect(page.locator('text=選択中の植物')).toBeVisible();
    await page.screenshot({ path: screenshotDir + 'step2-plant.png', fullPage: true });
    await nextButton.click();

    // ステップ3: 猫（未選択では次へ無効）+ コメント
    await expect(page.getByRole('heading', { name: '写っている猫を選択' })).toBeVisible();
    await expect(nextButton).toBeDisabled();
    await page.getByTestId('pet-option').first().click();
    await page.getByTestId('comment-input').fill(marker);
    await expect(nextButton).toBeEnabled();
    await page.screenshot({ path: screenshotDir + 'step3-cat.png', fullPage: true });
    await nextButton.click();

    // ステップ4: 確認
    await expect(page.getByRole('heading', { name: '内容を確認' })).toBeVisible();
    await expect(page.locator(`text=${marker}`)).toBeVisible();
    await page.screenshot({ path: screenshotDir + 'step4-confirm.png', fullPage: true });

    // 投稿 → フィードに反映される
    await page.getByTestId('submit-post').click();
    await page.waitForURL('/');
    await expect(page.getByTestId('post-card').filter({ hasText: marker })).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: screenshotDir + 'posted.png', fullPage: true });
  });

  test('猫を選択しないと投稿ステップを進められない', async ({ page }) => {
    const nextButton = page.getByTestId('next-step');

    await page.getByTestId('image-input').setInputFiles(testImagePath);
    await nextButton.click();

    await expect(page.getByTestId('ai-candidate').first()).toBeVisible({ timeout: 15000 });
    await page.getByTestId('ai-candidate').first().click();
    await nextButton.click();

    // 猫ステップ: 未選択では次へ無効
    await expect(page.getByRole('heading', { name: '写っている猫を選択' })).toBeVisible();
    await expect(nextButton).toBeDisabled();
  });

  test('戻るボタンで前のステップに戻れる', async ({ page }) => {
    const nextButton = page.getByTestId('next-step');

    await page.getByTestId('image-input').setInputFiles(testImagePath);
    await nextButton.click();
    await expect(page.getByRole('heading', { name: '植物を紐付ける' })).toBeVisible();

    // 戻る → 写真ステップに戻り、選択済みの写真は保持される
    await page.getByRole('button', { name: '戻る' }).click();
    await expect(page.getByRole('heading', { name: '写真を選択' })).toBeVisible();
    await expect(nextButton).toBeEnabled();
  });

  test('手動検索で既存の植物を選択できる', async ({ page }) => {
    await page.getByTestId('image-input').setInputFiles(testImagePath);
    await page.getByTestId('next-step').click();
    await expect(page.getByRole('heading', { name: '植物を紐付ける' })).toBeVisible();

    // 手動検索でモンステラを検索して選択
    await page.getByTestId('plant-search-input').fill('モンステラ');
    await page.locator('button', { hasText: 'モンステラ' }).first().click();

    // 選択中に反映される
    const selected = page.locator('text=選択中の植物').locator('..');
    await expect(selected.getByText('モンステラ')).toBeVisible();
  });
});
