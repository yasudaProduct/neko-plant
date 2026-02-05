import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { identifyPlantFromImage } from "@/actions/plant-identification-action";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { ActionErrorCode } from "@/types/common";

vi.mock("@/lib/prisma", () => {
  const prisma = {
    plants: {
      findMany: vi.fn(),
    },
  };
  return { default: prisma };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("plant-identification-action", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("未ログインの場合はAUTH_REQUIRED", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as any);

    const file = new File([new Uint8Array([1, 2, 3])], "test.png", {
      type: "image/png",
    });

    const result = await identifyPlantFromImage(file);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(ActionErrorCode.AUTH_REQUIRED);
    }
  });

  it("OPENAI_API_KEY未設定の場合は候補0件で成功", async () => {
    delete process.env.OPENAI_API_KEY;

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
    } as any);

    const file = new File([new Uint8Array([1, 2, 3])], "test.png", {
      type: "image/png",
    });

    const result = await identifyPlantFromImage(file);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.candidates).toEqual([]);
    }
    expect(vi.mocked(prisma.plants.findMany)).not.toHaveBeenCalled();
  });

  it("AIレスポンスをパースして既存plantsに照合する", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_PLANT_ID_MODEL = "test-model";

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
    } as any);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content:
                '{"candidates":[{"name":" パキラ ","confidence":0.9},{"name":"モンステラ","confidence":0.5}]}',
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    vi.mocked(prisma.plants.findMany).mockResolvedValue([
      { id: 10, name: "パキラ" },
    ] as any);

    const file = new File([new Uint8Array([1, 2, 3])], "test.png", {
      type: "image/png",
    });

    const result = await identifyPlantFromImage(file);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.candidates).toHaveLength(2);
      expect(result.data?.candidates?.[0]).toEqual({
        name: "パキラ",
        confidence: 0.9,
        matchedPlant: { id: 10, name: "パキラ" },
      });
      expect(result.data?.candidates?.[1]?.name).toBe("モンステラ");
      expect(result.data?.candidates?.[1]?.matchedPlant).toBeUndefined();
    }
  });

  it("JPEG/PNG以外はVALIDATION_ERROR", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
    } as any);

    const file = new File([new Uint8Array([1, 2, 3])], "test.gif", {
      type: "image/gif",
    });

    const result = await identifyPlantFromImage(file);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(ActionErrorCode.VALIDATION_ERROR);
    }
  });
});

