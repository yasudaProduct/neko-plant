export type Plant = {
    id: number;
    name: string;
    mainImageUrl?: string;
    scientific_name?: string;
    family?: string;
    genus?: string;
    species?: string;
    coexistenceCatCount: number;
    coexistencePostCount: number;
};