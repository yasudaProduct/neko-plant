"use server";

import prisma from "@/lib/prisma";
import { Plant } from "../types/plant";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_PATH } from "@/lib/const";
import { generateImageName } from "@/lib/utils";
import { ActionErrorCode, ActionParams, ActionResult } from "@/types/common";
import { revalidatePath } from "next/cache";

type FilterType = "all" | "safe" | "danger";

export async function getPlants(
    sortBy: string = 'name',
    page: number = 1,
    pageSize: number = 9,
    filter: FilterType = "all"
): Promise<{ plants: Plant[], totalCount: number }> {
    return searchPlants("", sortBy, page, pageSize, filter);
}

export async function searchPlants(
    query: string,
    sortBy: string = 'name',
    page: number = 1,
    pageSize: number = 9,
    filter: FilterType = "all"
): Promise<{ plants: Plant[], totalCount: number }> {

    // フィルタリングなし、かつ検索クエリなしの場合は標準のPrismaメソッドを使用（高速化のため）
    if (filter === "all" && (!query || query.trim() === '')) {
        const totalCount = await prisma.plants.count();
        const plantsData = await prisma.plants.findMany({
            include: {
                plant_images: {
                    orderBy: { order: 'asc' },
                    take: 1,
                },
            },
            orderBy: getSortOption(sortBy),
            skip: (page - 1) * pageSize,
            take: pageSize,
        });

        return {
            plants: plantsData.map(mapToPlant),
            totalCount
        };
    }

    // 1. まず条件に合うPlantのIDを取得する
    // Prismaの標準機能ではGROUP BY後のHAVINGで集計値の比較が難しいため、
    // 2段階で取得する（ID取得 -> 詳細取得）

    // 検索条件の構築
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (query && query.trim() !== '') {
        where.name = {
            contains: query,
            mode: 'insensitive',
        };
    }

    // 全件取得してアプリケーション側でフィルタリングする場合、データ量が多いとパフォーマンスに影響が出るため
    // 評価データをincludeして取得し、メモリ上でフィルタリングする
    // ※ データ量が増えた場合は、DB設計を見直すか（集計テーブルを作るなど）、Raw SQLに戻すことを検討してください

    // まず、対象となるPlantのIDと評価集計を取得
    const allPlants = await prisma.plants.findMany({
        where,
        select: {
            id: true,
            created_at: true,
            name: true,
            evaluations: {
                select: {
                    type: true,
                },
            },
        },
    });

    // アプリケーション側でフィルタリング
    let filteredPlants = allPlants;
    if (filter === "safe") {
        filteredPlants = allPlants.filter(p => {
            const goodCount = p.evaluations.filter(e => e.type === 'good').length;
            const badCount = p.evaluations.filter(e => e.type === 'bad').length;
            return goodCount > 0 && goodCount >= badCount;
        });
    } else if (filter === "danger") {
        filteredPlants = allPlants.filter(p => {
            const goodCount = p.evaluations.filter(e => e.type === 'good').length;
            const badCount = p.evaluations.filter(e => e.type === 'bad').length;
            return badCount > goodCount;
        });
    }

    // アプリケーション側でソート
    filteredPlants.sort((a, b) => {
        switch (sortBy) {
            case 'name_desc':
                return b.name.localeCompare(a.name);
            case 'created_at':
                return a.created_at.getTime() - b.created_at.getTime();
            case 'created_at_desc':
                return b.created_at.getTime() - a.created_at.getTime();
            case 'evaluation_desc':
                return b.evaluations.length - a.evaluations.length;
            case 'name':
            default:
                return a.name.localeCompare(b.name);
        }
    });

    const totalCount = filteredPlants.length;

    // ページネーション
    const paginatedIds = filteredPlants
        .slice((page - 1) * pageSize, page * pageSize)
        .map(p => p.id);

    if (paginatedIds.length === 0) {
        return { plants: [], totalCount };
    }

    // ページングされたIDを使って詳細データを取得
    const plantsData = await prisma.plants.findMany({
        where: { id: { in: paginatedIds } },
        include: {
            plant_images: {
                orderBy: { order: 'asc' },
                take: 1,
            },
        },
    });

    // ID順序を維持するために並び替え
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plantsMap = new Map(plantsData.map((p: any) => [p.id, p]));
    const plants = paginatedIds.map(id => plantsMap.get(id)!).filter(p => p).map(mapToPlant);

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

    // 植物取得と認証チェックを並列実行
    const [plant, { data: { user } }] = await Promise.all([
        prisma.plants.findUnique({
            where: { id: id },
            include: {
                plant_images: {
                    take: 1,
                    orderBy: {
                        order: 'asc',
                    },
                },
            },
        }),
        supabase.auth.getUser(),
    ]);

    if (!plant) {
        return undefined;
    }

    // 認証ユーザーの場合はfavoriteとhaveを取得
    let isFavorite = false
    let isHave = false
    if (user != null) {

        const publicUser = await prisma.public_users.findFirst({
            where: {
                auth_id: user.id,
            },
        });

        // favoriteとhaveを並列取得
        const [favorite, have] = await Promise.all([
            prisma.plant_favorites.findFirst({
                where: {
                    user_id: publicUser!.id,
                    plant_id: id,
                },
            }),
            prisma.plant_have.findFirst({
                where: {
                    user_id: publicUser!.id,
                    plant_id: id,
                },
            }),
        ]);
        isFavorite = favorite != null
        isHave = have != null
    }

    return {
        id: plant.id,
        name: plant.name,
        mainImageUrl: plant.plant_images && plant.plant_images.length > 0 ? STORAGE_PATH.PLANT + plant.plant_images[0].image_url : undefined,
        scientific_name: plant.scientific_name ?? undefined,
        family: plant.family ?? undefined,
        genus: plant.genus ?? undefined,
        species: plant.species ?? undefined,
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

            // 2. 画像があれば登録
            if (image) {
                const imagePath = `${plant.id.toString()}/${generateImageName("plant")}`;

                // 画像をアップロード
                const { error: imageError } = await supabase.storage
                    .from("plants")
                    .upload(imagePath, image);

                if (imageError) {
                    throw new Error("画像のアップロードに失敗しました。");
                }

                // 画像情報をplant_imagesに登録
                await prisma.plant_images.create({
                    data: {
                        plant_id: plant.id,
                        user_id: 1, // システムユーザーIDに変更する必要があります
                        image_url: imagePath,
                        order: 0,
                    },
                });
            }

            newPlantId = plant.id;
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

export async function updatePlant(id: number, plant: { name: string, scientific_name?: string, family?: string, genus?: string, species?: string }): Promise<ActionResult<{ plantId: number }>> {
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
            // 1. 植物のレコードを更新
            await prisma.plants.update({
                where: { id: id },
                data: {
                    name: plant.name,
                    scientific_name: plant.scientific_name,
                    family: plant.family,
                    genus: plant.genus,
                    species: plant.species,
                },
            });
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

// Plantマッパー
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToPlant(plant: any): Plant {
    return {
        id: plant.id,
        name: plant.name,
        mainImageUrl: plant.plant_images && plant.plant_images.length > 0 ? STORAGE_PATH.PLANT + plant.plant_images[0].image_url : undefined,
        isFavorite: false,
        isHave: false,
    };
}
