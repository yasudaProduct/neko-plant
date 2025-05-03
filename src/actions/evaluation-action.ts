"use server";

import prisma from "@/lib/prisma";
import { Evaluation, EvaluationReAction, EvaluationReActionType, EvaluationType } from "../types/evaluation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { STORAGE_PATH } from "@/lib/const";
import { ActionErrorCode, ActionResult } from "@/types/common";

export async function getEvaluations(plantId: number): Promise<Evaluation[]> {
    const supabase = await createClient();

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

    const evaluations = await Promise.all(evaluationsData.map(async (evaluation) => ({
        id: evaluation.id,
        type: evaluation.type as EvaluationType,
        comment: evaluation.comment ?? "",
        createdAt: evaluation.created_at,
        pets: (petsData && petsData.length > 0) ? petsData.filter((pet) => pet.user_id === evaluation.user_id).map((pet) => ({
            id: pet.id,
            name: pet.name,
            imageSrc: pet.image ? STORAGE_PATH.USER_PET + pet.image : undefined,
            neko: pet.neko,
        })) : undefined,
        imageUrls: (await supabase.storage.from("evaluations").list(
            `${evaluation.id}`, {
            limit: 5,
            offset: 0,
            sortBy: { column: 'name', order: 'desc' },
        })).data?.map(file => STORAGE_PATH.EVALUATION + `${evaluation.id}/${file.name}`),
        user: {
            aliasId: evaluation.users?.alias_id ?? "",
            name: evaluation.users?.name ?? "",
            imageSrc: evaluation.users?.image ? STORAGE_PATH.USER_PROFILE + evaluation.users.image : undefined,
        },
    })));

    return evaluations;
}

export async function addEvaluation(plantId: number, comment: string, type: EvaluationType, images?: File[]): Promise<ActionResult> {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません" };
        }

        // TODO  auth_id が一意のインデックスとして設定されていないためfindUniqueが使えない
        const userData = await prisma.public_users.findFirst({
            where: {
                auth_id: user.id,
            },
        });

        if (!userData) {
            return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません" };
        }

        if (images && images.length > 3) {
            return { success: false, code: ActionErrorCode.VALIDATION_ERROR, message: "最大3枚までしかアップロードできません。" };
        }

        await prisma.$transaction(async (tx) => {

            const evaluation = await tx.evaluations.create({
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

            // 画像をアップロード（必要な場合のみ）
            if (images && images.length > 0) {
                for (let i = 0; i < images.length; i++) {
                    // インデックスを画像名として使用
                    const imageName = `${i + 1}`;
                    await supabase.storage.from("evaluations").upload(
                        `${evaluation.id}/${imageName}`,
                        images[i]
                    );
                }
            }
        });

        revalidatePath(`/plants/${plantId}`);

        return { success: true, message: "評価を投稿しました。" };

    } catch (error) {
        console.error("Error adding evaluation:", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "評価の投稿に失敗しました。" };
    }
}

export async function deleteEvaluation(evaluationId: number): Promise<ActionResult> {
    console.log(`evaluationId: ${evaluationId}`);
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません。" };
    }

    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!userData) {
        return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません。" };
    }

    try {

        const evaluation = await prisma.evaluations.findUnique({
            where: {
                id: evaluationId,
                user_id: userData.id,
            },
        });

        if (!evaluation) {
            return { success: false, code: ActionErrorCode.NOT_FOUND, message: "評価が見つかりません。" };
        }

        await prisma.evaluations.delete({
            where: {
                id: evaluationId,
                user_id: userData.id,
            },
        });

        const { data: files } = await supabase.storage.from("evaluations")
            .list(`${evaluationId}`);

        if (files) {
            for (const file of files) {
                const { error } = await supabase.storage.from("evaluations").remove([`${evaluationId}/${file.name}`]);
                if (error) {
                    console.error("Error deleting evaluation:", error);
                }
            }
        }

        revalidatePath(`/${userData.alias_id}/posts`);

        return { success: true, message: "評価を削除しました。" };

    } catch (error) {
        console.error("Error deleting evaluation:", error);
        return { success: false, code: ActionErrorCode.INTERNAL_SERVER_ERROR, message: "評価の削除に失敗しました。" };
    }
}

export async function getEvalReAction(evalId: number): Promise<EvaluationReAction[]> {
    const supabase = await createClient();

    let userId: number | undefined;
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {

        const userData = await prisma.public_users.findFirst({
            where: {
                auth_id: user.id,
            },
        });
        userId = userData?.id;
    }

    const reActions = await prisma.evaluation_reactions.findMany({
        where: {
            evaluation_id: evalId,
        },
        include: {
            users: {
                select: {
                    id: true,
                },
            },
        },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return reActions.map((reAction: any) => ({
        id: reAction.id,
        type: reAction.type as EvaluationReActionType,
        isMine: reAction.users.id === userId,
    }));
}

export async function upsertReAction(evalId: number, type: EvaluationReActionType): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません" };
    }

    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!userData) {
        return { success: false, code: ActionErrorCode.AUTH_REQUIRED, message: "ユーザーが見つかりません" };
    }

    // 自分のコメント評価を取得
    const reAction = await prisma.evaluation_reactions.findFirst({
        where: {
            evaluation_id: evalId,
            user_id: userData.id,
        },
    });

    if (reAction) {
        // 既にコメント評価している場合はupdate
        await prisma.evaluation_reactions.update({
            where: {
                id: reAction.id,
            },
            data: {
                type: type,
            },
        });
    } else {
        // 自分のコメント評価がない場合はcreate
        await prisma.evaluation_reactions.create({
            data: {
                evaluation_id: evalId,
                user_id: userData.id,
                type: type,
            },
        });
    }

    return { success: true, message: "コメント評価を更新しました。" };
}

export async function deleteReAction(evalId: number): Promise<void> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("ユーザーが見つかりません");
    }

    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!userData) {
        throw new Error("ユーザーが見つかりません");
    }

    await prisma.evaluation_reactions.deleteMany({ // キー指定ではないためdeleteManyとなるがドメイン制約上は1件のみとなる
        where: {
            evaluation_id: evalId,
            user_id: userData.id,
        }
    });
}