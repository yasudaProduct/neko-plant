"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heart, Skull, Sparkles, CheckCircle2, Plus } from "lucide-react";

import ImageUpload from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import { EvaluationType } from "@/types/evaluation";
import { ActionErrorCode } from "@/types/common";
import { addEvaluation } from "@/actions/evaluation-action";
import { addPlant, searchPlantName } from "@/actions/plant-action";
import {
  identifyPlantFromImage,
  type PlantIdentificationCandidate,
} from "@/actions/plant-identification-action";

const MAX_IMAGES = 3;

const formSchema = z.object({
  comment: z.string().min(1, { message: "コメントを入力してください" }),
  type: z.nativeEnum(EvaluationType, {
    required_error: "安全性を選択してください",
  }),
  images: z
    .array(z.instanceof(File))
    .min(1, { message: "写真を1枚以上追加してください" })
    .max(MAX_IMAGES, { message: `最大${MAX_IMAGES}枚までです` })
    .refine(
      (files) =>
        files.length === 0 ||
        files.every((file) => ["image/jpeg", "image/png"].includes(file.type)),
      { message: "サポートされていないファイル形式です（JPEG/PNGのみ）。" },
    )
    .refine(
      (files) =>
        files.length === 0 ||
        files.every((file) => file.size <= 5 * 1024 * 1024),
      { message: "ファイルサイズは5MB以下にしてください。" },
    ),
});

type FormValues = z.infer<typeof formSchema>;

type SelectedPlant =
  | { mode: "existing"; id: number; name: string }
  | { mode: "new"; name: string }
  | null;

const normalizePlantName = (name: string) => name.trim().replace(/\s+/g, " ");

export default function NewPostWithAiForm() {
  const { success, error, info } = useToast();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: "",
      type: undefined,
      images: [],
    },
  });

  const [isIdentifying, setIsIdentifying] = useState(false);
  const [hasIdentified, setHasIdentified] = useState(false);
  const [candidates, setCandidates] = useState<PlantIdentificationCandidate[]>(
    [],
  );

  const [manualQuery, setManualQuery] = useState("");
  const [manualSuggestions, setManualSuggestions] = useState<
    { id: number; name: string }[]
  >([]);
  const manualQueryRef = useRef(manualQuery);

  const [selectedPlant, setSelectedPlant] = useState<SelectedPlant>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const images = form.watch("images");
  const canIdentify = images.length > 0 && !isIdentifying;

  useEffect(() => {
    manualQueryRef.current = manualQuery;
  }, [manualQuery]);

  useEffect(() => {
    if (!manualQuery) {
      setManualSuggestions([]);
      return;
    }

    const q = manualQuery;
    const timer = setTimeout(async () => {
      try {
        const result = await searchPlantName(q);
        if (manualQueryRef.current !== q) return;
        setManualSuggestions(result.slice(0, 10));
      } catch (e) {
        console.error(e);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [manualQuery]);

  const handleImageChange = (files: File[]) => {
    form.setValue("images", files, { shouldValidate: true });
    // 画像が変わったら全入力をリセット
    form.setValue("type", undefined as unknown as EvaluationType);
    form.setValue("comment", "");
    setHasIdentified(false);
    setCandidates([]);
    setSelectedPlant(null);
    setManualQuery("");
    setManualSuggestions([]);
  };

  // AIで判定を実行する
  const onIdentify = async () => {
    const firstImage = images[0];
    if (!firstImage) {
      error({ title: "写真を追加してください" });
      return;
    }

    setIsIdentifying(true);
    setCandidates([]);
    setHasIdentified(false);

    try {
      const result = await identifyPlantFromImage(firstImage);
      if (!result.success) {
        error({
          title: "AI判定に失敗しました",
          description: result.message,
        });
        return;
      }

      setHasIdentified(true);

      if (result.message) {
        info({ title: result.message });
      }

      const nextCandidates = result.data?.candidates ?? [];
      setCandidates(nextCandidates);

      const firstMatched = nextCandidates.find((c) => c.matchedPlant);
      if (firstMatched?.matchedPlant) {
        setSelectedPlant({
          mode: "existing",
          id: firstMatched.matchedPlant.id,
          name: firstMatched.matchedPlant.name,
        });
      }
    } catch (e) {
      console.error(e);
      error({
        title: "AI判定に失敗しました",
        description: "時間をおいて再度お試しください。",
      });
    } finally {
      setIsIdentifying(false);
    }
  };

  const selectCandidate = (candidate: PlantIdentificationCandidate) => {
    if (candidate.matchedPlant) {
      setSelectedPlant({
        mode: "existing",
        id: candidate.matchedPlant.id,
        name: candidate.matchedPlant.name,
      });
      return;
    }

    setSelectedPlant({ mode: "new", name: candidate.name });
  };

  const selectExistingPlant = (plant: { id: number; name: string }) => {
    setSelectedPlant({ mode: "existing", id: plant.id, name: plant.name });
    setManualQuery("");
    setManualSuggestions([]);
  };

  const selectNewPlantByName = (name: string) => {
    const normalized = normalizePlantName(name);
    if (!normalized) return;
    if (normalized.length > 50) {
      error({ title: "植物名は50文字以内で入力してください。" });
      return;
    }
    setSelectedPlant({ mode: "new", name: normalized });
  };

  const onSubmit = async (values: FormValues) => {
    if (!selectedPlant) {
      error({
        title: "植物を選択してください",
        description:
          "AI候補の選択、または検索/新規登録で植物を確定してください。",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let plantId: number | undefined;

      if (selectedPlant.mode === "existing") {
        plantId = selectedPlant.id;
      } else {
        const createResult = await addPlant(selectedPlant.name);
        if (createResult.success) {
          plantId = createResult.data?.plantId;
        } else if (
          createResult.code === ActionErrorCode.ALREADY_EXISTS &&
          createResult.data?.plantId
        ) {
          plantId = createResult.data.plantId;
          info({
            title: "登録済みの植物に紐付けました",
            description: (
              <Link href={`/plants/${plantId}`} className="underline">
                {selectedPlant.name}
              </Link>
            ),
          });
          setSelectedPlant({
            mode: "existing",
            id: plantId,
            name: selectedPlant.name,
          });
        } else {
          error({
            title: "植物の登録に失敗しました",
            description: createResult.message,
          });
          return;
        }
      }

      if (!plantId) {
        error({ title: "植物の紐付けに失敗しました" });
        return;
      }

      const result = await addEvaluation(
        plantId,
        values.comment,
        values.type,
        values.images,
      );

      if (!result.success) {
        error({ title: "投稿に失敗しました", description: result.message });
        return;
      }

      success({
        title: "評価を投稿しました",
        description: (
          <Link href={`/plants/${plantId}`} className="underline">
            {selectedPlant.mode === "existing"
              ? selectedPlant.name
              : selectedPlant.name}
          </Link>
        ),
      });

      router.push(`/plants/${plantId}`);
    } catch (e) {
      console.error(e);
      error({
        title: "投稿に失敗しました",
        description:
          "再度試していただくか、サイト管理者にお問い合わせください。",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StepNumber = ({
    step,
    label,
  }: {
    step: number;
    label: string;
  }) => (
    <div className="flex items-center gap-2 mb-3">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold shrink-0">
        {step}
      </span>
      <span className="text-sm font-semibold text-gray-700">{label}</span>
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* STEP 1: 写真 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <StepNumber step={1} label="植物の写真を追加" />
          <FormField
            control={form.control}
            name="images"
            render={() => (
              <FormItem>
                <ImageUpload
                  onImageChange={handleImageChange}
                  maxCount={MAX_IMAGES}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* STEP 2: 植物名 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <StepNumber step={2} label="植物名を特定" />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                写真からAIが植物名を判定します
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canIdentify}
                onClick={onIdentify}
              >
                <Sparkles className="w-4 h-4" />
                {isIdentifying ? "判定中..." : "AIで判定"}
              </Button>
            </div>

            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-gray-50 rounded-md p-3">
                {hasIdentified
                  ? "植物を判定できませんでした。植物が写った写真で再度お試しいただくか、下の検索から植物を選択してください。"
                  : "「AIで判定」ボタンを押すと、写真から植物名の候補を表示します。"}
              </p>
            ) : (
              <div className="space-y-2">
                {candidates.map((c) => {
                  const isSelected =
                    (selectedPlant?.mode === "existing" &&
                      c.matchedPlant?.id === selectedPlant.id) ||
                    (selectedPlant?.mode === "new" &&
                      normalizePlantName(selectedPlant.name) ===
                        normalizePlantName(c.name));

                  return (
                    <button
                      key={`${c.name}-${c.matchedPlant?.id ?? "new"}`}
                      type="button"
                      onClick={() => selectCandidate(c)}
                      className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                        isSelected
                          ? "border-green-500 bg-green-50"
                          : c.matchedPlant
                            ? "border-green-200 hover:bg-green-50/50"
                            : "border-amber-200 hover:bg-amber-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.name}</span>
                        {typeof c.confidence === "number" && (
                          <span className="text-xs text-muted-foreground">
                            {(c.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                        <span className="ml-auto">
                          {c.matchedPlant ? (
                            <Badge
                              variant="default"
                              className="bg-green-600 hover:bg-green-600"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              登録済み
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-amber-400 text-amber-600 bg-amber-50"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              新規登録
                            </Badge>
                          )}
                        </span>
                      </div>
                      {c.matchedPlant && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <Link
                            href={`/plants/${c.matchedPlant.id}`}
                            className="underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            詳細を見る
                          </Link>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="border-t border-gray-100 pt-3 space-y-2">
              <Label className="text-xs text-muted-foreground">
                候補にない場合（検索）
              </Label>
              <Input
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="植物名を検索（例：パキラ）"
                maxLength={50}
              />

              {manualSuggestions.length > 0 && (
                <div className="rounded-md border bg-white shadow-sm">
                  {manualSuggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                      onClick={() => selectExistingPlant(p)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}

              {manualQuery.trim().length > 0 &&
                !manualSuggestions.some(
                  (p) =>
                    normalizePlantName(p.name) ===
                    normalizePlantName(manualQuery),
                ) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => selectNewPlantByName(manualQuery)}
                  >
                    「{normalizePlantName(manualQuery)}」を新規登録して選択
                  </Button>
                )}
            </div>

            {selectedPlant ? (
              <div
                className={`rounded-lg border-2 px-4 py-3 ${
                  selectedPlant.mode === "existing"
                    ? "border-green-400 bg-green-50"
                    : "border-amber-400 bg-amber-50"
                }`}
              >
                <p className="text-xs text-muted-foreground mb-1">
                  この名前で投稿されます
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">
                    {selectedPlant.name}
                  </span>
                  {selectedPlant.mode === "existing" ? (
                    <Badge
                      variant="default"
                      className="bg-green-600 hover:bg-green-600"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      登録済み
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-400 text-amber-600 bg-amber-50"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      新規登録
                    </Badge>
                  )}
                </div>
                {selectedPlant.mode === "existing" && (
                  <Link
                    href={`/plants/${selectedPlant.id}`}
                    className="text-xs text-green-700 underline mt-1 inline-block"
                  >
                    この植物の詳細を見る
                  </Link>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  AIの判定は参考です。必ず正しい植物名を選択してください。
                </p>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-center">
                <p className="text-sm text-muted-foreground">
                  未選択（投稿前に植物を確定してください）
                </p>
              </div>
            )}
          </div>
        </div>

        {/* STEP 3: 安全性 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <StepNumber step={3} label="猫に対する安全性を評価" />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={
                      field.value === EvaluationType.GOOD
                        ? "destructive"
                        : "outline"
                    }
                    onClick={() => field.onChange(EvaluationType.GOOD)}
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        field.value === EvaluationType.GOOD
                          ? "text-white"
                          : "text-red-500"
                      }`}
                    />
                    安全
                  </Button>
                  <Button
                    type="button"
                    variant={
                      field.value === EvaluationType.BAD ? "default" : "outline"
                    }
                    onClick={() => field.onChange(EvaluationType.BAD)}
                  >
                    <Skull className="w-4 h-4 text-indigo-500" />
                    危険
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* STEP 4: コメント */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <StepNumber step={4} label="コメントを入力" />
          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="この植物と猫についてのコメントを入力してください"
                    className="h-32"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !selectedPlant}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? "投稿中..." : "投稿する"}
        </Button>
      </form>
    </Form>
  );
}
