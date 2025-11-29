/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlants, searchPlants, getPlant, addPlant, addFavorite, deleteFavorite, addHave, deleteHave } from '@/actions/plant-action';
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
        plant_images: {
            create: vi.fn(),
        },
        plant_favorites: {
            create: vi.fn(),
            delete: vi.fn(),
            findFirst: vi.fn(),
            deleteMany: vi.fn(),
        },
        plant_have: {
            create: vi.fn(),
            delete: vi.fn(),
            findFirst: vi.fn(),
            deleteMany: vi.fn(),
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
            plant_images: [
                {
                    id: 1,
                    image_url: 'test1.jpg',
                    order: 1,
                },
            ],
        },
        {
            id: 2,
            name: 'テスト植物2',
            image_src: 'test2.jpg',
            created_at: new Date(),
            updated_at: new Date(),
            scientific_name: null,
            family: null,
            genus: null,
            species: null,
            plant_images: [
                {
                    id: 2,
                    image_url: 'test2.jpg',
                    order: 1,
                },
            ],
        },
    ];

    const mockPlant = {
        id: 1,
        name: 'テスト植物1',
        image_src: 'test1.jpg',
        created_at: new Date(),
        updated_at: new Date(),
        scientific_name: 'テスト植物1',
        family: 'テスト植物1',
        genus: 'テスト植物1',
        species: 'テスト植物1',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getPlants', () => {
        it('植物一覧を取得できること', async () => {
            vi.mocked(prisma.plants.count).mockResolvedValue(2);
            vi.mocked(prisma.plants.findMany).mockResolvedValue(mockPlants);

            const result = await getPlants('name', 1, 10);

            expect(result).toEqual({
                plants: [
                    {
                        id: 1,
                        name: 'テスト植物1',
                        mainImageUrl: 'http://localhost:54321/storage/v1/object/public/plants/test1.jpg',
                        isFavorite: false,
                        isHave: false,
                    },
                    {
                        id: 2,
                        name: 'テスト植物2',
                        mainImageUrl: 'http://localhost:54321/storage/v1/object/public/plants/test2.jpg',
                        isFavorite: false,
                        isHave: false,
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
            vi.mocked(prisma.plants.findMany).mockResolvedValue(mockPlants);

            await getPlants(sortBy, 1, 10);

            expect(prisma.plants.findMany).toHaveBeenCalledWith({
                include: {
                    plant_images: {
                        orderBy: {
                            order: 'asc',
                        },
                        take: 1,
                    },
                },
                orderBy: { name: 'desc' },
                skip: 0,
                take: 10,
            });
        });

        it('ソート順 作成日降順', async () => {
            const sortBy = 'created_at_desc';
            vi.mocked(prisma.plants.count).mockResolvedValue(2);
            vi.mocked(prisma.plants.findMany).mockResolvedValue(mockPlants);

            await getPlants(sortBy, 1, 10);

            expect(prisma.plants.findMany).toHaveBeenCalledWith({
                include: {
                    plant_images: {
                        orderBy: {
                            order: 'asc',
                        },
                        take: 1,
                    },
                },
                orderBy: { created_at: 'desc' },
                skip: 0,
                take: 10,
            });
        });

        it('ソート順 作成日昇順', async () => {
            const sortBy = 'created_at';
            vi.mocked(prisma.plants.count).mockResolvedValue(2);
            vi.mocked(prisma.plants.findMany).mockResolvedValue(mockPlants);

            await getPlants(sortBy, 1, 10);

            expect(prisma.plants.findMany).toHaveBeenCalledWith({
                include: {
                    plant_images: {
                        orderBy: {
                            order: 'asc',
                        },
                        take: 1,
                    },
                },
                orderBy: { created_at: 'asc' },
                skip: 0,
                take: 10,
            });
        });

        it('ソート順 評価が多い順', async () => {
            const sortBy = 'evaluation_desc';
            vi.mocked(prisma.plants.count).mockResolvedValue(2);
            vi.mocked(prisma.plants.findMany).mockResolvedValue(mockPlants);

            await getPlants(sortBy, 1, 10);

            expect(prisma.plants.findMany).toHaveBeenCalledWith({
                include: {
                    plant_images: {
                        orderBy: {
                            order: 'asc',
                        },
                        take: 1,
                    },
                },
                orderBy: { evaluations: { _count: 'desc' } },
                skip: 0,
                take: 10,
            });
        });
    });

    describe('searchPlants', () => {
        const mockSearchResult = [
            {
                id: 1,
                name: 'テスト植物1',
                created_at: new Date('2024-01-01'),
                evaluations: [{ type: 'good' }, { type: 'good' }, { type: 'bad' }], // good: 2, bad: 1 => Safe
            },
            {
                id: 2,
                name: 'テスト植物2',
                created_at: new Date('2024-01-02'),
                evaluations: [{ type: 'good' }, { type: 'bad' }, { type: 'bad' }], // good: 1, bad: 2 => Danger
            },
        ];

        const mockDetailResult1 = {
            id: 1,
            name: 'テスト植物1',
            created_at: new Date('2024-01-01'),
            updated_at: new Date(),
            scientific_name: null,
            family: null,
            genus: null,
            species: null,
            plant_images: [
                {
                    id: 1,
                    image_url: 'test1.jpg',
                    order: 1,
                },
            ],
        };

        const mockDetailResult2 = {
            id: 2,
            name: 'テスト植物2',
            created_at: new Date('2024-01-02'),
            updated_at: new Date(),
            scientific_name: null,
            family: null,
            genus: null,
            species: null,
            plant_images: [
                {
                    id: 2,
                    image_url: 'test2.jpg',
                    order: 1,
                },
            ],
        };

        it('検索クエリで植物を検索できること', async () => {
            // 1回目のfindMany: IDと評価データの取得
            vi.mocked(prisma.plants.findMany).mockResolvedValueOnce([mockSearchResult[0]] as any);
            // 2回目のfindMany: 詳細データの取得
            vi.mocked(prisma.plants.findMany).mockResolvedValueOnce([mockDetailResult1] as any);

            const result = await searchPlants('テスト植物1', 'name', 1, 10);

            expect(result.totalCount).toBe(1);
            expect(result.plants).toHaveLength(1);
            expect(result.plants[0].name).toBe('テスト植物1');

            // 1回目の呼び出し検証（検索条件）
            expect(prisma.plants.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
                where: {
                    name: {
                        contains: 'テスト植物1',
                        mode: 'insensitive',
                    },
                },
                select: expect.any(Object),
            }));
        });

        it('Safeフィルターでフィルタリングできること', async () => {
            // 1回目: 全件返す
            vi.mocked(prisma.plants.findMany).mockResolvedValueOnce(mockSearchResult as any);
            // 2回目: Safeな植物（ID: 1）のみの詳細を返す
            vi.mocked(prisma.plants.findMany).mockResolvedValueOnce([mockDetailResult1] as any);

            const result = await searchPlants('', 'name', 1, 10, 'safe');

            expect(result.totalCount).toBe(1);
            expect(result.plants[0].name).toBe('テスト植物1');

            // 2回目の呼び出し検証（IDフィルタリング）
            expect(prisma.plants.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
                where: { id: { in: [1] } },
            }));
        });

        it('Dangerフィルターでフィルタリングできること', async () => {
            // 1回目: 全件返す
            vi.mocked(prisma.plants.findMany).mockResolvedValueOnce(mockSearchResult as any);
            // 2回目: Dangerな植物（ID: 2）のみの詳細を返す
            vi.mocked(prisma.plants.findMany).mockResolvedValueOnce([mockDetailResult2] as any);

            const result = await searchPlants('', 'name', 1, 10, 'danger');

            expect(result.totalCount).toBe(1);
            expect(result.plants[0].name).toBe('テスト植物2');

            // 2回目の呼び出し検証（IDフィルタリング）
            expect(prisma.plants.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
                where: { id: { in: [2] } },
            }));
        });

        it('評価数順（evaluation_desc）でソートできること', async () => {
            // 1回目: 全件返す
            vi.mocked(prisma.plants.findMany).mockResolvedValueOnce(mockSearchResult as any);
            // 2回目: ソートされた順序（評価数が多い順：ID1(3件) -> ID2(3件) ... mockでは両方3件なので created_atなどで変わるかもだが、
            // 実装上は length - length なので同点。
            // テストデータを調整して明確な差をつける
            const sortTestData = [
                { ...mockSearchResult[0], evaluations: [{ type: 'good' }] }, // 1件
                { ...mockSearchResult[1], evaluations: [{ type: 'good' }, { type: 'bad' }] }, // 2件
            ];

            vi.mocked(prisma.plants.findMany).mockReset(); // リセット
            vi.mocked(prisma.plants.findMany).mockResolvedValueOnce(sortTestData as any);
            vi.mocked(prisma.plants.findMany).mockResolvedValueOnce([mockDetailResult2, mockDetailResult1] as any);

            const result = await searchPlants('query', 'evaluation_desc', 1, 10);

            // 評価数が多い順（ID2 -> ID1）になっていることを期待
            expect(result.plants[0].name).toBe('テスト植物2');
            expect(result.plants[1].name).toBe('テスト植物1');
        });

        it('検索結果が0件の場合、空の配列を返すこと', async () => {
            // 検索クエリありの場合は count ではなく findMany が呼ばれる
            vi.mocked(prisma.plants.findMany).mockResolvedValueOnce([]);

            const result = await searchPlants('存在しない植物', 'name', 1, 10);

            expect(result).toEqual({
                plants: [],
                totalCount: 0,
            });

            // 2回目のfindManyは呼ばれないはず
            expect(prisma.plants.findMany).toHaveBeenCalledTimes(1);
        });
    });

    describe('getPlant', () => {
        it('植物の詳細を取得できること', async () => {
            vi.mocked(prisma.plants.findUnique).mockResolvedValue(mockPlant);
            vi.mocked(createClient).mockResolvedValue({
                from: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null }),
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
                },
            } as unknown as SupabaseClient);

            const result = await getPlant(1);

            expect(result).toEqual({
                id: 1,
                name: 'テスト植物1',
                mainImageUrl: undefined,
                isFavorite: false,
                isHave: false,
                scientific_name: 'テスト植物1',
                family: 'テスト植物1',
                genus: 'テスト植物1',
                species: 'テスト植物1',
            });

            expect(prisma.plants.findUnique).toHaveBeenCalledWith({
                include: {
                    plant_images: {
                        orderBy: {
                            order: 'asc',
                        },
                        take: 1,

                    },
                },
                where: { id: 1 },
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
            // Supabaseのモック
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

            // Prismaのモック
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
            vi.mocked(prisma.plants.update).mockResolvedValue({
                id: 1,
                name: 'テスト植物',
                created_at: new Date(),
                updated_at: new Date(),
                scientific_name: null,
                family: null,
                genus: null,
                species: null,
            });
            vi.mocked(prisma.plant_images.create).mockResolvedValue({
                id: 1,
                image_url: 'test1.jpg',
                created_at: new Date(),
                updated_at: new Date(),
                plant_id: 1,
                user_id: 1,
                caption: null,
                alt_text: null,
                is_approved: true,
                order: 1,
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

    describe('addFavorite', () => {
        const mockUser = { id: 'test-user-id' };

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('お気に入りに追加が成功すること', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue({
                id: 1,
                auth_id: mockUser.id,
                alias_id: 'test-alias',
                name: 'Test User',
                image: null,
                role: 'user',
                created_at: new Date(),
            });
            vi.mocked(prisma.plant_favorites.findFirst).mockResolvedValue(null);
            vi.mocked(prisma.plant_favorites.create).mockResolvedValue({
                id: 1,
                user_id: 1,
                plant_id: 1,
                created_at: new Date(),
            });

            const result = await addFavorite({ params: { plantId: 1 } });

            expect(result).toEqual({
                success: true,
                title: '追加しました。',
            });

            expect(prisma.public_users.findFirst).toHaveBeenCalledWith({
                where: {
                    auth_id: mockUser.id,
                },
            });
            expect(prisma.plant_favorites.create).toHaveBeenCalledWith({
                data: {
                    user_id: 1,
                    plant_id: 1,
                },
            });
        });

        it('未ログインの場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);

            const result = await addFavorite({ params: { plantId: 1 } });

            expect(result).toEqual({
                success: false,
                code: 'AUTH_REQUIRED',
            });
        });

    });

    describe('deleteFavorite', () => {
        const mockUser = { id: 'test-user-id' };

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('お気に入りから削除が成功すること', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue({
                id: 1,
                auth_id: mockUser.id,
                alias_id: 'test-alias',
                name: 'Test User',
                image: null,
                role: 'user',
                created_at: new Date(),
            });
            vi.mocked(prisma.plant_favorites.findFirst).mockResolvedValue({
                id: 1,
                user_id: 1,
                plant_id: 1,
                created_at: new Date(),
            });
            vi.mocked(prisma.plant_favorites.delete).mockResolvedValue({
                id: 1,
                user_id: 1,
                plant_id: 1,
                created_at: new Date(),
            });
            vi.mocked(prisma.plant_favorites.deleteMany).mockResolvedValue({
                count: 1,
            });

            const result = await deleteFavorite({ params: { plantId: 1 } });

            expect(result).toEqual({
                success: true,
                "title": "削除しました。",
            });

            expect(prisma.public_users.findFirst).toHaveBeenCalledWith({
                where: {
                    auth_id: mockUser.id,
                },
            });
            expect(prisma.plant_favorites.deleteMany).toHaveBeenCalledWith({
                where: {
                    user_id: 1,
                    plant_id: 1,
                },
            });
        });

        it('未ログインの場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);

            const result = await deleteFavorite({ params: { plantId: 1 } });

            expect(result).toEqual({
                success: false,
                code: 'AUTH_REQUIRED',
            });
        });
    });

    describe('addHave', () => {
        const mockUser = { id: 'test-user-id' };

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('持っている植物に追加が成功すること', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue({
                id: 1,
                auth_id: mockUser.id,
                alias_id: 'test-alias',
                name: 'Test User',
                image: null,
                role: 'user',
                created_at: new Date(),
            });
            vi.mocked(prisma.plant_have.findFirst).mockResolvedValue(null);
            vi.mocked(prisma.plant_have.create).mockResolvedValue({
                id: 1,
                user_id: 1,
                plant_id: 1,
                created_at: new Date(),
            });

            const result = await addHave({ params: { plantId: 1 } });

            expect(result).toEqual({
                success: true,
                "title": "追加しました。",
            });

            expect(prisma.public_users.findFirst).toHaveBeenCalledWith({
                where: {
                    auth_id: mockUser.id,
                },
            });
            expect(prisma.plant_have.create).toHaveBeenCalledWith({
                data: {
                    user_id: 1,
                    plant_id: 1,
                },
            });
        });

        it('未ログインの場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);

            const result = await addHave({ params: { plantId: 1 } });

            expect(result).toEqual({
                success: false,
                code: 'AUTH_REQUIRED',
            });
        });

        it('既に持っている植物に追加されている場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue({
                id: 1,
                auth_id: mockUser.id,
                alias_id: 'test-alias',
                name: 'Test User',
                image: null,
                role: 'user',
                created_at: new Date(),
            });
            vi.mocked(prisma.plant_have.findFirst).mockResolvedValue({
                id: 1,
                user_id: 1,
                plant_id: 1,
                created_at: new Date(),
            });

            const result = await addHave({ params: { plantId: 1 } });

            expect(result).toEqual({
                success: false,
                code: 'ALREADY_EXISTS',
            });
        });
    });

    describe('deleteHave', () => {
        const mockUser = { id: 'test-user-id' };

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('持っている植物から削除が成功すること', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue({
                id: 1,
                auth_id: mockUser.id,
                alias_id: 'test-alias',
                name: 'Test User',
                image: null,
                role: 'user',
                created_at: new Date(),
            });
            vi.mocked(prisma.plant_have.findFirst).mockResolvedValue({
                id: 1,
                user_id: 1,
                plant_id: 1,
                created_at: new Date(),
            });
            vi.mocked(prisma.plant_have.delete).mockResolvedValue({
                id: 1,
                user_id: 1,
                plant_id: 1,
                created_at: new Date(),
            });

            const result = await deleteHave({ params: { plantId: 1 } });

            expect(result).toEqual({
                success: true,
                "title": "削除しました。",
            });

            expect(prisma.public_users.findFirst).toHaveBeenCalledWith({
                where: {
                    auth_id: mockUser.id,
                },
            });
            expect(prisma.plant_have.deleteMany).toHaveBeenCalledWith({
                where: {
                    user_id: 1,
                    plant_id: 1,
                },
            });
        });

        it('未ログインの場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);

            const result = await deleteHave({ params: { plantId: 1 } });

            expect(result).toEqual({
                success: false,
                code: 'AUTH_REQUIRED',
            });
        });
    });
}); 