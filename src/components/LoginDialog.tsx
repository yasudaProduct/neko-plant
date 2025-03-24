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
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";
interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export default function LoginDialog({
  isOpen,
  onClose,
  message = "",
}: LoginDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch {
      toast({
        title: "ログインに失敗しました。",
        description: "ログインに失敗しました。",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">ログインが必要です</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-6">
          <Image
            src="/images/logo.jpg"
            alt="logo"
            width={64}
            height={64}
            className="w-16 h-16 rounded-full"
          />
          <p className="text-center text-sm text-muted-foreground mt-4 mb-4">
            ログインすると、植物の評価や飼育情報の共有など、より多くの機能を利用できます。
          </p>
        </div>
        <DialogFooter className="flex flex-col items-center justify-center">
          <Button
            onClick={handleLogin}
            className="w-full hover:bg-accent/90"
            variant="outline"
            disabled={isLoading}
          >
            <FcGoogle className="w-4 h-4 mr-2" />
            {isLoading ? "ログイン中..." : "Googleでログイン"}
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full">
            キャンセル
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
