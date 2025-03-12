export type Pet = {
    id: number;
    name: string;
    sex?: SexType;
    age?: number;
    birthday?: Date;
    imageSrc?: string;
    neko: NekoSpecies;
};

export type NekoSpecies = {
    id: number;
    name: string;
};

export enum SexType {
    MALE = "male",
    FEMALE = "female",
}