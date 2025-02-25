"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { getImageData } from "@/lib/utils";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/hooks/use-toast";
import { updatePlant } from "@/actions/plant-action";
import Link from "next/link";
import { Plant } from "@/app/types/plant";

const plantSchema = z.object({
  name: z
    .string()
    .min(1, "植物の名前は必須です")
    .max(50, "植物の名前は50文字以内で入力してください"),
  image: z
    .any()
    .refine((file) => !file || file instanceof File, {
      message: "有効な画像ファイルをアップロードしてください",
    })
    .refine(
      (file) =>
        !file || (file && ["image/jpeg", "image/png"].includes(file.type)),
      {
        message: "サポートされていないファイル形式です",
      }
    )
    .refine((file) => !file || (file && file.size <= 5 * 1024 * 1024), {
      message: "ファイルサイズは5MB以下にしてください",
    }),
});

type PlantFormData = z.infer<typeof plantSchema>;

interface PlantEditFormProps {
  plant: Plant;
}

export default function PlantEditForm({ plant }: PlantEditFormProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<PlantFormData>({
    resolver: zodResolver(plantSchema),
    defaultValues: {
      name: plant.name,
      image: undefined,
    },
  });

  const onSubmit = async (data: PlantFormData) => {
    const editPlant = {
      name: data.name,
      image: data.image,
    };

    const result = await updatePlant(plant.id, editPlant);

    if (result.success) {
      toast({
        title: "植物を更新しました",
      });
      router.push(`/plants/${result.plantId}`);
    } else {
      toast({
        title: "植物の更新に失敗しました",
        description: (
          <>
            {result.message}{" "}
            {result.plantId && (
              <Link
                href={`/plants/${result.plantId}`}
                className="text-blue-500 underline"
              >
                こちら
              </Link>
            )}
          </>
        ),
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files, displayUrl } = getImageData(e);
    if (files && files[0]) {
      setValue("image", files[0], { shouldValidate: true });
      setSelectedFile(files[0]);
      setPreview(displayUrl);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">植物の名前</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="例：パキラ"
          defaultValue={plant.name}
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">植物の画像</Label>
        <Input
          id="image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />
        {errors.image && (
          <p className="text-red-500 text-sm">
            {errors.image.message as string}
          </p>
        )}
      </div>

      {preview && selectedFile && (
        <div className="mt-4">
          <p>画像プレビュー：{selectedFile?.name}</p>
          <Image
            src={preview}
            alt="画像プレビュー"
            width={200}
            height={200}
            className="mx-auto"
          />
        </div>
      )}

      <div className="flex gap-4">
        <SubmitButton pendingText="登録中..." className="flex-1">
          登録
        </SubmitButton>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.back()}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
