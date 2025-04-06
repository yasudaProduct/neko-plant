"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitButton2 } from "@/components/submit-button";
import { useToast } from "@/hooks/use-toast";
import { addPlant } from "@/actions/plant-action";
import Link from "next/link";

const plantSchema = z.object({
  name: z
    .string()
    .min(1, "植物の名前は必須です")
    .max(50, "植物の名前は50文字以内で入力してください"),
  // image: z
  //   .any()
  //   .refine(
  //     (file) => file instanceof File,
  //     "有効な画像ファイルをアップロードしてください"
  //   )
  //   .refine((file) => file && ["image/jpeg", "image/png"].includes(file.type), {
  //     message: "サポートされていないファイル形式です",
  //   })
  //   .refine((file) => file && file.size <= 5 * 1024 * 1024, {
  //     message: "ファイルサイズは5MB以下にしてください",
  //   }),
});

type PlantFormData = z.infer<typeof plantSchema>;

export default function RegisterPlant() {
  const { success, error } = useToast();
  const router = useRouter();
  // const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // const [preview, setPreview] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    // setValue,
  } = useForm<PlantFormData>({
    resolver: zodResolver(plantSchema),
  });

  const onSubmit = async (data: PlantFormData) => {
    const newPlant = {
      name: data.name,
      // image: data.image,
    };

    const result = await addPlant(newPlant.name);

    if (result.success) {
      success({
        title: "植物を登録しました",
      });
      router.push(`/plants/${result.plantId}`);
    } else {
      error({
        title: "植物を登録に失敗しました",
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

  // const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const { files, displayUrl } = getImageData(e);
  //   if (files && files[0]) {
  //     setValue("image", files[0], { shouldValidate: true });
  //     setSelectedFile(files[0]);
  //     setPreview(displayUrl);
  //   }
  // };

  //   const handleSubmit = (e: React.FormEvent) => {
  //     e.preventDefault();

  //     const newPlant = {
  //       name,
  //       imageUrl,
  //     };

  //     // addPlant(newPlant);
  //     router.push("/plants");
  //   };

  //   const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
  //     e.preventDefault();
  //     const file = e.dataTransfer.files[0];
  //     if (file) {
  //       setSelectedFile(file);
  //       setPreview(URL.createObjectURL(file));
  //     }
  //   };

  //   const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
  //     e.preventDefault();
  //   };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto p-6">
          <h1 className="text-2xl font-bold text-center mb-6">植物を登録</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">植物の名前</Label>
              <Input id="name" {...register("name")} placeholder="例：パキラ" />
              {errors.name && (
                <p className="text-red-500 text-sm">{errors.name.message}</p>
              )}
            </div>

            {/* <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="p-4 border-2 border-dashed border-gray-300 rounded-md text-center cursor-pointer"
            >
              <p>
                画像をドラッグ＆ドロップするか、クリックして選択してください
              </p>
              <label
                htmlFor="imageUpload"
                className="mt-2 inline-block text-blue-500 cursor-pointer"
              >
                ファイルを選択
              </label>
            </div> */}

            {/* <div className="space-y-2">
              <Label htmlFor="image">植物の画像</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                // value={imageUrl}
                onChange={handleImageChange}
                className="hover:cursor-pointer"
              />
              {errors.image && (
                <p className="text-red-500 text-sm">{errors.image.message}</p>
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
            )} */}

            <div className="flex gap-4">
              <SubmitButton2
                pendingText="登録中..."
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                登録
              </SubmitButton2>
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
