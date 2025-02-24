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

type ProfileImageUploadFormData = z.infer<typeof profileImageUploadSchema>;

export default function ProfileImageUploadModal({}: ProfileImageUploadModalProps) {
  const [preview, setPreview] = useState("");
  const [isSubmiting, setIsSubmiting] = useState(false);

  // const form = useForm<z.infer<typeof profileImageUploadSchema>>({
  //   resolver: zodResolver(profileImageUploadSchema),
  //   defaultValues: {
  //     image: undefined,
  //   },
  // });

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<ProfileImageUploadFormData>({
    resolver: zodResolver(profileImageUploadSchema),
  });

  async function onSubmit(values: z.infer<typeof profileImageUploadSchema>) {
    setIsSubmiting(true);

    try {
      await updateUserImage(values.image);
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
  }

  const handleClose = () => {
    reset();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files, displayUrl } = getImageData(e);
    if (files && files[0]) {
      setValue("image", files[0], { shouldValidate: true });
      setPreview(displayUrl);
    }
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

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <label htmlFor="image" className="block text-sm font-medium">
              新しいプロフィール画像
            </label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {errors.image && (
              <p className="text-red-500 text-sm">{errors.image.message}</p>
            )}
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
            <Button type="submit" variant="default" disabled={isSubmiting}>
              {isSubmiting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
