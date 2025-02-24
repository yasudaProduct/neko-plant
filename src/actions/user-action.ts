"use server";

import { Pet } from "@/app/types/neko";
import { UserProfile } from "@/app/types/user";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getUserProfile(aliasId: string): Promise<UserProfile | undefined> {
    const userData = await prisma.public_users.findFirst({
        select: {
            id: true,
            alias_id: true,
            auth_id: true,
            name: true,
            image: true,
        },
        where: {
            alias_id: aliasId,
        },
    });

    if (!userData) {
        return undefined;
    }

    return {
        id: userData.id,
        aliasId: userData.alias_id,
        authId: userData.auth_id,
        name: userData.name,
        imageSrc: userData.image ?? undefined,
    };
}

export async function getUserProfileByAuthId(): Promise<UserProfile | undefined> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return undefined;
    }

    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!userData) {
        return undefined;
    }

    return {
        id: userData.id,
        aliasId: userData.alias_id,
        authId: userData.auth_id,
        name: userData.name,
        imageSrc: userData.image ?? undefined,
    };
}

export async function getUserPets(userId: number): Promise<Pet[] | undefined> {
    const pets = await prisma.pets.findMany({
        where: {
            user_id: userId,
        },
        include: {
            neko: true,
        },
        orderBy: {
            id: "asc",
        },
    });

    if (!pets) { // TODO 0件の場合ちゃんと判定される？
        return undefined;
    }

    return pets.map((pet) => ({
        id: pet.id,
        name: pet.name,
        imageSrc: pet.image ?? undefined,
        neko: pet.neko,
    }));
}

export async function updateUser(name: string, aliasId: string, bio?: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("ユーザーが見つかりません。");
    }

    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!userData) {
        throw new Error("ユーザーが見つかりません");
    }

    await prisma.public_users.update({
        where: {
            id: userData.id,
        },
        data: {
            name: name,
            alias_id: aliasId,
            // bio: bio,
        },
    });

    revalidatePath(`/${userData.alias_id}`);
}

export async function updateUserImage(image: File) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("ユーザーが見つかりません");
    }

    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!userData) {
        throw new Error("ユーザーが見つかりません");
    }

    await prisma.$transaction(async (prisma) => {

        // 1. 画像をアップロード
        const { error } = await supabase.storage
            .from("user_profiles")
            .upload(`${userData.auth_id}/profile_image.png`, image, {
                upsert: true,
            });

        if (error) {
            throw error;
        }

        // 2. 画像のURLを取得
        const { data: { publicUrl } } = supabase.storage
            .from("user_profiles")
            .getPublicUrl(`${userData.auth_id}/profile_image.png`);

        // 3. ユーザーの画像を更新
        await prisma.public_users.update({
            where: {
                id: userData.id,
            },
            data: {
                image: publicUrl,
            },
        });
    })

    revalidatePath(`/settings/profile`);

}

export async function addPet(name: string, speciesId: number) {
    const supabase = await createClient();
    const {
        data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("ユーザーが見つかりません");
    }
    // TODO 認証状態の確認ってこれであっている？

    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    // TODO userIdを取得するのめんどくさくない？ authIdをpublic_usersの主キーにした方がいい？

    if (!userData) {
        throw new Error("ユーザーが見つかりません");
    }

    const neko = await prisma.pets.create({
        data: {
            name: name,
            neko_id: speciesId,
            user_id: userData.id,
        },
    });

    revalidatePath(`/${userData.alias_id}`);

    return neko;
}

export async function updatePet(petId: number, name: string, speciesId: number) {

    const supabase = await createClient();
    const {
        data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("ユーザーが見つかりません");
    }

    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    // TODO userIdを取得するのめんどくさくない？ authIdをpublic_usersの主キーにした方がいい？

    if (!userData) {
        throw new Error("ユーザーが見つかりません");
    }

    const petData = await prisma.pets.update({
        where: {
            id: petId,
        },
        data: {
            name: name,
            neko_id: speciesId,
        },
    });

    revalidatePath(`/${userData.alias_id}`);

    return petData;
}

export async function deletePet(petId: number) {
    const supabase = await createClient();
    const {
        data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("ユーザーが見つかりません");
    }

    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: user.id,
        },
    });

    if (!userData) {
        throw new Error("ユーザーが見つかりません");
    }

    const petData = await prisma.pets.delete({
        where: {
            id: petId,
        },
    });

    revalidatePath(`/${userData.alias_id}`);

    return petData;
}