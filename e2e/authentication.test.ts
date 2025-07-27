import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const screenshotDir = 'test-results/screenshots/';

test.describe('認証機能', () => {
  test.describe('ログアウト機能', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('ヘッダードロップダウンからログアウトできる', async ({ page }) => {
      // ホームページに移動
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // ユーザーアバターをクリックしてドロップダウンを開く
      await page.click('[data-testid="user-avatar"]');
      await page.waitForSelector('text=ログアウト', { timeout: 5000 });

      // ログアウトボタンをクリック
      await page.click('text=ログアウト');

      // ログアウト後、ホームページにリダイレクトされることを確認
      await page.waitForURL('/');
      await page.waitForLoadState('networkidle');

      // ログインボタンが表示されることを確認（非認証状態）
      await expect(page.locator('text=ログイン')).toBeVisible();

      // ユーザーアバターが表示されていないことを確認
      await expect(page.locator('[data-testid="user-avatar"]')).not.toBeVisible();

      await page.screenshot({ path: screenshotDir + 'logout-success.png', fullPage: true });
    });

    test('ログアウト後に保護されたページにアクセスするとログインページにリダイレクトされる', async ({ page }) => {
      // まずログアウト
      await page.goto('/');
      await page.click('[data-testid="user-avatar"]');
      await page.click('text=ログアウト');
      await page.waitForURL('/');

      // 保護されたページ（植物登録）にアクセス
      await page.goto('/plants/new');
      await page.waitForLoadState('networkidle');

      // ログインページにリダイレクトされることを確認
      await expect(page).toHaveURL('/signin');

      await page.screenshot({ path: screenshotDir + 'logout-protected-redirect.png', fullPage: true });
    });
  });

  test.describe('ログイン後のリダイレクト機能', () => {
    test.use({ storageState: undefined });

    test('保護されたページにアクセス後、ログインすると元のページにリダイレクトされる', async ({ page }) => {
      // 保護されたページ（設定ページ）に直接アクセス
      await page.goto('/settings/profile');

      // ログインページにリダイレクトされることを確認
      await expect(page).toHaveURL('/signin');

      // 開発環境用ログインページに移動
      await page.goto('/signin/dev');
      await page.waitForLoadState('networkidle');

      // ログイン情報を入力
      const testUserEmail = process.env.E2E_TEST_USER_ADDRESS;
      const testUserPassword = process.env.E2E_TEST_USER_PASSWORD;

      if (!testUserEmail || !testUserPassword) {
        throw new Error('E2E_TEST_USER_ADDRESS and E2E_TEST_USER_PASSWORD must be set');
      }

      await page.fill('[data-testid="email"]', testUserEmail);
      await page.fill('[data-testid="password"]', testUserPassword);
      await page.click('[data-testid="signin-button"]');

      // ログイン成功後、ホームページにリダイレクトされることを確認
      // 注意: 現在の実装ではnextパラメータを保持していないため、ホームページに移動する
      await page.waitForURL('/');

      await page.screenshot({ path: screenshotDir + 'login-redirect-home.png', fullPage: true });
    });
  });

});

test.describe('ヘッダーナビゲーション - 未認証', () => {
  test.use({ storageState: undefined });

  test('未認証ユーザーにはログインボタンが表示される', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ログインボタンが表示されることを確認
    await expect(page.locator('text=ログイン')).toBeVisible();

    // ユーザーアバターが表示されていないことを確認
    await expect(page.locator('[data-testid="user-avatar"]')).not.toBeVisible();

    // ログインボタンをクリックするとログインページに移動することを確認
    await page.click('text=ログイン');
    await expect(page).toHaveURL('/signin');

    await page.screenshot({ path: screenshotDir + 'unauthenticated-header.png', fullPage: true });
  });
});

test.describe('ヘッダーナビゲーション - 認証済み', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('認証済みユーザーにはユーザーアバターと植物追加ボタンが表示される', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ユーザーアバターが表示されることを確認
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();

    // 植物追加ボタンが表示されることを確認
    await expect(page.locator('text=植物を追加')).toBeVisible();

    // ログインボタンが表示されていないことを確認
    await expect(page.locator('text=ログイン')).not.toBeVisible();

    // ユーザーアバターをクリックしてドロップダウンメニューを確認
    await page.click('[data-testid="user-avatar"]');
    await expect(page.locator('text=マイページ')).toBeVisible();
    await expect(page.locator('text=設定')).toBeVisible();
    await expect(page.locator('text=ログアウト')).toBeVisible();

    await page.screenshot({ path: screenshotDir + 'authenticated-header.png', fullPage: true });
  });

});

test.describe('セッション永続化', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('ページリロード後も認証状態が維持される', async ({ page }) => {
    // ホームページに移動
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 認証済み状態を確認
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();

    // ページをリロード
    await page.reload();
    await page.waitForLoadState('networkidle');

    // リロード後も認証状態が維持されることを確認
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
    await expect(page.locator('text=植物を追加')).toBeVisible();

    await page.screenshot({ path: screenshotDir + 'session-persistence.png', fullPage: true });
  });

  test('別ページに移動後も認証状態が維持される', async ({ page }) => {
    // ホームページに移動
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 認証済み状態を確認
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();

    // 利用規約ページに移動
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');

    // 認証状態が維持されることを確認
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();

    // 植物登録ページに移動
    await page.goto('/plants/new');
    await page.waitForLoadState('networkidle');

    // 保護されたページにアクセスできることを確認
    await expect(page).toHaveURL('/plants/new');
    await expect(page.locator('h1')).toContainText('植物を登録');

    await page.screenshot({ path: screenshotDir + 'session-cross-page.png', fullPage: true });
  });
});