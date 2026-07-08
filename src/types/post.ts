import { NekoSpecies } from "./neko";

export type PostUser = {
    aliasId: string;
    name: string;
    imageSrc?: string;
};

export type PostPet = {
    id: number;
    name: string;
    imageSrc?: string;
    neko?: NekoSpecies;
};

export type PostPlant = {
    id: number;
    name: string;
    /** この植物と暮らすユニークな猫の数 (共存バッジ表示用) */
    catCount: number;
};

export type Post = {
    id: number;
    comment?: string;
    createdAt: Date;
    imageUrls: string[];
    plants: PostPlant[];
    pets: PostPet[];
    user: PostUser;
    likeCount: number;
    likedByMe: boolean;
    isMine: boolean;
};

/** 植物ごとの共存実績サマリー */
export type PlantCoexistence = {
    /** 投稿数 */
    postCount: number;
    /** 投稿に紐づくユニークな猫の数 */
    catCount: number;
};

/** サイト全体の集計 (ヒーロー・図鑑ヘッダー用) */
export type SiteStats = {
    postCount: number;
    catCount: number;
    plantCount: number;
};

/** 投稿から自動集計されるユーザーの植物コレクション */
export type UserPlantCollectionItem = {
    plantId: number;
    plantName: string;
    mainImageUrl?: string;
    postCount: number;
    catCount: number;
    latestPostAt: Date;
};

/** ユーザープロフィールの集計 */
export type UserStats = {
    postCount: number;
    petCount: number;
    plantCount: number;
};
