"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createClientAdmin } from "@supabase/supabase-js";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteUser() {
    console.log("ユーザー削除処理を開始します");

    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("ユーザーが見つかりません");
        }

        const supabaseAdmin = await createClientAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        // 退会前にストレージ上の本人画像のパスを収集しておく
        // (DBの行は auth ユーザー削除のカスケードで消えるため、先に集める必要がある)
        const publicUser = await prisma.public_users.findUnique({
            where: { auth_id: user.id },
        });

        const postImagePaths = publicUser
            ? (await prisma.post_images.findMany({
                where: { posts: { user_id: publicUser.id } },
                select: { image_url: true },
            })).map((image) => image.image_url)
            : [];

        const petImagePaths = publicUser
            ? (await prisma.pets.findMany({
                where: { user_id: publicUser.id, image: { not: null } },
                select: { image: true },
            })).map((pet) => pet.image!)
            : [];

        const profileImagePath = publicUser?.image ?? null;

        // ユーザーアカウントの削除 (public.users・投稿・猫等はカスケード削除される)
        console.log("ユーザーアカウントの削除を開始します");
        const { error: userError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

        if (userError) {
            console.error("ユーザーアカウントの削除に失敗しました", userError);
            throw new Error("ユーザーアカウントの削除に失敗しました");
        }

        // ストレージ上の画像を削除 (アカウント削除自体は完了しているため、失敗はログのみ)
        const removals: [string, string[]][] = [
            ["posts", postImagePaths],
            ["user_pets", petImagePaths],
            ["user_profiles", profileImagePath ? [profileImagePath] : []],
        ];
        for (const [bucket, paths] of removals) {
            if (paths.length === 0) continue;
            const { error } = await supabaseAdmin.storage.from(bucket).remove(paths);
            if (error) {
                console.error(`退会時のストレージ削除に失敗しました (${bucket})`, error);
            }
        }

        console.log("ユーザー削除処理が完了しました");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("ユーザー削除処理でエラーが発生しました", error);
        throw error;
    }
}
