import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import prisma from '../src/lib/prisma';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type SeededUser = {
    userId: number;
    authId: string;
    aliasId: string;
};

/**
 * auth.users にユーザーが無ければ signUp で作成し、public.users を upsert する。
 * トリガーで public.users が自動生成されるため、name/alias_id/role を確定させる。
 */
async function ensureUser(
    supabase: SupabaseClient,
    params: { email: string; password: string; name: string; aliasId: string; role: 'user' | 'admin' }
): Promise<SeededUser> {
    let authUser = await prisma.auth_users.findFirst({ where: { email: params.email } });

    if (!authUser) {
        const { data, error } = await supabase.auth.signUp({
            email: params.email,
            password: params.password,
            options: {
                data: { name: params.name, alias_id: params.aliasId, image: null },
            },
        });
        if (error) throw new Error(`Failed to create user ${params.email}: ${error.message}`);
        if (!data?.user) throw new Error(`Failed to create user ${params.email}`);
        authUser = await prisma.auth_users.findFirst({ where: { id: data.user.id } });
    }

    if (!authUser) throw new Error(`Failed to create or find user ${params.email}`);

    const existing = await prisma.public_users.findFirst({ where: { auth_id: authUser.id } });
    const data = {
        name: params.name,
        alias_id: params.aliasId,
        image: null,
        role: params.role,
    };

    let userId: number;
    if (existing) {
        await prisma.public_users.update({ where: { id: existing.id }, data });
        userId = existing.id;
    } else {
        const created = await prisma.public_users.create({ data: { auth_id: authUser.id, ...data } });
        userId = created.id;
    }

    return { userId, authId: authUser.id, aliasId: params.aliasId };
}

/** 接続先がローカルSupabase以外なら中断する (全テーブルdeleteManyを含むため本番誤実行を防ぐ) */
function assertLocalTarget() {
    const targets = [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.DATABASE_URL];
    for (const url of targets) {
        if (!url) continue;
        const host = new URL(url).hostname;
        if (host !== 'localhost' && host !== '127.0.0.1') {
            throw new Error(
                `E2Eシードはローカル環境専用です。接続先がローカルではありません: ${host}`
            );
        }
    }
}

export async function main() {
    assertLocalTarget();

    // 認証用クライアント: signUp するとセッションがそのユーザーに切り替わる
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    // ストレージ用クライアント: signUp を一切行わないので Authorization は常に service_role
    // （= ストレージRLSをバイパスして任意ユーザーのフォルダにアップロードできる）
    const storage = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const testUserAddress = process.env.E2E_TEST_USER_ADDRESS;
    const testUserPassword = process.env.E2E_TEST_USER_PASSWORD;
    if (!testUserAddress || !testUserPassword) {
        throw new Error('E2E_TEST_USER_ADDRESS or E2E_TEST_USER_PASSWORD is not defined in environment variables');
    }

    // usersテーブル以外をtruncate（投稿系→ペット→マスタの順で依存関係を解消）
    await prisma.post_likes.deleteMany();
    await prisma.post_images.deleteMany();
    await prisma.post_pets.deleteMany();
    await prisma.post_plants.deleteMany();
    await prisma.posts.deleteMany();
    await prisma.pets.deleteMany();
    await prisma.neko.deleteMany();
    await prisma.plants.deleteMany();

    console.log(' => users');
    const testUser = await ensureUser(supabase, {
        email: testUserAddress,
        password: testUserPassword,
        name: 'テストユーザー',
        aliasId: 'testuser',
        role: 'user',
    });

    // 管理者ユーザー（設定されている場合のみ）
    const adminAddress = process.env.E2E_TEST_ADMIN_ADDRESS;
    const adminPassword = process.env.E2E_TEST_ADMIN_PASSWORD;
    if (adminAddress && adminPassword) {
        await ensureUser(supabase, {
            email: adminAddress,
            password: adminPassword,
            name: 'テスト管理者',
            aliasId: 'testadmin',
            role: 'admin',
        });
        console.log(' => 管理者ユーザーを作成しました');
    }

    // 他ユーザー閲覧フロー（M6）検証用の第2ユーザー
    const otherUser = await ensureUser(supabase, {
        email: 'sakura@example.com',
        password: 'password',
        name: 'さくら',
        aliasId: 'sakura',
        role: 'user',
    });

    console.log(' => neko / plants');
    for (const sql of sqlDivision(readFileSync('./supabase/seeds/neko.sql', 'utf-8'))) {
        await prisma.$executeRawUnsafe(sql);
    }
    for (const sql of sqlDivision(readFileSync('./supabase/seeds/plants.sql', 'utf-8'))) {
        await prisma.$executeRawUnsafe(sql);
    }

    console.log(' => pets');
    const nekoSpecies = await prisma.neko.findFirst({ orderBy: { id: 'asc' } });
    if (!nekoSpecies) throw new Error('猫種マスタが空です');

    const mike = await prisma.pets.create({
        data: { user_id: testUser.userId, neko_id: nekoSpecies.id, name: 'ミケ' },
    });
    const kuro = await prisma.pets.create({
        data: { user_id: testUser.userId, neko_id: nekoSpecies.id, name: 'クロ' },
    });
    const tama = await prisma.pets.create({
        data: { user_id: otherUser.userId, neko_id: nekoSpecies.id, name: 'たま' },
    });

    console.log(' => posts');
    const pakira = await prisma.plants.findFirst({ where: { name: 'パキラ' } });
    const monstera = await prisma.plants.findFirst({ where: { name: 'モンステラ' } });
    if (!pakira || !monstera) {
        console.warn(' => シード植物(パキラ/モンステラ)が見つからないため投稿シードをスキップします');
        console.log('✅ E2E用のテストデータを投入しました');
        return;
    }

    const imageBuffer = readFileSync('./e2e/fixtures/test-plant.png');

    // created_at の新しい順: post1 → sakuraPost → post2 → post3
    const seedPosts: {
        owner: SeededUser;
        comment: string;
        plantIds: number[];
        petIds: number[];
        daysAgo: number;
    }[] = [
        {
            owner: testUser,
            comment: 'パキラのとなりでお昼寝しています🐱🌿',
            plantIds: [pakira.id],
            petIds: [mike.id, kuro.id],
            daysAgo: 1,
        },
        {
            owner: otherUser,
            comment: 'さくらの部屋のモンステラと、たま🌿',
            plantIds: [monstera.id],
            petIds: [tama.id],
            daysAgo: 2,
        },
        {
            owner: testUser,
            comment: '観葉植物と猫、今日も平和です',
            plantIds: [pakira.id, monstera.id],
            petIds: [mike.id],
            daysAgo: 3,
        },
        {
            owner: testUser,
            comment: '窓際が2匹のお気に入りスポット',
            plantIds: [monstera.id],
            petIds: [kuro.id],
            daysAgo: 7,
        },
    ];

    for (const seed of seedPosts) {
        const post = await prisma.posts.create({
            data: {
                user_id: seed.owner.userId,
                comment: seed.comment,
                created_at: new Date(Date.now() - seed.daysAgo * 24 * 60 * 60 * 1000),
            },
        });

        await prisma.post_plants.createMany({
            data: seed.plantIds.map((plantId) => ({ post_id: post.id, plant_id: plantId })),
        });
        await prisma.post_pets.createMany({
            data: seed.petIds.map((petId) => ({ post_id: post.id, pet_id: petId })),
        });

        // 画像は投稿者の auth フォルダ配下に置く（service roleはストレージRLSをバイパス）
        const imagePath = `${seed.owner.authId}/${post.id}/1_seed.png`;
        const { error: uploadError } = await storage.storage
            .from('posts')
            .upload(imagePath, imageBuffer, { contentType: 'image/png', upsert: true });
        if (uploadError) throw new Error(`Failed to upload seed post image: ${uploadError.message}`);

        await prisma.post_images.create({
            data: { post_id: post.id, image_url: imagePath, order: 0 },
        });
    }

    console.log(` => ${seedPosts.length}件の投稿を作成しました`);
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
