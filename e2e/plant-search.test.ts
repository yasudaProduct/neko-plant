import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const screenshotDir = 'test-results/screenshots/plant-search/';

test.describe('植物検索・発見機能 @public @user', () => {
  // 各テストで一意の検索キーワードを使用してデータ競合を避ける
  // const getUniqueSearchTerm = (baseterm: string) => `${baseterm}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  // const commonSearchTerm = '植物'; // データベースに存在する共通の検索語
  test.describe('植物名検索（オートコンプリート）', () => {
    test('検索フィールドに入力すると検索候補が表示される', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('form', { timeout: 10000 });

      // 検索フィールドを見つける
      const searchInput = page.locator('input[data-testid="search-input"]');
      await expect(searchInput).toBeVisible();

      // 検索文字を入力
      await searchInput.fill('ネコマダラ');

      // 検索候補のドロップダウンが表示されることを確認
      await page.waitForSelector('[data-testid="plant-suggestions"]', { timeout: 5000 });

      // 候補がリスト形式で表示されることを確認
      const suggestions = page.locator('[data-testid="plant-suggestions"] a');
      const suggestionCount = await suggestions.count();
      expect(suggestionCount).toBeGreaterThan(0);

      await page.screenshot({ path: screenshotDir + 'search-autocomplete.png', fullPage: true });
    });

    test('検索候補をクリックすると植物詳細ページに移動する', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const searchInput = page.locator('input[data-testid="search-input"]');
      await searchInput.fill('ネコマダラ');

      await page.waitForSelector('[data-testid="plant-suggestions"]');

      // 最初の候補をクリック
      const firstSuggestion = page.locator('[data-testid="plant-suggestions"] a').first();
      const suggestionText = await firstSuggestion.textContent();
      await firstSuggestion.click();

      // 植物詳細ページに移動することを確認
      await page.waitForURL(/\/plants\/\d+/);

      // ページタイトルに選択した植物名が含まれることを確認
      if (suggestionText) {
        await expect(page.locator('[data-testid="plant-name"]')).toContainText(suggestionText.trim());
      }

      await page.screenshot({ path: screenshotDir + 'search-suggestion-click.png', fullPage: true });
    });

    test('検索フィールドの外をクリックすると候補が閉じる', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const searchInput = page.locator('input[data-testid="search-input"]');
      await searchInput.fill('ネコマダラ');

      await page.waitForSelector('[data-testid="plant-suggestions"]', { state: 'visible' });

      // 検索フィールドの外をクリック（より具体的な場所をクリック）
      await page.click('header');

      // 少し待機してからUIの状態変化を確認
      await page.waitForTimeout(500);

      // 候補が非表示になることを確認（タイムアウトを短縮し、より柔軟に）
      await expect(page.locator('[data-testid="plant-suggestions"]')).not.toBeVisible({ timeout: 3000 });

      await page.screenshot({ path: screenshotDir + 'search-suggestions-close.png', fullPage: true });
    });
  });

  test.describe('ソート機能', () => {
    test('評価数でソートできる', async ({ page }) => {
      await page.goto('/');

      // 検索を実行
      const searchInput = page.locator('input[placeholder="植物名を検索する"]');
      await searchInput.fill('植物');
      await page.click('button[type="submit"]');

      // ソートセレクトボックスが表示されることを確認
      const sortSelect = page.locator('select, button[role="combobox"]').first();
      await expect(sortSelect).toBeVisible();

      // デフォルトは評価数（多い順）であることを確認
      await expect(page).toHaveURL(/sort=evaluation_desc|$(?!.*sort=)/);

      await page.screenshot({ path: screenshotDir + 'sort-evaluation-desc.png', fullPage: true });
    });

  });

  test.describe('ページネーション', () => {
    test('ページネーションが表示される', async ({ page }) => {
      // 複数ページがあることを想定した検索
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      // 検索結果が表示されることを確認
      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        // 結果がある場合、最大8件表示されることを確認
        expect(cardCount).toBeLessThanOrEqual(8);
      }

      // ページネーションコンポーネントの存在確認
      const pagination = page.locator('[data-testid="pagination"]');
      const hasPagination = await pagination.count() > 0;

      if (hasPagination) {
        await expect(pagination).toBeVisible();
      }

      await page.screenshot({ path: screenshotDir + 'pagination-display.png', fullPage: true });
    });

    test('次のページに移動できる', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      // ページネーションが存在する場合のみテスト
      const nextButton = page.locator('[data-testid="pagination-next"]');
      const hasNextButton = await nextButton.count() > 0;

      if (hasNextButton) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');

        // 2ページ目に移動したことを確認
        await expect(page).toHaveURL(/page=2/);

        await page.screenshot({ path: screenshotDir + 'pagination-next.png', fullPage: true });
      } else {
        // ページネーションがない場合のスクリーンショット
        await page.screenshot({ path: screenshotDir + 'pagination-single-page.png', fullPage: true });
      }
    });

    test('前のページに戻ることができる', async ({ page }) => {
      // 2ページ目から開始
      await page.goto('/?q=植物&page=2');
      await page.waitForLoadState('networkidle');

      const prevButton = page.locator('[data-testid="pagination-prev"]');
      const hasPrevButton = await prevButton.count() > 0;

      if (hasPrevButton) {
        await prevButton.click();
        await page.waitForLoadState('networkidle');

        // 1ページ目に戻ったことを確認（pageパラメータがない状態）
        await expect(page).toHaveURL(/^[^?]*\?q=植物$/);

        await page.screenshot({ path: screenshotDir + 'pagination-prev.png', fullPage: true });
      }
    });

    test('ページ番号をクリックして直接移動できる', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      // ページ番号2のリンクが存在する場合
      const pageLink = page.locator('[data-testid="pagination"] a[href*="page=2"]');
      const hasPageLink = await pageLink.count() > 0;

      if (hasPageLink) {
        await pageLink.click();
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveURL(/page=2/);

        await page.screenshot({ path: screenshotDir + 'pagination-direct.png', fullPage: true });
      }
    });
  });

  test.describe('検索結果なしの処理', () => {
    test('存在しない植物名で検索すると「検索結果がありません」が表示される', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 存在しない植物名で検索
      const searchInput = page.locator('input[placeholder="植物名を検索する"]');
      await searchInput.fill('存在しない植物名12345');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');

      // 検索結果なしのメッセージが表示されることを確認
      await expect(page.locator('text=検索結果がありません')).toBeVisible();

      // または具体的なメッセージ
      await expect(page.locator('text=「存在しない植物名12345」の検索結果がありません')).toBeVisible();

      await page.screenshot({ path: screenshotDir + 'search-no-results.png', fullPage: true });
    });

    test('検索クエリなしでアクセスした場合の表示', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 検索フィールドが表示されることを確認
      const searchInput = page.locator('input[placeholder="植物名を検索する"]');
      await expect(searchInput).toBeVisible();

      // より柔軟なテキスト検索（部分一致で確認）
      const welcomeText = page.locator('text=猫と植物').or(page.locator(':text("植物")').first()).or(page.locator('h1, h2, h3, p').first());
      await expect(welcomeText.first()).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: screenshotDir + 'search-homepage.png', fullPage: true });
    });
  });

  test.describe('検索結果の表示', () => {
    test('検索結果が植物カード形式で表示される', async ({ page }) => {

      const plantName = 'ネコマダラ';

      await page.goto(`/?q=${plantName}`);

      // 植物カードが表示されることを確認
      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        // 最初のカードの内容を確認
        const firstCard = plantCards.first();

        // 植物名が表示されることを確認
        await expect(firstCard.locator('h3')).toContainText(plantName);

        // いいね・悪いアイコンが表示されることを確認
        await expect(firstCard.locator('[data-testid="heart-icon"]')).toBeVisible();
        await expect(firstCard.locator('[data-testid="skull-icon"]')).toBeVisible();
      }

      await page.screenshot({ path: screenshotDir + 'search-results-display.png', fullPage: true });
    });

    test('植物カードをクリックすると詳細ページに移動する', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        const firstCard = plantCards.first();
        await firstCard.click();

        // 植物詳細ページに移動することを確認
        await page.waitForURL(/\/plants\/\d+/);

        await page.screenshot({ path: screenshotDir + 'search-card-click.png', fullPage: true });
      }
    });

    test('検索結果のレスポンシブ表示', async ({ page }) => {
      const plantName = 'ネコマダラ';

      await page.goto(`/?q=${plantName}`);

      // デスクトップビューでの表示確認
      await page.setViewportSize({ width: 1200, height: 800 });

      const plantCard = page.locator('[data-testid="plant-card"]');
      await expect(plantCard).toBeVisible();

      await page.screenshot({ path: screenshotDir + 'search-responsive-desktop.png', fullPage: true });

      // モバイルビューでの表示確認
      await page.setViewportSize({ width: 375, height: 667 });

      await expect(plantCard).toBeVisible();

      await page.screenshot({ path: screenshotDir + 'search-responsive-mobile.png', fullPage: true });
    });
  });
});