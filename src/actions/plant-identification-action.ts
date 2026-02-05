"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ActionErrorCode, ActionResult } from "@/types/common";

export type PlantIdentificationCandidate = {
  name: string;
  confidence?: number;
  matchedPlant?: { id: number; name: string };
};

type IdentifyPlantResponse =
  | { candidates: Array<{ name: string; confidence?: number }> }
  | Array<{ name: string; confidence?: number }>;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

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

function normalizePlantName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      success: true,
      message:
        "AI判定が未設定のため、植物名の候補を表示できません。検索または手入力してください。",
      data: { candidates: [] },
    };
  }

  try {
    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${image.type};base64,${base64}`;

    const model = process.env.OPENAI_PLANT_ID_MODEL ?? "gpt-4o-mini";

    const prompt = [
      "あなたは植物の画像から植物名候補を推定するアシスタントです。",
      "出力は必ずJSONのみ（説明文なし）で返してください。",
      "",
      "要件:",
      '- 形式: {"candidates":[{"name":"植物名","confidence":0.0}]}',
      "- candidatesは最大5件",
      "- nameは日本語の一般的な呼称を優先（分からなければ英名でも可）",
      "- confidenceは0〜1の小数（推定で可）",
      "- 不明な場合はcandidatesを空配列",
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: [
              { type: "text", text: "この写真の植物名候補を推定してください。" },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("OpenAI request failed:", response.status, errorText);
      return {
        success: false,
        code: ActionErrorCode.INTERNAL_SERVER_ERROR,
        message: "AI判定に失敗しました。時間をおいて再度お試しください。",
      };
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    const parsed = tryParseJson<IdentifyPlantResponse>(content);

    const rawCandidates: Array<{ name: string; confidence?: number }> =
      Array.isArray(parsed)
        ? parsed
        : parsed?.candidates && Array.isArray(parsed.candidates)
          ? parsed.candidates
          : [];

    const normalizedCandidates = rawCandidates
      .map((c) => ({
        name: normalizePlantName(c.name ?? ""),
        confidence:
          typeof c.confidence === "number" ? Math.max(0, Math.min(1, c.confidence)) : undefined,
      }))
      .filter((c) => c.name.length > 0);

    const uniqueNames = Array.from(new Set(normalizedCandidates.map((c) => c.name)));

    const exactMatches =
      uniqueNames.length > 0
        ? await prisma.plants.findMany({
            where: { name: { in: uniqueNames } },
            select: { id: true, name: true },
          })
        : [];
    const exactMatchMap = new Map(exactMatches.map((p) => [p.name, p]));

    const candidates: PlantIdentificationCandidate[] = normalizedCandidates
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        confidence: c.confidence,
        matchedPlant: exactMatchMap.get(c.name),
      }));

    return { success: true, data: { candidates } };
  } catch (error) {
    console.error("identifyPlantFromImage error:", error);
    return {
      success: false,
      code: ActionErrorCode.INTERNAL_SERVER_ERROR,
      message: "AI判定に失敗しました。時間をおいて再度お試しください。",
    };
  }
}

