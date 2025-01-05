import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { AuthApiError, Session } from "@supabase/supabase-js";
import { generateAliasId } from "@/lib/utils";

export default function useUser() {
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        console.log("useUser:useEffect");
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                console.log("useUser:useEffect:onAuthStateChange");
                console.log("useUser:useEffect:onAuthStateChange:event", event);
                console.log("useUser:useEffect:onAuthStateChange:session", session);
                setSession(session);
            }
        );

        return () => {
            console.log("useUser:useEffect:return");
            authListener.subscription.unsubscribe();
        };
    }, []);

    const signUp = async (email: string, password: string, username: string) => {
        console.log("signUp: start");

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
            console.log("signUp: username", username);
            console.log("signUp: error", error);

            if (error) {
                throw error;
            }

        } catch (error) {
            console.log("signUp error", error);
            console.log("signUp error.message", (error as AuthApiError).message);
            console.log("signUp error.code", (error as AuthApiError).code);
            throw error;
        }
    };

    // function signInWithGithub() {
    //     supabase.auth.signIn({ provider: "github" });
    // }

    const signIn = async (email: string, password: string) => {
        console.log("signIn");

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }
        } catch (error) {
            console.log("signIn error", error);
            console.log("signIn error.message", (error as AuthApiError).message);
            console.log("signIn error.code", (error as AuthApiError).code);
            throw error;
        }
    }

    function signOut() {
        console.log("signOut");
        supabase.auth.signOut();
    }

    return {
        session,
        signUp,
        signIn,
        signOut,
    };
}