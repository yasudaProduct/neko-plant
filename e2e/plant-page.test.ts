import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import prisma from '../src/lib/prisma';

/**
 * 主要フロー M3（植物と猫の共存を調べる）
 * ポジティブリスト方式: 共存実績の可視化と、投稿がない植物の「情報がない」表現。
 */

const screenshotDir = 'test-results/screenshots/plant-page/';

test.describe('植物ページ @public', () => {
  test('共存実績のある植物: サマリー・分布・猫・投稿ギャラリーが表示される', async ({ page }) => {
    // モンステラ = 3匹・3投稿（シード最多）
    const plant = await prisma.plants.findFirst({ where: { name: 'モンステラ' } });
    if (!plant) throw new Error('モンステラが見つかりません');

    await page.goto(`/plants/${plant.id}`);
    await page.waitForLoadState('networkidle');

    // ヘッダー: 名前と共存実績ラベル（危険と断定しないポジティブ表現）
    await expect(page.getByTestId('plant-name')).toHaveText('モンステラ');
    await expect(page.getByTestId('coexist-label')).toContainText('暮らし');

    // カタログ情報
    await expect(page.getByRole('heading', { name: 'カタログ情報' })).toBeVisible();
    await expect(page.getByText('ユニークな猫', { exact: true })).toBeVisible();

    // 共存実績の分布（自分自身が並ぶ）
    await expect(page.getByRole('heading', { name: '共存実績の分布' })).toBeVisible();

    // 一緒に暮らしている猫（たま・ミケ・クロ）
    await expect(page.getByRole('heading', { name: '一緒に暮らしている猫' })).toBeVisible();

    // みんなの投稿ギャラリー
    await expect(page.getByRole('heading', { name: 'みんなの投稿' })).toBeVisible();
    expect(await page.getByTestId('post-tile').count()).toBeGreaterThanOrEqual(3);

    await page.screenshot({ path: screenshotDir + 'plant-with-posts.png', fullPage: true });
  });

  test('ギャラリーの投稿から投稿詳細へ遷移できる', async ({ page }) => {
    const plant = await prisma.plants.findFirst({ where: { name: 'モンステラ' } });
    if (!plant) throw new Error('モンステラが見つかりません');

    await page.goto(`/plants/${plant.id}`);
    await page.waitForLoadState('networkidle');

    await page.getByTestId('post-tile').first().click();
    await expect(page).toHaveURL(/\/posts\/\d+/);
  });

  test('投稿がない植物: 断定しない注意喚起が表示される', async ({ page }) => {
    const plant = await prisma.plants.findFirst({ where: { name: 'ネコマダラ' } });
    if (!plant) throw new Error('ネコマダラが見つかりません');

    await page.goto(`/plants/${plant.id}`);
    await page.waitForLoadState('networkidle');

    // doc §5.2: 「危険」と断定せず「情報がない」と表現する
    await expect(page.getByTestId('coexist-label')).toHaveText('猫との共存情報がありません');
    await expect(
      page.locator('text=猫との共存について、コミュニティからの情報がまだありません')
    ).toBeVisible();

    // 投稿ギャラリーは空
    await expect(page.getByTestId('post-tile')).toHaveCount(0);

    await page.screenshot({ path: screenshotDir + 'plant-noinfo.png', fullPage: true });
  });
});
