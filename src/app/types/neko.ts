export type Pet = {
    id: number;
    name: string;
    imageSrc?: string;
    neko: NekoSpecies;
};

export type NekoSpecies = {
    id: number;
    name: string;
};