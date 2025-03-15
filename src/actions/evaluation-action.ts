"use server";

import prisma from "@/lib/prisma";
import { Evaluation, EvaluationType } from "../app/types/evaluation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { STORAGE_PATH } from "@/lib/const";

export async function getEvaluations(plantId: number): Promise<Evaluation[]> {

    // TODO includeを使ってpetまで辿れなかった
    // 評価を取得
    const evaluationsData = await prisma.evaluations.findMany({
        where: {
            plant_id: plantId,
        },
        include: {
            users: {
                select: {
                    alias_id: true,
                    name: true,
                    image: true,
                },
            },
        },
        orderBy: {
            created_at: "desc",
        },
    });

    // ユーザーのペットを取得
    const petsData = evaluationsData.length > 0 && await prisma.pets.findMany({
        where: {
            user_id: {
                in: evaluationsData.map((evaluation) => evaluation.user_id).filter((id): id is number => id !== null),
            }
        },
        include: {
            neko: true,
        },
    });

    const evaluations: Evaluation[] = evaluationsData.map((evaluation) => ({
        id: evaluation.id,
        type: evaluation.type as EvaluationType,
        comment: evaluation.comment ?? "",
        createdAt: evaluation.created_at,
        pets: petsData ? petsData.filter((pet) => pet.user_id === evaluation.user_id).map((pet) => ({
            id: pet.id,
            name: pet.name,
            imageSrc: pet.image ? STORAGE_PATH.USER_PET + pet.image : undefined,
            neko: pet.neko,
        })) : undefined,
        user: {
            aliasId: evaluation.users?.alias_id ?? "",
            name: evaluation.users?.name ?? "",
            imageSrc: evaluation.users?.image ? STORAGE_PATH.USER_PROFILE + evaluation.users.image : undefined,
        },
    }));

    return evaluations

}

export async function addEvaluation(plantId: number, comment: string, type: EvaluationType): Promise<void> {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("ユーザーが見つかりません");
        }

        // TODO  auth_id が一意のインデックスとして設定されていないためfindUniqueが使えない
        const userData = await prisma.public_users.findFirst({
            where: {
                auth_id: user.id,
            },
        });

        if (!userData) {
            throw new Error("ユーザーが見つかりません");
        }

        const evaluation = await prisma.evaluations.create({
            data: {
                plant_id: plantId,
                user_id: userData.id,
                comment: comment,
                type: type,
            },
        });

        if (!evaluation) {
            throw new Error("評価投稿に失敗しました。");
        }

        revalidatePath(`/plants/${plantId}`);

    } catch (error) {
        console.error("Error adding evaluation:", error);
        throw error;
    }
}