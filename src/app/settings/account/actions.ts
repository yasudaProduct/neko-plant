"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function deleteUser(userId: string) {
    console.log("ユーザー削除処理を開始します", { userId });

    try {
        const supabaseAdmin = await createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SERVICE_ROLE_KEY!,
        );

        // 関連データの削除
        console.log("ユーザー関連データの削除を開始します");

        // // プロフィールの削除
        // const { error: profileError } = await supabaseAdmin
        //     .from("profiles")
        //     .delete()
        //     .eq("id", userId);

        // if (profileError) {
        //     console.error("プロフィールの削除に失敗しました", profileError);
        //     throw new Error("プロフィールの削除に失敗しました");
        // }

        // // 投稿の削除
        // const { error: postsError } = await supabaseAdmin
        //     .from("posts")
        //     .delete()
        //     .eq("user_id", userId);

        // if (postsError) {
        //     console.error("投稿の削除に失敗しました", postsError);
        //     throw new Error("投稿の削除に失敗しました");
        // }

        // // コメントの削除
        // const { error: commentsError } = await supabaseAdmin
        //     .from("comments")
        //     .delete()
        //     .eq("user_id", userId);

        // if (commentsError) {
        //     console.error("コメントの削除に失敗しました", commentsError);
        //     throw new Error("コメントの削除に失敗しました");
        // }

        // // お気に入りの削除
        // const { error: favoritesError } = await supabaseAdmin
        //     .from("favorites")
        //     .delete()
        //     .eq("user_id", userId);

        // if (favoritesError) {
        //     console.error("お気に入りの削除に失敗しました", favoritesError);
        //     throw new Error("お気に入りの削除に失敗しました");
        // }

        // console.log("ユーザー関連データの削除が完了しました");

        // // ユーザーアカウントの削除
        console.log("ユーザーアカウントの削除を開始します");
        const { error: userError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (userError) {
            console.error("ユーザーアカウントの削除に失敗しました", userError);
            throw new Error("ユーザーアカウントの削除に失敗しました");
        }

        console.log("ユーザー削除処理が完了しました");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("ユーザー削除処理でエラーが発生しました", error);
        throw error;
    }
}
