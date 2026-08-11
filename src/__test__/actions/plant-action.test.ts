/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    addPlant,
    deletePlant,
    getPlant,
    searchPlantName,
    searchPlants,
    updatePlant,
} from '@/actions/plant-action';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { ActionErrorCode } from '@/types/common';

// Prismaのモック
vi.mock('@/lib/prisma', () => {
    const prisma = {
        plants: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            count: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        public_users: {
            findFirst: vi.fn(),
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

function mockSupabase(user: { id: string } | null) {
    const client = {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user } }),
        },
    };
    vi.mocked(createClient).mockResolvedValue(client as unknown as SupabaseClient);
}

/** updatePlant / deletePlant の管理者チェックが参照する role をモックする */
function mockRole(role: string | null) {
    vi.mocked(prisma.public_users.findFirst).mockResolvedValue(
        role ? ({ role } as any) : null,
    );
}

/**
 * addPlant / updatePlant の重複チェック (findPlantByNameKey) をモックする。
 * 正規化キーでの照合は式インデックスを使うため $queryRaw で実装されている。
 */
function mockNameKeyLookup(plant: { id: number; name: string } | null) {
    vi.mocked(prisma.$queryRaw).mockResolvedValue((plant ? [plant] : []) as any);
}

// searchPlants用の詳細データ (post_plants経由の最新投稿画像を含む)
const plantDetailRow = (id: number, name: string, imageUrl?: string) => ({
    id,
    name,
    scientific_name: null,
    family: null,
    genus: null,
    species: null,
    post_plants: imageUrl
        ? [{ posts: { post_images: [{ image_url: imageUrl }] } }]
        : [],
});

describe('Plant Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('searchPlants', () => {
        it('共存実績付きで植物を返す', async () => {
            // 1回目: 件数 / 2回目: ページID / 3回目: 共存集計
            vi.mocked(prisma.$queryRaw)
                .mockResolvedValueOnce([{ count: BigInt(2) }] as any)
                .mockResolvedValueOnce([{ id: 5 }, { id: 6 }] as any)
                .mockResolvedValueOnce([
                    { plant_id: 5, post_count: BigInt(3), cat_count: BigInt(2) },
                ] as any);
            vi.mocked(prisma.plants.findMany).mockResolvedValue([
                plantDetailRow(6, 'モンステラ'),
                plantDetailRow(5, 'パキラ', 'auth/1/1_a.png'),
            ] as any);

            const result = await searchPlants('', 'cats', 1, 9, 'all');

            expect(result.totalCount).toBe(2);
            expect(result.plants).toHaveLength(2);

            // IDの順序はRaw SQLの結果順 (5 -> 6) を維持する
            expect(result.plants[0].id).toBe(5);
            expect(result.plants[0].catCount).toBe(2);
            expect(result.plants[0].postCount).toBe(3);
            expect(result.plants[0].mainImageUrl).toContain('/storage/v1/object/public/posts/auth/1/1_a.png');

            expect(result.plants[1].id).toBe(6);
            expect(result.plants[1].catCount).toBe(0);
            expect(result.plants[1].mainImageUrl).toBeUndefined();
        });

        it('結果が0件の場合は空配列を返す', async () => {
            vi.mocked(prisma.$queryRaw)
                .mockResolvedValueOnce([{ count: BigInt(0) }] as any)
                .mockResolvedValueOnce([] as any);

            const result = await searchPlants('存在しない植物', 'cats', 1, 9, 'all');

            expect(result).toEqual({ plants: [], totalCount: 0 });
            expect(prisma.plants.findMany).not.toHaveBeenCalled();
        });
    });

    describe('searchPlantName', () => {
        it('名前の部分一致で検索する', async () => {
            vi.mocked(prisma.plants.findMany).mockResolvedValue([
                { id: 1, name: 'パキラ' },
            ] as any);

            const result = await searchPlantName('パキ');

            expect(result).toEqual([{ id: 1, name: 'パキラ' }]);
        });

        it('大文字小文字を区別せず、正規化したクエリで検索する', async () => {
            vi.mocked(prisma.plants.findMany).mockResolvedValue([
                { id: 1, name: 'Monstera' },
            ] as any);

            // 'monstera' で 'Monstera' が引けないと新規登録に進んで一意違反になる
            await searchPlantName('　ｍｏｎｓｔｅｒａ　');

            expect(prisma.plants.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { name: { contains: 'monstera', mode: 'insensitive' } },
                }),
            );
        });
    });

    describe('getPlant', () => {
        it('植物と共存実績を返す', async () => {
            vi.mocked(prisma.plants.findMany).mockResolvedValue([
                plantDetailRow(5, 'パキラ'),
            ] as any);
            vi.mocked(prisma.$queryRaw).mockResolvedValue([
                { plant_id: 5, post_count: BigInt(4), cat_count: BigInt(3) },
            ] as any);

            const plant = await getPlant(5);

            expect(plant).toBeDefined();
            expect(plant?.name).toBe('パキラ');
            expect(plant?.postCount).toBe(4);
            expect(plant?.catCount).toBe(3);
        });

        it('存在しない場合はundefined', async () => {
            vi.mocked(prisma.plants.findMany).mockResolvedValue([] as any);
            vi.mocked(prisma.$queryRaw).mockResolvedValue([] as any);

            const plant = await getPlant(999);

            expect(plant).toBeUndefined();
        });
    });

    describe('addPlant', () => {
        it('未ログインの場合はAUTH_REQUIRED', async () => {
            mockSupabase(null);

            const result = await addPlant('パキラ');

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.AUTH_REQUIRED);
        });

        it('名前が空の場合はVALIDATION_ERROR', async () => {
            mockSupabase(mockUser);

            const result = await addPlant('');

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.VALIDATION_ERROR);
        });

        it('51文字以上はVALIDATION_ERROR', async () => {
            mockSupabase(mockUser);

            const result = await addPlant('あ'.repeat(51));

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.VALIDATION_ERROR);
        });

        it('重複する場合はALREADY_EXISTSと既存IDを返す', async () => {
            mockSupabase(mockUser);
            mockNameKeyLookup({ id: 5, name: 'パキラ' });

            const result = await addPlant('パキラ');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.code).toBe(ActionErrorCode.ALREADY_EXISTS);
                expect(result.data?.plantId).toBe(5);
            }
        });

        it('正常系: 植物を作成しIDを返す', async () => {
            mockSupabase(mockUser);
            mockNameKeyLookup(null);
            vi.mocked(prisma.plants.create).mockResolvedValue({ id: 7, name: '新しい植物' } as any);

            const result = await addPlant('新しい植物');

            expect(result.success).toBe(true);
            if (result.success) expect(result.data?.plantId).toBe(7);
        });

        it('全角・半角カナ・連続空白を正規化して保存する (大文字小文字は保持)', async () => {
            mockSupabase(mockUser);
            mockNameKeyLookup(null);
            vi.mocked(prisma.plants.create).mockResolvedValue({ id: 8 } as any);

            await addPlant('　Ｍｏｎｓｔｅｒａ　ﾃﾞﾘｼｵｰｻ ');

            // 表示名なので大文字は残し、表記だけ揃える
            // (期待値は plants_name_normalized_key の式を PG で評価した結果と一致)
            expect(prisma.plants.create).toHaveBeenCalledWith({
                data: { name: 'Monstera デリシオーサ' },
            });
        });

        it('空白のみの名前はVALIDATION_ERROR', async () => {
            mockSupabase(mockUser);

            const result = await addPlant('　  　');

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.VALIDATION_ERROR);
            expect(prisma.plants.create).not.toHaveBeenCalled();
        });

        it('競合でP2002が出た場合はALREADY_EXISTSにフォールバックする', async () => {
            mockSupabase(mockUser);
            vi.mocked(prisma.$queryRaw)
                .mockResolvedValueOnce([] as any)                            // 事前チェック: 重複なし
                .mockResolvedValueOnce([{ id: 9, name: 'パキラ' }] as any);  // P2002 後の再検索
            vi.mocked(prisma.plants.create).mockRejectedValue(
                new Prisma.PrismaClientKnownRequestError('unique violation', {
                    code: 'P2002',
                    clientVersion: 'test',
                }),
            );

            const result = await addPlant('パキラ');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.code).toBe(ActionErrorCode.ALREADY_EXISTS);
                expect(result.data?.plantId).toBe(9);
            }
        });
    });

    describe('updatePlant', () => {
        it('一般ユーザーはFORBIDDEN', async () => {
            mockSupabase(mockUser);
            mockRole('user');

            const result = await updatePlant(1, { name: 'パキラ' });

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.FORBIDDEN);
            expect(prisma.plants.update).not.toHaveBeenCalled();
        });

        it('別の植物と名前が重複する場合はALREADY_EXISTS', async () => {
            mockSupabase(mockUser);
            mockRole('admin');
            mockNameKeyLookup({ id: 2, name: 'パキラ' });

            const result = await updatePlant(1, { name: 'パキラ' });

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.ALREADY_EXISTS);
        });

        it('正常系: 管理者は植物を更新できる', async () => {
            mockSupabase(mockUser);
            mockRole('admin');
            mockNameKeyLookup(null);
            vi.mocked(prisma.plants.update).mockResolvedValue({ id: 1 } as any);

            const result = await updatePlant(1, { name: 'パキラ', family: 'アオイ科' });

            expect(result.success).toBe(true);
            expect(prisma.plants.update).toHaveBeenCalled();
        });

        it('正規化した名前で更新する', async () => {
            mockSupabase(mockUser);
            mockRole('admin');
            mockNameKeyLookup(null);
            vi.mocked(prisma.plants.update).mockResolvedValue({ id: 1 } as any);

            await updatePlant(1, { name: '  モンステラ　デリシオーサ  ' });

            expect(prisma.plants.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ name: 'モンステラ デリシオーサ' }),
                }),
            );
        });

        it('51文字以上はVALIDATION_ERROR', async () => {
            mockSupabase(mockUser);
            mockRole('admin');

            const result = await updatePlant(1, { name: 'あ'.repeat(51) });

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.VALIDATION_ERROR);
            expect(prisma.plants.update).not.toHaveBeenCalled();
        });
    });

    describe('deletePlant', () => {
        it('一般ユーザーはFORBIDDEN', async () => {
            mockSupabase(mockUser);
            mockRole('user');

            const result = await deletePlant(1);

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe(ActionErrorCode.FORBIDDEN);
            expect(prisma.plants.delete).not.toHaveBeenCalled();
        });

        it('正常系: 管理者は植物を削除できる', async () => {
            mockSupabase(mockUser);
            mockRole('admin');
            vi.mocked(prisma.plants.delete).mockResolvedValue({ id: 1 } as any);

            const result = await deletePlant(1);

            expect(result.success).toBe(true);
            expect(prisma.plants.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it('未ログインの場合はAUTH_REQUIRED', async () => {
            mockSupabase(null);

            const result = await deletePlant(1);

            expect(result.success).toBe(false);
            expect(prisma.plants.delete).not.toHaveBeenCalled();
        });
    });
});
