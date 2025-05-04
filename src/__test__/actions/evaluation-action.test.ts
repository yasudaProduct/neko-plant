import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEvaluations, addEvaluation, getEvalReAction, upsertReAction, deleteReAction } from '@/actions/evaluation-action';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { SupabaseClient } from '@supabase/supabase-js';
import { EvaluationType, EvaluationReActionType } from '@/types/evaluation';
import { SexType } from '@/types/neko';
import { PrismaClient } from '@prisma/client';
import { ActionErrorCode } from '@/types/common';

// Prismaのモック
vi.mock('@/lib/prisma', () => {
    const prisma = {
        evaluations: {
            findMany: vi.fn(),
            create: vi.fn(),
        },
        pets: {
            findMany: vi.fn(),
        },
        evaluation_reactions: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            deleteMany: vi.fn(),
        },
        public_users: {
            findFirst: vi.fn(),
        },
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

describe('Evaluation Actions', () => {
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

    describe('getEvaluations', () => {
        it('正常系', async () => {
            const mockEvaluations = [
                {
                    id: 1,
                    type: EvaluationType.GOOD,
                    comment: 'テストコメント1',
                    created_at: new Date(),
                    user_id: 1,
                    plant_id: 1,
                    users: {
                        alias_id: 'test-alias',
                        name: 'Test User',
                        image: 'test.jpg',
                    },
                },
                {
                    id: 2,
                    type: EvaluationType.BAD,
                    comment: null,
                    created_at: new Date(),
                    user_id: 1,
                    plant_id: 1,
                    users: {
                        alias_id: 'test-alias',
                        name: 'Test User',
                        image: 'test.jpg',
                    },
                },
            ];

            const mockPets = [
                {
                    id: 1,
                    user_id: 1,
                    name: 'テストペット',
                    image: 'test.jpg',
                    created_at: new Date(),
                    neko_id: 1,
                    sex: SexType.MALE,
                    age: 3,
                    birthday: new Date(),
                    neko: {
                        id: 1,
                        name: 'テスト猫',
                    },
                },
                {
                    id: 2,
                    user_id: 1,
                    name: 'テストペット2',
                    image: null,
                    created_at: new Date(),
                    neko_id: 2,
                    sex: null,
                    age: null,
                    birthday: null,
                    neko: {
                        id: 2,
                        name: 'テスト猫2',
                    },
                },
            ];

            vi.mocked(prisma.evaluations.findMany).mockResolvedValue(mockEvaluations);
            vi.mocked(prisma.pets.findMany).mockResolvedValue(mockPets);
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
                storage: {
                    from: vi.fn().mockReturnValue({
                        list: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    name: 'test.jpg',
                                },
                            ],
                        }),
                    }),
                },
            } as unknown as SupabaseClient;
            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);

            const result = await getEvaluations(1);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                id: 1,
                type: EvaluationType.GOOD,
                comment: 'テストコメント1',
                createdAt: expect.any(Date),
                pets: [
                    {
                        id: 1,
                        name: 'テストペット',
                        imageSrc: 'http://localhost:54321/storage/v1/object/public/user_pets/test.jpg',
                        neko: {
                            id: 1,
                            name: 'テスト猫',
                        },
                    },
                    {
                        id: 2,
                        name: 'テストペット2',
                        imageSrc: undefined,
                        neko: {
                            id: 2,
                            name: 'テスト猫2',
                        },
                    },
                ],
                imageUrls: [
                    'http://localhost:54321/storage/v1/object/public/evaluations/1/test.jpg',
                ],
                user: {
                    aliasId: 'test-alias',
                    name: 'Test User',
                    imageSrc: 'http://localhost:54321/storage/v1/object/public/user_profiles/test.jpg',
                },

            });

            expect(prisma.evaluations.findMany).toHaveBeenCalledWith({
                where: { plant_id: 1 },
                include: {
                    users: {
                        select: {
                            alias_id: true,
                            name: true,
                            image: true,
                        },
                    },
                },
                orderBy: {
                    created_at: 'desc',
                },
            });
        });

        it('正常系 ペット0件', async () => {
            const mockEvaluations = [
                {
                    id: 1,
                    type: EvaluationType.GOOD,
                    comment: 'テストコメント1',
                    created_at: new Date(),
                    user_id: 1,
                    plant_id: 1,
                    users: {
                        alias_id: 'test-alias',
                        name: 'Test User',
                        image: null,
                    },
                },
                {
                    id: 2,
                    type: EvaluationType.BAD,
                    comment: null,
                    created_at: new Date(),
                    user_id: 1,
                    plant_id: 1,
                    users: {
                        alias_id: 'test-alias',
                        name: 'Test User',
                        image: null,
                    },
                },
            ];


            vi.mocked(prisma.evaluations.findMany).mockResolvedValue(mockEvaluations);
            vi.mocked(prisma.pets.findMany).mockResolvedValue([]);
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
                storage: {
                    from: vi.fn().mockReturnValue({
                        list: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    name: 'test.jpg',
                                },
                            ],
                        }),
                    }),
                },
            } as unknown as SupabaseClient;
            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);

            const result = await getEvaluations(1);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                id: 1,
                type: EvaluationType.GOOD,
                comment: 'テストコメント1',
                createdAt: expect.any(Date),
                pets: undefined,
                imageUrls: [
                    'http://localhost:54321/storage/v1/object/public/evaluations/1/test.jpg',
                ],
                user: {
                    aliasId: 'test-alias',
                    name: 'Test User',
                    imageSrc: undefined,
                },

            });
        });

        it('正常系 userのカラムがnull', async () => {
            const mockEvaluations = [
                {
                    id: 1,
                    type: EvaluationType.GOOD,
                    comment: 'テストコメント1',
                    created_at: new Date(),
                    user_id: 1,
                    plant_id: 1,
                    users: {
                        alias_id: null,
                        name: null,
                        image: null,
                    },
                },
                {
                    id: 2,
                    type: EvaluationType.BAD,
                    comment: null,
                    created_at: new Date(),
                    user_id: 1,
                    plant_id: 1,
                    users: {
                        alias_id: 'test-alias',
                        name: 'Test User',
                        image: null,
                    },
                },
            ];


            vi.mocked(prisma.evaluations.findMany).mockResolvedValue(mockEvaluations);
            vi.mocked(prisma.pets.findMany).mockResolvedValue([]);
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
                storage: {
                    from: vi.fn().mockReturnValue({
                        list: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    name: 'test.jpg',
                                },
                            ],
                        }),
                    }),
                },
            } as unknown as SupabaseClient;
            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);

            const result = await getEvaluations(1);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                id: 1,
                type: EvaluationType.GOOD,
                comment: 'テストコメント1',
                createdAt: expect.any(Date),
                pets: undefined,
                imageUrls: [
                    'http://localhost:54321/storage/v1/object/public/evaluations/1/test.jpg',
                ],
                user: {
                    aliasId: "",
                    name: "",
                    imageSrc: undefined,
                },

            });
        });

        it('正常系 userがnull', async () => {
            const mockEvaluations = [
                {
                    id: 1,
                    type: EvaluationType.GOOD,
                    comment: 'テストコメント1',
                    created_at: new Date(),
                    user_id: 1,
                    plant_id: 1,
                    users: null,
                },
                {
                    id: 2,
                    type: EvaluationType.BAD,
                    comment: null,
                    created_at: new Date(),
                    user_id: 1,
                    plant_id: 1,
                    users: {
                        alias_id: 'test-alias',
                        name: 'Test User',
                        image: null,
                    },
                },
            ];


            vi.mocked(prisma.evaluations.findMany).mockResolvedValue(mockEvaluations);
            vi.mocked(prisma.pets.findMany).mockResolvedValue([]);
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
                storage: {
                    from: vi.fn().mockReturnValue({
                        list: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    name: 'test.jpg',
                                },
                            ],
                        }),
                    }),
                },
            } as unknown as SupabaseClient;
            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);

            const result = await getEvaluations(1);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                id: 1,
                type: EvaluationType.GOOD,
                comment: 'テストコメント1',
                createdAt: expect.any(Date),
                pets: undefined,
                imageUrls: [
                    'http://localhost:54321/storage/v1/object/public/evaluations/1/test.jpg',
                ],
                user: {
                    aliasId: "",
                    name: "",
                    imageSrc: undefined,
                },

            });
        });

        it('評価が存在しない場合', async () => {
            vi.mocked(prisma.evaluations.findMany).mockResolvedValue([]);

            const result = await getEvaluations(1);

            expect(result).toHaveLength(0);
        });
    });

    describe('addEvaluation', () => {
        it('評価を追加できること', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
                storage: {
                    from: vi.fn().mockReturnValue({
                        upload: vi.fn().mockResolvedValue({
                            data: {
                                path: 'test.jpg',
                            },
                        }),
                    }),
                },
            } as unknown as SupabaseClient;

            const mockEvaluation = {
                id: 1,
                plant_id: 1,
                user_id: 1,
                comment: 'テストコメント',
                type: EvaluationType.GOOD,
                created_at: new Date(),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);
            vi.mocked(prisma.evaluations.create).mockResolvedValue(mockEvaluation);
            vi.mocked(prisma.$transaction).mockImplementation((callback) => {
                return Promise.resolve(callback(prisma as unknown as PrismaClient));
            });

            const result = await addEvaluation(1, 'テストコメント', EvaluationType.GOOD);

            expect(prisma.$transaction).toHaveBeenCalled();
            expect(prisma.evaluations.create).toHaveBeenCalledWith({
                data: {
                    plant_id: 1,
                    user_id: 1,
                    comment: 'テストコメント',
                    type: EvaluationType.GOOD,
                },
            });

            expect(result).toEqual({
                success: true,
                message: '評価を投稿しました。',
            });
        });

        it('未ログインの場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);

            expect(await addEvaluation(1, 'テストコメント', EvaluationType.GOOD))
                .toEqual({
                    success: false,
                    code: ActionErrorCode.AUTH_REQUIRED,
                    message: "ユーザーが見つかりません",
                });

        });

        it('usersデータがない場合', async () => {
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(null);
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);

            expect(await addEvaluation(1, 'テストコメント', EvaluationType.GOOD))
                .toEqual({
                    success: false,
                    code: ActionErrorCode.AUTH_REQUIRED,
                    message: "ユーザーが見つかりません",
                });

        });

        it('画像が3枚以上の場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);

            expect(await addEvaluation(1, 'テストコメント', EvaluationType.GOOD, [new File([], 'test.jpg'), new File([], 'test2.jpg'), new File([], 'test3.jpg'), new File([], 'test4.jpg')]))
                .toEqual({
                    success: false,
                    code: ActionErrorCode.VALIDATION_ERROR,
                    message: "最大3枚までしかアップロードできません。",
                });
        });

        it('評価の追加に失敗した場合はエラーを返すこと', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);
            vi.mocked(prisma.evaluations.create).mockRejectedValue(null);

            // await expect(addEvaluation(1, 'テストコメント', EvaluationType.GOOD))
            //     .rejects
            //     .toThrow('評価投稿に失敗しました。');
            expect(await addEvaluation(1, 'テストコメント', EvaluationType.GOOD))
                .toEqual({
                    success: false,
                    code: ActionErrorCode.INTERNAL_SERVER_ERROR,
                    message: "評価の投稿に失敗しました。",
                });
        });
    });

    describe('getEvalReAction', () => {
        it('評価へのリアクション一覧を取得できること', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);
            vi.mocked(prisma.evaluation_reactions.findMany).mockResolvedValue([
                {
                    id: 1,
                    type: EvaluationReActionType.GOOD,
                    created_at: new Date(),
                    evaluation_id: 1,
                    user_id: 1,
                    users: {
                        id: 1,
                    },
                },
                {
                    id: 2,
                    type: EvaluationReActionType.BAD,
                    created_at: new Date(),
                    evaluation_id: 1,
                    user_id: 2,
                    users: {
                        id: 2,
                    },
                },
            ]);

            const result = await getEvalReAction(1);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                id: 1,
                type: EvaluationReActionType.GOOD,
                isMine: true,
            });
            expect(result[1]).toEqual({
                id: 2,
                type: EvaluationReActionType.BAD,
                isMine: false,
            });

            expect(prisma.evaluation_reactions.findMany).toHaveBeenCalledWith({
                where: { evaluation_id: 1 },
                include: {
                    users: {
                        select: {
                            id: true,
                        },
                    },
                },
            });
        });

        it('未ログインの場合はisMineがfalseになること', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.evaluation_reactions.findMany).mockResolvedValue([
                {
                    id: 1,
                    type: EvaluationReActionType.GOOD,
                    created_at: new Date(),
                    evaluation_id: 1,
                    user_id: 2,
                    users: {
                        id: 2,
                        alias_id: 'test-alias2',
                        name: 'Test User2',
                        image: null,
                    },
                },
            ]);

            const result = await getEvalReAction(1);

            expect(result[0].isMine).toBe(false);
        });
    });

    describe('upsertReAction', () => {
        it('リアクションを追加できること', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);
            vi.mocked(prisma.evaluation_reactions.findFirst).mockResolvedValue(null);
            vi.mocked(prisma.evaluation_reactions.create).mockResolvedValue({
                id: 1,
                evaluation_id: 1,
                user_id: 1,
                type: EvaluationReActionType.GOOD,
                created_at: new Date(),
            });

            await upsertReAction(1, EvaluationReActionType.GOOD);

            expect(prisma.evaluation_reactions.create).toHaveBeenCalledWith({
                data: {
                    evaluation_id: 1,
                    user_id: 1,
                    type: EvaluationReActionType.GOOD,
                },
            });
        });

        it('既存のリアクションを更新できること', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);
            vi.mocked(prisma.evaluation_reactions.findFirst).mockResolvedValue({
                id: 1,
                evaluation_id: 1,
                user_id: 1,
                type: EvaluationReActionType.GOOD,
                created_at: new Date(),
            });
            vi.mocked(prisma.evaluation_reactions.update).mockResolvedValue({
                id: 1,
                evaluation_id: 1,
                user_id: 1,
                type: EvaluationReActionType.BAD,
                created_at: new Date(),
            });

            await upsertReAction(1, EvaluationReActionType.BAD);

            expect(prisma.evaluation_reactions.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    type: EvaluationReActionType.BAD,
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

            expect(await upsertReAction(1, EvaluationReActionType.GOOD))
                .toEqual({
                    success: false,
                    code: ActionErrorCode.AUTH_REQUIRED,
                    message: "ユーザーが見つかりません",
                });
        });
    });

    describe('deleteReAction', () => {
        it('リアクションを削除できること', async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
                },
            } as unknown as SupabaseClient;

            vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
            vi.mocked(prisma.public_users.findFirst).mockResolvedValue(mockPublicUser);
            vi.mocked(prisma.evaluation_reactions.deleteMany).mockResolvedValue({
                count: 1,
            });

            await deleteReAction(1);

            expect(prisma.evaluation_reactions.deleteMany).toHaveBeenCalledWith({
                where: {
                    evaluation_id: 1,
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

            await expect(deleteReAction(1))
                .rejects
                .toThrow('ユーザーが見つかりません');
        });
    });
}); 