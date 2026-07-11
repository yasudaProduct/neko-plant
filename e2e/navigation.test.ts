import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

/**
 * 横断フロー: ヘッダーナビ・認証状態・保護ページのリダイレクト・静的ページのスモーク。
 * （旧 authentication / neko-plant / authenticated-screenshots を統合）
 */

const screenshotDir = 'test-results/screenshots/navigation/';

test.describe('ヘッダーナビゲーション @public', () => {
  test('フィード / 図鑑 / さがす を行き来できる', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ヘッダーのナビリンク（「共存図鑑を見る」「植物をさがす」等との部分一致を避けるため exact）
    await page.getByRole('link', { name: '図鑑', exact: true }).click();
    await expect(page).toHaveURL('/zukan');
    await expect(page.getByRole('heading', { name: '共存図鑑' })).toBeVisible();

    await page.getByRole('link', { name: 'さがす', exact: true }).click();
    await expect(page).toHaveURL('/plants');

    await page.getByRole('link', { name: 'フィード', exact: true }).click();
    await expect(page).toHaveURL('/');
  });

  test('未認証ユーザーにはログインボタンが表示される', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible();
    await expect(page.getByTestId('user-avatar')).toHaveCount(0);

    await page.getByRole('link', { name: 'ログイン' }).click();
    await expect(page).toHaveURL('/signin');
    await page.screenshot({ path: screenshotDir + 'unauthenticated-header.png', fullPage: true });
  });
});

test.describe('保護ページのアクセス制御 @public', () => {
  for (const path of ['/posts/new', '/settings/profile', '/settings/cats']) {
    test(`未認証は ${path} からログインページへリダイレクトされる`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL('/signin');
    });
  }

  test('保護ページ経由でログインするとホームに遷移する', async ({ page }) => {
    const email = process.env.E2E_TEST_USER_ADDRESS;
    const password = process.env.E2E_TEST_USER_PASSWORD;
    if (!email || !password) throw new Error('E2E_TEST_USER_ADDRESS/PASSWORD が未設定です');

    await page.goto('/settings/profile');
    await expect(page).toHaveURL('/signin');

    await page.goto('/signin/dev');
    await page.waitForLoadState('networkidle');
    await page.fill('[data-testid="email"]', email);
    await page.fill('[data-testid="password"]', password);
    await page.click('[data-testid="signin-button"]');

    await page.waitForURL('/');
    await page.screenshot({ path: screenshotDir + 'login-redirect-home.png', fullPage: true });
  });
});

test.describe('静的ページのスモーク @public', () => {
  // /contact は外部Notion iframe埋め込みで networkidle に到達しないため対象外
  for (const path of ['/signin', '/terms', '/privacy']) {
    test(`${path} が正しく表示される`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      // ルートレイアウトのヘッダー（ブランド）が描画される＝クラッシュしていない
      await expect(page.getByRole('link', { name: '猫と植物' })).toBeVisible();
    });
  }
});

test.describe('ヘッダーナビゲーション（ログイン済み） @user', () => {
  test('アバターとドロップダウンメニューが表示される', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('user-avatar')).toBeVisible();
    await expect(page.getByRole('link', { name: 'ログイン' })).toHaveCount(0);

    await page.getByTestId('user-avatar').click();
    await expect(page.getByRole('link', { name: 'マイページ' })).toBeVisible();
    await expect(page.getByRole('link', { name: '猫プロフィール' })).toBeVisible();
    await expect(page.getByRole('link', { name: '設定' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ログアウト' })).toBeVisible();

    await page.screenshot({ path: screenshotDir + 'authenticated-header.png', fullPage: true });
  });

  test('リロード後もセッションが維持される', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('user-avatar')).toBeVisible();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('user-avatar')).toBeVisible();
  });
});
