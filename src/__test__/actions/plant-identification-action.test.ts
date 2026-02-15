import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { identifyPlantFromImage } from "@/actions/plant-identification-action";
import { createClient } from "@/lib/supabase/server";
import {
  getAiProviderConfig,
  chatCompletion,
} from "@/lib/ai-provider";
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

vi.mock("@/lib/ai-provider", () => ({
  getAiProviderConfig: vi.fn(),
  chatCompletion: vi.fn(),
}));

/** arrayBuffer() が動作する File を生成するヘルパー */
function createTestFile(
  name: string,
  type: string,
  bytes: Uint8Array = new Uint8Array([1, 2, 3])
): File {
  const file = new File([bytes], name, { type });
  // Node.js/Vitest 環境で arrayBuffer() が無い場合に補填
  if (typeof file.arrayBuffer !== "function") {
    (file as unknown as Record<string, () => Promise<ArrayBuffer>>).arrayBuffer = () =>
      Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  }
  return file;
}

describe("plant-identification-action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("未ログインの場合はAUTH_REQUIRED", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const file = createTestFile("test.png", "image/png");

    const result = await identifyPlantFromImage(file);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(ActionErrorCode.AUTH_REQUIRED);
    }
  });

  it("AIプロバイダー未設定の場合は候補0件で成功", async () => {
    vi.mocked(getAiProviderConfig).mockReturnValue(null);

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const file = createTestFile("test.png", "image/png");

    const result = await identifyPlantFromImage(file);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.candidates).toEqual([]);
    }
    expect(vi.mocked(prisma.plants.findMany)).not.toHaveBeenCalled();
  });

  it("AIレスポンスをパースして既存plantsに照合する", async () => {
    vi.mocked(getAiProviderConfig).mockReturnValue({
      provider: "gemini",
      apiKey: "test-key",
      model: "gemini-2.5-flash-lite",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    });

    vi.mocked(chatCompletion).mockResolvedValue(
      '{"candidates":[{"name":" パキラ ","confidence":0.9},{"name":"モンステラ","confidence":0.5}]}'
    );

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(prisma.plants.findMany).mockResolvedValue([
      { id: 10, name: "パキラ" },
    ] as unknown as Awaited<ReturnType<typeof prisma.plants.findMany>>);

    const file = createTestFile("test.png", "image/png");

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

  it("AI API呼び出しが失敗した場合はINTERNAL_SERVER_ERROR", async () => {
    vi.mocked(getAiProviderConfig).mockReturnValue({
      provider: "gemini",
      apiKey: "test-key",
      model: "gemini-2.5-flash-lite",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    });

    vi.mocked(chatCompletion).mockRejectedValue(
      new Error("AI API request failed [gemini]: 500")
    );

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const file = createTestFile("test.png", "image/png");

    const result = await identifyPlantFromImage(file);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(ActionErrorCode.INTERNAL_SERVER_ERROR);
    }
  });

  it("JPEG/PNG以外はVALIDATION_ERROR", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const file = createTestFile("test.gif", "image/gif");

    const result = await identifyPlantFromImage(file);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(ActionErrorCode.VALIDATION_ERROR);
    }
  });
});

