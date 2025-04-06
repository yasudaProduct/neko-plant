"use server";

import prisma from "@/lib/prisma";
import { Plant } from "../types/plant";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_PATH } from "@/lib/const";
import { generateImageName } from "@/lib/utils";
import { ActionErrorCode, ActionParams, ActionResult } from "@/types/common";

export async function getPlants(
    sortBy: string = 'name',
    page: number = 1,
    pageSize: number = 9
): Promise<{ plants: Plant[], totalCount: number }> {
    // 総件数を取得
    const totalCount = await prisma.plants.count();

    // ページングを適用してデータを取得
    const plantsData = await prisma.plants.findMany({
        select: {
            id: true,
            name: true,
            image_src: true,
        },
        orderBy: getSortOption(sortBy),
        skip: (page - 1) * pageSize,
        take: pageSize,
    });

    const plants: Plant[] = plantsData.map((plant) => ({
        id: plant.id,
        name: plant.name,
        imageUrl: plant.image_src ? STORAGE_PATH.PLANT + plant.image_src : undefined,
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
        select: {
            id: true,
            name: true,
            image_src: true,
        },
        orderBy: getSortOption(sortBy),
        skip: (page - 1) * pageSize,
        take: pageSize,
    });

    const plants: Plant[] = plantsData.map((plant) => ({
        id: plant.id,
        name: plant.name,
        imageUrl: plant.image_src ? STORAGE_PATH.PLANT + plant.image_src : undefined,
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
        imageUrl: plant.image_src ? STORAGE_PATH.PLANT + plant.image_src : undefined,
        isFavorite: isFavorite,
        isHave: isHave,
    };
}

export async function addPlant(name: string, image: File): Promise<{ success: boolean, message?: string, plantId?: number }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (user == null) {
        return { success: false, message: "ログインしてください。" };
        // TODO ログイン画面にリダイレクト
    }

    if (!name || !image) {
        return { success: false, message: "植物の名前と画像は必須です。" };
    }

    // チェック
    // 1. 植物名が重複していないか
    const existingPlant = await prisma.plants.findFirst({
        where: {
            name: name
        },
    });
    if (existingPlant) {
        return { success: false, message: "植物名が重複しています。", plantId: existingPlant.id };
    }

    // prismaでトランザクションを実行
    try {
        let newPlantId
        await prisma.$transaction(async (prisma) => {

            // 1. 植物を登録
            const plant = await prisma.plants.create({
                data: {
                    name: name,
                },
            });

            const imageName = generateImageName("plant");
            const imagePath = `${plant.id.toString()}/${imageName}`;

            // 2. 画像をアップロード
            const { error: imageError } = await supabase.storage
                .from("plants")
                .upload(imagePath, image);

            if (imageError) {
                throw new Error("画像のアップロードに失敗しました。");
            }

            // 4. 植物のレコードに画像のURLを保存
            const newPlant = await prisma.plants.update({
                where: { id: plant.id },
                data: { image_src: imagePath }
            });

            newPlantId = newPlant.id
        });

        return { success: true, plantId: newPlantId };
    } catch (error) {
        console.log("error", error);
        return { success: false, message: error instanceof Error ? error.message : "植物の追加に失敗しました。" };
    }
}

export async function updatePlant(id: number, plant: { name: string, image?: File }): Promise<{ success: boolean, message?: string, plantId?: number }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (user == null) {
        return { success: false, message: "ログインしてください。" };
    }

    if (!plant.name) {
        return { success: false, message: "植物の名前は必須です。" };
    }

    // 1. 植物名が重複していないか
    const existingPlant = await prisma.plants.findFirst({
        where: {
            id: { not: id },
            name: plant.name
        },
    });
    if (existingPlant) {
        return { success: false, message: "植物名が重複しています。", plantId: existingPlant.id };
    }

    try {

        await prisma.$transaction(async (prisma) => {

            const imageName = generateImageName("plant");
            const imagePath = `${id.toString()}/${imageName}`;

            // 1. 画像をアップロード
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

            // 2. 植物のレコードを更新
            await prisma.plants.update({
                where: { id: id },
                data: {
                    name: plant.name,
                    image_src: imagePath,
                },
            });

        });

        return { success: true, plantId: id };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "植物の更新に失敗しました。" };
    }
}

export async function deletePlant(id: number): Promise<{ success: boolean, message?: string }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (user == null) {
        return { success: false, message: "ログインしてください。" };
    }

    try {
        await prisma.plants.delete({
            where: { id: id },
        });

        const { error: imageError } = await supabase.storage
            .from("plants")
            .remove([id.toString()]);

        if (imageError) {
            console.log("imageError", imageError);
            throw new Error("画像の削除に失敗しました。");
        }


        return { success: true };
    } catch (error) {
        console.log("error", error);
        return { success: false, message: error instanceof Error ? error.message : "植物の削除に失敗しました。" };
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