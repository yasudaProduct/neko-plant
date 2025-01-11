'use server'

import { createClient } from "@/lib/supabase/server";
import { Session, User } from "@supabase/supabase-js";

export async function login(email: string, password: string): Promise<{ user: User | null; session: Session | null }> {
    try {
        console.log('login')
        const supabase = await createClient()

        const { data: { user, session }, error } = await supabase.auth.signInWithPassword({ email, password })

        console.log('login: user', user)
        console.log('login: session', session)

        if (error) {
            console.log('login: error⇩')
            console.log(error)
            console.log('login: error↑')
            throw error
        }

        console.log('login: success')
        return { user, session }

        // revalidatePath('/', 'layout')
        // redirect('/')
    } catch (error) {
        console.error('Login error:', error)
        throw error
    }
}