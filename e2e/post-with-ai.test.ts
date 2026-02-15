import { test, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const screenshotDir = 'test-results/screenshots/post-with-ai/';
const testImagePath = path.resolve(__dirname, 'fixtures/test-plant.png');

test.describe('AI判定付き投稿フォーム @user', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/posts/new');
    await page.waitForLoadState('networkidle');
  });

  test('投稿フォームが正しく表示される', async ({ page }) => {
    // ページタイトル確認
    await expect(page.locator('text=写真から評価を投稿')).toBeVisible();

    // フォーム要素の確認
    // "写真" ラベルは複数存在しうるため、より特定できるロケーターに変更
    // 画像アップロードフィールド直前のlabel要素の"text=写真"をターゲット
    await expect(page.locator('label:has-text("写真")').first()).toBeVisible();
    await expect(page.locator('text=猫に対する安全性')).toBeVisible();
    await expect(page.locator('text=コメント')).toBeVisible();
    await expect(page.locator('text=植物名候補')).toBeVisible();

    // AIで判定ボタンが無効状態（画像未選択）
    const identifyButton = page.getByRole('button', { name: 'AIで判定' });
    await expect(identifyButton).toBeDisabled();

    // 未選択状態の表示
    await expect(page.locator('text=未選択（投稿前に植物を確定してください）')).toBeVisible();

    // 投稿ボタンが無効状態（植物未選択）
    await expect(page.locator('form button[type="submit"]').first()).toBeDisabled();

    await page.screenshot({ path: screenshotDir + 'form-initial.png', fullPage: true });
  });

  test('画像アップロード後にAI判定ボタンが有効になる', async ({ page }) => {
    // 画像をアップロード
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // AI判定ボタンが有効になる
    const identifyButton = page.getByRole('button', { name: 'AIで判定' });
    await expect(identifyButton).toBeEnabled();

    await page.screenshot({ path: screenshotDir + 'after-image-upload.png', fullPage: true });
  });

  test('AI判定を実行してモック候補が3件表示される', async ({ page }) => {
    // 画像をアップロード
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // AI判定ボタンをクリック
    const identifyButton = page.getByRole('button', { name: 'AIで判定' });
    await identifyButton.click();

    // 判定中の表示を確認
    await expect(page.getByRole('button', { name: '判定中...' })).toBeVisible();

    // モック候補が表示される（パキラ、モンステラ、テスト新規植物）
    await expect(page.locator('button:has-text("パキラ")')).toBeVisible();
    await expect(page.locator('button:has-text("モンステラ")')).toBeVisible();
    await expect(page.locator('button:has-text("テスト新規植物")')).toBeVisible();

    // 信頼度スコアが表示される
    await expect(page.locator('text=92%')).toBeVisible();
    await expect(page.locator('text=65%')).toBeVisible();
    await expect(page.locator('text=30%')).toBeVisible();

    await page.screenshot({ path: screenshotDir + 'after-ai-identify.png', fullPage: true });
  });

  test('AI候補の登録済みバッジと新規登録バッジが正しく表示される', async ({ page }) => {
    // 画像をアップロードしてAI判定
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    const identifyButton = page.getByRole('button', { name: 'AIで判定' });
    await identifyButton.click();

    // 候補の表示を待つ
    await expect(page.locator('button:has-text("パキラ")')).toBeVisible();

    // パキラ・モンステラ（シードデータに存在）→ 登録済みバッジ
    const pakiraButton = page.locator('button:has-text("パキラ")');
    await expect(pakiraButton.locator('text=登録済み')).toBeVisible();

    const monsteraButton = page.locator('button:has-text("モンステラ")');
    await expect(monsteraButton.locator('text=登録済み')).toBeVisible();

    // テスト新規植物（DB未登録）→ 新規登録バッジ
    const newPlantButton = page.locator('button:has-text("テスト新規植物")');
    await expect(newPlantButton.locator('text=新規登録')).toBeVisible();

    // 登録済み候補には「詳細を見る」リンクがある
    await expect(pakiraButton.locator('text=詳細を見る')).toBeVisible();

    // 新規候補には「詳細を見る」リンクがない
    await expect(newPlantButton.locator('text=詳細を見る')).not.toBeVisible();

    await page.screenshot({ path: screenshotDir + 'candidate-badges.png', fullPage: true });
  });

  test('AI候補をクリックすると選択状態が切り替わる', async ({ page }) => {
    // 画像をアップロードしてAI判定
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    const identifyButton = page.getByRole('button', { name: 'AIで判定' });
    await identifyButton.click();

    // 候補の表示を待つ
    await expect(page.locator('button:has-text("パキラ")')).toBeVisible();

    // 判定後、最初の登録済み候補（パキラ）が自動選択される
    await expect(page.locator('text=この名前で投稿されます')).toBeVisible();
    await expect(page.locator('.text-lg.font-bold:has-text("パキラ")')).toBeVisible();

    // 新規植物候補をクリックして切り替え
    await page.locator('button:has-text("テスト新規植物")').click();
    await expect(page.locator('.text-lg.font-bold:has-text("テスト新規植物")')).toBeVisible();
    await expect(page.locator('.rounded-lg.border-2 >> text=新規登録')).toBeVisible();

    // 投稿ボタンが有効
    await expect(page.locator('form button[type="submit"]').first()).toBeEnabled();

    await page.screenshot({ path: screenshotDir + 'candidate-selected.png', fullPage: true });
  });

  test('手動検索で登録済み植物を選択できる', async ({ page }) => {
    // 検索フィールドに入力（シードデータの「パキラ」を使用）
    const searchInput = page.locator('input[placeholder="植物名を検索（例：パキラ）"]');
    await searchInput.fill('パキラ');

    // 検索結果が表示されるのを待つ（デバウンス300ms + API応答）
    await expect(page.locator('button:has-text("パキラ")').first()).toBeVisible({ timeout: 5000 });

    // 検索結果をクリック
    await page.locator('.rounded-md.border.bg-white button:has-text("パキラ")').first().click();

    // 選択状態の確認
    await expect(page.locator('text=この名前で投稿されます')).toBeVisible();
    await expect(page.locator('.text-lg.font-bold:has-text("パキラ")')).toBeVisible();

    // 登録済みバッジが表示される
    await expect(page.locator('.rounded-lg.border-2 >> text=登録済み')).toBeVisible();

    await page.screenshot({ path: screenshotDir + 'search-existing-plant.png', fullPage: true });
  });

  test('検索で完全一致する植物がある場合は新規登録ボタンが非表示', async ({ page }) => {
    // 検索フィールドに既存の植物名を完全一致で入力
    const searchInput = page.locator('input[placeholder="植物名を検索（例：パキラ）"]');
    await searchInput.fill('パキラ');

    // 検索結果が表示されるのを待つ
    await expect(page.locator('.rounded-md.border.bg-white button:has-text("パキラ")').first()).toBeVisible({ timeout: 5000 });

    // 「新規登録して選択」ボタンが表示されないことを確認
    await expect(page.locator('button:has-text("を新規登録して選択")')).not.toBeVisible();

    await page.screenshot({ path: screenshotDir + 'search-no-new-register-button.png', fullPage: true });
  });

  test('検索で一致しない植物名の場合は新規登録ボタンが表示される', async ({ page }) => {
    // 存在しない植物名を入力
    const uniqueName = `テスト植物${Date.now()}`;
    const searchInput = page.locator('input[placeholder="植物名を検索（例：パキラ）"]');
    await searchInput.fill(uniqueName);

    // デバウンス待機
    await page.waitForTimeout(500);

    // 「新規登録して選択」ボタンが表示される
    await expect(page.locator(`button:has-text("「${uniqueName}」を新規登録して選択")`)).toBeVisible();

    // クリックして選択
    await page.locator(`button:has-text("「${uniqueName}」を新規登録して選択")`).click();

    // 選択状態の確認
    await expect(page.locator('text=この名前で投稿されます')).toBeVisible();
    await expect(page.locator(`.text-lg.font-bold:has-text("${uniqueName}")`)).toBeVisible();

    // 新規登録バッジが表示される
    await expect(page.locator('.rounded-lg.border-2 >> text=新規登録')).toBeVisible();

    await page.screenshot({ path: screenshotDir + 'search-new-plant.png', fullPage: true });
  });

  test('バリデーション：必須項目が未入力の場合エラーが表示される', async ({ page }) => {
    // 画像をアップロード
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // 検索で植物を選択
    const searchInput = page.locator('input[placeholder="植物名を検索（例：パキラ）"]');
    await searchInput.fill('パキラ');
    await expect(page.locator('.rounded-md.border.bg-white button:has-text("パキラ")').first()).toBeVisible({ timeout: 5000 });
    await page.locator('.rounded-md.border.bg-white button:has-text("パキラ")').first().click();

    // コメントと安全性を入力せずに投稿ボタンをクリック
    const submitButton = page.locator('form button[type="submit"]');
    await submitButton.click();

    // バリデーションエラーメッセージ確認
    const commentError = page.locator('text=コメントを入力してください');
    const typeError = page.locator('text=安全性を選択してください');

    const hasCommentError = await commentError.count() > 0;
    const hasTypeError = await typeError.count() > 0;

    // 少なくとも1つのバリデーションエラーが表示される
    expect(hasCommentError || hasTypeError).toBeTruthy();

    await page.screenshot({ path: screenshotDir + 'validation-errors.png', fullPage: true });
  });

  test('安全性ボタンの選択状態が切り替わる', async ({ page }) => {
    // 安全ボタンをクリック
    const safeButton = page.getByRole('button', { name: '安全' });
    await safeButton.click();

    // 安全ボタンが選択状態になることをスクリーンショットで確認
    await page.screenshot({ path: screenshotDir + 'safety-good-selected.png', fullPage: true });

    // 危険ボタンをクリック
    const dangerButton = page.getByRole('button', { name: '危険' });
    await dangerButton.click();

    await page.screenshot({ path: screenshotDir + 'safety-bad-selected.png', fullPage: true });
  });

  test('選択中表示が登録済み植物の場合に緑のスタイルで表示される', async ({ page }) => {
    // 検索で登録済み植物を選択
    const searchInput = page.locator('input[placeholder="植物名を検索（例：パキラ）"]');
    await searchInput.fill('モンステラ');
    await expect(page.locator('.rounded-md.border.bg-white button:has-text("モンステラ")').first()).toBeVisible({ timeout: 5000 });
    await page.locator('.rounded-md.border.bg-white button:has-text("モンステラ")').first().click();

    // 緑色のボーダーが適用されている確認
    const selectedBox = page.locator('.rounded-lg.border-2.border-green-400');
    await expect(selectedBox).toBeVisible();

    // 「この植物の詳細を見る」リンクが表示される
    await expect(page.locator('text=この植物の詳細を見る')).toBeVisible();

    await page.screenshot({ path: screenshotDir + 'selected-existing-plant-style.png', fullPage: true });
  });

  test('選択中表示が新規植物の場合にアンバーのスタイルで表示される', async ({ page }) => {
    // 存在しない植物名を入力して新規登録
    const uniqueName = `新種植物${Date.now()}`;
    const searchInput = page.locator('input[placeholder="植物名を検索（例：パキラ）"]');
    await searchInput.fill(uniqueName);
    await page.waitForTimeout(500);

    await page.locator(`button:has-text("「${uniqueName}」を新規登録して選択")`).click();

    // アンバー色のボーダーが適用されている確認
    const selectedBox = page.locator('.rounded-lg.border-2.border-amber-400');
    await expect(selectedBox).toBeVisible();

    // 「この植物の詳細を見る」リンクは表示されない
    await expect(page.locator('text=この植物の詳細を見る')).not.toBeVisible();

    await page.screenshot({ path: screenshotDir + 'selected-new-plant-style.png', fullPage: true });
  });
});

test.describe('AI判定付き投稿フォーム（未認証） @public', () => {
  test('未認証ユーザーはサインインページにリダイレクトされる', async ({ page }) => {
    await page.goto('/posts/new');
    await page.waitForLoadState('networkidle');

    // サインインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/\/signin/);

    await page.screenshot({ path: screenshotDir + 'unauthenticated-redirect.png', fullPage: true });
  });
});
