/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getUserPlantCollection,
    getUserProfile,
    getUserStats,
    updateUser,
    updateUserImage,
    updatePet,
} from '@/actions/user-action';
import { ActionErrorCode } from '@/types/common';
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
            findUnique: vi.fn(),
            update: vi.fn(),
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
        it('aliasIdでプロフィールを取得する (auth_idは返さない)', async () => {
            mockSupabase(null);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser as any);

            const profile = await getUserProfile('testuser');

            expect(profile).toBeDefined();
            expect(profile?.aliasId).toBe('testuser');
            expect(profile?.name).toBe('テストユーザー');
            expect(profile?.isSelf).toBe(false);
            expect(profile).not.toHaveProperty('authId');
        });

        it('本人が閲覧した場合はisSelf=true', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser as any);

            const profile = await getUserProfile('testuser');

            expect(profile?.isSelf).toBe(true);
        });

        it('存在しない場合はundefined', async () => {
            mockSupabase(null);
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

        it('別ユーザーが使用中のaliasIdはエラー', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findFirst)
                .mockResolvedValueOnce(mockPublicUser as any) // 自分の取得
                .mockResolvedValueOnce({ id: 2 } as any);     // 重複チェック: 他人がヒット

            await expect(updateUser('テスト', 'takenalias')).rejects.toThrow('既に使用されています');
            expect(prisma.public_users.update).not.toHaveBeenCalled();
        });

        it('予約語のaliasIdはエラー', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser as any);

            await expect(updateUser('テスト', 'admin')).rejects.toThrow('使用できません');
            expect(prisma.public_users.update).not.toHaveBeenCalled();
        });

        it('正常系: ユーザー情報を更新する', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findFirst)
                .mockResolvedValueOnce(mockPublicUser as any) // 自分の取得
                .mockResolvedValueOnce(null);                 // 重複チェック: 空き

            await updateUser('新しい名前', 'newalias');

            expect(prisma.public_users.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { name: '新しい名前', alias_id: 'newalias' },
            });
        });
    });

    describe('updateUserImage', () => {
        it('他人のフォルダのパスはエラー', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser as any);

            await expect(updateUserImage('other-auth-id/profile_x.jpg')).rejects.toThrow('画像の指定が不正です');
            expect(prisma.public_users.update).not.toHaveBeenCalled();
        });

        it('パストラバーサルを含むパスはエラー', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser as any);

            await expect(updateUserImage(`${mockUser.id}/../other/profile_x.jpg`)).rejects.toThrow('画像の指定が不正です');
        });

        it('正常系: 自分のフォルダのパスでプロフィール画像を更新する', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser as any);

            const imagePath = `${mockUser.id}/profile_20260712.jpg`;
            await updateUserImage(imagePath);

            expect(prisma.public_users.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { image: imagePath },
            });
        });
    });

    describe('updatePet', () => {
        it('他人のフォルダのパスはVALIDATION_ERROR', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser as any);

            const result = await updatePet(3, 'ミケ', 1, 'other-auth-id/pet_x.jpg');

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.VALIDATION_ERROR);
            expect(prisma.pets.update).not.toHaveBeenCalled();
        });

        it('正常系: 画像パスありで飼い猫を更新する', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser as any);
            vi.mocked(prisma.pets.findUnique).mockResolvedValue({ id: 3, user_id: 1 } as any);

            const imagePath = `${mockUser.id}/pet_uuid.jpg`;
            const result = await updatePet(3, 'ミケ', 1, imagePath);

            expect(result.success).toBe(true);
            expect(prisma.pets.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 3, user_id: 1 },
                    data: expect.objectContaining({ image: imagePath }),
                }),
            );
        });

        it('正常系: 画像パスなしなら画像は更新しない', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser as any);
            vi.mocked(prisma.pets.findUnique).mockResolvedValue({ id: 3, user_id: 1 } as any);

            const result = await updatePet(3, 'ミケ', 1);

            expect(result.success).toBe(true);
            const updateArg = vi.mocked(prisma.pets.update).mock.calls[0][0];
            expect(updateArg.data).not.toHaveProperty('image');
        });
    });
});
