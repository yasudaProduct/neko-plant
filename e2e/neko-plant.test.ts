import { test } from '@playwright/test'
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });;
import prisma from '../src/lib/prisma';


const screenshotDir = 'test-results/screenshots/';

test.beforeEach(async ({ }) => {

});


test.describe('スクリーンショットを取得', () => {
    test('トップ画面', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await page.screenshot({ path: screenshotDir + 'top.png', fullPage: true });
    });

    test('ログイン画面', async ({ page }) => {
        await page.goto('/signin', { waitUntil: 'networkidle' });
        await page.screenshot({ path: screenshotDir + 'signin.png', fullPage: true });
    });

    test.describe('植物ページ', () => {
        test('植物ページ', async ({ page }) => {
            const plant = await prisma.plants.findFirst({
                where: {
                    name: 'ネコマダラ',
                },
            });
            if (!plant) {
                throw new Error('plant not found');
            }
            await page.goto(`/plant/${plant.id}`, { waitUntil: 'networkidle' });
            await page.screenshot({ path: screenshotDir + `plant-${plant.id}.png`, fullPage: true });
        });

    });

    test('問い合わせ画面', async ({ page }) => {
        await page.goto('/contact', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: screenshotDir + 'contact.png', fullPage: true });
    });

    test('お知らせ画面', async ({ page }) => {
        await page.goto('/news', { waitUntil: 'networkidle' });
        await page.screenshot({ path: screenshotDir + 'news.png', fullPage: true });
    });

    test('利用規約画面', async ({ page }) => {
        await page.goto('/terms', { waitUntil: 'networkidle' });
        await page.screenshot({ path: screenshotDir + 'terms.png', fullPage: true });
    });

    test('プライバシーポリシー画面', async ({ page }) => {
        await page.goto('/privacy', { waitUntil: 'networkidle' });
        await page.screenshot({ path: screenshotDir + 'privacy.png', fullPage: true });
    });

});