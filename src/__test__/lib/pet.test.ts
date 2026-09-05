import { describe, expect, it } from "vitest";
import { calculatePetAge, getDisplayPetAge, SEX_LABEL } from "@/lib/pet";
import { SexType } from "@/types/neko";

describe("calculatePetAge", () => {
    const now = new Date(2026, 8, 6); // 2026-09-06

    it("誕生日を過ぎていればその年の分を数える", () => {
        expect(calculatePetAge(new Date(2020, 8, 5), now)).toBe(6);
    });

    it("誕生日当日は加算される", () => {
        expect(calculatePetAge(new Date(2020, 8, 6), now)).toBe(6);
    });

    it("誕生日がまだ来ていない年は1つ引く", () => {
        expect(calculatePetAge(new Date(2020, 8, 7), now)).toBe(5);
        expect(calculatePetAge(new Date(2020, 11, 1), now)).toBe(5);
    });

    it("生後1年未満は0歳", () => {
        expect(calculatePetAge(new Date(2026, 0, 1), now)).toBe(0);
    });

    it("未来の日付は計算できないので undefined", () => {
        expect(calculatePetAge(new Date(2027, 0, 1), now)).toBeUndefined();
    });

    it("不正な日付は undefined", () => {
        expect(calculatePetAge(new Date("invalid"), now)).toBeUndefined();
    });
});

describe("getDisplayPetAge", () => {
    it("誕生日があれば手入力の age より優先する", () => {
        const age = getDisplayPetAge({ age: 99, birthday: new Date(2020, 0, 1) });

        expect(age).not.toBe(99);
        expect(age).toBeGreaterThanOrEqual(5);
    });

    it("誕生日がなければ手入力の age を使う", () => {
        expect(getDisplayPetAge({ age: 3 })).toBe(3);
    });

    it("どちらもなければ undefined", () => {
        expect(getDisplayPetAge({})).toBeUndefined();
    });
});

describe("SEX_LABEL", () => {
    it("フォームの選択肢と同じ表記を返す", () => {
        expect(SEX_LABEL[SexType.MALE]).toBe("おとこのこ");
        expect(SEX_LABEL[SexType.FEMALE]).toBe("おんなのこ");
    });
});
