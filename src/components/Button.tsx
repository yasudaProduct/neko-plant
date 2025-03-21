"use client";

import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/useAction";
import { ActionResult } from "@/types/common";

interface AuthProtectedButtonProps {
  action: () => Promise<ActionResult>;
  onClick?: () => void;
  text?: string;
  pendingText?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  className?: string;
  children?: React.ReactNode;
}

export default function AuthProtectedButton({
  text = "実行",
  pendingText = "送信中...",
  action,
  onClick,
  variant = "outline",
  className,
  children,
}: AuthProtectedButtonProps) {
  const { execute, isLoading } = useAction(action);

  const handleClick = async () => {
    if (onClick) {
      await onClick();
      await execute();
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className={className}
      variant={variant}
    >
      {children ? children : isLoading ? pendingText : text}
    </Button>
  );
}
