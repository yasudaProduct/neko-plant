import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

test.describe('Admin Page Protection - Unauthenticated', () => {
  test('未認証ユーザーは/adminにアクセスできない', async ({ page }) => {
    // /adminにアクセス
    await page.goto('/admin');
    
    // /signinにリダイレクトされることを確認
    await expect(page).toHaveURL('/signin');
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
    }
  });
});

// 通常ユーザーとして認証済みのテスト
test.describe('Admin Page Protection - Regular User', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('通常ユーザーは/adminにアクセスできない', async ({ page }) => {
    // /adminにアクセス
    await page.goto('/admin');
    
    // ホームページにリダイレクトされることを確認
    await expect(page).toHaveURL('/');
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
      // ホームページにリダイレクトされることを確認
      await expect(page).toHaveURL('/');
    }
  });
});

// 管理者として認証済みのテスト
test.describe('Admin Page Protection - Admin User', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('管理者は/adminにアクセスできる', async ({ page }) => {
    // /adminにアクセス
    await page.goto('/admin');
    
    // 管理者ページにアクセスできることを確認
    await expect(page).toHaveURL('/admin');
    
    // ダッシュボードのタイトルが表示されることを確認
    await expect(page.locator('h1')).toContainText('ダッシュボード');
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
      await expect(page.locator('h1')).toContainText(route.title);
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
  });
});