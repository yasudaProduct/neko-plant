"use client";

import { deletePost } from "@/actions/post-action";
import Button from "@/components/Button";
import { useToast } from "@/hooks/use-toast";
import { Trash } from "lucide-react";

export default function PostDeleteButton({ postId }: { postId: number }) {
  const { success, error } = useToast();

  const handleDelete = async () => {
    try {
      const result = await deletePost(postId);
      if (result.success) {
        success({ title: "投稿を削除しました。" });
      } else {
        error({
          title: "投稿の削除に失敗しました。",
          description: result.message,
        });
      }
    } catch {
      error({
        title: "投稿の削除に失敗しました。",
        description: "再度試してください。",
      });
    }
  };

  return (
    <Button
      variant="outline"
      className="text-red-500"
      text="削除"
      pendingText="削除中..."
      onClick={handleDelete}
    >
      <Trash className="w-4 h-4" />
    </Button>
  );
}
