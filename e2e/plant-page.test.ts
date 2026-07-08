import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import prisma from '../src/lib/prisma';

const screenshotDir = 'test-results/screenshots/plant-page/';

test.describe('植物ページ @public', () => {
  test('共存実績のある植物: サマリーとギャラリーが表示される', async ({ page }) => {
    const plant = await prisma.plants.findFirst({ where: { name: 'パキラ' } });
    if (!plant) throw new Error('パキラが見つかりません');

    await page.goto(`/plants/${plant.id}`);
    await page.waitForLoadState('networkidle');

    // 植物名と共存実績ラベル
    await expect(page.getByTestId('plant-name')).toHaveText('パキラ');
    await expect(page.getByTestId('coexist-label')).toContainText('暮らし');

    // カタログ情報
    await expect(page.locator('text=カタログ情報')).toBeVisible();
    await expect(page.getByText('ユニークな猫', { exact: true })).toBeVisible();

    // 共存実績の分布
    await expect(page.locator('text=共存実績の分布')).toBeVisible();

    // 一緒に暮らしている猫 (シード: ミケ・クロ)
    await expect(page.locator('text=一緒に暮らしている猫')).toBeVisible();

    // みんなの投稿
    await expect(page.locator('text=みんなの投稿')).toBeVisible();
    expect(await page.getByTestId('post-tile').count()).toBeGreaterThanOrEqual(1);

    await page.screenshot({ path: screenshotDir + 'plant-with-posts.png', fullPage: true });
  });

  test('投稿がない植物: 注意喚起が表示される', async ({ page }) => {
    const plant = await prisma.plants.findFirst({ where: { name: 'ネコマダラ' } });
    if (!plant) throw new Error('ネコマダラが見つかりません');

    await page.goto(`/plants/${plant.id}`);
    await page.waitForLoadState('networkidle');

    // 「危険」と断定しない注意喚起 (doc §5.2)
    await expect(page.getByTestId('coexist-label')).toHaveText('猫との共存情報がありません');
    await expect(
      page.locator('text=猫との共存について、コミュニティからの情報がまだありません')
    ).toBeVisible();

    await page.screenshot({ path: screenshotDir + 'plant-noinfo.png', fullPage: true });
  });
});
