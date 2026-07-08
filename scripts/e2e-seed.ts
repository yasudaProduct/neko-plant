import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import prisma from '../src/lib/prisma';
import { createClient } from '@supabase/supabase-js';

export async function main() {
    // Supabase Admin Client
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const e2eTestUserAddress = process.env.E2E_TEST_USER_ADDRESS;
    const e2eTestUserPassword = process.env.E2E_TEST_USER_PASSWORD;
    if (!e2eTestUserAddress || !e2eTestUserPassword) {
        throw new Error('E2E_TEST_USER_ADDRESS or E2E_TEST_USER_PASSWORD is not defined in environment variables');
    }
    console.log('✉️E2E_TEST_USER_ADDRESS:', e2eTestUserAddress);

    // usersテーブル以外をtruncate
    await prisma.post_likes.deleteMany();
    await prisma.post_images.deleteMany();
    await prisma.post_pets.deleteMany();
    await prisma.post_plants.deleteMany();
    await prisma.posts.deleteMany();
    await prisma.pets.deleteMany();
    await prisma.neko.deleteMany();
    await prisma.plants.deleteMany();

    console.log(' => users');

    // Supabase APIでユーザーを作成または取得
    let authUser;

    // 既存のユーザーを確認
    const existingUser = await prisma.auth_users.findFirst({
        where: {
            email: e2eTestUserAddress,
        },
    });

    if (!existingUser) {
        console.log(' => テストユーザーをauth_usersに作成します');
        const { data: newUser, error } = await supabase.auth.signUp({
            email: e2eTestUserAddress,
            password: e2eTestUserPassword,
            options: {
                data: {
                    name: 'テストユーザー',
                    alias_id: 'testuser',
                    image: null,
                },
            },
        });

        if (error) {
            throw new Error(`Failed to create test user: ${error.message}`);
        }

        if (!newUser || !newUser.user) {
            throw new Error('Failed to create test user');
        }

        authUser = await prisma.auth_users.findFirst({
            where: {
                id: newUser.user.id,
            },
        });
    } else {
        authUser = existingUser;
    }

    if (!authUser) {
        throw new Error('Failed to create or find test user');
    }

    // public_users を auth_id で存在確認し、あれば update、なければ create
    const publicUser = await prisma.public_users.findFirst({
        where: {
            auth_id: authUser.id,
        },
    });

    let testUserId: number;
    if (publicUser) {
        await prisma.public_users.update({
            where: { id: publicUser.id },
            data: {
                name: 'テストユーザー',
                alias_id: 'testuser',
                image: null,
                role: 'user',
                created_at: new Date(),
            },
        });
        testUserId = publicUser.id;
    } else {
        const created = await prisma.public_users.create({
            data: {
                auth_id: authUser.id,
                name: 'テストユーザー',
                alias_id: 'testuser',
                image: null,
                role: 'user',
            },
        });
        testUserId = created.id;
    }

    // 管理者ユーザーの作成（E2E_TEST_ADMIN_ADDRESSが設定されている場合）
    const e2eTestAdminAddress = process.env.E2E_TEST_ADMIN_ADDRESS;
    const e2eTestAdminPassword = process.env.E2E_TEST_ADMIN_PASSWORD;
    if (e2eTestAdminAddress && e2eTestAdminPassword) {
        console.log('✉️E2E_TEST_ADMIN_ADDRESS:', e2eTestAdminAddress);

        let adminAuthUser;

        const existingAdminUser = await prisma.auth_users.findFirst({
            where: {
                email: e2eTestAdminAddress,
            },
        });

        if (!existingAdminUser) {
            console.log(' => 管理者ユーザーをauth_usersに作成します');
            const { data: newAdminUser, error } = await supabase.auth.signUp({
                email: e2eTestAdminAddress,
                password: e2eTestAdminPassword,
                options: {
                    data: {
                        name: 'テスト管理者',
                        alias_id: 'testadmin',
                        image: null,
                    },
                },
            });

            if (error) {
                throw new Error(`Failed to create admin user: ${error.message}`);
            }

            if (!newAdminUser || !newAdminUser.user) {
                throw new Error('Failed to create admin user');
            }

            adminAuthUser = await prisma.auth_users.findFirst({
                where: {
                    id: newAdminUser.user?.id,
                },
            });
        } else {
            adminAuthUser = existingAdminUser;
        }

        if (adminAuthUser) {
            const adminPublicUser = await prisma.public_users.findFirst({
                where: {
                    auth_id: adminAuthUser.id,
                },
            });

            if (adminPublicUser) {
                await prisma.public_users.update({
                    where: { id: adminPublicUser.id },
                    data: {
                        name: 'テスト管理者',
                        alias_id: 'testadmin',
                        image: null,
                        role: 'admin',
                        created_at: new Date(),
                    },
                });
            } else {
                await prisma.public_users.create({
                    data: {
                        auth_id: adminAuthUser.id,
                        name: 'テスト管理者',
                        alias_id: 'testadmin',
                        image: null,
                        role: 'admin',
                    },
                });
            }
            console.log(' => 管理者ユーザーを作成しました');
        }
    }

    console.log(' => neko');
    for (const sql of sqlDivision(readFileSync('./supabase/seeds/neko.sql', 'utf-8'))) {
        await prisma.$executeRawUnsafe(sql);
    }

    console.log(' => plants');
    for (const sql of sqlDivision(readFileSync('./supabase/seeds/plants.sql', 'utf-8'))) {
        await prisma.$executeRawUnsafe(sql);
    }

    // ---- フォトSNS用シード: 飼い猫・投稿・いいね ----
    console.log(' => pets');
    const nekoSpecies = await prisma.neko.findFirst({ orderBy: { id: 'asc' } });
    if (!nekoSpecies) {
        throw new Error('猫種マスタが空です');
    }

    const pet1 = await prisma.pets.create({
        data: { user_id: testUserId, neko_id: nekoSpecies.id, name: 'ミケ' },
    });
    const pet2 = await prisma.pets.create({
        data: { user_id: testUserId, neko_id: nekoSpecies.id, name: 'クロ' },
    });

    console.log(' => posts');
    const pakira = await prisma.plants.findFirst({ where: { name: 'パキラ' } });
    const monstera = await prisma.plants.findFirst({ where: { name: 'モンステラ' } });
    const seedPlants = [pakira, monstera].filter((plant) => plant != null);

    if (seedPlants.length > 0) {
        const imageBuffer = readFileSync('./e2e/fixtures/test-plant.png');

        const seedPosts = [
            {
                comment: 'パキラのとなりでお昼寝しています🐱🌿',
                plants: [seedPlants[0]],
                pets: [pet1, pet2],
                daysAgo: 1,
            },
            {
                comment: '観葉植物と猫、今日も平和です',
                plants: seedPlants,
                pets: [pet1],
                daysAgo: 3,
            },
            {
                comment: '窓際が2匹のお気に入りスポット',
                plants: [seedPlants[seedPlants.length - 1]],
                pets: [pet2],
                daysAgo: 7,
            },
        ];

        for (const seed of seedPosts) {
            const post = await prisma.posts.create({
                data: {
                    user_id: testUserId,
                    comment: seed.comment,
                    created_at: new Date(Date.now() - seed.daysAgo * 24 * 60 * 60 * 1000),
                },
            });

            await prisma.post_plants.createMany({
                data: seed.plants.map((plant) => ({ post_id: post.id, plant_id: plant!.id })),
            });
            await prisma.post_pets.createMany({
                data: seed.pets.map((pet) => ({ post_id: post.id, pet_id: pet.id })),
            });

            // 画像をアップロード (service roleはストレージRLSをバイパスする)
            const imagePath = `${authUser.id}/${post.id}/1_seed.png`;
            const { error: uploadError } = await supabase.storage
                .from('posts')
                .upload(imagePath, imageBuffer, { contentType: 'image/png', upsert: true });

            if (uploadError) {
                throw new Error(`Failed to upload seed post image: ${uploadError.message}`);
            }

            await prisma.post_images.create({
                data: { post_id: post.id, image_url: imagePath, order: 0 },
            });
        }

        console.log(` => ${seedPosts.length}件の投稿を作成しました`);
    } else {
        console.warn(' => シード植物(パキラ/モンステラ)が見つからないため投稿シードをスキップします');
    }

    console.log('✅ E2E用のテストデータを投入しました');
}

// 直接実行時のみ main() を起動（import 経由では起動しない）
const isDirectRun = ((): boolean => {
    // CJS 環境
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (global as any).require !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const req = require as unknown as { main?: unknown };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (req as any).main === module;
    }
    // ESM 環境
    // import.meta は ESM でのみ利用可能
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return typeof import.meta !== 'undefined' && import.meta.url === `file://${process.argv[1]}`;
})();

if (isDirectRun) {
    main()
        .catch((e) => {
            console.error(e);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}

function sqlDivision(sql: string): string[] {
    return sql.split(';').map(line => line.trim()).filter(line => line.length > 0);
}
