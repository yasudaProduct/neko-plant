import { test, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

/**
 * 主要フロー M2（暮らしを共有・投稿する）
 * 写真・植物・猫・コメントを1ページに縦に並べたフォーム（ステップ切り替えなし）。
 *
 * 注: 完走テストは「既存の植物(パキラ)×既存の猫」を選ぶことで、
 * 共存実績の集計値(proven=2 等)を変えず、他テストと衝突しないようにしている。
 * 「猫のその場登録」テストは新規の猫を作るが、投稿自体は完了させないことで
 * 共存実績への影響（search-zukan.test.ts の並び順アサーションとの衝突）を避けている。
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

  test('写真→植物(AI判定)→猫→コメント→投稿まで完走できる', async ({ page }) => {
    const marker = `E2E投稿マーカー_${Date.now()}`;
    const submitButton = page.getByTestId('submit-post');

    // 初期状態: 3つの見出しは番号付きで常に表示。植物はまだ写真待ちの案内のみで、AI候補は無い
    await expect(page.getByRole('heading', { name: '写真を選択' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '植物を紐付ける' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '写っている猫を選択' })).toBeVisible();
    await expect(page.getByTestId('ai-candidate')).toHaveCount(0);
    await expect(submitButton).toBeDisabled();

    await page.getByTestId('image-input').setInputFiles(testImagePath);

    // 画面遷移なしで植物セクションの詳細（AI判定候補等）が同一ページに現れる
    await expect(submitButton).toBeDisabled();
    await expect(page.getByTestId('ai-candidate').first()).toBeVisible({ timeout: 15000 });
    // 既存の「パキラ」を選ぶ（共存実績を変えない）
    await page.getByTestId('ai-candidate').filter({ hasText: 'パキラ' }).first().click();
    await expect(page.locator('text=選択中の植物')).toBeVisible();
    await expect(submitButton).toBeDisabled();

    await page.getByTestId('pet-option').first().click();
    await page.getByTestId('comment-input').fill(marker);
    await expect(submitButton).toBeEnabled();
    await page.screenshot({ path: screenshotDir + 'post-form.png', fullPage: true });

    // 投稿 → フィードに反映される
    await submitButton.click();
    await page.waitForURL('/');
    await expect(page.getByTestId('post-card').filter({ hasText: marker })).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: screenshotDir + 'posted.png', fullPage: true });
  });

  test('猫を選択しないと投稿できない', async ({ page }) => {
    const submitButton = page.getByTestId('submit-post');
    await expect(submitButton).toBeDisabled();

    await page.getByTestId('image-input').setInputFiles(testImagePath);
    await expect(page.getByTestId('ai-candidate').first()).toBeVisible({ timeout: 15000 });
    await page.getByTestId('ai-candidate').first().click();

    // 写真・植物までは選択済みでも、猫が未選択なら投稿できない
    await expect(submitButton).toBeDisabled();
  });

  test('手動検索で既存の植物を選択できる', async ({ page }) => {
    await page.getByTestId('image-input').setInputFiles(testImagePath);
    await expect(page.getByRole('heading', { name: '植物を紐付ける' })).toBeVisible();

    // 手動検索でモンステラを検索して選択
    await page.getByTestId('plant-search-input').fill('モンステラ');
    await page.locator('button', { hasText: 'モンステラ' }).first().click();

    // 選択中に反映される
    const selected = page.locator('text=選択中の植物').locator('..');
    await expect(selected.getByText('モンステラ')).toBeVisible();
  });

  test('写真を全て削除すると、選択していた植物・猫もクリアされる', async ({ page }) => {
    const firstPet = page.getByTestId('pet-option').first();

    await page.getByTestId('image-input').setInputFiles(testImagePath);
    await expect(page.getByTestId('ai-candidate').first()).toBeVisible({ timeout: 15000 });
    await page.getByTestId('ai-candidate').first().click();
    await firstPet.click();
    await expect(page.locator('text=選択中の植物')).toBeVisible();
    await expect(firstPet).toHaveClass(/bg-green-100/);

    // 唯一の写真を削除する
    await page.getByTestId('remove-image').click();

    // 植物・猫の選択がクリアされ、投稿もできなくなる
    await expect(page.locator('text=選択中の植物')).not.toBeVisible();
    await expect(firstPet).not.toHaveClass(/bg-green-100/);
    await expect(page.getByTestId('submit-post')).toBeDisabled();
  });

  test('猫が未登録でも投稿フローを離脱せずその場で登録できる', async ({ page }) => {
    const catName = `E2Eねこ_${Date.now()}`;

    await page.getByTestId('image-input').setInputFiles(testImagePath);
    await expect(page.getByTestId('ai-candidate').first()).toBeVisible({ timeout: 15000 });
    await page.getByTestId('ai-candidate').first().click();

    // その場で猫を登録する（別ページへの遷移なし）
    await page.getByTestId('add-pet-trigger').click();
    await expect(page.getByRole('heading', { name: '猫を追加' })).toBeVisible();
    await page.getByTestId('pet-name-input').fill(catName);
    await page.getByTestId('pet-save-button').click();

    // ページ自体は離脱しておらず、写真・植物の選択も保持されている
    await expect(page).toHaveURL('/posts/new');
    await expect(page.locator('text=選択中の植物')).toBeVisible();

    // 新しく登録した猫が一覧に選択済みの状態で反映され、投稿できるようになる
    await expect(page.getByTestId('pet-option').filter({ hasText: catName })).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('submit-post')).toBeEnabled();
    await page.screenshot({ path: screenshotDir + 'inline-pet-created.png', fullPage: true });

    // 後片付け: 投稿は完了させず、作成した猫だけ削除する
    // (新規の猫でパキラ等を完走させると共存実績のユニーク猫数が変わり、
    //  search-zukan.test.ts の並び順アサーションと衝突するため)
    await page.goto('/settings/cats');
    await page.waitForLoadState('networkidle');
    const addedCard = page.getByTestId('pet-card').filter({ hasText: catName });
    await addedCard.getByRole('button', { name: '編集' }).click();
    await expect(page.getByRole('heading', { name: '猫プロフィールを編集' })).toBeVisible();
    await page.getByRole('button', { name: '削除' }).click();
    await expect(page.getByTestId('pet-card').filter({ hasText: catName })).toHaveCount(0, { timeout: 10000 });
  });
});
