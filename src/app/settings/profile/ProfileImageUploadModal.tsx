"use client";

import { ChangeEvent, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { updateUserImage } from "@/actions/user-action";

const profileImageUploadSchema = z.object({
  image: z
    .any()
    .refine(
      (file) => file instanceof File,
      "有効な画像ファイルをアップロードしてください"
    )
    .refine((file) => file && ["image/jpeg", "image/png"].includes(file.type), {
      message: "サポートされていないファイル形式です",
    })
    .refine((file) => file && file.size <= 5 * 1024 * 1024, {
      message: "ファイルサイズは5MB以下にしてください",
    }),
});

interface ProfileImageUploadModalProps {
  userId: string;
}

function getImageData(event: ChangeEvent<HTMLInputElement>) {
  const dataTransfer = new DataTransfer();

  Array.from(event.target.files!).forEach((image) =>
    dataTransfer.items.add(image)
  );

  const files = dataTransfer.files;
  const displayUrl = URL.createObjectURL(event.target.files![0]);

  return { files, displayUrl };
}

export default function ProfileImageUploadModal({}: ProfileImageUploadModalProps) {
  const [newImage, setNewImage] = useState("");
  const [preview, setPreview] = useState("");
  const [isSubmiting, setIsSubmiting] = useState(false);

  const form = useForm<z.infer<typeof profileImageUploadSchema>>({
    resolver: zodResolver(profileImageUploadSchema),
  });

  const handleImageUpload = async () => {
    setIsSubmiting(true);

    try {
      await updateUserImage(form.getValues("image"));
      toast({
        title: "プロフィール画像を変更しました。",
      });
    } catch {
      toast({
        title: "画像のアップロードに失敗しました。",
      });
    } finally {
      setIsSubmiting(false);
    }
  };

  const handleClose = () => {
    form.reset();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          変更する
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>プロフィール画像を変更する</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleImageUpload)}>
            <div className="space-y-4">
              <label htmlFor="image" className="block text-sm font-medium">
                新しいプロフィール画像
              </label>
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <Input
                    {...field}
                    id="image"
                    type="file"
                    value={newImage}
                    onChange={(e) => {
                      const { displayUrl } = getImageData(e);
                      setNewImage(e.target.value);
                      setPreview(displayUrl);
                    }}
                    required
                  />
                )}
              />
              <FormMessage />
            </div>
            <div className="aspect-video max-w-[560px] flex justify-center items-center">
              {preview ? (
                <Avatar className="w-24 h-24">
                  <AvatarImage
                    src={preview}
                    alt="プロフィール画像"
                    width={96}
                    height={96}
                  />
                  <AvatarFallback className="bg-muted"></AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-full h-full bg-background/70 rounded-lg border flex justify-center items-center"></div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary" onClick={handleClose}>
                  キャンセル
                </Button>
              </DialogClose>
              <Button
                variant="default"
                onClick={handleImageUpload}
                disabled={isSubmiting || !newImage}
              >
                {isSubmiting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
