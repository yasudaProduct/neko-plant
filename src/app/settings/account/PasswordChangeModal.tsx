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

export default function PasswordChangeModal() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handlePasswordChange = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      setLoading(false);
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setError("パスワードが一致しません。");
      setLoading(false);
      return;
    }

    // セッション奪取だけではパスワードを変更できないよう、現在のパスワードで再認証する
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setError("パスワードの変更に失敗しました。もう一度ログインしてください。");
      setLoading(false);
      return;
    }

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthError) {
      setError("現在のパスワードが正しくありません。");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setError("パスワードの変更に失敗しました。もう一度お試しください。");
    } else {
      setSuccess(true);
      setCurrentPassword("");
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
          <DialogTitle>パスワードを変更する</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label htmlFor="current-password" className="block text-sm font-medium">
            現在のパスワード
          </label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <label htmlFor="password" className="block text-sm font-medium">
            新しいパスワード
          </label>
          <Input
            id="password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <label htmlFor="password" className="block text-sm font-medium">
            新しいパスワード（確認用）
          </label>
          <Input
            id="password-confirm"
            type="password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && (
            <p className="text-green-500 text-sm">パスワードを変更しました。</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="secondary"
              onClick={() => {
                setCurrentPassword("");
                setNewPassword("");
                setNewPasswordConfirm("");
              }}
            >
              キャンセル
            </Button>
          </DialogClose>
          <Button
            variant="default"
            onClick={handlePasswordChange}
            disabled={loading || !currentPassword || !newPassword}
          >
            {loading ? "変更中..." : "変更"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
