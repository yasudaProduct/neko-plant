import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { FullConfig } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

async function maybeSeedData() {
    // if (process.env.E2E_RESET_DB !== '1') return;
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Refusing to seed in production environment');
    }
    // seed スクリプトを tsx 経由で実行（CJS/ESM 差異を避ける）
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const projectRoot = path.resolve(__dirname, '..');
    await execFileAsync(
        npx,
        ['-y', 'tsx', 'scripts/e2e-seed.ts'],
        { env: process.env, cwd: projectRoot }
    );
}

export default async function globalSetup(config: FullConfig) {
    const baseURL = config.projects[0]?.use?.baseURL as string | undefined;
    if (!baseURL) throw new Error('baseURL is required for globalSetup');

    // テストデータのシード
    await maybeSeedData();

    // ページコンパイルのウォームアップ（devサーバーの初回コンパイルを事前に実行）
    const pagesToWarmUp = ['/', '/signin', '/signin/dev', '/news', '/terms', '/privacy'];
    console.log('Warming up dev server pages...');
    for (const pagePath of pagesToWarmUp) {
        try {
            await fetch(`${baseURL}${pagePath}`);
        } catch {
            // サーバーがまだ起動中の場合は無視
        }
    }
    console.log('Warmup complete.');
}