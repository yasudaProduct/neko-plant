import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { plantNameKey } from "@/lib/plant-name";

/**
 * 植物名の正規化キーで plants を引くサーバー専用ヘルパー。
 * Server Action としては公開しない ("use server" ファイルに置くと非async な
 * export が書けず、SQL式の定義場所も分散する)。
 *
 * DB の一意インデックス plants_name_normalized_key と同一の式を使う。
 * インデックスを使わせるには式が文字どおり一致する必要があるため、
 * '[[:space:]]+' などに書き換えないこと。
 *
 * 注: '\\s+' と2重に書く。タグ付きテンプレートでも cooked 側が使われ、
 *     '\s' は JS が 's' に潰してしまうため。
 */
const PLANT_NAME_KEY_SQL = Prisma.sql`lower(btrim(regexp_replace(normalize(name, NFKC), '\\s+', ' ', 'g')))`;

export type PlantNameMatch = { id: number; name: string };

/** 正規化キーが一致する植物を1件返す。excludeId は updatePlant の自己一致除外用 */
export async function findPlantByNameKey(
    name: string,
    excludeId?: number,
): Promise<PlantNameMatch | undefined> {
    const key = plantNameKey(name);
    if (key.length === 0) {
        return undefined;
    }

    const rows = await prisma.$queryRaw<PlantNameMatch[]>(Prisma.sql`
        select id, name
          from public.plants
         where ${PLANT_NAME_KEY_SQL} = ${key}
           ${excludeId != null ? Prisma.sql`and id <> ${excludeId}` : Prisma.empty}
         limit 1
    `);

    return rows[0];
}

/** 複数の名前を正規化キーで一括照合する (キー -> 植物) */
export async function findPlantsByNameKeys(
    names: string[],
): Promise<Map<string, PlantNameMatch>> {
    // Prisma.join は空配列で throw するため early return が必須
    const keys = [...new Set(names.map(plantNameKey))].filter((key) => key.length > 0);
    if (keys.length === 0) {
        return new Map();
    }

    const rows = await prisma.$queryRaw<(PlantNameMatch & { name_key: string })[]>(Prisma.sql`
        select id, name, ${PLANT_NAME_KEY_SQL} as name_key
          from public.plants
         where ${PLANT_NAME_KEY_SQL} in (${Prisma.join(keys)})
    `);

    return new Map(rows.map((row) => [row.name_key, { id: row.id, name: row.name }]));
}
