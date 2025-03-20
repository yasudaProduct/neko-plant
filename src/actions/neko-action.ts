"use server";

import prisma from "@/lib/prisma";
import { Plant } from "../types/plant";
import { NekoSpecies } from "@/types/neko";

export async function getPlants(): Promise<Plant[]> {

    const plantsData = await prisma.plants.findMany({
        select: {
            id: true,
            name: true,
            image_src: true,
        },
    });

    const plants: Plant[] = plantsData.map((plant) => ({
        id: plant.id,
        name: plant.name,
        imageUrl: plant.image_src ?? undefined,
        isFavorite: false,
        isHave: false,
    }));

    return plants
}

export async function getNekoSpecies(): Promise<NekoSpecies[]> {
    const nekoSpeciesData = await prisma.neko.findMany({
        select: {
            id: true,
            name: true,
        },
        orderBy: {
            name: "asc",
        },
    });

    return nekoSpeciesData.map((neko) => ({
        id: neko.id,
        name: neko.name,
    }));
}