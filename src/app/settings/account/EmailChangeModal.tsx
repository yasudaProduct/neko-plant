"use client";

import { useState } from "react";
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

interface EmailChangeModalProps {
  currentEmail: string;
}

export default function EmailChangeModal({
  currentEmail,
}: EmailChangeModalProps) {
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleEmailChange = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);

    if (newEmail === currentEmail) {
      setError("新しいメールアドレスと現在のメールアドレスが同じです。");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ email: newEmail });

    if (error) {
      setError("メールアドレスの変更に失敗しました。もう一度お試しください。");
    } else {
      setSuccess(true);
    }

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
          <DialogTitle>メールアドレスを変更する</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label htmlFor="email" className="block text-sm font-medium">
            新しいメールアドレス
          </label>
          <Input
            id="email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="sample@example.com"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && (
            <p className="text-green-500 text-sm">
              変更後のメールアドレスに確認メールを送信しました。
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" onClick={() => setNewEmail("")}>
              キャンセル
            </Button>
          </DialogClose>
          <Button
            variant="default"
            onClick={handleEmailChange}
            disabled={loading || !newEmail}
          >
            {loading ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
