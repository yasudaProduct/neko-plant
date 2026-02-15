/**
 * AI プロバイダー抽象化レイヤー
 *
 * 環境変数 `AI_PROVIDER` で使用するプロバイダーを切り替えられる。
 * 各プロバイダーは OpenAI 互換の Chat Completions API を利用するため、
 * メッセージフォーマットは共通。
 *
 * 対応プロバイダー:
 *   - gemini (デフォルト) : Google Gemini の OpenAI 互換エンドポイント
 *   - openai              : OpenAI API
 */

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------
export type AiProviderType = "gemini" | "openai" | "mock";

export interface AiProviderConfig {
  provider: AiProviderType;
  apiKey: string;
  model: string;
  endpoint: string;
}

/** プロバイダーごとのデフォルトモデル */
const DEFAULT_MODELS: Record<AiProviderType, string> = {
  gemini: "gemini-2.5-flash-lite",
  openai: "gpt-4o-mini",
  mock: "mock",
};

/** プロバイダーごとの Chat Completions エンドポイント */
const ENDPOINTS: Record<AiProviderType, string> = {
  gemini:
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  mock: "",
};

/** プロバイダーごとの API キー環境変数名 */
const API_KEY_ENV: Record<AiProviderType, string> = {
  gemini: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  mock: "",
};

// ---------------------------------------------------------------------------
// 設定取得
// ---------------------------------------------------------------------------

/**
 * 現在の AI プロバイダー設定を返す。
 * API キーが未設定の場合は `null` を返す（= AI 機能無効）。
 */
export function getAiProviderConfig(): AiProviderConfig | null {
  const provider = (process.env.AI_PROVIDER ?? "gemini") as AiProviderType;

  if (provider === "mock") {
    return { provider: "mock", apiKey: "mock", model: "mock", endpoint: "" };
  }

  if (!ENDPOINTS[provider]) {
    console.warn(`Unknown AI_PROVIDER: ${provider}`);
    return null;
  }

  const apiKey = process.env[API_KEY_ENV[provider]];
  if (!apiKey) {
    return null;
  }

  const model = process.env.AI_PLANT_ID_MODEL ?? DEFAULT_MODELS[provider];

  return {
    provider,
    apiKey,
    model,
    endpoint: ENDPOINTS[provider],
  };
}

// ---------------------------------------------------------------------------
// 共通型 (OpenAI 互換)
// ---------------------------------------------------------------------------
export type ChatMessage =
  | { role: "system"; content: string }
  | {
    role: "user";
    content: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;
  };

export interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

// ---------------------------------------------------------------------------
// API 呼び出し
// ---------------------------------------------------------------------------

/**
 * OpenAI 互換の Chat Completions API を呼び出し、テキスト応答を返す。
 * エラー時は例外をスローする。
 */
export async function chatCompletion(
  config: AiProviderConfig,
  messages: ChatMessage[],
  options?: { temperature?: number }
): Promise<string> {
  if (config.provider === "mock") {
    return JSON.stringify({
      candidates: [
        { name: "パキラ", confidence: 0.92 },
        { name: "モンステラ", confidence: 0.65 },
        { name: "テスト新規植物", confidence: 0.3 },
      ],
    });
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: options?.temperature ?? 0.2,
      messages,
    }),
  });

  if (!response.ok) {
    console.error(`AI API request failed [${config.provider}]: ${response.status} ${response.statusText}`);
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `AI API request failed [${config.provider}]: ${response.status} ${errorText}`
    );
  }

  const json = (await response.json()) as ChatCompletionResponse;
  return json.choices?.[0]?.message?.content ?? "";
}
