"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { togglePostLike } from "@/actions/post-action";
import { useAuthDialog } from "@/contexts/AuthDialogContext";
import { ActionErrorCode } from "@/types/common";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Props = {
  postId: number;
  initialLiked: boolean;
  initialCount: number;
  size?: "md" | "lg";
};

/** いいねボタン (楽観的更新 + 未ログイン時はログインダイアログ) */
export default function LikeButton({ postId, initialLiked, initialCount, size = "md" }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const { showLoginDialog } = useAuthDialog();
  const { error } = useToast();

  const onToggle = async () => {
    if (pending) return;

    const prevLiked = liked;
    const prevCount = count;

    // 楽観的更新
    setLiked(!prevLiked);
    setCount(prevCount + (prevLiked ? -1 : 1));
    setPending(true);

    try {
      const result = await togglePostLike(postId);

      if (!result.success) {
        setLiked(prevLiked);
        setCount(prevCount);

        if (result.code === ActionErrorCode.AUTH_REQUIRED) {
          showLoginDialog("いいねするにはログインしてください");
        } else {
          error({ title: "いいねに失敗しました", description: result.message });
        }
        return;
      }

      if (result.data) {
        setLiked(result.data.liked);
        setCount(result.data.likeCount);
      }
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
      error({ title: "いいねに失敗しました" });
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      data-testid="like-button"
      className={cn(
        "inline-flex items-center gap-1.5 text-sm transition-colors",
        liked ? "text-red-600" : "text-gray-500 hover:text-red-600",
      )}
    >
      <Heart
        className={cn(
          size === "lg" ? "w-7 h-7" : "w-6 h-6",
          liked && "fill-red-600 np-like-pop",
        )}
      />
      いいね {count}件
    </button>
  );
}
