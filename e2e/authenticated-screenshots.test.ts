import { test } from '@playwright/test'
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const screenshotDir = 'test-results/screenshots/';

test.describe('認証済みユーザーのスクリーンショット', () => {
    test('ログイン後のトップ画面', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await page.screenshot({ path: screenshotDir + 'top-authenticated.png', fullPage: true });
    });
});