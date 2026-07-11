/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getUserPlantCollection,
    getUserProfile,
    getUserStats,
    updateUser,
} from '@/actions/user-action';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { SupabaseClient } from '@supabase/supabase-js';

// Prismaのモック
vi.mock('@/lib/prisma', () => {
    const prisma = {
        public_users: {
            findFirst: vi.fn(),
            update: vi.fn(),
        },
        plants: {
            findMany: vi.fn(),
        },
        posts: {
            count: vi.fn(),
        },
        pets: {
            count: vi.fn(),
        },
        post_plants: {
            findMany: vi.fn(),
        },
        $queryRaw: vi.fn(),
    };
    return { default: prisma };
});

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

const mockUser = { id: 'test-auth-id' };
const mockPublicUser = {
    id: 1,
    auth_id: mockUser.id,
    alias_id: 'testuser',
    name: 'テストユーザー',
    image: null,
    role: 'user',
    created_at: new Date(),
};

function mockSupabase(user: { id: string } | null) {
    const client = {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user } }),
        },
    };
    vi.mocked(createClient).mockResolvedValue(client as unknown as SupabaseClient);
}

describe('User Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getUserProfile', () => {
        it('aliasIdでプロフィールを取得する', async () => {
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser as any);

            const profile = await getUserProfile('testuser');

            expect(profile).toBeDefined();
            expect(profile?.aliasId).toBe('testuser');
            expect(profile?.name).toBe('テストユーザー');
        });

        it('存在しない場合はundefined', async () => {
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(null);

            const profile = await getUserProfile('unknown');

            expect(profile).toBeUndefined();
        });
    });

    describe('getUserPlantCollection', () => {
        it('投稿から植物コレクションを集計する', async () => {
            vi.mocked(prisma.$queryRaw).mockResolvedValue([
                {
                    plant_id: 5,
                    post_count: BigInt(3),
                    cat_count: BigInt(2),
                    latest: new Date('2026-07-01'),
                },
            ] as any);
            vi.mocked(prisma.plants.findMany).mockResolvedValue([
                {
                    id: 5,
                    name: 'パキラ',
                    post_plants: [
                        { posts: { post_images: [{ image_url: 'auth/1/1_a.png' }] } },
                    ],
                },
            ] as any);

            const collection = await getUserPlantCollection(1);

            expect(collection).toHaveLength(1);
            expect(collection[0].plantId).toBe(5);
            expect(collection[0].plantName).toBe('パキラ');
            expect(collection[0].postCount).toBe(3);
            expect(collection[0].catCount).toBe(2);
            expect(collection[0].mainImageUrl).toContain('/storage/v1/object/public/posts/auth/1/1_a.png');
        });

        it('投稿がない場合は空配列', async () => {
            vi.mocked(prisma.$queryRaw).mockResolvedValue([] as any);

            const collection = await getUserPlantCollection(1);

            expect(collection).toEqual([]);
            expect(prisma.plants.findMany).not.toHaveBeenCalled();
        });
    });

    describe('getUserStats', () => {
        it('投稿数・猫数・植物数を返す', async () => {
            vi.mocked(prisma.posts.count).mockResolvedValue(4);
            vi.mocked(prisma.pets.count).mockResolvedValue(2);
            vi.mocked(prisma.post_plants.findMany).mockResolvedValue([
                { plant_id: 5 },
                { plant_id: 6 },
                { plant_id: 7 },
            ] as any);

            const stats = await getUserStats(1);

            expect(stats).toEqual({ postCount: 4, petCount: 2, plantCount: 3 });
        });
    });

    describe('updateUser', () => {
        it('名前が21文字以上の場合はエラー', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser as any);

            await expect(updateUser('あ'.repeat(21), 'testuser')).rejects.toThrow();
        });

        it('aliasIdが英字以外を含む場合はエラー', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser as any);

            await expect(updateUser('テスト', 'test123')).rejects.toThrow();
        });

        it('正常系: ユーザー情報を更新する', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser as any);

            await updateUser('新しい名前', 'newalias');

            expect(prisma.public_users.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { name: '新しい名前', alias_id: 'newalias' },
            });
        });
    });
});
