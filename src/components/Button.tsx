"use client";

import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/useAction";
import { withAuth } from "@/lib/action-helpers";

interface AuthProtectedButtonProps {
  onClick<Args extends unknown[]>(...args: Args): () => Promise<void>;
  text?: string;
  pendingText?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  className?: string;
}

export default function AuthProtectedButton({
  text = "実行",
  pendingText = "送信中...",
  onClick,
  variant = "default",
  className,
}: AuthProtectedButtonProps) {
  // useAuthActionフックを使用して認証エラーをハンドリング
  const { execute, isLoading } = useAction(withAuth(onClick()));

  const handleClick = async () => {
    await execute();
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className={className}
      variant={variant}
    >
      {isLoading ? pendingText : text}
    </Button>
  );
}
