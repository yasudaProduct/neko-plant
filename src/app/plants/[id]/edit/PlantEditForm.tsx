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
  scientific_name: z.string().optional(),
  family: z.string().optional(),
  genus: z.string().optional(),
  species: z.string().optional(),
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
      scientific_name: plant.scientific_name,
      family: plant.family,
      genus: plant.genus,
      species: plant.species,
    },
  });

  const onSubmit = async (data: PlantFormData) => {
    const editPlant = {
      name: data.name,
      scientific_name: data.scientific_name,
      family: data.family,
      genus: data.genus,
      species: data.species,
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
        <Label htmlFor="name">
          植物の名前{" "}
          {plant.name && (
            <>
              <span className="text-gray-500 text-sm pl-4">
                元: {plant.name}
              </span>
            </>
          )}
        </Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="例：ガジュマル"
          defaultValue={plant.name}
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="scientific_name">
          学名{" "}
          {plant.scientific_name && (
            <>
              <span className="text-gray-500 text-sm pl-4">
                元: {plant.scientific_name}
              </span>
            </>
          )}
        </Label>
        <Input
          id="scientific_name"
          {...register("scientific_name")}
          placeholder="例：Ficus microcarpa"
          defaultValue={plant.scientific_name}
        />
        {errors.scientific_name && (
          <p className="text-red-500 text-sm">
            {errors.scientific_name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="family">科</Label>
        {plant.family && (
          <>
            <span className="text-gray-500 text-sm pl-4">
              元: {plant.family}
            </span>
          </>
        )}
        <Input
          id="family"
          {...register("family")}
          placeholder="例：クワ科"
          defaultValue={plant.family}
        />
        {errors.family && (
          <p className="text-red-500 text-sm">{errors.family.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="genus">属</Label>
        {plant.genus && (
          <>
            <span className="text-gray-500 text-sm pl-4">
              元: {plant.genus}
            </span>
          </>
        )}
        <Input
          id="genus"
          {...register("genus")}
          placeholder="例：Ficus"
          defaultValue={plant.genus}
        />
        {errors.genus && (
          <p className="text-red-500 text-sm">{errors.genus.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="species">種</Label>
        {plant.species && (
          <>
            <span className="text-gray-500 text-sm pl-4">
              元: {plant.species}
            </span>
          </>
        )}
        <Input
          id="species"
          {...register("species")}
          placeholder="例：microcarpa"
          defaultValue={plant.species}
        />
        {errors.species && (
          <p className="text-red-500 text-sm">{errors.species.message}</p>
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
