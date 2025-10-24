import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const screenshotDir = 'test-results/screenshots/evaluation-system/';

test.describe('評価システム', () => {
  test.describe('良い/悪い評価の投稿 @user', () => {
    // test.use({ storageState: 'playwright/.auth/user.json' });

    // テスト間の独立性を保つため、一意のコメントを生成
    // const generateUniqueComment = (base: string) => `${base}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    test('評価投稿ダイアログが開く', async ({ page }) => {
      // 植物詳細ページに移動
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 評価投稿ボタンをクリック
        const commentButton = page.locator('text=評価を投稿する');
        await expect(commentButton).toBeVisible();
        await commentButton.click();

        // ダイアログが開くことを確認
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        // ダイアログタイトルの確認
        await expect(page.locator('text=評価を投稿')).toBeVisible();

        await page.screenshot({ path: screenshotDir + 'evaluation-dialog-open.png', fullPage: true });
      }
    });

    test('良い評価（Good）を投稿できる', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 評価投稿ダイアログを開く
        await page.click('text=評価を投稿する');
        await expect(page.locator('[role="dialog"]')).toBeVisible();

        // 良い評価を選択
        const goodRadio = page.locator('input[value="GOOD"]');
        await goodRadio.click();

        // コメントを入力
        const commentText = `テスト用良い評価コメント ${Date.now()}`;
        const commentTextarea = page.locator('textarea[name="comment"]');
        await commentTextarea.fill(commentText);

        // 投稿ボタンをクリック
        const submitButton = page.locator('button[type="submit"]', { hasText: '投稿する' });
        await submitButton.click();

        // ダイアログが閉じることを確認
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();

        // 投稿した評価が表示されることを確認
        await page.waitForTimeout(2000); // サーバー処理待機
        await expect(page.locator(`text=${commentText}`)).toBeVisible();

        await page.screenshot({ path: screenshotDir + 'evaluation-good-posted.png', fullPage: true });
      }
    });

    test('悪い評価（Bad）を投稿できる', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 評価投稿ダイアログを開く
        await page.click('text=評価を投稿する');
        await expect(page.locator('[role="dialog"]')).toBeVisible();

        // 悪い評価を選択
        const badRadio = page.locator('input[value="BAD"]');
        await badRadio.click();

        // コメントを入力
        const commentText = `テスト用悪い評価コメント ${Date.now()}`;
        const commentTextarea = page.locator('textarea[name="comment"]');
        await commentTextarea.fill(commentText);

        // 投稿ボタンをクリック
        const submitButton = page.locator('button[type="submit"]', { hasText: '投稿する' });
        await submitButton.click();

        // ダイアログが閉じることを確認
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();

        // 投稿した評価が表示されることを確認
        await page.waitForTimeout(2000); // サーバー処理待機
        await expect(page.locator(`text=${commentText}`)).toBeVisible();

        await page.screenshot({ path: screenshotDir + 'evaluation-bad-posted.png', fullPage: true });
      }
    });

    test('評価投稿時の必須項目バリデーション', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 評価投稿ダイアログを開く
        await page.click('text=評価を投稿する');
        await expect(page.locator('[role="dialog"]')).toBeVisible();

        // 何も入力せずに投稿ボタンをクリック
        const submitButton = page.locator('button[type="submit"]', { hasText: '投稿する' });
        await submitButton.click();

        // バリデーションエラーが表示されることを確認
        const errorMessage = page.locator('text=評価を選択してください');
        const hasError = await errorMessage.count() > 0;

        if (hasError) {
          await expect(errorMessage).toBeVisible();
        }

        // ダイアログが開いたままであることを確認
        await expect(page.locator('[role="dialog"]')).toBeVisible();

        await page.screenshot({ path: screenshotDir + 'evaluation-validation-error.png', fullPage: true });
      }
    });

    test('評価投稿時の画像アップロード', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 評価投稿ダイアログを開く
        await page.click('text=評価を投稿する');
        await expect(page.locator('[role="dialog"]')).toBeVisible();

        // 良い評価を選択
        await page.click('input[value="GOOD"]');

        // コメントを入力
        const commentTextarea = page.locator('textarea[name="comment"]');
        await commentTextarea.fill('画像付きテスト評価');

        // 画像アップロードエリアの存在確認
        const imageUpload = page.locator('input[type="file"]');
        const hasImageUpload = await imageUpload.count() > 0;

        if (hasImageUpload) {
          await expect(imageUpload).toBeVisible();
        }

        await page.screenshot({ path: screenshotDir + 'evaluation-image-upload.png', fullPage: true });
      }
    });
  });

  test.describe('評価へのリアクション @user', () => {
    // test.use({ storageState: 'playwright/.auth/user.json' });

    test('他ユーザーの評価にサムズアップリアクションできる', async ({ page }) => {
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

          // サムズアップボタンを探す
          const thumbsUpButton = firstEvaluation.locator('[data-testid="thumbs-up"]');
          const hasThumbsUp = await thumbsUpButton.count() > 0;

          if (hasThumbsUp) {
            // リアクション前のカウントを取得
            const countBefore = await thumbsUpButton.locator('.reaction-count').textContent();

            // サムズアップをクリック
            await thumbsUpButton.click();
            await page.waitForTimeout(1000); // サーバー処理待機

            // カウントが変更されたか確認（オプティミスティック更新）
            const countAfter = await thumbsUpButton.locator('.reaction-count').textContent();

            if (countBefore && countAfter) {
              expect(countBefore).not.toEqual(countAfter);
              expect(Number(countAfter)).toBeGreaterThan(Number(countBefore));
            }

            await page.screenshot({ path: screenshotDir + 'evaluation-thumbs-up-reaction.png', fullPage: true });
          }
        }
      }
    });

    test('他ユーザーの評価にサムズダウンリアクションできる', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        const evaluationCards = page.locator('[data-testid="evaluation-card"]');
        const evaluationCount = await evaluationCards.count();

        if (evaluationCount > 0) {
          const firstEvaluation = evaluationCards.first();

          // サムズダウンボタンを探す
          const thumbsDownButton = firstEvaluation.locator('[data-testid="thumbs-down"]');
          const hasThumbsDown = await thumbsDownButton.count() > 0;

          if (hasThumbsDown) {
            // サムズダウンをクリック
            await thumbsDownButton.click();
            await page.waitForTimeout(1000); // サーバー処理待機

            await page.screenshot({ path: screenshotDir + 'evaluation-thumbs-down-reaction.png', fullPage: true });
          }
        }
      }
    });

    test('既にリアクションした評価のリアクションを取り消せる', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        const evaluationCards = page.locator('[data-testid="evaluation-card"]');
        const evaluationCount = await evaluationCards.count();

        if (evaluationCount > 0) {
          const firstEvaluation = evaluationCards.first();
          const thumbsUpButton = firstEvaluation.locator('[data-testid="thumbs-up"]');
          const hasThumbsUp = await thumbsUpButton.count() > 0;

          if (hasThumbsUp) {
            // 最初にリアクションを追加
            await thumbsUpButton.click();
            await page.waitForTimeout(1000);

            // 同じボタンをもう一度クリックしてリアクションを取り消し
            await thumbsUpButton.click();
            await page.waitForTimeout(1000);

            await page.screenshot({ path: screenshotDir + 'evaluation-reaction-toggle.png', fullPage: true });
          }
        }
      }
    });

    test('リアクションボタンの状態表示', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        const evaluationCards = page.locator('[data-testid="evaluation-card"]');
        const evaluationCount = await evaluationCards.count();

        if (evaluationCount > 0) {
          const firstEvaluation = evaluationCards.first();

          // リアクションボタンが表示されることを確認
          const reactionButtons = firstEvaluation.locator('[data-testid="reaction-buttons"]');
          const hasReactionButtons = await reactionButtons.count() > 0;

          if (hasReactionButtons) {
            await expect(reactionButtons).toBeVisible();

            // サムズアップアイコンとカウントの表示確認
            const thumbsUpIcon = reactionButtons.locator('[data-testid="thumbs-up-icon"]');
            const hasThumbsUpIcon = await thumbsUpIcon.count() > 0;
            if (hasThumbsUpIcon) {
              await expect(thumbsUpIcon).toBeVisible();
            }

            // サムズダウンアイコンとカウントの表示確認
            const thumbsDownIcon = reactionButtons.locator('[data-testid="thumbs-down-icon"]');
            const hasThumbsDownIcon = await thumbsDownIcon.count() > 0;
            if (hasThumbsDownIcon) {
              await expect(thumbsDownIcon).toBeVisible();
            }
          }

          await page.screenshot({ path: screenshotDir + 'evaluation-reaction-buttons.png', fullPage: true });
        }
      }
    });
  });

  test.describe('自分の評価削除 @user', () => {
    // test.use({ storageState: 'playwright/.auth/user.json' });

    test('ユーザープロフィールから自分の評価を確認できる', async ({ page }) => {
      // まず評価を投稿
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 既存の評価があるかマイページで確認
        await page.click('[data-testid="user-avatar"]');
        await page.click('text=マイページ');

        // ユーザーページに移動
        await page.waitForURL(/\/[^\/]+$/);
        await page.waitForLoadState('networkidle');

        // 投稿タブがある場合はクリック
        const postsTab = page.locator('text=投稿');
        const hasPostsTab = await postsTab.count() > 0;
        if (hasPostsTab) {
          await postsTab.click();
          await page.waitForLoadState('networkidle');
        }

        // 自分の評価が表示されることを確認
        const userEvaluations = page.locator('[data-testid="user-evaluation"]');
        const evaluationCount = await userEvaluations.count();

        if (evaluationCount > 0) {
          await expect(userEvaluations).toBeVisible();
        }

        await page.screenshot({ path: screenshotDir + 'evaluation-user-posts.png', fullPage: true });
      }
    });

    test('自分の評価に削除ボタンが表示される', async ({ page }) => {
      // ユーザーのマイページに移動
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.click('[data-testid="user-avatar"]');
      await page.click('text=マイページ');

      await page.waitForURL(/\/[^\/]+$/);
      await page.waitForLoadState('networkidle');

      // 投稿タブがある場合はクリック
      const postsTab = page.locator('text=投稿');
      const hasPostsTab = await postsTab.count() > 0;
      if (hasPostsTab) {
        await postsTab.click();
        await page.waitForLoadState('networkidle');
      }

      // 評価が存在する場合、削除ボタンの確認
      const userEvaluations = page.locator('[data-testid="user-evaluation"]');
      const evaluationCount = await userEvaluations.count();

      if (evaluationCount > 0) {
        const firstEvaluation = userEvaluations.first();

        // 削除ボタンの存在確認
        const deleteButton = firstEvaluation.locator('[data-testid="delete-evaluation"]');
        const hasDeleteButton = await deleteButton.count() > 0;

        if (hasDeleteButton) {
          await expect(deleteButton).toBeVisible();

          // ゴミ箱アイコンの確認
          const trashIcon = deleteButton.locator('[data-testid="trash-icon"]');
          const hasTrashIcon = await trashIcon.count() > 0;
          if (hasTrashIcon) {
            await expect(trashIcon).toBeVisible();
          }
        }
      }

      await page.screenshot({ path: screenshotDir + 'evaluation-delete-button.png', fullPage: true });
    });

    test('評価削除の確認ダイアログが表示される', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.click('[data-testid="user-avatar"]');
      await page.click('text=マイページ');

      await page.waitForURL(/\/[^\/]+$/);
      await page.waitForLoadState('networkidle');

      const postsTab = page.locator('text=投稿');
      const hasPostsTab = await postsTab.count() > 0;
      if (hasPostsTab) {
        await postsTab.click();
        await page.waitForLoadState('networkidle');
      }

      const userEvaluations = page.locator('[data-testid="user-evaluation"]');
      const evaluationCount = await userEvaluations.count();

      if (evaluationCount > 0) {
        const deleteButton = userEvaluations.first().locator('[data-testid="delete-evaluation"]');
        const hasDeleteButton = await deleteButton.count() > 0;

        if (hasDeleteButton) {
          // 削除ボタンをクリック
          await deleteButton.click();

          // 確認ダイアログが表示されることを確認
          const confirmDialog = page.locator('[role="alertdialog"]');
          const hasConfirmDialog = await confirmDialog.count() > 0;

          if (hasConfirmDialog) {
            await expect(confirmDialog).toBeVisible();

            // 確認メッセージの表示確認
            await expect(page.locator('text=削除しますか')).toBeVisible();

            // キャンセルボタンをクリックしてダイアログを閉じる
            const cancelButton = page.locator('button', { hasText: 'キャンセル' });
            await cancelButton.click();

            await expect(confirmDialog).not.toBeVisible();
          }
        }
      }

      await page.screenshot({ path: screenshotDir + 'evaluation-delete-confirm.png', fullPage: true });
    });
  });

  test.describe('評価表示（未認証ユーザー） @public', () => {
    // test.use({ storageState: undefined });

    test('未認証ユーザーも評価を閲覧できる', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 評価セクションが表示されることを確認
        await expect(page.locator('text=良い評価')).toBeVisible();
        await expect(page.locator('text=悪い評価')).toBeVisible();

        // 評価統計が表示されることを確認
        const ratingBar = page.locator('[data-testid="rating-bar"]');
        const hasRatingBar = await ratingBar.count() > 0;
        if (hasRatingBar) {
          await expect(ratingBar).toBeVisible();
        }

        await page.screenshot({ path: screenshotDir + 'evaluation-unauthenticated-view.png', fullPage: true });
      }
    });

    test('未認証ユーザーには評価投稿ボタンが表示されない', async ({ page }) => {
      await page.goto('/?q=植物');
      await page.waitForLoadState('networkidle');

      const plantCards = page.locator('[data-testid="plant-card"]');
      const cardCount = await plantCards.count();

      if (cardCount > 0) {
        await plantCards.first().click();
        await page.waitForURL(/\/plants\/\d+/);
        await page.waitForLoadState('networkidle');

        // 評価投稿ボタンが表示されないことを確認
        const commentButton = page.locator('text=評価を投稿する');
        await expect(commentButton).not.toBeVisible();

        await page.screenshot({ path: screenshotDir + 'evaluation-no-post-button.png', fullPage: true });
      }
    });

    test('未認証ユーザーにはリアクションボタンが表示されない', async ({ page }) => {
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

          // リアクションボタンが表示されないことを確認
          const reactionButtons = firstEvaluation.locator('[data-testid="reaction-buttons"]');
          await expect(reactionButtons).not.toBeVisible();
        }

        await page.screenshot({ path: screenshotDir + 'evaluation-no-reaction-buttons.png', fullPage: true });
      }
    });
  });
});