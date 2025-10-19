import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const screenshotDir = 'test-results/screenshots/';

test.describe('Admin Page Protection - Unauthenticated @public', () => {
  // test.use({ storageState: undefined });

  test('未認証ユーザーは/adminにアクセスできない', async ({ page }) => {

    // /adminにアクセス
    await page.goto('/admin');

    // /signinにリダイレクトされることを確認
    await expect(page).toHaveURL('/signin');
    await page.screenshot({ path: screenshotDir + 'admin-protection-unauthenticated.png', fullPage: true });
  });

  test('管理者ページの各種アクセス制御', async ({ page }) => {
    // 管理者ページのルート一覧
    const adminRoutes = [
      { path: '/admin', title: 'ダッシュボード' },
      { path: '/admin/plant-images', title: '植物画像管理' },
      { path: '/admin/users', title: 'ユーザー管理' },
      { path: '/admin/evaluations', title: '評価管理' },
    ];

    // 各ルートで未認証アクセスがブロックされることを確認
    for (const route of adminRoutes) {
      await page.goto(route.path);
      await expect(page).toHaveURL('/signin');
      await page.screenshot({ path: screenshotDir + 'admin-protection-unauthenticated.png', fullPage: true });
    }
  });
});

// 通常ユーザーとして認証済みのテスト
test.describe('Admin Page Protection - Regular User @user', () => {
  // test.use({ storageState: 'playwright/.auth/user.json' });

  test('通常ユーザーは/adminにアクセスできない', async ({ page }) => {
    // 認証状態を確認するため、まずホームページに移動
    await page.goto('/');

    // /adminにアクセス
    await page.goto('/admin');

    // ホームページまたはサインインページにリダイレクトされることを確認
    const url = page.url();
    expect(url.endsWith('/') || url.includes('/signin')).toBeTruthy();
    await page.screenshot({ path: screenshotDir + 'admin-protection-unauthenticated.png', fullPage: true });
  });

  test('通常ユーザーは管理者ページにアクセスできない', async ({ page }) => {
    const adminRoutes = [
      '/admin',
      '/admin/plant-images',
      '/admin/users',
      '/admin/evaluations',
    ];

    for (const route of adminRoutes) {
      await page.goto(route);
      // ホームページまたはサインインページにリダイレクトされることを確認
      const url = page.url();
      expect(url.endsWith('/') || url.includes('/signin')).toBeTruthy();
      await page.screenshot({ path: screenshotDir + 'admin-protection-unauthenticated.png', fullPage: true });
    }
  });
});

// 管理者として認証済みのテスト
test.describe('Admin Page Protection - Admin User @admin', () => {
  // test.use({ storageState: 'playwright/.auth/admin.json' });

  test('管理者は/adminにアクセスできる', async ({ page }) => {
    // /adminにアクセス
    await page.goto('/admin');

    // 管理者ページにアクセスできることを確認
    await expect(page).toHaveURL('/admin');
    await page.screenshot({ path: screenshotDir + 'admin-protection-admin.png', fullPage: true });
  });

  test('管理者は各管理ページにアクセスできる', async ({ page }) => {
    const adminRoutes = [
      { path: '/admin/plant-images', title: '植物画像管理' },
      { path: '/admin/users', title: 'ユーザー管理' },
      { path: '/admin/evaluations', title: '評価管理' },
    ];

    for (const route of adminRoutes) {
      await page.goto(route.path);
      await expect(page).toHaveURL(route.path);
      await page.screenshot({ path: screenshotDir + 'admin-protection-admin.png', fullPage: true });
    }
  });

  test('管理者ナビゲーションが機能する', async ({ page }) => {
    await page.goto('/admin');

    // ナビゲーションリンクをクリックして各ページに移動
    await page.click('text=植物画像管理');
    await expect(page).toHaveURL('/admin/plant-images');

    await page.click('text=ユーザー管理');
    await expect(page).toHaveURL('/admin/users');

    await page.click('text=評価管理');
    await expect(page).toHaveURL('/admin/evaluations');

    // サイトに戻るリンクをクリック
    await page.click('text=サイトに戻る');
    await expect(page).toHaveURL('/');
    await page.screenshot({ path: screenshotDir + 'admin-protection-admin.png', fullPage: true });
  });
});