"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Plant } from "../types/plant";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_PATH } from "@/lib/const";
import { clampPage, clampPageSize, clampSearchQuery, MAX_PLANT_PAGE_SIZE } from "@/lib/pagination";
import { ActionErrorCode, ActionResult } from "@/types/common";

/** 並び順: 共存実績(ユニーク猫数) / 投稿数 / 名前 */
export type PlantSortBy = "cats" | "posts" | "name";

/** 絞り込み: 全て / 共存実績あり / 情報なし (ポジティブリスト方式) */
export type PlantFilter = "all" | "proven" | "noinfo";

export async function getPlants(
    sortBy: PlantSortBy = "cats",
    page: number = 1,
    pageSize: number = 9,
    filter: PlantFilter = "all"
): Promise<{ plants: Plant[], totalCount: number }> {
    return searchPlants("", sortBy, page, pageSize, filter);
}

export async function searchPlants(
    query: string,
    sortBy: PlantSortBy = "cats",
    page: number = 1,
    pageSize: number = 9,
    filter: PlantFilter = "all"
): Promise<{ plants: Plant[], totalCount: number }> {
    // 公開アクションのため、外部から渡る値を必ず丸める (DoS・DB例外対策)
    const trimmedQuery = clampSearchQuery(query);
    const safePage = clampPage(page);
    const safePageSize = clampPageSize(pageSize, MAX_PLANT_PAGE_SIZE);

    // 共存実績(ユニーク猫数・投稿数)での絞り込み・並び替えが必要なため、
    // ID選択はRaw SQLで行い、詳細はPrismaで取得する2段構え
    const searchCondition = trimmedQuery !== ""
        ? Prisma.sql`WHERE p.name ILIKE ${"%" + trimmedQuery + "%"}`
        : Prisma.empty;

    const havingCondition = filter === "proven"
        ? Prisma.sql`HAVING COUNT(DISTINCT ppe.pet_id) > 0`
        : filter === "noinfo"
            ? Prisma.sql`HAVING COUNT(DISTINCT ppe.pet_id) = 0`
            : Prisma.empty;

    const orderBy = sortBy === "cats"
        ? Prisma.sql`ORDER BY COUNT(DISTINCT ppe.pet_id) DESC, COUNT(DISTINCT ppl.post_id) DESC, p.name ASC`
        : sortBy === "posts"
            ? Prisma.sql`ORDER BY COUNT(DISTINCT ppl.post_id) DESC, COUNT(DISTINCT ppe.pet_id) DESC, p.name ASC`
            : Prisma.sql`ORDER BY p.name ASC`;

    const baseQuery = Prisma.sql`
        SELECT p.id
        FROM plants p
        LEFT JOIN post_plants ppl ON ppl.plant_id = p.id
        LEFT JOIN post_pets ppe ON ppe.post_id = ppl.post_id
        ${searchCondition}
        GROUP BY p.id
        ${havingCondition}
    `;

    const [countRows, idRows] = await Promise.all([
        prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
            SELECT COUNT(*) AS count FROM (${baseQuery}) AS filtered
        `),
        prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
            ${baseQuery}
            ${orderBy}
            LIMIT ${safePageSize} OFFSET ${(safePage - 1) * safePageSize}
        `),
    ]);

    const totalCount = countRows[0] ? Number(countRows[0].count) : 0;
    const pageIds = idRows.map((row) => Number(row.id));

    if (pageIds.length === 0) {
        return { plants: [], totalCount };
    }

    const [plantsData, coexistenceMap] = await Promise.all([
        fetchPlantsWithLatestImage(pageIds),
        fetchCoexistenceMap(pageIds),
    ]);

    // ID順序を維持して返す
    const plantsMap = new Map(plantsData.map((plant) => [plant.id, plant]));
    const plants = pageIds
        .map((id) => plantsMap.get(id))
        .filter((plant) => plant != null)
        .map((plant) => mapToPlant(plant, coexistenceMap.get(plant.id)));

    return { plants, totalCount };
}

/** 植物詳細 + 最新投稿画像1枚 */
function fetchPlantsWithLatestImage(plantIds: number[]) {
    return prisma.plants.findMany({
        where: { id: { in: plantIds } },
        include: {
            post_plants: {
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
}

/** 植物IDごとの共存実績 (投稿数・ユニーク猫数) を一括取得 */
async function fetchCoexistenceMap(plantIds: number[]): Promise<Map<number, { postCount: number, catCount: number }>> {
    const rows = await prisma.$queryRaw<{ plant_id: number, post_count: bigint, cat_count: bigint }[]>(Prisma.sql`
        SELECT ppl.plant_id, COUNT(DISTINCT ppl.post_id) AS post_count, COUNT(DISTINCT ppe.pet_id) AS cat_count
        FROM post_plants ppl
        LEFT JOIN post_pets ppe ON ppe.post_id = ppl.post_id
        WHERE ppl.plant_id IN (${Prisma.join(plantIds)})
        GROUP BY ppl.plant_id
    `);

    return new Map(rows.map((row) => [
        Number(row.plant_id),
        { postCount: Number(row.post_count), catCount: Number(row.cat_count) },
    ]));
}

export async function searchPlantName(name: string): Promise<{ id: number, name: string }[]> {
    const trimmedName = clampSearchQuery(name);

    // 空クエリで全件返さない・件数上限を設ける (公開アクションのため)
    if (trimmedName === "") {
        return [];
    }

    const plants = await prisma.plants.findMany({
        where: {
            name: {
                contains: trimmedName,
            },
        },
        select: {
            id: true,
            name: true,
        },
        take: 20,
    });

    return plants.map((plant) => ({ id: plant.id, name: plant.name }));
}

export async function getPlant(id: number): Promise<Plant | undefined> {
    const [plantsData, coexistenceMap] = await Promise.all([
        fetchPlantsWithLatestImage([id]),
        fetchCoexistenceMap([id]),
    ]);

    const plant = plantsData[0];

    if (!plant) {
        return undefined;
    }

    return mapToPlant(plant, coexistenceMap.get(id));
}

export async function addPlant(name: string): Promise<ActionResult<{ plantId: number }>> {
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

    // 植物名が重複していないか
    const existingPlant = await prisma.plants.findFirst({
        where: {
            name: name
        },
    });
    if (existingPlant) {
        return { success: false, code: ActionErrorCode.ALREADY_EXISTS, message: "植物名が重複しています。", data: { plantId: existingPlant.id } };
    }

    try {
        const plant = await prisma.plants.create({
            data: {
                name: name,
            },
        });

        return { success: true, data: { plantId: plant.id } };
    } catch (error) {
        console.error("error", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "植物の追加に失敗しました。" };
    }
}

/**
 * 植物カタログは全ユーザー共有のため、更新・削除は管理者のみ許可する。
 * (Server ActionはRLSをバイパスするPrisma経由のため、ここでの認可チェックが実質の防壁)
 */
async function requireAdmin(authId: string): Promise<boolean> {
    const userData = await prisma.public_users.findFirst({
        where: { auth_id: authId },
        select: { role: true },
    });
    return userData?.role === "admin";
}

export async function updatePlant(id: number, plant: { name: string, scientific_name?: string, family?: string, genus?: string, species?: string }): Promise<ActionResult<{ plantId: number }>> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (user == null) {
        return { success: false, code: ActionErrorCode.AUTH_REQUIRED };
    }

    if (!(await requireAdmin(user.id))) {
        return { success: false, code: ActionErrorCode.FORBIDDEN, message: "植物の編集には管理者権限が必要です。" };
    }

    if (!plant.name) {
        return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: "植物の名前は必須です。" };
    }

    // 植物名が重複していないか
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

    // post_plants が ON DELETE CASCADE のため、削除は全ユーザーの投稿タグを巻き込む。管理者のみ許可
    if (!(await requireAdmin(user.id))) {
        return { success: false, code: ActionErrorCode.FORBIDDEN, message: "植物の削除には管理者権限が必要です。" };
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

// Plantマッパー
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToPlant(plant: any, coexistence?: { postCount: number, catCount: number }): Plant {
    const latestPostImage = plant.post_plants?.[0]?.posts?.post_images?.[0]?.image_url;

    return {
        id: plant.id,
        name: plant.name,
        mainImageUrl: latestPostImage ? STORAGE_PATH.POST + latestPostImage : undefined,
        scientific_name: plant.scientific_name ?? undefined,
        family: plant.family ?? undefined,
        genus: plant.genus ?? undefined,
        species: plant.species ?? undefined,
        postCount: coexistence?.postCount ?? 0,
        catCount: coexistence?.catCount ?? 0,
    };
}
