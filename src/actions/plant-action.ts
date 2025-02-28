"use server";

import prisma from "@/lib/prisma";
import { Plant } from "../app/types/plant";
import { createClient } from "@/lib/supabase/server";

export async function getPlants(): Promise<Plant[]> {

    const plantsData = await prisma.plants.findMany({
        select: {
            id: true,
            name: true,
            image_src: true,
        },
    });

    const plants: Plant[] = plantsData.map((plant) => ({
        id: plant.id,
        name: plant.name,
        imageUrl: plant.image_src ?? undefined,
    }));

    return plants
}

export async function getPlant(id: number): Promise<Plant | undefined> {
    const plant = await prisma.plants.findUnique({
        where: { id: id },
    });
    if (!plant) {
        return undefined;
    }
    return {
        id: plant.id,
        name: plant.name,
        imageUrl: plant.image_src ?? undefined,
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

            // TODO storageの名前をplantIdにする必要はないかもね
            // 1. 植物を登録
            const plant = await prisma.plants.create({
                data: {
                    name: name,
                },
            });

            // 2. 画像をアップロード
            const { error: imageError } = await supabase.storage
                .from("plants")
                .upload(plant.id.toString(), image);

            if (imageError) {
                console.log("imageError", imageError);
                throw new Error("画像のアップロードに失敗しました。");
            }

            // 3. 画像のURLを取得
            const { data: { publicUrl } } = supabase.storage
                .from("plants")
                .getPublicUrl(plant.id.toString());

            // 4. 植物のレコードに画像のURLを保存
            const newPlant = await prisma.plants.update({
                where: { id: plant.id },
                data: { image_src: publicUrl }
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
            let publicUrl = undefined

            // 1. 画像をアップロード
            if (plant.image) {
                const { error: imageError } = await supabase.storage
                    .from("plants")
                    .update(id.toString(), plant.image, {
                        upsert: true
                    });

                if (imageError) {
                    console.log("imageError", imageError);
                    throw new Error("画像のアップロードに失敗しました。");
                }

                const { data } = supabase.storage
                    .from("plants")
                    .getPublicUrl(id.toString());

                publicUrl = data.publicUrl
            }

            // 2. 植物のレコードを更新
            await prisma.plants.update({
                where: { id: id },
                data: {
                    name: plant.name,
                    image_src: publicUrl,
                },
            });

        });

        return { success: true, plantId: id };
    } catch (error) {
        console.log("error", error);
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