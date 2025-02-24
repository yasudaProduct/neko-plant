"use server";

import prisma from "@/lib/prisma";
import { Plant } from "../app/types/plant";
import { createClient } from "@/lib/supabase/server";

export async function getPlants(): Promise<Plant[]> {
    console.log("plant-action:start")
    const supabase = await createClient();

    const plantsData = await prisma.plants.findMany({
        select: {
            id: true,
            name: true,
            image: true,
        },
    });

    const plants: Plant[] = plantsData.map((plant) => ({
        id: plant.id,
        name: plant.name,
        imageUrl: plant.image ? supabase.storage.from("plant").getPublicUrl(plant.image).data.publicUrl : undefined,
    }));

    console.log(plants);

    return plants
}