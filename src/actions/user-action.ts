"use server";

import { Evaluation, EvaluationType } from "@/types/evaluation";
import { Pet, SexType } from "@/types/neko";
import { Plant } from "@/types/plant";
import { UserProfile } from "@/types/user";
import { STORAGE_PATH } from "@/lib/const";
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

        // 1. 画像をアップロード
        const { error } = await supabase.storage
            .from("user_profiles")
            .upload(imagePath, image, {
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

        // 画像をアップロード
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

            // 画像をアップロード
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

export async function getUserPlants(userId: number): Promise<Plant[] | undefined> {
    const plants = await prisma.plant_have.findMany({
        where: {
            user_id: userId,
        },
        include: {
            plants: {
                include: {
                    plant_images: {
                        orderBy: {
                            created_at: "asc",
                        },
                        take: 1,
                    },
                },
            },
        },
        orderBy: {
            id: "asc",
        },
    });

    return plants.map((plant) => ({
        id: plant.plant_id,
        name: plant.plants.name,
        mainImageUrl: plant.plants.plant_images?.[0]?.image_url ? STORAGE_PATH.PLANT + plant.plants.plant_images[0].image_url : undefined,
        isFavorite: false,
        isHave: true,
    }));
}

export async function deleteHavePlant(plantId: number) {
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

    await prisma.plant_have.deleteMany({
        where: {
            plant_id: plantId,
            user_id: userData.id,
        },
    });

    revalidatePath(`/${userData.alias_id}`);
}

export async function getUserEvaluations(userId: number): Promise<(Evaluation & { plant: Plant })[] | undefined> {
    const supabase = await createClient();

    const evaluations = await prisma.evaluations.findMany({
        where: {
            user_id: userId,
        },
        include: {
            plants: {
                include: {
                    plant_images: {
                        orderBy: {
                            created_at: "asc",
                        },
                        take: 1,
                    },
                },
            },
            users: true,
        },
        orderBy: {
            id: "asc",
        },
    });

    return await Promise.all(evaluations.map(async (evaluation) => ({
        id: evaluation.id,
        type: evaluation.type as EvaluationType,
        comment: evaluation.comment ?? "",
        createdAt: evaluation.created_at,
        imageUrls: (await supabase.storage.from("evaluations").list(
            `${evaluation.id}`, {
            sortBy: { column: 'name', order: 'desc' },
        })).data?.map(file => STORAGE_PATH.EVALUATION + `${evaluation.id}/${file.name}`),
        user: {
            aliasId: evaluation.users?.alias_id ?? "",
            name: evaluation.users?.name ?? "",
            imageSrc: evaluation.users?.image ? STORAGE_PATH.USER_PROFILE + evaluation.users.image : undefined,
        },
        plant: {
            id: evaluation.plants?.id,
            name: evaluation.plants?.name,
            mainImageUrl: evaluation.plants?.plant_images?.[0]?.image_url
                ? STORAGE_PATH.PLANT + evaluation.plants.plant_images[0].image_url
                : undefined,
            isFavorite: false,
            isHave: false,
        },
    })));
}

export async function getUserFavoritePlants(userId: number): Promise<Plant[] | undefined> {
    const favoritePlants = await prisma.plant_favorites.findMany({
        where: {
            user_id: userId,
        },
        include: {
            plants: {
                include: {
                    plant_images: {
                        orderBy: {
                            created_at: "asc",
                        },
                        take: 1,
                    },
                },
            },
        },
        orderBy: {
            id: "asc",
        },
    });

    return favoritePlants.map((favoritePlant) => ({
        id: favoritePlant.plant_id,
        name: favoritePlant.plants.name,
        mainImageUrl: favoritePlant.plants.plant_images?.[0]?.image_url ? STORAGE_PATH.PLANT + favoritePlant.plants.plant_images[0].image_url : undefined,
        isFavorite: true,
        isHave: false,
    }));
}

export async function deleteFavoritePlant(plantId: number) {
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

    await prisma.plant_favorites.deleteMany({
        where: {
            plant_id: plantId,
            user_id: userData.id,
        },
    });

    revalidatePath(`/${userData.alias_id}`);
}

export async function getUserPostImages(userId: number): Promise<({ id: number, plantId: number, plantName: string, imageUrl: string, createdAt: Date })[] | undefined> {
    const supabase = await createClient();
    const {
        data: { user }
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

    const plantImages = await prisma.plant_images.findMany({
        where: {
            user_id: userId,
        },
        include: {
            plants: true,
        },
        orderBy: {
            id: "asc",
        },
    });

    return plantImages.map((plantImage: { id: number, image_url: string, plant_id: number, created_at: Date, plants: { id: number, name: string } }) => ({
        id: plantImage.id,
        plantId: plantImage.plants.id,
        plantName: plantImage.plants.name,
        imageUrl: STORAGE_PATH.PLANT + plantImage.image_url,
        createdAt: plantImage.created_at,
    }));
}

export async function deletePostImage(postImageId: number): Promise<{ success: boolean }> {
    const supabase = await createClient();
    const {
        data: { user }
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

    try {

        await prisma.$transaction(async (prisma) => {

            // TODO 存在しなかったらplantImageはどうなる？
            const plantImage = await prisma.plant_images.delete({
                where: {
                    id: postImageId,
                    user_id: userData.id,
                },
            });

            const { error } = await supabase.storage.from("plants").remove([plantImage.image_url]);

            if (error) {
                throw error;
            }
        });

        revalidatePath(`/${userData.alias_id}`);

        return { success: true };

    } catch (error) {
        console.error(error);
        return { success: false, };
    }
}
