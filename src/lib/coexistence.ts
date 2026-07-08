// 共存実績の表示ランク (doc/service-description-photo-sns.md §5.3)
// 「危険」と断定せず、情報が無い場合は「情報がない」と表現する。

export type CoexistenceRank = "many" | "some" | "few" | "none";

export const COEXISTENCE_THRESHOLD = {
    /** これ以上で「多くの猫と暮らしています」 */
    MANY: 50,
    /** これ以上で「N匹の猫と暮らしています」 */
    SOME: 10,
} as const;

export function getCoexistenceRank(catCount: number): CoexistenceRank {
    if (catCount >= COEXISTENCE_THRESHOLD.MANY) return "many";
    if (catCount >= COEXISTENCE_THRESHOLD.SOME) return "some";
    if (catCount >= 1) return "few";
    return "none";
}

export function getCoexistenceMessage(catCount: number): string {
    switch (getCoexistenceRank(catCount)) {
        case "many":
            return `多くの猫と暮らしています（${catCount}匹）`;
        case "some":
            return `${catCount}匹の猫と暮らしています`;
        case "few":
            return `少数の暮らしが報告されています（${catCount}匹）`;
        case "none":
            return "猫との共存情報がありません";
    }
}
