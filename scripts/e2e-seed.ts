import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import prisma from '../src/lib/prisma';
import { createClient } from '@supabase/supabase-js';

async function main() {
    // Supabase Admin Client
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const e2eTestUserAddress = process.env.E2E_TEST_USER_ADDRESS;
    if (!e2eTestUserAddress) {
        throw new Error('E2E_TEST_USER_ADDRESS is not defined in environment variables');
    }
    console.log('✉️E2E_TEST_USER_ADDRESS:', e2eTestUserAddress);

    // usersテーブル以外をtruncate
    await prisma.evaluation_reactions.deleteMany();
    await prisma.plant_images.deleteMany();
    await prisma.plant_have.deleteMany();
    await prisma.plant_favorites.deleteMany();
    await prisma.evaluations.deleteMany();
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
        // Supabase Admin APIでユーザーを作成
        const { data: newUser, error } = await supabase.auth.admin.createUser({
            user_metadata: {
                name: 'テストユーザー',
                alias_id: 'testuser',
                image: null,
            },
            email: e2eTestUserAddress,
            password: 'test-password-123', // テスト用の固定パスワード
            email_confirm: true,
        });

        if (error) {
            throw new Error(`Failed to create test user: ${error.message}`);
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

    // public_usersテーブルからユーザーを取得
    const publicUser = await prisma.public_users.findFirst({
        where: {
            auth_id: authUser.id,
        },
    });

    // public_usersテーブルはupsert
    await prisma.public_users.upsert({
        where: { id: publicUser?.id, auth_id: authUser.id },
        update: {
            name: 'テストユーザー',
            alias_id: 'testuser',
            image: null,
            role: 'user',
            created_at: new Date(),
        },
        create: {
            auth_id: authUser.id,
            name: 'テストユーザー',
            alias_id: 'testuser',
            image: null,
            role: 'user',
        },
    });

    // 管理者ユーザーの作成（E2E_TEST_ADMIN_ADDRESSが設定されている場合）
    const e2eTestAdminAddress = process.env.E2E_TEST_ADMIN_ADDRESS;
    if (e2eTestAdminAddress) {
        console.log('✉️E2E_TEST_ADMIN_ADDRESS:', e2eTestAdminAddress);

        let adminAuthUser;

        // 既存の管理者ユーザーを確認
        const existingAdminUser = await prisma.auth_users.findFirst({
            where: {
                email: e2eTestAdminAddress,
            },
        });

        if (!existingAdminUser) {
            console.log(' => 管理者ユーザーをauth_usersに作成します');
            // Supabase Admin APIで管理者ユーザーを作成
            const { data: newAdminUser, error } = await supabase.auth.admin.createUser({
                user_metadata: {
                    name: 'テスト管理者',
                    alias_id: 'testadmin',
                    image: null,
                    role: 'admin',
                },
                email: e2eTestAdminAddress,
                password: 'admin-password-123', // テスト用の固定パスワード
                email_confirm: true,
            });

            if (error) {
                throw new Error(`Failed to create admin user: ${error.message}`);
            }

            adminAuthUser = await prisma.auth_users.findFirst({
                where: {
                    id: newAdminUser.user.id,
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

            await prisma.public_users.upsert({
                where: { id: adminPublicUser?.id, auth_id: adminAuthUser.id },
                update: {
                    name: 'テスト管理者',
                    alias_id: 'testadmin',
                    image: null,
                    role: 'admin',
                    created_at: new Date(),
                },
                create: {
                    auth_id: adminAuthUser.id,
                    name: 'テスト管理者',
                    alias_id: 'testadmin',
                    image: null,
                    role: 'admin',
                },
            });
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

    console.log('✅ E2E用のテストデータを投入しました');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

function sqlDivision(sql: string): string[] {
    return sql.split(';').map(line => line.trim()).filter(line => line.length > 0);
}