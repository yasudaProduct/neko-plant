"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateUser(userId: string, name: string, aliasId: string, bio?: string) {
    console.log("updateUser", userId, name, aliasId, bio);
    const supabase = await createClient();

    if (!name || !aliasId) {
        return { success: false, message: "ユーザー名と表示名は必須です。" };
    }

    const { error } = await supabase
        .from("users")
        .update({
            name: name,
            alias_id: aliasId,
            // bio: bio,
        })
        .eq("auth_id", userId);

    if (error) {
        console.log("error", error);
        return { success: false, message: "更新に失敗しました。" };
    }

    return { success: true };
}
