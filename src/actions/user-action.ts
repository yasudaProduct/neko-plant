"use server";

import { Pet, SexType } from "@/types/neko";
import { Post } from "@/types/post";
import { UserProfile, UserData, UserRole } from "@/types/user";
import { STORAGE_PATH } from "@/lib/const";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { generateImageName } from "@/lib/utils";
import { pets } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { ActionErrorCode, ActionResult } from "@/types/common";
import { sex as PrismaSexType } from "@prisma/client";

export async function getUserProfile(aliasId: string): Promise<UserProfile | undefined> {
    const userData = await prisma.public_users.findFirst({
        select: {
            id: true,
            alias_id: true,
            auth_id: true,
            name: true,
            image: true,
        },
        where: {
            alias_id: aliasId,
        },
    });

    if (!userData) {
        return undefined;
    }

    return {
        id: userData.id,
        aliasId: userData.alias_id,
        authId: userData.auth_id,
        name: userData.name,
        imageSrc: userData.image ? STORAGE_PATH.USER_PROFILE + userData.image : undefined,
    };
}

export async function getUserProfileByAuthId(): Promise<UserProfile | undefined> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return undefined;
    }

    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!userData) {
        return undefined;
    }
    return {
        id: userData.id,
        aliasId: userData.alias_id,
        authId: userData.auth_id,
        name: userData.name,
        imageSrc: userData.image ? STORAGE_PATH.USER_PROFILE + userData.image : undefined,
    };
}

export async function getUserData(authId: string): Promise<UserData | null> {
    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: authId,
        },
    });

    if (!userData) {
        return null;
    }

    return {
        id: userData.id,
        aliasId: userData.alias_id,
        authId: userData.auth_id,
        name: userData.name,
        image: userData.image,
        role: (userData.role || 'user') as UserRole,
    };
}

export async function getUserPets(userId: number): Promise<Pet[] | undefined> {
    const petsData = await prisma.pets.findMany({
        where: {
            user_id: userId,
        },
        include: {
            neko: true,
        },
        orderBy: {
            id: "asc",
        },
    });

    if (petsData.length === 0) {
        return undefined;
    }

    return petsData.map((pet) => ({
        id: pet.id,
        name: pet.name,
        imageSrc: pet.image ? STORAGE_PATH.USER_PET + pet.image : undefined,
        neko: pet.neko,
        sex: pet.sex as SexType ?? undefined,
        birthday: pet.birthday ?? undefined,
        age: pet.age ?? undefined,
    }));
}

export async function updateUser(name: string, aliasId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("ユーザーが見つかりません。");
    }

    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!userData) {
        throw new Error("ユーザーが見つかりません");
    }

    if (name.length > 20) {
        throw new Error("名前は7文字以内で入力してください");
    }

    if (aliasId.length > 10) {
        throw new Error("ユーザーIDは10文字以内で入力してください");
    }

    if (!aliasId.match(/^[a-zA-Z]+$/)) {
        throw new Error("ユーザーIDは英数字で入力してください");
    }

    await prisma.public_users.update({
        where: {
            id: userData.id,
        },
        data: {
            name: name,
            alias_id: aliasId,
        },
    });

    revalidatePath(`/settings/profile`);
}

export async function updateUserImage(image: File) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("ユーザーが見つかりません");
    }

    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!userData) {
        throw new Error("ユーザーが見つかりません");
    }

    await prisma.$transaction(async (tx) => {
        const imageName = generateImageName("profile");
        const imagePath = `${userData.auth_id}/${imageName}`;

        const { error } = await supabase.storage
            .from("user_profiles")
            .upload(imagePath, image, {
                upsert: true,
            });

        if (error) {
            throw error;
        }

        await tx.public_users.update({
            where: {
                id: userData.id,
            },
            data: {
                image: imagePath,
            },
        });
    });

    revalidatePath(`/settings/profile`);
}

export async function addPet(name: string, speciesId: number, image?: File, sex?: SexType, birthday?: string, age?: number) {
    const supabase = await createClient();
    const {
        data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("ユーザーが見つかりません");
    }

    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!userData) {
        throw new Error("ユーザーが見つかりません");
    }

    await prisma.$transaction(async (tx) => {
        const neko = await tx.pets.create({
            data: {
                name: name,
                neko_id: speciesId,
                user_id: userData.id,
                sex: sex as PrismaSexType,
                age: age,
                birthday: birthday ? new Date(birthday) : undefined,
            } as pets,
        });

        if (image) {
            const imageSrc: string = `${userData.auth_id}/${neko.id}_${generateImageName("pet")}`;

            const { error } = await supabase.storage
                .from("user_pets")
                .upload(imageSrc, image, {
                    upsert: true,
                });

            if (error) {
                throw error;
            }

            await tx.pets.update({
                where: {
                    id: neko.id,
                },
                data: {
                    image: imageSrc,
                },
            });
        }
    });

    revalidatePath(`/${userData.alias_id}`);
}

export async function updatePet(petId: number, name: string, speciesId: number, image?: File, sex?: SexType, birthday?: string, age?: number): Promise<ActionResult> {
    const supabase = await createClient();
    const {
        data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return {
            success: false,
            code: ActionErrorCode.AUTH_REQUIRED,
            message: "ユーザーが見つかりません",
        };
    }

    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!userData) {
        return {
            success: false,
            code: ActionErrorCode.AUTH_REQUIRED,
            message: "ユーザーが見つかりません",
        };
    }

    try {
        await prisma.$transaction(async (tx) => {
            const pet = await tx.pets.findUnique({
                where: {
                    id: petId,
                    user_id: userData.id,
                },
            });

            if (!pet) {
                return {
                    success: false,
                    code: ActionErrorCode.NOT_FOUND,
                    message: "飼い猫が見つかりません",
                };
            }

            await tx.pets.update({
                where: {
                    id: petId,
                    user_id: userData.id,
                },
                data: {
                    name: name,
                    neko_id: speciesId,
                    sex: sex as PrismaSexType,
                    birthday: birthday ? new Date(birthday) : undefined,
                    age: age,
                },
            });

            if (image) {
                const imageSrc: string = `${userData.auth_id}/${petId}_${generateImageName("pet")}`;

                const { error } = await supabase.storage
                    .from("user_pets")
                    .upload(imageSrc, image, {
                        upsert: true,
                    });

                if (error) {
                    throw error;
                }

                await tx.pets.update({
                    where: {
                        id: petId,
                    },
                    data: {
                        image: imageSrc,
                    },
                });
            }
        });

        revalidatePath(`/${userData.alias_id}`);
        return {
            success: true,
            message: "飼い猫を更新しました",
        };

    } catch (error) {
        console.error(error);
        return {
            success: false,
            code: ActionErrorCode.INTERNAL_SERVER_ERROR,
            message: "飼い猫を更新できませんでした",
        };
    }
}

export async function deletePet(petId: number) {
    const supabase = await createClient();
    const {
        data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("ユーザーが見つかりません");
    }

    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!userData) {
        throw new Error("ユーザーが見つかりません");
    }

    const petData = await prisma.pets.delete({
        where: {
            id: petId,
            user_id: userData.id,
        },
    });

    revalidatePath(`/${userData.alias_id}`);

    return petData;
}

export async function getUserPosts(userId: number): Promise<Post[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let currentUserId: number | undefined;
    if (user) {
        const currentUser = await prisma.public_users.findFirst({
            where: { auth_id: user.id },
            select: { id: true },
        });
        currentUserId = currentUser?.id;
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

    return postsData.map((post) => ({
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
        imageUrls: post.post_images.map((img) => STORAGE_PATH.POST + img.image_url),
        likeCount: post.post_likes.length,
        isLiked: currentUserId
            ? post.post_likes.some((like) => like.user_id === currentUserId)
            : false,
        user: {
            aliasId: post.users?.alias_id ?? "",
            name: post.users?.name ?? "",
            imageSrc: post.users?.image ? STORAGE_PATH.USER_PROFILE + post.users.image : undefined,
        },
        plant: post.plants
            ? { id: post.plants.id, name: post.plants.name }
            : undefined,
    }));
}

export async function getUserPostImages(userId: number): Promise<{ id: number, postId: number, plantName: string, imageUrl: string, createdAt: Date }[]> {
    const postImages = await prisma.post_images.findMany({
        where: {
            posts: { user_id: userId },
        },
        include: {
            posts: {
                include: {
                    plants: { select: { id: true, name: true } },
                },
            },
        },
        orderBy: { id: "asc" },
    });

    return postImages.map((img) => ({
        id: img.id,
        postId: img.post_id,
        plantName: img.posts?.plants?.name ?? "",
        imageUrl: STORAGE_PATH.POST + img.image_url,
        createdAt: img.created_at,
    }));
}
