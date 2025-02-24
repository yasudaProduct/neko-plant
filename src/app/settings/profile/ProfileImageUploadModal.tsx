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
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

export default function ProfileImageUploadModal({
  userId,
}: ProfileImageUploadModalProps) {
  const [newImage, setNewImage] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleImageUpload = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);

    if (!newImage) {
      setError("画像を選択してください。");
      return;
    }

    const { data, error } = await supabase.storage
      .from("user_profiles")
      .upload(`${userId}/profile_image.png`, newImage);

    if (error) {
      console.error(error);
      setError("画像のアップロードに失敗しました。");
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  const handleClose = () => {
    setNewImage("");
    setError("");
    setSuccess(false);
    setLoading(false);
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
        <div className="space-y-4">
          <label htmlFor="image" className="block text-sm font-medium">
            新しいプロフィール画像
          </label>
          <Input
            id="image"
            type="file"
            value={newImage}
            onChange={(e) => {
              const { files, displayUrl } = getImageData(e);
              setNewImage(e.target.value);
              setPreview(displayUrl);
            }}
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && (
            <p className="text-green-500 text-sm">
              画像のアップロードに成功しました。
            </p>
          )}
        </div>
        <div className="aspect-video max-w-[560px] flex justify-center items-center">
          {preview ? (
            <Avatar className="w-24 h-24">
              <AvatarImage src="" />
              <AvatarFallback className="bg-muted">
                <img
                  src={preview}
                  alt="プロフィール画像"
                  className="w-24 h-24 rounded-full object-cover"
                />
              </AvatarFallback>
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
            disabled={loading || !newImage}
          >
            {loading ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
