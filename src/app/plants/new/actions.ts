"use server";

import { createClient } from "@/lib/supabase/server";
import { PostgrestError } from "@supabase/supabase-js";

export async function addPlant(name: string, image: File) {
    console.log("addPlant", name, image);
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (user == null) {
        return { success: false, message: "ログインしてください。" };
        // TODO ログイン画面にリダイレクト
    }

    if (!name || !image) {
        return { success: false, message: "植物の名前と画像は必須です。" };
    }

    // 植物を登録してIDを取得
    // 画像をアップロード
    // 画像のURLを取得
    // 植物のレコードに画像のURLを保存
    // 上記をトランザクションで実行

    const { error, data }: { error: PostgrestError | null, data: { id: number }[] | null } = await supabase
        .from("plants")
        .insert({
            name: name,
            // image: imageData.fullPath,
        })
        .select();

    if (error || data == null) {
        console.log("error", error);
        return { success: false, message: "追加に失敗しました。" };
    }

    const plantId = data[0].id;

    const { data: imageData, error: imageError } = await supabase.storage
        .from("plant")
        .upload(plantId.toString(), image);

    if (imageError) {
        console.log("imageError", imageError);
        return { success: false, message: "画像のアップロードに失敗しました。" };
    }

    const { error: imageUrlError } = await supabase
        .from("plants")
        .update({
            image: imageData.path,
        })
        .eq("id", plantId);

    if (imageUrlError) {
        console.log("imageUrlError", imageUrlError);
        return { success: false, message: "画像のURL取得に失敗しました。" };
    }

    return { success: true };
}
