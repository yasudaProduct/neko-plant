"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, CheckCircle2, Plus } from "lucide-react";

import ImageUpload from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ActionErrorCode } from "@/types/common";
import { createPost } from "@/actions/post-action";
import { addPlant, searchPlantName } from "@/actions/plant-action";
import { identifyPlantFromImage, type PlantIdentificationCandidate } from "@/actions/plant-identification-action";
import { getUserPets, getUserProfileByAuthId } from "@/actions/user-action";
import { Pet } from "@/types/neko";

const MAX_IMAGES = 3;

const formSchema = z.object({
  comment: z.string().optional(),
  images: z
    .array(z.instanceof(File))
    .min(1, { message: "写真を1枚以上追加してください" })
    .max(MAX_IMAGES, { message: `最大${MAX_IMAGES}枚までです` }),
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
    defaultValues: { comment: "", images: [] },
  });

  const [isIdentifying, setIsIdentifying] = useState(false);
  const [hasIdentified, setHasIdentified] = useState(false);
  const [candidates, setCandidates] = useState<PlantIdentificationCandidate[]>([]);
  const [manualQuery, setManualQuery] = useState("");
  const [manualSuggestions, setManualSuggestions] = useState<{ id: number; name: string }[]>([]);
  const manualQueryRef = useRef(manualQuery);
  const [selectedPlant, setSelectedPlant] = useState<SelectedPlant>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);

  const images = form.watch("images");

  useEffect(() => {
    const loadPets = async () => {
      const profile = await getUserProfileByAuthId();
      if (!profile) return;
      const userPets = await getUserPets(profile.id);
      setPets(userPets ?? []);
    };
    loadPets();
  }, []);

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
      const result = await searchPlantName(q);
      if (manualQueryRef.current !== q) return;
      setManualSuggestions(result.slice(0, 10));
    }, 300);
    return () => clearTimeout(timer);
  }, [manualQuery]);

  const handleImageChange = (files: File[]) => {
    form.setValue("images", files, { shouldValidate: true });
    form.setValue("comment", "");
    setHasIdentified(false);
    setCandidates([]);
    setSelectedPlant(null);
    setManualQuery("");
    setManualSuggestions([]);
  };

  const onIdentify = async () => {
    const firstImage = images[0];
    if (!firstImage) return;
    setIsIdentifying(true);
    setCandidates([]);
    setHasIdentified(false);
    try {
      const result = await identifyPlantFromImage(firstImage);
      if (!result.success) {
        error({ title: "AI判定に失敗しました", description: result.message });
        return;
      }
      setHasIdentified(true);
      if (result.message) info({ title: result.message });
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
    } finally {
      setIsIdentifying(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!selectedPlant) {
      error({ title: "植物を選択してください" });
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
        } else if (createResult.code === ActionErrorCode.ALREADY_EXISTS && createResult.data?.plantId) {
          plantId = createResult.data.plantId;
        } else {
          error({ title: "植物の登録に失敗しました", description: createResult.message });
          return;
        }
      }
      if (!plantId) return;
      const result = await createPost(plantId, selectedPetId, values.comment ?? null, values.images);
      if (!result.success) {
        error({ title: "投稿に失敗しました", description: result.message });
        return;
      }
      success({
        title: "投稿しました",
        description: (
          <Link href={`/plants/${plantId}`} className="underline">
            植物ページを見る
          </Link>
        ),
      });
      router.push(`/plants/${plantId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <Label className="mb-2 block">1. 写真を追加</Label>
          <FormField
            control={form.control}
            name="images"
            render={() => (
              <FormItem>
                <ImageUpload onImageChange={handleImageChange} maxCount={MAX_IMAGES} />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <Label className="block">2. 植物名を特定</Label>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">写真からAIが植物名を判定します</p>
            <Button type="button" variant="outline" size="sm" disabled={images.length === 0 || isIdentifying} onClick={onIdentify}>
              <Sparkles className="w-4 h-4" />
              {isIdentifying ? "判定中..." : "AIで判定"}
            </Button>
          </div>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-gray-50 rounded-md p-3">
              {hasIdentified ? "植物を判定できませんでした。検索から選択してください。" : "AI判定か検索で植物を選んでください。"}
            </p>
          ) : (
            <div className="space-y-2">
              {candidates.map((c) => (
                <button
                  key={`${c.name}-${c.matchedPlant?.id ?? "new"}`}
                  type="button"
                  onClick={() =>
                    setSelectedPlant(
                      c.matchedPlant
                        ? { mode: "existing", id: c.matchedPlant.id, name: c.matchedPlant.name }
                        : { mode: "new", name: c.name }
                    )
                  }
                  className="w-full text-left rounded-md border px-3 py-2 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <span className="ml-auto">
                      {c.matchedPlant ? (
                        <Badge className="bg-green-600 hover:bg-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          登録済み
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50">
                          <Plus className="w-3 h-3 mr-1" />
                          新規登録
                        </Badge>
                      )}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <Input value={manualQuery} onChange={(e) => setManualQuery(e.target.value)} placeholder="植物名を検索（例：パキラ）" maxLength={50} />
          {manualSuggestions.length > 0 && (
            <div className="rounded-md border bg-white shadow-sm">
              {manualSuggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                  onClick={() => {
                    setSelectedPlant({ mode: "existing", id: p.id, name: p.name });
                    setManualQuery("");
                    setManualSuggestions([]);
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {manualQuery.trim().length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedPlant({ mode: "new", name: normalizePlantName(manualQuery) })}
            >
              「{normalizePlantName(manualQuery)}」を新規登録して選択
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <Label className="mb-2 block">3. 猫を選択（任意）</Label>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={selectedPetId ?? ""}
            onChange={(e) => setSelectedPetId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">選択しない</option>
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name}（{pet.neko.name}）
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <Label className="mb-2 block">4. コメント（任意）</Label>
          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea {...field} placeholder="この写真のコメントを入力してください（任意）" className="h-32" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isSubmitting || !selectedPlant} className="w-full" size="lg">
          {isSubmitting ? "投稿中..." : "投稿する"}
        </Button>
      </form>
    </Form>
  );
}
