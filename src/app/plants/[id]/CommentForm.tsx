"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Skull } from "lucide-react";
import { EvaluationType } from "@/types/evaluation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useState } from "react";
import { addEvaluation } from "@/actions/evaluation-action";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/ImageUpload";

const formSchema = z.object({
  comment: z.string().min(1, {
    message: "コメントを入力してください",
  }),
  type: z.nativeEnum(EvaluationType, {
    required_error: "評価を選択してください",
  }),
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

export default function CommentForm({ plantId }: { plantId: number }) {
  const { success, error } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: "",
      type: undefined,
      image: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      await addEvaluation(plantId, values.comment, values.type, values.image);
      success({
        title: "植物の評価を投稿しました",
      });
    } catch {
      error({
        title: "評価投稿に失敗しました。",
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex gap-4 items-center">
          <FormLabel className="">評価を選択</FormLabel>
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <>
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
                    Good
                  </Button>
                  <Button
                    type="button"
                    variant={
                      field.value === EvaluationType.BAD ? "default" : "outline"
                    }
                    onClick={() => field.onChange(EvaluationType.BAD)}
                  >
                    <Skull className="w-4 h-4 text-indigo-500" />
                    Bad
                  </Button>
                </div>
                <FormMessage />
              </>
            )}
          />
        </div>

        <div className="mt-8">
          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="コメントを入力してください"
                    className="h-32"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* {currentUser.pets.length > 0 && (
            <div>
              <Select
                value={selectedPetIds[0]}
                onValueChange={(value) => setSelectedPetIds([value])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="一緒に飼っている猫を選択 (任意)" />
                </SelectTrigger>
                <SelectContent>
                  {currentUser.pets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id}>
                      {pet.name} ({pet.breed})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )} */}

        <div className="mt-8">
          <ImageUpload onImageChange={handleImageChange} />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? "投稿中..." : "投稿"}
        </Button>
      </form>
    </Form>
  );
}
