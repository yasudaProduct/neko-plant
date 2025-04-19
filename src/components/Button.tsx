"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

interface AuthProtectedButtonProps {
  onClick?: () => void | Promise<void> | Promise<FormData>;
  text?: string;
  pendingText?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  className?: string;
  children?: React.ReactNode;
}

export default function SubmitButton({
  text = "実行",
  pendingText = "送信中...",
  onClick,
  variant = "outline",
  className,
  children,
}: AuthProtectedButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      if (onClick) {
        await onClick();
      }
    } finally {
      setIsLoading(false);
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
