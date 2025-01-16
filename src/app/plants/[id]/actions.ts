"use server";
import { createClient } from "@/lib/supabase/server";

export async function addEvaluation(formData: FormData): Promise<void> {
    console.log("addEvaluation");
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return;
        }

        const { data: user_profiles } = await supabase
            .from("users")
            .select("id")
            .eq("auth_id", user.id)
            .single();

        if (!user_profiles) {
            return;
        }

        const comment = formData.get("comment");
        const type = formData.get("type");
        const plantId = formData.get("plantId");

        const { error } = await supabase.from("evaluations").insert({
            plant_id: plantId,
            user_id: user_profiles.id,
            comment: comment,
            type: type,
        });

        if (error) {
            console.error('Failed to add evaluation:', error);
        } else {
            console.log('Evaluation added successfully:', "評価に成功しました。");
        }
    } catch (error) {
        console.error('Error adding evaluation:', error);
        // Handle any unexpected errors
    }
}
