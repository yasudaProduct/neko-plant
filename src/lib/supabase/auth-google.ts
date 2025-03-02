// lib/supabase-auth/authGoogle.ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "./server";

// ---------------------------------------------
// Googleログイン
// ---------------------------------------------
export async function signInWithGoogle() {
    console.log("signInWithGoogle");
    // クライアントを作成
    const supabase = await createClient();
    const { data: { url }, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_BASE_URL}/auth/callback`,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    });
    if (error) console.error('Googleログインエラー:', error.message)
    if (!error && url) redirect(url);
}

// ---------------------------------------------
// Googleログアウト
// ---------------------------------------------
export async function signOut() {
    // クライアントを作成
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Googleログアウトエラー:', error.message)
    if (!error) return true;
    return false;
}