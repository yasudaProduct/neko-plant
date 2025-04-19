"use server";

import prisma from "@/lib/prisma";
import { Plant } from "../types/plant";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_PATH } from "@/lib/const";
import { generateImageName } from "@/lib/utils";
import { ActionErrorCode, ActionParams, ActionResult } from "@/types/common";
import { revalidatePath } from "next/cache";

export async function getPlants(
    sortBy: string = 'name',
    page: number = 1,
    pageSize: number = 9
): Promise<{ plants: Plant[], totalCount: number }> {
    // 総件数を取得
    const totalCount = await prisma.plants.count();

    // ページングを適用してデータを取得
    const plantsData = await prisma.plants.findMany({
        include: {
            plant_images: {
                orderBy: {
                    order: 'asc',
                },
                take: 1,
            },
        },
        orderBy: getSortOption(sortBy),
        skip: (page - 1) * pageSize,
        take: pageSize,
    });

    const plants: Plant[] = plantsData.map((plant) => ({
        id: plant.id,
        name: plant.name,
        mainImageUrl: plant.plant_images && plant.plant_images.length > 0 ? STORAGE_PATH.PLANT + plant.plant_images[0].image_url : undefined,
        isFavorite: false,
        isHave: false,
    }));

    return { plants, totalCount };
}

export async function searchPlants(
    query: string,
    sortBy: string = 'name',
    page: number = 1,
    pageSize: number = 9
): Promise<{ plants: Plant[], totalCount: number }> {
    if (!query || query.trim() === '') {
        return getPlants(sortBy, page, pageSize);
    }

    // 検索条件に一致する総件数を取得
    const totalCount = await prisma.plants.count({
        where: {
            name: {
                contains: query,
                mode: 'insensitive',
            },
        },
    });

    // ページングを適用してデータを取得
    const plantsData = await prisma.plants.findMany({
        where: {
            name: {
                contains: query,
                mode: 'insensitive', // 大文字小文字を区別しない
            },
        },
        include: {
            plant_images: {
                orderBy: {
                    order: 'asc',
                },
                take: 1,
            },
        },
        orderBy: getSortOption(sortBy),
        skip: (page - 1) * pageSize,
        take: pageSize,
    });

    const plants: Plant[] = plantsData.map((plant) => ({
        id: plant.id,
        name: plant.name,
        mainImageUrl: plant.plant_images && plant.plant_images.length > 0 ? STORAGE_PATH.PLANT + plant.plant_images[0].image_url : undefined,
        isFavorite: false,
        isHave: false,
    }));

    return { plants, totalCount };
}

export async function searchPlantName(name: string): Promise<{ id: number, name: string }[]> {
    const plants = await prisma.plants.findMany({
        where: {
            name: {
                contains: name,
            },
        },
        select: {
            id: true,
            name: true,
        },
    });

    return plants.map((plant) => ({ id: plant.id, name: plant.name }));
}

export async function getPlant(id: number): Promise<Plant | undefined> {
    const supabase = await createClient();

    const plant = await prisma.plants.findUnique({
        where: { id: id },
    });
    if (!plant) {
        return undefined;
    }

    // 認証ユーザーの場合はfavoriteとhaveを取得
    let isFavorite = false
    let isHave = false
    const { data: { user } } = await supabase.auth.getUser();
    if (user != null) {

        const publicUser = await prisma.public_users.findFirst({
            where: {
                auth_id: user.id,
            },
        });

        const favorite = await prisma.plant_favorites.findFirst({
            where: {
                user_id: publicUser!.id,
                plant_id: id,
            },
        });
        isFavorite = favorite != null

        const have = await prisma.plant_have.findFirst({
            where: {
                user_id: publicUser!.id,
                plant_id: id,
            },
        });
        isHave = have != null
    }

    return {
        id: plant.id,
        name: plant.name,
        mainImageUrl: plant.image_src ? STORAGE_PATH.PLANT + plant.image_src : undefined,
        isFavorite: isFavorite,
        isHave: isHave,
    };
}

export async function getPlantImages(id: number): Promise<string[] | undefined> {

    const plant_images = await prisma.plant_images.findMany({
        select: {
            image_url: true,
        },
        where: {
            plant_id: id,
        },
        orderBy: {
            order: 'asc'
        },
    });

    return plant_images && plant_images.length > 0
        ? plant_images.map((image: { image_url: string }) => STORAGE_PATH.PLANT + image.image_url)
        : undefined;
}

export async function addPlant(name: string, image?: File): Promise<ActionResult<{ plantId: number }>> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (user == null) {
        return { success: false, code: ActionErrorCode.AUTH_REQUIRED };
    }

    if (!name) {
        return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: "植物の名前は必須です。" };
    }

    if (name.length > 50) {
        return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: "植物の名前は50文字以内で入力してください。" };
    }

    // チェック
    // 1. 植物名が重複していないか
    const existingPlant = await prisma.plants.findFirst({
        where: {
            name: name
        },
    });
    if (existingPlant) {
        return { success: false, code: ActionErrorCode.ALREADY_EXISTS, message: "植物名が重複しています。", data: { plantId: existingPlant.id } };
    }

    try {
        let newPlantId: number = 0;
        await prisma.$transaction(async (prisma) => {

            // 1. 植物を登録
            const plant = await prisma.plants.create({
                data: {
                    name: name,
                },
            });

            const imagePath = image ? `${plant.id.toString()}/${generateImageName("plant")}` : undefined;

            // 2. 画像をアップロード
            if (image) {
                const { error: imageError } = await supabase.storage
                    .from("plants")
                    .upload(imagePath!, image);

                if (imageError) {
                    throw new Error("画像のアップロードに失敗しました。");
                }
            }

            // 4. 植物のレコードに画像のURLを保存
            const newPlant = await prisma.plants.update({
                where: { id: plant.id },
                data: { image_src: imagePath }
            });

            newPlantId = newPlant.id
        });

        return { success: true, data: { plantId: newPlantId } };
    } catch (error) {
        console.error("error", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "植物の追加に失敗しました。" };
    }
}

export async function addPlantImage(id: number, image: File): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (user == null) {
        return { success: false, code: ActionErrorCode.AUTH_REQUIRED };
    }

    const publicUser = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!publicUser) {
        return { success: false, code: ActionErrorCode.AUTH_REQUIRED };
    }

    try {

        await prisma.$transaction(async (prisma) => {

            const imagePath = `${id.toString()}/${generateImageName("plant")}`;

            await prisma.plant_images.create(
                {
                    data: {
                        plant_id: id,
                        user_id: publicUser.id,
                        image_url: imagePath,
                    },
                }
            )

            const { error: imageError } = await supabase.storage
                .from("plants")
                .upload(imagePath, image);

            if (imageError) {
                throw new Error("画像のアップロードに失敗しました。");
            }
        });

        revalidatePath(`/plants/${id}`);

        return { success: true };

    } catch (error) {
        console.log("error", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "画像のアップロードに失敗しました。" };
    }
}

export async function updatePlant(id: number, plant: { name: string, image?: File }): Promise<ActionResult<{ plantId: number }>> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (user == null) {
        return { success: false, code: ActionErrorCode.AUTH_REQUIRED };
    }

    if (!plant.name) {
        return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: "植物の名前は必須です。" };
    }

    // 1. 植物名が重複していないか
    const existingPlant = await prisma.plants.findFirst({
        where: {
            id: { not: id },
            name: plant.name
        },
    });
    if (existingPlant) {
        return { success: false, code: ActionErrorCode.ALREADY_EXISTS, message: "植物名が重複しています。", data: { plantId: existingPlant.id } };
    }

    try {

        await prisma.$transaction(async (prisma) => {

            const imageName = generateImageName("plant");
            const imagePath = `${id.toString()}/${imageName}`;

            // 1. 植物のレコードを更新
            await prisma.plants.update({
                where: { id: id },
                data: {
                    name: plant.name,
                    image_src: imagePath,
                },
            });

            // 2. 画像をアップロード
            if (plant.image) {
                const { error: imageError } = await supabase.storage
                    .from("plants")
                    .update(imagePath, plant.image, {
                        upsert: true
                    });

                if (imageError) {
                    throw new Error("画像のアップロードに失敗しました。");
                }
            }
        });

        return { success: true, data: { plantId: id } };
    } catch (error) {
        console.error("error", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "植物の更新に失敗しました。" };
    }
}

export async function deletePlant(id: number): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (user == null) {
        return { success: false, code: ActionErrorCode.AUTH_REQUIRED };
    }

    try {
        await prisma.plants.delete({
            where: { id: id },
        });

        // 植物の画像は削除しないでおく
        // const { error: imageError } = await supabase.storage
        //     .from("plants")
        //     .remove([id.toString()]);

        // if (imageError) {
        //     console.error("imageError", imageError);
        //     throw new Error("画像の削除に失敗しました。");
        // }

        return { success: true, title: "削除しました。" };
    } catch (error) {
        console.error("error", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "植物の削除に失敗しました。" };
    }
}

export async function addFavorite({ params }: ActionParams<{ plantId: number }>): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (user == null) {
        return { success: false, code: ActionErrorCode.AUTH_REQUIRED };
    }

    const publicUser = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!publicUser) {
        return { success: false, code: ActionErrorCode.AUTH_REQUIRED };
    }

    await prisma.plant_favorites.create({
        data: {
            user_id: publicUser.id,
            plant_id: params.plantId,
        },
    });

    return { success: true, title: "追加しました。" };
}

export async function deleteFavorite({ params }: ActionParams<{ plantId: number }>): Promise<ActionResult> {
    const supabase = await createClient();

    try {

        const { data: { user } } = await supabase.auth.getUser();

        if (user == null) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED };
        }

        const publicUser = await prisma.public_users.findFirst({
            where: {
                auth_id: user.id,
            },
        });

        if (!publicUser) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED };
        }

        await prisma.plant_favorites.deleteMany({
            where: {
                user_id: publicUser.id,
                plant_id: params.plantId,
            },
        });

        return { success: true, title: "削除しました。" };

    } catch (error) {
        console.log("error", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR };
    }
}

export async function addHave({ params }: ActionParams<{ plantId: number }>): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (user == null) {
        return { success: false, code: ActionErrorCode.AUTH_REQUIRED };
    }

    const publicUser = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!publicUser) {
        return { success: false, code: ActionErrorCode.AUTH_REQUIRED };
    }

    const existingHave = await prisma.plant_have.findFirst({
        where: {
            user_id: publicUser.id,
            plant_id: params.plantId,
        },
    });

    if (existingHave) {
        return { success: false, code: ActionErrorCode.ALREADY_EXISTS };
    }

    await prisma.plant_have.create({
        data: {
            user_id: publicUser.id,
            plant_id: params.plantId,
        },
    });

    return { success: true, title: "追加しました。" };
}

export async function deleteHave({ params }: ActionParams<{ plantId: number }>): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (user == null) {
        return { success: false, code: ActionErrorCode.AUTH_REQUIRED };
    }

    const publicUser = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!publicUser) {
        return { success: false, code: ActionErrorCode.AUTH_REQUIRED };
    }

    await prisma.plant_have.deleteMany({
        where: {
            user_id: publicUser.id,
            plant_id: params.plantId,
        },
    });

    return { success: true, title: "削除しました。" };
}

// ソートオプションを取得する関数
function getSortOption(sortBy: string) {
    switch (sortBy) {
        case 'name_desc':
            return { name: 'desc' as const };
        case 'created_at':
            return { created_at: 'asc' as const };
        case 'created_at_desc':
            return { created_at: 'desc' as const };
        case 'evaluation_desc':
            return { evaluations: { _count: 'desc' as const } };
        case 'name':
        default:
            return { name: 'asc' as const };
    }
}