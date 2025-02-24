import { Pet } from "./neko";

export type Evaluation = {
    id: number;
    type: EvaluationType;
    comment: string;
    createdAt: Date;
    pets?: Pet[];
};

export enum EvaluationType {
    GOOD = "good",
    BAD = "bad",
}
