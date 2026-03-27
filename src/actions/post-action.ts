"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_PATH } from "@/lib/const";
import { ActionErrorCode, ActionResult } from "@/types/common";
import { Post } from "@/types/post";
import { revalidatePath } from "next/cache";

async function getCurrentPublicUserId(): Promise<number | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const publicUser = await prisma.public_users.findFirst({
        where: { auth_id: user.id },
        select: { id: true },
    });
    return publicUser?.id ?? null;
}

function toPost(
    post: {
        id: number;
        comment: string | null;
        created_at: Date;
        post_images: { image_url: string }[];
        post_likes: { user_id: number }[];
        plants: { id: number; name: string };
        users: { alias_id: string; name: string; image: string | null };
        pets: { id: number; name: string; image: string | null; neko: { id: number; name: string; image: string | null } } | null;
    },
    currentUserId: number | null
): Post {
    return {
        id: post.id,
        comment: post.comment,
        createdAt: post.created_at,
        imageUrls: post.post_images.map((img) => STORAGE_PATH.POSTS + img.image_url),
        likeCount: post.post_likes.length,
        isLiked: currentUserId != null && post.post_likes.some((like) => like.user_id === currentUserId),
        user: {
            aliasId: post.users.alias_id,
            name: post.users.name,
            imageSrc: post.users.image ? STORAGE_PATH.USER_PROFILE + post.users.image : undefined,
        },
        plant: {
            id: post.plants.id,
            name: post.plants.name,
        },
        pet: post.pets
            ? {
                id: post.pets.id,
                name: post.pets.name,
                imageSrc: post.pets.image ? STORAGE_PATH.USER_PET + post.pets.image : undefined,
                neko: {
                    id: post.pets.neko.id,
                    name: post.pets.neko.name,
                },
            }
            : undefined,
    };
}

export async function getFeedPosts(
    page: number = 1,
    pageSize: number = 12
): Promise<{ posts: Post[]; totalCount: number }> {
    const currentUserId = await getCurrentPublicUserId();
    const [totalCount, postsData] = await Promise.all([
        prisma.posts.count(),
        prisma.posts.findMany({
            orderBy: { created_at: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
                post_images: { orderBy: { order: "asc" } },
                post_likes: { select: { user_id: true } },
                plants: { select: { id: true, name: true } },
                users: { select: { alias_id: true, name: true, image: true } },
                pets: { include: { neko: true } },
            },
        }),
    ]);
    return {
        totalCount,
        posts: postsData.map((post) => toPost(post, currentUserId)),
    };
}

export async function getPostsByPlantId(
    plantId: number,
    page: number = 1,
    pageSize: number = 20
): Promise<{ posts: Post[]; totalCount: number }> {
    const currentUserId = await getCurrentPublicUserId();
    const [totalCount, postsData] = await Promise.all([
        prisma.posts.count({ where: { plant_id: plantId } }),
        prisma.posts.findMany({
            where: { plant_id: plantId },
            orderBy: { created_at: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
                post_images: { orderBy: { order: "asc" } },
                post_likes: { select: { user_id: true } },
                plants: { select: { id: true, name: true } },
                users: { select: { alias_id: true, name: true, image: true } },
                pets: { include: { neko: true } },
            },
        }),
    ]);
    return {
        totalCount,
        posts: postsData.map((post) => toPost(post, currentUserId)),
    };
}

export async function createPost(
    plantId: number,
    petId: number | null,
    comment: string | null,
    images: File[]
): Promise<ActionResult<{ postId: number }>> {
    try {
        const currentUserId = await getCurrentPublicUserId();
        if (!currentUserId) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません" };
        }
        if (!images || images.length === 0) {
            return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: "画像を1枚以上選択してください。" };
        }
        if (images.length > 3) {
            return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: "最大3枚までしかアップロードできません。" };
        }
        const supabase = await createClient();

        const post = await prisma.posts.create({
            data: {
                plant_id: plantId,
                user_id: currentUserId,
                pet_id: petId ?? undefined,
                comment: comment?.trim() || null,
            },
        });

        for (let i = 0; i < images.length; i++) {
            const imageName = `${Date.now()}_${i + 1}`;
            const imagePath = `${post.id}/${imageName}`;
            const { error } = await supabase.storage.from("posts").upload(imagePath, images[i]);
            if (error) {
                throw new Error(error.message);
            }
            await prisma.post_images.create({
                data: {
                    post_id: post.id,
                    image_url: imagePath,
                    order: i,
                },
            });
        }

        revalidatePath("/");
        revalidatePath(`/plants/${plantId}`);
        return { success: true, message: "投稿しました。", data: { postId: post.id } };
    } catch (error) {
        console.error("createPost error", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "投稿に失敗しました。" };
    }
}

export async function deletePost(postId: number): Promise<ActionResult> {
    try {
        const currentUserId = await getCurrentPublicUserId();
        if (!currentUserId) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません" };
        }
        const post = await prisma.posts.findUnique({
            where: { id: postId },
            include: { post_images: true },
        });
        if (!post || post.user_id !== currentUserId) {
            return { success: false, code: ActionErrorCode.NOT_FOUND, message: "投稿が見つかりません。" };
        }
        const supabase = await createClient();
        const paths = post.post_images.map((img) => img.image_url);
        if (paths.length > 0) {
            await supabase.storage.from("posts").remove(paths);
        }
        await prisma.posts.delete({ where: { id: postId } });
        revalidatePath("/");
        return { success: true, message: "投稿を削除しました。" };
    } catch (error) {
        console.error("deletePost error", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "投稿の削除に失敗しました。" };
    }
}

export async function addLike(postId: number): Promise<ActionResult> {
    try {
        const currentUserId = await getCurrentPublicUserId();
        if (!currentUserId) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません" };
        }
        await prisma.post_likes.upsert({
            where: { post_id_user_id: { post_id: postId, user_id: currentUserId } },
            create: { post_id: postId, user_id: currentUserId },
            update: {},
        });
        revalidatePath("/");
        return { success: true, message: "いいねしました。" };
    } catch (error) {
        console.error("addLike error", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "いいねに失敗しました。" };
    }
}

export async function deleteLike(postId: number): Promise<ActionResult> {
    try {
        const currentUserId = await getCurrentPublicUserId();
        if (!currentUserId) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません" };
        }
        await prisma.post_likes.deleteMany({
            where: {
                post_id: postId,
                user_id: currentUserId,
            },
        });
        revalidatePath("/");
        return { success: true, message: "いいねを解除しました。" };
    } catch (error) {
        console.error("deleteLike error", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "いいね解除に失敗しました。" };
    }
}
