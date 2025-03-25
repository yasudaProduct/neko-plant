import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlants, searchPlants, getPlant } from '@/actions/plant-action';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { SupabaseClient } from '@supabase/supabase-js';

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
    default: {
        plants: {
            count: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
        },
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
            image_src: 'test1.jpg',
            created_at: new Date(),
        },
        {
            id: 2,
            name: 'テスト植物2',
            image_src: 'test2.jpg',
            created_at: new Date(),
        },
    ];

    const mockPlant = {
        id: 1,
        name: 'テスト植物1',
        image_src: 'test1.jpg',
        created_at: new Date(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getPlants', () => {
        it('植物一覧を取得できること', async () => {
            // Prismaのモック
            vi.mocked(prisma.plants.count).mockResolvedValue(2);
            vi.mocked(prisma.plants.findMany).mockResolvedValue(mockPlants);

            const result = await getPlants('name', 1, 10);

            expect(result).toEqual({
                plants: [
                    {
                        id: 1,
                        name: 'テスト植物1',
                        imageUrl: 'http://localhost:54321/storage/v1/object/public/plants/test1.jpg',
                        isFavorite: false,
                        isHave: false,
                    },
                    {
                        id: 2,
                        name: 'テスト植物2',
                        imageUrl: 'http://localhost:54321/storage/v1/object/public/plants/test2.jpg',
                        isFavorite: false,
                        isHave: false,
                    },
                ],
                totalCount: 2,
            });

            expect(prisma.plants.count).toHaveBeenCalled();
            expect(prisma.plants.findMany).toHaveBeenCalledWith({
                select: {
                    id: true,
                    name: true,
                    image_src: true,
                },
                orderBy: { name: 'asc' },
                skip: 0,
                take: 10,
            });
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
    });

    describe('searchPlants', () => {
        it('検索クエリで植物を検索できること', async () => {
            const searchQuery = 'テスト';
            vi.mocked(prisma.plants.count).mockResolvedValue(2);
            vi.mocked(prisma.plants.findMany).mockResolvedValue(mockPlants);

            const result = await searchPlants(searchQuery, 'name', 1, 10);

            expect(result).toEqual({
                plants: [
                    {
                        id: 1,
                        name: 'テスト植物1',
                        imageUrl: 'http://localhost:54321/storage/v1/object/public/plants/test1.jpg',
                        isFavorite: false,
                        isHave: false,
                    },
                    {
                        id: 2,
                        name: 'テスト植物2',
                        imageUrl: 'http://localhost:54321/storage/v1/object/public/plants/test2.jpg',
                        isFavorite: false,
                        isHave: false,
                    },
                ],
                totalCount: 2,
            });

            expect(prisma.plants.count).toHaveBeenCalledWith({
                where: {
                    name: {
                        contains: searchQuery,
                        mode: 'insensitive',
                    },
                },
            });
            expect(prisma.plants.findMany).toHaveBeenCalledWith({
                where: {
                    name: {
                        contains: searchQuery,
                        mode: 'insensitive',
                    },
                },
                select: {
                    id: true,
                    name: true,
                    image_src: true,
                },
                orderBy: { name: 'asc' },
                skip: 0,
                take: 10,
            });
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

        it('空の検索クエリの場合は全件取得すること', async () => {
            vi.mocked(prisma.plants.count).mockResolvedValue(2);
            vi.mocked(prisma.plants.findMany).mockResolvedValue(mockPlants);

            const result = await searchPlants('', 'name', 1, 10);

            expect(result).toEqual({
                plants: [
                    {
                        id: 1,
                        name: 'テスト植物1',
                        imageUrl: 'http://localhost:54321/storage/v1/object/public/plants/test1.jpg',
                        isFavorite: false,
                        isHave: false,
                    },
                    {
                        id: 2,
                        name: 'テスト植物2',
                        imageUrl: 'http://localhost:54321/storage/v1/object/public/plants/test2.jpg',
                        isFavorite: false,
                        isHave: false,
                    },
                ],
                totalCount: 2,
            });
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
                imageUrl: 'http://localhost:54321/storage/v1/object/public/plants/test1.jpg',
                isFavorite: false,
                isHave: false,
            });

            expect(prisma.plants.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
            });
        });

        it('存在しない植物の場合はundefinedを返すこと', async () => {
            vi.mocked(prisma.plants.findUnique).mockResolvedValue(null);

            const result = await getPlant(999);

            expect(result).toBeUndefined();
        });
    });
}); 