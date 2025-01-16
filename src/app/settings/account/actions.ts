"use server";

import { createClient } from "@supabase/supabase-js";

export async function deleteUser(userId: string) {
    console.log("deleteUser", userId);

    const supabaseAdmin = await createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SERVICE_ROLE_KEY!,
    );
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
        throw error;
    }
    return { data, error };
}
