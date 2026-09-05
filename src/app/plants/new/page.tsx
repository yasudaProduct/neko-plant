"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { addPlant } from "@/actions/plant-action";
import { MAX_PLANT_NAME_LENGTH } from "@/lib/const";
import Link from "next/link";

const plantSchema = z.object({
  name: z
    .string()
    .min(1, "植物の名前は必須です")
    .max(
      MAX_PLANT_NAME_LENGTH,
      `植物の名前は${MAX_PLANT_NAME_LENGTH}文字以内で入力してください`,
    ),
});

type PlantFormData = z.infer<typeof plantSchema>;

export default function RegisterPlant() {
  const { success, error } = useToast();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PlantFormData>({
    resolver: zodResolver(plantSchema),
  });

  const onSubmit = async (data: PlantFormData) => {
    const newPlant = {
      name: data.name,
    };

    const result = await addPlant(newPlant.name);

    if (result.success) {
      success({
        title: "植物を登録しました",
      });
      router.push(`/plants/${result.data?.plantId}`);
    } else {
      error({
        title: "植物を登録に失敗しました",
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

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-12">
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">植物を登録</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">植物の名前</Label>
            <Input id="name" {...register("name")} placeholder="例：パキラ" maxLength={50} />
            {errors.name && (
              <p className="text-red-600 text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="flex gap-4">
            {/* TODO #53 */}
            <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
              登録
            </Button>
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
      </div>
    </div>
  );
}
