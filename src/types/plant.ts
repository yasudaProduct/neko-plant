export type Plant = {
    id: number;
    name: string;
    mainImageUrl?: string;
    scientific_name?: string;
    family?: string;
    genus?: string;
    species?: string;
    /** 投稿数 */
    postCount: number;
    /** 投稿に紐づくユニークな猫の数 (共存実績) */
    catCount: number;
};
