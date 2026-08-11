"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Leaf, Plus, Search, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { searchPlantName } from "@/actions/plant-action";
import type { PlantIdentificationCandidate } from "@/actions/plant-identification-action";
import { MAX_PLANT_NAME_LENGTH } from "@/lib/const";
import { normalizePlantName, plantNameKey } from "@/lib/plant-name";

export type SelectedPlant =
  | { mode: "existing"; id: number; name: string }
  | { mode: "new"; name: string };

// 新規植物のキーは DB の一意キー (plantNameKey) に寄せる。
// 'Monstera' と 'monstera' は DB では同じ植物になるため、同一写真で
// 別の選択肢として二重に持てないようにする
export const plantKey = (plant: SelectedPlant) =>
  plant.mode === "existing"
    ? `existing-${plant.id}`
    : `new-${plantNameKey(plant.name)}`;

export type PhotoIdentifyStatus = "identifying" | "done" | "error";

/** 投稿フォーム内の写真1枚分の状態 (プレビュー + AI判定結果 + この写真の植物タグ) */
export type PostPhoto = {
  /** 削除されても他の写真とずれない安定キー */
  key: string;
  file: File;
  previewUrl: string;
  identifyStatus: PhotoIdentifyStatus;
  candidates: PlantIdentificationCandidate[];
  selectedPlants: SelectedPlant[];
};

const candidateToPlant = (
  candidate: PlantIdentificationCandidate,
): SelectedPlant =>
  candidate.matchedPlant
    ? {
        mode: "existing",
        id: candidate.matchedPlant.id,
        name: candidate.matchedPlant.name,
      }
    : { mode: "new", name: candidate.name };

/**
 * 写真1枚分の植物選択セクション。
 * AI判定の候補・手動検索・選択中の植物を写真ごとに独立して扱う。
 */
export default function PhotoPlantSection({
  photo,
  index,
  onToggle,
}: {
  photo: PostPhoto;
  index: number;
  /** この写真に対する植物の選択/解除 (上限チェックは親が行う) */
  onToggle: (plant: SelectedPlant) => void;
}) {
  const { error } = useToast();

  // 手動検索 (写真ごとに独立したローカル状態)
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    { id: number; name: string }[]
  >([]);
  const queryRef = useRef(query);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const q = query;
    const timer = setTimeout(async () => {
      try {
        const result = await searchPlantName(q.trim());
        if (queryRef.current !== q) return;
        setSuggestions(result.slice(0, 8));
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const isSelected = (plant: SelectedPlant) =>
    photo.selectedPlants.some((p) => plantKey(p) === plantKey(plant));

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-border p-3"
      data-testid="photo-plant-section"
    >
      {/* どの写真に対する選択かをサムネイルで示す */}
      <div className="flex items-center gap-2">
        <span className="relative w-9 h-9 rounded-md overflow-hidden shrink-0 bg-gray-100">
          <Image
            src={photo.previewUrl}
            alt={`写真 ${index + 1}`}
            fill
            className="object-cover"
          />
        </span>
        <span className="text-sm font-semibold text-gray-800">
          写真{index + 1}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          AI判定の候補
        </span>
        {photo.identifyStatus === "identifying" ? (
          <div className="flex gap-2">
            <Skeleton className="w-36 h-9 rounded-full" />
            <Skeleton className="w-28 h-9 rounded-full" />
            <Skeleton className="w-28 h-9 rounded-full" />
          </div>
        ) : photo.identifyStatus === "error" ? (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-md p-3">
            AI判定に失敗しました。下の検索から植物を選択してください。
          </p>
        ) : photo.candidates.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {photo.candidates.map((candidate) => {
              const plant = candidateToPlant(candidate);
              const selected = isSelected(plant);
              return (
                <button
                  key={plantKey(plant)}
                  type="button"
                  onClick={() => onToggle(plant)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-all ${
                    selected
                      ? "bg-green-100 border-green-200 text-green-700 shadow-inner"
                      : "bg-white border-border text-gray-600 shadow-sm hover:bg-gray-50"
                  }`}
                  data-testid="ai-candidate"
                >
                  {selected ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Leaf className="w-3.5 h-3.5" />
                  )}
                  {candidate.name}
                  {typeof candidate.confidence === "number" && (
                    <span className="text-xs opacity-70">
                      {Math.round(candidate.confidence * 100)}%
                    </span>
                  )}
                  {!candidate.matchedPlant && (
                    <span className="text-xs rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-1.5">
                      新規
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-md p-3">
            植物を判定できませんでした。下の検索から植物を選択してください。
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" />
          手動で検索
        </span>
        <Input
          placeholder="植物名を入力（例: パキラ）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={MAX_PLANT_NAME_LENGTH}
          data-testid="plant-search-input"
        />
        {query.trim() && (
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {suggestions.map((plant) => {
              const item: SelectedPlant = {
                mode: "existing",
                id: plant.id,
                name: plant.name,
              };
              const selected = isSelected(item);
              return (
                <button
                  key={plant.id}
                  type="button"
                  onClick={() => onToggle(item)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-md text-left hover:bg-gray-100 transition-colors"
                >
                  {selected ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Leaf className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="flex-1 text-sm text-gray-800">
                    {plant.name}
                  </span>
                </button>
              );
            })}
            {/* 既存候補と正規化キーが一致するなら「新しく登録」は出さない。
                大文字小文字違いで登録に進むと DB の一意インデックスに弾かれるため */}
            {!suggestions.some(
              (plant) => plantNameKey(plant.name) === plantNameKey(query),
            ) && (
              <button
                type="button"
                onClick={() => {
                  const name = normalizePlantName(query);
                  if (!name) return;
                  if (name.length > MAX_PLANT_NAME_LENGTH) {
                    error({
                      title: `植物名は${MAX_PLANT_NAME_LENGTH}文字以内で入力してください`,
                    });
                    return;
                  }
                  onToggle({ mode: "new", name });
                  setQuery("");
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-md text-left hover:bg-amber-50 transition-colors text-amber-700"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">
                  「{normalizePlantName(query)}
                  」を新しく登録して選択
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {photo.selectedPlants.length > 0 && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-gray-50">
          <span className="text-xs text-gray-500">選択中の植物</span>
          <div className="flex gap-2 flex-wrap">
            {photo.selectedPlants.map((plant) => (
              <span
                key={plantKey(plant)}
                className="inline-flex items-center gap-1.5 rounded-full bg-green-100 border border-green-200 text-green-700 pl-3 pr-2 py-1 text-xs font-medium"
              >
                <Leaf className="w-3.5 h-3.5" />
                {plant.name}
                {plant.mode === "new" && (
                  <span className="text-[10px] opacity-70">(新規)</span>
                )}
                <button
                  type="button"
                  onClick={() => onToggle(plant)}
                  className="opacity-70 hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
