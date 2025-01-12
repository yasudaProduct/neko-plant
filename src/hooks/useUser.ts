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

    useEffect(() => {
        console.log('useUser: useEffect')

        const getUserProfiles = async () => {
            console.log('useUser: getUserProfiles')
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
        }

        if (session) {
            console.log('useUser: session', session)
            setSession(session);
            getUserProfiles();
        } else {
            console.log('useUser: session', session)
            setSession(null);
            setUser(null);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('useUser: onAuthStateChange')
                setSession(session);
                getUserProfiles();
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

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
        try {
            const { error, data: { session } } = await supabase.auth.signInWithPassword({ email, password });
            setSession(session);

            if (error) {
                throw error;
            }

        } catch (error) {
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