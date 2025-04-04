import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getUserProfile,
    getUserProfileByAuthId,
    getUserPets,
    updateUser,
    updateUserImage,
    addPet,
    updatePet,
    deletePet,
    getUserPlants,
    deleteHavePlant,
    getUserEvaluations,
    getUserFavoritePlants,
    deleteFavoritePlant,
} from '@/actions/user-action';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { SupabaseClient } from '@supabase/supabase-js';
import { SexType } from '@/types/neko';
import { EvaluationType } from '@/types/evaluation';

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
    default: {
        public_users: {
            findFirst: vi.fn(),
            update: vi.fn(),
        },
        pets: {
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        plants: {
            findMany: vi.fn(),
        },
        evaluations: {
            findMany: vi.fn(),
        },
        plant_favorites: {
            findMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        plant_have: {
            deleteMany: vi.fn(),
        },
        $transaction: vi.fn((callback) => callback(prisma)),
    },
}));

// Supabaseクライアントのモック
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('User Actions', () => {
    const mockUser = { id: 'test-user-id' };
    const mockPublicUser = {
        id: 1,
        auth_id: mockUser.id,
        alias_id: 'test-alias',
        name: 'Test User',
        image: null,
        created_at: new Date(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getUserProfile', () => {
        it('ユーザープロフィールを取得できること', async () => {
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);

            const result = await getUserProfile('test-alias');

            expect(result).toEqual({
                id: 1,
                aliasId: 'test-alias',
                authId: 'test-user-id',
                name: 'Test User',
                imageSrc: undefined,
            });

            expect(prisma.public_users.findFirst).toHaveBeenCalledWith({
                select: {
                    id: true,
                    alias_id: true,
                    auth_id: true,
                    name: true,
                    image: true,
                },
                where: {
                    alias_id: 'test-alias',
                },
            });
        });

        it('ユーザーが存在しない場合はundefinedを返すこと', async () => {
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(null);

            const result = await getUserProfile('non-existent');

            expect(result).toBeUndefined();
        });
    });

    describe('getUserProfileByAuthId', () => {
        it('認証ユーザーのプロフィールを取得できること', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);

            const result = await getUserProfileByAuthId();

            expect(result).toEqual({
                id: 1,
                aliasId: 'test-alias',
                authId: 'test-user-id',
                name: 'Test User',
                imageSrc: undefined,
            });

            expect(prisma.public_users.findFirst).toHaveBeenCalledWith({
                where: {
                    auth_id: mockUser.id,
                },
            });
        });

        it('未ログインの場合はundefinedを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);

            const result = await getUserProfileByAuthId();

            expect(result).toBeUndefined();
        });

        it('ユーザーが存在しない場合はundefinedを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(null);

            const result = await getUserProfileByAuthId();

            expect(result).toBeUndefined();
        });
    });

    describe('getUserPets', () => {
        it('ユーザーのペット一覧を取得できること', async () => {
            const mockPets = [
                {
                    id: 1,
                    name: 'テストペット',
                    image: 'test.jpg',
                    sex: SexType.MALE,
                    birthday: new Date(),
                    age: 3,
                    created_at: new Date(),
                    user_id: 1,
                    neko_id: 1,
                    neko: {
                        id: 1,
                        name: 'テスト猫',
                    },
                },
            ];

            vi.mocked(prisma.pets.findMany).mockResolvedValue(mockPets);

            const result = await getUserPets(1);

            expect(result).toEqual([
                {
                    id: 1,
                    name: 'テストペット',
                    imageSrc: 'http://localhost:54321/storage/v1/object/public/user_pets/test.jpg',
                    neko: {
                        id: 1,
                        name: 'テスト猫',
                    },
                    sex: SexType.MALE,
                    birthday: expect.any(Date),
                    age: 3,
                },
            ]);

            expect(prisma.pets.findMany).toHaveBeenCalledWith({
                where: {
                    user_id: 1,
                },
                include: {
                    neko: true,
                },
                orderBy: {
                    id: 'asc',
                },
            });
        });

        it('ペットが存在しない場合はundefinedを返すこと', async () => {
            vi.mocked(prisma.pets.findMany).mockResolvedValue([]);

            const result = await getUserPets(1);

            expect(result).toBeUndefined();
        });
    });

    describe('updateUser', () => {
        it('ユーザー情報を更新できること', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);
            vi.mocked(prisma.public_users.update).mockResolvedValue({
                ...mockPublicUser,
                name: 'Updated Name',
                alias_id: 'updated-alias',
            });

            await updateUser('Updated Name', 'updated-alias');

            expect(prisma.public_users.update).toHaveBeenCalledWith({
                where: {
                    id: 1,
                },
                data: {
                    name: 'Updated Name',
                    alias_id: 'updated-alias',
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

            await expect(updateUser('Updated Name', 'updated-alias'))
                .rejects
                .toThrow('ユーザーが見つかりません。');
        });

        it('名前が20文字を超える場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);

            await expect(updateUser('A'.repeat(21), 'updated-alias'))
                .rejects
                .toThrow('名前は7文字以内で入力してください');
        });

        it('ユーザーIDが10文字を超える場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);

            await expect(updateUser('Updated Name', 'A'.repeat(11)))
                .rejects
                .toThrow('ユーザーIDは10文字以内で入力してください');
        });

        it('ユーザーIDが英数字以外の場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);

            await expect(updateUser('Updated Name', 'test-alias'))
                .rejects
                .toThrow('ユーザーIDは英数字で入力してください');
        });
    });

    describe('updateUserImage', () => {
        const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });

        it('ユーザー画像を更新できること', async () => {
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
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);
            vi.mocked(prisma.public_users.update).mockResolvedValue({
                ...mockPublicUser,
                image: 'test-user-id/test.jpg',
            });

            await updateUserImage(mockFile);

            expect(prisma.public_users.update).toHaveBeenCalledWith({
                where: {
                    id: 1,
                },
                data: {
                    image: expect.stringContaining('test-user-id/'),
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

            await expect(updateUserImage(mockFile))
                .rejects
                .toThrow('ユーザーが見つかりません');
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
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);

            await expect(updateUserImage(mockFile))
                .rejects
                .toThrow('アップロードエラー');
        });
    });

    describe('addPet', () => {
        const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });

        it('ペットを追加できること', async () => {
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
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);
            vi.mocked(prisma.pets.create).mockResolvedValue({
                id: 1,
                name: 'テストペット',
                neko_id: 1,
                user_id: 1,
                sex: SexType.MALE,
                age: 3,
                birthday: new Date(),
                image: null,
                created_at: new Date(),
            });
            vi.mocked(prisma.pets.update).mockResolvedValue({
                id: 1,
                name: 'テストペット',
                neko_id: 1,
                user_id: 1,
                sex: SexType.MALE,
                age: 3,
                birthday: new Date(),
                image: 'test-user-id/1_test.jpg',
                created_at: new Date(),
            });

            await addPet('テストペット', 1, mockFile, SexType.MALE, '2020-01-01', 3);

            expect(prisma.pets.create).toHaveBeenCalledWith({
                data: {
                    name: 'テストペット',
                    neko_id: 1,
                    user_id: 1,
                    sex: SexType.MALE,
                    age: 3,
                    birthday: new Date('2020-01-01'),
                },
            });
            expect(prisma.pets.update).toHaveBeenCalledWith({
                where: {
                    id: 1,
                },
                data: {
                    image: expect.stringContaining('test-user-id/1_'),
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

            await expect(addPet('テストペット', 1, mockFile, SexType.MALE, '2020-01-01', 3))
                .rejects
                .toThrow('ユーザーが見つかりません');
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
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);
            vi.mocked(prisma.pets.create).mockResolvedValue({
                id: 1,
                name: 'テストペット',
                neko_id: 1,
                user_id: 1,
                sex: SexType.MALE,
                age: 3,
                birthday: new Date(),
                image: null,
                created_at: new Date(),
            });

            await expect(addPet('テストペット', 1, mockFile, SexType.MALE, '2020-01-01', 3))
                .rejects
                .toThrow('アップロードエラー');
        });
    });

    describe('updatePet', () => {
        const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });

        it('ペット情報を更新できること', async () => {
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
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);
            vi.mocked(prisma.pets.update).mockResolvedValue({
                id: 1,
                name: '更新されたペット',
                neko_id: 2,
                user_id: 1,
                sex: SexType.FEMALE,
                age: 4,
                birthday: new Date('2021-01-01'),
                image: 'test-user-id/1_test.jpg',
                created_at: new Date(),
            });

            await updatePet(1, '更新されたペット', 2, mockFile, SexType.FEMALE, '2021-01-01', 4);

            expect(prisma.pets.update).toHaveBeenCalledWith({
                where: {
                    id: 1,
                },
                data: {
                    name: '更新されたペット',
                    neko_id: 2,
                    sex: SexType.FEMALE,
                    age: 4,
                    birthday: new Date('2021-01-01'),
                    image: expect.stringContaining('test-user-id/1_'),
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

            await expect(updatePet(1, '更新されたペット', 2, mockFile, SexType.FEMALE, '2021-01-01', 4))
                .rejects
                .toThrow('ユーザーが見つかりません');
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
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);

            await expect(updatePet(1, '更新されたペット', 2, mockFile, SexType.FEMALE, '2021-01-01', 4))
                .rejects
                .toThrow('アップロードエラー');
        });
    });

    describe('deletePet', () => {
        it('ペットを削除できること', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);
            vi.mocked(prisma.pets.delete).mockResolvedValue({
                id: 1,
                name: 'テストペット',
                neko_id: 1,
                user_id: 1,
                sex: SexType.MALE,
                age: 3,
                birthday: new Date(),
                image: 'test.jpg',
                created_at: new Date(),
            });

            await deletePet(1);

            expect(prisma.pets.delete).toHaveBeenCalledWith({
                where: {
                    id: 1,
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

            await expect(deletePet(1))
                .rejects
                .toThrow('ユーザーが見つかりません');
        });
    });

    describe('getUserPlants', () => {
        it('ユーザーの植物一覧を取得できること', async () => {
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

            vi.mocked(prisma.plants.findMany).mockResolvedValue(mockPlants);

            const result = await getUserPlants(1);

            expect(result).toEqual([
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
            ]);

            expect(prisma.plants.findMany).toHaveBeenCalledWith({
                where: {
                    plant_have: {
                        some: {
                            user_id: 1,
                        },
                    },
                },
            });
        });

        it('植物が存在しない場合はundefinedを返すこと', async () => {
            vi.mocked(prisma.plants.findMany).mockResolvedValue([]);

            const result = await getUserPlants(1);

            expect(result).toBeUndefined();
        });
    });

    describe('deleteHavePlant', () => {
        it('持っている植物を削除できること', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);
            vi.mocked(prisma.plant_have.deleteMany).mockResolvedValue({
                count: 1,
            });

            await deleteHavePlant(1);

            expect(prisma.plant_have.deleteMany).toHaveBeenCalledWith({
                where: {
                    plant_id: 1,
                    user_id: 1,
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

            await expect(deleteHavePlant(1))
                .rejects
                .toThrow('ユーザーが見つかりません');
        });
    });

    describe('getUserEvaluations', () => {
        it('ユーザーの評価一覧を取得できること', async () => {
            const mockEvaluations = [
                {
                    id: 1,
                    type: EvaluationType.GOOD,
                    comment: 'テストコメント1',
                    created_at: new Date(),
                    user_id: 1,
                    plant_id: 1,
                    plant: {
                        id: 1,
                        name: 'テスト植物1',
                        image_src: 'test1.jpg',
                        created_at: new Date(),
                    },
                },
                {
                    id: 2,
                    type: EvaluationType.BAD,
                    comment: 'テストコメント2',
                    created_at: new Date(),
                    user_id: 1,
                    plant_id: 2,
                    plant: {
                        id: 2,
                        name: 'テスト植物2',
                        image_src: 'test2.jpg',
                        created_at: new Date(),
                    },
                },
            ];

            vi.mocked(prisma.evaluations.findMany).mockResolvedValue(mockEvaluations);

            const result = await getUserEvaluations(1);

            expect(result).toEqual([
                {
                    id: 1,
                    type: EvaluationType.GOOD,
                    comment: 'テストコメント1',
                    createdAt: expect.any(Date),
                    plant: {
                        id: 1,
                        name: 'テスト植物1',
                        imageUrl: 'http://localhost:54321/storage/v1/object/public/plants/test1.jpg',
                        isFavorite: false,
                        isHave: false,
                    },
                },
                {
                    id: 2,
                    type: EvaluationType.BAD,
                    comment: 'テストコメント2',
                    createdAt: expect.any(Date),
                    plant: {
                        id: 2,
                        name: 'テスト植物2',
                        imageUrl: 'http://localhost:54321/storage/v1/object/public/plants/test2.jpg',
                        isFavorite: false,
                        isHave: false,
                    },
                },
            ]);

            expect(prisma.evaluations.findMany).toHaveBeenCalledWith({
                where: {
                    user_id: 1,
                },
                include: {
                    plant: true,
                },
                orderBy: {
                    created_at: 'desc',
                },
            });
        });

        it('評価が存在しない場合はundefinedを返すこと', async () => {
            vi.mocked(prisma.evaluations.findMany).mockResolvedValue([]);

            const result = await getUserEvaluations(1);

            expect(result).toBeUndefined();
        });
    });

    describe('getUserFavoritePlants', () => {
        it('ユーザーのお気に入り植物一覧を取得できること', async () => {
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

            vi.mocked(prisma.plants.findMany).mockResolvedValue(mockPlants);

            const result = await getUserFavoritePlants(1);

            expect(result).toEqual([
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
            ]);

            expect(prisma.plants.findMany).toHaveBeenCalledWith({
                where: {
                    plant_favorites: {
                        some: {
                            user_id: 1,
                        },
                    },
                },
            });
        });

        it('お気に入り植物が存在しない場合はundefinedを返すこと', async () => {
            vi.mocked(prisma.plants.findMany).mockResolvedValue([]);

            const result = await getUserFavoritePlants(1);

            expect(result).toBeUndefined();
        });
    });

    describe('deleteFavoritePlant', () => {
        it('お気に入り植物を削除できること', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);
            vi.mocked(prisma.plant_favorites.deleteMany).mockResolvedValue({
                count: 1,
            });

            await deleteFavoritePlant(1);

            expect(prisma.plant_favorites.deleteMany).toHaveBeenCalledWith({
                where: {
                    plant_id: 1,
                    user_id: 1,
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

            await expect(deleteFavoritePlant(1))
                .rejects
                .toThrow('ユーザーが見つかりません');
        });
    });
}); 