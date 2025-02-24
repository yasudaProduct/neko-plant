"use server";

import prisma from "@/lib/prisma";
import { Evaluation, EvaluationType } from "../app/types/evaluation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getEvaluations(plantId: number): Promise<Evaluation[]> {

    const evaluationsData = await prisma.evaluations.findMany({
        where: {
            plant_id: plantId,
        },
        orderBy: {
            created_at: "desc",
        },
    });

    const evaluations: Evaluation[] = evaluationsData.map((evaluation) => ({
        id: evaluation.id,
        type: evaluation.type as EvaluationType,
        comment: evaluation.comment ?? "",
        createdAt: evaluation.created_at,
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
        console.error('Error adding evaluation:', error);
        throw error;
    }
}