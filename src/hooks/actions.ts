'use server'

import { createClient } from "@/lib/supabase/server";
import { Session, User } from "@supabase/supabase-js";

export async function login(email: string, password: string): Promise<{ user: User | null; session: Session | null }> {
    try {
        const supabase = await createClient()

        const { data: { user, session }, error } = await supabase.auth.signInWithPassword({ email, password })


        if (error) {
            throw error
        }

        return { user, session }

    } catch (error) {
        throw error
    }
}