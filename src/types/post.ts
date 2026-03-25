import { Pet } from "./neko";

export type Post = {
    id: number;
    comment: string | null;
    createdAt: Date;
    pet?: Pet;
    imageUrls: string[];
    likeCount: number;
    isLiked: boolean;
    user: {
        aliasId: string;
        name: string;
        imageSrc?: string;
    };
    plant?: {
        id: number;
        name: string;
    };
};
