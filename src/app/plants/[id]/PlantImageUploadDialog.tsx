"use client";

import { addPlantImage } from "@/actions/plant-action";
import ImageUpload from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  image: z
    .any()
    .refine((file) => file instanceof File, {
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

export default function PlantImageUploadDialog({
  plantId,
}: {
  plantId: number;
}) {
  const { success, error } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      image: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      const result = await addPlantImage(plantId, values.image);
      if (result.success) {
        success({
          title: "写真をアップロードしました",
        });
      } else {
        error({
          title: "写真のアップロードに失敗しました。",
          description: result.message,
        });
      }
    } catch {
      error({
        title: "写真のアップロードに失敗しました。",
        description:
          "再度試していただくか、サイト管理者にお問い合わせください。",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleImageChange = (file: File) => {
    form.setValue("image", file);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Camera />
          写真をアップロード
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>写真をアップロード</DialogTitle>
          <DialogDescription>
            植物の写真をアップロードしてください。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <ImageUpload onImageChange={handleImageChange} />
          <span className="text-sm text-red-500">
            {form.formState.errors.image?.message}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "アップロード中..." : "アップロード"}
            </Button>
            <span className="text-sm text-gray-500">
              {form.watch("image")?.name}
            </span>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
