"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Camera,
  Check,
  ChevronLeft,
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
import { NekoSpecies, Pet } from "@/types/neko";
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
import PetFormDialog from "@/app/settings/cats/PetFormDialog";

type SelectedPlant =
  | { mode: "existing"; id: number; name: string }
  | { mode: "new"; name: string };

const normalizePlantName = (name: string) => name.trim().replace(/\s+/g, " ");

const plantKey = (plant: SelectedPlant) =>
  plant.mode === "existing" ? `existing-${plant.id}` : `new-${normalizePlantName(plant.name)}`;

/** 番号バッジ + 縦線。完了すると緑のチェックに変わり、線もその区間だけ緑になる */
function StepMarker({ number, done, isLast }: { number: number; done: boolean; isLast?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border shrink-0 ${
          done
            ? "bg-green-600 border-green-600 text-white"
            : "bg-gray-100 border-gray-200 text-gray-400"
        }`}
      >
        {done ? <Check className="w-3.5 h-3.5" /> : number}
      </span>
      {!isLast && <span className={`w-px flex-1 my-1 ${done ? "bg-green-300" : "bg-gray-200"}`} />}
    </div>
  );
}

export default function PostFlow({
  myPets,
  nekoSpecies,
}: {
  myPets: Pet[];
  nekoSpecies: NekoSpecies[];
}) {
  const router = useRouter();
  const { success, error, info } = useToast();

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedPlants, setSelectedPlants] = useState<SelectedPlant[]>([]);
  const [pets, setPets] = useState<Pet[]>(myPets);
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>([]);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  // その場で猫を登録した後、router.refresh()で届く最新のmyPetsに置き換える (追記マージすると重複するので注意)
  useEffect(() => {
    setPets(myPets);
  }, [myPets]);

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

  // 写真が選択されたらAI判定を自動実行
  useEffect(() => {
    if (hasIdentified || isIdentifying || images.length === 0) return;

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
  }, [images]);

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
    const nextImages = images.filter((_, i) => i !== index);
    setImages(nextImages);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setHasIdentified(false);
    setCandidates([]);

    // 写真が0枚になったら、それに紐付けていた植物・猫の選択もクリアする
    if (nextImages.length === 0) {
      setSelectedPlants([]);
      setSelectedPetIds([]);
    }
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

  const photoDone = images.length > 0;
  const plantDone = selectedPlants.length > 0;
  const petDone = selectedPetIds.length > 0;

  const canSubmit = photoDone && plantDone && petDone && !isProcessingImages && !isSubmitting;

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

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-12 flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-gray-900 text-center">投稿する</h1>

      <div className="bg-white rounded-xl border border-border shadow-sm p-6 flex flex-col gap-4">
        <div className="flex flex-col">
          {/* 1. 写真 */}
          <div className="flex gap-4">
            <StepMarker number={1} done={photoDone} />
            <div className="flex-1 min-w-0 flex flex-col gap-3 pb-6">
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
                        data-testid="remove-image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. 植物 (写真を選ぶと詳細が現れる) */}
          <div className="flex gap-4">
            <StepMarker number={2} done={plantDone} />
            <div className="flex-1 min-w-0 flex flex-col gap-4 pb-6">
              <div>
                <h2
                  className={`text-base font-semibold mb-1 ${photoDone ? "text-gray-900" : "text-gray-400"}`}
                >
                  植物を紐付ける
                </h2>
                <p className="text-xs text-gray-500">
                  {photoDone
                    ? "AIが写真から植物を判定します。候補から選ぶか、手動で検索してください。"
                    : "写真を選択すると、AI判定や検索で植物を選べるようになります。"}
                </p>
              </div>

              {photoDone && (
                <>
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
            </div>
          </div>

          {/* 3. 猫 */}
          <div className="flex gap-4">
            <StepMarker number={3} done={petDone} isLast />
            <div className="flex-1 min-w-0 flex flex-col gap-2.5">
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">写っている猫を選択</h2>
                <p className="text-xs text-gray-500">共存実績は、選択した猫ごとに集計されます。</p>
              </div>
              <div className="flex gap-2.5 flex-wrap">
                {pets.map((pet) => {
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
                <PetFormDialog
                  nekoSpecies={nekoSpecies}
                  trigger={
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-full py-2 px-4 border border-dashed border-gray-300 text-sm text-gray-500 hover:border-green-500 hover:text-green-700 transition-colors"
                      data-testid="add-pet-trigger"
                    >
                      <Plus className="w-4 h-4" />
                      新しい猫を登録
                    </button>
                  }
                  onCreated={(pet) => {
                    setPets((prev) => [...prev, pet]);
                    setSelectedPetIds((prev) => [...prev, pet.id]);
                  }}
                />
              </div>
              {pets.length === 0 && (
                <p className="text-xs text-gray-500">
                  猫が登録されていません。上のボタンから追加できます。
                </p>
              )}
            </div>
          </div>
        </div>

        {/* コメント */}
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

        <p className="p-3 rounded-md bg-gray-50 text-xs text-gray-500 leading-normal">
          投稿すると、植物の共存実績にすぐ反映されます。
        </p>

        {/* フッターナビ */}
        <div className="flex justify-between pt-2 border-t border-border">
          <Button variant="ghost" onClick={() => router.back()} disabled={isSubmitting}>
            <ChevronLeft className="w-4 h-4" />
            やめる
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            disabled={!canSubmit}
            onClick={onSubmit}
            data-testid="submit-post"
          >
            <Camera className="w-4 h-4" />
            {isSubmitting ? "投稿中..." : "投稿する"}
          </Button>
        </div>
      </div>
    </div>
  );
}
