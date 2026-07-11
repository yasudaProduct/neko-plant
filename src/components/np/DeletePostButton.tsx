"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deletePost } from "@/actions/post-action";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** 投稿削除ボタン (本人・管理者用) */
export default function DeletePostButton({ postId }: { postId: number }) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { success, error } = useToast();

  const onDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deletePost(postId);
      if (result.success) {
        success({ title: "投稿を削除しました" });
        router.push("/");
        router.refresh();
      } else {
        error({ title: "投稿の削除に失敗しました", description: result.message });
        setOpen(false);
      }
    } catch {
      error({ title: "投稿の削除に失敗しました" });
      setOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-red-600 transition-colors"
          data-testid="delete-post-button"
        >
          <Trash2 className="w-4 h-4" />
          削除
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>投稿を削除しますか？</DialogTitle>
          <DialogDescription>
            この操作は取り消せません。投稿と写真が削除され、共存実績の集計からも除外されます。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
            キャンセル
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={isDeleting}>
            {isDeleting ? "削除中..." : "削除する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
