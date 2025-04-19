"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitButton2 } from "@/components/submit-button";
import { useToast } from "@/hooks/use-toast";
import { deletePlant, updatePlant } from "@/actions/plant-action";
import Link from "next/link";
import { Plant } from "@/types/plant";

const plantSchema = z.object({
  name: z
    .string()
    .min(1, "植物の名前は必須です")
    .max(50, "植物の名前は50文字以内で入力してください"),
});

type PlantFormData = z.infer<typeof plantSchema>;

interface PlantEditFormProps {
  plant: Plant;
}

export default function PlantEditForm({ plant }: PlantEditFormProps) {
  const { success, error } = useToast();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PlantFormData>({
    resolver: zodResolver(plantSchema),
    defaultValues: {
      name: plant.name,
    },
  });

  const onSubmit = async (data: PlantFormData) => {
    const editPlant = {
      name: data.name,
    };

    const result = await updatePlant(plant.id, editPlant);

    if (result.success) {
      success({
        title: "植物を更新しました",
      });
      router.push(`/plants/${result.data?.plantId}`);
    } else {
      error({
        title: "植物の更新に失敗しました",
        description: (
          <>
            {result.message}{" "}
            {result.data?.plantId && (
              <Link
                href={`/plants/${result.data?.plantId}`}
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

  const handleDelete = async () => {
    try {
      const result = await deletePlant(plant.id);
      if (result.success) {
        success({
          title: "植物を削除しました",
        });
        router.push("/plants");
      } else {
        error({
          title: "植物の削除に失敗しました",
          description: result.message,
        });
      }
    } catch {
      error({
        title: "植物の削除に失敗しました",
        description:
          "再度試していただくか、サイト管理者にお問い合わせください。",
      });
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

      <div className="flex gap-4">
        <SubmitButton2
          pendingText="更新中..."
          className="bg-green-500 hover:bg-green-600"
        >
          更新
        </SubmitButton2>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
        <Button
          variant="destructive"
          onClick={handleDelete}
          className="bg-red-500 hover:bg-red-600 ml-auto"
        >
          削除
        </Button>
      </div>
    </form>
  );
}
