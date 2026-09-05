import { SexType } from "@/types/neko";

/** 性別の表示ラベル (フォームの選択肢と同じ表記に揃える) */
export const SEX_LABEL: Record<SexType, string> = {
    [SexType.MALE]: "おとこのこ",
    [SexType.FEMALE]: "おんなのこ",
};

/** 誕生日から満年齢を求める。未来の日付など計算できない場合は undefined */
export function calculatePetAge(birthday: Date, now: Date = new Date()): number | undefined {
    if (Number.isNaN(birthday.getTime())) {
        return undefined;
    }

    let age = now.getFullYear() - birthday.getFullYear();
    const monthDiff = now.getMonth() - birthday.getMonth();

    // 誕生日がまだ来ていない年は1つ引く
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthday.getDate())) {
        age--;
    }

    return age >= 0 ? age : undefined;
}

/**
 * 表示に使う年齢。
 * 誕生日があればそこから計算する (登録時点で固定される age より正確なため)。
 * 誕生日がない猫だけ、手入力の age をそのまま使う。
 */
export function getDisplayPetAge(pet: { age?: number; birthday?: Date }): number | undefined {
    if (pet.birthday) {
        return calculatePetAge(pet.birthday);
    }

    return pet.age;
}
