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
import { deleteUser } from "./actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface WithdrawalModalProps {
  userId: string;
}

export default function WithdrawalModal({ userId }: WithdrawalModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();
  const handleWithdrawal = async () => {
    setLoading(true);

    try {
      await deleteUser(userId);
      router.push("/");
      success({
        title: "アカウントの削除に成功しました。",
        description: "ご利用ありがとうございました。",
      });
    } catch {
      error({
        title: "アカウントの削除に失敗しました。",
        description:
          "再度試していただくか、サイト管理者にお問い合わせください。",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          アカウントを削除する
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>アカウント削除</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>アカウントを削除すると、すべてのデータが削除されます。</p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">キャンセル</Button>
          </DialogClose>
          <Button
            variant="default"
            onClick={handleWithdrawal}
            disabled={loading}
          >
            {loading ? "削除中..." : "削除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
