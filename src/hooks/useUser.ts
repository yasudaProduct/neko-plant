import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { generateAliasId } from "@/lib/utils";

interface ExtendedUser extends User {
    alias_id: string;
    name: string;
    image?: string;
}

export default function useUser() {
    console.log('useUser')
    const supabase = createClient();
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<ExtendedUser | null>(null);

    const getUserProfiles = async () => {
        console.log('useUser: getUserProfiles')
        console.log('useUser: getUserProfiles: session', session)
        try {
            const { data: user_profiles } = await supabase
                .from('users')
                .select('alias_id, name, image')
                .eq('auth_id', session!.user.id)
                .single();

            if (user_profiles) {
                setUser({
                    ...session!.user,
                    ...user_profiles!,
                });
            } else {
                setUser(null);
            }

        } catch (error) {
            console.log('useUser: getUserProfiles: error', error)
        }
    }

    useEffect(() => {
        console.log('useUser: useEffect')

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('useUser: onAuthStateChange')
            console.log('useUser: onAuthStateChange: event', event)
            if (session) {
                // signInWithPasswordの後sessionがnullの状態で呼ばれる
                setSession(session);
                getUserProfiles();
            }
        }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (session) {
            getUserProfiles();
        } else {
            setUser(null);
        }
    }, [session]);

    const signUp = async (email: string, password: string, username: string) => {
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: username,
                        default_alias_id: generateAliasId(),
                    },
                },
            });

            if (error) {
                throw error;
            }

        } catch (error) {
            throw error;
        }
    };

    // function signInWithGithub() {
    //     supabase.auth.signIn({ provider: "github" });
    // }

    const signIn = async (email: string, password: string) => {
        console.log('useUser: signIn')
        try {
            const { error, data: { session } } = await supabase.auth.signInWithPassword({ email, password });
            console.log('useUser: signIn: session', session)
            setSession(session);

            if (error) {
                throw error;
            }

        } catch (error) {
            console.log('useUser: signIn: error', error)
            throw error;
        }
    }

    function signOut() {
        supabase.auth.signOut();
    }

    return {
        session,
        user,
        signUp,
        signIn,
        signOut,
    };
}