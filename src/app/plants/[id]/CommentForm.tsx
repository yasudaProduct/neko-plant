"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Skull } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvaluationType } from "@/app/types/evaluation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useState } from "react";
import { addEvaluation } from "@/actions/evaluation-action";
import { toast } from "@/hooks/use-toast";

const formSchema = z.object({
  comment: z.string().min(1, {
    message: "コメントを入力してください",
  }),
  type: z.nativeEnum(EvaluationType, {
    required_error: "評価を選択してください",
  }),
});

export default function CommentForm({ plantId }: { plantId: number }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: "",
      type: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      await addEvaluation(plantId, values.comment, values.type);
      toast({
        title: "評価を投稿しました",
      });
    } catch {
      toast({
        title: "評価投稿に失敗しました。",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>評価を投稿</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <Heart className="w-4 h-4 text-red-500" />
                      Good
                    </Button>
                    <Button
                      type="button"
                      variant={
                        field.value === EvaluationType.BAD
                          ? "default"
                          : "outline"
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

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="コメントを入力してください"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "投稿中..." : "投稿"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
