"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Check, ChevronLeft, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { addPlant } from "@/actions/plant-action";
import { identifyPlantFromImage } from "@/actions/plant-identification-action";
import PetFormDialog from "@/app/settings/cats/PetFormDialog";
import { normalizePlantName, plantNameKey } from "@/lib/plant-name";
import PhotoPlantSection, {
  plantKey,
  type PostPhoto,
  type SelectedPlant,
} from "./PhotoPlantSection";

/** 番号バッジ + 縦線。完了すると緑のチェックに変わり、線もその区間だけ緑になる */
function StepMarker({
  number,
  done,
  isLast,
}: {
  number: number;
  done: boolean;
  isLast?: boolean;
}) {
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
      {!isLast && (
        <span
          className={`w-px flex-1 my-1 ${done ? "bg-green-300" : "bg-gray-200"}`}
        />
      )}
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

  // 写真ごとに「ファイル + プレビュー + AI判定結果 + 植物タグ」をまとめて持つ
  const [photos, setPhotos] = useState<PostPhoto[]>([]);
  const [pets, setPets] = useState<Pet[]>(myPets);
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>([]);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  // その場で猫を登録した後、router.refresh()で届く最新のmyPetsに置き換える (追記マージすると重複するので注意)
  useEffect(() => {
    setPets(myPets);
  }, [myPets]);

  // 離脱時にプレビューのObjectURLをまとめて解放する。
  // aliveRef はアンマウント後に遅れて届いたAI判定エラーのトーストを抑制する
  const photosRef = useRef<PostPhoto[]>([]);
  const aliveRef = useRef(true);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, []);

  /** 指定キーの写真だけを部分更新する (写真が削除済みなら何も起きない) */
  const patchPhoto = (key: string, patch: Partial<PostPhoto>) => {
    setPhotos((prev) =>
      prev.map((photo) => (photo.key === key ? { ...photo, ...patch } : photo)),
    );
  };

  // 写真1枚のAI判定。追加時に写真ごとに呼び、結果はkey指定で反映する。
  // effectにしないことで「別の写真の追加・削除で実行中の判定が中断される」事故を避ける
  const identifyPhoto = async (key: string, file: File) => {
    try {
      const result = await identifyPlantFromImage(file);
      if (!result.success) {
        patchPhoto(key, { identifyStatus: "error" });
        if (aliveRef.current) {
          error({ title: "AI判定に失敗しました", description: result.message });
        }
        return;
      }
      patchPhoto(key, {
        identifyStatus: "done",
        candidates: result.data?.candidates ?? [],
      });
    } catch (e) {
      console.error(e);
      patchPhoto(key, { identifyStatus: "error" });
      if (aliveRef.current) {
        error({ title: "AI判定に失敗しました" });
      }
    }
  };

  const onImagesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selected.length === 0) return;

    // 既に選んだ写真は残したまま追加するので、空いている枠の分だけ受け付ける
    const remaining = MAX_POST_IMAGES - photos.length;
    if (remaining <= 0) {
      error({ title: `写真は最大${MAX_POST_IMAGES}枚までです` });
      return;
    }
    const files = selected.slice(0, remaining);
    if (files.length < selected.length) {
      info({
        title: `写真は最大${MAX_POST_IMAGES}枚までです`,
        description: `先頭の${files.length}枚だけ追加しました。`,
      });
    }

    setIsProcessingImages(true);
    try {
      // 縮小 + JPEG再エンコード (Exif除去)。メモリ節約のため直列に処理する
      const added: PostPhoto[] = [];
      for (const file of files) {
        try {
          const processed = await processImageForUpload(file);
          added.push({
            key: crypto.randomUUID(),
            file: processed,
            previewUrl: URL.createObjectURL(processed),
            identifyStatus: "identifying",
            candidates: [],
            selectedPlants: [],
          });
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
      if (added.length === 0) return;

      setPhotos((prev) => [...prev, ...added]);

      // 追加した写真ごとにAI判定を並行実行する
      for (const photo of added) {
        void identifyPhoto(photo.key, photo.file);
      }
    } finally {
      setIsProcessingImages(false);
    }
  };

  const removeImage = (index: number) => {
    const target = photos[index];
    if (!target) return;
    URL.revokeObjectURL(target.previewUrl);
    const next = photos.filter((_, i) => i !== index);
    setPhotos(next);

    // 植物タグは写真と一緒に消える。写真が0枚になったら猫の選択もクリアする
    if (next.length === 0) {
      setSelectedPetIds([]);
    }
  };

  // 投稿全体の植物 (全写真の和集合。同じ植物は1つとして数える)
  const unionPlants = useMemo(() => {
    const seen = new Map<string, SelectedPlant>();
    for (const plant of photos.flatMap((photo) => photo.selectedPlants)) {
      const key = plantKey(plant);
      if (!seen.has(key)) seen.set(key, plant);
    }
    return [...seen.values()];
  }, [photos]);

  const togglePlantOnPhoto = (photoKey: string, plant: SelectedPlant) => {
    const key = plantKey(plant);
    const photo = photos.find((p) => p.key === photoKey);
    if (!photo) return;

    const selectedOnPhoto = photo.selectedPlants.some(
      (p) => plantKey(p) === key,
    );
    if (!selectedOnPhoto) {
      // 他の写真で選択済みの植物は、投稿全体の枠を新たに消費しない
      const inUnion = unionPlants.some((p) => plantKey(p) === key);
      if (!inUnion && unionPlants.length >= MAX_POST_PLANTS) {
        error({ title: `植物は投稿全体で最大${MAX_POST_PLANTS}つまでです` });
        return;
      }
    }

    setPhotos((prev) =>
      prev.map((p) =>
        p.key !== photoKey
          ? p
          : {
              ...p,
              selectedPlants: selectedOnPhoto
                ? p.selectedPlants.filter((pl) => plantKey(pl) !== key)
                : [...p.selectedPlants, plant],
            },
      ),
    );
  };

  const togglePet = (petId: number) => {
    setSelectedPetIds((prev) =>
      prev.includes(petId)
        ? prev.filter((id) => id !== petId)
        : [...prev, petId],
    );
  };

  const photoDone = photos.length > 0;
  const plantDone = unionPlants.length > 0;
  const petDone = selectedPetIds.length > 0;

  const canSubmit =
    photoDone && plantDone && petDone && !isProcessingImages && !isSubmitting;

  const onSubmit = async () => {
    setIsSubmitting(true);
    let uploadedPaths: string[] = [];
    try {
      // 新規植物は写真をまたいで1回だけ登録し、IDを引き当てる。
      // キーは plantNameKey (= DBの一意キー) に寄せる。'Monstera' と 'monstera' は
      // DB では同じ植物になるため、別名として2回 addPlant する意味がない
      const newNamesByKey = new Map<string, string>();
      for (const plant of photos.flatMap((photo) => photo.selectedPlants)) {
        if (plant.mode !== "new") continue;
        const key = plantNameKey(plant.name);
        if (!newNamesByKey.has(key)) {
          newNamesByKey.set(key, normalizePlantName(plant.name));
        }
      }

      const keyToId = new Map<string, number>();
      for (const [key, name] of newNamesByKey) {
        const created = await addPlant(name);
        if (created.success && created.data) {
          keyToId.set(key, created.data.plantId);
        } else if (
          !created.success &&
          created.code === ActionErrorCode.ALREADY_EXISTS &&
          created.data?.plantId
        ) {
          // 表記揺れで既存植物に当たった場合もそのIDを使う (投稿は止めない)
          keyToId.set(key, created.data.plantId);
        } else {
          error({
            title: `「${name}」の登録に失敗しました`,
            description: !created.success ? created.message : undefined,
          });
          return;
        }
      }

      // 画像はブラウザから posts バケットへ直接アップロードする
      // (Server Action経由だとVercelのリクエストボディ上限4.5MBに掛かるため)
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        error({
          title: "投稿に失敗しました",
          description: "ログインが必要です。",
        });
        return;
      }

      const groupId = crypto.randomUUID();
      const imagePaths = photos.map(
        (_, i) =>
          `${user.id}/${groupId}/${i + 1}_${generateImageName("post")}.jpg`,
      );

      try {
        await uploadImagesToBucket(
          "posts",
          photos.map((photo, i) => ({ path: imagePaths[i], file: photo.file })),
        );
      } catch (e) {
        console.error(e);
        error({
          title: "投稿に失敗しました",
          description: "画像のアップロードに失敗しました。",
        });
        return;
      }
      uploadedPaths = imagePaths;

      const result = await createPost({
        // 写真とパスは同じ配列indexから作るため、並び順はここでズレない
        images: photos.map((photo, i) => ({
          path: imagePaths[i],
          // existing はそのままのID、new は登録で確定したID。
          // 同一写真内で同じIDに解決された場合 (AI候補のexisting + 手入力のnew) は1つにまとめる
          plantIds: [
            ...new Set(
              photo.selectedPlants.map((plant) =>
                plant.mode === "existing"
                  ? plant.id
                  : keyToId.get(plantNameKey(plant.name))!,
              ),
            ),
          ],
        })),
        petIds: selectedPetIds,
        comment: comment.trim() || undefined,
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
      error({
        title: "投稿に失敗しました",
        description: "再度お試しください。",
      });
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
            <div className="flex-1 min-w-0 flex flex-col gap-3 pb-10">
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">
                  写真を選択
                </h2>
                <p className="text-xs text-gray-500">
                  猫と植物が一緒に写った写真を、{MAX_POST_IMAGES}
                  枚まで選択できます。
                  <br />
                  写真は植物名のAI判定のため、外部のAIサービスに送信されます。位置情報などのメタデータは公開時に自動で削除されます。
                </p>
              </div>
              <label
                className={`border-2 border-dashed border-gray-300 rounded-lg p-6 transition-colors flex items-center justify-center gap-2 text-gray-500 text-sm ${
                  isProcessingImages
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer hover:border-green-500"
                }`}
                data-testid="image-upload-area"
              >
                <Camera className="w-5 h-5" />
                写真を追加する
                {photos.length > 0 && (
                  <span className="text-xs text-gray-400">
                    （残り{MAX_POST_IMAGES - photos.length}枚）
                  </span>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                  className="hidden"
                  disabled={isProcessingImages}
                  onChange={onImagesSelected}
                  data-testid="image-input"
                />
              </label>
              {(photos.length > 0 || isProcessingImages) && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, i) => (
                    <div
                      key={photo.key}
                      className="relative aspect-square rounded-md overflow-hidden outline outline-2 -outline-offset-2 outline-green-500"
                    >
                      <Image
                        src={photo.previewUrl}
                        alt={`選択した写真 ${i + 1}`}
                        fill
                        className="object-cover"
                      />
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
                  {/* 処理中も既存の写真は表示したまま、追加分だけを仮表示する */}
                  {isProcessingImages && (
                    <Skeleton
                      className="aspect-square rounded-md"
                      data-testid="image-processing"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. 植物 (写真ごとに選択する) */}
          <div className="flex gap-4">
            <StepMarker number={2} done={plantDone} />
            <div className="flex-1 min-w-0 flex flex-col gap-4 pb-10">
              <div>
                <h2
                  className={`text-base font-semibold mb-1 ${photoDone ? "text-gray-900" : "text-gray-400"}`}
                >
                  植物を紐付ける
                </h2>
                <p className="text-xs text-gray-500">
                  {photoDone
                    ? "写真ごとにAIが植物を判定します。それぞれの写真に写っている植物を選んでください。植物が写っていない写真は選択なしで構いません（投稿全体で1つ以上必要です）。"
                    : "写真を選択すると、AI判定や検索で植物を選べるようになります。"}
                </p>
              </div>

              {photoDone &&
                photos.map((photo, i) => (
                  <PhotoPlantSection
                    key={photo.key}
                    photo={photo}
                    index={i}
                    onToggle={(plant) => togglePlantOnPhoto(photo.key, plant)}
                  />
                ))}
            </div>
          </div>

          {/* 3. 猫 */}
          <div className="flex gap-4">
            <StepMarker number={3} done={petDone} isLast />
            <div className="flex-1 min-w-0 flex flex-col gap-2.5">
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">
                  写っている猫を選択
                </h2>
                <p className="text-xs text-gray-500">
                  共存実績は、選択した猫ごとに集計されます。
                </p>
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
                        <span className="text-xs text-gray-400">
                          {pet.neko.name}
                        </span>
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
          <Button
            variant="ghost"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
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
