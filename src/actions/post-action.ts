"use server";

import prisma from "@/lib/prisma";
import { Post } from "@/types/post";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { STORAGE_PATH } from "@/lib/const";
import { generateImageName } from "@/lib/utils";
import { ActionErrorCode, ActionResult } from "@/types/common";
import { SexType } from "@/types/neko";

// 投稿一覧（フィード）
export async function getFeedPosts(
    page: number = 1,
    pageSize: number = 12
): Promise<{ posts: Post[]; totalCount: number }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let currentUserId: number | undefined;
    if (user) {
        const userData = await prisma.public_users.findFirst({
            where: { auth_id: user.id },
            select: { id: true },
        });
        currentUserId = userData?.id;
    }

    const [postsData, totalCount] = await Promise.all([
        prisma.posts.findMany({
            include: {
                users: { select: { alias_id: true, name: true, image: true } },
                plants: { select: { id: true, name: true } },
                pets: { include: { neko: true } },
                post_images: { orderBy: { order: "asc" } },
                post_likes: { select: { user_id: true } },
            },
            orderBy: { created_at: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.posts.count(),
    ]);

    return {
        posts: postsData.map((post) => mapToPost(post, currentUserId)),
        totalCount,
    };
}

// 植物別投稿一覧
export async function getPostsByPlantId(
    plantId: number,
    page: number = 1,
    pageSize: number = 12
): Promise<{ posts: Post[]; totalCount: number }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let currentUserId: number | undefined;
    if (user) {
        const userData = await prisma.public_users.findFirst({
            where: { auth_id: user.id },
            select: { id: true },
        });
        currentUserId = userData?.id;
    }

    const [postsData, totalCount] = await Promise.all([
        prisma.posts.findMany({
            where: { plant_id: plantId },
            include: {
                users: { select: { alias_id: true, name: true, image: true } },
                plants: { select: { id: true, name: true } },
                pets: { include: { neko: true } },
                post_images: { orderBy: { order: "asc" } },
                post_likes: { select: { user_id: true } },
            },
            orderBy: { created_at: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.posts.count({ where: { plant_id: plantId } }),
    ]);

    return {
        posts: postsData.map((post) => mapToPost(post, currentUserId)),
        totalCount,
    };
}

// ユーザー別投稿一覧
export async function getPostsByUserId(
    userId: number
): Promise<Post[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let currentUserId: number | undefined;
    if (user) {
        const userData = await prisma.public_users.findFirst({
            where: { auth_id: user.id },
            select: { id: true },
        });
        currentUserId = userData?.id;
    }

    const postsData = await prisma.posts.findMany({
        where: { user_id: userId },
        include: {
            users: { select: { alias_id: true, name: true, image: true } },
            plants: { select: { id: true, name: true } },
            pets: { include: { neko: true } },
            post_images: { orderBy: { order: "asc" } },
            post_likes: { select: { user_id: true } },
        },
        orderBy: { created_at: "desc" },
    });

    return postsData.map((post) => mapToPost(post, currentUserId));
}

// 投稿作成
export async function createPost(
    plantId: number,
    petId: number | null,
    comment: string | null,
    images: File[]
): Promise<ActionResult<{ postId: number }>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ログインが必要です" };
        }

        const userData = await prisma.public_users.findFirst({
            where: { auth_id: user.id },
        });

        if (!userData) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません" };
        }

        if (!plantId) {
            return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: "植物の指定が必要です" };
        }

        if (images.length > 5) {
            return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: "最大5枚までしかアップロードできません" };
        }

        let newPostId = 0;

        await prisma.$transaction(async (tx) => {
            const post = await tx.posts.create({
                data: {
                    user_id: userData.id,
                    plant_id: plantId,
                    pet_id: petId,
                    comment: comment,
                },
            });

            if (images.length > 0) {
                for (let i = 0; i < images.length; i++) {
                    const imageName = generateImageName("post");
                    const imagePath = `${post.id}/${imageName}`;

                    const { error } = await supabase.storage
                        .from("posts")
                        .upload(imagePath, images[i]);

                    if (error) {
                        throw new Error("画像のアップロードに失敗しました");
                    }

                    await tx.post_images.create({
                        data: {
                            post_id: post.id,
                            image_url: imagePath,
                            order: i,
                        },
                    });
                }
            }

            newPostId = post.id;
        });

        revalidatePath("/");
        revalidatePath(`/plants/${plantId}`);

        return { success: true, data: { postId: newPostId }, message: "投稿しました" };
    } catch (error) {
        console.error("Error creating post:", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "投稿に失敗しました" };
    }
}

// 投稿削除
export async function deletePost(postId: number): Promise<ActionResult> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ログインが必要です" };
        }

        const userData = await prisma.public_users.findFirst({
            where: { auth_id: user.id },
        });

        if (!userData) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません" };
        }

        const post = await prisma.posts.findUnique({
            where: { id: postId, user_id: userData.id },
            include: { post_images: true },
        });

        if (!post) {
            return { success: false, code: ActionErrorCode.NOT_FOUND, message: "投稿が見つかりません" };
        }

        // Storage 画像を削除
        for (const img of post.post_images) {
            await supabase.storage.from("posts").remove([img.image_url]);
        }

        await prisma.posts.delete({ where: { id: postId, user_id: userData.id } });

        revalidatePath("/");
        revalidatePath(`/plants/${post.plant_id}`);
        revalidatePath(`/${userData.alias_id}/posts`);

        return { success: true, message: "投稿を削除しました" };
    } catch (error) {
        console.error("Error deleting post:", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "投稿の削除に失敗しました" };
    }
}

// いいね追加
export async function addLike(postId: number): Promise<ActionResult> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ログインが必要です" };
        }

        const userData = await prisma.public_users.findFirst({
            where: { auth_id: user.id },
        });

        if (!userData) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません" };
        }

        await prisma.post_likes.create({
            data: { post_id: postId, user_id: userData.id },
        });

        revalidatePath("/");

        return { success: true };
    } catch (error) {
        console.error("Error adding like:", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "いいねに失敗しました" };
    }
}

// いいね削除
export async function deleteLike(postId: number): Promise<ActionResult> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ログインが必要です" };
        }

        const userData = await prisma.public_users.findFirst({
            where: { auth_id: user.id },
        });

        if (!userData) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません" };
        }

        await prisma.post_likes.deleteMany({
            where: { post_id: postId, user_id: userData.id },
        });

        revalidatePath("/");

        return { success: true };
    } catch (error) {
        console.error("Error deleting like:", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "いいねの削除に失敗しました" };
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToPost(post: any, currentUserId?: number): Post {
    return {
        id: post.id,
        comment: post.comment,
        createdAt: post.created_at,
        pet: post.pets
            ? {
                id: post.pets.id,
                name: post.pets.name,
                imageSrc: post.pets.image ? STORAGE_PATH.USER_PET + post.pets.image : undefined,
                neko: post.pets.neko,
                sex: post.pets.sex as SexType ?? undefined,
                birthday: post.pets.birthday ?? undefined,
                age: post.pets.age ?? undefined,
            }
            : undefined,
        imageUrls: post.post_images.map(
            (img: { image_url: string }) => STORAGE_PATH.POST + img.image_url
        ),
        likeCount: post.post_likes.length,
        isLiked: currentUserId
            ? post.post_likes.some((like: { user_id: number }) => like.user_id === currentUserId)
            : false,
        user: {
            aliasId: post.users?.alias_id ?? "",
            name: post.users?.name ?? "",
            imageSrc: post.users?.image ? STORAGE_PATH.USER_PROFILE + post.users.image : undefined,
        },
        plant: post.plants
            ? { id: post.plants.id, name: post.plants.name }
            : undefined,
    };
}
