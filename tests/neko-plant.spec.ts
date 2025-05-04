import { test, expect } from '@playwright/test';

const screenshotDir = 'test-results/screenshots/';

test.describe('画面遷移', () => {
    test('ログイン画面へ遷移', async ({ page }) => {
        await page.goto('/');
        await page.screenshot({ path: screenshotDir + 'top.png' });

        await page.getByRole('link', { name: 'ログイン' }).click();
        // 待機
        await page.waitForTimeout(10000);

        // スクショを取得
        await page.screenshot({ path: screenshotDir + 'login.png' });

        await expect(page.getByRole('button', { name: 'Googleでログイン' })).toBeVisible();
    });

    test('植物ページへ遷移', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: 'ペペロミア ペペロミア ペペロミア 0 0 レビュー 0件' }).click();
        await expect(page.getByText('ペペロミア学名： 学名TEST')).toBeVisible();
        await expect(page.getByText('科： 属TEST')).toBeVisible();
        await expect(page.getByText('属： 種TEST')).toBeVisible();
        await expect(page.getByText('種： 種TEST')).toBeVisible();

        // スクショを取得
        await page.screenshot({ path: screenshotDir + 'plant.png' });
    });
});
