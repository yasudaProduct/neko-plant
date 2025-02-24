"use server";

import prisma from "@/lib/prisma";
import { Evaluation, EvaluationType } from "../app/types/evaluation";

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