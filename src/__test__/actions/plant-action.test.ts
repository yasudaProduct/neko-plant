/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlants, searchPlants, getPlant, addPlant } from '@/actions/plant-action';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { SupabaseClient } from '@supabase/supabase-js';
import { ActionErrorCode } from '@/types/common';

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
    default: {
        plants: {
            count: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        public_users: {
            findFirst: vi.fn(),
        },
        $transaction: vi.fn((callback) => callback(prisma)),
    },
}));

// Supabaseクライアントのモック
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('Plant Actions', () => {
    const mockPlants = [
        {
            id: 1,
            name: 'テスト植物1',
            created_at: new Date(),
            updated_at: new Date(),
            scientific_name: 'テスト植物1',
            family: 'テスト植物1',
            genus: 'テスト植物1',
            species: 'テスト植物1',
            posts: [
                { pet_id: 1 },
                { pet_id: 2 },
            ],
        },
        {
            id: 2,
            name: 'テスト植物2',
            created_at: new Date(),
            updated_at: new Date(),
            scientific_name: null,
            family: null,
            genus: null,
            species: null,
            posts: [
                { pet_id: 1 },
            ],
        },
    ];

    const mockPlantWithImages = {
        id: 1,
        name: 'テスト植物1',
        created_at: new Date(),
        updated_at: new Date(),
        scientific_name: 'テスト植物1',
        family: 'テスト植物1',
        genus: 'テスト植物1',
        species: 'テスト植物1',
        posts: [
            { pet_id: 1, post_images: [{ id: 1, image_url: 'test1.jpg', order: 0 }] },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getPlants', () => {
        it('植物一覧を取得できること', async () => {
            vi.mocked(prisma.plants.count).mockResolvedValue(2);
            vi.mocked(prisma.plants.findMany).mockResolvedValue(mockPlants as any);

            const result = await getPlants('name', 1, 10);

            expect(result).toEqual({
                plants: [
                    {
                        id: 1,
                        name: 'テスト植物1',
                        mainImageUrl: undefined,
                        scientific_name: 'テスト植物1',
                        family: 'テスト植物1',
                        genus: 'テスト植物1',
                        species: 'テスト植物1',
                        coexistenceCatCount: 2,
                        coexistencePostCount: 2,
                    },
                    {
                        id: 2,
                        name: 'テスト植物2',
                        mainImageUrl: undefined,
                        scientific_name: undefined,
                        family: undefined,
                        genus: undefined,
                        species: undefined,
                        coexistenceCatCount: 1,
                        coexistencePostCount: 1,
                    },
                ],
                totalCount: 2,
            });

            expect(prisma.plants.count).toHaveBeenCalled();
        });

        it('空の配列を返すこと', async () => {
            vi.mocked(prisma.plants.count).mockResolvedValue(0);
            vi.mocked(prisma.plants.findMany).mockResolvedValue([]);

            const result = await getPlants('name', 1, 10);

            expect(result).toEqual({
                plants: [],
                totalCount: 0,
            });
        });

        it('ソート順 名前降順', async () => {
            const sortBy = 'name_desc';
            vi.mocked(prisma.plants.count).mockResolvedValue(2);
            vi.mocked(prisma.plants.findMany).mockResolvedValue(mockPlants as any);

            await getPlants(sortBy, 1, 10);

            expect(prisma.plants.findMany).toHaveBeenCalledWith({
                include: {
                    posts: {
                        select: { pet_id: true },
                    },
                },
                orderBy: { name: 'desc' },
                skip: 0,
                take: 10,
                where: {},
            });
        });

        it('ソート順 作成日降順', async () => {
            const sortBy = 'created_at_desc';
            vi.mocked(prisma.plants.count).mockResolvedValue(2);
            vi.mocked(prisma.plants.findMany).mockResolvedValue(mockPlants as any);

            await getPlants(sortBy, 1, 10);

            expect(prisma.plants.findMany).toHaveBeenCalledWith({
                include: {
                    posts: {
                        select: { pet_id: true },
                    },
                },
                orderBy: { created_at: 'desc' },
                skip: 0,
                take: 10,
                where: {},
            });
        });
    });

    describe('searchPlants', () => {
        it('検索クエリで植物を検索できること', async () => {
            vi.mocked(prisma.plants.count).mockResolvedValue(1);
            vi.mocked(prisma.plants.findMany).mockResolvedValue([mockPlants[0]] as any);

            const result = await searchPlants('テスト植物1', 'name', 1, 10);

            expect(result.totalCount).toBe(1);
            expect(result.plants).toHaveLength(1);
            expect(result.plants[0].name).toBe('テスト植物1');
            expect(result.plants[0].coexistenceCatCount).toBe(2);
            expect(result.plants[0].coexistencePostCount).toBe(2);

            expect(prisma.plants.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    name: {
                        contains: 'テスト植物1',
                        mode: 'insensitive',
                    },
                },
            }));
        });

        it('検索結果が0件の場合、空の配列を返すこと', async () => {
            vi.mocked(prisma.plants.count).mockResolvedValue(0);
            vi.mocked(prisma.plants.findMany).mockResolvedValue([]);

            const result = await searchPlants('存在しない植物', 'name', 1, 10);

            expect(result).toEqual({
                plants: [],
                totalCount: 0,
            });
        });
    });

    describe('getPlant', () => {
        it('植物の詳細を取得できること', async () => {
            vi.mocked(prisma.plants.findUnique).mockResolvedValue(mockPlantWithImages as any);

            const result = await getPlant(1);

            expect(result).toEqual({
                id: 1,
                name: 'テスト植物1',
                mainImageUrl: expect.stringContaining('test1.jpg'),
                scientific_name: 'テスト植物1',
                family: 'テスト植物1',
                genus: 'テスト植物1',
                species: 'テスト植物1',
                coexistenceCatCount: 1,
                coexistencePostCount: 1,
            });
        });

        it('存在しない植物の場合はundefinedを返すこと', async () => {
            vi.mocked(prisma.plants.findUnique).mockResolvedValue(null);

            const result = await getPlant(999);

            expect(result).toBeUndefined();
        });
    });

    describe('addPlant', () => {
        const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
        const mockUser = { id: 'test-user-id' };

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('植物の追加が成功すること', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
                storage: {
                    from: vi.fn().mockReturnThis(),
                    upload: vi.fn().mockResolvedValue({ error: null }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.plants.findFirst).mockResolvedValue(null);
            vi.mocked(prisma.plants.create).mockResolvedValue({
                id: 1,
                name: 'テスト植物',
                created_at: new Date(),
                updated_at: new Date(),
                scientific_name: null,
                family: null,
                genus: null,
                species: null,
            });

            const result = await addPlant('テスト植物', mockFile);

            expect(result).toEqual({
                success: true,
                data: {
                    plantId: 1,
                },
            });

            expect(prisma.plants.findFirst).toHaveBeenCalledWith({
                where: { name: 'テスト植物' },
            });
            expect(prisma.plants.create).toHaveBeenCalledWith({
                data: { name: 'テスト植物' },
            });
        });

        it('未ログインの場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);

            const result = await addPlant('テスト植物', mockFile);

            expect(result).toEqual({
                success: false,
                code: ActionErrorCode.AUTH_REQUIRED,
            });
        });

        it('必須項目が不足している場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);

            const result = await addPlant('', mockFile);

            expect(result).toEqual({
                success: false,
                code: ActionErrorCode.VALIDATION_ERROR,
                message: '植物の名前は必須です。',
            });
        });

        it('植物名が重複している場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.plants.findFirst).mockResolvedValue({
                id: 1,
                name: 'テスト植物',
                created_at: new Date(),
                updated_at: new Date(),
                scientific_name: null,
                family: null,
                genus: null,
                species: null,
            });

            const result = await addPlant('テスト植物', mockFile);

            expect(result).toEqual({
                success: false,
                code: ActionErrorCode.ALREADY_EXISTS,
                message: '植物名が重複しています。',
                data: { plantId: 1 },
            });
        });

        it('画像のアップロードに失敗した場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
                storage: {
                    from: vi.fn().mockReturnThis(),
                    upload: vi.fn().mockResolvedValue({ error: new Error('アップロードエラー') }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.plants.findFirst).mockResolvedValue(null);
            vi.mocked(prisma.plants.create).mockResolvedValue({
                id: 1,
                name: 'テスト植物',
                scientific_name: null,
                family: null,
                genus: null,
                species: null,
                created_at: new Date(),
                updated_at: new Date(),
            });

            const result = await addPlant('テスト植物', mockFile);

            expect(result).toEqual({
                success: false,
                code: ActionErrorCode.INTERNAL_SERVER_ERROR,
                message: '植物の追加に失敗しました。',
            });
        });
    });
});
