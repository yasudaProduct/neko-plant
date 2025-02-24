export type Evaluation = {
    id: number;
    type: EvaluationType;
    comment: string;
    createdAt: Date;
};

export enum EvaluationType {
    GOOD = "good",
    BAD = "bad",
}
