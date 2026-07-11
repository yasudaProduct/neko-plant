import { describe, expect, it } from "vitest";
import { calculateTargetSize } from "@/lib/client-image";

describe("calculateTargetSize", () => {
    it("長辺がmaxEdge以下ならそのまま返す", () => {
        expect(calculateTargetSize(1024, 768, 2048)).toEqual({ width: 1024, height: 768 });
    });

    it("長辺ちょうどのときは縮小しない", () => {
        expect(calculateTargetSize(2048, 1536, 2048)).toEqual({ width: 2048, height: 1536 });
    });

    it("拡大はしない", () => {
        expect(calculateTargetSize(100, 50, 2048)).toEqual({ width: 100, height: 50 });
    });

    it("横長画像を長辺基準でアスペクト比を保って縮小する", () => {
        expect(calculateTargetSize(4096, 3072, 2048)).toEqual({ width: 2048, height: 1536 });
    });

    it("縦長画像も長辺基準で縮小する", () => {
        expect(calculateTargetSize(3000, 6000, 2048)).toEqual({ width: 1024, height: 2048 });
    });

    it("端数は四捨五入する", () => {
        // 4032x3024 (12MP 4:3) -> 長辺2048 -> 短辺 3024 * (2048/4032) = 1536
        expect(calculateTargetSize(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 });
        // 4000x3000 -> 2048 x 1536
        expect(calculateTargetSize(4000, 3000, 2048)).toEqual({ width: 2048, height: 1536 });
        // 奇数比率: 5000x333 -> 2048 x 136.4 -> 136
        expect(calculateTargetSize(5000, 333, 2048)).toEqual({ width: 2048, height: 136 });
    });

    it("極端な比率でも1px未満にならない", () => {
        expect(calculateTargetSize(100000, 10, 2048)).toEqual({ width: 2048, height: 1 });
    });
});
