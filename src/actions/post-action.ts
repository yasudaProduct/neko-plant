"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
    MAX_POST_COMMENT_LENGTH,
    MAX_POST_IMAGES,
    MAX_POST_PLANTS,
    STORAGE_PATH,
} from "@/lib/const";
import { isValidOwnedImagePath } from "@/lib/storage-path";
import { ActionErrorCode, ActionResult } from "@/types/common";
import { PlantCoexistence, Post, SiteStats } from "@/types/post";

/** ログイン中ユーザーの public.users レコードを取得する (未ログインなら null) */
async function getCurrentPublicUser() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    return prisma.public_users.findUnique({
        where: {
            auth_id: user.id,
        },
    });
}

/** 投稿の取得に共通で使う include (myUserId は likedByMe 判定用。未ログインは -1) */
function postInclude(myUserId: number) {
    return {
        users: {
            select: {
                id: true,
                alias_id: true,
                name: true,
                image: true,
            },
        },
        post_plants: {
            include: {
                plants: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { id: "asc" as const },
        },
        post_pets: {
            include: {
                pets: {
                    include: {
                        neko: true,
                    },
                },
            },
            orderBy: { id: "asc" as const },
        },
        post_images: {
            orderBy: { order: "asc" as const },
        },
        post_likes: {
            where: { user_id: myUserId },
            select: { id: true },
        },
        _count: {
            select: { post_likes: true },
        },
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToPost(post: any, myUserId: number, catCountMap: Map<number, number>): Post {
    return {
        id: post.id,
        comment: post.comment ?? undefined,
        createdAt: post.created_at,
        imageUrls: post.post_images.map((image: { image_url: string }) => STORAGE_PATH.POST + image.image_url),
        plants: post.post_plants.map((postPlant: { plants: { id: number, name: string } }) => ({
            id: postPlant.plants.id,
            name: postPlant.plants.name,
            catCount: catCountMap.get(postPlant.plants.id) ?? 0,
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pets: post.post_pets.map((postPet: any) => ({
            id: postPet.pets.id,
            name: postPet.pets.name,
            imageSrc: postPet.pets.image ? STORAGE_PATH.USER_PET + postPet.pets.image : undefined,
            neko: postPet.pets.neko ?? undefined,
        })),
        user: {
            aliasId: post.users.alias_id,
            name: post.users.name,
            imageSrc: post.users.image ? STORAGE_PATH.USER_PROFILE + post.users.image : undefined,
        },
        likeCount: post._count.post_likes,
        likedByMe: post.post_likes.length > 0,
        isMine: post.users.id === myUserId,
    };
}

/** 植物IDごとのユニーク共存猫数を一括取得 (投稿カードのバッジ用) */
async function fetchCatCountMap(plantIds: number[]): Promise<Map<number, number>> {
    if (plantIds.length === 0) {
        return new Map();
    }

    const rows = await prisma.$queryRaw<{ plant_id: number, cat_count: bigint }[]>(Prisma.sql`
        SELECT ppl.plant_id, COUNT(DISTINCT ppe.pet_id) AS cat_count
        FROM post_plants ppl
        LEFT JOIN post_pets ppe ON ppe.post_id = ppl.post_id
        WHERE ppl.plant_id IN (${Prisma.join(plantIds)})
        GROUP BY ppl.plant_id
    `);

    return new Map(rows.map((row) => [Number(row.plant_id), Number(row.cat_count)]));
}

async function findPosts(where: Prisma.postsWhereInput, page: number, pageSize: number): Promise<{ posts: Post[], totalCount: number }> {
    const me = await getCurrentPublicUser();
    const myUserId = me?.id ?? -1;

    const [totalCount, postsData] = await Promise.all([
        prisma.posts.count({ where }),
        prisma.posts.findMany({
            where,
            include: postInclude(myUserId),
            orderBy: { created_at: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);

    const plantIds = [...new Set(postsData.flatMap((post) => post.post_plants.map((postPlant) => postPlant.plant_id)))];
    const catCountMap = await fetchCatCountMap(plantIds);

    return {
        posts: postsData.map((post) => mapToPost(post, myUserId, catCountMap)),
        totalCount,
    };
}

/** フィード (新着順の全投稿) を取得する */
export async function getFeedPosts(page: number = 1, pageSize: number = 12): Promise<{ posts: Post[], totalCount: number }> {
    return findPosts({}, page, pageSize);
}

/** 植物に紐づく投稿を取得する (植物ページのギャラリー) */
export async function getPostsByPlant(plantId: number, page: number = 1, pageSize: number = 12): Promise<{ posts: Post[], totalCount: number }> {
    return findPosts({ post_plants: { some: { plant_id: plantId } } }, page, pageSize);
}

/** ユーザーの投稿を取得する (プロフィールの投稿グリッド) */
export async function getPostsByUser(userId: number, page: number = 1, pageSize: number = 12): Promise<{ posts: Post[], totalCount: number }> {
    return findPosts({ user_id: userId }, page, pageSize);
}

/** 投稿を検索する (植物名・コメント・猫種で絞り込み) */
export async function searchPosts(
    query: string,
    nekoSpeciesId?: number,
    page: number = 1,
    pageSize: number = 12
): Promise<{ posts: Post[], totalCount: number }> {
    const trimmedQuery = query?.trim() ?? "";

    const conditions: Prisma.postsWhereInput[] = [];

    if (trimmedQuery !== "") {
        conditions.push({
            OR: [
                { comment: { contains: trimmedQuery, mode: "insensitive" } },
                { post_plants: { some: { plants: { name: { contains: trimmedQuery, mode: "insensitive" } } } } },
            ],
        });
    }

    if (nekoSpeciesId != null) {
        conditions.push({
            post_pets: { some: { pets: { neko_id: nekoSpeciesId } } },
        });
    }

    return findPosts(conditions.length > 0 ? { AND: conditions } : {}, page, pageSize);
}

/** 投稿を1件取得する */
export async function getPost(postId: number): Promise<Post | undefined> {
    const me = await getCurrentPublicUser();
    const myUserId = me?.id ?? -1;

    const post = await prisma.posts.findUnique({
        where: { id: postId },
        include: postInclude(myUserId),
    });

    if (!post) {
        return undefined;
    }

    const catCountMap = await fetchCatCountMap(post.post_plants.map((postPlant) => postPlant.plant_id));

    return mapToPost(post, myUserId, catCountMap);
}

/** 植物の共存実績 (投稿数・ユニーク猫数) を集計する */
export async function getPlantCoexistence(plantId: number): Promise<PlantCoexistence> {
    const rows = await prisma.$queryRaw<{ post_count: bigint, cat_count: bigint }[]>(Prisma.sql`
        SELECT COUNT(DISTINCT ppl.post_id) AS post_count, COUNT(DISTINCT ppe.pet_id) AS cat_count
        FROM post_plants ppl
        LEFT JOIN post_pets ppe ON ppe.post_id = ppl.post_id
        WHERE ppl.plant_id = ${plantId}
    `);

    const row = rows[0];

    return {
        postCount: row ? Number(row.post_count) : 0,
        catCount: row ? Number(row.cat_count) : 0,
    };
}

/** サイト全体の集計 (投稿数・観測された猫数・収録植物数) */
export async function getSiteStats(): Promise<SiteStats> {
    const [postCount, catRows, plantCount] = await Promise.all([
        prisma.posts.count(),
        prisma.$queryRaw<{ cat_count: bigint }[]>(Prisma.sql`
            SELECT COUNT(DISTINCT pet_id) AS cat_count FROM post_pets
        `),
        prisma.plants.count(),
    ]);

    return {
        postCount,
        catCount: catRows[0] ? Number(catRows[0].cat_count) : 0,
        plantCount,
    };
}

export type CreatePostInput = {
    plantIds: number[];
    petIds: number[];
    comment?: string;
    /** クライアントが posts バケットへ直接アップロード済みの画像パス (表示順) */
    imagePaths: string[];
};

/** 投稿を作成する (写真1〜3枚 + 植物タグ + 猫タグ + コメント(任意)) */
export async function createPost(input: CreatePostInput): Promise<ActionResult<{ postId: number }>> {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ログインが必要です。" };
        }

        const userData = await prisma.public_users.findUnique({
            where: { auth_id: user.id },
        });

        if (!userData) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません。" };
        }

        // バリデーション
        if (!input.imagePaths || input.imagePaths.length === 0) {
            return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: "写真を1枚以上選択してください。" };
        }
        if (input.imagePaths.length > MAX_POST_IMAGES) {
            return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: `写真は最大${MAX_POST_IMAGES}枚までです。` };
        }
        if (new Set(input.imagePaths).size !== input.imagePaths.length) {
            return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: "画像の指定が不正です。" };
        }
        for (const imagePath of input.imagePaths) {
            if (!isValidOwnedImagePath(imagePath, userData.auth_id)) {
                return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: "画像の指定が不正です。" };
            }
        }
        if (!input.plantIds || input.plantIds.length === 0) {
            return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: "植物を1つ以上選択してください。" };
        }
        if (input.plantIds.length > MAX_POST_PLANTS) {
            return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: `植物は最大${MAX_POST_PLANTS}つまでです。` };
        }
        if (!input.petIds || input.petIds.length === 0) {
            return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: "写っている猫を選択してください。" };
        }
        if (input.comment && input.comment.length > MAX_POST_COMMENT_LENGTH) {
            return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: `コメントは${MAX_POST_COMMENT_LENGTH}文字以内で入力してください。` };
        }

        const plantIds = [...new Set(input.plantIds)];
        const petIds = [...new Set(input.petIds)];

        const [plantCount, myPetCount] = await Promise.all([
            prisma.plants.count({
                where: { id: { in: plantIds } },
            }),
            prisma.pets.count({
                where: {
                    id: { in: petIds },
                    user_id: userData.id,
                },
            }),
        ]);

        if (plantCount !== plantIds.length) {
            return { success: false, code: ActionErrorCode.NOT_FOUND, message: "植物が見つかりません。" };
        }

        // 猫タグは自分の飼い猫のみ許可
        if (myPetCount !== petIds.length) {
            return { success: false, code: ActionErrorCode.NOT_FOUND, message: "飼い猫が見つかりません。" };
        }

        let newPostId = 0;
        await prisma.$transaction(async (tx) => {
            const post = await tx.posts.create({
                data: {
                    user_id: userData.id,
                    comment: input.comment?.trim() || null,
                },
            });

            await tx.post_plants.createMany({
                data: plantIds.map((plantId) => ({
                    post_id: post.id,
                    plant_id: plantId,
                })),
            });

            await tx.post_pets.createMany({
                data: petIds.map((petId) => ({
                    post_id: post.id,
                    pet_id: petId,
                })),
            });

            // 画像はクライアントが {auth_id}/{uuid}/... へ直接アップロード済み。
            // パスの実在確認はしない (偽パスで壊れるのは本人の投稿の表示のみで、
            // 他人のパスはプレフィックス検証で拒否済み。list のコストに見合わない)。
            await tx.post_images.createMany({
                data: input.imagePaths.map((imagePath, i) => ({
                    post_id: post.id,
                    image_url: imagePath,
                    order: i,
                })),
            });

            newPostId = post.id;
        });

        revalidatePath("/");
        for (const plantId of plantIds) {
            revalidatePath(`/plants/${plantId}`);
        }
        revalidatePath(`/${userData.alias_id}`);

        return { success: true, message: "投稿しました。", data: { postId: newPostId } };
    } catch (error) {
        console.error("Error creating post:", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "投稿に失敗しました。" };
    }
}

/** 投稿を削除する (本人または管理者のみ) */
export async function deletePost(postId: number): Promise<ActionResult> {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ログインが必要です。" };
        }

        const userData = await prisma.public_users.findUnique({
            where: { auth_id: user.id },
        });

        if (!userData) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません。" };
        }

        const post = await prisma.posts.findUnique({
            where: { id: postId },
            include: {
                post_images: true,
                post_plants: { select: { plant_id: true } },
                users: { select: { alias_id: true } },
            },
        });

        if (!post) {
            return { success: false, code: ActionErrorCode.NOT_FOUND, message: "投稿が見つかりません。" };
        }

        if (post.user_id !== userData.id && userData.role !== "admin") {
            return { success: false, code: ActionErrorCode.NOT_FOUND, message: "投稿が見つかりません。" };
        }

        await prisma.posts.delete({
            where: { id: postId },
        });

        // ストレージの画像を削除 (他人の投稿を管理者が消す場合はポリシー上残るが、DB側は消える)
        if (post.post_images.length > 0) {
            const { error } = await supabase.storage
                .from("posts")
                .remove(post.post_images.map((image) => image.image_url));

            if (error) {
                console.error("Error deleting post images from storage:", error);
            }
        }

        revalidatePath("/");
        for (const postPlant of post.post_plants) {
            revalidatePath(`/plants/${postPlant.plant_id}`);
        }
        revalidatePath(`/${post.users.alias_id}`);

        return { success: true, message: "投稿を削除しました。" };
    } catch (error) {
        console.error("Error deleting post:", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "投稿の削除に失敗しました。" };
    }
}

/** いいねをトグルする */
export async function togglePostLike(postId: number): Promise<ActionResult<{ liked: boolean, likeCount: number }>> {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "いいねするにはログインしてください。" };
        }

        const userData = await prisma.public_users.findUnique({
            where: { auth_id: user.id },
        });

        if (!userData) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません。" };
        }

        const post = await prisma.posts.findUnique({
            where: { id: postId },
        });

        if (!post) {
            return { success: false, code: ActionErrorCode.NOT_FOUND, message: "投稿が見つかりません。" };
        }

        const existing = await prisma.post_likes.findUnique({
            where: {
                post_id_user_id: {
                    post_id: postId,
                    user_id: userData.id,
                },
            },
        });

        let liked: boolean;
        if (existing) {
            await prisma.post_likes.delete({
                where: { id: existing.id },
            });
            liked = false;
        } else {
            await prisma.post_likes.create({
                data: {
                    post_id: postId,
                    user_id: userData.id,
                },
            });
            liked = true;
        }

        const likeCount = await prisma.post_likes.count({
            where: { post_id: postId },
        });

        return { success: true, data: { liked, likeCount } };
    } catch (error) {
        console.error("Error toggling post like:", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "いいねに失敗しました。" };
    }
}
