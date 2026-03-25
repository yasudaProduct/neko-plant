"use server";

import prisma from "@/lib/prisma";
import { Plant } from "../types/plant";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_PATH } from "@/lib/const";
import { generateImageName } from "@/lib/utils";
import { ActionErrorCode, ActionResult } from "@/types/common";

export async function getPlants(
    sortBy: string = 'name',
    page: number = 1,
    pageSize: number = 9,
): Promise<{ plants: Plant[], totalCount: number }> {
    return searchPlants("", sortBy, page, pageSize);
}

export async function searchPlants(
    query: string,
    sortBy: string = 'name',
    page: number = 1,
    pageSize: number = 9,
): Promise<{ plants: Plant[], totalCount: number }> {

    const where = query && query.trim() !== ''
        ? { name: { contains: query, mode: 'insensitive' as const } }
        : {};

    const totalCount = await prisma.plants.count({ where });

    const plantsData = await prisma.plants.findMany({
        where,
        include: {
            posts: {
                select: { pet_id: true },
            },
        },
        orderBy: getSortOption(sortBy),
        skip: (page - 1) * pageSize,
        take: pageSize,
    });

    const plants: Plant[] = plantsData.map((p) => {
        const coexistencePostCount = p.posts.length;
        const coexistenceCatCount = new Set(
            p.posts.filter((post) => post.pet_id !== null).map((post) => post.pet_id)
        ).size;

        return {
            id: p.id,
            name: p.name,
            mainImageUrl: undefined, // 一覧では投稿画像を別途取得しないためundefined
            scientific_name: p.scientific_name ?? undefined,
            family: p.family ?? undefined,
            genus: p.genus ?? undefined,
            species: p.species ?? undefined,
            coexistenceCatCount,
            coexistencePostCount,
        };
    });

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
        where: { id: id },
        include: {
            posts: {
                select: { pet_id: true, post_images: { take: 1, orderBy: { order: "asc" } } },
            },
        },
    });

    if (!plant) {
        return undefined;
    }

    const coexistencePostCount = plant.posts.length;
    const coexistenceCatCount = new Set(
        plant.posts.filter((post) => post.pet_id !== null).map((post) => post.pet_id)
    ).size;

    // 最初の投稿画像をメイン画像として使用
    const firstImage = plant.posts
        .flatMap((p) => p.post_images)
        .find((img) => img);

    return {
        id: plant.id,
        name: plant.name,
        mainImageUrl: firstImage ? STORAGE_PATH.POST + firstImage.image_url : undefined,
        scientific_name: plant.scientific_name ?? undefined,
        family: plant.family ?? undefined,
        genus: plant.genus ?? undefined,
        species: plant.species ?? undefined,
        coexistenceCatCount,
        coexistencePostCount,
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

    const existingPlant = await prisma.plants.findFirst({
        where: { name: name },
    });
    if (existingPlant) {
        return { success: false, code: ActionErrorCode.ALREADY_EXISTS, message: "植物名が重複しています。", data: { plantId: existingPlant.id } };
    }

    try {
        let newPlantId: number = 0;
        await prisma.$transaction(async (tx) => {
            const plant = await tx.plants.create({
                data: { name: name },
            });

            // 植物画像は管理者が直接 plants バケットに登録する運用のみ残す
            if (image) {
                const imagePath = `${plant.id.toString()}/${generateImageName("plant")}`;
                const { error: imageError } = await supabase.storage
                    .from("plants")
                    .upload(imagePath, image);

                if (imageError) {
                    throw new Error("画像のアップロードに失敗しました。");
                }
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

function getSortOption(sortBy: string) {
    switch (sortBy) {
        case 'name_desc':
            return { name: 'desc' as const };
        case 'created_at':
            return { created_at: 'asc' as const };
        case 'created_at_desc':
            return { created_at: 'desc' as const };
        case 'name':
        default:
            return { name: 'asc' as const };
    }
}
