"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Pet } from "@/types/neko";
import { ActionErrorCode } from "@/types/common";
import { MAX_POST_COMMENT_LENGTH, MAX_POST_IMAGES, MAX_POST_PLANTS } from "@/lib/const";
import {
  ClientImageError,
  processImageForUpload,
  removeUploadedImagesBestEffort,
  uploadImagesToBucket,
} from "@/lib/client-image";
import { generateImageName } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { createPost } from "@/actions/post-action";
import { addPlant, searchPlantName } from "@/actions/plant-action";
import {
  identifyPlantFromImage,
  type PlantIdentificationCandidate,
} from "@/actions/plant-identification-action";
import CatChip from "@/components/np/CatChip";

const STEPS = ["写真", "植物", "猫", "確認"] as const;

type SelectedPlant =
  | { mode: "existing"; id: number; name: string }
  | { mode: "new"; name: string };

const normalizePlantName = (name: string) => name.trim().replace(/\s+/g, " ");

const plantKey = (plant: SelectedPlant) =>
  plant.mode === "existing" ? `existing-${plant.id}` : `new-${normalizePlantName(plant.name)}`;

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          {i > 0 && (
            <span className={`w-6 h-px ${i <= step ? "bg-green-500" : "bg-gray-300"}`}></span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border ${
                i < step
                  ? "bg-green-600 border-green-200 text-white"
                  : i === step
                    ? "bg-green-100 border-green-200 text-green-700"
                    : "bg-gray-100 border-gray-200 text-gray-400"
              }`}
            >
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </span>
            <span
              className={`text-xs max-sm:hidden ${
                i === step ? "font-semibold text-gray-900" : "text-gray-400"
              }`}
            >
              {label}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

export default function PostFlow({ myPets }: { myPets: Pet[] }) {
  const router = useRouter();
  const { success, error, info } = useToast();

  const [step, setStep] = useState(0);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedPlants, setSelectedPlants] = useState<SelectedPlant[]>([]);
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>([]);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  // AI判定
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [hasIdentified, setHasIdentified] = useState(false);
  const [candidates, setCandidates] = useState<PlantIdentificationCandidate[]>([]);

  // 手動検索
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([]);
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

  // ステップ2(植物)に入ったらAI判定を自動実行
  useEffect(() => {
    if (step !== 1 || hasIdentified || isIdentifying || images.length === 0) return;

    let cancelled = false;
    const identify = async () => {
      setIsIdentifying(true);
      try {
        const result = await identifyPlantFromImage(images[0]);
        if (cancelled) return;

        setHasIdentified(true);

        if (!result.success) {
          error({ title: "AI判定に失敗しました", description: result.message });
          return;
        }
        if (result.message) {
          info({ title: result.message });
        }
        setCandidates(result.data?.candidates ?? []);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setHasIdentified(true);
          error({ title: "AI判定に失敗しました" });
        }
      } finally {
        if (!cancelled) setIsIdentifying(false);
      }
    };
    identify();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const onImagesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_POST_IMAGES);
    e.target.value = "";
    if (files.length === 0) return;

    setIsProcessingImages(true);
    try {
      // 縮小 + JPEG再エンコード (Exif除去)。メモリ節約のため直列に処理する
      const processed: File[] = [];
      for (const file of files) {
        try {
          processed.push(await processImageForUpload(file));
        } catch (err) {
          console.error(err);
          error({
            title: `「${file.name}」を追加できませんでした`,
            description:
              err instanceof ClientImageError
                ? err.message
                : "画像を読み込めませんでした。別の画像でお試しください。",
          });
        }
      }
      if (processed.length === 0) return;

      previews.forEach((url) => URL.revokeObjectURL(url));
      setImages(processed);
      setPreviews(processed.map((file) => URL.createObjectURL(file)));

      // 画像が変わったらAI判定をやり直す
      setHasIdentified(false);
      setCandidates([]);
    } finally {
      setIsProcessingImages(false);
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setHasIdentified(false);
    setCandidates([]);
  };

  const togglePlant = (plant: SelectedPlant) => {
    const key = plantKey(plant);
    setSelectedPlants((prev) => {
      if (prev.some((p) => plantKey(p) === key)) {
        return prev.filter((p) => plantKey(p) !== key);
      }
      if (prev.length >= MAX_POST_PLANTS) {
        error({ title: `植物は最大${MAX_POST_PLANTS}つまでです` });
        return prev;
      }
      return [...prev, plant];
    });
  };

  const isPlantSelected = (plant: SelectedPlant) =>
    selectedPlants.some((p) => plantKey(p) === plantKey(plant));

  const togglePet = (petId: number) => {
    setSelectedPetIds((prev) =>
      prev.includes(petId) ? prev.filter((id) => id !== petId) : [...prev, petId],
    );
  };

  const candidateToPlant = (candidate: PlantIdentificationCandidate): SelectedPlant =>
    candidate.matchedPlant
      ? { mode: "existing", id: candidate.matchedPlant.id, name: candidate.matchedPlant.name }
      : { mode: "new", name: candidate.name };

  const canNext =
    step === 0
      ? images.length > 0 && !isProcessingImages
      : step === 1
        ? selectedPlants.length > 0
        : step === 2
          ? selectedPetIds.length > 0
          : true;

  const onSubmit = async () => {
    setIsSubmitting(true);
    let uploadedPaths: string[] = [];
    try {
      // 新規植物を先に登録してIDを確定する
      const plantIds: number[] = [];
      for (const plant of selectedPlants) {
        if (plant.mode === "existing") {
          plantIds.push(plant.id);
          continue;
        }

        const created = await addPlant(plant.name);
        if (created.success && created.data) {
          plantIds.push(created.data.plantId);
        } else if (!created.success && created.code === ActionErrorCode.ALREADY_EXISTS && created.data?.plantId) {
          plantIds.push(created.data.plantId);
        } else {
          error({
            title: `「${plant.name}」の登録に失敗しました`,
            description: !created.success ? created.message : undefined,
          });
          return;
        }
      }

      // 画像はブラウザから posts バケットへ直接アップロードする
      // (Server Action経由だとVercelのリクエストボディ上限4.5MBに掛かるため)
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        error({ title: "投稿に失敗しました", description: "ログインが必要です。" });
        return;
      }

      const groupId = crypto.randomUUID();
      const imagePaths = images.map(
        (_, i) => `${user.id}/${groupId}/${i + 1}_${generateImageName("post")}.jpg`,
      );

      try {
        await uploadImagesToBucket(
          "posts",
          images.map((file, i) => ({ path: imagePaths[i], file })),
        );
      } catch (e) {
        console.error(e);
        error({ title: "投稿に失敗しました", description: "画像のアップロードに失敗しました。" });
        return;
      }
      uploadedPaths = imagePaths;

      const result = await createPost({
        plantIds,
        petIds: selectedPetIds,
        comment: comment.trim() || undefined,
        imagePaths,
      });

      if (!result.success) {
        // 投稿本体の作成に失敗したらアップロード済み画像を後始末する
        await removeUploadedImagesBestEffort("posts", imagePaths);
        error({ title: "投稿に失敗しました", description: result.message });
        return;
      }

      success({
        title: "投稿しました",
        description: "フィードとプロフィールに表示されています。",
      });
      router.push("/");
      router.refresh();
    } catch (e) {
      console.error(e);
      await removeUploadedImagesBestEffort("posts", uploadedPaths);
      error({ title: "投稿に失敗しました", description: "再度お試しください。" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const petById = (id: number) => myPets.find((pet) => pet.id === id);

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-12 flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">投稿する</h1>
        <StepIndicator step={step} />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm p-6 flex flex-col gap-4">
        {/* STEP 1: 写真 */}
        {step === 0 && (
          <>
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">写真を選択</h2>
              <p className="text-xs text-gray-500">
                猫と植物が一緒に写った写真を、{MAX_POST_IMAGES}枚まで選択できます。
                <br />
                写真は植物名のAI判定のため、外部のAIサービスに送信されます。位置情報などのメタデータは公開時に自動で削除されます。
              </p>
            </div>
            <label
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-green-500 transition-colors flex items-center justify-center gap-2 cursor-pointer text-gray-500 text-sm"
              data-testid="image-upload-area"
            >
              <Camera className="w-5 h-5" />
              写真を追加する
              <input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                className="hidden"
                onChange={onImagesSelected}
                data-testid="image-input"
              />
            </label>
            {isProcessingImages && (
              <div className="grid grid-cols-3 gap-2" data-testid="image-processing">
                <Skeleton className="aspect-square rounded-md" />
              </div>
            )}
            {!isProcessingImages && previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((url, i) => (
                  <div
                    key={url}
                    className="relative aspect-square rounded-md overflow-hidden outline outline-2 -outline-offset-2 outline-green-500"
                  >
                    <Image src={url} alt={`選択した写真 ${i + 1}`} fill className="object-cover" />
                    <span className="absolute top-1.5 left-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-xs font-bold">
                      {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* STEP 2: 植物 */}
        {step === 1 && (
          <>
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">植物を紐付ける</h2>
              <p className="text-xs text-gray-500">
                AIが写真から植物を判定します。候補から選ぶか、手動で検索してください。
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AI判定の候補
              </span>
              {isIdentifying ? (
                <div className="flex gap-2">
                  <Skeleton className="w-36 h-9 rounded-full" />
                  <Skeleton className="w-28 h-9 rounded-full" />
                  <Skeleton className="w-28 h-9 rounded-full" />
                </div>
              ) : candidates.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {candidates.map((candidate) => {
                    const plant = candidateToPlant(candidate);
                    const selected = isPlantSelected(plant);
                    return (
                      <button
                        key={plantKey(plant)}
                        type="button"
                        onClick={() => togglePlant(plant)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-all ${
                          selected
                            ? "bg-green-100 border-green-200 text-green-700 shadow-inner"
                            : "bg-white border-border text-gray-600 shadow-sm hover:bg-gray-50"
                        }`}
                        data-testid="ai-candidate"
                      >
                        {selected ? <Check className="w-3.5 h-3.5" /> : <Leaf className="w-3.5 h-3.5" />}
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
                  {hasIdentified
                    ? "植物を判定できませんでした。下の検索から植物を選択してください。"
                    : "写真を選択するとAI判定が実行されます。"}
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
                maxLength={50}
                data-testid="plant-search-input"
              />
              {query.trim() && (
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {suggestions.map((plant) => {
                    const item: SelectedPlant = { mode: "existing", id: plant.id, name: plant.name };
                    const selected = isPlantSelected(item);
                    return (
                      <button
                        key={plant.id}
                        type="button"
                        onClick={() => togglePlant(item)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-md text-left hover:bg-gray-100 transition-colors"
                      >
                        {selected ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Leaf className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="flex-1 text-sm text-gray-800">{plant.name}</span>
                      </button>
                    );
                  })}
                  {!suggestions.some(
                    (plant) => normalizePlantName(plant.name) === normalizePlantName(query),
                  ) && (
                    <button
                      type="button"
                      onClick={() => {
                        const name = normalizePlantName(query);
                        if (!name) return;
                        if (name.length > 50) {
                          error({ title: "植物名は50文字以内で入力してください" });
                          return;
                        }
                        togglePlant({ mode: "new", name });
                        setQuery("");
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md text-left hover:bg-amber-50 transition-colors text-amber-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm">
                        「{normalizePlantName(query)}」を新しく登録して選択
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {selectedPlants.length > 0 && (
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-gray-50">
                <span className="text-xs text-gray-500">選択中の植物</span>
                <div className="flex gap-2 flex-wrap">
                  {selectedPlants.map((plant) => (
                    <span
                      key={plantKey(plant)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-green-100 border border-green-200 text-green-700 pl-3 pr-2 py-1 text-xs font-medium"
                    >
                      <Leaf className="w-3.5 h-3.5" />
                      {plant.name}
                      {plant.mode === "new" && <span className="text-[10px] opacity-70">(新規)</span>}
                      <button
                        type="button"
                        onClick={() => togglePlant(plant)}
                        className="opacity-70 hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* STEP 3: 猫 + コメント */}
        {step === 2 && (
          <>
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">写っている猫を選択</h2>
              <p className="text-xs text-gray-500">共存実績は、選択した猫ごとに集計されます。</p>
            </div>
            {myPets.length > 0 ? (
              <div className="flex gap-2.5 flex-wrap">
                {myPets.map((pet) => {
                  const selected = selectedPetIds.includes(pet.id);
                  return (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => togglePet(pet.id)}
                      className={`flex items-center gap-2.5 rounded-full py-2 pl-2.5 pr-4 border transition-all ${
                        selected
                          ? "bg-green-100 border-green-200 shadow-inner"
                          : "bg-white border-border shadow-sm hover:bg-gray-50"
                      }`}
                      data-testid="pet-option"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={pet.imageSrc} alt={pet.name} />
                        <AvatarFallback>{pet.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="flex flex-col items-start gap-0">
                        <span
                          className={`text-sm font-medium ${selected ? "text-green-700" : "text-gray-800"}`}
                        >
                          {pet.name}
                        </span>
                        <span className="text-xs text-gray-400">{pet.neko.name}</span>
                      </span>
                      {selected && <Check className="w-4 h-4 text-green-600" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-3">猫が登録されていません</p>
                <Button variant="outline" asChild>
                  <Link href="/settings/cats">猫を登録する</Link>
                </Button>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="post-comment">コメント（任意）</Label>
              <Textarea
                id="post-comment"
                rows={3}
                value={comment}
                placeholder="写真についてひとこと"
                maxLength={MAX_POST_COMMENT_LENGTH}
                onChange={(e) => setComment(e.target.value)}
                data-testid="comment-input"
              />
            </div>
          </>
        )}

        {/* STEP 4: 確認 */}
        {step === 3 && (
          <>
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">内容を確認</h2>
              <p className="text-xs text-gray-500">この内容で投稿します。</p>
            </div>
            <div className="flex gap-2">
              {previews.map((url, i) => (
                <div key={url} className="relative w-[88px] aspect-square rounded-md overflow-hidden">
                  <Image src={url} alt={`写真 ${i + 1}`} fill className="object-cover" />
                </div>
              ))}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 text-sm items-start">
              <dt className="text-gray-500">植物</dt>
              <dd className="flex gap-2 flex-wrap">
                {selectedPlants.map((plant) => (
                  <span
                    key={plantKey(plant)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white border border-green-200 text-green-700 px-3 py-1 text-xs font-medium"
                  >
                    <Leaf className="w-3.5 h-3.5" />
                    {plant.name}
                    {plant.mode === "new" && <span className="text-[10px] opacity-70">(新規)</span>}
                  </span>
                ))}
              </dd>
              <dt className="text-gray-500">猫</dt>
              <dd className="flex gap-2 flex-wrap">
                {selectedPetIds.map((petId) => {
                  const pet = petById(petId);
                  return pet ? <CatChip key={petId} name={pet.name} /> : null;
                })}
              </dd>
              <dt className="text-gray-500">コメント</dt>
              <dd className="text-gray-700 whitespace-pre-wrap">{comment.trim() || "（なし）"}</dd>
            </dl>
            <p className="p-3 rounded-md bg-gray-50 text-xs text-gray-500 leading-normal">
              投稿すると、植物の共存実績にすぐ反映されます。
            </p>
          </>
        )}

        {/* フッターナビ */}
        <div className="flex justify-between pt-2 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => (step === 0 ? router.back() : setStep(step - 1))}
            disabled={isSubmitting}
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? "やめる" : "戻る"}
          </Button>
          {step < 3 ? (
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={!canNext}
              onClick={() => setStep(step + 1)}
              data-testid="next-step"
            >
              次へ
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={isSubmitting}
              onClick={onSubmit}
              data-testid="submit-post"
            >
              <Camera className="w-4 h-4" />
              {isSubmitting ? "投稿中..." : "投稿する"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
