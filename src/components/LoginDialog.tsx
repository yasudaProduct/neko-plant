"use client";

import { signInWithGoogle } from "@/lib/supabase/auth-google";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PawPrint } from "lucide-react";
import { useState } from "react";

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export default function LoginDialog({
  isOpen,
  onClose,
  message = "この機能を利用するにはログインが必要です",
}: LoginDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error("ログインエラー:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ログインが必要です</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-6">
          <PawPrint className="w-16 h-16 text-green-500 mb-4" />
          <p className="text-center text-sm text-muted-foreground mb-4">
            ログインすると、植物の評価や飼育情報の共有など、より多くの機能を利用できます。
          </p>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button
            onClick={handleLogin}
            className="w-full bg-accent hover:bg-accent/90"
            disabled={isLoading}
          >
            {isLoading ? "ログイン中..." : "Googleでログイン"}
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full mt-2">
            キャンセル
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
