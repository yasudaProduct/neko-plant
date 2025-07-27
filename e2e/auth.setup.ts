import { test as setup } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
// import { createClient } from '@supabase/supabase-js';
// import prisma from '../src/lib/prisma';

const authFile = 'playwright/.auth/user.json';
const adminAuthFile = 'playwright/.auth/admin.json';

// Supabase Admin Client
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// Magic Link認証による実装（コメントアウト）
/*
setup('authenticate as regular user', async ({ page }) => {
  // E2E_TEST_USER_ADDRESSの環境変数からテストユーザーのメールアドレスを取得
  const testUserEmail = process.env.E2E_TEST_USER_ADDRESS;
  if (!testUserEmail) {
    throw new Error('E2E_TEST_USER_ADDRESS is not set');
  }

  // Supabase APIでユーザーリストを取得してメールアドレスで検索
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    throw new Error('Failed to list users');
  }

  const authUser = users.find(user => user.email === testUserEmail);

  if (!authUser) {
    throw new Error('Test user not found');
  }

  // Magic Link を生成
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: testUserEmail,
  });

  if (error || !data?.properties?.action_link) {
    throw new Error('Failed to generate magic link');
  }

  // Magic Linkにアクセスして認証
  console.log('Magic link for regular user:', data.properties.action_link);
  await page.goto(data.properties.action_link);

  // 認証後のリダイレクトを待つ（URLにアクセストークンが含まれるまで待つ）
  try {
    await page.waitForURL(/access_token=/, { timeout: 10000 });
    console.log('Authentication successful, URL contains access token');
  } catch (error) {
    console.error('Failed to get access token:', error);
    console.log('Current URL:', page.url());
  }

  // トークンが処理されるのを待つ
  await page.waitForTimeout(2000);

  // トークンを手動で処理（Supabaseがクライアントサイドで行う処理を模倣）
  const url = new URL(page.url());
  const accessToken = url.hash.match(/access_token=([^&]+)/)?.[1];
  const refreshToken = url.hash.match(/refresh_token=([^&]+)/)?.[1];

  if (accessToken && refreshToken) {
    // Supabaseのローカルストレージキーにトークンを保存
    await page.evaluate(({ access, refresh }) => {
      const sessionData = {
        access_token: access,
        refresh_token: refresh,
        token_type: 'bearer',
        user: {} // 簡略化
      };
      localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
    }, { access: accessToken, refresh: refreshToken });

    console.log('Tokens saved to localStorage');
  }

  // ホームページに移動して認証が正しく処理されていることを確認
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // 認証状態を保存
  await page.context().storageState({ path: authFile });
  console.log('Regular user auth state saved to:', authFile);
});
*/

// Email認証による新しい実装
setup('通常のユーザーとして認証します', async ({ page }) => {
  const testUserEmail = process.env.E2E_TEST_USER_ADDRESS;
  const testUserPassword = process.env.E2E_TEST_USER_PASSWORD;

  if (!testUserEmail || !testUserPassword) {
    throw new Error('E2E_TEST_USER_ADDRESS and E2E_TEST_USER_PASSWORD must be set');
  }

  // 開発環境用のemail認証ページに移動
  await page.goto('/signin/dev');
  await page.waitForLoadState('networkidle');

  // メールアドレスとパスワードを入力
  await page.fill('[data-testid="email"]', testUserEmail);
  await page.fill('[data-testid="password"]', testUserPassword);

  // ログインボタンをクリック
  await page.click('[data-testid="signin-button"]');

  // 認証成功後のリダイレクトを待つ
  await page.waitForURL('/', { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // 認証状態を保存
  await page.context().storageState({ path: authFile });
  console.log('通常のユーザー認証状態が保存されました:', authFile);
});

// Magic Link認証による管理者認証（コメントアウト）
/*
setup('authenticate as admin user', async ({ page }) => {
  // E2E_TEST_ADMIN_ADDRESSの環境変数から管理者のメールアドレスを取得
  const adminEmail = process.env.E2E_TEST_ADMIN_ADDRESS;
  if (!adminEmail) {
    console.log('E2E_TEST_ADMIN_ADDRESS is not set, skipping admin auth setup');
    return;
  }

  // 管理者ユーザーの存在確認
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    throw new Error('Failed to list users');
  }

  const authUser = users.find(user => user.email === adminEmail);

  if (!authUser) {
    throw new Error('Admin user not found');
  }

  // ユーザーのroleがadminであることを確認
  const publicUser = await prisma.public_users.findFirst({
    where: { auth_id: authUser.id }
  });

  if (!publicUser || publicUser.role !== 'admin') {
    throw new Error('User is not an admin');
  }

  // Magic Link を生成
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: adminEmail,
  });

  if (error || !data?.properties?.action_link) {
    throw new Error('Failed to generate magic link for admin');
  }

  // Magic Linkにアクセスして認証
  console.log('Magic link for admin user:', data.properties.action_link);
  await page.goto(data.properties.action_link);

  // 認証後のリダイレクトを待つ（URLにアクセストークンが含まれるまで待つ）
  try {
    await page.waitForURL(/access_token=/, { timeout: 10000 });
    console.log('Admin authentication successful, URL contains access token');
  } catch (error) {
    console.error('Failed to get admin access token:', error);
    console.log('Current URL:', page.url());
  }

  // トークンが処理されるのを待つ
  await page.waitForTimeout(2000);

  // トークンを手動で処理（Supabaseがクライアントサイドで行う処理を模倣）
  const url = new URL(page.url());
  const accessToken = url.hash.match(/access_token=([^&]+)/)?.[1];
  const refreshToken = url.hash.match(/refresh_token=([^&]+)/)?.[1];

  if (accessToken && refreshToken) {
    // Supabaseのローカルストレージキーにトークンを保存
    await page.evaluate(({ access, refresh }) => {
      const sessionData = {
        access_token: access,
        refresh_token: refresh,
        token_type: 'bearer',
        user: {} // 簡略化
      };
      localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
    }, { access: accessToken, refresh: refreshToken });

    console.log('Admin tokens saved to localStorage');
  }

  // ホームページに移動して認証が正しく処理されていることを確認
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // 認証状態を保存
  await page.context().storageState({ path: adminAuthFile });
  console.log('Admin user auth state saved to:', adminAuthFile);
});
*/

// Email認証による管理者認証
setup('管理者として認証します', async ({ page }) => {
  const adminEmail = process.env.E2E_TEST_ADMIN_ADDRESS;
  const adminPassword = process.env.E2E_TEST_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('E2E_TEST_ADMIN_ADDRESS and E2E_TEST_ADMIN_PASSWORD are not set, skipping admin auth setup');
    return;
  }

  // 開発環境用のemail認証ページに移動
  await page.goto('/signin/dev');
  await page.waitForLoadState('networkidle');

  // メールアドレスとパスワードを入力
  await page.fill('[data-testid="email"]', adminEmail);
  await page.fill('[data-testid="password"]', adminPassword);

  // ログインボタンをクリック
  await page.click('[data-testid="signin-button"]');

  // 認証成功後のリダイレクトを待つ
  await page.waitForURL('/', { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // 認証状態を保存
  await page.context().storageState({ path: adminAuthFile });
  console.log('管理者ユーザーの状態が保存されました:', adminAuthFile);
});