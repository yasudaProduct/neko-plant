"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  getAiProviderConfig,
  chatCompletion,
  ChatMessage,
} from "@/lib/ai-provider";
import {
  AI_IDENTIFY_RATE_LIMIT_PER_DAY,
  AI_IDENTIFY_RATE_LIMIT_PER_MINUTE,
} from "@/lib/const";
import { normalizePlantName, plantNameKey } from "@/lib/plant-name";
import { findPlantsByNameKeys } from "@/lib/plant-name-query";
import { ActionErrorCode, ActionResult } from "@/types/common";

export type PlantIdentificationCandidate = {
  name: string;
  confidence?: number;
  matchedPlant?: { id: number; name: string };
};

type IdentifiedPlantEntry = { name: string; confidence?: number };

// 現行形式は {"plants":[...]}。旧形式 {"candidates":[...]} と裸配列にも
// フォールバックし、モデルが慣れたキー名で返しても救済できるようにする
type IdentifyPlantResponse =
  | { plants?: IdentifiedPlantEntry[]; candidates?: IdentifiedPlantEntry[] }
  | IdentifiedPlantEntry[];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

/**
 * レート制限の上限を解決する。
 * 既定値は本番想定だが、AIをモックするE2E等では環境変数で緩められるようにする。
 */
function resolveRateLimit(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function tryParseJson<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    // noop
  }

  // 先頭/末尾に余計な文字が混じるケースを救済
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as T;
    } catch {
      // noop
    }
  }

  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  if (
    firstBracket !== -1 &&
    lastBracket !== -1 &&
    lastBracket > firstBracket
  ) {
    try {
      return JSON.parse(text.slice(firstBracket, lastBracket + 1)) as T;
    } catch {
      // noop
    }
  }

  return undefined;
}

// AIで写真に写っている植物 (複数可) の名前を判定する
export async function identifyPlantFromImage(
  image: File
): Promise<ActionResult<{ candidates: PlantIdentificationCandidate[] }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      code: ActionErrorCode.AUTH_REQUIRED,
      message: "ログインが必要です。",
    };
  }

  const userData = await prisma.public_users.findUnique({
    where: { auth_id: user.id },
    select: { id: true },
  });

  if (!userData) {
    return {
      success: false,
      code: ActionErrorCode.AUTH_REQUIRED,
      message: "ユーザーが見つかりません。",
    };
  }

  // 有料APIの濫用を防ぐため、ユーザー単位で直近の実行回数を制限する
  const now = Date.now();
  const [countLastMinute, countLastDay] = await Promise.all([
    prisma.plant_identification_logs.count({
      where: { user_id: userData.id, created_at: { gte: new Date(now - 60 * 1000) } },
    }),
    prisma.plant_identification_logs.count({
      where: { user_id: userData.id, created_at: { gte: new Date(now - 24 * 60 * 60 * 1000) } },
    }),
  ]);

  if (
    countLastMinute >=
      resolveRateLimit(
        process.env.AI_IDENTIFY_RATE_LIMIT_PER_MINUTE,
        AI_IDENTIFY_RATE_LIMIT_PER_MINUTE,
      ) ||
    countLastDay >=
      resolveRateLimit(
        process.env.AI_IDENTIFY_RATE_LIMIT_PER_DAY,
        AI_IDENTIFY_RATE_LIMIT_PER_DAY,
      )
  ) {
    return {
      success: false,
      code: ActionErrorCode.RATE_LIMITED,
      message: "AI判定の利用回数が上限に達しました。時間をおいて再度お試しください。",
    };
  }

  if (!image) {
    return {
      success: false,
      code: ActionErrorCode.VALIDATION_ERROR,
      message: "画像を選択してください。",
    };
  }

  if (!SUPPORTED_IMAGE_TYPES.has(image.type)) {
    return {
      success: false,
      code: ActionErrorCode.VALIDATION_ERROR,
      message: "サポートされていないファイル形式です（JPEG/PNGのみ）。",
    };
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return {
      success: false,
      code: ActionErrorCode.VALIDATION_ERROR,
      message: "ファイルサイズは5MB以下にしてください。",
    };
  }

  const aiConfig = getAiProviderConfig();
  if (!aiConfig) {
    return {
      success: true,
      message:
        "AI判定が未設定のため、植物名の候補を表示できません。検索または手入力してください。",
      data: { candidates: [] },
    };
  }

  // API消費の直前に実行を記録する。API失敗も1回として数え、エラー時の連打を抑える
  await prisma.plant_identification_logs.create({
    data: { user_id: userData.id },
  });

  try {
    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${image.type};base64,${base64}`;

    const systemPrompt = [
      "あなたは写真に写っている植物をすべて見つけて、それぞれの植物名を推定するアシスタントです。",
      "出力は必ずJSONのみ（説明文なし）で返してください。",
      "",
      "要件:",
      '- 形式: {"plants":[{"name":"植物名","confidence":0.0}]}',
      "- 写真に写っている植物を種類ごとに1件ずつ列挙し、最も確からしい名前を付ける",
      "- 同じ植物に別の有力な名前がある場合は、別の1件として追加してよい",
      "- plantsは最大5件",
      "- nameは日本語の一般的な呼称を優先（分からなければ英名でも可）",
      "- confidenceは0〜1の小数（推定で可）",
      "- 植物が写っていない場合はplantsを空配列",
    ].join("\n");

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "この写真に写っているすべての植物の名前を推定してください。",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ];

    let content: string;
    try {
      content = await chatCompletion(aiConfig, messages, {
        temperature: 0.2,
      });
    } catch (error) {
      console.error("AI API request failed:", error);
      return {
        success: false,
        code: ActionErrorCode.INTERNAL_SERVER_ERROR,
        message: "AI判定に失敗しました。時間をおいて再度お試しください。",
      };
    }
    const parsed = tryParseJson<IdentifyPlantResponse>(content);

    const rawCandidates: IdentifiedPlantEntry[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.plants)
        ? parsed.plants
        : Array.isArray(parsed?.candidates)
          ? parsed.candidates
          : [];

    // 同名の植物が複数写っていても、タグとしては1つなので名前で重複排除する (先勝ち)。
    // DB の一意キーと同じ基準で寄せるため、大文字小文字違いも同一候補として扱う
    const seenKeys = new Set<string>();
    const normalizedCandidates = rawCandidates
      .map((c) => ({
        name: normalizePlantName(c.name ?? ""),
        confidence:
          typeof c.confidence === "number" ? Math.max(0, Math.min(1, c.confidence)) : undefined,
      }))
      .filter((c) => {
        const key = plantNameKey(c.name);
        if (key.length === 0 || seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });

    // 既存植物との照合も正規化キーで行う。完全一致だけで引くと AI が 'monstera' と
    // 返したときに既存の 'Monstera' に当たらず、UIに誤った「新規」バッジが出てしまう
    const matches = await findPlantsByNameKeys(normalizedCandidates.map((c) => c.name));

    const candidates: PlantIdentificationCandidate[] = normalizedCandidates
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        confidence: c.confidence,
        matchedPlant: matches.get(plantNameKey(c.name)),
      }));

    return {
      success: true,
      message:
        candidates.length === 0
          ? "植物を判定できませんでした。植物が写った写真で再度お試しいただくか、検索または手入力してください。"
          : undefined,
      data: { candidates },
    };
  } catch (error) {
    console.error("identifyPlantFromImage error:", error);
    return {
      success: false,
      code: ActionErrorCode.INTERNAL_SERVER_ERROR,
      message: "AI判定に失敗しました。時間をおいて再度お試しください。",
    };
  }
}

