"use server";

import prisma from "@/lib/prisma";
import { Plant } from "../types/plant";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_PATH } from "@/lib/const";
import { generateImageName } from "@/lib/utils";
import { ActionErrorCode, ActionResult } from "@/types/common";

type SortType =
    | "name"
    | "name_desc"
    | "created_at"
    | "created_at_desc"
    | "coexistence_desc";

export async function getPlants(
    sortBy: string = "coexistence_desc",
    page: number = 1,
    pageSize: number = 9,
    filter: "all" = "all"
): Promise<{ plants: Plant[], totalCount: number }> {
    void filter;
    return searchPlants("", sortBy, page, pageSize, "all");
}

export async function searchPlants(
    query: string,
    sortBy: string = "coexistence_desc",
    page: number = 1,
    pageSize: number = 9,
    filter: "all" = "all"
): Promise<{ plants: Plant[], totalCount: number }> {
    void filter;
    const where = query.trim()
        ? {
            name: {
                contains: query.trim(),
                mode: "insensitive" as const,
            },
        }
        : undefined;

    const [totalCount, allPlants] = await Promise.all([
        prisma.plants.count({ where }),
        prisma.plants.findMany({
        where,
            include: {
                posts: {
                    include: {
                        post_images: {
                            orderBy: { order: "asc" },
                        },
                    },
                },
            },
        }),
    ]);

    const mappedPlants = allPlants.map((plant) => {
        const postCount = plant.posts.length;
        const catCount = new Set(plant.posts.map((p) => p.pet_id).filter((id): id is number => id != null)).size;
        const latestPostWithImage = [...plant.posts]
            .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
            .find((post) => post.post_images.length > 0);
        const firstImage = latestPostWithImage?.post_images[0];
        return {
            id: plant.id,
            name: plant.name,
            mainImageUrl: firstImage ? STORAGE_PATH.POSTS + firstImage.image_url : undefined,
            scientific_name: plant.scientific_name ?? undefined,
            family: plant.family ?? undefined,
            genus: plant.genus ?? undefined,
            species: plant.species ?? undefined,
            coexistenceCatCount: catCount,
            coexistencePostCount: postCount,
        } satisfies Plant;
    });

    mappedPlants.sort((a, b) => sortPlants(a, b, sortBy as SortType));

    const plants = mappedPlants.slice((page - 1) * pageSize, page * pageSize);
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
    const plant = await prisma.plants.findUnique({
        where: { id },
        include: {
            posts: {
                include: {
                    post_images: {
                        orderBy: { order: "asc" },
                    },
                },
            },
        },
    });

    if (!plant) {
        return undefined;
    }

    const postCount = plant.posts.length;
    const catCount = new Set(plant.posts.map((p) => p.pet_id).filter((pid): pid is number => pid != null)).size;
    const latestPostWithImage = [...plant.posts]
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
        .find((post) => post.post_images.length > 0);
    const firstImage = latestPostWithImage?.post_images[0];

    return {
        id: plant.id,
        name: plant.name,
        mainImageUrl: firstImage ? STORAGE_PATH.POSTS + firstImage.image_url : undefined,
        scientific_name: plant.scientific_name ?? undefined,
        family: plant.family ?? undefined,
        genus: plant.genus ?? undefined,
        species: plant.species ?? undefined,
        coexistenceCatCount: catCount,
        coexistencePostCount: postCount,
    };
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

            // 画像は投稿起点に統一したため、植物作成時の画像登録は行わない
            if (image) {
                // 既存UI互換のためアップロードだけ受け付ける（DBには紐づけない）
                const imagePath = `plants-legacy/${plant.id.toString()}/${generateImageName("plant")}`;
                await supabase.storage.from("posts").upload(imagePath, image);
            }

            newPlantId = plant.id;
        });

        return { success: true, data: { plantId: newPlantId } };
    } catch (error) {
        console.error("error", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "植物の追加に失敗しました。" };
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

        return { success: true, title: "削除しました。" };
    } catch (error) {
        console.error("error", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "植物の削除に失敗しました。" };
    }
}

function sortPlants(a: Plant, b: Plant, sortBy: SortType): number {
    switch (sortBy) {
        case "name_desc":
            return b.name.localeCompare(a.name);
        case "created_at":
            return a.id - b.id;
        case "created_at_desc":
            return b.id - a.id;
        case "name":
            return a.name.localeCompare(b.name);
        case "coexistence_desc":
        default:
            if (b.coexistenceCatCount !== a.coexistenceCatCount) {
                return b.coexistenceCatCount - a.coexistenceCatCount;
            }
            return b.coexistencePostCount - a.coexistencePostCount;
    }
}
