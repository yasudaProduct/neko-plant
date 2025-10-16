import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/__test__/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
        },
        // CI 上で .env.local が無い場合でも安定した値を使う
        // dotenv の結果をベースに、必要キーが未設定ならデフォルトを補完
        env: (() => {
            const parsed = dotenv.config({ path: ".env.local" }).parsed || {};
            return {
                ...parsed,
                NEXT_PUBLIC_SUPABASE_URL: parsed.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
                NEXT_PUBLIC_SUPABASE_ANON_KEY: parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key',
                NODE_ENV: 'test',
            };
        })(),
        include: ['src/__test__/**/*.{test,spec}.{ts,tsx}'],
        exclude: ['e2e/**', 'playwright/**', 'playwright-report/**'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
}); 