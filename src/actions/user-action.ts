"use server";

import { Pet, SexType } from "@/types/neko";
import { UserProfile, UserData, UserRole } from "@/types/user";
import { UserPlantCollectionItem, UserStats } from "@/types/post";
import { STORAGE_PATH } from "@/lib/const";
import { stripImageMetadata } from "@/lib/image";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { generateImageName } from "@/lib/utils";
import { pets } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { ActionErrorCode, ActionResult } from "@/types/common";

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

    // TODO public_usersのテーブルにデータがない場合は登録ページに飛ばしてもいい
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
    const pets = await prisma.pets.findMany({
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

    if (pets.length === 0) {
        return undefined;
    }

    return pets.map((pet) => ({
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

    // 入力チェック
    if (name.length > 20) {
        throw new Error("名前は7文字以内で入力してください");
    }

    if (aliasId.length > 10) {
        throw new Error("ユーザーIDは10文字以内で入力してください");
    }

    if (!aliasId.match(/^[a-zA-Z]+$/)) {
        throw new Error("ユーザーIDは英数字で入力してください");
    }
    // ユーザー情報を更新
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

    await prisma.$transaction(async (prisma) => {

        const imageName = generateImageName("profile");
        const imagePath = `${userData.auth_id}/${imageName}`;

        // 1. メタデータ (Exif) を除去して画像をアップロード
        const processed = await stripImageMetadata(image);
        const { error } = await supabase.storage
            .from("user_profiles")
            .upload(imagePath, processed.buffer, {
                contentType: processed.contentType,
                upsert: true,
            });

        if (error) {
            throw error;
        }

        // 2. ユーザーの画像を更新
        await prisma.public_users.update({
            where: {
                id: userData.id,
            },
            data: {
                image: imagePath,
            },
        });
    })

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

    // TODO userIdを取得するのめんどくさくない？ authIdをpublic_usersの主キーにした方がいい？

    if (!userData) {
        throw new Error("ユーザーが見つかりません");
    }

    await prisma.$transaction(async (prisma) => {

        // ネコを作成
        const neko = await prisma.pets.create({
            data: {
                name: name,
                neko_id: speciesId,
                user_id: userData.id,
                sex: sex as SexType,
                age: age,
                birthday: birthday ? new Date(birthday) : undefined,
            } as pets,
        });

        // 画像をアップロード (メタデータは除去する)
        if (image) {

            const imageSrc: string = `${userData.auth_id}/${neko.id}_${generateImageName("pet")}`;

            const processed = await stripImageMetadata(image);
            const { error } = await supabase.storage
                .from("user_pets")
                .upload(imageSrc, processed.buffer, {
                    contentType: processed.contentType,
                    upsert: true,
                });

            if (error) {
                throw error;
            }

            // 画像のURLを更新
            await prisma.pets.update({
                where: {
                    id: neko.id,
                },
                data: {
                    image: imageSrc,
                },
            });
        }
    })

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

    // TODO userIdを取得するのめんどくさくない？ authIdをpublic_usersの主キーにした方がいい？

    if (!userData) {
        return {
            success: false,
            code: ActionErrorCode.AUTH_REQUIRED,
            message: "ユーザーが見つかりません",
        };
    }

    try {
        await prisma.$transaction(async (prisma) => {

            // ネコを更新
            const pet = await prisma.pets.findUnique({
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

            await prisma.pets.update({
                where: {
                    id: petId,
                    user_id: userData.id,
                },
                data: {
                    name: name,
                    neko_id: speciesId,
                    sex: sex as SexType,
                    birthday: birthday ? new Date(birthday) : undefined,
                    age: age,
                },
            });

            // 画像をアップロード (メタデータは除去する)
            if (image) {

                const imageSrc: string = `${userData.auth_id}/${petId}_${generateImageName("pet")}`;

                const processed = await stripImageMetadata(image);
                const { error } = await supabase.storage
                    .from("user_pets")
                    .upload(imageSrc, processed.buffer, {
                        contentType: processed.contentType,
                        upsert: true,
                    });

                if (error) {
                    throw error;
                }

                // 画像のURLを更新
                await prisma.pets.update({
                    where: {
                        id: petId,
                    },
                    data: {
                        image: imageSrc,
                    },
                });
            }
        })

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

/** 投稿から自動集計した「一緒に暮らしている植物」コレクションを取得する */
export async function getUserPlantCollection(userId: number): Promise<UserPlantCollectionItem[]> {
    const grouped = await prisma.$queryRaw<{ plant_id: number, post_count: bigint, cat_count: bigint, latest: Date }[]>(Prisma.sql`
        SELECT ppl.plant_id,
               COUNT(DISTINCT ppl.post_id) AS post_count,
               COUNT(DISTINCT ppe.pet_id) AS cat_count,
               MAX(po.created_at) AS latest
        FROM post_plants ppl
        JOIN posts po ON po.id = ppl.post_id
        LEFT JOIN post_pets ppe ON ppe.post_id = ppl.post_id
        WHERE po.user_id = ${userId}
        GROUP BY ppl.plant_id
        ORDER BY latest DESC
    `);

    if (grouped.length === 0) {
        return [];
    }

    const plantIds = grouped.map((group) => Number(group.plant_id));

    // 各植物の最新投稿画像 (このユーザーの投稿のみ) を取得
    const plants = await prisma.plants.findMany({
        where: {
            id: { in: plantIds },
        },
        include: {
            post_plants: {
                where: { posts: { user_id: userId } },
                orderBy: { posts: { created_at: "desc" } },
                take: 1,
                include: {
                    posts: {
                        include: {
                            post_images: {
                                orderBy: { order: "asc" },
                                take: 1,
                            },
                        },
                    },
                },
            },
        },
    });

    const plantsMap = new Map(plants.map((plant) => [plant.id, plant]));

    return grouped.map((group) => {
        const plant = plantsMap.get(Number(group.plant_id));
        const latestImage = plant?.post_plants?.[0]?.posts?.post_images?.[0]?.image_url;

        return {
            plantId: Number(group.plant_id),
            plantName: plant?.name ?? "",
            mainImageUrl: latestImage ? STORAGE_PATH.POST + latestImage : undefined,
            postCount: Number(group.post_count),
            catCount: Number(group.cat_count),
            latestPostAt: group.latest ?? new Date(0),
        };
    });
}

/** プロフィールに表示する集計 (投稿数・猫数・植物数) を取得する */
export async function getUserStats(userId: number): Promise<UserStats> {
    const [postCount, petCount, plantRows] = await Promise.all([
        prisma.posts.count({
            where: { user_id: userId },
        }),
        prisma.pets.count({
            where: { user_id: userId },
        }),
        prisma.post_plants.findMany({
            where: { posts: { user_id: userId } },
            distinct: ["plant_id"],
            select: { plant_id: true },
        }),
    ]);

    return { postCount, petCount, plantCount: plantRows.length };
}
