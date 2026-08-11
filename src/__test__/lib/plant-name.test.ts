import { describe, expect, it } from "vitest";
import { normalizePlantName, plantNameKey } from "@/lib/plant-name";

// 期待値は plants_name_normalized_key の式
//   lower(btrim(regexp_replace(normalize(name, NFKC), '\s+', ' ', 'g')))
// を PostgreSQL 15 で実際に評価した結果と一致させている。
// TS と PG のどちらかだけを変えると、アプリが重複と判定しないのに
// DB が 23505 を返す状態になるため、必ずセットで更新すること。
describe("normalizePlantName", () => {
    it.each([
        ["　Ｍｏｎｓｔｅｒａ　ﾃﾞﾘｼｵｰｻ ", "Monstera デリシオーサ"],
        ["ｐｇｔａｐ　ｍｏｎｓｔｅｒａ　　ｄｅｌｉｃｉｏｓａ ", "pgtap monstera deliciosa"],
        ["  パキラ  ", "パキラ"],
        ["a　　b", "a b"],
        ["　  　", ""],
    ])("%s -> %s", (input, expected) => {
        expect(normalizePlantName(input)).toBe(expected);
    });

    it("大文字小文字は保持する (表示名なので畳まない)", () => {
        expect(normalizePlantName("Monstera")).toBe("Monstera");
    });

    it("冪等である (マイグレーションの表示名UPDATEがキーを変えない前提)", () => {
        for (const input of ["　Ｍｏｎｓｔｅｒａ　", "a　　b", "パキラ", "ﾊﾟｷﾗ "]) {
            expect(normalizePlantName(normalizePlantName(input))).toBe(normalizePlantName(input));
        }
    });
});

describe("plantNameKey", () => {
    it("大文字小文字と表記揺れを畳んで同じキーになる", () => {
        expect(plantNameKey("Monstera Deliciosa")).toBe(
            plantNameKey("ｍｏｎｓｔｅｒａ　　ｄｅｌｉｃｉｏｓａ "),
        );
    });

    it("半角カナと全角カナが同じキーになる", () => {
        expect(plantNameKey("ﾊﾟｷﾗ")).toBe(plantNameKey("パキラ"));
    });

    it("別の植物は別のキーになる (過剰に畳んでいない)", () => {
        expect(plantNameKey("Monstera Deliciosa")).not.toBe(plantNameKey("Monstera Adansonii"));
    });

    it("空白のみの入力は空キーになる", () => {
        expect(plantNameKey("　  　")).toBe("");
    });
});
