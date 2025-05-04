import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { getNekoSpecies } from "@/actions/neko-action";
// Prismaのモック
vi.mock('@/lib/prisma', () => ({
    default: {
        neko: {
            findMany: vi.fn(),
        }
    },
}));

describe('Neko Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getNekoSpecies', () => {
        it('猫一覧が取得できること', async () => {

            // Arrange
            const mockNeko = [
                {
                    id: 1,
                    name: 'テスト猫1',
                    created_at: new Date(),
                    image: null,
                },
                {
                    id: 2,
                    name: 'テスト猫2',
                    created_at: new Date(),
                    image: null,
                },
            ];
            vi.mocked(prisma.neko.findMany).mockResolvedValue(mockNeko);

            // Act
            const result = await getNekoSpecies();

            // Assert
            expect(result).toEqual([
                {
                    id: 1,
                    name: 'テスト猫1',
                },
                {
                    id: 2,
                    name: 'テスト猫2',
                },
            ]);

        });
    });
});