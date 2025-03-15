import { Pet } from "./neko";

export type Evaluation = {
    id: number;
    type: EvaluationType;
    comment: string;
    createdAt: Date;
    pets?: Pet[];
    user: {
        aliasId: string;
        name: string;
        imageSrc?: string;
    };
};

export enum EvaluationType {
    GOOD = "good",
    BAD = "bad",
}
