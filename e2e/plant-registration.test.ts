import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const screenshotDir = 'test-results/screenshots/';

test.describe('植物登録機能', () => {

  test('認証済みユーザーは新しい植物を登録できる', async ({ page }) => {
    // 植物登録ページに移動
    await page.goto('/plants/new');
    await page.waitForLoadState('networkidle');

    // ページタイトルを確認
    await expect(page.locator('h1')).toContainText('植物を登録');

    // テスト用の植物名を生成（重複を避けるためタイムスタンプを使用）
    const testPlantName = `テスト植物_${Date.now()}`;

    // 植物名を入力
    await page.fill('input[name="name"]', testPlantName);

    // 登録ボタンをクリック
    await page.click('button[type="submit"]');

    // 成功後、植物詳細ページにリダイレクトされることを確認
    await page.waitForURL(/\/plants\/\d+/);
    
    // 登録した植物名が表示されていることを確認
    await expect(page.locator('.text-2xl.font-bold')).toContainText(testPlantName);
    
    // スクリーンショットを保存
    await page.screenshot({ path: screenshotDir + 'plant-registration-success.png', fullPage: true });
  });

  test('必須フィールドが空の場合はエラーが表示される', async ({ page }) => {
    // 植物登録ページに移動
    await page.goto('/plants/new');
    await page.waitForLoadState('networkidle');

    // 何も入力せずに登録ボタンをクリック
    await page.click('button[type="submit"]');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=植物の名前は必須です')).toBeVisible();
    
    await page.screenshot({ path: screenshotDir + 'plant-registration-validation-error.png', fullPage: true });
  });

  test('重複した植物名では登録できない', async ({ page }) => {
    // まず最初の植物を登録
    const duplicatePlantName = `重複テスト植物_${Date.now()}`;
    
    await page.goto('/plants/new');
    await page.fill('input[name="name"]', duplicatePlantName);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/plants\/\d+/);

    // 同じ名前で再度登録を試みる
    await page.goto('/plants/new');
    await page.fill('input[name="name"]', duplicatePlantName);
    await page.click('button[type="submit"]');

    // エラートーストが表示されることを確認
    await expect(page.locator('li[role="status"]')).toContainText('植物を登録に失敗しました');
    await expect(page.locator('li[role="status"]')).toContainText('植物名が重複しています');
    
    // 既存の植物へのリンクが表示されることを確認
    await expect(page.locator('li[role="status"] a')).toContainText('こちら');
    
    await page.screenshot({ path: screenshotDir + 'plant-registration-duplicate-error.png', fullPage: true });
  });

  test('植物名の文字数制限を確認', async ({ page }) => {
    await page.goto('/plants/new');
    
    // 51文字の植物名を入力（制限は50文字）
    const longPlantName = 'あ'.repeat(51);
    await page.fill('input[name="name"]', longPlantName);
    
    // 入力フィールドのmaxlength属性により、50文字までしか入力できないことを確認
    const inputValue = await page.inputValue('input[name="name"]');
    expect(inputValue.length).toBe(50);
    
    await page.screenshot({ path: screenshotDir + 'plant-registration-max-length.png', fullPage: true });
  });

  test('登録後に植物情報を編集できる', async ({ page }) => {
    // 新しい植物を登録
    const testPlantName = `編集テスト植物_${Date.now()}`;
    
    await page.goto('/plants/new');
    await page.fill('input[name="name"]', testPlantName);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/plants\/\d+/);
    
    // 植物IDを取得
    const plantUrl = page.url();
    const plantId = plantUrl.match(/\/plants\/(\d+)/)?.[1];
    
    // 編集ページに移動
    await page.goto(`/plants/${plantId}/edit`);
    await page.waitForLoadState('networkidle');
    
    // 編集フォームが表示されることを確認
    await expect(page.locator('h1')).toContainText('植物を編集');
    
    // 各フィールドを編集
    await page.fill('input[name="name"]', testPlantName + '_編集済み');
    await page.fill('input[name="scientific_name"]', 'Testus plantus');
    await page.fill('input[name="family"]', 'テスト科');
    await page.fill('input[name="genus"]', 'テスト属');
    await page.fill('input[name="species"]', 'テスト種');
    
    // 更新ボタンをクリック
    await page.click('button:has-text("更新")');
    
    // 詳細ページにリダイレクトされることを確認
    await page.waitForURL(`/plants/${plantId}`);
    
    // 更新された情報が表示されることを確認
    await expect(page.locator('.text-2xl.font-bold')).toContainText(testPlantName + '_編集済み');
    await expect(page.locator('text=Testus plantus')).toBeVisible();
    
    await page.screenshot({ path: screenshotDir + 'plant-edit-success.png', fullPage: true });
  });
});

