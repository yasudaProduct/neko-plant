import { test, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const screenshotDir = 'test-results/screenshots/post-flow/';
const testImagePath = path.resolve(__dirname, 'fixtures/test-plant.png');

test.describe('投稿フロー（未認証） @public', () => {
  test('未認証ユーザーはログインページにリダイレクトされる', async ({ page }) => {
    await page.goto('/posts/new');
    await expect(page).toHaveURL('/signin');
  });
});

test.describe('投稿フロー @user', () => {
  test('写真→植物(AI判定)→猫→確認→投稿の一連の流れが完了する', async ({ page }) => {
    await page.goto('/posts/new');
    await page.waitForLoadState('networkidle');

    // ステップ1: 写真
    await expect(page.locator('text=写真を選択')).toBeVisible();
    const nextButton = page.getByTestId('next-step');
    await expect(nextButton).toBeDisabled();

    await page.getByTestId('image-input').setInputFiles(testImagePath);
    await expect(nextButton).toBeEnabled();
    await page.screenshot({ path: screenshotDir + 'step1-photo.png', fullPage: true });
    await nextButton.click();

    // ステップ2: 植物 (モックAIが パキラ/モンステラ/テスト新規植物 を返す)
    await expect(page.locator('text=植物を紐付ける')).toBeVisible();
    await expect(page.getByTestId('ai-candidate').first()).toBeVisible({ timeout: 15000 });

    const pakira = page.getByTestId('ai-candidate').filter({ hasText: 'パキラ' }).first();
    await pakira.click();
    await expect(page.locator('text=選択中の植物')).toBeVisible();
    await page.screenshot({ path: screenshotDir + 'step2-plant.png', fullPage: true });
    await nextButton.click();

    // ステップ3: 猫 + コメント
    await expect(page.locator('text=写っている猫を選択')).toBeVisible();
    await expect(nextButton).toBeDisabled();

    await page.getByTestId('pet-option').first().click();
    await page.getByTestId('comment-input').fill('E2Eテスト投稿です');
    await expect(nextButton).toBeEnabled();
    await page.screenshot({ path: screenshotDir + 'step3-cat.png', fullPage: true });
    await nextButton.click();

    // ステップ4: 確認
    await expect(page.locator('text=内容を確認')).toBeVisible();
    await expect(page.locator('text=E2Eテスト投稿です')).toBeVisible();
    await page.screenshot({ path: screenshotDir + 'step4-confirm.png', fullPage: true });

    // 投稿
    await page.getByTestId('submit-post').click();

    // フィードに戻り、投稿が表示される
    await page.waitForURL('/');
    await expect(page.locator('text=E2Eテスト投稿です').first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: screenshotDir + 'posted.png', fullPage: true });
  });

  test('猫が必須である (選択しないと次へ進めない)', async ({ page }) => {
    await page.goto('/posts/new');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('image-input').setInputFiles(testImagePath);
    await page.getByTestId('next-step').click();

    await expect(page.getByTestId('ai-candidate').first()).toBeVisible({ timeout: 15000 });
    await page.getByTestId('ai-candidate').first().click();
    await page.getByTestId('next-step').click();

    // 猫未選択では次へが無効
    await expect(page.locator('text=写っている猫を選択')).toBeVisible();
    await expect(page.getByTestId('next-step')).toBeDisabled();
  });
});
