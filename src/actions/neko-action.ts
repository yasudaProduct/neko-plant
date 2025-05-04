"use server";

import prisma from "@/lib/prisma";
import { NekoSpecies } from "@/types/neko";

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