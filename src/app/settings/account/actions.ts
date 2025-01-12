import { createClient } from "@/lib/supabase/server";

export async function updateEmail(email: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.updateUser({ email });
    return { data, error };
}