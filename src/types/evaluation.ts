import { Pet } from "./neko";

export type Evaluation = {
    id: number;
    type: EvaluationType;
    comment: string;
    createdAt: Date;
    pets?: Pet[];
    imageUrls?: string[];
    user: {
        aliasId: string;
        name: string;
        imageSrc?: string;
    };
};

export type EvaluationReAction = {
    id: number;
    type: EvaluationReActionType;
    isMine: boolean;
}

export enum EvaluationType {
    GOOD = "good",
    BAD = "bad",
}

export enum EvaluationReActionType {
    GOOD = "good",
    BAD = "bad",
}
