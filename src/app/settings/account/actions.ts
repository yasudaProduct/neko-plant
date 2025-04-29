"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function deleteUser(userId: string) {
    console.log("ユーザー削除処理を開始します", { userId });

    try {
        const supabaseAdmin = await createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

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
