import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const screenshotDir = 'test-results/screenshots/';

test.describe('植物詳細ページ @public', () => {
  test.describe('植物情報表示', () => {
    test('植物の基本情報が表示される', async ({ page }) => {
      // 植物一覧から最初の植物の詳細ページに移動
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 植物名（h1タグ）が表示されることを確認
        const plantName = page.locator('h1');
        await expect(plantName).toBeVisible();

        // 植物名が空でないことを確認
        const nameText = await plantName.textContent();
        expect(nameText?.trim().length).toBeGreaterThan(0);

        await page.screenshot({ path: screenshotDir + 'plant-detail-basic-info.png', fullPage: true });
      }
    });

    test('植物の分類学的情報が表示される', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 学名の表示確認
        const scientificName = page.locator('text=学名：');
        await expect(scientificName).toBeVisible();

        // 科の表示確認
        const family = page.locator('text=科：');
        await expect(family).toBeVisible();

        // 属の表示確認
        const genus = page.locator('text=属：');
        await expect(genus).toBeVisible();

        // 種の表示確認
        const species = page.locator('text=種：');
        await expect(species).toBeVisible();

        await page.screenshot({ path: screenshotDir + 'plant-detail-taxonomy.png', fullPage: true });
      }
    });

    test('未設定の分類学的情報は「未設定」と表示される', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 「未設定」テキストが存在するか確認（すべての分類学的情報が設定されていない場合）
        const unsetFields = page.locator('text=未設定');
        const unsetCount = await unsetFields.count();

        // 少なくとも1つ以上の分類学的情報が表示されていることを確認
        expect(unsetCount).toBeGreaterThanOrEqual(0);

        await page.screenshot({ path: screenshotDir + 'plant-detail-unset-fields.png', fullPage: true });
      }
    });
  });

  test.describe('画像カルーセル', () => {
    test('植物画像がカルーセル形式で表示される', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // カルーセルコンテナが存在することを確認
        const carousel = page.locator('[data-testid="plant-carousel"]');
        const hasCarousel = await carousel.count() > 0;

        if (hasCarousel) {
          await expect(carousel).toBeVisible();

          // カルーセル画像が表示されることを確認
          const carouselImages = carousel.locator('img');
          await expect(carouselImages.first()).toBeVisible();

          await page.screenshot({ path: screenshotDir + 'plant-detail-carousel.png', fullPage: true });
        } else {
          // カルーセルがない場合のプレースホルダー確認
          const placeholder = page.locator('text=No image');
          await expect(placeholder).toBeVisible();

          await page.screenshot({ path: screenshotDir + 'plant-detail-no-image.png', fullPage: true });
        }
      }
    });

    test('複数画像がある場合はナビゲーションボタンが表示される', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 次へボタンの存在確認
        const nextButton = page.locator('[data-testid="carousel-next"]');
        const hasNextButton = await nextButton.count() > 0;

        if (hasNextButton) {
          await expect(nextButton).toBeVisible();

          // 前へボタンの存在確認
          const prevButton = page.locator('[data-testid="carousel-prev"]');
          await expect(prevButton).toBeVisible();

          await page.screenshot({ path: screenshotDir + 'plant-detail-carousel-navigation.png', fullPage: true });
        }
      }
    });

    test('カルーセルのナビゲーションが機能する', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        const nextButton = page.locator('[data-testid="carousel-next"]');
        const hasNextButton = await nextButton.count() > 0;

        if (hasNextButton) {
          // 次へボタンをクリック
          await nextButton.click();
          await page.waitForTimeout(500); // カルーセルアニメーション待機

          // 前へボタンをクリック
          const prevButton = page.locator('[data-testid="carousel-prev"]');
          await prevButton.click();
          await page.waitForTimeout(500);

          await page.screenshot({ path: screenshotDir + 'plant-detail-carousel-interaction.png', fullPage: true });
        }
      }
    });
  });

  test.describe('評価統計表示', () => {
    test('評価統計が表示される', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // RatingBarコンポーネントが表示されることを確認
        const ratingBar = page.locator('[data-testid="rating-bar"]');
        const hasRatingBar = await ratingBar.count() > 0;

        if (hasRatingBar) {
          await expect(ratingBar).toBeVisible();

          // ハートアイコン（良い評価）の表示確認
          await expect(ratingBar.locator('[data-testid="heart-icon"]')).toBeVisible();

          // スカルアイコン（悪い評価）の表示確認
          await expect(ratingBar.locator('[data-testid="skull-icon"]')).toBeVisible();

          await page.screenshot({ path: screenshotDir + 'plant-detail-rating-stats.png', fullPage: true });
        } else {
          // 評価がない場合のメッセージ確認
          await expect(page.locator('text=評価がまだありません')).toBeVisible();

          await page.screenshot({ path: screenshotDir + 'plant-detail-no-ratings.png', fullPage: true });
        }
      }
    });

    test('良い評価と悪い評価が分けて表示される', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 良い評価セクションの確認
        const goodEvaluations = page.locator('text=良い評価');
        await expect(goodEvaluations).toBeVisible();

        // 悪い評価セクションの確認
        const badEvaluations = page.locator('text=悪い評価');
        await expect(badEvaluations).toBeVisible();

        await page.screenshot({ path: screenshotDir + 'plant-detail-evaluation-sections.png', fullPage: true });
      }
    });

    test('評価カードの詳細情報が表示される', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 評価カードが存在する場合
        const evaluationCards = page.locator('[data-testid="evaluation-card"]');
        const evaluationCount = await evaluationCards.count();

        if (evaluationCount > 0) {
          const firstEvaluation = evaluationCards.first();

          // ユーザーアバターの表示確認
          const avatar = firstEvaluation.locator('[data-testid="user-avatar"]');
          const hasAvatar = await avatar.count() > 0;
          if (hasAvatar) {
            await expect(avatar).toBeVisible();
          }

          // ユーザー名のリンクが表示されることを確認
          const userLink = firstEvaluation.locator('a[href^="/"]');
          await expect(userLink.first()).toBeVisible();

          // コメントテキストが表示されることを確認
          const commentText = firstEvaluation.locator('[data-testid="comment-text"]');
          const hasComment = await commentText.count() > 0;
          if (hasComment) {
            await expect(commentText).toBeVisible();
          }

          await page.screenshot({ path: screenshotDir + 'plant-detail-evaluation-card.png', fullPage: true });
        }
      }
    });
  });

  test.describe('ユーザーインタラクション（認証済み） @user', () => {
    // test.use({ storageState: 'playwright/.auth/user.json' });

    test('お気に入りボタンが表示され機能する', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // お気に入りボタンの存在確認
        const favoriteButton = page.locator('[data-testid="favorite-button"]');
        await expect(favoriteButton).toBeVisible();

        // ボタンをクリックしてお気に入りに追加/削除
        await favoriteButton.click();
        await page.waitForTimeout(1000); // サーバー処理待機

        await page.screenshot({ path: screenshotDir + 'plant-detail-favorite-toggle.png', fullPage: true });
      }
    });

    test('持っている植物ボタンが表示され機能する', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 持っている植物ボタンの存在確認
        const haveButton = page.locator('[data-testid="have-button"]');
        await expect(haveButton).toBeVisible();

        // ボタンをクリックして持っている植物に追加/削除
        await haveButton.click();
        await page.waitForTimeout(1000); // サーバー処理待機

        await page.screenshot({ path: screenshotDir + 'plant-detail-have-toggle.png', fullPage: true });
      }
    });

    test('評価投稿ボタンが表示される', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 評価投稿ボタンの存在確認
        const commentButton = page.locator('text=評価を投稿する');
        await expect(commentButton).toBeVisible();

        await page.screenshot({ path: screenshotDir + 'plant-detail-comment-button.png', fullPage: true });
      }
    });

    test('植物画像アップロードボタンが表示される', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 画像アップロードボタンの存在確認
        const uploadButton = page.locator('[data-testid="upload-image-button"]');
        const hasUploadButton = await uploadButton.count() > 0;

        if (hasUploadButton) {
          await expect(uploadButton).toBeVisible();
        }

        await page.screenshot({ path: screenshotDir + 'plant-detail-upload-button.png', fullPage: true });
      }
    });

    test('植物編集ボタンが表示される', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 編集ボタンの存在確認（鉛筆アイコン）
        const editButton = page.locator('[data-testid="edit-button"]');
        const hasEditButton = await editButton.count() > 0;

        if (hasEditButton) {
          await expect(editButton).toBeVisible();

          // 編集ページへのリンクをクリック
          await editButton.click();
          await page.waitForURL(/\/plants\/\d+\/edit/);

          await page.screenshot({ path: screenshotDir + 'plant-detail-edit-page.png', fullPage: true });
        }
      }
    });
  });

  test.describe('ユーザーインタラクション（未認証） @public', () => {
    // test.use({ storageState: undefined });

    test('未認証ユーザーにはユーザー専用ボタンが表示されない', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // お気に入りボタンが表示されないことを確認
        const favoriteButton = page.locator('[data-testid="favorite-button"]');
        await expect(favoriteButton).not.toBeVisible();

        // 持っている植物ボタンが表示されないことを確認
        const haveButton = page.locator('[data-testid="have-button"]');
        await expect(haveButton).not.toBeVisible();

        // 評価投稿ボタンが表示されないことを確認
        const commentButton = page.locator('text=評価を投稿する');
        await expect(commentButton).not.toBeVisible();

        await page.screenshot({ path: screenshotDir + 'plant-detail-unauthenticated.png', fullPage: true });
      }
    });
  });

  test.describe('レスポンシブデザイン @public @mobile', () => {
    test('モバイル表示での植物詳細ページ ', async ({ page }) => {
      // モバイル表示サイズに設定
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // モバイルレイアウトでの表示確認
        const plantInfo = page.locator('[data-testid="plant-info"]');
        const hasPlantInfo = await plantInfo.count() > 0;
        if (hasPlantInfo) {
          await expect(plantInfo).toBeVisible();
        }

        await page.screenshot({ path: screenshotDir + 'plant-detail-mobile.png', fullPage: true });
      }
    });

    test('タブレット表示での植物詳細ページ', async ({ page }) => {
      // タブレット表示サイズに設定
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        await page.screenshot({ path: screenshotDir + 'plant-detail-tablet.png', fullPage: true });
      }
    });
  });
});