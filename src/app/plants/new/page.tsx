"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { addPlant } from "@/actions/plant-action";
import Link from "next/link";

const plantSchema = z.object({
  name: z
    .string()
    .min(1, "植物の名前は必須です")
    .max(50, "植物の名前は50文字以内で入力してください"),
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
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto p-6">
          <h1 className="text-2xl font-bold text-center mb-6">植物を登録</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">植物の名前</Label>
              <Input id="name" {...register("name")} placeholder="例：パキラ" maxLength={50} />
              {errors.name && (
                <p className="text-red-500 text-sm">{errors.name.message}</p>
              )}
            </div>

            <div className="flex gap-4">
              {/* TODO #53 */}
              <Button
                type="submit"
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
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
        </Card>
      </div>
    </div>
  );
}
