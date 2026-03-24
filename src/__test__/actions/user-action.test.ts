/* eslint-disable @typescript-eslint/no-explicit-any */
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
} from '@/actions/user-action';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { SupabaseClient } from '@supabase/supabase-js';
import { SexType } from '@/types/neko';
import { ActionErrorCode } from '@/types/common';
import { revalidatePath } from 'next/cache';

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
    default: {
        public_users: {
            findFirst: vi.fn(),
            update: vi.fn(),
        },
        pets: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        $transaction: vi.fn((callback) => callback(prisma)),
    },
}));

// Supabaseクライアントのモック
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

describe('User Actions', () => {
    const mockUser = { id: 'test-user-id' };
    const mockPublicUser = {
        id: 1,
        auth_id: mockUser.id,
        alias_id: 'test-alias',
        name: 'Test User',
        image: null,
        role: 'user',
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

            await updateUser('Updated Name', 'upalias');

            expect(prisma.public_users.update).toHaveBeenCalledWith({
                where: {
                    id: 1,
                },
                data: {
                    name: 'Updated Name',
                    alias_id: 'upalias',
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
            vi.mocked(revalidatePath).mockImplementation(() => { });

            const result = await updatePet(1, '更新されたペット', 2, mockFile, SexType.FEMALE, '2021-01-01', 4);

            expect(result).toEqual({
                success: true,
                message: "飼い猫を更新しました",
            });
            expect(revalidatePath).toHaveBeenCalledWith(`/${mockPublicUser.alias_id}`);
        });

        it('未ログインの場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);

            expect(await updatePet(1, '更新されたペット', 2, mockFile, SexType.FEMALE, '2021-01-01', 4)).toEqual({
                success: false,
                code: ActionErrorCode.AUTH_REQUIRED,
                message: "ユーザーが見つかりません",
            });
        });

        it('画像のアップロードに失敗した場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
                storage: {
                    from: vi.fn().mockReturnValue({
                        upload: vi.fn().mockResolvedValue({ error: new Error('アップロードエラー') }),
                    }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);
            vi.mocked(prisma.pets.findUnique).mockResolvedValue({
                id: 1,
                name: '更新するペット',
                neko_id: 2,
                user_id: 1,
                sex: SexType.FEMALE,
                age: 4,
                birthday: new Date('2021-01-01'),
                image: 'test-user-id/1_test.jpg',
                created_at: new Date(),
            });

            expect(await updatePet(1, '更新されたペット', 2, mockFile, SexType.FEMALE, '2021-01-01', 4))
                .toEqual({
                    success: false,
                    code: ActionErrorCode.INTERNAL_SERVER_ERROR,
                    message: "飼い猫を更新できませんでした",
                });
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
            vi.mocked(revalidatePath).mockImplementation(() => { });
            await deletePet(1);

            expect(prisma.pets.delete).toHaveBeenCalledWith({
                where: {
                    id: 1,
                    user_id: 1,
                },
            });
            expect(revalidatePath).toHaveBeenCalledWith(`/${mockPublicUser.alias_id}`);
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
});
