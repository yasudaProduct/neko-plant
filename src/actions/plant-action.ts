"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Plant } from "../types/plant";
import { createClient } from "@/lib/supabase/server";
import { MAX_PLANT_NAME_LENGTH, STORAGE_PATH } from "@/lib/const";
import { clampPage, clampPageSize, clampSearchQuery, MAX_PLANT_PAGE_SIZE } from "@/lib/pagination";
import { normalizePlantName } from "@/lib/plant-name";
import { findPlantByNameKey } from "@/lib/plant-name-query";
import { ActionErrorCode, ActionResult } from "@/types/common";
import { reportError } from "@/lib/report-error";

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
    // 公開アクションのため、外部から渡る値を必ず丸める (DoS・DB例外対策)。
    // 保存値と同じ正規化も掛ける (全角英字・全角スペースで入力しても取りこぼさない)
    const trimmedQuery = normalizePlantName(clampSearchQuery(query));
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
    // 保存値と同じ正規化を掛けてから検索する (全角英字・全角スペースで入力してもヒットする)
    const trimmedName = normalizePlantName(clampSearchQuery(name));

    // 空クエリで全件返さない・件数上限を設ける (公開アクションのため)
    if (trimmedName === "") {
        return [];
    }

    const plants = await prisma.plants.findMany({
        where: {
            name: {
                contains: trimmedName,
                // 保存値は大文字小文字を保持するため 'monstera' で 'Monstera' を拾えるようにする。
                // ここが大文字小文字を区別すると、ユーザーは既存植物を見つけられず新規登録に進み、
                // plants_name_normalized_key で一意違反になる
                // (searchPlants の ILIKE、post-action.ts の mode:"insensitive" と挙動を揃える)
                mode: "insensitive",
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

    // 保存する値を先に確定させる。空白のみの入力は正規化後に空になるため、
    // 検証は正規化後の値に対して行う (従来は "   " が名前として保存できた)
    const normalizedName = normalizePlantName(name);

    if (!normalizedName) {
        return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: "植物の名前は必須です。" };
    }

    if (normalizedName.length > MAX_PLANT_NAME_LENGTH) {
        return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: `植物の名前は${MAX_PLANT_NAME_LENGTH}文字以内で入力してください。` };
    }

    // 重複判定は DB の一意インデックスと同じ正規化キーで行う。
    // 見つかった場合は既存IDを返す (投稿フローと /plants/new がこのIDに依存して
    // 「こちら」リンクを出す)
    const existingPlant = await findPlantByNameKey(normalizedName);
    if (existingPlant) {
        return { success: false, code: ActionErrorCode.ALREADY_EXISTS, message: "植物名が重複しています。", data: { plantId: existingPlant.id } };
    }

    try {
        const plant = await prisma.plants.create({
            data: {
                name: normalizedName,
            },
        });

        return { success: true, data: { plantId: plant.id } };
    } catch (error) {
        const duplicated = await recoverAlreadyExists(error, normalizedName);
        if (duplicated) {
            return duplicated;
        }

        reportError(error, { scope: "addPlant" });
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "植物の追加に失敗しました。" };
    }
}

/**
 * 一意インデックス違反 (P2002) を「既にあります + そのID」に変換する。
 * 該当しなければ undefined を返し、呼び出し側は通常のエラー処理に落ちる。
 *
 * Prisma は式インデックスを認識しないため、P2002 が唯一の通知手段になる。
 * 投稿フローは新規植物を逐次 addPlant するので、送信の二度押しや2ユーザーの
 * 同時登録で事前チェックと INSERT の間に競合が実際に起きる。これが無いと catch が
 * INTERNAL_SERVER_ERROR を返し、投稿全体が中断してしまう
 * (植物は登録済みなのに投稿できない、という理不尽な失敗)。
 * JS と PG の Unicode 実装差で正規化結果がずれた場合の保険も兼ねる。
 */
async function recoverAlreadyExists(
    error: unknown,
    name: string,
    excludeId?: number,
): Promise<ActionResult<{ plantId: number }> | undefined> {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        return undefined;
    }

    const existing = await findPlantByNameKey(name, excludeId);
    return {
        success: false,
        code: ActionErrorCode.ALREADY_EXISTS,
        message: "植物名が重複しています。",
        data: existing ? { plantId: existing.id } : undefined,
    };
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

    const normalizedName = normalizePlantName(plant.name);

    if (!normalizedName) {
        return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: "植物の名前は必須です。" };
    }

    // plants.name は長さ無制限の varchar なので DB では止まらない。addPlant と揃える
    if (normalizedName.length > MAX_PLANT_NAME_LENGTH) {
        return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: `植物の名前は${MAX_PLANT_NAME_LENGTH}文字以内で入力してください。` };
    }

    // 自分以外に正規化キーが一致する植物がないか (DB の一意インデックスと同じ基準)
    const existingPlant = await findPlantByNameKey(normalizedName, id);
    if (existingPlant) {
        return { success: false, code: ActionErrorCode.ALREADY_EXISTS, message: "植物名が重複しています。", data: { plantId: existingPlant.id } };
    }

    try {
        await prisma.plants.update({
            where: { id: id },
            data: {
                name: normalizedName,
                scientific_name: plant.scientific_name,
                family: plant.family,
                genus: plant.genus,
                species: plant.species,
            },
        });

        return { success: true, data: { plantId: id } };
    } catch (error) {
        const duplicated = await recoverAlreadyExists(error, normalizedName, id);
        if (duplicated) {
            return duplicated;
        }

        reportError(error, { scope: "updatePlant", plantId: id });
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
        reportError(error, { scope: "deletePlant", plantId: id });
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
