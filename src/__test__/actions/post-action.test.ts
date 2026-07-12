/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createPost,
    deletePost,
    getFeedPosts,
    getPlantCoexistence,
    getSiteStats,
    togglePostLike,
} from '@/actions/post-action';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { SupabaseClient } from '@supabase/supabase-js';
import { ActionErrorCode } from '@/types/common';

// Prismaのモック
vi.mock('@/lib/prisma', () => {
    const prisma = {
        posts: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            count: vi.fn(),
            create: vi.fn(),
            delete: vi.fn(),
        },
        post_images: {
            createMany: vi.fn(),
        },
        post_plants: {
            createMany: vi.fn(),
        },
        post_pets: {
            createMany: vi.fn(),
        },
        post_likes: {
            findUnique: vi.fn(),
            create: vi.fn(),
            delete: vi.fn(),
            count: vi.fn(),
        },
        plants: {
            count: vi.fn(),
        },
        pets: {
            count: vi.fn(),
        },
        public_users: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
        $transaction: vi.fn().mockImplementation(callback => callback(prisma)),
    };
    return { default: prisma };
});

// Supabaseクライアントのモック
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

function mockSupabase(user: { id: string } | null, uploadError: unknown = null) {
    const upload = vi.fn().mockResolvedValue({ error: uploadError });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const client = {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user } }),
        },
        storage: {
            from: vi.fn().mockReturnValue({ upload, remove }),
        },
    };
    vi.mocked(createClient).mockResolvedValue(client as unknown as SupabaseClient);
    return { upload, remove };
}

describe('Post Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getFeedPosts', () => {
        it('投稿をPost型にマッピングして返す', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findUnique).mockResolvedValue(mockPublicUser as any);
            vi.mocked(prisma.posts.count).mockResolvedValue(1);
            vi.mocked(prisma.posts.findMany).mockResolvedValue([
                {
                    id: 10,
                    comment: 'テスト投稿',
                    created_at: new Date('2026-07-01'),
                    users: { id: 1, alias_id: 'testuser', name: 'テストユーザー', image: null },
                    post_plants: [
                        { plant_id: 5, plants: { id: 5, name: 'パキラ' } },
                    ],
                    post_pets: [
                        { pets: { id: 3, name: 'ミケ', image: null, neko: { id: 1, name: '雑種' } } },
                    ],
                    post_images: [{ image_url: 'auth/10/1_a.png' }],
                    post_likes: [{ id: 100 }],
                    _count: { post_likes: 2 },
                },
            ] as any);
            vi.mocked(prisma.$queryRaw).mockResolvedValue([
                { plant_id: 5, cat_count: BigInt(4) },
            ] as any);

            const result = await getFeedPosts(1, 10);

            expect(result.totalCount).toBe(1);
            expect(result.posts).toHaveLength(1);

            const post = result.posts[0];
            expect(post.id).toBe(10);
            expect(post.imageUrls[0]).toContain('/storage/v1/object/public/posts/auth/10/1_a.png');
            expect(post.plants).toEqual([{ id: 5, name: 'パキラ', catCount: 4 }]);
            expect(post.pets[0].name).toBe('ミケ');
            expect(post.likeCount).toBe(2);
            expect(post.likedByMe).toBe(true);
            expect(post.isMine).toBe(true);
        });
    });

    describe('getPlantCoexistence', () => {
        it('投稿数とユニーク猫数を返す', async () => {
            vi.mocked(prisma.$queryRaw).mockResolvedValue([
                { post_count: BigInt(12), cat_count: BigInt(7) },
            ] as any);

            const result = await getPlantCoexistence(5);

            expect(result).toEqual({ postCount: 12, catCount: 7 });
        });
    });

    describe('getSiteStats', () => {
        it('サイト全体の集計を返す', async () => {
            vi.mocked(prisma.posts.count).mockResolvedValue(30);
            vi.mocked(prisma.$queryRaw).mockResolvedValue([{ cat_count: BigInt(9) }] as any);
            vi.mocked(prisma.plants.count).mockResolvedValue(15);

            const result = await getSiteStats();

            expect(result).toEqual({ postCount: 30, catCount: 9, plantCount: 15 });
        });
    });

    describe('createPost', () => {
        const validPath = `${mockUser.id}/e2c1a6ab-0000-0000-0000-000000000000/1_post_20260712.jpg`;
        const validInput = {
            plantIds: [5],
            petIds: [3],
            comment: 'テスト',
            imagePaths: [validPath],
        };

        it('未ログインの場合はAUTH_REQUIRED', async () => {
            mockSupabase(null);

            const result = await createPost(validInput);

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.AUTH_REQUIRED);
        });

        it('画像がない場合はVALIDATION_ERROR', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findUnique).mockResolvedValue(mockPublicUser as any);

            const result = await createPost({ ...validInput, imagePaths: [] });

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.VALIDATION_ERROR);
        });

        it('画像が4枚以上の場合はVALIDATION_ERROR', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findUnique).mockResolvedValue(mockPublicUser as any);

            const result = await createPost({
                ...validInput,
                imagePaths: [1, 2, 3, 4].map((i) => `${mockUser.id}/uuid/${i}_post.jpg`),
            });

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.VALIDATION_ERROR);
        });

        it('他人のフォルダのパスはVALIDATION_ERROR', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findUnique).mockResolvedValue(mockPublicUser as any);

            const result = await createPost({
                ...validInput,
                imagePaths: ['other-auth-id/uuid/1_post.jpg'],
            });

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.VALIDATION_ERROR);
        });

        it('パストラバーサルを含むパスはVALIDATION_ERROR', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findUnique).mockResolvedValue(mockPublicUser as any);

            const result = await createPost({
                ...validInput,
                imagePaths: [`${mockUser.id}/../other/1_post.jpg`],
            });

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.VALIDATION_ERROR);
        });

        it('不正な文字を含むパスはVALIDATION_ERROR', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findUnique).mockResolvedValue(mockPublicUser as any);

            const result = await createPost({
                ...validInput,
                imagePaths: [`${mockUser.id}/uuid/1_post @.jpg`],
            });

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.VALIDATION_ERROR);
        });

        it('重複するパスはVALIDATION_ERROR', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findUnique).mockResolvedValue(mockPublicUser as any);

            const result = await createPost({
                ...validInput,
                imagePaths: [validPath, validPath],
            });

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.VALIDATION_ERROR);
        });

        it('植物が選択されていない場合はVALIDATION_ERROR', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findUnique).mockResolvedValue(mockPublicUser as any);

            const result = await createPost({ ...validInput, plantIds: [] });

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.VALIDATION_ERROR);
        });

        it('猫が選択されていない場合はVALIDATION_ERROR', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findUnique).mockResolvedValue(mockPublicUser as any);

            const result = await createPost({ ...validInput, petIds: [] });

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.VALIDATION_ERROR);
        });

        it('他人の猫を指定した場合はNOT_FOUND', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findUnique).mockResolvedValue(mockPublicUser as any);
            vi.mocked(prisma.plants.count).mockResolvedValue(1);
            vi.mocked(prisma.pets.count).mockResolvedValue(0); // 自分の猫ではない

            const result = await createPost(validInput);

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.NOT_FOUND);
        });

        it('正常系: 投稿・タグ・画像が作成される', async () => {
            const { upload } = mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findUnique).mockResolvedValue(mockPublicUser as any);
            vi.mocked(prisma.plants.count).mockResolvedValue(1);
            vi.mocked(prisma.pets.count).mockResolvedValue(1);
            vi.mocked(prisma.posts.create).mockResolvedValue({ id: 99 } as any);

            const result = await createPost(validInput);

            expect(result.success).toBe(true);
            if (result.success) expect(result.data?.postId).toBe(99);

            expect(prisma.posts.create).toHaveBeenCalledWith({
                data: { user_id: 1, comment: 'テスト' },
            });
            expect(prisma.post_plants.createMany).toHaveBeenCalledWith({
                data: [{ post_id: 99, plant_id: 5 }],
            });
            expect(prisma.post_pets.createMany).toHaveBeenCalledWith({
                data: [{ post_id: 99, pet_id: 3 }],
            });
            expect(prisma.post_images.createMany).toHaveBeenCalledWith({
                data: [{ post_id: 99, image_url: validPath, order: 0 }],
            });
            // アップロードはクライアントが直接行うため、サーバーからは呼ばれない
            expect(upload).not.toHaveBeenCalled();
        });
    });

    describe('deletePost', () => {
        it('本人以外(非管理者)はNOT_FOUND', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findUnique).mockResolvedValue(mockPublicUser as any);
            vi.mocked(prisma.posts.findUnique).mockResolvedValue({
                id: 10,
                user_id: 2, // 他人の投稿
                post_images: [],
                post_plants: [],
                users: { alias_id: 'other' },
            } as any);

            const result = await deletePost(10);

            expect(result.success).toBe(false);
            expect(prisma.posts.delete).not.toHaveBeenCalled();
        });

        it('本人の投稿は削除できる', async () => {
            const { remove } = mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findUnique).mockResolvedValue(mockPublicUser as any);
            vi.mocked(prisma.posts.findUnique).mockResolvedValue({
                id: 10,
                user_id: 1,
                post_images: [{ image_url: 'auth/10/1_a.png' }],
                post_plants: [{ plant_id: 5 }],
                users: { alias_id: 'testuser' },
            } as any);

            const result = await deletePost(10);

            expect(result.success).toBe(true);
            expect(prisma.posts.delete).toHaveBeenCalledWith({ where: { id: 10 } });
            expect(remove).toHaveBeenCalledWith(['auth/10/1_a.png']);
        });

        it('管理者は他人の投稿も削除できる', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findUnique).mockResolvedValue({
                ...mockPublicUser,
                role: 'admin',
            } as any);
            vi.mocked(prisma.posts.findUnique).mockResolvedValue({
                id: 10,
                user_id: 2,
                post_images: [],
                post_plants: [],
                users: { alias_id: 'other' },
            } as any);

            const result = await deletePost(10);

            expect(result.success).toBe(true);
            expect(prisma.posts.delete).toHaveBeenCalled();
        });
    });

    describe('togglePostLike', () => {
        it('未ログインの場合はAUTH_REQUIRED', async () => {
            mockSupabase(null);

            const result = await togglePostLike(10);

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.AUTH_REQUIRED);
        });

        it('未いいねの場合はいいねを作成する', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findUnique).mockResolvedValue(mockPublicUser as any);
            vi.mocked(prisma.posts.findUnique).mockResolvedValue({ id: 10 } as any);
            vi.mocked(prisma.post_likes.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.post_likes.count).mockResolvedValue(3);

            const result = await togglePostLike(10);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual({ liked: true, likeCount: 3 });
            }
            expect(prisma.post_likes.create).toHaveBeenCalledWith({
                data: { post_id: 10, user_id: 1 },
            });
        });

        it('いいね済みの場合は削除する', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.public_users.findUnique).mockResolvedValue(mockPublicUser as any);
            vi.mocked(prisma.posts.findUnique).mockResolvedValue({ id: 10 } as any);
            vi.mocked(prisma.post_likes.findUnique).mockResolvedValue({ id: 55 } as any);
            vi.mocked(prisma.post_likes.count).mockResolvedValue(2);

            const result = await togglePostLike(10);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual({ liked: false, likeCount: 2 });
            }
            expect(prisma.post_likes.delete).toHaveBeenCalledWith({ where: { id: 55 } });
        });
    });
});
