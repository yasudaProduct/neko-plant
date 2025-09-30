import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { generateAliasId } from "@/lib/utils";

interface ExtendedUser extends User {
    alias_id: string;
    name: string;
    image?: string;
}

export default function useUser() {
    const supabase = createClient();
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<ExtendedUser | null>(null);

    const getUserProfiles = async () => {
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

        } catch {
        }
    }

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
            if (session) {
                // signInWithPasswordの後sessionがnullの状態で呼ばれる
                setSession(session);
                getUserProfiles();
            } else {
                setSession(null);
                setUser(null);
            }
        }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (session) {
            getUserProfiles();
        } else {
            setUser(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const signUp = async (email: string, password: string, username: string) => {
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: username,
                        alias_id: generateAliasId(),
                    },
                },
            });

            if (error) {
                console.log('useUser: signUp: error', error)
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