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
    public_users: {
      findUnique: vi.fn(),
    },
    plant_identification_logs: {
      count: vi.fn(),
      create: vi.fn(),
    },
    // 既存植物との照合は正規化キー (式インデックス) で引くため Raw SQL
    $queryRaw: vi.fn(),
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
    // ログイン済みユーザーの既定モック (レート制限は未到達)
    vi.mocked(prisma.public_users.findUnique).mockResolvedValue({
      id: 1,
    } as unknown as Awaited<ReturnType<typeof prisma.public_users.findUnique>>);
    vi.mocked(prisma.plant_identification_logs.count).mockResolvedValue(0);
    vi.mocked(prisma.plant_identification_logs.create).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof prisma.plant_identification_logs.create>>
    );
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
    expect(vi.mocked(prisma.$queryRaw)).not.toHaveBeenCalled();
  });

  it("AIレスポンス (plants形式) をパースして既存plantsに照合する", async () => {
    vi.mocked(getAiProviderConfig).mockReturnValue({
      provider: "gemini",
      apiKey: "test-key",
      model: "gemini-2.5-flash-lite",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    });

    vi.mocked(chatCompletion).mockResolvedValue(
      '{"plants":[{"name":" パキラ ","confidence":0.9},{"name":"モンステラ","confidence":0.5}]}'
    );

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    // name_key は findPlantsByNameKeys が Map のキーに使うため必須
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { id: 10, name: "パキラ", name_key: "パキラ" },
    ] as unknown as Awaited<ReturnType<typeof prisma.$queryRaw>>);

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

  it("大文字小文字が違うAI候補も既存plantsに照合する", async () => {
    vi.mocked(getAiProviderConfig).mockReturnValue({
      provider: "gemini",
      apiKey: "test-key",
      model: "gemini-2.5-flash-lite",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    });

    // AIは 'monstera' と返すが、DBには 'Monstera' で登録されている
    vi.mocked(chatCompletion).mockResolvedValue(
      '{"plants":[{"name":"monstera","confidence":0.8}]}'
    );

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { id: 11, name: "Monstera", name_key: "monstera" },
    ] as unknown as Awaited<ReturnType<typeof prisma.$queryRaw>>);

    const result = await identifyPlantFromImage(createTestFile("test.png", "image/png"));

    expect(result.success).toBe(true);
    if (result.success) {
      // matchedPlant が付かないと「新規」扱いになり重複登録に進んでしまう
      expect(result.data?.candidates?.[0]?.matchedPlant).toEqual({ id: 11, name: "Monstera" });
    }
  });

  it("大文字小文字だけが違うAI候補は1つに重複排除する", async () => {
    vi.mocked(getAiProviderConfig).mockReturnValue({
      provider: "gemini",
      apiKey: "test-key",
      model: "gemini-2.5-flash-lite",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    });

    vi.mocked(chatCompletion).mockResolvedValue(
      '{"plants":[{"name":"Monstera","confidence":0.9},{"name":"　ｍｏｎｓｔｅｒａ ","confidence":0.4}]}'
    );

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(prisma.$queryRaw).mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prisma.$queryRaw>>
    );

    const result = await identifyPlantFromImage(createTestFile("test.png", "image/png"));

    expect(result.success).toBe(true);
    if (result.success) {
      // DB では同じ植物になるため、タグ候補としても1つに寄せる (先勝ち)
      expect(result.data?.candidates).toHaveLength(1);
      expect(result.data?.candidates?.[0]?.name).toBe("Monstera");
    }
  });

  it("旧形式 (candidatesキー) のレスポンスもパースできる", async () => {
    vi.mocked(getAiProviderConfig).mockReturnValue({
      provider: "gemini",
      apiKey: "test-key",
      model: "gemini-2.5-flash-lite",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    });

    vi.mocked(chatCompletion).mockResolvedValue(
      '{"candidates":[{"name":"パキラ","confidence":0.9}]}'
    );

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(prisma.$queryRaw).mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prisma.$queryRaw>>
    );

    const file = createTestFile("test.png", "image/png");

    const result = await identifyPlantFromImage(file);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.candidates).toHaveLength(1);
      expect(result.data?.candidates?.[0]?.name).toBe("パキラ");
    }
  });

  it("同名の植物が複数返っても名前で重複排除される", async () => {
    vi.mocked(getAiProviderConfig).mockReturnValue({
      provider: "gemini",
      apiKey: "test-key",
      model: "gemini-2.5-flash-lite",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    });

    // 同じ植物が2鉢写っているケース: 正規化後に同名になるエントリを含む
    vi.mocked(chatCompletion).mockResolvedValue(
      '{"plants":[{"name":"パキラ","confidence":0.9},{"name":" パキラ ","confidence":0.8},{"name":"モンステラ","confidence":0.5}]}'
    );

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(prisma.$queryRaw).mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prisma.$queryRaw>>
    );

    const file = createTestFile("test.png", "image/png");

    const result = await identifyPlantFromImage(file);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.candidates?.map((c) => c.name)).toEqual([
        "パキラ",
        "モンステラ",
      ]);
      // 先勝ちで confidence は最初のエントリのものが残る
      expect(result.data?.candidates?.[0]?.confidence).toBe(0.9);
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

  it("レート制限に達している場合はRATE_LIMITEDでAPIを呼ばない", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    // 1分あたりの上限 (10) に到達
    vi.mocked(prisma.plant_identification_logs.count).mockResolvedValue(10);

    const file = createTestFile("test.png", "image/png");

    const result = await identifyPlantFromImage(file);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(ActionErrorCode.RATE_LIMITED);
    }
    expect(vi.mocked(chatCompletion)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.plant_identification_logs.create)).not.toHaveBeenCalled();
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

