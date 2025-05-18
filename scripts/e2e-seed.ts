import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import prisma from '../src/lib/prisma';

async function main() {

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
    // auth_usersテーブルからユーザーを取得
    const authUser = await prisma.auth_users.findFirst({
        where: {
            email: e2eTestUserAddress,
        },
    });
    if (!authUser) {
        throw new Error('auth_users is not defined in environment variables');
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
            created_at: new Date(),
        },
        create: {
            auth_id: authUser.id,
            name: 'テストユーザー',
            alias_id: 'testuser',
            image: null,
        },
    });

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