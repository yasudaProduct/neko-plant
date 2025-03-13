"use server";

import { Pet, SexType } from "@/app/types/neko";
import { Plant } from "@/app/types/plant";
import { UserProfile } from "@/app/types/user";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { pets } from "@prisma/client";
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

    // TODO public_usersのテーブルにデータがない場合は登録ページに飛ばしてもいい
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
        imageSrc: pet.image ? process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/user_pets/" + pet.image : undefined,
        neko: pet.neko,
        sex: pet.sex as SexType ?? undefined,
        birthday: pet.birthday ?? undefined,
        age: pet.age ?? undefined,
    }));
}

export async function updateUser(name: string, aliasId: string) {
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

    const { error } = await supabase.auth.updateUser({
        data: {
            name: name,
            alias_id: aliasId,
            // bio: bio,
        },
    });

    if (error) {
        throw error;
    }

    revalidatePath(`/settings/profile`);
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

export async function addPet(name: string, speciesId: number, image?: File, sex?: SexType, birthday?: string, age?: number) {
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

    await prisma.$transaction(async (prisma) => {

        console.log(sex);
        console.log(birthday);
        console.log(age);
        const neko = await prisma.pets.create({
            data: {
                name: name,
                neko_id: speciesId,
                user_id: userData.id,
                sex: sex as SexType,
                age: age,
                birthday: birthday ? new Date(birthday) : undefined,
            } as pets,
        });

        // 画像をアップロード
        if (image) {

            const imageSrc: string = `${userData.auth_id}/${neko.id}`;

            const { error } = await supabase.storage
                .from("user_pets")
                .upload(imageSrc, image, {
                    upsert: true,
                });

            if (error) {
                console.error(error);
                throw error;
            }

            // 画像のURLを更新
            await prisma.pets.update({
                where: {
                    id: neko.id,
                },
                data: {
                    image: imageSrc,
                },
            });
        }
    })

    revalidatePath(`/${userData.alias_id}`);
}

export async function updatePet(petId: number, name: string, speciesId: number, image?: File, sex?: SexType, birthday?: string, age?: number) {
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

    await prisma.$transaction(async (prisma) => {

        await prisma.pets.update({
            where: {
                id: petId,
            },
            data: {
                name: name,
                neko_id: speciesId,
                sex: sex as SexType,
                birthday: birthday ? new Date(birthday) : undefined,
                age: age,
            },
        });

        // 画像をアップロード
        if (image) {

            const imageSrc: string = `${userData.auth_id}/${petId}`;

            const { error } = await supabase.storage
                .from("user_pets")
                .upload(imageSrc, image, {
                    upsert: true,
                });

            if (error) {
                console.error(error);
                throw error;
            }

            // 画像のURLを更新
            await prisma.pets.update({
                where: {
                    id: petId,
                },
                data: {
                    image: imageSrc,
                },
            });
        }
    })
    revalidatePath(`/${userData.alias_id}`);
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

export async function getUserPlants(userId: number): Promise<Plant[] | undefined> {
    const plants = await prisma.plant_have.findMany({
        where: {
            user_id: userId,
        },
        include: {
            plants: true,
        },
        orderBy: {
            id: "asc",
        },
    });

    return plants.map((plant) => ({
        id: plant.id,
        name: plant.plants.name,
        imageUrl: plant.plants.image_src ?? undefined,
        isFavorite: false,
        isHave: true,
    }));
}